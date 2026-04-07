import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Shield,
  MapPin,
  Bell,
  Users,
  ChevronRight,
  Star,
  CheckCircle,
  ArrowRight,
  Phone,
  FileText,
  Trophy,
  Zap,
  Eye,
  Lock,
} from "lucide-react";

const HERO_BG = "https://images.unsplash.com/photo-1771905603448-14e6c48f7665?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920";

const stats = [
  { label: "Reports Filed", value: "2,847", icon: FileText, color: "#800000", live: true },
  { label: "Issues Resolved", value: "2,391", icon: CheckCircle, color: "#16a34a", live: false },
  { label: "Active Citizens", value: "1,203", icon: Users, color: "#2563eb", live: true },
  { label: "Response Rate", value: "84%", icon: Zap, color: "#d97706", live: false },
];

const features = [
  {
    icon: FileText,
    title: "Incident Reporting",
    description: "Submit community safety reports with photos, location, and priority level in seconds.",
    color: "#800000",
  },
  {
    icon: MapPin,
    title: "Live Location Mapping",
    description: "All reports are geo-tagged on an interactive map for real-time situational awareness.",
    color: "#2563eb",
  },
  {
    icon: Bell,
    title: "Instant Alerts",
    description: "Receive push notifications for emergency advisories and report status updates.",
    color: "#d97706",
  },
  {
    icon: Phone,
    title: "Emergency Contacts",
    description: "One-tap access to PNP, BFP, MDRRMO, and Barangay hotlines.",
    color: "#dc2626",
  },
  {
    icon: Trophy,
    title: "Civic Leaderboard",
    description: "Earn points for verified reports. Top citizens are recognized monthly.",
    color: "#7c3aed",
  },
  {
    icon: Lock,
    title: "Verified & Secure",
    description: "ID-verified accounts and encrypted submissions ensure trust and authenticity.",
    color: "#16a34a",
  },
];

const steps = [
  { step: "01", title: "Create an Account", desc: "Register with your valid government ID to become a verified community reporter.", color: "#800000" },
  { step: "02", title: "File a Report", desc: "Document incidents with photos, precise location, and priority level using our easy form.", color: "#2563eb" },
  { step: "03", title: "Track & Engage", desc: "Follow the resolution status, comment, and earn civic points for your contributions.", color: "#16a34a" },
];

