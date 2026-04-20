import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Message } from "../services/api";

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let isActive = true;
    let channel: any = null;

    const fetchAndSubscribe = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch initial messages
        const { data: messages, error: fetchError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;
        if (isActive) {
          setMessages(messages || []);
        }

        // Subscribe to real-time changes
        channel = supabase
          .channel(`messages:${conversationId}`, {
            config: {
              broadcast: { self: true },
            },
          })
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
              console.log("[Chat] Real-time INSERT received:", payload.new);
              if (isActive) {
                setMessages((prev) => {
                  // Check if message already exists (prevent duplicates)
                  if (prev.some((m) => m.id === payload.new.id)) {
                    return prev;
                  }
                  return [...prev, payload.new as Message];
                });
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
              console.log("[Chat] Real-time UPDATE received:", payload.new);
              if (isActive) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
                );
              }
            }
          )
          .subscribe((status) => {
            console.log("[Chat] Subscription status:", status);
            if (status === "SUBSCRIBED") {
              console.log(`[Chat] ✅ Subscribed to messages in conversation: ${conversationId}`);
            } else if (status === "CHANNEL_ERROR") {
              console.error("[Chat] Subscription error");
            }
          });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch messages";
        console.error("[Chat] Error fetching messages:", err);
        if (isActive) {
          setError(message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchAndSubscribe();

    return () => {
      isActive = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [conversationId]);

  return { messages, loading, error };
}

export function useConversations() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const { data: conversations, error } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setConversations(conversations || []);

        // Subscribe to new conversations
        const channel = supabase
          .channel("conversations")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "conversation_participants",
            },
            (payload) => {
              setConversations((prev) => [
                { ...payload.new, ...prev.find((c) => c.conversation_id === payload.new.conversation_id) },
                ...prev.filter((c) => c.conversation_id !== payload.new.conversation_id),
              ]);
            }
          )
          .subscribe();

        return () => {
          channel.unsubscribe();
        };
      } catch (err) {
        console.error("Error fetching conversations:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = fetchConversations();
    return () => {
      unsubscribe.then((fn) => fn?.());
    };
  }, []);

  return { conversations, loading };
}
