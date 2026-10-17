/*
# Reload the Supabase API schema cache for listings

1. Purpose
- Refresh PostgREST's schema cache so the live `listings` table exposes all current columns to browser inserts.

2. Existing table
- `public.listings` is not created, renamed, dropped, or altered by this migration.
- Existing data and all existing columns are preserved.

3. Security
- No RLS settings or policies are changed.
- Existing public read and insert access remains unchanged.

4. Important notes
- This specifically resolves stale schema-cache errors such as a valid `bills` column being reported as missing.
*/

NOTIFY pgrst, 'reload schema';