const testimonials = [
  { name: "Maria Santos", role: "Brgy. San Pablo Resident", text: "Bantay SP helped us resolve a flooding issue in just 2 days. The barangay officials acted quickly!", avatar: "MS" },
  { name: "Tanod Leader Cruz", role: "Brgy. Del Pilar", text: "The patrol reports and map features help us coordinate much better. An essential tool for community safety.", avatar: "TC" },
  { name: "Mayor's Office", role: "Castillejos, Zambales", text: "Bantay SP has dramatically improved citizen engagement and incident response times in our municipality.", avatar: "MO" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrollY > 50 ? "#800000" : "transparent",
          backdropFilter: scrollY > 50 ? "blur(12px)" : "none",
          boxShadow: scrollY > 50 ? "0 2px 20px rgba(0,0,0,0.2)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-lg leading-none">Bantay SP</div>
              <div className="text-white/60" style={{ fontSize: "10px" }}>Castillejos, Zambales</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "About"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="text-white/80 hover:text-white text-sm transition-colors">
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="text-white/90 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/register")}
              className="bg-white text-sm px-5 py-2 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-sm"
              style={{ color: "#800000" }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${HERO_BG})`,
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(100, 0, 0, 0.82)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/90 text-sm">Live Community Safety Network</span>
            </div>

            <h1 className="text-white mb-6 leading-tight" style={{ fontSize: "clamp(2.5rem, 5vw, 3.8rem)", fontWeight: 800, lineHeight: 1.1 }}>
              Make Your Community{" "}
              <span className="relative">
                <span className="text-amber-300">Safer.</span>
              </span>{" "}
              <br />
              <span className="text-amber-300">Stronger.</span>{" "}
              <span className="text-emerald-300">Better.</span>
            </h1>

            <p className="text-white/75 mb-8 max-w-lg" style={{ fontSize: "1.1rem", lineHeight: 1.7 }}>
              Bantay SP empowers residents of San Pablo, Castillejos, Zambales to report incidents,
              stay informed, and build a safer, more connected community together.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <button
                onClick={() => navigate("/register")}
                className="flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-white transition-all hover:scale-105 hover:shadow-2xl shadow-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)", border: "1.5px solid rgba(255,255,255,0.3)" }}
              >
                Start Protecting Your Community
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3.5 rounded-2xl font-medium text-white/80 hover:text-white border border-white/20 hover:bg-white/10 transition-all"
              >
                Sign In
              </button>
            </div>

            <div className="flex items-center gap-6">
              {["ID Verified", "Free to Use", "24/7 Support"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-white/70 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="relative hidden lg:flex justify-center items-center"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {/* Phone Frame */}
              <div
                className="w-64 h-[520px] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border-4 border-white/20"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)" }}
              >
                <div className="h-8 bg-black/20 flex items-center justify-center rounded-t-[36px]">
                  <div className="w-20 h-1.5 bg-white/30 rounded-full" />
                </div>
                <div className="flex-1 p-3 space-y-2">
                  <div className="bg-white/20 rounded-2xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#800000" }}>
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-white font-semibold text-sm">Bantay SP</span>
                    </div>
                    <div className="text-white/60 text-xs">Active community protection</div>
                  </div>
                  {[
                    { icon: "🔴", title: "Suspicious Activity", status: "Pending", time: "2m ago" },
                    { icon: "🟡", title: "Broken Streetlight", status: "In Progress", time: "1h ago" },
                    { icon: "🟢", title: "Flood Report", status: "Resolved", time: "2h ago" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/15 rounded-xl p-2.5 flex items-center gap-2">
                      <span className="text-base">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-medium truncate">{item.title}</div>
                        <div className="text-white/50" style={{ fontSize: "10px" }}>{item.time}</div>
                      </div>
                      <div className="text-white/60 whitespace-nowrap" style={{ fontSize: "9px" }}>{item.status}</div>
                    </div>
                  ))}
                  <div className="mt-4 bg-amber-400/20 rounded-xl p-3 border border-amber-400/30">
                    <div className="text-amber-300 font-semibold text-xs mb-1">🏆 You ranked #2!</div>
                    <div className="text-white/70 text-xs">1,120 civic points earned</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Cards */}
            <motion.div
              animate={{ x: [0, 8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -left-12 top-16 bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900" style={{ fontSize: "12px" }}>Report Resolved!</div>
                  <div className="text-gray-500" style={{ fontSize: "10px" }}>+50 civic points</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ x: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-8 bottom-24 bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-xl"
            >
              <div className="text-gray-500 mb-1" style={{ fontSize: "10px" }}>Active Reporters</div>
              <div className="font-bold text-gray-900">1,203</div>
              <div className="flex -space-x-1 mt-1">
                {["JD", "MS", "AG", "RR"].map((a) => (
                  <div key={a} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white" style={{ fontSize: "7px", backgroundColor: "#800000" }}>{a[0]}</div>
                ))}
                <div className="w-5 h-5 rounded-full border border-white bg-gray-200 flex items-center justify-center text-gray-600" style={{ fontSize: "7px" }}>+</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50"
        >
          <div className="w-px h-8 bg-white/30" />
          <span style={{ fontSize: "11px" }}>Scroll to explore</span>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  {stat.live && (
                    <div className="flex items-center gap-1 bg-green-50 rounded-full px-2 py-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-green-700" style={{ fontSize: "10px" }}>LIVE</span>
                    </div>
                  )}
                </div>
                <div className="font-bold text-gray-900 mb-1" style={{ fontSize: "1.75rem" }}>{stat.value}</div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20" style={{ backgroundColor: "#f7f9fb" }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-sm font-medium" style={{ backgroundColor: "#80000015", color: "#800000" }}>
              <Star className="w-4 h-4" /> Platform Features
            </div>
            <h2 className="text-gray-900 mb-3" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 700 }}>
              Everything You Need to<br />Keep Your Community Safe
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto" style={{ lineHeight: 1.7 }}>
              Bantay SP combines powerful reporting tools, real-time mapping, and community engagement
              into one easy-to-use civic safety platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1 group"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${f.color}15` }}
                >
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2" style={{ fontSize: "1rem" }}>{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-sm font-medium" style={{ backgroundColor: "#2563eb15", color: "#2563eb" }}>
              <Zap className="w-4 h-4" /> How It Works
            </div>
            <h2 className="text-gray-900" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 700 }}>
              Simple. Fast. Effective.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px border-t-2 border-dashed border-gray-200" />
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center relative"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white mb-5 shadow-lg text-lg z-10"
                  style={{ backgroundColor: s.color }}
                >
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20" style={{ backgroundColor: "#f7f9fb" }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-gray-900 mb-2" style={{ fontSize: "clamp(1.8rem, 3vw, 2.2rem)", fontWeight: 700 }}>
              Trusted by Our Community
            </h2>
            <p className="text-gray-500">Real voices from San Pablo, Castillejos</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <div className="flex mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#800000" }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-400" style={{ fontSize: "11px" }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ backgroundColor: "#800000" }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Shield className="w-14 h-14 text-white/30 mx-auto mb-6" />
            <h2 className="text-white mb-4" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 800 }}>
              Ready to Protect Your Community?
            </h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
              Join over 1,200 verified residents already making San Pablo, Castillejos safer every day.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate("/register")}
                className="flex items-center gap-2 bg-white px-8 py-3.5 rounded-2xl font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
                style={{ color: "#800000" }}
              >
                Start Protecting Your Community
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-3.5 rounded-2xl font-medium text-white border border-white/30 hover:bg-white/10 transition-all"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#800000" }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold">Bantay SP</div>
              <div className="text-gray-400" style={{ fontSize: "11px" }}>San Pablo, Castillejos, Zambales</div>
            </div>
          </div>
          <div className="text-gray-400 text-sm text-center">
            © 2026 Bantay SP. Built for the community of Castillejos, Zambales.
          </div>
          <div className="flex items-center gap-4 text-gray-400 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
