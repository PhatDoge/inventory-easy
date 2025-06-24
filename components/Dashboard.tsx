import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useState, useMemo } from "react";

export function Dashboard() {
  const products = useQuery(api.products.list, {}) || [];
  const lowStockProducts = useQuery(api.products.getLowStockProducts) || [];

  // Fix: Memoize the date calculations to prevent infinite re-renders
  const dateRange = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const endDate = Date.now();
    return { startDate: thirtyDaysAgo, endDate };
  }, []); // Empty dependency array means this only calculates once

  // Get recent sales analytics (last 30 days)
  const salesAnalytics = useQuery(api.sales.getSalesAnalytics, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const topProducts =
    useQuery(api.sales.getTopSellingProducts, {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      limit: 10,
    }) || [];

  const generateForecasts = useAction(api.forecasting.generateForecasts);
  const generateReorders = useAction(api.reordering.generateReorderSuggestions);

  const [isGeneratingForecasts, setIsGeneratingForecasts] = useState(false);
  const [isGeneratingReorders, setIsGeneratingReorders] = useState(false);

  const handleGenerateForecasts = async () => {
    setIsGeneratingForecasts(true);
    try {
      await generateForecasts({});
    } finally {
      setIsGeneratingForecasts(false);
    }
  };

  const handleGenerateReorders = async () => {
    setIsGeneratingReorders(true);
    try {
      await generateReorders({});
    } finally {
      setIsGeneratingReorders(false);
    }
  };

  const totalProducts = products.length;
  const totalValue = products.reduce(
    (sum, p) => sum + p.currentStock * p.unitCost,
    0
  );
  const lowStockCount = lowStockProducts.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleGenerateForecasts}
            disabled={isGeneratingForecasts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isGeneratingForecasts ? "Generating..." : "🔮 Generate Forecasts"}
          </button>
          <button
            onClick={handleGenerateReorders}
            disabled={isGeneratingReorders}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isGeneratingReorders ? "Generating..." : "🔄 Generate Reorders"}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📦</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Products
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalProducts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">💰</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Inventory Value
              </p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⚠️</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Low Stock Items
              </p>
              <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📈</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                30-Day Revenue
              </p>
              <p className="text-2xl font-bold text-green-600">
                ${salesAnalytics?.totalRevenue?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🚨 Low Stock Alerts
          </h2>
          {lowStockProducts.length === 0 ?
            <p className="text-gray-500">All products are well stocked!</p>
          : <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product._id}
                  className="flex justify-between items-center p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      {product.currentStock} / {product.reorderPoint}
                    </p>
                    <p className="text-xs text-gray-500">
                      Current / Reorder Point
                    </p>
                  </div>
                </div>
              ))}
              {lowStockProducts.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{lowStockProducts.length - 5} more items need attention
                </p>
              )}
            </div>
          }
        </div>

        {/* Top Selling Products */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🏆 Top Selling Products (30 days)
          </h2>
          {topProducts.length === 0 ?
            <p className="text-gray-500">No sales data available</p>
          : <div className="space-y-3">
              {topProducts.map((item, index) => (
                <div
                  key={item.productId}
                  className="flex justify-between items-center p-3 bg-green-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-green-600 mr-3">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.product?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.orderCount} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {item.totalQuantity} units
                    </p>
                    <p className="text-sm text-green-600">
                      ${item.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          ⚡ Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="text-2xl mb-2">➕</div>
            <p className="font-medium">Add New Product</p>
            <p className="text-sm text-gray-600">Expand your catalog</p>
          </button>

          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
            <div className="text-2xl mb-2">💰</div>
            <p className="font-medium">Record Sale</p>
            <p className="text-sm text-gray-600">Track new transactions</p>
          </button>

          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-medium">View Analytics</p>
            <p className="text-sm text-gray-600">Analyze performance</p>
          </button>
        </div>
      </div>
    </div>
  );
}
