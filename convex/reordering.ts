import {
  action,
  internalMutation,
  internalQuery,
  query,
  mutation, // Will remove this if not used elsewhere after change
  action, // Added for the new action
} from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api"; // Ensure api is imported

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

// Update reorder suggestion status (now an action)
export const updateReorderSuggestionStatus = action({
  args: {
    suggestionId: v.id("reorderSuggestions"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.reordering._getCurrentUser);

    // It's good practice for actions that modify data to do so via mutations.
    // So, we'll have an internal mutation to handle the DB write for the suggestion status
    // and then, if approved, call the products.updateStock mutation.

    const suggestion = await ctx.runQuery(
      internal.reordering.getSuggestionById,
      { suggestionId: args.suggestionId }
    );

    if (!suggestion) {
      throw new Error("Reorder suggestion not found");
    }

    // Verify the suggestion belongs to a product owned by the user (can be done in internal mutation too)
    const product = await ctx.runQuery(internal.products.getProductOwner, {
      productId: suggestion.productId,
    });
    if (!product || product.createdBy !== user._id) {
      throw new Error(
        "Unauthorized: This suggestion does not belong to your products or product not found."
      );
    }

    // Update the suggestion status via an internal mutation
    await ctx.runMutation(internal.reordering.internalUpdateSuggestionStatus, {
      suggestionId: args.suggestionId,
      status: args.status,
      notes: args.notes,
      userId: user._id,
    });

    // If the status is 'approved', update the product stock
    if (args.status === "approved") {
      if (!suggestion.suggestedQuantity || suggestion.suggestedQuantity <= 0) {
        console.warn(
          `Suggestion ${args.suggestionId} approved, but suggestedQuantity is invalid: ${suggestion.suggestedQuantity}. Stock not updated.`
        );
        // Optionally, throw an error or return a specific message
        return {
          success: true,
          message:
            "Suggestion approved, but stock not updated due to invalid quantity.",
        };
      }

      try {
        await ctx.runMutation(api.products.updateStock, {
          productId: suggestion.productId,
          quantityChange: suggestion.suggestedQuantity,
          movementType: "reorder_approved",
          notes: `Approved reorder suggestion ${args.suggestionId}`,
          // reference: args.suggestionId, // Could be useful
        });
      } catch (error) {
        // Log the error and potentially return a partial success message
        console.error(
          `Failed to update stock for approved suggestion ${args.suggestionId}:`,
          error
        );
        throw new Error(
          `Suggestion status updated, but failed to update product stock: ${(error as Error).message}`
        );
      }
    }
    return { success: true };
  },
});

