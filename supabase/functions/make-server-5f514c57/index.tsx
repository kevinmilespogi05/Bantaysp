import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ─── Helper: leaderboard update when a report is filed ───────────────────────

async function updateLeaderboard(reporterName: string, avatar: string) {
  try {
    const entries: any[] = await kv.getByPrefix("leaderboard:");
    const match = entries.find((e: any) => e.name === reporterName);
    if (match) {
      const updated = { ...match, reports: match.reports + 1, points: match.points + 50 };
      await kv.set(`leaderboard:${match.rank}`, updated);
    } else {
      const maxRank = entries.length > 0 ? Math.max(...entries.map((e: any) => e.rank)) : 0;
      const newEntry = { rank: maxRank + 1, name: reporterName, avatar, points: 50, reports: 1, verified: false, badge: "Member", barangay: "Brgy. San Pablo" };
      await kv.set(`leaderboard:${newEntry.rank}`, newEntry);
    }
    // Re-sort and re-rank
    const allEntries: any[] = await kv.getByPrefix("leaderboard:");
    const sorted = allEntries.sort((a: any, b: any) => b.points - a.points);
    const BADGES = ["Gold","Gold","Silver","Silver","Bronze","Bronze","Bronze","Bronze","Member","Member"];
    const reranked: Record<string, any> = {};
    sorted.forEach((e: any, i: number) => {
      const entry = { ...e, rank: i + 1, badge: BADGES[i] ?? "Member" };
      reranked[`leaderboard:${entry.rank}`] = entry;
    });
    // Clean old keys first
    await kv.mdel(allEntries.map((e: any) => `leaderboard:${e.rank}`));
    await kv.mset(reranked);
  } catch (err) {
    console.log("[Bantay SP] Leaderboard update error:", err);
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/health", (c) => c.json({ status: "ok" }));

// ─── Reports ──────────────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/reports", async (c) => {
  try {
    const reports: any[] = await kv.getByPrefix("report:");
    return c.json(reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  } catch (err) {
    console.log("GET /reports error:", err);
    return c.json({ error: "Failed to fetch reports" }, 500);
  }
});

app.post("/make-server-5f514c57/reports", async (c) => {
  try {
    const body = await c.req.json();
    const id = `RPT-${Date.now()}`;
    const report = {
      id,
      title: body.title?.trim(),
      category: body.category,
      status: "pending",
      location: body.location?.trim(),
      timestamp: new Date().toISOString(),
      reporter: body.reporter || "Anonymous",
      avatar: body.avatar || "AN",
      description: body.description?.trim(),
      image: body.image || null,
      comments: 0,
      upvotes: 0,
    };
    await kv.set(`report:${id}`, report);
    await updateLeaderboard(report.reporter, report.avatar);
    return c.json(report, 201);
  } catch (err) {
    console.log("POST /reports error:", err);
    return c.json({ error: "Failed to create report" }, 500);
  }
});

app.get("/make-server-5f514c57/reports/:id", async (c) => {
  const id = c.req.param("id");
  const report = await kv.get(`report:${id}`);
  if (!report) return c.json({ error: "Not found" }, 404);
  return c.json(report);
});

app.put("/make-server-5f514c57/reports/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const report = await kv.get(`report:${id}`);
    if (!report) return c.json({ error: "Not found" }, 404);
    const body = await c.req.json();
    const updated = { ...report, ...body };
    await kv.set(`report:${id}`, updated);
    return c.json(updated);
  } catch (err) {
    console.log("PUT /reports/:id error:", err);
    return c.json({ error: "Failed to update report" }, 500);
  }
});

app.delete("/make-server-5f514c57/reports/:id", async (c) => {
  const id = c.req.param("id");
  await kv.del(`report:${id}`);
  return c.json({ success: true });
});

// Comments
app.get("/make-server-5f514c57/reports/:id/comments", async (c) => {
  const id = c.req.param("id");
  const comments: any[] = await kv.getByPrefix(`comment:${id}:`);
  return c.json(comments.sort((a, b) => Number(a.id) - Number(b.id)));
});

