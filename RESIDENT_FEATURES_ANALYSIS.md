# Bantay SP - Resident Role Features Analysis

## Overview
This document outlines all features available to the **resident** role in the Bantay SP community safety platform. Residents are verified community members who can report incidents, track responses, and engage civically.

---

## 🏠 1. Dashboard Page

**File:** [src/app/pages/DashboardPage.tsx](src/app/pages/DashboardPage.tsx)  
**Route:** `/app/dashboard`  
**Access:** Residents only (protected by RoleGuard)

### Features
- **Welcome Banner** with personalized greeting (time-based: Good morning/afternoon/evening)
- **Quick Action Buttons**
  - "File Report" button → navigate to create report
  - "View All" button → navigate to reports page
- **KPI Cards** (6 metrics)
  - Total Reports (community-wide)
  - Pending Reports (awaiting verification)
  - In Progress Reports (patrol assigned)
  - Resolved Reports (completed)
  - Active Citizens (community members)
  - Response Rate (percentage)
- **Real-time Analytics Charts**
  - Monthly Trends (line/area chart: reports filed vs resolved)
  - Category Distribution (pie chart: breakdown by incident type)
  - Weekly Activity (bar chart: daily report count)
- **Live Leaderboard Preview** (top reporters)
- **Responsive Design** with skeleton loading states and error handling

### Key Functionality
- Fetches real-time dashboard statistics via API
- Displays summary of community activity
- One-click navigation to create new reports
- Animated entrance transitions for visual polish

### APIs Used
- `fetchDashboardStats()` - Get KPI metrics
- `fetchReports()` - Resident's reports
- `fetchMonthlyTrends()` - Monthly trend data
- `fetchCategoryData()` - Category distribution
- `fetchWeeklyActivity()` - Weekly activity chart
- `fetchLeaderboard()` - Top reporters preview

---

## 📋 2. Reports Page

**File:** [src/app/pages/ReportsPage.tsx](src/app/pages/ReportsPage.tsx)  
**Route:** `/app/reports`  
**Access:** Residents only

### Features
- **Multi-Tab Filtering**
  - All Reports (default view)
  - Approved (verified by admin)
  - In Progress (patrol assigned)
  - Accepted (patrol acknowledged)
  - Submitted (awaiting first review)
  - Resolved (completed)
  - Rejected (not approved)
- **Search Functionality**
  - Search by title, category, location, or description
  - Debounced search from header context
- **Category Filtering**
  - Filter by: Suspicious Activity, Infrastructure, Environmental, Public Disturbance, Natural Disaster
- **Report Card Display**
  - Title, status badge (color-coded), category, location
  - Reporter name, avatar, timestamp
  - Upvote count, comment count
  - Report image thumbnail
- **Interactive Report Cards**
  - Click to open detailed report modal
  - View full description and location
  - Photo gallery/image viewer
  - Real-time comment thread
- **Upvote System**
  - Toggle upvote on any report (adds civic engagement)
  - Optimistic UI updates
  - Tracks user's upvoted reports
  - Persists to backend
- **Comment System**
  - View all comments on a report
  - Add new comments as resident
  - Author, avatar, timestamp, text
  - Persists to backend via API

### Status Workflow
- `pending_verification`: Awaiting admin review (amber color)
- `approved`: Admin verified (blue)
- `in_progress`: Patrol unit assigned and working (cyan)
- `accepted`: Patrol acknowledged assignment (yellow)
- `submitted`: Initial submission (purple)
- `resolved`: Patrol completed and closed (green)
- `rejected`: Admin rejected report (red)

### Key Functionality
- Real-time filtering and search
- Upvote reports to show community support
- Comment on reports to provide updates or ask questions
- Track individual reports from submission to resolution
- See community-wide incident distribution

### APIs Used
- `fetchReports()` - Get all resident reports
- `fetchComments(reportId)` - Get comments for specific report
- `fetchUserUpvotes()` - Get resident's upvoted report IDs
- `upvoteReport(id, action)` - Add/remove upvote
- `addComment(reportId, data)` - Post comment on report
- `updateReportStatus(id, data)` - Update report status

---

## 🆕 3. Create Report Page

