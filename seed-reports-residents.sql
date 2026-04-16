-- Seed Reports and Residents Data for Testing
-- This populates the database with realistic incident reports and resident profiles

BEGIN;

-- ─── Helper: Generate UUIDs for users (replace with real auth.users IDs if available) ────
-- For testing, we'll use deterministic UUIDs based on email hashes
-- In production, these should reference actual auth.users(id) values

-- ─── Populate Reports with Various Statuses and Categories ────────────────────────────

INSERT INTO public.reports (
  id, user_id, title, category, status, priority, location, location_lat, location_lng, 
  timestamp, reporter, avatar, description, verified, image_url, admin_notes, created_at
) VALUES
  -- HIGH PRIORITY CASES
  ('RPT-001', NULL, 'Armed Robbery at 7-Eleven', 'Crime', 'in_progress', 'high', 
   '7-Eleven, Gov. Reyes Boulevard', 15.0648, 120.1982,
   NOW() - INTERVAL '2 hours', 'Juan Dela Cruz', 'JDC',
   'Suspect armed with knife demanding cash from register. Staff locked in back room. Police already called.',
   true, 'https://images.unsplash.com/photo-1563522014-b7953ac0ea91?w=400', 
   'Suspect has tattoo on left forearm. Fled towards Martinez St', NOW() - INTERVAL '2 hours'),

  ('RPT-002', NULL, 'Traffic Accident - Multiple Vehicles', 'Accident', 'resolved', 'high',
   'Session Road x Magsaysay Avenue', 15.0725, 120.1945,
   NOW() - INTERVAL '4 hours', 'Maria Gonzales', 'MG',
   'Three-vehicle collision. No reported injuries. Vehicles currently blocking traffic.',
   true, 'https://images.unsplash.com/photo-1579496124267-540aa2c47d42?w=400',
   'Insurance reports filed. Traffic cleared by 4:30 PM', NOW() - INTERVAL '4 hours'),

  ('RPT-003', NULL, 'Suspicious Individuals - Residential Area', 'Suspicious Activity', 'pending', 'medium',
   'Barangay Santa Rosa, Oak Park Area', 15.0580, 120.2015,
   NOW() - INTERVAL '30 minutes', 'Rosa Villanueva', 'RV',
   'Two men loitering near homes, asking residents for money. Possibly casing for burglary.',
   false, NULL,
   'Residents reported via neighborhood chat. Increase patrols in area.', NOW() - INTERVAL '30 minutes'),

  ('RPT-004', NULL, 'Street Flooding - Impassable', 'Environmental', 'pending', 'high',
   'Barangay San Isidro, Main Drainage Area', 15.0650, 120.1890,
   NOW() - INTERVAL '1 hour 15 minutes', 'Pedro Sanchez', 'PS',
   'Heavy rain caused flash flooding. Waters up to car roof. Several houses affected. Some residents trapped.',
   false, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
   'Contact MDRRMO. Evacuation may be needed. Road impassable.', NOW() - INTERVAL '1 hour 15 minutes'),

  ('RPT-005', NULL, 'Lost Child Report', 'Public Safety', 'in_progress', 'high',
   'Paseo de Santa Rosa, Shopping District', 15.0500, 120.2050,
   NOW() - INTERVAL '45 minutes', 'Anna Reyes', 'AR',
   '7-year-old boy, wearing blue shirt and khaki shorts. Height 3''8". Missing since 2 PM from mall. CCTV being reviewed.',
   true, 'https://images.unsplash.com/photo-1503454537688-e6986067f4e9?w=400',
   'Amber alert issued. Patrols increased. Contact family at 09123456789.', NOW() - INTERVAL '45 minutes'),

  -- MEDIUM PRIORITY CASES
  ('RPT-006', NULL, 'Loud Party - Noise Complaint', 'Public Disturbance', 'resolved', 'medium',
   'Barangay San Agustin, Residential Area', 15.0700, 120.1950,
   NOW() - INTERVAL '3 hours', 'Carlos Torres', 'CT',
   'Neighborhood party with loud music and shouting until 2 AM. Neighbors unable to sleep.',
   false, NULL,
   'Officers spoke with host. Noise reduced by 1 AM. No further complaints.', NOW() - INTERVAL '3 hours'),

  ('RPT-007', NULL, 'Illegal Parking - Fire Hydrant', 'Public Order', 'resolved', 'medium',
   'Gov. Reyes Boulevard', 15.0620, 120.1970,
   NOW() - INTERVAL '5 hours', 'Angela Lim', 'AL',
   'Red sedan illegally parked blocking access to fire hydrant. Poses safety hazard.',
   false, 'https://images.unsplash.com/photo-1517649763962-0642a0c722d8?w=400',
   'Vehicle towed to precinct impound. Owner notified.', NOW() - INTERVAL '5 hours'),

  ('RPT-008', NULL, 'Stray Dogs - Pack Behavior', 'Animal Welfare', 'pending', 'medium',
   'Barangay San Pedro, Residential Street', 15.0660, 120.1980,
   NOW() - INTERVAL '2 hours 30 minutes', 'Ricardo Gutierrez', 'RG',
   'Pack of 5 stray dogs appearing aggressive. Chased residents. One child nipped on leg.',
   false, NULL,
   'Contact Animal Control. Monitor situation. Residents advised to stay indoors.', NOW() - INTERVAL '2 hours 30 minutes'),

  -- LOW PRIORITY / RESOLVED CASES
  ('RPT-009', NULL, 'Graffiti on Public Property', 'Infrastructure', 'resolved', 'low',
   'Basketball Court, Barangay San Isidro', 15.0645, 120.1885,
   NOW() - INTERVAL '6 hours', 'Daniel Santos', 'DS',
   'Gang-related graffiti spray painted on court walls. Tagline: "SJS Crew".',
   false, 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400',
   'Maintenance crew scheduled for cleanup. Gang reported to precinct.', NOW() - INTERVAL '6 hours'),

  ('RPT-010', NULL, 'Pothole on Main Road', 'Infrastructure', 'resolved', 'low',
   'Session Road', 15.0710, 120.1940,
   NOW() - INTERVAL '7 hours', 'Maria Santos', 'MS',
   'Large pothole on main road near school. Water pooling. Hazard for motorcycles.',
   false, NULL,
   'Road & Bridges notified. Repair scheduled for next week. Temporary warning signs placed.', NOW() - INTERVAL '7 hours'),

  ('RPT-011', NULL, 'Unauthorized Construction Materials', 'Environmental', 'pending', 'low',
   'Barangay San Agustin, Near River Bank', 15.0680, 120.1920,
   NOW() - INTERVAL '8 hours', 'Fernando Cruz', 'FC',
   'Pile of construction debris left on public property. Sand, gravel, wood scattered around.',
   false, NULL,
   'Property owner needs to be identified. Fine for illegal dumping.', NOW() - INTERVAL '8 hours'),

  ('RPT-012', NULL, 'Street Vendor Operating Without Permit', 'Public Order', 'accepted', 'low',
   'Gov. Reyes Blvd (Morning Market)', 15.0640, 120.1975,
   NOW() - INTERVAL '9 hours', 'Lina Rodriguez', 'LR',
   'Food vendor selling balut without health permit or license. Operating in restricted area.',
   false, NULL,
   'Vendor cited. Given warning and 30 days to obtain proper permits. Allowed to operate pending compliance.', NOW() - INTERVAL '9 hours'),

  ('RPT-013', NULL, 'Stalled Vehicle - Traffic Hazard', 'Traffic', 'resolved', 'medium',
   'Session Road at Intersection', 15.0730, 120.1950,
   NOW() - INTERVAL '10 hours', 'Vincent Reyes', 'VR',
   'Vehicle broke down in middle of lane. Driver trying to push it out.',
   false, 'https://images.unsplash.com/photo-1486404124904-c48b14cfb13c?w=400',
   'Traffic control assisted. Vehicle towed by road service. Traffic normalized.', NOW() - INTERVAL '10 hours'),

  ('RPT-014', NULL, 'Damaged Traffic Light', 'Infrastructure', 'pending', 'high',
   'Session Road x Gov. Reyes Blvd', 15.0720, 120.1960,
   NOW() - INTERVAL '11 hours', 'Grace Santos', 'GS',
   'Traffic light not functioning. Vehicles running through intersection. Major safety hazard.',
   true, 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400',
   'Traffic control deployed. Traffic Signals office notified for urgent repair.', NOW() - INTERVAL '11 hours'),

  ('RPT-015', NULL, 'Unauthorized Demolition Activity', 'Infrastructure', 'accepted', 'medium',
   'Barangay San Pedro, Old Building', 15.0655, 120.1975,
   NOW() - INTERVAL '12 hours', 'Oscar Villanueva', 'OV',
   'Building being demolished without visible permit. Debris falling on street. No safety barriers.',
   false, NULL,
   'Barangay verified permit. Work can continue with enhanced safety measures. Inspected.', NOW() - INTERVAL '12 hours');

