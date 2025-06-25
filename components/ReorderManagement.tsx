import { api } from "@/convex/_generated/api";
import { useAction, useQuery, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CriticalItemsModal } from "./CriticalItemsModal"; // Import the new modal

// Define the type for a suggestion, ensuring all necessary fields are included
interface Suggestion {
  _id: string;
  product?: {
    _id: string;
    name?: string | null;
    currentStock?: number | null;
    reorderPoint?: number | null;
    unitCost?: number | null;
  } | null;
  suggestedQuantity?: number | null;
  urgency: string;
  status: string;
  reason?: string | null;
  costImpact?: number | null;
  estimatedStockoutDate?: number | null;
  notes?: string | null;
}

export function ReorderManagement() {
  const generateReorders = useAction(api.reordering.generateReorderSuggestions);
  const updateSuggestionStatus = useMutation(
    api.reordering.updateReorderSuggestionStatus
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState({ status: "", urgency: "" });
  const [isCriticalItemsModalOpen, setIsCriticalItemsModalOpen] =
    useState(false); // State for modal visibility

  const reorderSuggestions = useQuery(
    api.reordering.getUserReorderSuggestions,
    {
      status: filter.status || undefined,
      urgency: filter.urgency || undefined,
      limit: 50,
    }
  ) as Suggestion[] | undefined; // Cast to Suggestion[] or undefined

  // Effect to show toast for low quantity items
  useEffect(() => {
    if (reorderSuggestions) {
      reorderSuggestions.forEach((suggestion) => {
        if (
          suggestion.product &&
          suggestion.product.currentStock !== null &&
          suggestion.product.currentStock !== undefined &&
          suggestion.product.currentStock < 5
        ) {
          toast.error(
            `Low stock for ${suggestion.product.name || "Unknown Product"}! Current stock: ${suggestion.product.currentStock}`,
            {
              duration: 5000, // Keep toast visible for 5 seconds
              id: `low-stock-${suggestion.product._id}`, // Prevent duplicate toasts for the same product
            }
          );
        }
      });
    }
  }, [reorderSuggestions]); // Re-run when suggestions change

  const handleGenerateReorders = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReorders({});
      toast.success(
        result?.message || "Reorder suggestions generated successfully!"
      );
    } catch (error) {
      toast.error(
        "Failed to generate reorder suggestions: " + (error as Error).message
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStatus = async (
    suggestionId: string,
    status: string,
    notes?: string
  ) => {
    try {
      await updateSuggestionStatus({
        suggestionId,
        status,
        notes,
      });
      toast.success(`Suggestion ${status} successfully!`);
    } catch (error) {
      toast.error("Failed to update suggestion: " + (error as Error).message);
    }
  };

  // Fallback to empty array if data is still loading
  const suggestions: Suggestion[] = reorderSuggestions || [];

  // Calculate summary statistics with fallbacks
  const totalSuggestions = suggestions.length;
  const criticalItemsList = suggestions.filter(
    (s) => s.urgency?.toLowerCase() === "critical" // Case-insensitive filter
  );
  const criticalItemsCount = criticalItemsList.length;
  const highPriorityItems = suggestions.filter(
    (s) => s.urgency === "high"
  ).length;
  const totalCostImpact = suggestions.reduce(
    (sum, s) => sum + (s.costImpact || 0),
    0
  );

  const openCriticalItemsModal = () => setIsCriticalItemsModalOpen(true);
  const closeCriticalItemsModal = () => setIsCriticalItemsModalOpen(false);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Show loading state
  if (reorderSuggestions === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Reorder Management
          </h1>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading reorder suggestions...</div>
        </div>
      </div>
    );
  }

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

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urgency
            </label>
            <select
              value={filter.urgency}
              onChange={(e) =>
                setFilter({ ...filter, urgency: e.target.value })
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Urgency</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
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
                {totalSuggestions}
              </p>
            </div>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-lg shadow cursor-pointer hover:bg-red-50 transition-colors"
          onClick={openCriticalItemsModal} // Add click handler
        >
          <div className="flex items-center">
            <div className="text-2xl mr-3">🚨</div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Critical Items
              </p>
              <p className="text-2xl font-bold text-red-600">
                {criticalItemsCount}
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
                {highPriorityItems}
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
                {formatCurrency(totalCostImpact)}
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

        {suggestions.length === 0 ?
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
            {suggestions.map((suggestion) => (
              <div key={suggestion._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {suggestion.product?.name || "Unknown Product"}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(suggestion.urgency)}`}
                      >
                        {getUrgencyIcon(suggestion.urgency)}{" "}
                        {(suggestion.urgency || "unknown").toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          suggestion.status === "pending" ?
                            "bg-yellow-100 text-yellow-800"
                          : suggestion.status === "approved" ?
                            "bg-green-100 text-green-800"
                          : suggestion.status === "rejected" ?
                            "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {(suggestion.status || "unknown").toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Current Stock</p>
                        <p className="font-medium">
                          {suggestion.product?.currentStock ?? 0} units
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Reorder Point</p>
                        <p className="font-medium">
                          {suggestion.product?.reorderPoint ?? 0} units
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Suggested Quantity
                        </p>
                        <p className="font-medium text-blue-600">
                          {suggestion.suggestedQuantity || 0} units
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Estimated Cost</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(
                            (suggestion.suggestedQuantity || 0) *
                              (suggestion.product?.unitCost || 0)
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Reason</p>
                      <p className="text-sm">
                        {suggestion.reason || "No reason provided"}
                      </p>
                    </div>

                    {suggestion.estimatedStockoutDate && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">
                          Estimated Stockout Date
                        </p>
                        <p className="text-sm text-red-600 font-medium">
                          {formatDate(suggestion.estimatedStockoutDate)}
                          {suggestion.estimatedStockoutDate <= Date.now() &&
                            " (Already out of stock)"}
                        </p>
                      </div>
                    )}

                    {suggestion.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Notes</p>
                        <p className="text-sm text-gray-700">
                          {suggestion.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {suggestion.status === "pending" && (
                    <div className="flex flex-col space-y-2 ml-6">
                      <button
                        onClick={() =>
                          handleUpdateStatus(suggestion._id, "approved")
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(suggestion._id, "rejected")
                        }
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                      >
                        ❌ Reject
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                        ✏️ Modify
                      </button>
                    </div>
                  )}
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
          <button
            onClick={() => {
              const criticalSuggestionsToApprove = suggestions.filter(
                (s) => s.urgency === "critical" && s.status === "pending"
              );
              criticalSuggestionsToApprove.forEach((s) =>
                handleUpdateStatus(s._id, "approved")
              );
            }}
            disabled={criticalItemsCount === 0}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <div className="text-2xl mb-2">✅</div>
            <p className="font-medium">Approve All Critical</p>
            <p className="text-sm text-gray-600">
              Approve all critical reorder suggestions ({criticalItemsCount})
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

      {/* Critical Items Modal */}
      {isCriticalItemsModalOpen && (
        <CriticalItemsModal
          items={criticalItemsList}
          onClose={closeCriticalItemsModal}
        />
      )}
    </div>
  );
}
