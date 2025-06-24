import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

export function ProductCatalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const products =
    useQuery(api.products.list, {
      searchTerm: searchTerm || undefined,
      category: selectedCategory || undefined,
    }) || [];

  const categories = useQuery(api.products.getCategories) || [];
  const createProduct = useMutation(api.products.create);
  const updateStock = useMutation(api.products.updateStock);

  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    unitCost: 0,
    sellingPrice: 0,
    supplier: "",
    leadTimeDays: 7,
    minStockLevel: 10,
    maxStockLevel: 100,
    currentStock: 0,
    reorderPoint: 20,
    reorderQuantity: 50,
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProduct(newProduct);
      toast.success("Product created successfully!");
      setShowAddForm(false);
      setNewProduct({
        name: "",
        sku: "",
        category: "",
        description: "",
        unitCost: 0,
        sellingPrice: 0,
        supplier: "",
        leadTimeDays: 7,
        minStockLevel: 10,
        maxStockLevel: 100,
        currentStock: 0,
        reorderPoint: 20,
        reorderQuantity: 50,
      });
    } catch (error) {
      toast.error("Failed to create product: " + (error as Error).message);
    }
  };

  const handleStockUpdate = async (productId: string, newStock: number) => {
    try {
      await updateStock({
        productId: productId as any,
        newStock,
        movementType: "adjustment",
        notes: "Manual stock adjustment",
      });
      toast.success("Stock updated successfully!");
    } catch (error) {
      toast.error("Failed to update stock: " + (error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          ➕ Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Products
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product._id}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                <p className="text-sm text-gray-600">
                  Category: {product.category}
                </p>
              </div>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  product.currentStock <= product.reorderPoint ?
                    "bg-red-100 text-red-800"
                  : product.currentStock <= product.minStockLevel ?
                    "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
                }`}
              >
                {product.currentStock <= product.reorderPoint ?
                  "Low Stock"
                : product.currentStock <= product.minStockLevel ?
                  "Warning"
                : "In Stock"}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Current Stock:</span>
                <span className="font-medium">{product.currentStock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Reorder Point:</span>
                <span className="font-medium">{product.reorderPoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Unit Cost:</span>
                <span className="font-medium">
                  ${product.unitCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Selling Price:</span>
                <span className="font-medium">
                  ${product.sellingPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="New stock"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    const newStock = parseInt(
                      (e.target as HTMLInputElement).value
                    );
                    if (!isNaN(newStock)) {
                      handleStockUpdate(product._id, newStock);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                Update
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No products found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory ?
              "Try adjusting your search criteria"
            : "Get started by adding your first product"}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Product
          </button>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Add New Product
            </h2>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, sku: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.supplier}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, supplier: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.unitCost}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        unitCost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.sellingPrice}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        sellingPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Time (days)
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.leadTimeDays}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        leadTimeDays: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.currentStock}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        currentStock: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.minStockLevel}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        minStockLevel: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Stock Level
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.maxStockLevel}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        maxStockLevel: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Point
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.reorderPoint}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        reorderPoint: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Quantity
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.reorderQuantity}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        reorderQuantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
