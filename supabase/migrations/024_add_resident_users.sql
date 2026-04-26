-- Migration: Add resident users to user_profiles table
-- Purpose: Bulk insert verified resident users
-- Note: These are direct inserts (already verified), not pending verification

BEGIN;

-- Store new user IDs in a temporary table for leaderboard creation
WITH new_users AS (
  INSERT INTO user_profiles (
    id,
    first_name,
    last_name,
    email,
    phone,
    role,
    barangay,
    avatar,
    verified,
    email_verified,
    points,
    reports,
    badge,
    bio,
    verification_status,
    joined
  ) VALUES
    (gen_random_uuid(), 'Jubelle', 'Mae Tugadi', 'jubelle.tugadi@resident.local', NULL, 'resident', 'San Pablo', 'JMT', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Aerus', 'Soriaga', 'aerus.soriaga@resident.local', NULL, 'resident', 'San Pablo', 'AS', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Vincent', 'Ragadio', 'vincent.ragadio@resident.local', NULL, 'resident', 'San Pablo', 'VR', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Aschille', 'De Leon', 'aschille.deleon@resident.local', NULL, 'resident', 'San Pablo', 'ADL', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'John', 'Paul Ramos', 'johnpaul.ramos@resident.local', NULL, 'resident', 'San Pablo', 'JPR', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Marc', 'Jian Dasalla', 'marc.dasalla@resident.local', NULL, 'resident', 'San Pablo', 'MJD', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Julius', 'Dallo', 'julius.dallo@resident.local', NULL, 'resident', 'San Pablo', 'JD', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Ac', 'Manalo', 'ac.manalo@resident.local', NULL, 'resident', 'San Pablo', 'AM', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Lady', 'Johan Canapate', 'lady.canapate@resident.local', NULL, 'resident', 'San Pablo', 'LJC', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Rochelle', 'Domingo', 'rochelle.domingo@resident.local', NULL, 'resident', 'San Pablo', 'RD', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Stephanie', 'Domingo', 'stephanie.domingo@resident.local', NULL, 'resident', 'San Pablo', 'SD', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Nicole', 'Domingo', 'nicole.domingo@resident.local', NULL, 'resident', 'San Pablo', 'ND', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Rovie', 'Julhusin', 'rovie.julhusin@resident.local', NULL, 'resident', 'San Pablo', 'RJ', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Joni', 'Julhusin', 'joni.julhusin@resident.local', NULL, 'resident', 'San Pablo', 'JJ', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Melchor', 'Domingo', 'melchor.domingo@resident.local', NULL, 'resident', 'San Pablo', 'MD', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Amelita', 'Domingo', 'amelita.domingo@resident.local', NULL, 'resident', 'San Pablo', 'AD', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Angelo', 'Amplogio', 'angelo.amplogio@resident.local', NULL, 'resident', 'San Pablo', 'AA', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'John', 'Lloyd Aranca', 'johnlloyd.aranca@resident.local', NULL, 'resident', 'San Pablo', 'JLA', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Albert', 'Araniego', 'albert.araniego@resident.local', NULL, 'resident', 'San Pablo', 'AA', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Cleo', 'Pascual', 'cleo.pascual@resident.local', NULL, 'resident', 'San Pablo', 'CP', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Gary', 'Dela Cruz', 'gary.delacruz@resident.local', NULL, 'resident', 'San Pablo', 'GDC', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Andrei', 'Acluba', 'andrei.acluba@resident.local', NULL, 'resident', 'San Pablo', 'AA', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Irish', 'Doctolero', 'irish.doctolero@resident.local', NULL, 'resident', 'San Pablo', 'ID', true, true, 0, 0, 'Member', '', 'verified', now()),
    (gen_random_uuid(), 'Luisa', 'Tiburcio', 'luisa.tiburcio@resident.local', NULL, 'resident', 'San Pablo', 'LT', true, true, 0, 0, 'Member', '', 'verified', now())
  RETURNING id
)
-- Create leaderboard entries for new users if leaderboard table exists
INSERT INTO leaderboard (user_id, points, reports_count, badge, verified, created_at, updated_at)
SELECT id, 0, 0, 'Member', true, now(), now()
FROM new_users
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
