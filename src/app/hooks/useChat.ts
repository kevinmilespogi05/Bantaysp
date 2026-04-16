import { useEffect, useState } from "react";
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
        setMessages(messages || []);

        // Subscribe to new/updated messages
        const channel = supabase
          .channel(`messages:${conversationId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
              setMessages((prev) => [...prev, payload.new as Message]);
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
              setMessages((prev) =>
                prev.map((m) => (m.id === payload.new.id ? payload.new : m))
              );
            }
          )
          .subscribe();

        return () => {
          channel.unsubscribe();
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch messages";
        setError(message);
        console.error("Error fetching messages:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = fetchAndSubscribe();
    return () => {
      unsubscribe.then((fn) => fn?.());
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
