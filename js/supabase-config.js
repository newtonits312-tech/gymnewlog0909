/**
 * Free cloud sync - Supabase (not Vercel).
 * Vercel hosts the app files; Supabase stores your account + workout data.
 *
 * Setup (5 min, free):
 * 1. https://supabase.com -> New project (free tier)
 * 2. Project Settings -> API -> copy Project URL + anon public key
 * 3. In Vercel, add SUPABASE_URL and SUPABASE_ANON_KEY Environment Variables
 * 4. SQL Editor -> run the contents of supabase/schema.sql
 * 5. Authentication -> Providers -> Email -> turn OFF "Confirm email" (solo use)
 * 6. Redeploy / refresh the app
 *
 * Local-only option:
 * Fill the values below when testing outside Vercel. The anon key is public,
 * but do not put service-role keys here.
 */
window.SUPABASE_CONFIG = {
  url: 'https://uixmgaebkebiwtfjexgm.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeG1nYWVia2ViaXd0ZmpleGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTMyMDEsImV4cCI6MjA5NjMyOTIwMX0.xb5XeRBqoxyosrmLCscmz7mXEf4gdkzYMNjVfGta0pw'
};
