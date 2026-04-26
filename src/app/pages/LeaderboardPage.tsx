import { motion } from "motion/react";
import { Trophy, Medal, Star, Shield, CheckCircle, TrendingUp, Award, Users, type LucideIcon } from "lucide-react";
import { useApi, fetchLeaderboard } from "../services/api";
import { SkeletonCard, EmptyState, ErrorState } from "../components/ui/DataStates";

// ─── Config ───────────────────────────────────────────────────────────────────

const badgeConfig: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
  Gold:   { color: "#d97706", bg: "#d9770615", icon: Trophy },
  Silver: { color: "#6b7280", bg: "#6b728015", icon: Medal },
  Bronze: { color: "#cd7c2f", bg: "#cd7c2f15", icon: Award },
  Member: { color: "#3b82f6", bg: "#3b82f615", icon: Star },
};

// Visual order: 2nd (left), 1st (center/tallest), 3rd (right)
const podiumLayout = [
  { rankIndex: 1, height: "h-28", color: "#6b7280", crown: "🥈", label: "2nd" },
  { rankIndex: 0, height: "h-40", color: "#d97706", crown: "🥇", label: "1st" },
  { rankIndex: 2, height: "h-20", color: "#cd7c2f", crown: "🥉", label: "3rd" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { data: leaderboard, loading, error, refetch } = useApi(fetchLeaderboard);

  // Keep natural order: index 0 = rank 1, index 1 = rank 2, index 2 = rank 3
  const top3 = leaderboard ? leaderboard.slice(0, 3) : [];
  const rest = leaderboard ? leaderboard.slice(3) : [];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900" style={{ fontSize: "1.15rem" }}>Civic Leaderboard</h2>
          <p className="text-gray-400 text-sm">Top community safety reporters</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <Trophy className="w-4 h-4 text-amber-600" />
          <span className="text-amber-700 text-sm font-medium">Monthly Rankings</span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users,     label: "Total Reporters",  value: leaderboard ? leaderboard.length.toLocaleString() : "—",  color: "#800000" },
          { icon: Shield,    label: "Verified Citizens", value: leaderboard ? leaderboard.filter((u) => u.verified).length.toLocaleString() : "—", color: "#16a34a" },
          { icon: TrendingUp, label: "Avg. Points/User", value: leaderboard && leaderboard.length ? Math.round(leaderboard.reduce((a, u) => a + u.points, 0) / leaderboard.length).toLocaleString() : "—", color: "#2563eb" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <div className="font-bold text-gray-900">{loading ? "…" : s.value}</div>
              <div className="text-gray-400 text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-4">
          {/* Podium skeleton */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 animate-pulse">
            <div className="flex items-end justify-center gap-6">
              {[28, 40, 20].map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                  <div className="w-20 bg-gray-200 rounded-t-xl" style={{ height: h * 3 }} />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} lines={1} />)}
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !leaderboard || leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No leaderboard data yet"
          description="Residents who file and resolve reports will appear here. Check back after the first week of activity."
        />
      ) : (
        <>
          {/* ── Podium ── */}
          {top3.length >= 3 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                <Trophy className="w-full h-full" style={{ color: "#d97706" }} />
              </div>
              <div className="flex items-end justify-center gap-4 sm:gap-8 relative">
                {podiumLayout.map(({ rankIndex, height, color, crown, label }) => {
                  const entry = top3[rankIndex];
                  if (!entry) return null;
                  const badge = badgeConfig[entry.badge] ?? badgeConfig.Member;
                  return (
                    <motion.div
                      key={entry.rank}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: rankIndex * 0.1 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <span className="text-2xl">{crown}</span>
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base" style={{ backgroundColor: "#800000" }}>
                        {entry.avatar}
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 text-sm">{entry.name.split(" ")[0]}</div>
                        <div className="text-gray-400 text-xs">{entry.points.toLocaleString()} pts</div>
                      </div>
                      <div
                        className={`${height} w-20 sm:w-28 rounded-t-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                        style={{ backgroundColor: color }}
                      >
                        {label}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Full rankings table ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Full Rankings</h3>
              <span className="text-gray-400 text-sm">{leaderboard.length} participants</span>
            </div>
            <div className="divide-y divide-gray-50">
              {leaderboard.map((entry, i) => {
                const badge = badgeConfig[entry.badge] ?? badgeConfig.Member;
                const BadgeIcon = badge.icon;
                return (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Rank */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0"
                      style={{
                        fontSize: "12px",
                        backgroundColor: entry.rank === 1 ? "#d97706" : entry.rank === 2 ? "#9ca3af" : entry.rank === 3 ? "#cd7c2f" : "#f3f4f6",
                        color: entry.rank <= 3 ? "white" : "#6b7280",
                      }}
                    >
                      {entry.rank}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: "#800000" }}>
                      {entry.avatar}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{entry.name}</span>
                        {entry.verified && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                      </div>
                      <div className="text-gray-400 text-xs">{entry.barangay}</div>
                    </div>

                    {/* Badge */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl" style={{ backgroundColor: badge.bg }}>
                      <BadgeIcon className="w-3.5 h-3.5" style={{ color: badge.color }} />
                      <span className="text-xs font-medium" style={{ color: badge.color }}>{entry.badge}</span>
                    </div>

                    {/* Stats */}
                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm" style={{ color: "#800000" }}>{entry.points.toLocaleString()}</div>
                      <div className="text-gray-400 text-xs">{entry.reports} reports</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
