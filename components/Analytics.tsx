import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState, useMemo } from "react";

export function Analytics() {
  const [dateRange, setDateRange] = useState("30");
  const [selectedProduct, setSelectedProduct] = useState("");

  const products = useQuery(api.products.list, {}) || [];

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
      productId: selectedProduct || undefined,
    };
  }, [dateRange, selectedProduct]);

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

    return Object.entries(salesAnalytics.dailySales)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-30);
  }, [salesAnalytics?.dailySales]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <div className="flex space-x-3">
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
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
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
          {dailySalesData.length > 0 ?
            <div className="space-y-2">
              {dailySalesData.slice(-10).map(([date, data]) => {
                const maxRevenue = Math.max(
                  ...dailySalesData.map(([, d]) => (d as any).revenue)
                );
                const percentage =
                  maxRevenue > 0 ?
                    ((data as any).revenue / maxRevenue) * 100
                  : 0;

                return (
                  <div key={date} className="flex items-center space-x-3">
                    <div className="w-20 text-xs text-gray-600">
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                      <div
                        className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-16 text-xs text-right font-medium">
                      ${(data as any).revenue.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          : <p className="text-gray-500">
              No sales data available for the selected period
            </p>
          }
        </div>

        {/* Channel Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎯 Sales by Channel
          </h2>
          {salesAnalytics?.channelBreakdown ?
            <div className="space-y-4">
              {Object.entries(salesAnalytics.channelBreakdown)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([channel, revenue]) => {
                  const totalRevenue = salesAnalytics.totalRevenue || 1;
                  const percentage = ((revenue as number) / totalRevenue) * 100;

                  return (
                    <div key={channel} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="capitalize font-medium text-gray-900">
                          {channel}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">
                            ${(revenue as number).toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          : <p className="text-gray-500">No channel data available</p>}
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
    </div>
  );
}
