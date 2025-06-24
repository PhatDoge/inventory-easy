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

// Record a new sale
export const recordSale = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    unitPrice: v.number(),
    channel: v.string(),
    customerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Check if enough stock is available
    if (product.currentStock < args.quantity) {
      throw new Error("Insufficient stock available");
    }

    // Record the sale
    const saleId = await ctx.db.insert("sales", {
      productId: args.productId,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      totalAmount: args.quantity * args.unitPrice,
      saleDate: Date.now(),
      channel: args.channel,
      customerId: args.customerId,
      createdBy: user._id,
    });

    // Update product stock
    await ctx.db.patch(args.productId, {
      currentStock: product.currentStock - args.quantity,
    });

    // Record stock movement
    await ctx.db.insert("stockMovements", {
      productId: args.productId,
      type: "sale",
      quantity: -args.quantity,
      reference: `SALE-${saleId}`,
      movementDate: Date.now(),
      createdBy: user._id,
    });

    return saleId;
  },
});

// Get sales data for analytics
export const getSalesAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    let salesQuery = ctx.db
      .query("sales")
      .withIndex("by_date", (q) =>
        q.gte("saleDate", args.startDate).lte("saleDate", args.endDate)
      );

    const sales = await salesQuery.collect();

    // Filter by user's products
    const userProducts = await ctx.db
      .query("products")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
      .collect();

    const userProductIds = new Set(userProducts.map((p) => p._id));
    const filteredSales = sales.filter((sale) =>
      userProductIds.has(sale.productId)
    );

    // Filter by specific product if provided
    const finalSales =
      args.productId ?
        filteredSales.filter((sale) => sale.productId === args.productId)
      : filteredSales;

    // Calculate analytics
    const totalRevenue = finalSales.reduce(
      (sum, sale) => sum + sale.totalAmount,
      0
    );
    const totalQuantity = finalSales.reduce(
      (sum, sale) => sum + sale.quantity,
      0
    );
    const averageOrderValue =
      finalSales.length > 0 ? totalRevenue / finalSales.length : 0;

    // Group by channel
    const channelBreakdown = finalSales.reduce(
      (acc, sale) => {
        acc[sale.channel] = (acc[sale.channel] || 0) + sale.totalAmount;
        return acc;
      },
      {} as Record<string, number>
    );

    // Daily sales trend
    const dailySales = finalSales.reduce(
      (acc, sale) => {
        const date = new Date(sale.saleDate).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { revenue: 0, quantity: 0, orders: 0 };
        }
        acc[date].revenue += sale.totalAmount;
        acc[date].quantity += sale.quantity;
        acc[date].orders += 1;
        return acc;
      },
      {} as Record<
        string,
        { revenue: number; quantity: number; orders: number }
      >
    );

    return {
      totalRevenue,
      totalQuantity,
      averageOrderValue,
      totalOrders: finalSales.length,
      channelBreakdown,
      dailySales,
      sales: finalSales,
    };
  },
});

// Get top selling products
export const getTopSellingProducts = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_date", (q) =>
        q.gte("saleDate", args.startDate).lte("saleDate", args.endDate)
      )
      .collect();

    // Filter by user's products
    const userProducts = await ctx.db
      .query("products")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
      .collect();

    const userProductIds = new Set(userProducts.map((p) => p._id));
    const filteredSales = sales.filter((sale) =>
      userProductIds.has(sale.productId)
    );

    // Group by product
    const productSales = filteredSales.reduce(
      (acc, sale) => {
        const productId = sale.productId;
        if (!acc[productId]) {
          acc[productId] = {
            productId,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
          };
        }
        acc[productId].totalQuantity += sale.quantity;
        acc[productId].totalRevenue += sale.totalAmount;
        acc[productId].orderCount += 1;
        return acc;
      },
      {} as Record<string, any>
    );

    // Convert to array and sort by quantity
    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
      .slice(0, args.limit || 10);

    // Add product details
    const productsWithDetails = await Promise.all(
      topProducts.map(async (item: any) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    return productsWithDetails;
  },
});
