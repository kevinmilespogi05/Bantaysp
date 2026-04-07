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

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_REPORTS = [
  { id: "RPT-001", title: "Suspicious Vehicle Parked Near Playground", category: "Suspicious Activity", status: "pending", priority: "high", location: "Brgy. San Pablo, Near Central Park", timestamp: "2026-04-06T08:30:00", reporter: "Juan dela Cruz", avatar: "JD", description: "A dark-colored van has been parked for over 6 hours near the children's playground. No visible driver or occupants.", image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400", comments: 3, upvotes: 12 },
  { id: "RPT-002", title: "Broken Streetlight on Rizal Avenue", category: "Infrastructure", status: "in_progress", priority: "medium", location: "Rizal Ave, Castillejos", timestamp: "2026-04-05T14:15:00", reporter: "Maria Santos", avatar: "MS", description: "Three consecutive streetlights are not working, making the area very dark and unsafe at night.", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", comments: 4, upvotes: 28 },
  { id: "RPT-003", title: "Road Flooding After Heavy Rain", category: "Natural Disaster", status: "resolved", priority: "high", location: "Maharlika Highway, Km 3", timestamp: "2026-04-04T16:45:00", reporter: "Roberto Reyes", avatar: "RR", description: "Major flooding blocking both lanes. Water level approximately 1 foot deep. Vehicles cannot pass.", image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400", comments: 1, upvotes: 45 },
  { id: "RPT-004", title: "Illegal Dumping Near River", category: "Environmental", status: "pending", priority: "medium", location: "Pamucutan River, Brgy. Looc", timestamp: "2026-04-06T07:00:00", reporter: "Ana Gonzales", avatar: "AG", description: "Someone has been dumping household waste near the river bank. Strong odor and possible contamination.", image: null, comments: 0, upvotes: 8 },
  { id: "RPT-005", title: "Noise Disturbance Late Night", category: "Public Disturbance", status: "in_progress", priority: "low", location: "Purok 3, Brgy. Sta. Maria", timestamp: "2026-04-05T23:30:00", reporter: "Pedro Villanueva", avatar: "PV", description: "Loud music and shouting from a residence past midnight. Already reported once before.", image: null, comments: 0, upvotes: 6 },
  { id: "RPT-006", title: "Pothole Causing Accidents", category: "Infrastructure", status: "resolved", priority: "high", location: "MacArthur Road, Brgy. Del Pilar", timestamp: "2026-04-03T10:00:00", reporter: "Luisa Mendoza", avatar: "LM", description: "Large pothole in the middle of the road causing motorcycle accidents. Two incidents already reported.", image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400", comments: 0, upvotes: 33 },
];

const SEED_COMMENTS: Record<string, any[]> = {
  "RPT-001": [
    { id: 1001, author: "Maria Santos", avatar: "MS", text: "I've seen this van too! It's been there since yesterday morning.", time: "2h ago", reportId: "RPT-001" },
    { id: 1002, author: "Roberto Reyes", avatar: "RR", text: "Reporting to barangay tanod right now.", time: "1h ago", reportId: "RPT-001" },
    { id: 1003, author: "Ana Gonzales", avatar: "AG", text: "Please update when resolved. Very concerning.", time: "30m ago", reportId: "RPT-001" },
  ],
  "RPT-002": [
    { id: 2001, author: "Juan dela Cruz", avatar: "JD", text: "This has been dark for weeks. Very dangerous at night.", time: "5h ago", reportId: "RPT-002" },
    { id: 2002, author: "Pedro Villanueva", avatar: "PV", text: "MERALCO should be notified.", time: "4h ago", reportId: "RPT-002" },
    { id: 2003, author: "Luisa Mendoza", avatar: "LM", text: "I almost got into an accident here last week.", time: "3h ago", reportId: "RPT-002" },
    { id: 2004, author: "Kapitan Bautista", avatar: "EB", text: "Report forwarded to MERALCO. ETA for repair: 2 days.", time: "1h ago", reportId: "RPT-002" },
  ],
  "RPT-003": [
    { id: 3001, author: "Kapitan Bautista", avatar: "EB", text: "Flooding cleared. Road is now passable.", time: "6h ago", reportId: "RPT-003" },
  ],
};

const SEED_ANNOUNCEMENTS = [
  { id: 1, title: "Community Safety Forum – April 10, 2026", category: "Event", date: "2026-04-06", author: "Barangay Council", authorRole: "Official Announcement", content: "All residents of San Pablo, Castillejos are invited to join our quarterly Community Safety Forum on April 10, 2026, at 2:00 PM in the Barangay Hall. Topics include crime prevention, flood preparedness, and emergency response updates. Light snacks will be provided.", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600", pinned: true, urgent: false },
  { id: 2, title: "URGENT: Typhoon Preparedness Advisory", category: "Advisory", date: "2026-04-05", author: "MDRRMO", authorRole: "Disaster Risk Reduction", content: "Signal No. 1 has been raised over Zambales. All residents are advised to prepare emergency kits, secure loose objects, and identify evacuation routes. Evacuation centers are located at Castillejos National High School and the Municipal Covered Court.", image: null, pinned: true, urgent: true },
  { id: 3, title: "New Patrol Schedule for April", category: "Operations", date: "2026-04-04", author: "PNP San Marcelino", authorRole: "Philippine National Police", content: "The updated patrol schedule for April 2026 has been released. Night patrols will be intensified in Brgy. San Pablo and Brgy. Del Pilar. Residents may contact the patrol team directly via the Emergency tab.", image: "https://images.unsplash.com/photo-1617358236456-acb8c1f65c6d?w=600", pinned: false, urgent: false },
  { id: 4, title: "Bantay SP App Update v2.1", category: "System", date: "2026-04-03", author: "Tech Team", authorRole: "System Administrator", content: "Bantay SP has been updated to version 2.1. New features include faster report processing, improved map accuracy, and the new leaderboard system. Thank you for your continued support in keeping our community safe.", image: null, pinned: false, urgent: false },
  { id: 5, title: "Cleanup Drive – Brgy. San Pablo", category: "Event", date: "2026-04-02", author: "Barangay Council", authorRole: "Official Announcement", content: "Join us for a cleanup drive this Saturday, April 12, starting at 7:00 AM. Meet at the Barangay Hall. Bring gloves and wear comfortable clothes. This is part of our monthly environmental safety initiative.", image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600", pinned: false, urgent: false },
  { id: 6, title: "Free Medical Mission – April 15", category: "Health", date: "2026-04-01", author: "Municipal Health Office", authorRole: "Health Services", content: "A free medical mission will be conducted on April 15, 2026, at the Castillejos Municipal Plaza. Services include: free consultation, blood pressure monitoring, and medicine distribution. Open to all residents.", image: null, pinned: false, urgent: false },
];

const SEED_EMERGENCY = [
  { id: 1, name: "PNP Castillejos", number: "(047) 602-0001", type: "Police", icon: "shield", available: "24/7", color: "#1e40af", description: "Philippine National Police – Castillejos Station" },
  { id: 2, name: "BFP Castillejos", number: "(047) 602-0002", type: "Fire", icon: "flame", available: "24/7", color: "#dc2626", description: "Bureau of Fire Protection – Castillejos" },
  { id: 3, name: "MDRRMO", number: "(047) 602-0003", type: "Disaster", icon: "alert-triangle", available: "24/7", color: "#d97706", description: "Municipal Disaster Risk Reduction & Management Office" },
  { id: 4, name: "Municipal Health Office", number: "(047) 602-0004", type: "Medical", icon: "heart-pulse", available: "8AM–5PM", color: "#16a34a", description: "Castillejos Municipal Health Office" },
  { id: 5, name: "Barangay San Pablo", number: "(047) 602-0005", type: "Barangay", icon: "home", available: "24/7", color: "#800000", description: "Barangay Hall – San Pablo, Castillejos" },
  { id: 6, name: "National Emergency Hotline", number: "911", type: "National", icon: "phone-call", available: "24/7", color: "#7c3aed", description: "National Emergency Response Hotline" },
];

const SEED_LEADERBOARD = [
  { rank: 1, name: "Maria Santos", points: 1250, reports: 48, verified: true, avatar: "MS", badge: "Gold", barangay: "Brgy. San Pablo" },
  { rank: 2, name: "Juan dela Cruz", points: 1120, reports: 41, verified: true, avatar: "JD", badge: "Gold", barangay: "Brgy. Del Pilar" },
  { rank: 3, name: "Ana Gonzales", points: 980, reports: 35, verified: true, avatar: "AG", badge: "Silver", barangay: "Brgy. Looc" },
  { rank: 4, name: "Roberto Reyes", points: 850, reports: 30, verified: true, avatar: "RR", badge: "Silver", barangay: "Brgy. Sta. Maria" },
  { rank: 5, name: "Luisa Mendoza", points: 720, reports: 26, verified: false, avatar: "LM", badge: "Bronze", barangay: "Brgy. San Pablo" },
  { rank: 6, name: "Pedro Villanueva", points: 650, reports: 22, verified: true, avatar: "PV", badge: "Bronze", barangay: "Brgy. Del Pilar" },
  { rank: 7, name: "Carmen Torres", points: 580, reports: 19, verified: false, avatar: "CT", badge: "Bronze", barangay: "Brgy. Looc" },
  { rank: 8, name: "Jose Ramirez", points: 510, reports: 17, verified: true, avatar: "JR", badge: "Bronze", barangay: "Brgy. Sta. Maria" },
  { rank: 9, name: "Elena Cruz", points: 440, reports: 14, verified: false, avatar: "EC", badge: "Member", barangay: "Brgy. San Pablo" },
  { rank: 10, name: "Miguel Reyes", points: 390, reports: 12, verified: false, avatar: "MR", badge: "Member", barangay: "Brgy. Del Pilar" },
];

const SEED_PATROL_UNITS = [
  { id: "PAT-001", name: "Ramon Dela Rosa", avatar: "RD", unit: "Unit 1-Alpha", badgeNumber: "PNP-8821", rank: "PO1", status: "busy", currentCase: "RPT-007", currentCaseTitle: "Armed Group Near SPES Elementary", location: { lat: 15.0582, lng: 120.1962 }, lastUpdated: "2026-04-06T10:25:00", phone: "0912-345-6789", casesToday: 5, avgResponse: "8.2 min", shiftStart: "06:00", shiftEnd: "18:00" },
  { id: "PAT-002", name: "Miguel Santos", avatar: "MS", unit: "Unit 2-Bravo", badgeNumber: "PNP-8822", rank: "PO2", status: "en_route", currentCase: "RPT-008", currentCaseTitle: "Noise Complaint – Videoke Until 2AM", location: { lat: 15.0718, lng: 120.2052 }, lastUpdated: "2026-04-06T10:20:00", phone: "0912-345-6790", casesToday: 3, avgResponse: "10.5 min", shiftStart: "06:00", shiftEnd: "18:00" },
  { id: "PAT-003", name: "Josefa Reyes", avatar: "JR", unit: "Unit 3-Charlie", badgeNumber: "PNP-8823", rank: "PO1", status: "available", currentCase: null, currentCaseTitle: null, location: { lat: 15.0682, lng: 120.1905 }, lastUpdated: "2026-04-06T10:22:00", phone: "0912-345-6791", casesToday: 2, avgResponse: "7.8 min", shiftStart: "06:00", shiftEnd: "18:00" },
  { id: "PAT-004", name: "Fernando Cruz", avatar: "FC", unit: "Unit 4-Delta", badgeNumber: "PNP-8824", rank: "PO3", status: "available", currentCase: null, currentCaseTitle: null, location: { lat: 15.0600, lng: 120.2098 }, lastUpdated: "2026-04-06T10:18:00", phone: "0912-345-6792", casesToday: 4, avgResponse: "9.1 min", shiftStart: "06:00", shiftEnd: "18:00" },
  { id: "PAT-005", name: "Carmen Torres", avatar: "CT", unit: "Unit 5-Echo", badgeNumber: "PNP-8825", rank: "PO2", status: "offline", currentCase: null, currentCaseTitle: null, location: { lat: 15.0748, lng: 120.1978 }, lastUpdated: "2026-04-06T08:00:00", phone: "0912-345-6793", casesToday: 0, avgResponse: "N/A", shiftStart: "18:00", shiftEnd: "06:00" },
  { id: "PAT-006", name: "Eduardo Garcia", avatar: "EG", unit: "Unit 6-Foxtrot", badgeNumber: "PNP-8826", rank: "PO1", status: "busy", currentCase: "RPT-001", currentCaseTitle: "Suspicious Vehicle Near Playground", location: { lat: 15.0553, lng: 120.1852 }, lastUpdated: "2026-04-06T10:15:00", phone: "0912-345-6794", casesToday: 6, avgResponse: "6.4 min", shiftStart: "06:00", shiftEnd: "18:00" },
];

const SEED_PATROL_INCIDENTS = [
  { id: "INC-007", title: "Armed Group Near SPES Elementary", category: "Suspicious Activity", priority: "critical", location: { lat: 15.0580, lng: 120.1960 }, address: "Purok 1, Brgy. San Pablo", status: "assigned", assignedPatrol: "PAT-001", timeReported: "2026-04-06T10:18:00", reporter: "Minda Torres", reporterAvatar: "MT", reporterContact: "0912-345-6789", reporterNotes: "Group of 4-5 men loitering near school gate. One appeared to be carrying a concealed weapon.", assignedAt: "2026-04-06T10:22:00" },
  { id: "INC-010", title: "Illegal Drug Activity Reported", category: "Drug-Related", priority: "high", location: { lat: 15.0660, lng: 120.2020 }, address: "Sitio Mabini, Brgy. Del Pilar", status: "pending", assignedPatrol: null, timeReported: "2026-04-06T07:15:00", reporter: "Anonymous", reporterAvatar: "AN", reporterContact: "N/A", reporterNotes: "Drug transactions near old warehouse.", assignedAt: null },
  { id: "INC-008", title: "Noise Complaint – Videoke Until 2AM", category: "Public Disturbance", priority: "low", location: { lat: 15.0710, lng: 120.2055 }, address: "Purok 2, Brgy. San Pablo", status: "assigned", assignedPatrol: "PAT-002", timeReported: "2026-04-06T09:45:00", reporter: "Cathy Reyes", reporterAvatar: "CR", reporterContact: "N/A", reporterNotes: "Neighbor karaoke past midnight, multiple complaints.", assignedAt: "2026-04-06T09:50:00" },
  { id: "INC-004", title: "Illegal Dumping Near River", category: "Environmental", priority: "medium", location: { lat: 15.0615, lng: 120.2030 }, address: "Pamucutan River, Brgy. Looc", status: "pending", assignedPatrol: null, timeReported: "2026-04-06T07:00:00", reporter: "Ana Gonzales", reporterAvatar: "AG", reporterContact: "N/A", reporterNotes: "Household waste near river bank.", assignedAt: null },
  { id: "INC-011", title: "Stray Dog Pack Threatening Residents", category: "Public Safety", priority: "medium", location: { lat: 15.0635, lng: 120.1870 }, address: "Purok 5, Brgy. Looc", status: "pending", assignedPatrol: null, timeReported: "2026-04-06T06:50:00", reporter: "Fernando Cruz", reporterAvatar: "FC", reporterContact: "N/A", reporterNotes: "Pack of 6-7 stray dogs blocking road.", assignedAt: null },
  { id: "INC-001", title: "Suspicious Vehicle Near Playground", category: "Suspicious Activity", priority: "high", location: { lat: 15.0647, lng: 120.1891 }, address: "Brgy. San Pablo, Near Central Park", status: "in_progress", assignedPatrol: "PAT-006", timeReported: "2026-04-06T08:30:00", reporter: "Juan dela Cruz", reporterAvatar: "JD", reporterContact: "N/A", reporterNotes: "Dark-colored van parked for hours.", assignedAt: "2026-04-06T08:45:00" },
];

const SEED_PATROL_MESSAGES = [
  { id: 1, from: "admin", to: "broadcast", message: "All units: Be on high alert for blue motorcycle near Brgy. Del Pilar.", time: "10:15", read: true },
  { id: 2, from: "admin", to: "PAT-001", message: "Status update on INC-007?", time: "10:20", read: true },
  { id: 3, from: "PAT-001", to: "admin", message: "On scene. 4 suspects identified. Requesting backup.", time: "10:21", read: true },
  { id: 4, from: "PAT-002", to: "admin", message: "Acknowledged broadcast. En route to INC-008.", time: "10:22", read: false },
  { id: 5, from: "admin", to: "PAT-003", message: "Can you handle INC-010? Drug activity at Sitio Mabini.", time: "10:23", read: true },
  { id: 6, from: "PAT-003", to: "admin", message: "Copy that. Heading to Sitio Mabini now.", time: "10:24", read: false },
];

const SEED_PATROL_HISTORY = [
  { id: "RPT-H01", title: "Suspicious Vehicle Near Playground", category: "Suspicious Activity", priority: "high", location: "Brgy. San Pablo, Central Park", timeResolved: "2026-04-06T09:30:00", timeReported: "2026-04-06T08:30:00", responseTime: "7 min", resolution: "Vehicle owner identified – maintenance worker from DPWH. No threat found. Area cleared.", status: "resolved", hasPhoto: true },
  { id: "RPT-H02", title: "Road Flooding – Maharlika Hwy", category: "Natural Disaster", priority: "high", location: "Maharlika Highway, Km 3", timeResolved: "2026-04-05T17:45:00", timeReported: "2026-04-05T16:45:00", responseTime: "12 min", resolution: "DPWH notified. Traffic cones placed. Water level subsided by 6PM.", status: "resolved", hasPhoto: true },
  { id: "RPT-H03", title: "Fistfight at Public Market", category: "Public Disturbance", priority: "medium", location: "Castillejos Public Market", timeResolved: "2026-04-05T14:20:00", timeReported: "2026-04-05T14:05:00", responseTime: "5 min", resolution: "Parties separated. No injuries sustained. Verbal warning issued to both parties.", status: "resolved", hasPhoto: false },
  { id: "RPT-H04", title: "Theft at Sari-sari Store", category: "Crime", priority: "high", location: "Purok 4, Brgy. Looc", timeResolved: "2026-04-04T18:30:00", timeReported: "2026-04-04T17:50:00", responseTime: "9 min", resolution: "Suspect apprehended. Stolen item recovered. Blotter report filed at station.", status: "resolved", hasPhoto: true },
  { id: "RPT-H05", title: "Abandoned Bag – Suspicious Object", category: "Suspicious Activity", priority: "critical", location: "Castillejos Bus Terminal", timeResolved: "2026-04-04T11:15:00", timeReported: "2026-04-04T11:00:00", responseTime: "4 min", resolution: "Bag inspected – contained personal belongings only. Owner located and bag returned.", status: "resolved", hasPhoto: false },
  { id: "RPT-H06", title: "Domestic Disturbance – Brgy. Sta. Maria", category: "Public Disturbance", priority: "medium", location: "Purok 3, Brgy. Sta. Maria", timeResolved: "2026-04-04T08:45:00", timeReported: "2026-04-04T08:20:00", responseTime: "11 min", resolution: "Couple counseled. No physical injuries. Referred to MSWD for follow-up.", status: "resolved", hasPhoto: false },
];

const SEED_PROFILE = {
  id: "USR-001",
  name: "Juan dela Cruz",
  email: "juan.delacruz@email.com",
  avatar: "JD",
  barangay: "Brgy. Del Pilar",
  role: "Resident",
  points: 1120,
  reports: 41,
  badge: "Gold",
  verified: true,
  joined: "January 2025",
  bio: "Active community member committed to keeping San Pablo, Castillejos safe for all residents.",
  achievements: [
    { id: 1, name: "First Responder", description: "First report submitted", icon: "zap", earned: true },
    { id: 2, name: "Community Guardian", description: "10 reports resolved", icon: "shield", earned: true },
    { id: 3, name: "Safety Champion", description: "50 total reports", icon: "award", earned: false },
    { id: 4, name: "Gold Reporter", description: "1000+ points earned", icon: "star", earned: true },
    { id: 5, name: "Verified Citizen", description: "Identity verified", icon: "badge-check", earned: true },
    { id: 6, name: "Top 3 Leader", description: "Reached top 3 leaderboard", icon: "trophy", earned: true },
  ],
};

// ─── Auto-seed on startup ─────────────────────────────────────────────────────

async function seedIfNeeded() {
  try {
    const seeded = await kv.get("bantay:seeded");
    if (seeded) return;

    const pairs: Record<string, any> = { "bantay:seeded": true };

    for (const r of SEED_REPORTS)          pairs[`report:${r.id}`]           = r;
    for (const a of SEED_ANNOUNCEMENTS)    pairs[`announcement:${a.id}`]      = a;
    for (const e of SEED_EMERGENCY)        pairs[`emergency:${e.id}`]         = e;
    for (const u of SEED_PATROL_UNITS)     pairs[`patrol_unit:${u.id}`]       = u;
    for (const i of SEED_PATROL_INCIDENTS) pairs[`patrol_incident:${i.id}`]   = i;
    for (const m of SEED_PATROL_MESSAGES)  pairs[`patrol_msg:${m.id}`]        = m;
    for (const h of SEED_PATROL_HISTORY)   pairs[`patrol_history:${h.id}`]    = h;
    for (const lb of SEED_LEADERBOARD)     pairs[`leaderboard:${lb.rank}`]    = lb;
    pairs[`profile:USR-001`] = SEED_PROFILE;

    for (const [reportId, comments] of Object.entries(SEED_COMMENTS)) {
      for (const c of comments) pairs[`comment:${reportId}:${c.id}`] = c;
    }

    await kv.mset(pairs);
    console.log("[Bantay SP] Database seeded successfully.");
  } catch (err) {
    console.log("[Bantay SP] Seed error:", err);
  }
}

await seedIfNeeded();

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
      priority: body.priority || "medium",
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
      authorRole: body.authorRole || "Official Announcement",
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
      priority: active.priority, location: active.address, address: active.address,
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
          priority: i.priority, location: i.address || "Location N/A",
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
