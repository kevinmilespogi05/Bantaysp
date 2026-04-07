/**
 * DataStates — Reusable loading, empty, and error state components.
 *
 * Usage:
 *   if (loading) return <SkeletonGrid count={6} />;
 *   if (error)   return <ErrorState message={error} onRetry={refetch} />;
 *   if (!data?.length) return <EmptyState icon={FileText} title="No reports yet" desc="..." />;
 */

import { type LucideIcon, AlertTriangle, RefreshCw, BarChart2, Inbox } from "lucide-react";

// ─── Skeleton primitives ──────────────────────────────────────────────────────

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-xl animate-pulse ${className}`} />;
}

/** KPI-style stat card skeleton */
export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <SkeletonBox className="w-9 h-9 rounded-xl" />
        <SkeletonBox className="w-10 h-5" />
      </div>
      <SkeletonBox className="h-7 w-20 mb-1" />
      <SkeletonBox className="h-3 w-28" />
    </div>
  );
}

/** Row / list item skeleton */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 animate-pulse">
      <SkeletonBox className="w-2 h-2 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonBox className="h-4 w-3/4" />
        <SkeletonBox className="h-3 w-1/2" />
      </div>
      {Array.from({ length: cols - 2 }).map((_, i) => (
        <SkeletonBox key={i} className="h-5 w-16 shrink-0" />
      ))}
    </div>
  );
}

/** Card skeleton (announcements, verification cards, etc.) */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBox className="h-4 w-2/3" />
          <SkeletonBox className="h-3 w-1/3" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Grid of stat cards */
export function SkeletonGrid({ count = 6, cols = "grid-cols-2 md:grid-cols-3 xl:grid-cols-6" }: { count?: number; cols?: string }) {
  return (
    <div className={`grid ${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/** Chart area skeleton */
export function SkeletonChart({ height = 220, label = "Loading chart data..." }: { height?: number; label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 animate-pulse"
      style={{ height }}
    >
      <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#800000] rounded-full animate-spin" />
      <span className="text-gray-300 text-xs">{label}</span>
    </div>
  );
}

/** Table / list skeleton */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-10 gap-2" : "py-16 gap-3"
      }`}
    >
      <div
        className={`rounded-2xl flex items-center justify-center ${
          compact ? "w-12 h-12" : "w-16 h-16"
        }`}
        style={{ backgroundColor: "#f3f4f6" }}
      >
        <Icon
          className={compact ? "w-5 h-5" : "w-7 h-7"}
          style={{ color: "#d1d5db" }}
        />
      </div>
      <div>
        <p className={`font-semibold text-gray-500 ${compact ? "text-sm" : "text-base"}`}>
          {title}
        </p>
        {description && (
          <p className={`text-gray-400 mt-0.5 max-w-xs mx-auto ${compact ? "text-xs" : "text-sm"}`}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Minimal empty state for chart panels */
export function ChartEmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
      <BarChart2 className="w-10 h-10 text-gray-200" />
      <div>
        <p className="text-gray-400 font-medium text-sm">No data yet</p>
        <p className="text-gray-300 text-xs mt-0.5 max-w-xs">{label}</p>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ message = "Something went wrong.", onRetry, compact = false }: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-10 gap-2" : "py-16 gap-3"
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <div>
        <p className="font-semibold text-gray-600 text-sm">Failed to load data</p>
        <p className="text-gray-400 text-xs mt-0.5 max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          style={{ color: "#800000" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Page-level loading spinner ───────────────────────────────────────────────

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-[3px] border-gray-200 border-t-[#800000] rounded-full animate-spin" />
    </div>
  );
}

// ─── Dark variant for Patrol layout ──────────────────────────────────────────

export function PatrolEmptyState({ icon: Icon = Inbox, title, desc }: { icon?: LucideIcon; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-700/30 flex items-center justify-center">
        <Icon className="w-7 h-7 text-slate-600" />
      </div>
      <div>
        <p className="text-slate-400 font-medium text-sm">{title}</p>
        {desc && <p className="text-slate-600 text-xs mt-0.5 max-w-xs">{desc}</p>}
      </div>
    </div>
  );
}

export function PatrolSkeletonCard() {
  return (
    <div
      className="rounded-2xl p-4 border border-slate-700/50 animate-pulse space-y-3"
      style={{ backgroundColor: "#161b22" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-700/50 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-700/50 rounded w-2/3" />
          <div className="h-3 bg-slate-700/30 rounded w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-slate-700/30 rounded w-full" />
      <div className="h-3 bg-slate-700/30 rounded w-4/5" />
    </div>
  );
}
