import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Search, Loader, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createConversation, fetchVerifiedUsers, type UserProfile } from "../services/api";
import { SkeletonCard, EmptyState, ErrorState } from "../components/ui/DataStates";

export function NewChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  // Fetch admins/verified users on mount
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: users, error: err } = await fetchVerifiedUsers();
        if (err) throw new Error(err);

        // Filter to only show admins/patrol (cannot chat with regular users)
        const adminUsers = (users || []).filter(
          (u) => (u.role === "admin" || u.role === "patrol") && u.id !== user.id
        );

        setAdmins(adminUsers);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load admins";
        setError(message);
        console.error("Error fetching admins:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [user.id]);

  const handleStartChat = async (adminId: string) => {
    try {
      setCreating(adminId);
      console.log("[Chat] Creating conversation with admin:", adminId);
      const { data, error: err } = await createConversation(adminId);

      if (err) throw new Error(err);

      if (data) {
        console.log("[Chat] ✅ Conversation created:", data);
        // Store conversation ID in localStorage for ChatPage to pick up
        localStorage.setItem("selectedConversationId", data.id);
        // Navigate to chat with this admin
        navigate("/app/chat");
      }
    } catch (err) {
      alert("Failed to start chat: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setCreating(null);
    }
  };

  const filteredAdmins = admins.filter((admin) =>
    `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 sm:p-6 border-b border-gray-200">
        <button
          onClick={() => navigate("/app/chat")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-semibold text-gray-900" style={{ fontSize: "1.15rem" }}>
            Start New Chat
          </h1>
          <p className="text-sm text-gray-500">Chat with admins or patrol officers</p>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-red-500 transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : filteredAdmins.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title={search ? "No admins found" : "No admins available"}
            description={search ? "Try a different search" : "No admins to chat with right now"}
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredAdmins.map((admin, index) => (
                <motion.div
                  key={admin.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                      style={{ backgroundColor: "#800000" }}
                    >
                      {admin.avatar || `${admin.first_name?.[0]}${admin.last_name?.[0]}`.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {admin.first_name} {admin.last_name}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {admin.role === "patrol" ? "Patrol Officer" : "Administrator"}
                      </div>
                      {admin.barangay && (
                        <div className="text-xs text-gray-400">{admin.barangay}</div>
                      )}
                    </div>
                  </div>

                  {/* Start Chat Button */}
                  <button
                    onClick={() => handleStartChat(admin.id!)}
                    disabled={creating === admin.id}
                    className="ml-4 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex items-center gap-2 min-h-[44px]"
                    style={{ backgroundColor: "#800000" }}
                  >
                    {creating === admin.id ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Chat"
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
