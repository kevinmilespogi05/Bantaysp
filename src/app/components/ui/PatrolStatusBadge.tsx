/**
 * PatrolStatusBadge — Shows patrol assignment & progress on resident reports
 *
 * Displays:
 * - Ticket ID (if assigned to patrol)
 * - Patrol officer name (if assigned)
 * - Current patrol status badge
 * - Patrol comments timeline (read-only for residents)
 */

import { useState } from "react";
import { usePatrolComments, useReportStatusUpdates } from "../hooks/usePatrolComments";
import { Clock, User, MessageCircle, CheckCircle, AlertCircle } from "lucide-react";

interface PatrolStatusBadgeProps {
  reportId: string;
  ticketId?: string;
  patrolAssignedTo?: string;
  patrolOfficerName?: string;
  isResident?: boolean;
}

const statusColors: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  pending: { bg: "bg-yellow-500/15", text: "text-yellow-600", icon: AlertCircle, label: "Pending" },
  accepted: { bg: "bg-blue-500/15", text: "text-blue-600", icon: CheckCircle, label: "Accepted" },
  in_progress: { bg: "bg-blue-500/20", text: "text-blue-700", icon: Clock, label: "In Progress" },
  completed: { bg: "bg-green-500/15", text: "text-green-600", icon: CheckCircle, label: "Completed" },
  escalated: { bg: "bg-red-500/15", text: "text-red-600", icon: AlertCircle, label: "Escalated" },
};

export function PatrolStatusBadge({
  reportId,
  ticketId,
  patrolAssignedTo,
  patrolOfficerName,
  isResident = true,
}: PatrolStatusBadgeProps) {
  const { comments } = usePatrolComments(reportId);
  const { patrolStatus } = useReportStatusUpdates(reportId);
  const [showComments, setShowComments] = useState(false);

  // Don't show if not assigned yet
  if (!patrolAssignedTo && !ticketId) {
    return (
      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
        <p className="text-gray-600">Status: <span className="font-medium">Awaiting Assignment</span></p>
      </div>
    );
  }

  const status = (patrolStatus || "pending") as keyof typeof statusColors;
  const statusConfig = statusColors[status] || statusColors.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-3">
      {/* Ticket ID & Officer Info */}
      <div className={`p-4 rounded-xl border ${statusConfig.bg}`}>
        <div className="grid grid-cols-2 gap-4 mb-3">
          {ticketId && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Ticket ID</p>
              <p className="font-mono font-semibold">{ticketId}</p>
            </div>
          )}
          {patrolOfficerName && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Assigned Officer</p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <p className="font-medium">{patrolOfficerName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusConfig.text}`} />
          <span className={`text-sm font-semibold ${statusConfig.text}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Patrol Comments Section */}
      {isResident && comments.length > 0 && (
        <div className="border-t pt-3">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mb-2"
          >
            <MessageCircle className="w-4 h-4" />
            Patrol Updates ({comments.length})
          </button>

          {showComments && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium capitalize">{comment.author_role}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.comment_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin/Patrol view hint */}
      {!isResident && (
        <p className="text-xs text-gray-500">
          Residents will see patrol updates and status changes in real-time.
        </p>
      )}
    </div>
  );
}

export default PatrolStatusBadge;
