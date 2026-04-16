import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useMessages } from "../../hooks/useChat";
import { MessageInput } from "./MessageInput";
import type { Conversation } from "../../services/api";

interface ChatWindowProps {
  conversation: Conversation;
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const { user } = useAuth();
  const { messages, loading } = useMessages(conversation.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="hidden sm:flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
        <div>
          <h3 className="font-semibold text-gray-900">{conversation.participant?.name}</h3>
          <p className="text-xs text-gray-500">Online</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
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
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === user.id;
              const showAvatar =
                index === 0 || messages[index - 1].sender_id !== msg.sender_id;
              const showTime =
                index === 0 ||
                new Date(messages[index - 1].created_at).getTime() -
                  new Date(msg.created_at).getTime() >
                  5 * 60 * 1000; // Show time if gap > 5 min

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  <div className={`flex flex-col items-${isMe ? "end" : "start"}`}>
                    {showAvatar && (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 mb-1 ${
                          isMe ? "order-2" : ""
                        }`}
                        style={{ backgroundColor: "#800000" }}
                      >
                        {msg.sender?.avatar || "?"}
                      </div>
                    )}

                    {showTime && (
                      <span className="text-gray-400 text-xs mb-2">
                        {new Date(msg.created_at).toLocaleTimeString("en-PH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                      isMe
                        ? "text-white rounded-tr-none"
                        : "bg-gray-100 text-gray-800 rounded-tl-none"
                    }`}
                    style={isMe ? { backgroundColor: "#800000" } : {}}
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
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <MessageInput conversationId={conversation.id} />
    </div>
  );
}
