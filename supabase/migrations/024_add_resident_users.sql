-- Migration: Update resident users in user_profiles table
-- Purpose: Bulk update existing resident users to 'Brgy. San Pablo'
-- Note: Targeted by email

BEGIN;

-- Update barangay for existing resident users
UPDATE user_profiles
SET 
  barangay = 'Brgy. San Pablo'
WHERE email IN (
  'jubelle.tugadi@resident.local',
  'aerus.soriaga@resident.local',
  'vincent.ragadio@resident.local',
  'aschille.deleon@resident.local',
  'johnpaul.ramos@resident.local',
  'marc.dasalla@resident.local',
  'julius.dallo@resident.local',
  'ac.manalo@resident.local',
  'lady.canapate@resident.local',
  'rochelle.domingo@resident.local',
  'stephanie.domingo@resident.local',
  'nicole.domingo@resident.local',
  'rovie.julhusin@resident.local',
  'joni.julhusin@resident.local',
  'melchor.domingo@resident.local',
  'amelita.domingo@resident.local',
  'angelo.amplogio@resident.local',
  'johnlloyd.aranca@resident.local',
  'albert.araniego@resident.local',
  'cleo.pascual@resident.local',
  'gary.delacruz@resident.local',
  'andrei.acluba@resident.local',
  'irish.doctolero@resident.local',
  'luisa.tiburcio@resident.local'
);

COMMIT;
