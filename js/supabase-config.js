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
  url: '',
  anonKey: ''
};
