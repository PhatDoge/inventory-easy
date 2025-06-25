import React from "react";

interface CriticalItem {
  _id: string;
  product?: {
    name?: string | null; // Allow null for product name
    currentStock?: number | null; // Allow null for current stock
    reorderPoint?: number | null; // Allow null for reorder point
  } | null; // Allow null for product
  suggestedQuantity?: number | null; // Allow null for suggested quantity
  urgency: string;
  // Add other relevant fields from the suggestion object
}

interface CriticalItemsModalProps {
  items: CriticalItem[];
  onClose: () => void;
}

export function CriticalItemsModal({
  items,
  onClose,
}: CriticalItemsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            🚨 Critical Reorder Items
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        {items.length === 0 ?
          <div className="text-center py-10">
            <p className="text-gray-600 text-lg">
              No critical items to display.
            </p>
          </div>
        : <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Product Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Current Stock
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Reorder Point
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Suggested Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.product?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.product?.currentStock ?? "N/A"} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.product?.reorderPoint ?? "N/A"} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                      {item.suggestedQuantity ?? "N/A"} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
        <div className="mt-8 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
