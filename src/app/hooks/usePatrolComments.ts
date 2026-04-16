/**
 * usePatrolComments — Real-time subscription to patrol comments
 *
 * Subscribes to patrol_comments table and auto-updates when new comments arrive.
 * Used in PatrolCaseDetail component.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PatrolComment } from "../services/api";

export function usePatrolComments(reportId: string | null) {
  const [comments, setComments] = useState<PatrolComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    let subscription: { unsubscribe: () => void } | null = null;

    const setupSubscription = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch initial comments
        const { data: initialData, error: fetchError } = await supabase
          .from("patrol_comments")
          .select("*")
          .eq("report_id", reportId)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setComments(initialData as PatrolComment[] || []);

        // Set up real-time subscription
        const channel = supabase
          .channel(`patrol-comments-${reportId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "patrol_comments",
              filter: `report_id=eq.${reportId}`,
            },
            (payload) => {
              if (payload.eventType === "INSERT") {
                const newComment = payload.new as PatrolComment;
                setComments((prev) => [newComment, ...prev]);
              } else if (payload.eventType === "UPDATE") {
                const updatedComment = payload.new as PatrolComment;
                setComments((prev) =>
                  prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
                );
              } else if (payload.eventType === "DELETE") {
                const deletedComment = payload.old as PatrolComment;
                setComments((prev) => prev.filter((c) => c.id !== deletedComment.id));
              }
            }
          )
          .subscribe();

        subscription = channel;
        setIsLoading(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load comments";
        console.error("[Real-time] Error setting up comments subscription:", msg);
        setError(msg);
        setIsLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [reportId]);

  return { comments, isLoading, error };
}

/**
 * useReportStatusUpdates — Real-time subscription to report status changes
 *
 * Watches for patrol_status changes on reports table.
 */
export function useReportStatusUpdates(reportId: string | null) {
  const [patrolStatus, setPatrolStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;

    let subscription: { unsubscribe: () => void } | null = null;

    const setupSubscription = async () => {
      try {
        // Fetch initial status
        const { data: reportData, error: fetchError } = await supabase
          .from("reports")
          .select("patrol_status")
          .eq("id", reportId)
          .single();

        if (fetchError) throw fetchError;
        setPatrolStatus(reportData?.patrol_status || "pending");

        // Subscribe to status changes
        const channel = supabase
          .channel(`report-status-${reportId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "reports",
              filter: `id=eq.${reportId}`,
            },
            (payload) => {
              const updatedReport = payload.new as { patrol_status?: string };
              if (updatedReport.patrol_status) {
                setPatrolStatus(updatedReport.patrol_status);
              }
            }
          )
          .subscribe();

        subscription = channel;
        setIsLoading(false);
      } catch (err) {
        console.error("[Real-time] Error setting up status subscription:", err);
        setIsLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [reportId]);

  return { patrolStatus, isLoading };
}
