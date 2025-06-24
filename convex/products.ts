import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to get the current user from Clerk
const getCurrentUser = async (ctx: any) => {
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
};

// Get all products for the authenticated user
export const list = query({
  args: {
    category: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    let query = ctx.db
      .query("products")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user._id));

    if (args.searchTerm) {
      return await ctx.db
        .query("products")
        .withSearchIndex("search_products", (q) =>
          q.search("name", args.searchTerm!).eq("isActive", true)
        )
        .collect();
    }

    const products = await query.collect();

    if (args.category) {
      return products.filter((p) => p.category === args.category && p.isActive);
    }

    return products.filter((p) => p.isActive);
  },
});

// Get low stock products
export const getLowStockProducts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const products = await ctx.db
      .query("products")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
      .collect();

    return products.filter(
      (p) => p.isActive && p.currentStock <= p.reorderPoint
    );
  },
});

// Create a new product
export const create = mutation({
  args: {
    name: v.string(),
    sku: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    unitCost: v.number(),
    sellingPrice: v.number(),
    supplier: v.string(),
    leadTimeDays: v.number(),
    minStockLevel: v.number(),
    maxStockLevel: v.number(),
    currentStock: v.number(),
    reorderPoint: v.number(),
    reorderQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Check if SKU already exists
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();

    if (existingProduct) {
      throw new Error("Product with this SKU already exists");
    }

    return await ctx.db.insert("products", {
      ...args,
      isActive: true,
      createdBy: user._id,
    });
  },
});

// Update product stock
export const updateStock = mutation({
  args: {
    productId: v.id("products"),
    newStock: v.number(),
    movementType: v.string(),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const stockDifference = args.newStock - product.currentStock;

    // Update product stock
    await ctx.db.patch(args.productId, {
      currentStock: args.newStock,
    });

    // Record stock movement
    await ctx.db.insert("stockMovements", {
      productId: args.productId,
      type: args.movementType,
      quantity: stockDifference,
      reference: args.reference,
      notes: args.notes,
      movementDate: Date.now(),
      createdBy: user._id,
    });

    return { success: true };
  },
});

// Get product categories
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const products = await ctx.db
      .query("products")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
      .collect();

    const categories = [...new Set(products.map((p) => p.category))];
    return categories.sort();
  },
});

// Get product details with recent sales data
export const getProductDetails = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Get recent sales (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentSales = await ctx.db
      .query("sales")
      .withIndex("by_product_and_date", (q) =>
        q.eq("productId", args.productId).gte("saleDate", thirtyDaysAgo)
      )
      .collect();

    // Get recent stock movements
    const recentMovements = await ctx.db
      .query("stockMovements")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(10);

    // Get latest forecast
    const latestForecast = await ctx.db
      .query("demandForecasts")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .first();

    return {
      product,
      recentSales,
      recentMovements,
      latestForecast,
      totalSalesLast30Days: recentSales.reduce(
        (sum, sale) => sum + sale.quantity,
        0
      ),
      averageDailySales:
        recentSales.length > 0 ?
          recentSales.reduce((sum, sale) => sum + sale.quantity, 0) / 30
        : 0,
    };
  },
});
