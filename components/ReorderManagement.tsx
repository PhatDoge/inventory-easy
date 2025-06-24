import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

export function ReorderManagement() {
  const generateReorders = useAction(api.reordering.generateReorderSuggestions);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReorders = async () => {
    setIsGenerating(true);
    try {
      await generateReorders({});
      toast.success("Reorder suggestions generated successfully!");
    } catch (error) {
      toast.error(
        "Failed to generate reorder suggestions: " + (error as Error).message
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Mock reorder suggestions data for demonstration
  const mockReorderSuggestions = [
    {
      _id: "1",
      productId: "prod1",
      product: {
        name: "Wireless Headphones",
        sku: "WH-001",
        currentStock: 5,
        reorderPoint: 20,
        unitCost: 45.0,
      },
      suggestedQuantity: 50,
      urgency: "high",
      reason: "Stock below reorder point (20)",
      estimatedStockoutDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
      costImpact: 125.5,
      status: "pending",
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
    },
    {
      _id: "2",
      productId: "prod2",
      product: {
        name: "Bluetooth Speaker",
        sku: "BS-002",
        currentStock: 0,
        reorderPoint: 15,
        unitCost: 32.0,
      },
      suggestedQuantity: 75,
      urgency: "critical",
      reason: "Out of stock",
      estimatedStockoutDate: Date.now(),
      costImpact: 200.0,
      status: "pending",
      createdAt: Date.now() - 1 * 60 * 60 * 1000,
    },
    {
      _id: "3",
      productId: "prod3",
      product: {
        name: "Phone Case",
        sku: "PC-003",
        currentStock: 12,
        reorderPoint: 25,
        unitCost: 8.5,
      },
      suggestedQuantity: 100,
      urgency: "medium",
      reason: "Projected stockout within lead time",
      estimatedStockoutDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
      costImpact: 85.0,
      status: "pending",
      createdAt: Date.now() - 4 * 60 * 60 * 1000,
    },
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "🚨";
      case "high":
        return "⚠️";
      case "medium":
        return "⚡";
      case "low":
        return "ℹ️";
      default:
        return "📋";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reorder Management</h1>
        <button
          onClick={handleGenerateReorders}
          disabled={isGenerating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "🔄 Generate Suggestions"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📋</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Suggestions
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {mockReorderSuggestions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🚨</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Critical Items
              </p>
              <p className="text-2xl font-bold text-red-600">
                {
                  mockReorderSuggestions.filter((s) => s.urgency === "critical")
                    .length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⚠️</div>
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">
                {
                  mockReorderSuggestions.filter((s) => s.urgency === "high")
                    .length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl mr-3">💰</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Cost Impact
              </p>
              <p className="text-2xl font-bold text-green-600">
                $
                {mockReorderSuggestions
                  .reduce((sum, s) => sum + s.costImpact, 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reorder Suggestions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            🔄 Reorder Suggestions
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            AI-generated recommendations based on demand forecasts and current
            stock levels
          </p>
        </div>

        {mockReorderSuggestions.length === 0 ?
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🔄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No reorder suggestions
            </h3>
            <p className="text-gray-600 mb-4">
              All products are well stocked or generate suggestions to see
              recommendations
            </p>
            <button
              onClick={handleGenerateReorders}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Suggestions"}
            </button>
          </div>
        : <div className="divide-y">
            {mockReorderSuggestions
              .sort((a, b) => {
                const urgencyOrder = {
                  critical: 4,
                  high: 3,
                  medium: 2,
                  low: 1,
                };
                return (
                  (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 0) -
                  (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 0)
                );
              })
              .map((suggestion) => (
                <div key={suggestion._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {suggestion.product.name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(suggestion.urgency)}`}
                        >
                          {getUrgencyIcon(suggestion.urgency)}{" "}
                          {suggestion.urgency.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Current Stock</p>
                          <p className="font-medium">
                            {suggestion.product.currentStock} units
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Reorder Point</p>
                          <p className="font-medium">
                            {suggestion.product.reorderPoint} units
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Suggested Quantity
                          </p>
                          <p className="font-medium text-blue-600">
                            {suggestion.suggestedQuantity} units
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Estimated Cost
                          </p>
                          <p className="font-medium text-green-600">
                            $
                            {(
                              suggestion.suggestedQuantity *
                              suggestion.product.unitCost
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Reason</p>
                        <p className="text-sm">{suggestion.reason}</p>
                      </div>

                      {suggestion.estimatedStockoutDate && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">
                            Estimated Stockout Date
                          </p>
                          <p className="text-sm text-red-600 font-medium">
                            {new Date(
                              suggestion.estimatedStockoutDate
                            ).toLocaleDateString()}
                            {suggestion.estimatedStockoutDate <= Date.now() &&
                              " (Already out of stock)"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-6">
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                        ✅ Approve
                      </button>
                      <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
                        ❌ Reject
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                        ✏️ Modify
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        }
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          ⚡ Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="text-2xl mb-2">✅</div>
            <p className="font-medium">Approve All Critical</p>
            <p className="text-sm text-gray-600">
              Approve all critical reorder suggestions
            </p>
          </button>

          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-medium">Bulk Order</p>
            <p className="text-sm text-gray-600">
              Create purchase orders in bulk
            </p>
          </button>

          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <div className="text-2xl mb-2">⚙️</div>
            <p className="font-medium">Reorder Settings</p>
            <p className="text-sm text-gray-600">
              Configure reorder parameters
            </p>
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">
          💡 Reorder Management Tips
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • Critical items should be reordered immediately to avoid stockouts
          </li>
          <li>
            • Review suggestions regularly and adjust reorder points based on
            demand patterns
          </li>
          <li>
            • Consider lead times and seasonal variations when approving
            suggestions
          </li>
          <li>• Monitor cost impact to optimize inventory investment</li>
        </ul>
      </div>
    </div>
  );
}
