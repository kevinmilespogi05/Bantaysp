import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone, Shield, Flame, AlertTriangle, HeartPulse, Home, PhoneCall,
  PhoneOff, Info, MapPin, Clock, type LucideIcon,
} from "lucide-react";
import { useApi, fetchEmergencyContacts, type EmergencyContact } from "../services/api";
import { SkeletonCard, EmptyState, ErrorState } from "../components/ui/DataStates";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  shield: Shield,
  flame: Flame,
  "alert-triangle": AlertTriangle,
  "heart-pulse": HeartPulse,
  home: Home,
  "phone-call": PhoneCall,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function EmergencyPage() {
  const [calling, setCalling] = useState<number | null>(null);
  const [confirmCall, setConfirmCall] = useState<EmergencyContact | null>(null);

  const { data: contacts, loading, error, refetch } = useApi(fetchEmergencyContacts);

  const handleCall = (contact: EmergencyContact) => setConfirmCall(contact);

  const confirmAndCall = () => {
    if (!confirmCall) return;
    setCalling(confirmCall.id);
    setConfirmCall(null);
    setTimeout(() => setCalling(null), 4000);
  };

  // Separate the national 911 from the rest
  const nationalHotline = contacts?.find((c) => c.number === "911");
  const localContacts = contacts?.filter((c) => c.number !== "911") ?? [];

  return (
    <div className="space-y-6">
      {/* ── SOS Banner ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -right-4 bottom-0 w-20 h-20 bg-white/5 rounded-full" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold mb-1" style={{ fontSize: "1.2rem" }}>
              Emergency Response
            </h2>
            <p className="text-white/80 text-sm">
              For life-threatening emergencies, call{" "}
              <strong className="text-white">911</strong> immediately. All contacts below are available
              24/7 unless stated.
            </p>
          </div>
          <a
            href="tel:911"
            className="flex items-center justify-center gap-2 bg-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-100 transition-all hover:scale-105 shrink-0 shadow-lg"
            style={{ color: "#dc2626" }}
          >
            <Phone className="w-5 h-5" /> CALL 911
          </a>
        </div>
      </motion.div>

      {/* ── Info Bar ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Clock,  label: "Avg Response",  value: "< 5 min"     },
          { icon: MapPin, label: "Coverage",       value: "All Barangays" },
          { icon: Phone,  label: "Hotlines",       value: `${contacts?.length ?? 0} Active` },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50">
              <item.icon className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">{item.value}</div>
              <div className="text-gray-400" style={{ fontSize: "11px" }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 911 Hero Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
      >
        <div className="h-2" style={{ backgroundColor: "#dc2626" }} />
        <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: "#dc2626" }}>
            <PhoneCall className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-gray-900" style={{ fontSize: "1.1rem" }}>
                {nationalHotline?.name ?? "National Emergency Hotline"}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Available 24/7</span>
            </div>
            <p className="text-gray-500 text-sm">
              {nationalHotline?.description ?? "Universal emergency response — police, fire, medical"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <div className="font-bold text-gray-900" style={{ fontSize: "1.8rem" }}>911</div>
              <div className="text-gray-400 text-xs">Free call</div>
            </div>
            <a
              href="tel:911"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm transition-all hover:scale-105 shadow-md"
              style={{ backgroundColor: "#dc2626" }}
            >
              <Phone className="w-4 h-4" /> Call Now
            </a>
          </div>
        </div>
      </motion.div>

      {/* ── Contact Grid ── */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : localContacts.length === 0 ? (
        <EmptyState icon={Phone} title="No emergency contacts listed" description="Contact details will appear here once configured by the admin." />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {localContacts.map((contact, i) => {
            const IconComponent = iconMap[contact.icon] || Phone;
            const isCallActive = calling === contact.id;
            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
              >
                <div className="h-1.5" style={{ backgroundColor: contact.color }} />
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${contact.color}15` }}>
                      <IconComponent className="w-6 h-6" style={{ color: contact.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm mb-0.5">{contact.name}</h3>
                      <p className="text-gray-400" style={{ fontSize: "11px" }}>{contact.description}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-green-700" style={{ fontSize: "11px" }}>{contact.available}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl bg-gray-50">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="font-bold text-gray-900 text-sm">{contact.number}</span>
                  </div>
                  {isCallActive ? (
                    <div className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-sm animate-pulse" style={{ backgroundColor: "#16a34a" }}>
                      <Phone className="w-4 h-4" /> Connecting...
                      <button onClick={() => setCalling(null)} className="ml-2 bg-white/20 rounded-lg p-1">
                        <PhoneOff className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCall(contact)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-md"
                      style={{ backgroundColor: contact.color }}
                    >
                      <Phone className="w-4 h-4" /> Call {contact.type}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Safety Tips ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5" style={{ color: "#800000" }} />
          <h3 className="font-semibold text-gray-900">Emergency Safety Tips</h3>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { title: "Stay Calm",       desc: "Breathe deeply and assess the situation before acting.",              icon: "🧘" },
            { title: "Identify Location", desc: "Know your exact address or nearest landmark.",                       icon: "📍" },
            { title: "Don't Block Lines", desc: "Keep emergency lines free — use Bantay SP for non-urgent reports.", icon: "📵" },
            { title: "Have an Exit Plan", desc: "Know your evacuation routes and assembly points.",                   icon: "🚪" },
          ].map((tip) => (
            <div key={tip.title} className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl mb-2">{tip.icon}</div>
              <div className="font-medium text-gray-900 text-sm mb-1">{tip.title}</div>
              <div className="text-gray-500 text-xs leading-relaxed">{tip.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Confirm Call Modal ── */}
      <AnimatePresence>
        {confirmCall && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
            onClick={() => setConfirmCall(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${confirmCall.color}15` }}>
                  <Phone className="w-8 h-8" style={{ color: confirmCall.color }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Call {confirmCall.name}?</h3>
                <p className="text-gray-500 text-sm">{confirmCall.number}</p>
                <p className="text-gray-400 text-xs mt-1">{confirmCall.description}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmCall(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button
                  onClick={confirmAndCall}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: confirmCall.color }}
                >
                  <Phone className="w-4 h-4" /> Call Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
