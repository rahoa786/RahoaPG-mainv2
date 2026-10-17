/*
# Add society maintenance columns to listings

1. Modified table
- `public.listings` receives two new columns:
  - `maintenance_included` (boolean, default true) — whether society/building maintenance is bundled into the rent
  - `maintenance_fee` (integer, default 0) — the monthly maintenance amount when charged separately
- Both default safely so existing rows are unaffected (treated as "included, 0 extra").

2. Compatibility
- Existing rows and all other columns are preserved.
- The existing `maintenance` integer column (used for ad-hoc maintenance estimates) remains unchanged.

3. Security
- No RLS settings or policies are changed.
*/

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS maintenance_included boolean NOT NULL DEFAULT true;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS maintenance_fee integer NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';