**File:** [src/app/pages/CreateReportPage.tsx](src/app/pages/CreateReportPage.tsx)  
**Route:** `/app/reports/create`  
**Access:** Residents only

### Features
- **Report Form Fields**
  - Title (text input, required)
  - Description (textarea, detailed incident description)
  - Category (dropdown select)
    - Suspicious Activity
    - Infrastructure
    - Environmental
    - Public Disturbance
    - Natural Disaster
    - Crime
    - Accident
    - Other
  - Location (interactive map or manual entry)
  - Optional Admin Notes (internal notes, if admin pre-fills)

- **Location Picker (Advanced)**
  - Interactive map (Leaflet-based)
  - Click map to place marker
  - Drag marker to adjust location
  - Auto-reverse geocoding to human-readable address
  - Fallback to coordinates if geocoding fails
  - Auto-center map to current location (with animation)
  - Mobile detection for responsive UX

- **Image/File Upload**
  - Multiple image upload capability
  - Preview thumbnails before submission
  - File type and size validation
  - Upload to Cloudinary for storage
  - Photo gallery display
  - Mobile: Camera app integration (on mobile devices)
  - Desktop: File picker

- **Form Validation**
  - Required field validation
  - Real-time error messages
  - Submit button disabled until form valid
  - Loading state during submission

- **Privacy Options**
  - Anonymous flag (if enabled, hides reporter name)
  - Report as self or anonymously

### Key Functionality
- Geolocation support (browser permission required)
- Reverse geocoding for location names
- Cloudinary integration for image hosting
- Form state management with validation
- Mobile-optimized camera input
- Success/error notifications

### APIs Used
- `createReport(data)` - Submit new report
- `uploadToCloudinary(file)` - Upload images
- Leaflet map library (open-source)
- OSM Nominatim (reverse geocoding)

---

## 📢 4. Announcements Page

**File:** [src/app/pages/AnnouncementsPage.tsx](src/app/pages/AnnouncementsPage.tsx)  
**Route:** `/app/announcements`  
**Access:** Residents and Admins

### Features
- **Announcement Feed**
  - Filterable by category: All, Advisory, Event, Operations, System, Health
  - Search by title or author
  - Pinned announcements appear first
  - Category-colored cards (red, blue, purple, gray, green)

- **Announcement Card Display**
  - Title, category badge, author info
  - Creation date, "Urgent" indicator (if applicable)
  - Preview text/content snippet
  - Featured image thumbnail
  - Color-coded category background

- **Announcement Details Modal**
  - Full announcement text
  - Full-size featured image
  - Author name and role
  - Timestamp
  - Category tag

- **Admin-Only Actions** (if user is admin)
  - Create new announcement button (only visible to admins)
  - Edit existing announcements
  - Delete announcements
  - Pin/unpin announcements
  - Mark as urgent

- **Resident View** (read-only)
  - View all published announcements
  - Filter and search
  - Click to read full content
  - No creation/edit permissions

### Category Colors
- **Advisory**: Red (security/safety warnings)
- **Event**: Blue (community events)
- **Operations**: Purple (barangay operations)
- **System**: Gray (platform/system updates)
- **Health**: Green (health/wellness info)

### Key Functionality
- Real-time announcement display
- Category-based filtering
- Urgent/pinned prioritization
- Image hosting via Cloudinary
- Responsive card layout

### APIs Used
- `fetchAnnouncements()` - Get all announcements
- `createAnnouncement(data)` - Admin: Create announcement
- `updateAnnouncement(id, data)` - Admin: Update announcement
- `deleteAnnouncement(id)` - Admin: Delete announcement
- `uploadToCloudinary(file)` - Upload announcement images

---

## 🚨 5. Emergency Page

**File:** [src/app/pages/EmergencyPage.tsx](src/app/pages/EmergencyPage.tsx)  
**Route:** `/app/emergency`  
**Access:** Residents only

### Features
- **Emergency SOS Banner**
  - Bold, high-contrast gradient (red theme)
  - Prominent "CALL 911" button
  - Emergency response info text
  - Quick access to national emergency hotline

- **Emergency Info Stats**
  - Average Response Time (< 5 min)
  - Coverage Area (All Barangays)
  - Active Hotlines Count

