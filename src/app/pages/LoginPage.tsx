import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft, Chrome } from "lucide-react";
import { useAuth, type UserRole } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    navigate("/app/dashboard");
  };

  const quickLogin = async (role: UserRole) => {
    const credMap: Record<UserRole, { email: string; password: string }> = {
      resident: { email: "juan.delacruz@email.com", password: "resident123" },
      admin: { email: "ebautista@castillejos.gov.ph", password: "admin123" },
      patrol: { email: "rdelarosa@pnp.gov.ph", password: "patrol123" },
    };
    setLoading(true);
    await login(credMap[role].email, credMap[role].password);
    setLoading(false);
    if (role === "patrol") navigate("/app/patrol/dashboard");
    else if (role === "admin") navigate("/app/admin");
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
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
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
            {[
              { label: "Active Reports", value: "2,847" },
              { label: "Issues Resolved", value: "2,391" },
              { label: "Active Citizens", value: "1,203" },
              { label: "Response Rate", value: "84%" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-4">
                <div className="text-white font-bold text-xl">{s.value}</div>
                <div className="text-white/60 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
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
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#800000" }}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="font-bold text-gray-900">Bantay SP</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-gray-900 mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Sign In</h2>
            <p className="text-gray-500 text-sm">Enter your credentials to access your account.</p>
          </div>

          {/* Quick Demo Logins */}
          <div className="mb-5 p-4 rounded-2xl border border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 font-medium mb-3">🚀 Quick Demo Access</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickLogin("resident")}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all text-center"
              >
                <span className="text-lg">👤</span>
                <span className="text-xs font-medium text-gray-700">Resident</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin("admin")}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all text-center"
              >
                <span className="text-lg">🛡️</span>
                <span className="text-xs font-medium text-blue-700">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin("patrol")}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-green-200 bg-green-50 hover:border-green-300 hover:shadow-sm transition-all text-center"
              >
                <span className="text-lg">👮</span>
                <span className="text-xs font-medium text-green-700">Patrol</span>
              </button>
            </div>
          </div>

          {/* Google */}
          <button className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl py-3 mb-6 text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium shadow-sm hover:shadow-md">
            <Chrome className="w-5 h-5 text-blue-500" />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-200" />
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