app.post("/make-server-5f514c57/reports/:id/comments", async (c) => {
  try {
    const reportId = c.req.param("id");
    const body = await c.req.json();
    const commentId = Date.now();
    const comment = {
      id: commentId,
      author: body.author || "Anonymous",
      avatar: body.avatar || "AN",
      text: body.text?.trim(),
      time: "Just now",
      reportId,
    };
    await kv.set(`comment:${reportId}:${commentId}`, comment);
    const report = await kv.get(`report:${reportId}`);
    if (report) await kv.set(`report:${reportId}`, { ...report, comments: (report.comments || 0) + 1 });
    return c.json(comment, 201);
  } catch (err) {
    console.log("POST /reports/:id/comments error:", err);
    return c.json({ error: "Failed to add comment" }, 500);
  }
});

// Upvote
app.post("/make-server-5f514c57/reports/:id/upvote", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const report = await kv.get(`report:${id}`);
    if (!report) return c.json({ error: "Not found" }, 404);
    const delta = body.action === "remove" ? -1 : 1;
    const updated = { ...report, upvotes: Math.max(0, (report.upvotes || 0) + delta) };
    await kv.set(`report:${id}`, updated);
    return c.json({ upvotes: updated.upvotes });
  } catch (err) {
    console.log("POST /reports/:id/upvote error:", err);
    return c.json({ error: "Failed to upvote" }, 500);
  }
});

// ─── Announcements ────────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/announcements", async (c) => {
  try {
    const items: any[] = await kv.getByPrefix("announcement:");
    return c.json(items.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }));
  } catch (err) {
    console.log("GET /announcements error:", err);
    return c.json({ error: "Failed to fetch announcements" }, 500);
  }
});

app.post("/make-server-5f514c57/announcements", async (c) => {
  try {
    const body = await c.req.json();
    const id = Date.now();
    const item = {
      id,
      title: body.title?.trim(),
      category: body.category || "Advisory",
      date: new Date().toISOString().split("T")[0],
      author: body.author || "Barangay Council",
      authorRole: body.author_role || "Official Announcement",
      content: body.content?.trim(),
      image: body.image || null,
      pinned: body.pinned ?? false,
      urgent: body.urgent ?? false,
    };
    await kv.set(`announcement:${id}`, item);
    return c.json(item, 201);
  } catch (err) {
    console.log("POST /announcements error:", err);
    return c.json({ error: "Failed to create announcement" }, 500);
  }
});

app.put("/make-server-5f514c57/announcements/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`announcement:${id}`);
    if (!existing) return c.json({ error: "Not found" }, 404);
    const body = await c.req.json();
    const updated = { ...existing, ...body };
    await kv.set(`announcement:${id}`, updated);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: "Failed to update announcement" }, 500);
  }
});

app.delete("/make-server-5f514c57/announcements/:id", async (c) => {
  const id = c.req.param("id");
  await kv.del(`announcement:${id}`);
  return c.json({ success: true });
});

// ─── Emergency Contacts ───────────────────────────────────────────────────────

app.get("/make-server-5f514c57/emergency-contacts", async (c) => {
  try {
    const items: any[] = await kv.getByPrefix("emergency:");
    return c.json(items.sort((a, b) => a.id - b.id));
  } catch (err) {
    return c.json({ error: "Failed to fetch emergency contacts" }, 500);
  }
});

// ─── Leaderboard ──────────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/leaderboard", async (c) => {
  try {
    const entries: any[] = await kv.getByPrefix("leaderboard:");
    return c.json(entries.sort((a, b) => a.rank - b.rank));
  } catch (err) {
    return c.json({ error: "Failed to fetch leaderboard" }, 500);
  }
});

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/dashboard/stats", async (c) => {
  try {
    const reports: any[] = await kv.getByPrefix("report:");
    const lb: any[] = await kv.getByPrefix("leaderboard:");
    const total = reports.length;
    const pending = reports.filter(r => r.status === "pending").length;
    const inProgress = reports.filter(r => r.status === "in_progress").length;
    const resolved = reports.filter(r => r.status === "resolved").length;
    const activeCitizens = lb.length || new Set(reports.map(r => r.reporter)).size;
    const responseRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return c.json({ totalReports: total, pending, inProgress, resolved, activeCitizens, responseRate });
  } catch (err) {
    return c.json({ error: "Failed to fetch dashboard stats" }, 500);
  }
});

