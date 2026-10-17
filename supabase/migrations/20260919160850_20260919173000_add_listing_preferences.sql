/*
# Store listing utility and house-rule selections

1. Modified table
- `public.listings` receives seven nullable preference columns so each listing preserves the choices made during posting.
- `mess_option` stores the selected food/mess arrangement.
- `electricity_option` stores the selected electricity arrangement.
- `wifi_included` stores whether Wi-Fi is included or shared.
- `water_included` stores whether water is included or shared.
- `food_habit` stores the allowed food habit.
- `guest_policy` stores the visitor policy.
- `work_preference` stores the selected work preference.

2. Compatibility
- Existing rows are preserved.
- New boolean columns default to `true`, matching the existing included-free behavior.
- New text columns remain nullable so existing listings continue to load safely.

3. Security
- No RLS settings or policies are changed.
- Existing public listing read and insert access remains unchanged.

4. Important notes
- The additional fields make the selected options visible after reload instead of reconstructing generic labels from defaults.
- Water remains a separate tracked amount in the application while the existing `bills` total remains backward compatible.
*/

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS mess_option text,
  ADD COLUMN IF NOT EXISTS electricity_option text,
  ADD COLUMN IF NOT EXISTS wifi_included boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS water_included boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS food_habit text,
  ADD COLUMN IF NOT EXISTS guest_policy text,
  ADD COLUMN IF NOT EXISTS work_preference text;

NOTIFY pgrst, 'reload schema';