- **National 911 Hero Card**
  - Dedicated card for 911 emergency hotline
  - Large phone number display
  - "Available 24/7" badge
  - One-click call button (tel: link)
  - Description: "Universal emergency response — police, fire, medical"

- **Emergency Contacts Grid**
  - Additional local emergency contacts (non-911)
  - Icon-mapped contacts (shield, flame, alert, heart, home)
  - Contact name, phone number
  - Type and availability info
  - Color-coded by contact type
  - One-click call buttons
  - Confirmation dialog before calling

- **Call Confirmation Flow**
  - Click contact → confirmation modal
  - Confirm to initiate call
  - 4-second active state animation
  - Mobile-friendly tel: protocol

### Contact Types
- Fire/Rescue
- Police/Security
- Medical/Ambulance
- Non-Emergency
- Local Barangay Office

### Key Functionality
- Direct calling integration (tel: links)
- High-visibility emergency UI
- Organized contact directory
- Call confirmation for accidental triggers
- Responsive grid layout for all devices

### APIs Used
- `fetchEmergencyContacts()` - Get emergency contact list

---

## 🏆 6. Leaderboard Page

**File:** [src/app/pages/LeaderboardPage.tsx](src/app/pages/LeaderboardPage.tsx)  
**Route:** `/app/leaderboard`  
**Access:** Residents only

### Features
- **Header Stats Cards**
  - Total Reporters (community count)
  - Verified Citizens (verified count)
  - Average Points per User
  - "Monthly Rankings" badge

- **Podium Display (Top 3)**
  - Visual 3D-style podium
  - 1st place (gold, tallest)
  - 2nd place (silver, medium)
  - 3rd place (bronze, shortest)
  - Medal emojis (🥇 🥈 🥉)
  - Avatar initials or custom avatar
  - Name (first name only)
  - Points display
  - Animated entrance transitions

- **Full Rankings Table**
  - All residents ranked by civic contribution
  - Rank number (1-N)
  - Avatar with initials
  - Name and barangay
  - Points (total civic contribution score)
  - Reports filed count
  - Verified badge (if applicable)
  - Badge tier indicator (Gold, Silver, Bronze, Member)
  - Responsive rows with hover effects

- **Badge Tiers**
  - **Gold**: Top civic contributors (trophy icon, amber color)
  - **Silver**: Established reporters (medal icon, gray)
  - **Bronze**: Active reporters (award icon, copper)
  - **Member**: Regular participants (star icon, blue)

### Ranking Criteria
- Points accumulation from filed and resolved reports
- Verification status bonus
- Community engagement (upvotes, comments)
- Resolution participation

### Key Functionality
- Real-time leaderboard updates
- Gamification via ranking system
- Recognition of top community members
- Badge achievement display
- Motivation for civic participation

### APIs Used
- `fetchLeaderboard()` - Get ranked resident list

---

## 👤 7. Profile Page

**File:** [src/app/pages/ProfilePage.tsx](src/app/pages/ProfilePage.tsx)  
**Route:** `/app/profile`  
**Access:** All authenticated users (residents, admins, patrol)

### Features
- **Profile Header Card**
  - Cover photo (maroon gradient, editable by resident)
  - Avatar with initials (emoji or custom)
  - First and Last name
  - Verified badge (if applicable, blue)
  - Badge tier (Reporter rank)
  - Barangay location
  - Edit Profile button

- **Profile Stats (Grid)**
  - Reports filed (total)
  - Civic Points (accumulated)
  - Rank (leaderboard position)
  - Achievements earned (count)

- **Tabs**
  - **Overview Tab** (default)
    - User bio/summary
    - Barangay assignment
    - Joined date
    - Verified status
    - Role badge
  - **Achievements Tab**
    - Achievement icons and names
    - Description of each achievement
    - Earned/not-earned state
    - Achievement progress
  - **Settings Tab**
    - Notification preferences
      - Email notifications (toggle)
      - Push notifications (toggle)
      - SMS notifications (toggle)
      - Announcement updates (toggle)
      - Report status updates (toggle)
    - Privacy settings
    - Account settings
    - Connected devices

