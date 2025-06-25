import React from "react";

interface AIReportModalProps {
  report: string;
  onClose: () => void;
}

export function AIReportModal({ report, onClose }: AIReportModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            AI Generated Report
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="prose max-w-none">
          {/* We'll use dangerouslySetInnerHTML if the report is HTML, or simple pre-wrap for text */}
          {report.startsWith("<") ?
            <div dangerouslySetInnerHTML={{ __html: report }} />
          : <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {report}
            </pre>
          }
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
