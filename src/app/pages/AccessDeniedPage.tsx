import React from "react";
import { useNavigate } from "react-router";
import { Shield, ArrowLeft } from "lucide-react";

export function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <Shield className="w-10 h-10 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>

        {/* Message */}
        <p className="text-gray-600 mb-8">
          You don't have permission to access this page. Your account may not have the required role or permissions.
        </p>

        {/* Error Details */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-left">
          <p className="text-sm text-red-700">
            <strong>Reason:</strong> Insufficient permissions
          </p>
          <p className="text-xs text-red-600 mt-2">
            If you believe this is an error, please contact an administrator.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate("/app/dashboard")}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Footer Info */}
        <p className="text-xs text-gray-400 mt-8">
          Error Code: 403 | Unauthorized
        </p>
      </div>
    </div>
  );
}
