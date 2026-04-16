-- Seed Patrol Units and Incidents for Testing

-- ─── Patrol Units ──────────────────────────────────────────────────────────

INSERT INTO public.patrol_units (
  id, name, avatar, unit, badge_number, rank, status, current_case, current_case_title,
  location_lat, location_lng, last_updated, phone, cases_today, avg_response, shift_start, shift_end
) VALUES
  ('unit-001', 'John Santos', 'JS', 'Unit 1-A', 'PU-001', 'Officer', 'busy', 'INC-001', 'Robbery in Progress', 15.0648, 120.1982, NOW(), '09123456789', 3, '8.5 min', '06:00', '14:00'),
  ('unit-002', 'Maria Reyes', 'MR', 'Unit 2-B', 'PU-002', 'Officer', 'en_route', 'INC-002', 'Traffic Incident', 15.0725, 120.1945, NOW(), '09198765432', 2, '9.2 min', '06:00', '14:00'),
  ('unit-003', 'Carlos Torres', 'CT', 'Unit 1-C', 'PU-003', 'Officer', 'available', NULL, NULL, 15.0580, 120.2015, NOW(), '09156781234', 1, '7.8 min', '14:00', '22:00'),
  ('unit-004', 'Angela Lim', 'AL', 'Unit 3-D', 'PU-004', 'Sergeant', 'busy', 'INC-003', 'Disturbance Check', 15.0650, 120.1890, NOW(), '09145678901', 4, '8.1 min', '14:00', '22:00'),
  ('unit-005', 'Ricardo Gutierrez', 'RG', 'Unit 2-E', 'PU-005', 'Officer', 'offline', NULL, NULL, 15.0700, 120.1950, NOW(), '09167890123', 0, '10.2 min', '22:00', '06:00');

-- ─── Patrol Incidents ──────────────────────────────────────────────────────

INSERT INTO public.patrol_incidents (
  id, title, category, priority, location_lat, location_lng, address,
  status, assigned_patrol, time_reported, reporter, reporter_avatar,
  reporter_contact, reporter_notes, assigned_at
) VALUES
  ('INC-001', 'Robbery in Progress', 'Crime', 'critical', 15.0648, 120.1982, '123 Main St, Barangay San Pedro', 'in_progress', 'unit-001', NOW() - INTERVAL '15 minutes', 'Juan Dela Cruz', 'JDC', '09123456789', 'Subject fled towards Martinez St', NOW() - INTERVAL '10 minutes'),
  ('INC-002', 'Traffic Incident - Fender Bender', 'Traffic', 'high', 15.0725, 120.1945, 'Gov. Reyes Blvd x Session Rd', 'assigned', 'unit-002', NOW() - INTERVAL '8 minutes', 'Maria Gonzales', 'MG', '09198765432', 'Minor collision, both parties present', NOW() - INTERVAL '5 minutes'),
  ('INC-003', 'Noise Disturbance - Party', 'Public Disturbance', 'medium', 15.0650, 120.1890, '456 Sunset Ave, Barangay San Isidro', 'in_progress', 'unit-004', NOW() - INTERVAL '20 minutes', 'Rosa Villanueva', 'RV', '09111111111', 'Loud music and shouting, neighbors complained', NOW() - INTERVAL '15 minutes'),
  ('INC-004', 'Lost Child Report', 'Public Safety', 'high', 15.0580, 120.2015, 'Paseo de Santa Rosa, Barangay Santa Rosa', 'pending', NULL, NOW() - INTERVAL '3 minutes', 'Pedro Sanchez', 'PS', '09122222222', '5-year-old boy missing since 2 PM', NULL),
  ('INC-005', 'Suspicious Person', 'Suspicious Activity', 'medium', 15.0700, 120.1950, '789 Oak Park, Barangay San Agustin', 'pending', NULL, NOW() - INTERVAL '2 minutes', 'Anna Reyes', 'AR', '09133333333', 'Person loitering near residential area for 30 mins', NULL);

-- ─── Patrol Messages ───────────────────────────────────────────────────────

INSERT INTO public.patrol_messages (
  id, "from", "to", message, time, read
) VALUES
  (1, 'unit-001', 'admin', 'Suspect apprehended, bringing to station', NOW() - INTERVAL '2 minutes', true),
  (2, 'admin', 'unit-002', 'Proceed to incident location with caution', NOW() - INTERVAL '5 minutes', true),
  (3, 'unit-004', 'admin', 'Situation under control, no further assistance needed', NOW() - INTERVAL '1 minute', false),
  (4, 'admin', 'broadcast', 'All units maintain safe distance from Martinez St due to ongoing operation', NOW() - INTERVAL '7 minutes', true),
  (5, 'unit-003', 'admin', 'Unit 1-C available for dispatch', NOW() - INTERVAL '10 seconds', false);

-- Verify inserts
SELECT 'Patrol Units' as table_name, COUNT(*) as count FROM patrol_units
UNION ALL
SELECT 'Patrol Incidents', COUNT(*) FROM patrol_incidents
UNION ALL
SELECT 'Patrol Messages', COUNT(*) FROM patrol_messages;
