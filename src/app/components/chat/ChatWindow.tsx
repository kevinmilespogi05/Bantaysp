import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useMessages } from "../../hooks/useChat";
import { MessageInput } from "./MessageInput";
import { useState, useCallback } from "react";
import type { Conversation, Message } from "../../services/api";

interface ChatWindowProps {
  conversation: Conversation;
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const { user } = useAuth();
  const { messages, loading } = useMessages(conversation.id);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Debug: Log the current user for message comparison
  console.log("[Chat] Current user in ChatWindow:", {
    userId: user.id,
    role: user.role,
    name: `${user.first_name} ${user.last_name}`,
  });

  // Add optimistic message that will be replaced by real-time subscription
  const handleOptimisticMessage = useCallback((content: string) => {
    const optimisticMessage: Message = {
      id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
      conversation_id: conversation.id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      is_edited: false,
    };
    console.log("[Chat] Optimistic message added:", optimisticMessage);
    setOptimisticMessages((prev) => [...prev, optimisticMessage]);

    // Clean up optimistic messages after 5 seconds (should be replaced by real-time by then)
    const timeout = setTimeout(() => {
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMessage.id)
      );
    }, 5000);

    return () => clearTimeout(timeout);
  }, [conversation.id, user.id]);

  // Combine real-time messages with optimistic ones
  const allMessages = [...messages, ...optimisticMessages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Debug: Log all messages with their sender IDs
  console.log("[Chat] All messages in ChatWindow:", allMessages.map(msg => ({
    content: msg.content.substring(0, 20),
    sender_id: msg.sender_id,
    current_user_id: user.id,
    isMe: msg.sender_id === user.id,
    match: msg.sender_id === user.id ? "✅ MATCH" : "❌ NO MATCH",
  })));
  
  // Debug: Compare sender IDs character by character for first message
  if (allMessages.length > 0) {
    const firstMsg = allMessages[0];
    console.log(`[Chat] 🔍 First message sender_id comparison:`, {
      sender_id: firstMsg.sender_id,
      current_user_id: user.id,
      sender_id_length: firstMsg.sender_id?.length,
      current_user_id_length: user.id?.length,
      are_equal: firstMsg.sender_id === user.id,
      sender_id_bytes: firstMsg.sender_id?.split('').map((c, i) => `${c}(${i})`),
      current_user_id_bytes: user.id?.split('').map((c, i) => `${c}(${i})`),
    });
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="hidden sm:flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white shrink-0">
        <div>
          <h3 className="font-semibold text-gray-900">{conversation.participant?.name}</h3>
          <p className="text-xs text-gray-500">Online</p>
        </div>
      </div>

      {/* Messages Area - renders messages in normal order with mt-auto to keep at bottom */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 bg-white min-h-0 flex flex-col">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading messages...</p>
            </div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#80000020" }}>
                <span className="text-2xl">👋</span>
              </div>
              <p className="text-gray-500 font-medium text-sm">No messages yet</p>
              <p className="text-gray-400 text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-auto">
            <AnimatePresence initial={false}>
              {allMessages.map((msg, index) => {
                const isMe = msg.sender_id === user.id;
                
                // Debug logging
                if (index === 0 || messages.length <= 3) {
                  console.log("[Chat] Message:", {
                    content: msg.content.substring(0, 30),
                    sender_id: msg.sender_id,
                    current_user_id: user.id,
                    isMe,
                    sender_id_last_4: msg.sender_id?.slice(-4),
                    current_user_id_last_4: user.id?.slice(-4),
                  });
                }
                
                const showTime =
                  index === 0 ||
                  new Date(allMessages[index - 1].created_at).getTime() -
                    new Date(msg.created_at).getTime() >
                    5 * 60 * 1000; // Show time if gap > 5 min

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex gap-3 ${isMe ? "justify-end" : ""}`}
                  >
                    {/* DEBUG */}
                    {console.log(`[Chat] 📨 Rendering: "${msg.content.substring(0, 20)}" isMe=${isMe} align=${isMe ? 'RIGHT' : 'LEFT'}`)}
                    
                    {showTime && (
                      <span className="text-gray-400 text-xs text-center w-full mb-2">
                        {new Date(msg.created_at).toLocaleTimeString("en-PH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    )}

                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words cursor-help ${
                        isMe
                          ? "text-white rounded-tr-none"
                          : "bg-gray-100 text-gray-800 rounded-tl-none"
                      }`}
                      style={isMe ? { backgroundColor: "#800000" } : {}}
                      title={new Date(msg.created_at).toLocaleString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })}
                    >
                      {msg.content}
                      {msg.is_edited && (
                        <span className="text-xs opacity-70 ml-1">(edited)</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Input Area */}
      <MessageInput conversationId={conversation.id} onOptimisticMessage={handleOptimisticMessage} />
    </div>
  );
}
