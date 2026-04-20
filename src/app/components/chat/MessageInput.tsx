import { useState, useRef, useCallback } from "react";
import { Send, Loader } from "lucide-react";
import { sendMessage } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

interface MessageInputProps {
  conversationId: string;
  onOptimisticMessage?: (content: string) => void;
}

export function MessageInput({ conversationId, onOptimisticMessage }: MessageInputProps) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  // Send message with optimistic updates
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;

    const messageContent = input.trim();
    setSending(true);

    // Optimistic update - show message immediately
    onOptimisticMessage?.(messageContent);

    try {
      const { data, error } = await sendMessage(conversationId, messageContent);

      if (error) {
        console.error("Error sending message:", error);
        // Could show error toast here if needed
      }

      // Clear input on success
      if (!error) {
        setInput("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, onOptimisticMessage]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full flex items-end gap-2 p-4 border-t border-gray-200 bg-white shrink-0">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={sending}
        rows={1}
        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-red-500 focus:bg-white resize-none transition-colors disabled:opacity-50"
        style={{ maxHeight: "120px" }}
      />

      <button
        onClick={handleSend}
        disabled={!input.trim() || sending}
        className="flex items-center justify-center w-10 h-10 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shrink-0"
        style={{ backgroundColor: "#800000" }}
        title={sending ? "Sending..." : "Send message"}
      >
        {sending ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
