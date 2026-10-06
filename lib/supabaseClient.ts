import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jqwfpqcejncbauhihppz.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxd2ZwcWNlam5jYmF1aGlocHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNjM5OTIsImV4cCI6MjEwNjgzOTk5Mn0.gSXI5joVsX_HamJEe7mUdkIHqwDLK5GILQNpn3hp5Rk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