- **Avatar & Cover Photo Editing**
  - Camera button overlay on profile
  - File upload for avatar
  - Cover photo upload option
  - Image cropping/selection

### Notification Settings
- Email notification toggles
- Push notification toggles
- SMS notification toggles
- Announcement digest preferences
- Report update frequency

### Key Functionality
- Profile customization (avatar, bio, cover photo)
- Notification preference management
- Achievement tracking and display
- User statistics and rank display
- Privacy and security controls

### APIs Used
- `fetchUserProfile(userId)` - Get extended profile data
- Profile update endpoints (implicit via form)

---

## 💬 8. Chat Page

**File:** [src/app/pages/ChatPage.tsx](src/app/pages/ChatPage.tsx)  
**Route:** `/app/chat`  
**Access:** Residents only

### Features
- **Two-Panel Layout**
  - Left: Conversations sidebar
  - Right: Chat window
  - Mobile responsive (sidebar toggles)

- **Conversations List (Sidebar)**
  - Search bar (filter by participant name)
  - "New Chat" button (+ icon)
  - Conversation cards
    - Participant avatar
    - Participant name
    - Last message preview (truncated)
    - Timestamp
    - Active conversation highlight (maroon border)
  - Scrollable list with loading states
  - Empty state with action button

- **Chat Window (Right Panel)**
  - Participant header (name, avatar)
  - Message thread
    - Chronological message display
    - Sender info (name, avatar, role)
    - Message content
    - Timestamp
    - Edited indicator (if applicable)
  - Message input area
    - Text input
    - Send button
    - Typing indicator
  - Auto-scroll to latest message

- **Message System**
  - Send text messages
  - Message read status tracking
  - Edit message capability
  - Delete message capability (for own messages)
  - Real-time delivery

- **Mobile Responsiveness**
  - Mobile: Sidebar hidden by default, show chat full-screen
  - Desktop: Side-by-side layout
  - Back button on mobile to return to conversations list

### Key Functionality
- Direct messaging with admins/patrol
- Conversation history persistence
- Real-time message delivery
- Read receipts
- Responsive multi-device support

### APIs Used
- `getConversations()` - Fetch user's conversations
- `getMessages(conversationId)` - Get messages in conversation
- `sendMessage(conversationId, content)` - Send message
- `createConversation(participant_id)` - Create new conversation

---

## 🆕 9. New Chat Page

**File:** [src/app/pages/NewChatPage.tsx](src/app/pages/NewChatPage.tsx)  
**Route:** `/app/chat/new`  
**Access:** Residents only

### Features
- **Admin/Patrol Selection List**
  - Search by name
  - Filter results in real-time
  - Card-based user display
    - Avatar (initials or custom)
    - Full name
    - Role badge (Administrator / Patrol Officer)
    - Barangay (if applicable)
  - "Start Chat" button per admin
  - Loading state while fetching admin list

- **Search Functionality**
  - Search by first/last name
  - Case-insensitive matching
  - Real-time filter update
  - Empty state if no matches

- **User Filtering**
  - Only shows admins and patrol officers
  - Excludes regular residents
  - Excludes self (current user)
  - Filters out already-chatting users (optional)

- **Navigation**
  - Back button to chat list
  - Header with instructions

### Key Functionality
- Discover available admins and patrol officers
- One-click conversation initiation
- Automatic conversation creation/retrieval
- Role-based contact filtering

### APIs Used
- `fetchAllUsers()` - Get all admins/patrol
- `createConversation(adminId)` - Start new conversation

---

## 🔐 Authentication & Authorization

**File:** [src/app/context/AuthContext.tsx](src/app/context/AuthContext.tsx)

### Authentication Features
- **Supabase Auth Integration**
  - Email/password authentication
  - Session management
  - JWT token handling
  - Automatic token refresh

- **Role-Based Access Control (RBAC)**
  - Resident role: default after registration
  - Role stored in `user_profiles` database table
  - Non-blocking architecture: UI renders immediately, role loads in background
  - Role validation via RoleGuard component

- **Auth User Context**
  - `useAuth()` hook for accessing user data
  - Fields: id, first_name, last_name, avatar, role, barangay
  - Available throughout all pages/components

