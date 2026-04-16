-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  location TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  reporter TEXT NOT NULL,
  avatar TEXT,
  description TEXT NOT NULL,
  image TEXT,
  comments INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGINT NOT NULL PRIMARY KEY,
  report_id TEXT NOT NULL,
  author TEXT NOT NULL,
  avatar TEXT,
  text TEXT NOT NULL,
  time TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id BIGINT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  author TEXT NOT NULL,
  author_role TEXT,
  content TEXT NOT NULL,
  image TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  urgent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT,
  available TEXT,
  color TEXT,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS public.leaderboard (
  rank INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  avatar TEXT,
  badge TEXT DEFAULT 'Member',
  barangay TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create patrol_units table
CREATE TABLE IF NOT EXISTS public.patrol_units (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  unit TEXT NOT NULL,
  badge_number TEXT,
  rank TEXT,
  status TEXT NOT NULL,
  current_case TEXT,
  current_case_title TEXT,
  location_lat FLOAT,
  location_lng FLOAT,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  phone TEXT,
  cases_today INTEGER DEFAULT 0,
  avg_response TEXT,
  shift_start TEXT,
  shift_end TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create patrol_incidents table
CREATE TABLE IF NOT EXISTS public.patrol_incidents (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  location_lat FLOAT,
  location_lng FLOAT,
  address TEXT,
  status TEXT NOT NULL,
  assigned_patrol TEXT,
  time_reported TIMESTAMP NOT NULL DEFAULT NOW(),
  reporter TEXT,
  reporter_avatar TEXT,
  reporter_contact TEXT,
  reporter_notes TEXT,
  assigned_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create patrol_messages table
CREATE TABLE IF NOT EXISTS public.patrol_messages (
  id BIGINT NOT NULL PRIMARY KEY,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  message TEXT NOT NULL,
  time TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create patrol_history table
CREATE TABLE IF NOT EXISTS public.patrol_history (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  location TEXT NOT NULL,
  time_resolved TIMESTAMP NOT NULL DEFAULT NOW(),
  time_reported TIMESTAMP NOT NULL,
  response_time TEXT,
  resolution TEXT,
  status TEXT NOT NULL,
  has_photo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT NOT NULL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar TEXT,
  barangay TEXT,
  role TEXT,
  points INTEGER DEFAULT 0,
  reports INTEGER DEFAULT 0,
  badge TEXT,
  verified BOOLEAN DEFAULT FALSE,
  joined TEXT,
  bio TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_reports_timestamp ON reports(timestamp DESC);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_comments_report_id ON comments(report_id);
CREATE INDEX idx_announcements_pinned ON announcements(pinned DESC);
CREATE INDEX idx_announcements_date ON announcements(date DESC);
CREATE INDEX idx_leaderboard_points ON leaderboard(points DESC);
CREATE INDEX idx_patrol_incidents_assigned ON patrol_incidents(assigned_patrol);
CREATE INDEX idx_patrol_incidents_status ON patrol_incidents(status);
CREATE INDEX idx_patrol_history_time ON patrol_history(time_resolved DESC);
