-- Conversations table (chat threads/rooms)
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Conversation participants (who has access to conversations)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id BIGINT NOT NULL PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'patrol')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Messages (actual chat messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGINT NOT NULL PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMP,
  is_edited BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);

-- Enable RLS (security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read conversations they're in
CREATE POLICY "Read conversations" ON conversations
  FOR SELECT
  USING (id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()::text
  ));

-- RLS Policy: Users can read participants of conversations they're in
CREATE POLICY "Read conversation participants" ON conversation_participants
  FOR SELECT
  USING (conversation_id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()::text
  ));

-- RLS Policy: Users can only read messages from conversations they're in
CREATE POLICY "Read messages in conversation" ON messages
  FOR SELECT
  USING (conversation_id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()::text
  ));

-- RLS Policy: Users can only insert messages to conversations they're in
CREATE POLICY "Send message to conversation" ON messages
  FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()::text
  ));

-- RLS Policy: Users can only update their own messages
CREATE POLICY "Update own messages" ON messages
  FOR UPDATE
  USING (sender_id = auth.uid()::text)
  WITH CHECK (sender_id = auth.uid()::text);
