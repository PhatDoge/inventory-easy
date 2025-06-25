import {
  action,
  internalMutation,
  internalQuery,
  query,
  mutation,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Internal query to get the current user
export const _getCurrentUser = internalQuery({
  handler: async (ctx: any) => {
    // TODO: Use proper Convex QueryCtx type e.g. QueryCtx
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },
});

// Generate reorder suggestions for user's products
export const generateReorderSuggestions = action({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.reordering._getCurrentUser);

    // Get all active products for this user
    const products = await ctx.runQuery(
      internal.reordering.getAllActiveProductsForUser,
      {
        userId: user._id,
      }
    );

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Get latest forecast
        const forecast = await ctx.runQuery(
          internal.reordering.getLatestForecast,
          {
            productId: product._id,
          }
        );

        // Calculate reorder suggestion
        const suggestion = calculateReorderSuggestion(product, forecast);

        if (suggestion.shouldReorder) {
          await ctx.runMutation(internal.reordering.createReorderSuggestion, {
            productId: product._id,
            suggestedQuantity: suggestion.quantity,
            urgency: suggestion.urgency,
            reason: suggestion.reason,
            estimatedStockoutDate: suggestion.estimatedStockoutDate,
            costImpact: suggestion.costImpact,
            createdBy: user._id,
          });
          successCount++;
        }
      } catch (error) {
        console.error(
          `Error generating reorder suggestion for product ${product._id}:`,
          error
        );
        errorCount++;
      }
    }

    return {
      success: true,
      message: `Reorder suggestions generated successfully. ${successCount} suggestions created/updated, ${errorCount} errors.`,
      successCount,
      errorCount,
    };
  },
});

// Get user's reorder suggestions
export const getUserReorderSuggestions = query({
  args: {
    status: v.optional(v.string()),
    urgency: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.reordering._getCurrentUser);

    // Get user's products
    const userProducts = await ctx.db
      .query("products")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
      .collect();

    const userProductIds = new Set(userProducts.map((p) => p._id));

    // Get all reorder suggestions
    const allSuggestions = await ctx.db.query("reorderSuggestions").collect();

    // Filter by user's products
    let filteredSuggestions = allSuggestions.filter((suggestion) =>
      userProductIds.has(suggestion.productId)
    );

    // Filter by status if provided
    if (args.status) {
      filteredSuggestions = filteredSuggestions.filter(
        (suggestion) => suggestion.status === args.status
      );
    }

    // Filter by urgency if provided
    if (args.urgency) {
      filteredSuggestions = filteredSuggestions.filter(
        (suggestion) => suggestion.urgency === args.urgency
      );
    }

    // Sort by urgency (critical > high > medium > low) and then by creation date
    const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    filteredSuggestions.sort((a, b) => {
      const urgencyDiff =
        (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 0) -
        (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 0);
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.createdAt - a.createdAt;
    });

    // Apply limit if specified
    if (args.limit) {
      filteredSuggestions = filteredSuggestions.slice(0, args.limit);
    }

    // Add product details
    const suggestionsWithProducts = await Promise.all(
      filteredSuggestions.map(async (suggestion) => {
        const product = await ctx.db.get(suggestion.productId);
        return {
          ...suggestion,
          product,
        };
      })
    );

    return suggestionsWithProducts;
  },
});

// Update reorder suggestion status
export const updateReorderSuggestionStatus = mutation({
  args: {
    suggestionId: v.id("reorderSuggestions"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.reordering._getCurrentUser);

    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) {
      throw new Error("Reorder suggestion not found");
    }

    // Verify the suggestion belongs to a product owned by the user
    const product = await ctx.db.get(suggestion.productId);
    if (!product || product.createdBy !== user._id) {
      throw new Error("Unauthorized: This suggestion doesn't belong to you");
    }

    return await ctx.db.patch(args.suggestionId, {
      status: args.status,
      notes: args.notes,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });
  },
});