app.get("/make-server-5f514c57/admin/stats", async (c) => {
  try {
    const reports: any[] = await kv.getByPrefix("report:");
    const lb: any[] = await kv.getByPrefix("leaderboard:");
    const total = reports.length;
    const pending = reports.filter(r => r.status === "pending").length;
    const resolved = reports.filter(r => r.status === "resolved").length;
    const responseRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const totalUsers = lb.length || new Set(reports.map(r => r.reporter)).size;
    const pendingVerification = lb.filter((u: any) => !u.verified).length;
    return c.json({ totalUsers, totalReports: total, pendingReview: pending, resolved, responseRate, pendingVerification });
  } catch (err) {
    return c.json({ error: "Failed to fetch admin stats" }, 500);
  }
});

// ─── Analytics ────────────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/analytics/monthly", async (c) => {
  try {
    const reports: any[] = await kv.getByPrefix("report:");
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mReports = reports.filter(r => {
        const rd = new Date(r.timestamp);
        return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      });
      result.push({ month: MONTHS[d.getMonth()], reports: mReports.length, resolved: mReports.filter(r => r.status === "resolved").length });
    }
    return c.json(result);
  } catch (err) {
    return c.json({ error: "Failed to fetch monthly analytics" }, 500);
  }
});

app.get("/make-server-5f514c57/analytics/categories", async (c) => {
  try {
    const reports: any[] = await kv.getByPrefix("report:");
    const COLORS: Record<string, string> = {
      "Suspicious Activity": "#800000", "Infrastructure": "#3b82f6",
      "Environmental": "#16a34a", "Public Disturbance": "#d97706",
      "Natural Disaster": "#7c3aed", "Crime": "#dc2626",
      "Accident": "#f97316", "Other": "#6b7280", "Drug-Related": "#a855f7",
      "Public Safety": "#0891b2",
    };
    const grouped: Record<string, number> = {};
    for (const r of reports) grouped[r.category] = (grouped[r.category] || 0) + 1;
    const total = reports.length || 1;
    return c.json(
      Object.entries(grouped)
        .map(([name, count]) => ({ name, value: Math.round((count / total) * 100), color: COLORS[name] || "#6b7280" }))
        .sort((a, b) => b.value - a.value)
    );
  } catch (err) {
    return c.json({ error: "Failed to fetch category analytics" }, 500);
  }
});

app.get("/make-server-5f514c57/analytics/weekly", async (c) => {
  try {
    const reports: any[] = await kv.getByPrefix("report:");
    const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const counts = [0,0,0,0,0,0,0];
    for (const r of reports) counts[new Date(r.timestamp).getDay()]++;
    return c.json(DAYS.map((day, i) => ({ day, reports: counts[i] })));
  } catch (err) {
    return c.json({ error: "Failed to fetch weekly analytics" }, 500);
  }
});

app.get("/make-server-5f514c57/analytics/barangay", async (c) => {
  try {
    const reports: any[] = await kv.getByPrefix("report:");
    const BARANGAYS = ["Brgy. San Pablo","Brgy. Del Pilar","Brgy. Looc","Brgy. Sta. Maria","Brgy. San Juan","Brgy. Balaybay"];
    const result = BARANGAYS.map(name => {
      const short = name.replace("Brgy. ", "");
      const br = reports.filter(r => r.location?.includes(name) || r.location?.includes(short));
      return { name, reports: br.length, resolved: br.filter(r => r.status === "resolved").length };
    }).filter(b => b.reports > 0);

    if (result.length === 0) {
      return c.json(BARANGAYS.slice(0, 4).map((name, i) => ({
        name, reports: [45, 38, 29, 24][i], resolved: [38, 30, 25, 20][i],
      })));
    }
    return c.json(result);
  } catch (err) {
    return c.json({ error: "Failed to fetch barangay analytics" }, 500);
  }
});

// ─── Patrol Units ─────────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/patrol/units", async (c) => {
  try {
    return c.json(await kv.getByPrefix("patrol_unit:"));
  } catch (err) {
    return c.json({ error: "Failed to fetch patrol units" }, 500);
  }
});

app.put("/make-server-5f514c57/patrol/units/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const unit = await kv.get(`patrol_unit:${id}`);
    if (!unit) return c.json({ error: "Not found" }, 404);
    const body = await c.req.json();
    const updated = { ...unit, ...body, lastUpdated: new Date().toISOString() };
    await kv.set(`patrol_unit:${id}`, updated);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: "Failed to update patrol unit" }, 500);
  }
});

