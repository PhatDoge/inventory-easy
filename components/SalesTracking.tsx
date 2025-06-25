import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState, useMemo, useEffect } from "react"; // Added useEffect
import { toast } from "sonner";

export function SalesTracking() {
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [channel, setChannel] = useState("store");
  const [customerId, setCustomerId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0); // State to trigger refresh

  const products = useQuery(api.products.list, {}) || [];
  const recordSale = useMutation(api.sales.recordSale);

  // Calculate dateRange, re-calculate when refreshKey changes
  const dateRange = useMemo(() => {
    const endDate = Date.now();
    const startDate = endDate - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    return { startDate, endDate };
  }, [refreshKey]); // Dependency array includes refreshKey

  const salesAnalytics = useQuery(api.sales.getSalesAnalytics, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    cacheBuster: refreshKey, // Keep cacheBuster for general analytics refresh
  });

  // New query for recent sales, fetches 20, displays 10.
  const recentSalesData =
    useQuery(api.sales.getRecentSales, {
      limit: 20, // Query in sales.ts defaults to 20, this is illustrative
      cacheBuster: refreshKey,
    }) || [];

  const topProducts =
    useQuery(api.sales.getTopSellingProducts, {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      limit: 10,
    }) || [];

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }

    try {
      await recordSale({
        productId: selectedProduct as any,
        quantity,
        unitPrice,
        channel,
        customerId: customerId || undefined,
      });

      toast.success("Sale recorded successfully!");

      // Reset form state
      setShowSaleForm(false);
      setSelectedProduct("");
      setQuantity(1);
      setUnitPrice(0);
      setCustomerId("");
      setRefreshKey((prevKey) => prevKey + 1); // Increment refreshKey to trigger dateRange recalculation

      // The queries will automatically update due to Convex's reactivity
      // when dateRange (a query dependency) changes.
    } catch (error) {
      toast.error("Failed to record sale: " + (error as Error).message);
    }
  };

  const selectedProductData = products.find((p) => p._id === selectedProduct);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Sales Tracking</h1>
        <button
          onClick={() => setShowSaleForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          💰 Record Sale
        </button>
      </div>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">💰</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Revenue (30d)
              </p>
              <p className="text-2xl font-bold text-green-600">
                ${salesAnalytics?.totalRevenue?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📦</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Units Sold (30d)
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {salesAnalytics?.totalQuantity || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🛒</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Orders (30d)
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {salesAnalytics?.totalOrders || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📊</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Avg Order Value
              </p>
              <p className="text-2xl font-bold text-orange-600">
                ${salesAnalytics?.averageOrderValue?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📈 Sales by Channel
          </h2>
          {salesAnalytics?.channelBreakdown ?
            <div className="space-y-3">
              {Object.entries(salesAnalytics.channelBreakdown).map(
                ([channel, revenue]) => (
                  <div
                    key={channel}
                    className="flex justify-between items-center"
                  >
                    <span className="capitalize font-medium">{channel}</span>
                    <span className="text-green-600 font-semibold">
                      ${(revenue as number).toFixed(2)}
                    </span>
                  </div>
                )
              )}
            </div>
          : <p className="text-gray-500">No sales data available</p>}
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🏆 Top Selling Products
          </h2>
          {topProducts.length > 0 ?
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((item, index) => (
                <div
                  key={item.productId}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <span className="text-sm font-bold text-gray-500 mr-2">
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
                    <p className="font-medium">{item.totalQuantity} units</p>
                    <p className="text-sm text-green-600">
                      ${item.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          : <p className="text-gray-500">No sales data available</p>}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📋 Recent Sales
        </h2>
        {(
          recentSalesData.length > 0 // Use recentSalesData
        ) ?
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Product</th>
                  <th className="text-left py-2">Quantity</th>
                  <th className="text-left py-2">Unit Price</th>
                  <th className="text-left py-2">Total</th>
                  <th className="text-left py-2">Channel</th>
                </tr>
              </thead>
              <tbody>
                {recentSalesData.slice(0, 10).map((sale: any) => {
                  // Use recentSalesData, slice, and add type for sale
                  const product = products.find(
                    (p) => p._id === sale.productId
                  );
                  return (
                    <tr key={sale._id} className="border-b">
                      <td className="py-2">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </td>
                      <td className="py-2">{product?.name || "Unknown"}</td>
                      <td className="py-2">{sale.quantity}</td>
                      <td className="py-2">${sale.unitPrice.toFixed(2)}</td>
                      <td className="py-2 font-medium">
                        ${sale.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-2 capitalize">{sale.channel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        : <p className="text-gray-500">No sales recorded yet</p>}
      </div>

      {/* Record Sale Modal */}
      {showSaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Record New Sale
            </h2>

            <form onSubmit={handleRecordSale} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  required
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    const product = products.find(
                      (p) => p._id === e.target.value
                    );
                    if (product) {
                      setUnitPrice(product.sellingPrice);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} (Stock: {product.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductData && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Available Stock:{" "}
                    <span className="font-medium">
                      {selectedProductData.currentStock}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Suggested Price:{" "}
                    <span className="font-medium">
                      ${selectedProductData.sellingPrice.toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedProductData?.currentStock || 999}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitPrice}
                  onChange={(e) =>
                    setUnitPrice(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="store">In-Store</option>
                  <option value="online">Online</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="phone">Phone Order</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer ID (Optional)
                </label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Customer identifier"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {quantity && unitPrice > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-semibold text-green-800">
                    Total: ${(quantity * unitPrice).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSaleForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
