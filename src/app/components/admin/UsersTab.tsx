import { useState } from "react";
import { motion } from "motion/react";
import {
  Users, CheckCircle, UserPlus, MoreHorizontal, ChevronDown,
} from "lucide-react";
import {
  SkeletonList,
  EmptyState,
  ErrorState,
} from "../ui/DataStates";
import { PromoteToPatrolModal } from "../ui/PromoteToPatrolModal";
import { useApi, fetchVerifiedUsers } from "../../services/api";
import { useToast } from "../../context/ToastContext";

interface UsersTabProps {
  stats?: { totalUsers: number } | null;
}

export function UsersTab({ stats }: UsersTabProps) {
  const { showToast } = useToast();
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [selectedUserForPromotion, setSelectedUserForPromotion] = useState<any>(null);
  const [demoteConfirmOpen, setDemoteConfirmOpen] = useState(false);
  const [selectedUserForDemotion, setSelectedUserForDemotion] = useState<any>(null);
  const [isDemoting, setIsDemoting] = useState(false);

  const { data: verifiedUsers, loading: verifiedUsersLoading, error: verifiedUsersError, refetch: refetchVerifiedUsers } = useApi(fetchVerifiedUsers);

  console.log("[UsersTab] Render state:", {
    loading: verifiedUsersLoading,
    error: verifiedUsersError,
    userCount: verifiedUsers?.length ?? 0,
  });

  const handlePromoteClick = (user: any) => {
    if (user.role === "resident") {
      setSelectedUserForPromotion(user);
      setPromoteModalOpen(true);
    }
  };

  const handleDemoteClick = (user: any) => {
    if (user.role === "patrol") {
      setSelectedUserForDemotion(user);
      setDemoteConfirmOpen(true);
    }
  };

  const handleDemoteConfirm = async () => {
    if (!selectedUserForDemotion) return;

    setIsDemoting(true);
    try {
      const response = await fetch("http://localhost:3000/admin/demote-from-patrol", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserForDemotion.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to demote user");
      }

      showToast(`${selectedUserForDemotion.first_name} demoted to resident`, "success");
      refetchVerifiedUsers();
      setDemoteConfirmOpen(false);
      setSelectedUserForDemotion(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to demote user";
      showToast(msg, "error");
    } finally {
      setIsDemoting(false);
    }
  };

  // Filter out admin users - only show residents and patrol
  const displayUsers = verifiedUsers?.filter(u => u.role !== "admin") || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Registered Users</h3>
        <span className="text-gray-400 text-sm">
          {displayUsers.length ? `${displayUsers.length} total` : "—"}
        </span>
      </div>
      {verifiedUsersLoading ? (
        <SkeletonList rows={6} />
      ) : verifiedUsersError ? (
        <ErrorState message={verifiedUsersError} compact onRetry={() => refetchVerifiedUsers()} />
      ) : displayUsers.length === 0 ? (
        <EmptyState icon={Users} title="No registered users yet" description="Residents who sign up will appear here" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["User", "Barangay", "Role", "Reports", "Points", "Verified", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-gray-400 font-medium" style={{ fontSize: "12px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayUsers.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#800000" }}>{u.avatar}</div>
                      <span className="font-medium text-gray-900 text-sm">{u.first_name} {u.last_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-sm">{u.barangay}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: u.role === "admin" ? "#dc262615" : u.role === "patrol" ? "#0891b215" : "#e5e7eb",
                        color: u.role === "admin" ? "#dc2626" : u.role === "patrol" ? "#0891b2" : "#6b7280",
                      }}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 text-sm">{u.reports || 0}</td>
                  <td className="px-5 py-3.5 font-bold text-sm" style={{ color: "#800000" }}>{(u.points || 0).toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    {u.verified
                      ? <span className="flex items-center gap-1 text-green-700 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                      : <span className="text-amber-600 text-xs font-medium">Pending</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {u.role === "resident" ? (
                      <button 
                        onClick={() => handlePromoteClick(u)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        title="Promote to Patrol"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                    ) : u.role === "patrol" ? (
                      <button 
                        onClick={() => handleDemoteClick(u)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        title="Demote to Resident"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    ) : (
                      <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Demote Confirmation Modal ── */}
      {demoteConfirmOpen && selectedUserForDemotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDemoteConfirmOpen(false)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 shadow-lg max-w-sm w-full mx-4"
          >
            <h3 className="font-semibold text-gray-900 text-lg mb-2">
              Demote to Resident?
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              This will demote <strong>{selectedUserForDemotion.first_name} {selectedUserForDemotion.last_name}</strong> from patrol officer back to resident. They will no longer have patrol access.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDemoteConfirmOpen(false);
                  setSelectedUserForDemotion(null);
                }}
                disabled={isDemoting}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDemoteConfirm}
                disabled={isDemoting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium transition-colors disabled:opacity-50"
              >
                {isDemoting ? "Demoting..." : "Demote"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── Promote to Patrol Modal ── */}
      <PromoteToPatrolModal
        isOpen={promoteModalOpen}
        onClose={() => {
          setPromoteModalOpen(false);
          setSelectedUserForPromotion(null);
        }}
        user={selectedUserForPromotion}
        onSuccess={() => {
          refetchVerifiedUsers();
          showToast("User promoted to patrol officer!", "success");
        }}
      />
    </div>
  );
}
