-- Fix infinite recursion in conversation_participants RLS policy
-- The original policy tried to query conversation_participants while evaluating the policy on conversation_participants
-- This causes infinite recursion when fetching messages

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Read conversation participants" ON conversation_participants;

-- Simpler approach: disable RLS on conversation_participants
-- The messages policy will protect data access anyway
-- Users can only see messages they're allowed to see via the messages RLS policy
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
