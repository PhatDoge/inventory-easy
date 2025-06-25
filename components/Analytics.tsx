"use client";
import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react"; // Added useAction
import { useState, useMemo, useEffect } from "react"; // Added useEffect
import { toast } from "sonner";
import { AIReportModal } from "./AIReportModal";
import { AIReportList } from "./AIReportList"; // Import the new component
import { DailySalesChart } from "./DailySalesChart"; // Import new chart component
import { SalesByChannelChart } from "./SalesByChannelChart"; // Import new chart component

export function Analytics() {
  const [dateRange, setDateRange] = useState("30");
  const [selectedProductState, setSelectedProductState] = useState(""); // Renamed to avoid conflict

  // ADD THESE MISSING STATE DECLARATIONS
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false); // This was missing!

  const products = useQuery(api.products.list, {}) || [];
  const generateReportAction = useAction(api.aiReports.generateAnalyticsReport);

  // Memoize date calculations to prevent re-renders
  const dateParams = useMemo(() => {
    const daysAgo = parseInt(dateRange);
    const startDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    const endDate = Date.now();
    const previousStartDate = startDate - daysAgo * 24 * 60 * 60 * 1000;

    return {
      daysAgo,
      startDate,
      endDate,
      previousStartDate,
      productId: selectedProductState || undefined, // Updated to selectedProductState
    };
  }, [dateRange, selectedProductState]);

  const salesAnalytics = useQuery(api.sales.getSalesAnalytics, {
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    productId: dateParams.productId,
  });

  const topProducts =
    useQuery(api.sales.getTopSellingProducts, {
      startDate: dateParams.startDate,
      endDate: dateParams.endDate,
      limit: 10,
    }) || [];

  const previousSalesAnalytics = useQuery(api.sales.getSalesAnalytics, {
    startDate: dateParams.previousStartDate,
    endDate: dateParams.startDate,
    productId: dateParams.productId,
  });

  // Memoize growth calculations
  const growthMetrics = useMemo(() => {
    if (!salesAnalytics || !previousSalesAnalytics) {
      return { revenueGrowth: 0, quantityGrowth: 0 };
    }

    const revenueGrowth =
      previousSalesAnalytics.totalRevenue > 0 ?
        ((salesAnalytics.totalRevenue - previousSalesAnalytics.totalRevenue) /
          previousSalesAnalytics.totalRevenue) *
        100
      : 0;

    const quantityGrowth =
      previousSalesAnalytics.totalQuantity > 0 ?
        ((salesAnalytics.totalQuantity - previousSalesAnalytics.totalQuantity) /
          previousSalesAnalytics.totalQuantity) *
        100
      : 0;

    return { revenueGrowth, quantityGrowth };
  }, [salesAnalytics, previousSalesAnalytics]);

  // Memoize daily sales data processing
  const dailySalesData = useMemo(() => {
    if (!salesAnalytics?.dailySales) return [];

    // Transform the data to match the validator: Array of objects {date, quantity, revenue}
    return Object.entries(salesAnalytics.dailySales)
      .map(([date, data]) => ({
        date: date,
        quantity:
          typeof (data as any).quantity === "number" ?
            (data as any).quantity
          : 0,
        revenue:
          typeof (data as any).revenue === "number" ? (data as any).revenue : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Removed slice(-30) here as Recharts can handle more data points,
    // and filtering by date range is already applied.
    // We might re-introduce a limit later if performance becomes an issue with very large datasets.
  }, [salesAnalytics?.dailySales]);

  useEffect(() => {
    console.log(
      "Analytics.tsx: salesAnalytics.dailySales changed or component updated.",
      {
        selectedProduct: selectedProductState || "All Products",
        dailySalesFromBackend: salesAnalytics?.dailySales,
      }
    );
  }, [salesAnalytics?.dailySales, selectedProductState]);

  useEffect(() => {
    console.log(
      "Analytics.tsx: dailySalesData (for chart) changed or component updated.",
      {
        selectedProduct: selectedProductState || "All Products",
        dailySalesForChart: dailySalesData,
      }
    );
  }, [dailySalesData, selectedProductState]);

  const channelChartData = useMemo(() => {
    if (!salesAnalytics?.channelBreakdown) return [];
    return Object.entries(salesAnalytics.channelBreakdown)
      .map(([name, revenue]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize channel name
        revenue: revenue as number,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [salesAnalytics?.channelBreakdown]);

  // Memoize inventory calculations
  const inventoryMetrics = useMemo(() => {
    const lowStockCount = products.filter(
      (p) => p.currentStock <= p.reorderPoint
    ).length;
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + p.currentStock * p.unitCost,
      0
    );

    return { lowStockCount, totalInventoryValue };
  }, [products]);

  const handleGenerateReport = async () => {
    if (!salesAnalytics) {
      toast.error(
        "Analytics data is not available yet. Please wait or try refreshing."
      );
      return;
    }

    setIsGeneratingReport(true);
    setAiReport(null);
    setShowReportModal(false); // Reset modal state

    // Prepare data for the report
    const dataForReport = {
      // Spread currentPeriod metrics
      ...(salesAnalytics && {
        totalRevenue: salesAnalytics.totalRevenue,
        totalQuantity: salesAnalytics.totalQuantity,
        totalOrders: salesAnalytics.totalOrders,
        averageOrderValue: salesAnalytics.averageOrderValue,
        dailySalesData: dailySalesData, // Ensure this aligns with validator (was dailySales)
        salesByChannel: salesAnalytics.channelBreakdown, // Ensure this aligns with validator (was channelBreakdown)
      }),
      // Spread growthMetrics
      ...growthMetrics,
      // Other data
      topProducts: topProducts.map((p) => ({
        name: p.product?.name,
        quantity: p.totalQuantity,
        revenue: p.totalRevenue,
      })),
      inventoryMetrics: {
        // Ensure inventoryMetrics structure matches validator
        lowStockCount: inventoryMetrics.lowStockCount,
        totalInventoryValue: inventoryMetrics.totalInventoryValue,
        totalProducts: products.length, // Make sure totalProducts is included
      },
      dateRange: String(dateParams.daysAgo), // Ensure dateRange is a string
      selectedProduct: products.find((p) => p._id === selectedProductState)
        ?.name,
      // previousPeriod data is not directly part of the validator, so it's fine as is or handle as needed for prompt
    };

    // Remove properties that might be undefined if salesAnalytics is null, to prevent sending nulls for required fields
    if (!salesAnalytics) {
      delete (dataForReport as any).totalRevenue;
      delete (dataForReport as any).totalQuantity;
      delete (dataForReport as any).totalOrders;
      delete (dataForReport as any).averageOrderValue;
      delete (dataForReport as any).dailySalesData;
      delete (dataForReport as any).salesByChannel;
    }

    try {
      const report = await generateReportAction({
        analyticsData: dataForReport as any, // Cast to any if there are slight mismatches not caught by TS
      });
      console.log("Generated report:", report);
      setAiReport(report);
      setShowReportModal(true);
    } catch (error) {
      console.error("Failed to generate AI report:", error);
      toast.error(
        "Failed to generate AI report. " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Your existing header and controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <div className="flex space-x-3 items-center">
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport || !salesAnalytics}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {isGeneratingReport ?
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            : <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2V3a1 1 0 10-2 0v1H9V3a1 1 0 00-1-1H7zm0 2h6V3a1 1 0 10-2 0v1H9V3a1 1 0 00-1-1H7v2zm2 4a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 112 0 1 1 0 01-2 0zm10-1a1 1 0 100-2 1 1 0 000 2zM6 14a1 1 0 112 0 1 1 0 01-2 0zm8-1a1 1 0 100-2 1 1 0 000 2zm-4 1a1 1 0 112 0 1 1 0 01-2 0zm-3-3a1 1 0 100-2 1 1 0 000 2zm8-1a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            }
            <span>
              {isGeneratingReport ? "Generating..." : "Generate AI Report"}
            </span>
          </button>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <select
            value={selectedProductState} // Updated to selectedProductState
            onChange={(e) => setSelectedProductState(e.target.value)} // Updated to setSelectedProductState
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Products</option>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics with Growth */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${salesAnalytics?.totalRevenue?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
          <div className="mt-2">
            <span
              className={`text-sm font-medium ${
                growthMetrics.revenueGrowth >= 0 ?
                  "text-green-600"
                : "text-red-600"
              }`}
            >
              {growthMetrics.revenueGrowth >= 0 ? "↗" : "↘"}{" "}
              {Math.abs(growthMetrics.revenueGrowth).toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">
              vs previous period
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Units Sold</p>
              <p className="text-2xl font-bold text-gray-900">
                {salesAnalytics?.totalQuantity || 0}
              </p>
            </div>
            <div className="text-2xl">📦</div>
          </div>
          <div className="mt-2">
            <span
              className={`text-sm font-medium ${
                growthMetrics.quantityGrowth >= 0 ?
                  "text-green-600"
                : "text-red-600"
              }`}
            >
              {growthMetrics.quantityGrowth >= 0 ? "↗" : "↘"}{" "}
              {Math.abs(growthMetrics.quantityGrowth).toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">
              vs previous period
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {salesAnalytics?.totalOrders || 0}
              </p>
            </div>
            <div className="text-2xl">🛒</div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-500">
              {Math.round(
                ((salesAnalytics?.totalOrders || 0) / dateParams.daysAgo) * 10
              ) / 10}{" "}
              orders/day avg
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Avg Order Value
              </p>
              <p className="text-2xl font-bold text-gray-900">
                ${salesAnalytics?.averageOrderValue?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-500">
              Per transaction average
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📈 Daily Sales Trend
          </h2>
          <DailySalesChart data={dailySalesData} />
        </div>

        {/* Channel Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎯 Sales by Channel
          </h2>
          <SalesByChannelChart data={channelChartData} />
        </div>
      </div>

      {/* Top Products Performance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🏆 Product Performance
        </h2>
        {topProducts.length > 0 ?
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Rank</th>
                  <th className="text-left py-3 px-2">Product</th>
                  <th className="text-left py-3 px-2">Units Sold</th>
                  <th className="text-left py-3 px-2">Revenue</th>
                  <th className="text-left py-3 px-2">Orders</th>
                  <th className="text-left py-3 px-2">Avg Order Size</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((item, index) => (
                  <tr
                    key={item.productId}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-3 px-2">
                      <span className="font-bold text-blue-600">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.product?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.product?.sku}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-2 font-medium">
                      {item.totalQuantity}
                    </td>
                    <td className="py-3 px-2 font-medium text-green-600">
                      ${item.totalRevenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-2">{item.orderCount}</td>
                    <td className="py-3 px-2">
                      {(item.totalQuantity / item.orderCount).toFixed(1)} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        : <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No sales data
            </h3>
            <p className="text-gray-600">
              Start recording sales to see analytics and insights
            </p>
          </div>
        }
      </div>

      {/* Inventory Insights */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📦 Inventory Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">📈</div>
            <p className="text-sm text-gray-600">Total Products</p>
            <p className="text-xl font-bold text-blue-600">{products.length}</p>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="text-sm text-gray-600">Low Stock Items</p>
            <p className="text-xl font-bold text-yellow-600">
              {inventoryMetrics.lowStockCount}
            </p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">💰</div>
            <p className="text-sm text-gray-600">Total Inventory Value</p>
            <p className="text-xl font-bold text-green-600">
              ${inventoryMetrics.totalInventoryValue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* MOVE THE MODAL HERE - AT THE END OF THE COMPONENT */}
      {showReportModal && aiReport && (
        <AIReportModal
          report={aiReport}
          onClose={() => {
            setShowReportModal(false);
            setAiReport(null); // Optional: clear the report
          }}
        />
      )}

      {/* Render the AIReportList component */}
      <AIReportList />
    </div>
  );
}