// Internal query to get a suggestion by ID (needed for the action)
export const getSuggestionById = internalQuery({
  args: { suggestionId: v.id("reorderSuggestions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.suggestionId);
  },
});

// Internal mutation to update suggestion status (called by the action)
export const internalUpdateSuggestionStatus = internalMutation({
  args: {
    suggestionId: v.id("reorderSuggestions"),
    status: v.string(),
    notes: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Basic validation or checks can happen here too
    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) {
      throw new Error("Reorder suggestion not found for internal update.");
    }
    // Potentially re-verify product ownership if needed, though action does it.

    return await ctx.db.patch(args.suggestionId, {
      status: args.status,
      notes: args.notes,
      updatedAt: Date.now(),
      updatedBy: args.userId,
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

// Calculate reorder suggestion logic (updated for new critical definition)
function calculateReorderSuggestion(product: any, forecast: any) {
  const currentStock = product.currentStock;
  const reorderPoint = product.reorderPoint;
  const leadTimeDays = product.leadTimeDays;
  const maxStockLevel = product.maxStockLevel;
  const LOW_STOCK_THRESHOLD = 5; // Define a constant for clarity

  // Default daily demand if no forecast available
  let dailyDemand = 1;
  if (forecast && forecast.predictedDemand > 0) {
    dailyDemand = forecast.predictedDemand;
  }

  // Calculate safety stock (20% of lead time demand)
  const leadTimeDemand = dailyDemand * leadTimeDays;
  const safetyStock = leadTimeDemand * 0.2;

  // Calculate days until stockout
  // Ensure dailyDemand is not zero to prevent division by zero if currentStock is positive.
  // If dailyDemand is zero and stock is positive, daysUntilStockout is effectively infinite.
  const daysUntilStockout =
    dailyDemand > 0 ? currentStock / dailyDemand : Infinity;

  let shouldReorder = false;
  let urgency = "low"; // Default urgency
  let reason = "";
  let suggestedQuantity = 0;
  let estimatedStockoutDate: number | undefined;

  // Priority 1: Out of stock OR very low stock (below threshold)
  if (currentStock <= 0) {
    shouldReorder = true;
    urgency = "critical";
    reason = "Out of stock";
    suggestedQuantity = Math.max(
      product.reorderQuantity,
      leadTimeDemand + safetyStock
    );
    estimatedStockoutDate = Date.now(); // Stockout is now
  } else if (currentStock < LOW_STOCK_THRESHOLD) {
    // Item is not out of stock, but below the defined low stock threshold
    shouldReorder = true;
    urgency = "critical"; // Mark as critical due to low stock
    reason = `Critically low stock (below ${LOW_STOCK_THRESHOLD} units)`;
    // Suggest reordering up to max stock level or at least reorder quantity / lead time demand + safety
    suggestedQuantity = Math.max(
      product.reorderQuantity,
      maxStockLevel - currentStock,
      leadTimeDemand + safetyStock
    );
    if (daysUntilStockout !== Infinity) {
      estimatedStockoutDate =
        Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000;
    }
  }
  // Priority 2: Stock below reorder point (and not already critical due to very low stock)
  else if (currentStock <= reorderPoint) {
    shouldReorder = true;
    // If projected stockout is within lead time, it's high urgency. Otherwise, medium.
    urgency =
      daysUntilStockout !== Infinity && daysUntilStockout <= leadTimeDays ?
        "high"
      : "medium";
    reason = `Stock below reorder point (${reorderPoint})`;
    suggestedQuantity = Math.max(
      product.reorderQuantity,
      maxStockLevel - currentStock
    );
    if (daysUntilStockout !== Infinity) {
      estimatedStockoutDate =
        Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000;
    }
  }
  // Priority 3: Projected stockout soon (even if above reorder point, and not critical/high)
  else if (
    daysUntilStockout !== Infinity &&
    daysUntilStockout <= leadTimeDays + 2
  ) {
    shouldReorder = true;
    urgency = "medium";
    reason = `Projected stockout within lead time + 2 days (${Math.round(daysUntilStockout)} days)`;
    suggestedQuantity = leadTimeDemand + safetyStock; // Suggest covering lead time demand + safety
    estimatedStockoutDate =
      Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000;
  }

  // Calculate cost impact
  const stockoutCost =
    daysUntilStockout !== Infinity ?
      product.sellingPrice *
      dailyDemand *
      Math.max(0, leadTimeDays - daysUntilStockout)
    : 0; // No stockout cost if demand is 0 or daysUntilStockout is infinite

  // const carryingCost =
  //   ((product.unitCost * suggestedQuantity * 0.25) / 365) * leadTimeDays; // 25% annual carrying cost

  let finalCostImpact = 0;
  if (shouldReorder) {
    finalCostImpact = suggestedQuantity * product.unitCost; // Cost of the suggested order
  } else if (
    currentStock > 0 &&
    dailyDemand > 0 &&
    daysUntilStockout <= leadTimeDays
  ) {
    // Potential stockout if no action taken
    finalCostImpact = stockoutCost;
  }

  return {
    shouldReorder,
    quantity: Math.round(suggestedQuantity),
    urgency,
    reason,
    estimatedStockoutDate,
    costImpact: Math.round(finalCostImpact * 100) / 100,
  };
}
