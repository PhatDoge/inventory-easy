import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

// Generate demand forecasts for user's products
export const generateForecasts = action({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    // Get all active products for this user
    const products = await ctx.runQuery(
      internal.forecasting.getAllActiveProductsForUser,
      {
        userId: user._id,
      }
    );

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Get historical sales data
        const salesData = await ctx.runQuery(
          internal.forecasting.getProductSalesHistory,
          {
            productId: product._id,
          }
        );

        if (salesData.length < 7) {
          // Not enough data for forecasting
          continue;
        }

        // Generate forecast using simple linear regression with seasonal adjustment
        const forecast = await generateSimpleForecast(salesData);

        // Save forecast to database
        await ctx.runMutation(internal.forecasting.saveForecast, {
          productId: product._id,
          predictedDemand: forecast.predictedDemand,
          confidence: forecast.confidence,
          seasonalFactor: forecast.seasonalFactor,
          trendFactor: forecast.trendFactor,
          algorithm: "linear_regression_seasonal",
          createdBy: user._id,
        });

        successCount++;
      } catch (error) {
        console.error(`Error forecasting for product ${product._id}:`, error);
        errorCount++;
      }
    }

    return {
      success: true,
      message: `Forecasts generated successfully. ${successCount} succeeded, ${errorCount} failed.`,
      successCount,
      errorCount,
    };
  },
});

// Get user's demand forecasts
export const getUserForecasts = query({
  args: {
    productId: v.optional(v.id("products")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Get user's products
    const userProducts = await ctx.db
      .query("products")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
      .collect();

    const userProductIds = new Set(userProducts.map((p) => p._id));

    // Query forecasts
    const forecastsQuery = ctx.db.query("demandForecasts");

    const allForecasts = await forecastsQuery.collect();

    // Filter by user's products
    let filteredForecasts = allForecasts.filter((forecast) =>
      userProductIds.has(forecast.productId)
    );

    // Filter by specific product if provided
    if (args.productId) {
      filteredForecasts = filteredForecasts.filter(
        (forecast) => forecast.productId === args.productId
      );
    }

    // Sort by forecast date (most recent first)
    filteredForecasts.sort((a, b) => b.forecastDate - a.forecastDate);

    // Apply limit if specified
    if (args.limit) {
      filteredForecasts = filteredForecasts.slice(0, args.limit);
    }

    // Add product details
    const forecastsWithProducts = await Promise.all(
      filteredForecasts.map(async (forecast) => {
        const product = await ctx.db.get(forecast.productId);
        return {
          ...forecast,
          product,
        };
      })
    );

    return forecastsWithProducts;
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

// Internal query to get product sales history (unchanged but included for completeness)
export const getProductSalesHistory = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_product_and_date", (q) =>
        q.eq("productId", args.productId).gte("saleDate", ninetyDaysAgo)
      )
      .collect();

    // Group by day
    const dailySales = sales.reduce(
      (acc, sale) => {
        const date = new Date(sale.saleDate).toISOString().split("T")[0];
        acc[date] = (acc[date] || 0) + sale.quantity;
        return acc;
      },
      {} as Record<string, number>
    );

    // Convert to array with dates
    const salesArray = Object.entries(dailySales)
      .map(([date, quantity]) => ({
        date: new Date(date).getTime(),
        quantity,
      }))
      .sort((a, b) => a.date - b.date);

    return salesArray;
  },
});

// Internal mutation to save forecast (updated to include createdBy)
export const saveForecast = internalMutation({
  args: {
    productId: v.id("products"),
    predictedDemand: v.number(),
    confidence: v.number(),
    seasonalFactor: v.number(),
    trendFactor: v.number(),
    algorithm: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return await ctx.db.insert("demandForecasts", {
      ...args,
      forecastDate: tomorrow.getTime(),
      createdAt: Date.now(),
    });
  },
});

// Simple forecasting algorithm (unchanged)
async function generateSimpleForecast(
  salesData: Array<{ date: number; quantity: number }>
) {
  if (salesData.length < 7) {
    throw new Error("Insufficient data for forecasting");
  }

  // Calculate basic statistics
  const quantities = salesData.map((d) => d.quantity);
  const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;

  // Simple linear trend calculation
  const n = salesData.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  salesData.forEach((point, index) => {
    const x = index;
    const y = point.quantity;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict next day
  const nextX = n;
  let predictedDemand = slope * nextX + intercept;

  // Apply seasonal adjustment (simple day-of-week pattern)
  const lastDate = new Date(salesData[salesData.length - 1].date);
  const nextDayOfWeek = (lastDate.getDay() + 1) % 7;

  // Calculate day-of-week averages
  const dayOfWeekSales = salesData.reduce(
    (acc, point) => {
      const dayOfWeek = new Date(point.date).getDay();
      if (!acc[dayOfWeek]) acc[dayOfWeek] = [];
      acc[dayOfWeek].push(point.quantity);
      return acc;
    },
    {} as Record<number, number[]>
  );

  let seasonalFactor = 1;
  if (
    dayOfWeekSales[nextDayOfWeek] &&
    dayOfWeekSales[nextDayOfWeek].length > 0
  ) {
    const dayAverage =
      dayOfWeekSales[nextDayOfWeek].reduce((sum, q) => sum + q, 0) /
      dayOfWeekSales[nextDayOfWeek].length;
    seasonalFactor = mean > 0 ? dayAverage / mean : 1;
  }

  predictedDemand = Math.max(0, predictedDemand * seasonalFactor);

  // Calculate confidence based on variance
  const variance =
    quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) /
    quantities.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
  const confidence = Math.max(0.1, Math.min(0.9, 1 - coefficientOfVariation));

  return {
    predictedDemand: Math.round(predictedDemand * 100) / 100,
    confidence,
    seasonalFactor,
    trendFactor: slope,
  };
}