- **User Enrichment**
  - Immediate session load from Supabase Auth
  - Background database enrichment from `user_profiles`
  - Fallback defaults if enrichment delayed/fails

### APIs Used
- Supabase Auth service
- Database profile lookup

---

## 🛡️ Route Protection

**File:** [src/app/routes.tsx](src/app/routes.tsx)

### Resident-Only Routes
- `/app/dashboard` - DashboardPage
- `/app/reports` - ReportsPage
- `/app/reports/create` - CreateReportPage
- `/app/emergency` - EmergencyPage
- `/app/leaderboard` - LeaderboardPage

### Shared Routes
- `/app/profile` - ProfilePage (all roles)
- `/app/chat` - ChatPage (all authenticated users)
- `/app/chat/new` - NewChatPage (all authenticated users)
- `/app/announcements` - AnnouncementsPage (residents + admins)

### Access Control
- `RoleGuard` component wraps protected routes
- Non-residents redirected to `/app/dashboard`
- Unauthenticated users redirected to `/login`

---

## 📊 Data Models & Types

### Report Model
```typescript
interface Report {
  id: string;
  user_id: string;
  title: string;
  category: string;
  status: "pending_verification" | "approved" | "rejected" | 
          "in_progress" | "resolved" | "accepted" | "submitted";
  location: string;
  timestamp: string;
  reporter: string;
  avatar: string;
  description: string;
  image_url: string | null;
  verified: boolean;
  comments: number;
  upvotes: number;
  is_anonymous?: boolean;
  location_lat?: number;
  location_lng?: number;
  admin_notes?: string;
}
```

### Announcement Model
```typescript
interface Announcement {
  id: number;
  title: string;
  category: string;
  date: string;
  author: string;
  author_role: string;
  content: string;
  image: string | null;
  pinned: boolean;
  urgent: boolean;
}
```

### LeaderboardEntry Model
```typescript
interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  reports: number;
  verified: boolean;
  avatar: string;
  badge: "Gold" | "Silver" | "Bronze" | "Member";
  barangay: string;
}
```

### UserProfile Model
```typescript
interface UserProfile {
  id?: string;
  first_name: string;
  last_name: string;
  avatar: string;
  barangay: string;
  role: string;
  points: number;
  reports: number;
  badge: string;
  verified: boolean;
  joined: string;
  bio: string;
  email?: string;
  phone?: string;
  email_verified?: boolean;
  verification_status?: string;
  achievements: Achievement[];
}
```

---

## 🎯 Key Resident Actions Summary

| Action | Page | Method | API Endpoint |
|--------|------|--------|--------------|
| View Dashboard | Dashboard | GET | `/dashboard/stats` |
| List Reports | Reports | GET | `/reports` |
| Create Report | Create Report | POST | `/reports` |
| Upvote Report | Reports | POST | `/reports/{id}/upvote` |
| Comment on Report | Reports | POST | `/reports/{id}/comments` |
| View Announcements | Announcements | GET | `/announcements` |
| View Emergency Contacts | Emergency | GET | `/emergency-contacts` |
| View Leaderboard | Leaderboard | GET | `/leaderboard` |
| View Profile | Profile | GET | `/profile/{userId}` |
| View Conversations | Chat | GET | `/conversations` |
| Send Message | Chat | POST | `/conversations/{id}/messages` |
| Start New Chat | New Chat | POST | `/conversations` |
| View Comments | Reports | GET | `/reports/{id}/comments` |

---

## 🎨 UI/UX Features

### Design System
- **Primary Color**: `#800000` (Maroon)
- **Typography**: Inter font family
- **Components**: Rounded corners (border-radius: 0.5rem+)
- **Shadows**: Subtle drop shadows on cards
- **Spacing**: Consistent 1rem base unit
- **Responsiveness**: Mobile-first, breakpoints at sm/md/lg/xl

### Animations
- Framer Motion library for smooth transitions
- Entrance animations on page load
- Hover state scaling (slight lift effect)
- Loading skeletons for data fetching
- Toast notifications for user feedback

### Loading States
- `SkeletonGrid` for dashboard KPI cards
- `SkeletonCard` for list items
- `SkeletonChart` for chart placeholders
- Loading spinners for async operations

