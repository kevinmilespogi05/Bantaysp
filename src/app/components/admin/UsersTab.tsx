import { useState } from "react";
import { motion } from "motion/react";
import {
  Users,
  CheckCircle,
  UserPlus,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import {
  SkeletonList,
  EmptyState,
  ErrorState,
} from "../ui/DataStates";
import { PromoteToPatrolModal } from "../ui/PromoteToPatrolModal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useApi, fetchVerifiedUsers, fetchBannedUsers, banUser, unbanUser } from "../../services/api";
import { useToast } from "../../context/ToastContext";

interface UsersTabProps {
  stats?: { totalUsers: number } | null;
}

export function UsersTab({ stats }: UsersTabProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"registered" | "banned">("registered");
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [selectedUserForPromotion, setSelectedUserForPromotion] = useState<any>(null);
  const [demoteConfirmOpen, setDemoteConfirmOpen] = useState(false);
  const [selectedUserForDemotion, setSelectedUserForDemotion] = useState<any>(null);
  const [isDemoting, setIsDemoting] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedUserForBan, setSelectedUserForBan] = useState<any>(null);
  const [banReason, setBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [unbanConfirmOpen, setUnbanConfirmOpen] = useState(false);
  const [selectedUserForUnban, setSelectedUserForUnban] = useState<any>(null);
  const [isUnbanning, setIsUnbanning] = useState(false);

  const {
    data: verifiedUsers,
    loading: verifiedUsersLoading,
    error: verifiedUsersError,
    refetch: refetchVerifiedUsers,
  } = useApi(fetchVerifiedUsers);

  const {
    data: bannedUsers,
    loading: bannedUsersLoading,
    error: bannedUsersError,
    refetch: refetchBannedUsers,
  } = useApi(fetchBannedUsers);

  const displayUsers = (verifiedUsers || [])
    .filter((u) => u.role !== "admin" && (u.status ?? "active") === "active");

  const activeBanList = (bannedUsers || []).filter((u) => u.role !== "admin");

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

  const handleBanClick = (user: any) => {
    setSelectedUserForBan(user);
    setBanReason("");
    setBanModalOpen(true);
  };

  const handleBanConfirm = async () => {
    if (!selectedUserForBan) return;
    if (!banReason.trim()) {
      showToast("Please provide a ban reason.", "error");
      return;
    }

    setIsBanning(true);
    try {
      const result = await banUser(selectedUserForBan.id, banReason.trim());
      if (result.error) throw new Error(result.error);
      showToast(`User ${selectedUserForBan.first_name} ${selectedUserForBan.last_name} was banned successfully.`, "success");
      setBanModalOpen(false);
      setSelectedUserForBan(null);
      refetchVerifiedUsers();
      refetchBannedUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to ban user.";
      showToast(message, "error");
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnbanClick = (user: any) => {
    setSelectedUserForUnban(user);
    setUnbanConfirmOpen(true);
  };

  const handleUnbanConfirm = async () => {
    if (!selectedUserForUnban) return;

    setIsUnbanning(true);
    try {
      const result = await unbanUser(selectedUserForUnban.id);
      if (result.error) throw new Error(result.error);
      showToast(`User ${selectedUserForUnban.first_name} ${selectedUserForUnban.last_name} was unbanned successfully.`, "success");
      setUnbanConfirmOpen(false);
      setSelectedUserForUnban(null);
      refetchVerifiedUsers();
      refetchBannedUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unban user.";
      showToast(message, "error");
    } finally {
      setIsUnbanning(false);
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Users</h3>
          <p className="text-sm text-gray-500">Manage active accounts and review banned users in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("registered")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeTab === "registered" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Registered Users
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("banned")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeTab === "banned" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Banned Users
          </button>
        </div>
      </div>

      {activeTab === "registered" ? (
        <>
          {verifiedUsersLoading ? (
            <SkeletonList rows={6} />
          ) : verifiedUsersError ? (
            <ErrorState message={verifiedUsersError} compact onRetry={() => refetchVerifiedUsers()} />
          ) : displayUsers.length === 0 ? (
            <EmptyState icon={Users} title="No active users found" description="Verified users will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "User",
                      "Barangay",
                      "Role",
                      "Reports",
                      "Points",
                      "Verified",
                      "Actions",
                    ].map((h) => (
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
                      <td className="px-5 py-3.5 flex gap-2">
                        {u.role === "resident" && (
                          <button
                            onClick={() => handlePromoteClick(u)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Promote to Patrol"
                          >
                            <UserPlus className="w-4 h-4 text-blue-500" />
                          </button>
                        )}
                        {u.role === "patrol" && (
                          <button
                            onClick={() => handleDemoteClick(u)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Demote to Resident"
                          >
                            <ChevronDown className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleBanClick(u)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Ban User"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          {bannedUsersLoading ? (
            <SkeletonList rows={6} />
          ) : bannedUsersError ? (
            <ErrorState message={bannedUsersError} compact onRetry={() => refetchBannedUsers()} />
          ) : activeBanList.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No banned users" description="Banned accounts will appear here after suspension." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "User",
                      "Barangay",
                      "Previous Role",
                      "Ban Reason",
                      "Date Banned",
                      "Banned By",
                      "Status",
                      "Action",
                    ].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-gray-400 font-medium" style={{ fontSize: "12px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeBanList.map((u, i) => (
                    <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#800000" }}>{u.avatar}</div>
                          <span className="font-medium text-gray-900 text-sm">{u.first_name} {u.last_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-sm">{u.barangay}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{u.role}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{u.banReason || "No reason provided"}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{u.bannedAt ? new Date(u.bannedAt).toLocaleString() : "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{u.bannedBy || "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Banned</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleUnbanClick(u)}
                          className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                          Unban
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {demoteConfirmOpen && selectedUserForDemotion && (
        <ConfirmDialog
          isOpen={demoteConfirmOpen}
          title="Demote to Resident?"
          message={`This will demote ${selectedUserForDemotion.first_name} ${selectedUserForDemotion.last_name} from patrol officer back to resident.`}
          confirmText="Demote"
          cancelText="Cancel"
          isDangerous={true}
          isLoading={isDemoting}
          onCancel={() => {
            setDemoteConfirmOpen(false);
            setSelectedUserForDemotion(null);
          }}
          onConfirm={handleDemoteConfirm}
        />
      )}

      {unbanConfirmOpen && selectedUserForUnban && (
        <ConfirmDialog
          isOpen={unbanConfirmOpen}
          title="Unban User?"
          message={`Restore access for ${selectedUserForUnban.first_name} ${selectedUserForUnban.last_name}?`}
          confirmText="Unban"
          cancelText="Cancel"
          isDangerous={false}
          isLoading={isUnbanning}
          onCancel={() => {
            setUnbanConfirmOpen(false);
            setSelectedUserForUnban(null);
          }}
          onConfirm={handleUnbanConfirm}
        />
      )}

      {banModalOpen && selectedUserForBan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setBanModalOpen(false);
            setSelectedUserForBan(null);
          }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 shadow-lg max-w-lg w-full mx-4"
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Ban User</h3>
                <p className="text-gray-600 text-sm">Enter a reason for banning {selectedUserForBan.first_name} {selectedUserForBan.last_name}. This action can be undone from the Banned Users tab.</p>
              </div>
            </div>
            <label className="block text-sm text-gray-700 mb-2">Ban Reason</label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-slate-900 focus:outline-none"
              placeholder="Enter the reason for the ban"
            />
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setBanModalOpen(false);
                  setSelectedUserForBan(null);
                }}
                disabled={isBanning}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBanConfirm}
                disabled={isBanning}
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium transition-colors disabled:opacity-50"
              >
                {isBanning ? "Banning..." : "Ban User"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

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
