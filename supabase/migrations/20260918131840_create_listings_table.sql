/*
# Create listings table for persistent property listings

1. New Tables
- `listings`
  - `id` (uuid, primary key, auto-generated)
  - `title` (text, not null) — listing title e.g. "2-Sharing PG Room in Navrangpura"
  - `neighborhood` (text, not null) — locality/area
  - `image` (text) — photo URL
  - `host_type` (text, not null) — 'pg' or 'tenant'
  - `host_label` (text, not null) — display label e.g. "PG Host" or "Listed by Flatmate"
  - `base_rent` (integer, not null) — monthly base rent in INR
  - `mess` (integer, default 0) — monthly mess/food cost
  - `bills` (integer, default 0) — total monthly bills
  - `electricity` (integer, default 0) — monthly electricity cost
  - `wifi` (integer, default 0) — monthly wifi cost
  - `maintenance` (integer, default 0) — monthly maintenance cost
  - `deposit` (integer, default 0) — security deposit
  - `match_score` (integer, default 75) — default match score
  - `tags` (text[], default '{}') — lifestyle tags
  - `gender` (text, default 'any') — 'male', 'female', or 'any'
  - `food_policy` (text, default 'any') — 'strict-veg' or 'any'
  - `video_verified` (boolean, default false) — whether video walkthrough is verified
  - `video_url` (text) — Cloudinary secure_url for the video walkthrough
  - `sharing_type` (text, default 'Single Private') — room sharing type
  - `curfew` (text) — curfew timing or null
  - `zero_deposit` (boolean, default false) — zero deposit flag
  - `promo` (text) — promotional badge text e.g. "Just Added"
  - `match_points` (jsonb, default '[]') — array of {label, type} objects
  - `flatmate_profile` (jsonb) — flatmate profile object or null
  - `host_phone` (text, default '') — contact phone
  - `host_whatsapp` (text, default '') — WhatsApp number
  - `created_at` (timestamptz, default now()) — creation timestamp

2. Security
- Enable RLS on `listings`.
- This is a no-auth (no sign-in) app, so all CRUD policies use `TO anon, authenticated`.
- Anyone can read listings (public discovery feed).
- Anyone can create listings (hosts post without signing in).
- No update or delete policies needed for now.

3. Important Notes
- The table is single-tenant: no user_id column, no auth.users foreign key.
- Policies allow anon + authenticated to SELECT and INSERT.
- UPDATE and DELETE are intentionally not granted to anon.
*/

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  neighborhood text NOT NULL,
  image text,
  host_type text NOT NULL,
  host_label text NOT NULL,
  base_rent integer NOT NULL,
  mess integer NOT NULL DEFAULT 0,
  bills integer NOT NULL DEFAULT 0,
  electricity integer NOT NULL DEFAULT 0,
  wifi integer NOT NULL DEFAULT 0,
  maintenance integer NOT NULL DEFAULT 0,
  deposit integer NOT NULL DEFAULT 0,
  match_score integer NOT NULL DEFAULT 75,
  tags text[] NOT NULL DEFAULT '{}',
  gender text NOT NULL DEFAULT 'any',
  food_policy text NOT NULL DEFAULT 'any',
  video_verified boolean NOT NULL DEFAULT false,
  video_url text,
  sharing_type text NOT NULL DEFAULT 'Single Private',
  curfew text,
  zero_deposit boolean NOT NULL DEFAULT false,
  promo text,
  match_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  flatmate_profile jsonb,
  host_phone text NOT NULL DEFAULT '',
  host_whatsapp text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_listings" ON listings;
CREATE POLICY "anon_select_listings" ON listings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_listings" ON listings;
CREATE POLICY "anon_insert_listings" ON listings FOR INSERT
  TO anon, authenticated WITH CHECK (true);
