/*
# Add water column to listings

1. Modified table
- `public.listings` receives a `water` numeric column to track water charges separately.
- Defaults to 0 so existing rows are unaffected.

2. Compatibility
- Existing rows and all other columns are preserved.

3. Security
- No RLS settings or policies are changed.

4. Important notes
- Water was previously bundled into `bills` but not shown in the detail breakdown.
- Now it is tracked and displayed separately so tenants see the full cost.
*/

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS water numeric NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';