// Internal query to get all active products for a specific user
export const getAllActiveProductsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_created_by", (q) => q.eq("createdBy", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Internal query to get latest forecast (unchanged)
export const getLatestForecast = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("demandForecasts")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .first();
  },
});

// Internal mutation to create reorder suggestion (updated to include createdBy)
export const createReorderSuggestion = internalMutation({
  args: {
    productId: v.id("products"),
    suggestedQuantity: v.number(),
    urgency: v.string(),
    reason: v.string(),
    estimatedStockoutDate: v.optional(v.number()),
    costImpact: v.number(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if there's already a pending suggestion for this product
    const existingSuggestion = await ctx.db
      .query("reorderSuggestions")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingSuggestion) {
      // Update existing suggestion
      // Note: We don't update createdAt here as it should be immutable.
      return await ctx.db.patch(existingSuggestion._id, {
        suggestedQuantity: args.suggestedQuantity,
        urgency: args.urgency,
        reason: args.reason,
        estimatedStockoutDate: args.estimatedStockoutDate,
        costImpact: args.costImpact,
        // createdAt should not be updated
        updatedAt: Date.now(),
        updatedBy: args.createdBy, // The user triggering the generation is considered the updater here
      });
    } else {
      // Create new suggestion
      return await ctx.db.insert("reorderSuggestions", {
        ...args, // contains createdBy
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(), // Set updatedAt to the same as createdAt initially
        updatedBy: args.createdBy, // Set updatedBy to createdBy initially
      });
    }
  },
});

// Calculate reorder suggestion logic (unchanged)
function calculateReorderSuggestion(product: any, forecast: any) {
  const currentStock = product.currentStock;
  const reorderPoint = product.reorderPoint;
  const leadTimeDays = product.leadTimeDays;
  const maxStockLevel = product.maxStockLevel;

  // Default daily demand if no forecast available
  let dailyDemand = 1;
  if (forecast && forecast.predictedDemand > 0) {
    dailyDemand = forecast.predictedDemand;
  }

  // Calculate safety stock (20% of lead time demand)
  const leadTimeDemand = dailyDemand * leadTimeDays;
  const safetyStock = leadTimeDemand * 0.2;

  // Calculate days until stockout
  const daysUntilStockout = currentStock / dailyDemand;

  // Determine if reorder is needed
  let shouldReorder = false;
  let urgency = "low";
  let reason = "";
  let suggestedQuantity = 0;
  let estimatedStockoutDate: number | undefined;

  if (currentStock <= 0) {
    shouldReorder = true;
    urgency = "critical";
    reason = "Out of stock";
    suggestedQuantity = Math.max(
      product.reorderQuantity,
      leadTimeDemand + safetyStock
    );
    estimatedStockoutDate = Date.now();
  } else if (currentStock <= reorderPoint) {
    shouldReorder = true;
    urgency = daysUntilStockout <= leadTimeDays ? "high" : "medium";
    reason = `Stock below reorder point (${reorderPoint})`;
    suggestedQuantity = Math.max(
      product.reorderQuantity,
      maxStockLevel - currentStock
    );
    estimatedStockoutDate =
      Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000;
  } else if (daysUntilStockout <= leadTimeDays + 2) {
    shouldReorder = true;
    urgency = "medium";
    reason = `Projected stockout within lead time (${Math.round(daysUntilStockout)} days)`;
    suggestedQuantity = leadTimeDemand + safetyStock;
    estimatedStockoutDate =
      Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000;
  }

  // Calculate cost impact
  const stockoutCost =
    product.sellingPrice *
    dailyDemand *
    Math.max(0, leadTimeDays - daysUntilStockout);
  const carryingCost =
    ((product.unitCost * suggestedQuantity * 0.25) / 365) * leadTimeDays; // 25% annual carrying cost
  const costImpact = shouldReorder ? carryingCost : stockoutCost;

  return {
    shouldReorder,
    quantity: Math.round(suggestedQuantity),
    urgency,
    reason,
    estimatedStockoutDate,
    costImpact: Math.round(costImpact * 100) / 100,
  };
}
