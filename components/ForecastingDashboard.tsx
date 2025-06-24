import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

export function ForecastingDashboard() {
  const products = useQuery(api.products.list, {}) || [];
  const generateForecasts = useAction(api.forecasting.generateForecasts);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");

  const handleGenerateForecasts = async () => {
    setIsGenerating(true);
    try {
      const result = await generateForecasts({});
      // Detailed feedback based on the result from the action
      if (result.successCount > 0) {
        toast.success(result.message);
      } else if (result.skippedForNoDataCount > 0 && result.errorCount === 0) {
        toast.info(result.message); // Use info for skips without errors
      } else if (result.errorCount > 0) {
        toast.error(result.message);
      } else if (!result.success && result.message) {
        // Catch-all for other non-successful scenarios with a message
        toast.warning(result.message);
      } else {
        // Fallback if the message structure is unexpected (should not happen with current backend logic)
        toast("Forecast generation process completed.");
      }
    } catch (error) {
      // This catch block handles errors from the useAction hook itself (e.g., network issues, Convex system errors)
      console.error("Error calling generateForecasts action:", error);
      toast.error(
        "Failed to generate forecasts: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedProductData = products.find((p) => p._id === selectedProduct);
  const productDetails = useQuery(
    api.products.getProductDetails,
    selectedProduct ? { productId: selectedProduct as any } : "skip"
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Demand Forecasting</h1>
        <button
          onClick={handleGenerateForecasts}
          disabled={isGenerating}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "🔮 Generate Forecasts"}
        </button>
      </div>

      {/* Forecasting Overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📊 Forecasting Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold text-blue-900">Machine Learning</h3>
            <p className="text-sm text-blue-700">
              Advanced algorithms analyze historical sales patterns, seasonal
              trends, and external factors
            </p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-semibold text-green-900">Trend Analysis</h3>
            <p className="text-sm text-green-700">
              Identifies growth patterns and seasonal variations in your sales
              data
            </p>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold text-purple-900">Accuracy Tracking</h3>
            <p className="text-sm text-purple-700">
              Confidence scores help you understand prediction reliability
            </p>
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🔍 Product Analysis
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Product for Detailed Analysis
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Choose a product...</option>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
        </div>

        {productDetails && selectedProductData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Product Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Product Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-medium">
                    {selectedProductData.currentStock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reorder Point:</span>
                  <span className="font-medium">
                    {selectedProductData.reorderPoint}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lead Time:</span>
                  <span className="font-medium">
                    {selectedProductData.leadTimeDays} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">30-Day Sales:</span>
                  <span className="font-medium">
                    {productDetails.totalSalesLast30Days} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Average:</span>
                  <span className="font-medium">
                    {productDetails.averageDailySales.toFixed(1)} units/day
                  </span>
                </div>
              </div>
            </div>

            {/* Forecast Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Latest Forecast
              </h3>
              {productDetails.latestForecast ?
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Predicted Demand:</span>
                    <span className="font-medium text-purple-600">
                      {productDetails.latestForecast.predictedDemand.toFixed(1)}{" "}
                      units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confidence:</span>
                    <span
                      className={`font-medium ${
                        productDetails.latestForecast.confidence > 0.7 ?
                          "text-green-600"
                        : productDetails.latestForecast.confidence > 0.5 ?
                          "text-yellow-600"
                        : "text-red-600"
                      }`}
                    >
                      {(productDetails.latestForecast.confidence * 100).toFixed(
                        0
                      )}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Seasonal Factor:</span>
                    <span className="font-medium">
                      {productDetails.latestForecast.seasonalFactor.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trend Factor:</span>
                    <span
                      className={`font-medium ${
                        productDetails.latestForecast.trendFactor > 0 ?
                          "text-green-600"
                        : "text-red-600"
                      }`}
                    >
                      {productDetails.latestForecast.trendFactor > 0 ? "+" : ""}
                      {productDetails.latestForecast.trendFactor.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Algorithm:</span>
                    <span className="font-medium text-sm">
                      {productDetails.latestForecast.algorithm
                        .replace(/_/g, " ")
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Generated:</span>
                    <span className="font-medium text-sm">
                      {new Date(
                        productDetails.latestForecast.createdAt
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              : <div className="text-center py-8">
                  <div className="text-4xl mb-2">🔮</div>
                  <p className="text-gray-500 mb-4">
                    No forecast available for this product
                  </p>
                  <button
                    onClick={handleGenerateForecasts}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Generate Forecast
                  </button>
                </div>
              }
            </div>
          </div>
        )}

        {!selectedProduct && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a Product
            </h3>
            <p className="text-gray-600">
              Choose a product from the dropdown above to view detailed
              forecasting analysis
            </p>
          </div>
        )}
      </div>

      {/* Forecasting Methodology */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🧠 How Our Forecasting Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Data Analysis</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Historical sales patterns (90 days)</li>
              <li>• Seasonal variations and trends</li>
              <li>• Day-of-week patterns</li>
              <li>• Product lifecycle stage</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Algorithm Features
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Linear regression with seasonal adjustment</li>
              <li>• Confidence scoring based on data variance</li>
              <li>• Trend factor calculation</li>
              <li>• Automatic outlier detection</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • Higher confidence scores (&gt;70%) indicate more reliable
              predictions
            </li>
            <li>• Seasonal factors &gt;1 suggest higher than average demand</li>
            <li>• Positive trend factors indicate growing demand over time</li>
            <li>• Generate forecasts regularly for best accuracy</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