-- ─── Populate Comments on Reports ────────────────────────────────────────────────

INSERT INTO public.comments (
  id, report_id, author, avatar, text, created_at
) VALUES
  (101, 'RPT-001', 'Officer J. Santos', 'JS', 'Suspect spotted heading towards Martinez Street. Units converging on location.', NOW() - INTERVAL '1 hour 50 minutes'),
  (102, 'RPT-001', 'Dispatcher', 'DP', 'Backup units en route. ETA 3 minutes.', NOW() - INTERVAL '1 hour 45 minutes'),
  (103, 'RPT-001', 'Public Health Officer', 'PHO', 'Victim assessed. Minor injuries only. Transported to nearest clinic.', NOW() - INTERVAL '1 hour 30 minutes'),

  (104, 'RPT-003', 'Juan Gonzales', 'JG', 'I saw them yesterday too! They were asking about a gray house. Please increase patrols!', NOW() - INTERVAL '25 minutes'),
  (105, 'RPT-003', 'Maria Santos', 'MS', '+1 Increase patrols absolutely! I have kids at home.', NOW() - INTERVAL '20 minutes'),

  (106, 'RPT-005', 'Emergency Services', 'ES', 'Amber alert distributed to all agencies and news outlets. Hospital on standby.', NOW() - INTERVAL '40 minutes'),
  (107, 'RPT-005', 'Social Media Team', 'SM', 'Post shared 500+ times on community group. Many offers to help search.', NOW() - INTERVAL '35 minutes'),
  (108, 'RPT-005', 'Officer M. Reyes', 'MR', 'CCTV shows child exiting with unknown adult male. Investigating possible abduction.', NOW() - INTERVAL '30 minutes'),

  (109, 'RPT-006', 'Carlos Mercado', 'CM', 'It finally stopped at 1 AM! Couldn''t sleep the whole night!', NOW() - INTERVAL '2 hours 50 minutes'),

  (110, 'RPT-009', 'Barangay Official', 'BO', 'Work order submitted for cleanup. Should be done by tomorrow.', NOW() - INTERVAL '5 hours 45 minutes');

-- ─── Populate Leaderboard (Top Residents) ──────────────────────────────────────────
-- NOTE: Leaderboard auto-populates via trigger when residents register via the app
-- Seeding manually requires real auth.users IDs, so we skip it here
-- The triggers in migration 002_add_leaderboard_sync.sql will create entries automatically

-- SELECT 'Leaderboard will auto-populate when residents register' as note;

-- ─── Verify Inserts ────────────────────────────────────────────────────────────────

SELECT 'Reports' as table_name, COUNT(*) as count FROM public.reports
UNION ALL
SELECT 'Comments', COUNT(*) FROM public.comments;

COMMIT;