### Error Handling
- `ErrorState` component with retry button
- Descriptive error messages
- Graceful fallbacks
- Error toast notifications

### Empty States
- `EmptyState` component with icon/message
- Contextual CTAs (e.g., "Create your first report")
- Helpful descriptions

---

## 🔌 External Integrations

### Cloudinary (Image Hosting)
- Report photo uploads
- Announcement images
- Avatar/profile pictures
- Image optimization and hosting

### Leaflet (Mapping)
- Interactive map for location selection
- Marker placement
- Drag-and-drop location picking
- Map tile layer from OpenStreetMap

### OSM Nominatim (Reverse Geocoding)
- Convert coordinates to human-readable addresses
- Fallback to latitude/longitude display

### Supabase (Backend & Auth)
- PostgreSQL database
- Real-time subscriptions
- Edge functions
- Session management

### SendGrid (Email - implicit)
- Registration verification emails
- Password reset emails
- Report status update notifications

---

## 📱 Mobile Optimization

### Responsive Design
- All pages adapt to mobile, tablet, desktop
- Touch-friendly button sizes (min 44px)
- Stack layouts on mobile (single column)
- Sidebar collapses on mobile

### Mobile-Specific Features
- Native camera integration for report photos
- Touch-optimized forms
- Mobile map controls
- Full-screen chat on mobile

### Performance
- Code splitting per page
- Lazy loading of images
- Optimized Cloudinary image delivery
- Efficient API calls with deduplication

---

## 🚀 Deployment & Access

### Frontend
- Deployed to Netlify
- Live URL: `https://bantaysp.netlify.app`

### Backend
- Deployed to Render
- API Base URL: `https://bantaysp.onrender.com`

### Database
- Supabase PostgreSQL
- Real-time subscriptions enabled

---

## 📋 Summary of Resident Capabilities

✅ **Report Incidents**
- File structured reports with location, photos, category
- Real-time geolocation support
- Image hosting via Cloudinary

✅ **Track Report Status**
- View personal reports with status progression
- Track from submission → resolution
- See patrol assignments and progress

✅ **Community Engagement**
- Upvote reports to show support
- Comment on incidents
- Build reputation through civic participation

✅ **View Community Activity**
- Dashboard with real-time statistics
- Analytics charts (monthly, weekly, by category)
- Leaderboard to see top contributors

✅ **Emergency Response**
- Quick access to 911 and local emergency contacts
- One-click calling
- Emergency hotline directory

✅ **Stay Informed**
- Read announcements from barangay officials
- Filter by category (Advisory, Event, Operations, System, Health)
- Get pinned/urgent notifications

✅ **Direct Communication**
- Message admins and patrol officers
- Chat history persistence
- Real-time message delivery

✅ **Personal Profile**
- Customizable avatar and cover photo
- Achievement display
- Civic points and rank tracking
- Notification preferences
- Privacy controls

✅ **Gamification**
- Earn points for reports and engagement
- Achieve badge tiers (Member, Bronze, Silver, Gold)
- Compete on monthly leaderboard
- Earn achievements for milestones

---

## 📚 File Structure Reference

```
src/app/
├── pages/
│   ├── DashboardPage.tsx          (Dashboard)
│   ├── ReportsPage.tsx            (Reports list & details)
│   ├── CreateReportPage.tsx       (Report creation)
│   ├── AnnouncementsPage.tsx      (Announcements feed)
│   ├── EmergencyPage.tsx          (Emergency contacts)
│   ├── LeaderboardPage.tsx        (Civic rankings)
│   ├── ProfilePage.tsx            (User profile)
│   ├── ChatPage.tsx               (Direct messaging)
│   └── NewChatPage.tsx            (Start new chat)
├── services/
│   └── api.ts                     (API service layer)
├── context/
│   ├── AuthContext.tsx            (Auth & RBAC)
│   └── SearchContext.tsx          (Global search)
├── components/
│   ├── ui/                        (Reusable UI components)
│   ├── chat/                      (Chat components)
│   └── layout/                    (Layout components)
└── routes.tsx                     (Route configuration)
```

---

**Document Last Updated:** April 19, 2026  
**Bantay SP Version:** v1.0  
**Resident Role Status:** ✅ Full Access Implemented
