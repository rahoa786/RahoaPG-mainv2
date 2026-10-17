/*
  Account and portal data schema.

  Profiles and portal records are linked to Supabase Auth users. Passwords
  remain exclusively in Supabase Auth and are never stored in application rows.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('host', 'seeker')),
  full_name text,
  email text,
  phone text,
  terms_accepted_at timestamptz,
  terms_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role text;
BEGIN
  selected_role := CASE
    WHEN new.raw_user_meta_data ->> 'role' IN ('host', 'seeker')
      THEN new.raw_user_meta_data ->> 'role'
    ELSE 'seeker'
  END;

  INSERT INTO public.profiles (user_id, role, full_name, email, phone)
  VALUES (
    new.id,
    selected_role,
    NULLIF(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email,
    NULLIF(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF selected_role = 'host' THEN
    INSERT INTO public.host_profiles (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.seeker_preferences (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.host_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  display_name text,
  host_type text CHECK (host_type IN ('pg', 'tenant')),
  property_relationship text,
  business_name text,
  public_phone text,
  public_whatsapp text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seeker_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  food_preference text,
  sleep_schedule text,
  curfew_preference text,
  social_preference text,
  gender_preference text,
  budget_inr integer CHECK (budget_inr IS NULL OR budget_inr >= 0),
  preferred_localities text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS gallery_images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'active'
    CHECK (availability_status IN ('active', 'full')),
  ADD COLUMN IF NOT EXISTS total_beds integer NOT NULL DEFAULT 1 CHECK (total_beds >= 0),
  ADD COLUMN IF NOT EXISTS filled_beds integer NOT NULL DEFAULT 0 CHECK (filled_beds >= 0),
  ADD COLUMN IF NOT EXISTS legal_declaration_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_declaration_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_declaration_version text;

UPDATE public.listings
SET gallery_images = ARRAY[image]
WHERE image IS NOT NULL
  AND image <> ''
  AND cardinality(gallery_images) = 0;

CREATE INDEX IF NOT EXISTS listings_owner_id_idx ON public.listings(owner_id);

CREATE TABLE IF NOT EXISTS public.saved_listings (
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS public.access_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  plan_code text NOT NULL CHECK (plan_code IN ('single', 'day', 'week')),
  total_credits integer NOT NULL CHECK (total_credits > 0),
  remaining_credits integer NOT NULL CHECK (remaining_credits >= 0),
  valid_from timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (remaining_credits <= total_credits),
  CHECK (expires_at > valid_from)
);

CREATE INDEX IF NOT EXISTS access_passes_user_expiry_idx
  ON public.access_passes(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  access_pass_id uuid REFERENCES public.access_passes(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'razorpay',
  provider_order_id text UNIQUE,
  provider_payment_id text UNIQUE,
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  plan_code text CHECK (plan_code IS NULL OR plan_code IN ('single', 'day', 'week')),
  credits_purchased integer NOT NULL DEFAULT 0 CHECK (credits_purchased >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_transactions_user_created_idx
  ON public.payment_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.contact_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  access_pass_id uuid REFERENCES public.access_passes(id) ON DELETE SET NULL,
  match_score integer CHECK (match_score IS NULL OR match_score BETWEEN 0 AND 100),
  listing_title_snapshot text NOT NULL,
  neighborhood_snapshot text NOT NULL,
  rent_snapshot_inr integer NOT NULL CHECK (rent_snapshot_inr >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seeker_id, listing_id)
);

CREATE INDEX IF NOT EXISTS contact_unlocks_listing_created_idx
  ON public.contact_unlocks(listing_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.listing_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reviewer_display_name text NOT NULL DEFAULT 'Rahoa tenant',
  food_quality smallint NOT NULL CHECK (food_quality BETWEEN 1 AND 5),
  cleanliness smallint NOT NULL CHECK (cleanliness BETWEEN 1 AND 5),
  curfew_flexibility smallint NOT NULL CHECK (curfew_flexibility BETWEEN 1 AND 5),
  wifi_speed smallint NOT NULL CHECK (wifi_speed BETWEEN 1 AND 5),
  feedback text NOT NULL CHECK (length(trim(feedback)) BETWEEN 10 AND 1000),
  lifestyle_tag text,
  stay_duration_months integer CHECK (stay_duration_months IS NULL OR stay_duration_months >= 0),
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'published', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, reviewer_id)
);
ALTER TABLE public.listing_reviews
  ADD COLUMN IF NOT EXISTS reviewer_display_name text NOT NULL DEFAULT 'Rahoa tenant';

CREATE TABLE IF NOT EXISTS public.listing_legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  declaration_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, owner_id, declaration_version)
);

CREATE TABLE IF NOT EXISTS public.listing_occupancy (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  total_beds integer NOT NULL DEFAULT 1 CHECK (total_beds >= 0),
  filled_through_rahoa integer NOT NULL DEFAULT 0 CHECK (filled_through_rahoa >= 0),
  availability_status text NOT NULL DEFAULT 'active'
    CHECK (availability_status IN ('active', 'full')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (filled_through_rahoa <= total_beds)
);

CREATE TABLE IF NOT EXISTS public.host_financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  bed_label text,
  rent_period date NOT NULL,
  rent_due_inr integer NOT NULL DEFAULT 0 CHECK (rent_due_inr >= 0),
  rent_collected_inr integer NOT NULL DEFAULT 0 CHECK (rent_collected_inr >= 0),
  token_due_inr integer NOT NULL DEFAULT 0 CHECK (token_due_inr >= 0),
  token_collected_inr integer NOT NULL DEFAULT 0 CHECK (token_collected_inr >= 0),
  deposit_due_inr integer NOT NULL DEFAULT 0 CHECK (deposit_due_inr >= 0),
  deposit_collected_inr integer NOT NULL DEFAULT 0 CHECK (deposit_collected_inr >= 0),
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS host_financial_ledger_owner_period_idx
  ON public.host_financial_ledger(owner_id, rent_period DESC);

CREATE OR REPLACE FUNCTION public.set_my_portal_role(new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF new_role NOT IN ('host', 'seeker') THEN
    RAISE EXCEPTION 'Invalid portal role';
  END IF;

  UPDATE public.profiles SET role = new_role, updated_at = now()
  WHERE user_id = (SELECT auth.uid());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF new_role = 'host' THEN
    INSERT INTO public.host_profiles (user_id) VALUES ((SELECT auth.uid()))
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.seeker_preferences (user_id) VALUES ((SELECT auth.uid()))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_my_listing_occupancy(
  target_listing_id uuid,
  next_total_beds integer,
  next_filled_beds integer,
  next_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF next_total_beds < 0 OR next_filled_beds < 0 OR next_filled_beds > next_total_beds
     OR next_status NOT IN ('active', 'full') THEN
    RAISE EXCEPTION 'Invalid occupancy details';
  END IF;

  UPDATE public.listings
  SET total_beds = next_total_beds,
      filled_beds = next_filled_beds,
      availability_status = next_status
  WHERE id = target_listing_id AND owner_id = (SELECT auth.uid());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Owned listing not found';
  END IF;

  INSERT INTO public.listing_occupancy (
    listing_id, owner_id, total_beds, filled_through_rahoa, availability_status, updated_at
  ) VALUES (
    target_listing_id, (SELECT auth.uid()), next_total_beds, next_filled_beds, next_status, now()
  )
  ON CONFLICT (listing_id) DO UPDATE SET
    total_beds = EXCLUDED.total_beds,
    filled_through_rahoa = EXCLUDED.filled_through_rahoa,
    availability_status = EXCLUDED.availability_status,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_contact_credit(
  target_listing_id uuid,
  seeker_match_score integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seeker_id uuid := (SELECT auth.uid());
  pass_row public.access_passes%ROWTYPE;
  listing_row public.listings%ROWTYPE;
BEGIN
  IF v_seeker_id IS NULL OR seeker_match_score < 0 OR seeker_match_score > 100 THEN
    RAISE EXCEPTION 'Authenticated seeker and valid match score are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_seeker_id AND role = 'seeker') THEN
    RAISE EXCEPTION 'A seeker account is required';
  END IF;
  SELECT * INTO listing_row FROM public.listings WHERE id = target_listing_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF listing_row.owner_id = v_seeker_id THEN RAISE EXCEPTION 'Cannot unlock your own listing'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.contact_unlocks
    WHERE contact_unlocks.seeker_id = v_seeker_id
      AND contact_unlocks.listing_id = target_listing_id
  ) THEN
    RETURN false;
  END IF;

  SELECT * INTO pass_row FROM public.access_passes
  WHERE user_id = v_seeker_id
    AND payment_status = 'paid'
    AND expires_at > now()
    AND remaining_credits > 0
  ORDER BY expires_at DESC
  FOR UPDATE
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active contact credits'; END IF;

  UPDATE public.access_passes
  SET remaining_credits = remaining_credits - 1
  WHERE id = pass_row.id;

  INSERT INTO public.contact_unlocks (
    seeker_id, listing_id, access_pass_id, match_score,
    listing_title_snapshot, neighborhood_snapshot, rent_snapshot_inr
  ) VALUES (
    v_seeker_id, target_listing_id, pass_row.id, seeker_match_score,
    listing_row.title, listing_row.neighborhood, listing_row.base_rent
  );
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_host_leads()
RETURNS TABLE (
  listing_id uuid,
  seeker_contact text,
  inquiry_at timestamptz,
  match_score integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unlocks.listing_id,
         coalesce(nullif(profile.phone, ''), profile.email, 'Contact unavailable'),
         unlocks.created_at,
         unlocks.match_score
  FROM public.contact_unlocks AS unlocks
  JOIN public.listings AS property ON property.id = unlocks.listing_id
  JOIN public.profiles AS profile ON profile.user_id = unlocks.seeker_id
  WHERE property.owner_id = (SELECT auth.uid())
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY unlocks.created_at DESC;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seeker_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS host_profiles_own ON public.host_profiles;
CREATE POLICY host_profiles_own ON public.host_profiles
  FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS seeker_preferences_own ON public.seeker_preferences;
CREATE POLICY seeker_preferences_own ON public.seeker_preferences
  FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_listings_own ON public.saved_listings;
CREATE POLICY saved_listings_own ON public.saved_listings
  FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS access_passes_read_own ON public.access_passes;
CREATE POLICY access_passes_read_own ON public.access_passes
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS payment_transactions_read_own ON public.payment_transactions;
CREATE POLICY payment_transactions_read_own ON public.payment_transactions
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS contact_unlocks_read_seeker_or_listing_owner ON public.contact_unlocks;
CREATE POLICY contact_unlocks_read_seeker_or_listing_owner ON public.contact_unlocks
  FOR SELECT TO authenticated USING (
    seeker_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = contact_unlocks.listing_id
        AND listings.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS listing_reviews_read_published ON public.listing_reviews;
CREATE POLICY listing_reviews_read_published ON public.listing_reviews
  FOR SELECT TO anon, authenticated USING (moderation_status = 'published' OR reviewer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS listing_reviews_insert_unlocked ON public.listing_reviews;
CREATE POLICY listing_reviews_insert_unlocked ON public.listing_reviews
  FOR INSERT TO authenticated WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND moderation_status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.contact_unlocks
      WHERE contact_unlocks.seeker_id = (SELECT auth.uid())
        AND contact_unlocks.listing_id = listing_reviews.listing_id
    )
  );
DROP POLICY IF EXISTS listing_legal_acceptances_owner_read ON public.listing_legal_acceptances;
CREATE POLICY listing_legal_acceptances_owner_read ON public.listing_legal_acceptances
  FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS listing_legal_acceptances_owner_insert ON public.listing_legal_acceptances;
CREATE POLICY listing_legal_acceptances_owner_insert ON public.listing_legal_acceptances
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_legal_acceptances.listing_id
        AND listings.owner_id = (SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS listing_occupancy_owner_manage ON public.listing_occupancy;
CREATE POLICY listing_occupancy_owner_manage ON public.listing_occupancy
  FOR ALL TO authenticated USING (
    owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.listings WHERE listings.id = listing_occupancy.listing_id AND listings.owner_id = (SELECT auth.uid()))
  ) WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.listings WHERE listings.id = listing_occupancy.listing_id AND listings.owner_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS host_financial_ledger_owner_manage ON public.host_financial_ledger;
CREATE POLICY host_financial_ledger_owner_manage ON public.host_financial_ledger
  FOR ALL TO authenticated USING (
    owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.listings WHERE listings.id = host_financial_ledger.listing_id AND listings.owner_id = (SELECT auth.uid()))
  ) WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.listings WHERE listings.id = host_financial_ledger.listing_id AND listings.owner_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS anon_select_listings ON public.listings;
CREATE POLICY anon_select_listings ON public.listings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS anon_insert_listings ON public.listings;
CREATE POLICY authenticated_insert_owned_listings ON public.listings
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND legal_declaration_accepted = true
    AND legal_declaration_accepted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = (SELECT auth.uid()) AND profiles.role = 'host'
    )
  );
DROP POLICY IF EXISTS authenticated_update_owned_listings ON public.listings;
CREATE POLICY authenticated_update_owned_listings ON public.listings
  FOR UPDATE TO authenticated USING (
    owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = (SELECT auth.uid()) AND profiles.role = 'host')
  ) WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = (SELECT auth.uid()) AND profiles.role = 'host')
  );
DROP POLICY IF EXISTS authenticated_delete_owned_listings ON public.listings;
CREATE POLICY authenticated_delete_owned_listings ON public.listings
  FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));

GRANT SELECT ON public.listings TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.listings FROM anon;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
GRANT SELECT, DELETE ON public.host_profiles TO authenticated;
GRANT INSERT (user_id, display_name, host_type, property_relationship, business_name, public_phone, public_whatsapp)
  ON public.host_profiles TO authenticated;
GRANT UPDATE (display_name, host_type, property_relationship, business_name, public_phone, public_whatsapp)
  ON public.host_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seeker_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_listings TO authenticated;
GRANT SELECT ON public.access_passes TO authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT ON public.contact_unlocks TO authenticated;
GRANT SELECT, INSERT ON public.listing_reviews TO authenticated;
GRANT SELECT ON public.listing_reviews TO anon;
GRANT SELECT ON public.listing_legal_acceptances TO authenticated;
GRANT INSERT ON public.listing_legal_acceptances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_occupancy TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.host_financial_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_portal_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_listing_occupancy(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_contact_credit(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_host_leads() TO authenticated;
REVOKE ALL ON FUNCTION public.set_my_portal_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_my_listing_occupancy(uuid, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_contact_credit(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_host_leads() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
