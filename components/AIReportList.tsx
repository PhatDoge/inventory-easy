"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AIReportModal } from "./AIReportModal"; // Assuming this is the correct path

interface AIReportListProps {
  // If you need to pass any props from Analytics.tsx, define them here
  // For now, it will fetch its own data.
}

export function AIReportList({}: AIReportListProps) {
  // Fetch reports for the current user.
  // Note: This assumes `api.aiReports.getForUser` query exists or will be created.
  // If it doesn't, this needs to be adjusted or a new query created.
  const reports = useQuery(api.aiReports.getReportsForCurrentUser, {}); // Placeholder for actual query

  const [selectedReportContent, setSelectedReportContent] = useState<
    string | null
  >(null);
  const [showModal, setShowModal] = useState(false);

  const handleReportClick = (reportContent: string) => {
    setSelectedReportContent(reportContent);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReportContent(null);
  };

  if (reports === undefined) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading reports...</p>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Saved AI Reports
        </h2>
        <p className="text-gray-600">
          No AI reports have been generated yet. Click "Generate AI Report" to
          create your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Previously Generated Reports
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2">Report Name</th>
              <th className="text-left py-3 px-2">Generated On</th>
              <th className="text-left py-3 px-2">Date Range</th>
              <th className="text-left py-3 px-2">Product Focus</th>
              <th className="text-left py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report._id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 font-medium text-gray-900">
                  {report.reportName}
                </td>
                <td className="py-3 px-2 text-gray-600">
                  {new Date(report.generatedAt).toLocaleString()}
                </td>
                <td className="py-3 px-2 text-gray-600">
                  {report.filters.dateRange} days
                </td>
                <td className="py-3 px-2 text-gray-600">
                  {report.filters.selectedProduct || "All Products"}
                </td>
                <td className="py-3 px-2">
                  <button
                    onClick={() => handleReportClick(report.reportContent)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs"
                  >
                    View Report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedReportContent && (
        <AIReportModal
          report={selectedReportContent}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
