/**
 * PromoteToPatrolModal — Admin feature to promote residents to patrol officers
 * 
 * Allows admins to:
 * - Select a resident
 * - Assign patrol-specific fields (unit, badge number, rank, shift times)
 * - Promote them to patrol role (via backend API endpoint)
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { X, UserPlus, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { UserProfile } from "../services/api";

interface PromoteToPatrolModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile;
  onSuccess?: () => void;
}

/**
 * NOTE: This modal updates the database directly via Supabase client.
 * For production, implement a backend API endpoint `/admin/promote-to-patrol` that:
 * 1. Verifies admin role (RLS check)
 * 2. Updates user_profiles role to "patrol"
 * 3. Updates user metadata via supabase.auth.admin.updateUserById()
 * 4. Logs the action for audit trail
 */
export function PromoteToPatrolModal({ isOpen, onClose, user, onSuccess }: PromoteToPatrolModalProps) {
  const navigate = useNavigate();
  const { user: currentUser, refreshRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    unit: "",
    badgeNumber: "",
    rank: "Police Officer 1",
    shiftStart: "08:00",
    shiftEnd: "17:00",
  });

  const ranks = [
    "Police Officer 1",
    "Police Officer 2",
    "Police Officer 3",
    "Senior Police Officer 1",
    "Senior Police Officer 2",
    "Inspector",
    "Sergeant",
  ];

  const handlePromote = async () => {
    if (!user?.id) return;

    if (!formData.unit || !formData.badgeNumber) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get auth session for token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("No auth token available");
      }

      // Call backend API endpoint `/admin/promote-to-patrol`
      const response = await fetch(
        `http://localhost:3000/admin/promote-to-patrol`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            unit: formData.unit,
            badgeNumber: formData.badgeNumber,
            rank: formData.rank,
            shiftStart: formData.shiftStart,
            shiftEnd: formData.shiftEnd,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to promote user");
      }

      // Success!
      setSuccess(true);

      // If the promoted user is the currently logged-in user, refresh their role
      if (user.id === currentUser?.id) {
        console.log("[PromoteToPatrolModal] User promoted - current user match detected");
        console.log("[PromoteToPatrolModal] Before refresh - role:", currentUser?.role);
        
        await refreshRole();
        
        console.log("[PromoteToPatrolModal] refreshRole() completed");

        // Wait for React to process the state update, then navigate to /app
        // RoleBasedRedirect will then route based on the new role
        setTimeout(() => {
          console.log("[PromoteToPatrolModal] Navigating to /app to trigger role-based redirect");
          navigate("/app", { replace: true });
          
          setTimeout(() => {
            onSuccess?.();
            onClose();
            setSuccess(false);
          }, 500);
        }, 1000); // Give React time to process the state update
      } else {
        setTimeout(() => {
          onSuccess?.();
          onClose();
          setSuccess(false);
        }, 1500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to promote user";
      setError(msg);
      console.error("Promotion error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">Promote to Patrol Officer</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {success ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-center space-y-3"
              >
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="font-semibold">Promoted successfully!</p>
                <p className="text-sm text-gray-600">
                  {user.first_name} {user.last_name} is now a patrol officer.
                </p>
              </motion.div>
            ) : (
              <>
                {/* User Info */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">User</p>
                  <p className="font-semibold">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{user.barangay}</p>
                </div>

                {/* Form Fields */}
                <div className="space-y-3">
                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Patrol Unit *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Unit 3 - Alpha"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Badge Number */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Badge Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., PNP-8821"
                      value={formData.badgeNumber}
                      onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Rank */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Rank</label>
                    <select
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {ranks.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Shift Times */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Shift Start
                      </label>
                      <input
                        type="time"
                        value={formData.shiftStart}
                        onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Shift End
                      </label>
                      <input
                        type="time"
                        value={formData.shiftEnd}
                        onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Promoting...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Promote
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PromoteToPatrolModal;
