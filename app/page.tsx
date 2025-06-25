"use client";
import { useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { Dashboard } from "@/components/Dashboard";

// TODO: Uncomment these component imports as you implement them
import { ProductCatalog } from "@/components/ProductCatalog";
import { SalesTracking } from "@/components/SalesTracking";
import { ForecastingDashboard } from "@/components/ForecastingDashboard";
import { ReorderManagement } from "@/components/ReorderManagement";
import { Analytics } from "@/components/Analytics";
import { LandingPage } from "./main";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user, isSignedIn } = useUser();

  // Show landing page for unauthenticated users
  if (!isSignedIn) {
    return <LandingPage />;
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
          {activeTab === "reorders" && <ReorderManagement />}
          {activeTab === "analytics" && <Analytics />}
        </div>
      </main>
    </div>
  );
}
