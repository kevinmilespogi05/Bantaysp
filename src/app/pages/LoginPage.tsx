import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth, type UserRole } from "../context/AuthContext";
import { supabase } from "@/lib/supabase";
import { BantayLogo } from "../components/ui/BantayLogo";

// ── Animated counter hook ────────────────────────────────────────────────────
function useCountUp(target: number | null, duration = 1200) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    if (target === null) return;
    const start = performance.now();
    const from = 0;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + (target - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);
  return count;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface LiveStats {
  activeReports: number;
  resolved: number;
  citizens: number;
  responseRate: number;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Live stats ─────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const activeReportsCount = useCountUp(stats?.activeReports ?? null);
  const resolvedCount = useCountUp(stats?.resolved ?? null);
  const citizensCount = useCountUp(stats?.citizens ?? null);
  const responseRateCount = useCountUp(stats?.responseRate ?? null);

  useEffect(() => {
    async function loadStats() {
      try {
        // Fetch all in parallel
        const [reportsRes, profilesRes] = await Promise.all([
          supabase
            .from("reports")
            .select("status", { count: "exact", head: false }),
          supabase
            .from("user_profiles")
            .select("id", { count: "exact", head: true }),
        ]);

        const allReports = reportsRes.data ?? [];
        const totalReports = allReports.length;
        const resolvedReports = allReports.filter(
          (r: any) => r.status === "resolved"
        ).length;
        // Active = any report that is not resolved/rejected
        const activeReports = allReports.filter(
          (r: any) => !["resolved", "rejected"].includes(r.status)
        ).length;
        const citizens = profilesRes.count ?? 0;
        const responseRate =
          totalReports > 0
            ? Math.round((resolvedReports / totalReports) * 100)
            : 0;

        setStats({
          activeReports,
          resolved: resolvedReports,
          citizens,
          responseRate,
        });
      } catch (err) {
        console.warn("[LoginPage] Failed to load live stats:", err);
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    
    // Get the current session to determine user role
    const { data: { session } } = await supabase.auth.getSession();
    const userRole = (session?.user?.user_metadata?.role as UserRole) ?? "resident";
    
    // Redirect based on user role
    if (userRole === "patrol") navigate("/app/patrol/dashboard");
    else if (userRole === "admin") navigate("/app/admin");
    else navigate("/app/dashboard");
  };



  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f7f9fb" }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: "#800000" }}>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1583259883677-edc4ee5ffba9?w=800)` }}
        />
        <div className="relative z-10 flex flex-col justify-center px-14 py-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-12 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </button>
          <div className="flex items-center gap-3 mb-10">
            <BantayLogo size={48} />
            <div>
              <div className="text-white font-bold text-2xl">Bantay SP</div>
              <div className="text-white/60 text-sm">Community Safety Platform</div>
            </div>
          </div>
          <h2 className="text-white mb-4" style={{ fontSize: "2.2rem", fontWeight: 800, lineHeight: 1.2 }}>
            Welcome back,<br />Citizen Guardian.
          </h2>
          <p className="text-white/70 max-w-sm" style={{ lineHeight: 1.7 }}>
            Your community relies on you. Sign in to file reports,
            check updates, and help keep San Pablo, Castillejos safe.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {([
              {
                label: "Active Reports",
                value: statsLoading ? null : activeReportsCount,
                suffix: "",
              },
              {
                label: "Issues Resolved",
                value: statsLoading ? null : resolvedCount,
                suffix: "",
              },
              {
                label: "Active Citizens",
                value: statsLoading ? null : citizensCount,
                suffix: "",
              },
              {
                label: "Response Rate",
                value: statsLoading ? null : responseRateCount,
                suffix: "%",
              },
            ] as { label: string; value: number | null; suffix: string }[]).map((s) => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-4">
                {s.value === null ? (
                  // Skeleton shimmer while loading
                  <div
                    className="h-7 w-16 rounded-md mb-1"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0.12) 25%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.12) 75%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.4s infinite",
                    }}
                  />
                ) : (
                  <div className="text-white font-bold text-xl">
                    {s.value.toLocaleString()}{s.suffix}
                  </div>
                )}
                <div className="text-white/60 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
          <style>{`
            @keyframes shimmer {
              0%   { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile back + logo */}
          <div className="lg:hidden mb-6">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Home</span>
            </button>
            <div className="flex items-center gap-2 mb-4">
              <BantayLogo size={36} />
              <div className="font-bold text-gray-900">Bantay SP</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-gray-900 mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Sign In</h2>
            <p className="text-gray-500 text-sm">Enter your credentials to access your account.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:ring-2 transition-all"
                  style={{ ["--tw-ring-color" as any]: "#80000040" }}
                  onFocus={(e) => (e.target.style.borderColor = "#800000")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <a href="#" className="text-sm hover:underline" style={{ color: "#800000" }}>Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none transition-all"
                  onFocus={(e) => (e.target.style.borderColor = "#800000")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-70 disabled:scale-100"
              style={{ backgroundColor: "#800000" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: "#800000" }}>
              Register here
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}