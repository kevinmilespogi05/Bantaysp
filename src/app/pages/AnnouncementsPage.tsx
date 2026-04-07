import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone, Pin, AlertTriangle, X, Calendar, User, ChevronRight,
  Search, Bell, Plus, Upload, ImageIcon, Tag, Shield, Inbox, Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  useApi, fetchAnnouncements,
  createAnnouncement, deleteAnnouncement,
  type Announcement,
} from "../services/api";
import { SkeletonCard, EmptyState, ErrorState } from "../components/ui/DataStates";

// ─── Config ───────────────────────────────────────────────────────────────────

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Advisory:   { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200" },
  Event:      { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  Operations: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  System:     { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200" },
  Health:     { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
};

const CATEGORIES = ["All", "Advisory", "Event", "Operations", "System", "Health"];

// ─── Component ────────────────────────────────────────────────────────────────

export function AnnouncementsPage() {
  const { isAdmin, user } = useAuth();

  // ── API data ──────────────────────────────────────────────────────────────
  const { data: apiAnnouncements, loading, error, refetch } = useApi(fetchAnnouncements);

  // ── Local state ───────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "", content: "", category: "Advisory", urgent: false, pinned: false,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  const allAnnouncements = apiAnnouncements ?? [];

  const filtered = allAnnouncements.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.author.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || a.category === filter;
    return matchSearch && matchFilter;
  });

  const pinned = filtered.filter((a) => a.pinned);
  const regular = filtered.filter((a) => !a.pinned);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) return;
    setCreating(true);
    setCreateError(null);

    const { data, error: apiErr } = await createAnnouncement({
      title: createForm.title.trim(),
      content: createForm.content.trim(),
      category: createForm.category,
      author: user.name,
      authorRole: user.role === "admin" ? "Administrator" : "Official",
      pinned: createForm.pinned,
      urgent: createForm.urgent,
      image: imagePreview,
    });

    if (apiErr || !data) {
      setCreateError(apiErr ?? "Failed to post announcement. Please try again.");
      setCreating(false);
      return;
    }

    refetch();
    setCreateForm({ title: "", content: "", category: "Advisory", urgent: false, pinned: false });
    setImagePreview(null);
    setCreating(false);
    setShowCreate(false);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    await deleteAnnouncement(id);
    if (selected?.id === id) setSelected(null);
    refetch();
    setDeletingId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#800000" }}>
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Announcements</h2>
            <p className="text-gray-400 text-sm">Official barangay updates · San Pablo</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="sm:ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-all"
            style={{ backgroundColor: "#800000" }}
          >
            <Plus className="w-4 h-4" /> Post Announcement
          </button>
        )}
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none"
            onFocus={(e) => (e.target.style.borderColor = "#800000")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-h-[44px] border ${
                filter === cat ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
              style={filter === cat ? { backgroundColor: "#800000" } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description={
            search || filter !== "All"
              ? "No announcements match your search or filter."
              : "Official announcements from the barangay will appear here."
          }
          action={
            isAdmin && !search && filter === "All" ? (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white"
                style={{ backgroundColor: "#800000" }}
              >
                <Plus className="w-4 h-4" /> Post first announcement
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Pinned */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4" style={{ color: "#800000" }} />
                <span className="text-sm font-semibold text-gray-600">Pinned</span>
              </div>
              {pinned.map((a, i) => (
                <AnnouncementCard key={a.id} announcement={a} index={i} onClick={() => setSelected(a)} />
              ))}
            </div>
          )}

          {/* Regular */}
          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-500">All Announcements</span>
                </div>
              )}
              {regular.map((a, i) => (
                <AnnouncementCard key={a.id} announcement={a} index={i} onClick={() => setSelected(a)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-xl mx-auto bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[85vh] flex flex-col"
            >
              {selected.image && (
                <div className="h-52 shrink-0 overflow-hidden relative">
                  <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {selected.urgent && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-bold">
                      <AlertTriangle className="w-3 h-3" /> URGENT
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    {selected.urgent && !selected.image && (
                      <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold mb-2">
                        <AlertTriangle className="w-3.5 h-3.5" /> URGENT
                      </div>
                    )}
                    <h2 className="text-gray-900 font-bold" style={{ fontSize: "1.15rem" }}>{selected.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                      <button
                        onClick={() => { handleDelete(selected.id); setSelected(null); }}
                        disabled={deletingId === selected.id}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors disabled:opacity-50"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                    <User className="w-3.5 h-3.5" />{selected.author}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selected.date).toLocaleDateString("en-PH", { dateStyle: "long" })}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                  {selected.content}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Admin: Create Announcement Modal ── */}
      <AnimatePresence>
        {showCreate && isAdmin && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-xl mx-auto bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" style={{ color: "#800000" }} />
                  <span className="font-semibold text-gray-900">New Announcement</span>
                </div>
                <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                  <input
                    value={createForm.title}
                    onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Announcement title..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                    onFocus={(e) => (e.target.style.borderColor = "#800000")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <div className="flex gap-2 flex-wrap">
                    {["Advisory", "Event", "Operations", "System", "Health"].map((cat) => {
                      const cc = categoryColors[cat];
                      return (
                        <button
                          key={cat}
                          onClick={() => setCreateForm((f) => ({ ...f, category: cat }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${cc.bg} ${cc.text} ${cc.border} ${createForm.category === cat ? "ring-2 ring-offset-1" : "opacity-60"}`}
                          style={createForm.category === cat ? { ringColor: "#800000" } : {}}
                        >
                          <Tag className="w-3 h-3" />{cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Content *</label>
                  <textarea
                    value={createForm.content}
                    onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))}
                    rows={5}
                    placeholder="Write the announcement content..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none outline-none"
                    onFocus={(e) => (e.target.style.borderColor = "#800000")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Image (optional)</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden h-36">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 hover:border-gray-300 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-gray-300" />
                      <span className="text-gray-400 text-xs">Click to upload image</span>
                    </button>
                  )}
                </div>

                {/* Toggles */}
                <div className="flex gap-4">
                  {[
                    { key: "urgent" as const, label: "Mark as URGENT", color: "#dc2626" },
                    { key: "pinned" as const, label: "Pin to top", color: "#800000" },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => setCreateForm((f) => ({ ...f, [key]: !f[key] }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${createForm[key] ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600"}`}
                      style={createForm[key] ? { backgroundColor: color } : {}}
                    >
                      {key === "urgent" ? <AlertTriangle className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Error */}
                {createError && (
                  <div className="text-red-500 text-sm mt-2">
                    {createError}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!createForm.title.trim() || !createForm.content.trim() || creating}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                  style={{ backgroundColor: "#800000" }}
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Posting...
                    </span>
                  ) : "Post Announcement"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({
  announcement: a,
  index,
  onClick,
}: {
  announcement: Announcement;
  index: number;
  onClick: () => void;
}) {
  const cc = categoryColors[a.category] ?? categoryColors.System;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden ${
        a.urgent ? "border-red-200" : "border-gray-100"
      }`}
    >
      {a.image && (
        <div className="h-40 overflow-hidden relative">
          <img src={a.image} alt={a.title} className="w-full h-full object-cover" />
          {a.urgent && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              <AlertTriangle className="w-3 h-3" /> URGENT
            </div>
          )}
          {a.pinned && (
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "#800000" }}>
              <Pin className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
      )}
      <div className="p-5">
        {!a.image && a.urgent && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> URGENT
          </div>
        )}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-gray-900 leading-snug flex-1" style={{ fontSize: "0.95rem" }}>
            {a.title}
          </h3>
          {!a.image && a.pinned && <Pin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#800000" }} />}
        </div>
        <p className="text-gray-500 text-sm line-clamp-2 mb-3">{a.content}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${cc.bg} ${cc.text} ${cc.border}`}>{a.category}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400 text-xs">
            <span>{a.author}</span>
            <span>{new Date(a.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}