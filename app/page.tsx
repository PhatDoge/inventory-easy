"use client";
import { useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { SignInForm } from "@/components/SignInForm";
import { Dashboard } from "@/components/Dashboard";

// TODO: Uncomment these component imports as you implement them
import { ProductCatalog } from "@/components/ProductCatalog";
import { SalesTracking } from "@/components/SalesTracking";
import { ForecastingDashboard } from "@/components/ForecastingDashboard";
// import { ReorderManagement } from "@/components/ReorderManagement";
// import { Analytics } from "@/components/Analytics";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user, isSignedIn } = useUser();

  // Show sign-in page for unauthenticated users
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Smart Inventory Management
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                AI-powered demand forecasting and automated reordering for your
                business
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl mb-2">🔮</div>
                  <h3 className="font-semibold">Smart Forecasting</h3>
                  <p className="text-sm text-gray-600">
                    Predict demand with ML algorithms
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🔄</div>
                  <h3 className="font-semibold">Auto Reordering</h3>
                  <p className="text-sm text-gray-600">
                    Never run out of stock again
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">📈</div>
                  <h3 className="font-semibold">Analytics</h3>
                  <p className="text-sm text-gray-600">
                    Insights to optimize your inventory
                  </p>
                </div>
              </div>
              <div className="text-gray-500 text-sm">
                <SignInForm />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main app for authenticated users
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="px-4 h-16 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-blue-600">
            Smart Inventory
          </h2>
          <SignOutButton />
        </div>
        <nav className="px-4 pb-2">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "products", label: "Products", icon: "📦" },
              { id: "sales", label: "Sales", icon: "💰" },
              { id: "forecasting", label: "Forecasting", icon: "🔮" },
              { id: "reorders", label: "Reorders", icon: "🔄" },
              { id: "analytics", label: "Analytics", icon: "📈" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id ?
                    "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Component */}
          {activeTab === "dashboard" && <Dashboard />}

          {/* TODO: Uncomment and use these components as you implement them */}
          {activeTab === "products" && <ProductCatalog />}
          {activeTab === "sales" && <SalesTracking />}
          {activeTab === "forecasting" && <ForecastingDashboard />}
          {/* {activeTab === "reorders" && <ReorderManagement />} */}
          {/* {activeTab === "analytics" && <Analytics />} */}

          {/* Placeholder content for tabs without components yet */}
          {activeTab !== "dashboard" &&
            activeTab !== "forecasting" &&
            activeTab !== "products" &&
            activeTab !== "sales" && (
              <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-200/80">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
                  Section
                </h2>
                <p className="text-gray-600">
                  This section is under development. Uncomment the component
                  import and JSX when ready.
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    To enable this section:
                  </p>
                  <ol className="text-xs text-gray-700 mt-2 space-y-1">
                    <li>1. Uncomment the import at the top of the file</li>
                    <li>
                      2. Uncomment the corresponding JSX in the main section
                    </li>
                    <li>3. Remove this placeholder div</li>
                  </ol>
                </div>
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