// ─── Patrol Incidents ─────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/patrol/incidents", async (c) => {
  try {
    const incidents: any[] = await kv.getByPrefix("patrol_incident:");
    return c.json(incidents.sort((a, b) => new Date(b.timeReported).getTime() - new Date(a.timeReported).getTime()));
  } catch (err) {
    return c.json({ error: "Failed to fetch incidents" }, 500);
  }
});

app.post("/make-server-5f514c57/patrol/incidents", async (c) => {
  try {
    const body = await c.req.json();
    const id = `INC-${Date.now()}`;
    const incident = { ...body, id, status: "pending", assignedPatrol: null, timeReported: new Date().toISOString() };
    await kv.set(`patrol_incident:${id}`, incident);
    return c.json(incident, 201);
  } catch (err) {
    return c.json({ error: "Failed to create incident" }, 500);
  }
});

app.put("/make-server-5f514c57/patrol/incidents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const incident = await kv.get(`patrol_incident:${id}`);
    if (!incident) return c.json({ error: "Not found" }, 404);
    const body = await c.req.json();
    const updated = { ...incident, ...body };
    await kv.set(`patrol_incident:${id}`, updated);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: "Failed to update incident" }, 500);
  }
});

// ─── Patrol Messages ──────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/patrol/messages", async (c) => {
  try {
    const msgs: any[] = await kv.getByPrefix("patrol_msg:");
    return c.json(msgs.sort((a, b) => Number(a.id) - Number(b.id)));
  } catch (err) {
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

app.post("/make-server-5f514c57/patrol/messages", async (c) => {
  try {
    const body = await c.req.json();
    const id = Date.now();
    const msg = {
      id,
      from: body.from || "admin",
      to: body.to || "broadcast",
      message: body.message?.trim(),
      time: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
      read: (body.from || "admin") === "admin",
    };
    await kv.set(`patrol_msg:${id}`, msg);
    return c.json(msg, 201);
  } catch (err) {
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// ─── Patrol History ───────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/patrol/history", async (c) => {
  try {
    const history: any[] = await kv.getByPrefix("patrol_history:");
    return c.json(history.sort((a, b) => new Date(b.timeResolved).getTime() - new Date(a.timeResolved).getTime()));
  } catch (err) {
    return c.json({ error: "Failed to fetch patrol history" }, 500);
  }
});

app.post("/make-server-5f514c57/patrol/history", async (c) => {
  try {
    const body = await c.req.json();
    const id = `RPT-H${Date.now()}`;
    const entry = { ...body, id, timeResolved: new Date().toISOString(), status: "resolved" };
    await kv.set(`patrol_history:${id}`, entry);
    return c.json(entry, 201);
  } catch (err) {
    return c.json({ error: "Failed to save history entry" }, 500);
  }
});

// ─── Patrol Stats ─────────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/patrol/stats", async (c) => {
  try {
    const history: any[] = await kv.getByPrefix("patrol_history:");
    const today = new Date().toDateString();
    const todayH = history.filter(h => new Date(h.timeResolved).toDateString() === today);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekH = history.filter(h => new Date(h.timeResolved).getTime() >= weekAgo);

    const avgResp = (items: any[]) => {
      const nums = items.map(h => parseFloat(h.responseTime || "0")).filter(n => !isNaN(n) && n > 0);
      if (!nums.length) return "N/A";
      return `${(nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1)} min`;
    };

    const catCounts: Record<string, number> = {};
    for (const h of history) catCounts[h.category] = (catCounts[h.category] || 0) + 1;
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const clearRate = history.length > 0
      ? Math.round((history.filter(h => h.status === "resolved").length / history.length) * 100)
      : 0;

    const baseCompleted = Math.max(todayH.length, history.length > 0 ? 5 : 0);
    return c.json({
      today: { completed: baseCompleted, avgResponse: avgResp(history), distance: "12.4 km", rank: 3 },
      week: { completed: Math.max(weekH.length, history.length), avgResponse: avgResp(weekH.length ? weekH : history), clearanceRate: clearRate },
      month: { completed: history.length, topCategory, commendations: Math.max(0, Math.floor(history.length / 5)) },
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch patrol stats" }, 500);
  }
});

// ─── Patrol Active Case ───────────────────────────────────────────────────────

app.get("/make-server-5f514c57/patrol/active-case", async (c) => {
  try {
    const incidents: any[] = await kv.getByPrefix("patrol_incident:");
    const active = incidents.find(i =>
      (i.status === "assigned" || i.status === "in_progress" || i.status === "accepted") &&
      i.assignedPatrol === "PAT-001"
    );
    if (!active) return c.json(null);
    return c.json({
      id: active.id, title: active.title, category: active.category,
      location: active.address, address: active.address,
      distance: "250m", eta: "2 min", timeReported: active.timeReported,
      reporter: active.reporter || "Anonymous",
      reporterAvatar: active.reporterAvatar || "AN",
      reporterContact: active.reporterContact || "N/A",
      reporterNotes: active.reporterNotes || "",
      status: active.status, coordinates: active.location,
      assignedAt: active.assignedAt || active.timeReported,
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch active case" }, 500);
  }
});

// ─── Patrol Assigned Reports ──────────────────────────────────────────────────

app.get("/make-server-5f514c57/patrol/assigned", async (c) => {
  try {
    const incidents: any[] = await kv.getByPrefix("patrol_incident:");
    return c.json(
      incidents
        .filter(i => i.status === "pending" || (i.assignedPatrol && i.assignedPatrol !== "PAT-001"))
        .map(i => ({
          id: i.id, title: i.title, category: i.category,
          location: i.address || "Location N/A",
          distance: "N/A", timeReported: i.timeReported, status: i.status,
          reporter: i.reporter || "Anonymous",
          reporterAvatar: i.reporterAvatar || "AN",
          description: i.reporterNotes || "",
        }))
    );
  } catch (err) {
    return c.json({ error: "Failed to fetch assigned reports" }, 500);
  }
});

app.post("/make-server-5f514c57/patrol/cases/:id/accept", async (c) => {
  try {
    const caseId = c.req.param("id");
    const patrolId = c.req.query("patrolId") || "PAT-001";
    
    console.log(`[PatrolCaseAccept] Patrol ${patrolId} accepting case ${caseId}...`);
    
    // Fetch the incident from KV store
    const incident: any = await kv.get(`patrol_incident:${caseId}`);
    if (!incident) {
      console.error(`[PatrolCaseAccept] Case ${caseId} not found in KV store`);
      return c.json({ error: "Case not found" }, 404);
    }
    
    // Update the incident with acceptance info
    const now = new Date().toISOString();
    incident.assignedPatrol = patrolId;
    incident.acceptedBy = patrolId;
    incident.acceptedAt = now;
    if (incident.status === "pending") {
      incident.status = "accepted";
    }
    
    // Save it back to KV store
    await kv.set(`patrol_incident:${caseId}`, incident);
    
    console.log(`[PatrolCaseAccept] ✅ Case ${caseId} accepted by ${patrolId}`);
    
    return c.json({
      id: incident.id,
      title: incident.title,
      category: incident.category,
      location: incident.address,
      address: incident.address,
      distance: "250m",
      eta: "2 min",
      timeReported: incident.timeReported,
      reporter: incident.reporter || "Anonymous",
      reporterAvatar: incident.reporterAvatar || "AN",
      reporterContact: incident.reporterContact || "N/A",
      reporterNotes: incident.reporterNotes || "",
      status: incident.status,
      coordinates: incident.location,
      assignedAt: incident.assignedAt || now,
      acceptedAt: incident.acceptedAt || now,
    });
  } catch (err) {
    console.error("[PatrolCaseAccept] Error:", err);
    return c.json({ error: "Failed to accept case" }, 500);
  }
});

// ─── Profile ──────────────────────────────────────────────────────────────────

app.get("/make-server-5f514c57/profile/:userId", async (c) => {
  const userId = c.req.param("userId");
  const profile = await kv.get(`profile:${userId}`);
  return c.json(profile ?? null);
});

app.put("/make-server-5f514c57/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const existing = (await kv.get(`profile:${userId}`)) ?? {};
    const body = await c.req.json();
    const updated = { ...existing, ...body };
    await kv.set(`profile:${userId}`, updated);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

Deno.serve(app.fetch);
