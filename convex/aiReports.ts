"use Convex/server";

import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { api, internal } from "./_generated/api";

// Interface for the analytics data passed to the action
interface AnalyticsData {
  dateRange: string; // e.g., "Last 30 days"
  selectedProduct?: string; // Name of the selected product, or "All Products"
  totalRevenue: number;
  revenueGrowth: number; // Percentage
  totalQuantity: number;
  quantityGrowth: number; // Percentage
  totalOrders: number;
  averageOrderValue: number;
  dailySalesData?: Array<{ date: string; revenue: number; quantity: number }>; // Optional: simplified daily trend
  topProducts?: Array<{ name?: string; quantity: number; revenue: number }>;
  salesByChannel?: Record<string, number>; // e.g., { "Online": 5000, "In-Store": 2500 }
  inventoryMetrics: {
    totalProducts: number;
    lowStockCount: number;
    totalInventoryValue: number;
  };
}

export const generateAnalyticsReport = action({
  args: {
    analyticsData: v.object({
      dateRange: v.string(),
      selectedProduct: v.optional(v.string()),
      totalRevenue: v.number(),
      revenueGrowth: v.number(),
      totalQuantity: v.number(),
      quantityGrowth: v.number(),
      totalOrders: v.number(),
      averageOrderValue: v.number(),
      dailySalesData: v.optional(
        v.array(
          v.object({
            date: v.string(),
            revenue: v.number(),
            quantity: v.number(),
          })
        )
      ),
      topProducts: v.optional(
        v.array(
          v.object({
            name: v.optional(v.string()),
            quantity: v.number(),
            revenue: v.number(),
          })
        )
      ),
      salesByChannel: v.optional(v.any()), // Using v.any() for simplicity, can be more specific
      inventoryMetrics: v.object({
        totalProducts: v.number(),
        lowStockCount: v.number(),
        totalInventoryValue: v.number(),
      }),
    }),
  },
  handler: async (ctx, { analyticsData }) => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is not set. Please configure it in your Convex dashboard."
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Construct a detailed prompt for GPT-4o
    let prompt = `Generate a concise business performance report based on the following analytics data for the period "${analyticsData.dateRange}"`;
    if (
      analyticsData.selectedProduct &&
      analyticsData.selectedProduct !== "All Products"
    ) {
      prompt += ` (focused on product: ${analyticsData.selectedProduct})`;
    }
    prompt += `:\n\n`;

    prompt += `Key Metrics:\n`;
    prompt += `- Total Revenue: $${analyticsData.totalRevenue.toFixed(2)} (Growth: ${analyticsData.revenueGrowth.toFixed(1)}%)\n`;
    prompt += `- Units Sold: ${analyticsData.totalQuantity} (Growth: ${analyticsData.quantityGrowth.toFixed(1)}%)\n`;
    prompt += `- Total Orders: ${analyticsData.totalOrders}\n`;
    prompt += `- Average Order Value: $${analyticsData.averageOrderValue.toFixed(2)}\n\n`;

    if (
      analyticsData.dailySalesData &&
      analyticsData.dailySalesData.length > 0
    ) {
      prompt += `Sales Trend Summary:\n`;
      const firstDayRevenue = analyticsData.dailySalesData[0].revenue;
      const lastDayRevenue =
        analyticsData.dailySalesData[analyticsData.dailySalesData.length - 1]
          .revenue;
      prompt += `- Sales trend over the period: ${
        firstDayRevenue < lastDayRevenue ? "Generally upward"
        : firstDayRevenue > lastDayRevenue ? "Generally downward"
        : "Stable/Fluctuating"
      }.\n`;
      prompt += `- Data includes ${analyticsData.dailySalesData.length} data points.\n\n`;
    }

    if (analyticsData.salesByChannel) {
      prompt += `Sales by Channel:\n`;
      for (const [channel, revenue] of Object.entries(
        analyticsData.salesByChannel
      )) {
        prompt += `- ${channel}: $${(revenue as number).toFixed(2)}\n`;
      }
      prompt += `\n`;
    }

    if (analyticsData.topProducts && analyticsData.topProducts.length > 0) {
      prompt += `Top Selling Products:\n`;
      analyticsData.topProducts.slice(0, 3).forEach((p) => {
        prompt += `- ${p.name || "Unknown Product"}: ${p.quantity} units, $${p.revenue.toFixed(2)} revenue\n`;
      });
      prompt += `\n`;
    }

    prompt += `Inventory Status:\n`;
    prompt += `- Total Products: ${analyticsData.inventoryMetrics.totalProducts}\n`;
    prompt += `- Low Stock Items: ${analyticsData.inventoryMetrics.lowStockCount}\n`;
    prompt += `- Total Inventory Value: $${analyticsData.inventoryMetrics.totalInventoryValue.toFixed(2)}\n\n`;

    prompt += `Please provide a summary that includes:
1.  An overall assessment of performance.
2.  Key highlights (positive or negative).
3.  Potential insights or areas to watch.
4.  Any actionable recommendations if obvious from the data.
Keep the report professional, clear, and easy to understand for a business owner. Aim for 3-5 key paragraphs.`;

    let reportContent = "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an expert business analyst AI. Your task is to generate insightful reports from analytics data.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 700, // Increased max_tokens for potentially longer reports
      });

      reportContent = completion.choices[0]?.message?.content || "";
      if (!reportContent) {
        throw new Error(
          "OpenAI response was empty or in an unexpected format."
        );
      }
    } catch (error) {
      console.error("OpenAI API call failed:", error);
      if (error instanceof OpenAI.APIError) {
        throw new Error(
          `OpenAI API Error: ${error.status} ${error.name} - ${error.message}`
        );
      }
      throw new Error(
        "Failed to generate AI report due to an issue with the OpenAI API call."
      );
    }

    // Save the report to the database
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("User not authenticated.");
    }

    // Get the full user document to get the user's _id
    const userDoc = await ctx.runQuery(api.users.getMyUserDoc, {});
    if (!userDoc) {
      throw new Error("User document not found.");
    }

    const now = new Date();
    const reportName = `AI Report - ${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")} ${now
      .getHours()
      .toString()
      .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    await ctx.runMutation(internal.aiReports.saveReport, {
      reportName,
      reportContent,
      generatedAt: Date.now(),
      userId: userDoc._id,
      filters: {
        dateRange: analyticsData.dateRange,
        selectedProduct: analyticsData.selectedProduct,
      },
    });

    return reportContent; // Return the content for immediate display as before
  },
});

// Internal mutation to save the report
export const saveReport = internalMutation({
  args: {
    reportName: v.string(),
    reportContent: v.string(),
    generatedAt: v.number(),
    userId: v.id("users"),
    filters: v.object({
      dateRange: v.string(),
      selectedProduct: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiReports", {
      reportName: args.reportName,
      reportContent: args.reportContent,
      generatedAt: args.generatedAt,
      userId: args.userId,
      filters: args.filters,
    });
  },
});

// Query to get reports for the current user
import { query } from "./_generated/server";

export const getReportsForCurrentUser = query({
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      // Not throwing an error, but returning an empty array or null
      // because the UI should handle the "not logged in" state gracefully.
      // Alternatively, throw an error if reports should strictly only be fetched by logged-in users.
      return [];
    }

    // Get the full user document to get the user's _id
    const userDoc = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", user.subject))
      .unique();

    if (!userDoc) {
      // This case should ideally not happen if users are synced correctly
      console.warn("User document not found for clerkId:", user.subject);
      return [];
    }

    return await ctx.db
      .query("aiReports")
      .withIndex("by_user_and_time", (q) => q.eq("userId", userDoc._id))
      .order("desc") // Show newest reports first
      .collect();
  },
});
