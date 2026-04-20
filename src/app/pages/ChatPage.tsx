import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, MessageSquare, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getConversations, type Conversation } from "../services/api";
import { ChatWindow } from "../components/chat/ChatWindow";
import { SkeletonCard, EmptyState, ErrorState } from "../components/ui/DataStates";

export function ChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobile, setShowMobile] = useState(false);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: convs, error: err } = await getConversations();
        if (err) throw new Error(err);

        const loadedConversations = convs || [];
        console.log("[Chat] Loaded conversations:", loadedConversations.map(c => ({ id: c.id, name: c.participant?.name })));
        setConversations(loadedConversations);

        // Check if a conversation ID was stored in localStorage (from NewChatPage)
        const storedConvId = localStorage.getItem("selectedConversationId");
        console.log("[Chat] Checking localStorage for selectedConversationId:", storedConvId);
        
        if (storedConvId && loadedConversations.length > 0) {
          console.log("[Chat] Looking for conversation ID:", storedConvId);
          const selected = loadedConversations.find((c) => c.id === storedConvId);
          console.log("[Chat] Found conversation:", selected);
          if (selected) {
            setSelectedConversation(selected);
            setShowMobile(true);
            localStorage.removeItem("selectedConversationId");
          } else {
            console.log("[Chat] ⚠️ Conversation ID not found in list!");
          }
        } else if (loadedConversations.length > 0) {
          // Auto-select the first conversation if none was passed
          console.log("[Chat] No conversation ID in storage, auto-selecting first");
          setSelectedConversation(loadedConversations[0]);
          setShowMobile(true);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load conversations";
        setError(message);
        console.error("Error fetching conversations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleNewChat = () => {
    navigate("/app/chat/new");
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobile(true);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.participant?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full w-full bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* ── Sidebar: Conversations List ── */}
      <div className={`${showMobile ? "hidden" : "flex"} sm:flex w-full sm:w-80 flex-col bg-white border-r border-gray-200`}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900" style={{ fontSize: "1.1rem" }}>
              Direct Messages
            </h2>
            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="New chat"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-red-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} lines={2} />
              ))}
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorState message={error} />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={MessageSquare}
                title={search ? "No matching conversations" : "No conversations yet"}
                description={search ? "Try a different search" : "Start chatting with an admin"}
                action={!search ? (
                  <button
                    onClick={handleNewChat}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: "#800000" }}
                  >
                    <Plus className="w-4 h-4" /> New Chat
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <AnimatePresence>
                {filteredConversations.map((conv, index) => (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-4 text-left transition-all min-h-[80px] hover:bg-gray-50 ${
                      selectedConversation?.id === conv.id ? "bg-red-50 border-l-4" : "border-l-4 border-transparent"
                    }`}
                    style={selectedConversation?.id === conv.id ? { borderColor: "#800000" } : {}}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                        style={{ backgroundColor: "#800000" }}
                      >
                        {conv.participant?.avatar || "?"}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate text-sm">
                          {conv.participant?.name || "Unknown"}
                        </div>
                        {conv.lastMessage ? (
                          <div className="text-gray-500 text-sm truncate">
                            {conv.lastMessage.sender_id === user.id ? "You: " : ""}
                            {conv.lastMessage.content}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm italic">No messages yet</div>
                        )}
                        {conv.lastMessage?.created_at && (
                          <div className="text-gray-400 text-xs mt-1">
                            {new Date(conv.lastMessage.created_at).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Main: Chat Window ── */}
      <div className={`${showMobile ? "flex" : "hidden"} sm:flex flex-1 flex-col h-full bg-white`}>
        {selectedConversation ? (
          <>
            {/* Mobile Header with Back Button */}
            <div className="sm:hidden flex items-center gap-3 p-4 border-b border-gray-200 bg-white shrink-0">
              <button
                onClick={() => setShowMobile(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{selectedConversation.participant?.name}</div>
                <div className="text-xs text-gray-500">Online</div>
              </div>
            </div>
            <ChatWindow conversation={selectedConversation} />
          </>
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Select a conversation</p>
              <p className="text-gray-400 text-sm mt-1">Choose from your existing chats or start a new one</p>
              <button
                onClick={handleNewChat}
                className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium mx-auto"
                style={{ backgroundColor: "#800000" }}
              >
                <Plus className="w-4 h-4" /> Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
