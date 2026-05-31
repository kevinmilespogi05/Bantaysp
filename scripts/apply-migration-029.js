// Apply migration 029 via Supabase Management API
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://cepefukwfszkgosnjmbc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcGVmdWt3ZnN6a2dvc25qbWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTUwMTA3MSwiZXhwIjoyMDkxMDc3MDcxfQ.7tQ5vsffk5NoZik9YG-V-jlPGYaxCGb7JsuJ1aSHKxk';

// We'll use the pg REST SQL endpoint
const sql = `
CREATE TABLE IF NOT EXISTS public.rejected_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  rejection_reason TEXT NOT NULL,
  rejected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  re_registered_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rejected_registrations_email ON public.rejected_registrations(email);
CREATE INDEX IF NOT EXISTS idx_rejected_registrations_rejected_at ON public.rejected_registrations(rejected_at);
ALTER TABLE public.rejected_registrations ENABLE ROW LEVEL SECURITY;
`;

const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  },
  body: JSON.stringify({ sql }),
});

if (!response.ok) {
  const text = await response.text();
  console.log('RPC exec_sql not available:', response.status, text);
  console.log('\n✅ ACTION REQUIRED: Please run this SQL manually in the Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/cepefukwfszkgosnjmbc/sql/new');
  console.log('\n' + sql);
} else {
  const data = await response.json();
  console.log('✅ Migration applied!', data);
}
