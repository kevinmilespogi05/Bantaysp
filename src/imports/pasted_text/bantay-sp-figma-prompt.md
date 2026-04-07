Got you — here are **2 optimized versions** depending on how you’ll use it:

---

# ⚡ **1. Ultra-Optimized Figma Make Prompt (Short Version)**

*(Best for Figma AI limits + faster, cleaner generation)*

---

## 🎯 Prompt

Design a **high-fidelity web app UI** for **“Bantay SP”**, a **community safety reporting and patrol system** for San Pablo, Castillejos, Zambales.

### 🎨 Style & Feel

* Premium, modern **GovTech dashboard**
* Primary color: **Maroon (#800000)**
* Clean whites, soft grays, and blue accents
* **Glassmorphism** (blur 12px, semi-transparent white cards)
* Smooth micro-animations
* Trustworthy, civic-focused design

---

## 🧱 Core Layout

### 1. Landing Page

* Fullscreen hero with blurred background + white overlay
* Fixed maroon navbar
* Left: headline

  > “Make Your Community Safer / Stronger / Better”
* Right: glassmorphic phone mockup with floating UI cards
* CTA: **“Start Protecting Your Community”**
* Sections:

  * Stats (4 KPI cards, LIVE indicators)
  * Features (3-column grid)
  * How It Works (3 steps)

---

### 2. Authentication

* Centered card UI
* Login: email + password + Google button
* Register: **multi-step form** (info → ID upload → OTP)

---

### 3. App Layout

* **Sidebar (maroon)**:

  * Expandable (icons → full labels)
  * Reports, Announcements, Emergency, Leaderboard, Chat
* Blurred background + white overlay
* Floating notification bell (top-right)

---

### 4. Reports Module (Core)

* Tabs: All / Pending / In Progress / Resolved
* Report cards:

  * Title, category, status, location, timestamp, image
* Create Report:

  * Map picker
  * Upload photos
  * Category + priority
* Report Details:

  * Timeline, gallery, map, comments

---

### 5. Other Pages

* Announcements (cards + modal)
* Emergency Contacts (call-focused UI, high contrast)
* Leaderboard (top 3 podium + rankings)
* Profile (tabs: overview, settings, achievements)

---

### 6. Admin Dashboard

* KPI cards + charts
* Tables (reports, users, verification)
* Map dashboard (pins + clustering)
* Announcement editor

---

## 🧩 Components

* Buttons (primary maroon, secondary, danger, ghost)
* Cards (report, stats, glass)
* Inputs (clean, rounded)
* Badges (status, priority, verified)
* Modals + toast notifications

---

## ✨ Interactions

* Hover: lift + shadow
* Buttons: slight scale
* Page load: fade + slide
* Sidebar: smooth expand/collapse
* Hero: floating phone + animated elements

---

## 📱 Responsive

* Mobile: overlay sidebar + stacked layout
* Desktop: full dashboard
* Touch targets ≥ 44px

---

## ⚠️ Constraints

* Keep design **consistent and minimal**
* Use **Inter font**
* Use **Lucide-style icons**
* Ensure **accessible contrast**
* Make it **developer-ready (React/Tailwind friendly)**

---

---

# 💻 **2. React + Tailwind UI Generation Prompt**

*(Use this for v0, Locofy, or AI code generators)*

---

## 🎯 Prompt

Create a **production-ready React + Tailwind CSS UI** for a system called **“Bantay SP”**, a **community safety reporting platform**.

---

## 🧱 Requirements

### Tech

* React (functional components)
* Tailwind CSS
* Component-based structure
* Clean, scalable file organization

---

## 🎨 Design System

* Primary: `#800000` (maroon)
* Hover: `#660000`
* Background: `#f7f9fb`
* Cards: white with rounded-2xl + shadow
* Font: **Inter**
* Style: **modern dashboard + glassmorphism**

---

## 🧩 Layout

### Sidebar

* Fixed left sidebar (collapsible)
* Items:

  * Reports
  * Announcements
  * Emergency
  * Leaderboard
  * Chat
* Active state: darker maroon + indicator

---

### Navbar / Header

* Top-right notification bell
* User profile dropdown

---

### Pages to Build

#### 1. Dashboard

* KPI cards (Reports, Pending, Resolved)
* Charts (placeholder)

#### 2. Reports Page

* Tabs: All / Pending / In Progress / Resolved
* Card list:

  * Title
  * Status badge
  * Category
  * Timestamp
* “Create Report” button

#### 3. Create Report

* Form:

  * Title
  * Description
  * Category select
  * Priority (Low/Medium/High)
  * Image upload
* Submit button (maroon)

#### 4. Announcements

* Card grid layout
* Modal for full content

#### 5. Emergency Contacts

* Large call buttons
* High contrast UI

#### 6. Leaderboard

* Top 3 podium
* Ranked list

#### 7. Profile

* Avatar + tabs (Overview, Settings)

---

## 🧩 Components

* Button (primary, secondary, danger)
* Card
* Badge (status colors)
* Modal
* Input fields
* Toast notifications

---

## ✨ UX Behavior

* Hover animations (scale + shadow)
* Smooth transitions (300ms)
* Responsive layout
* Mobile-friendly sidebar (drawer)

---

## 📁 Suggested Structure

```
/components
/layout
/pages
/hooks
/utils
```

---

## ⚠️ Rules

* Keep code clean and reusable
* Use Tailwind utility classes (no inline styles)
* Avoid overcomplicated logic
* Focus on UI (no backend needed)

---

---

## 🚀 Recommendation

Use:

* **Short Prompt → Figma Make**
* **React Prompt → v0 / Locofy / Cursor / Copilot**

---

If you want next level: I can give you a **SUPER prompt that generates both UI + backend structure (React + Node + API routes)** 👀
