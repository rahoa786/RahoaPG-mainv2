ALTER TABLE public.firebase_profiles
  ADD COLUMN IF NOT EXISTS contact_credits integer NOT NULL DEFAULT 0
  CHECK (contact_credits >= 0);

CREATE TABLE IF NOT EXISTS public.unlocked_contacts (
  seeker_firebase_uid text NOT NULL
    REFERENCES public.firebase_profiles(firebase_uid) ON DELETE CASCADE,
  listing_id uuid NOT NULL
    REFERENCES public.listings(id) ON DELETE CASCADE,
  listing_title_snapshot text NOT NULL,
  neighborhood_snapshot text NOT NULL,
  rent_snapshot_inr integer NOT NULL CHECK (rent_snapshot_inr >= 0),
  image_snapshot text NOT NULL DEFAULT '',
  host_phone_snapshot text NOT NULL DEFAULT '',
  host_whatsapp_snapshot text NOT NULL DEFAULT '',
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seeker_firebase_uid, listing_id)
);

ALTER TABLE public.unlocked_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unlocked_contacts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unlocked_contacts TO service_role;

CREATE OR REPLACE FUNCTION public.consume_contact_credit_firebase(
  p_firebase_uid text,
  p_listing_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seeker_row public.firebase_profiles%ROWTYPE;
  listing_row public.listings%ROWTYPE;
BEGIN
  SELECT * INTO seeker_row
  FROM public.firebase_profiles
  WHERE firebase_uid = p_firebase_uid
    AND role = 'seeker'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Firebase seeker profile not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.unlocked_contacts
    WHERE seeker_firebase_uid = p_firebase_uid
      AND listing_id = p_listing_id
  ) THEN
    RETURN true;
  END IF;

  IF seeker_row.contact_credits <= 0 THEN
    RETURN false;
  END IF;

  SELECT * INTO listing_row
  FROM public.listings
  WHERE id = p_listing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  UPDATE public.firebase_profiles
  SET contact_credits = contact_credits - 1,
      updated_at = now()
  WHERE firebase_uid = p_firebase_uid;

  INSERT INTO public.unlocked_contacts (
    seeker_firebase_uid,
    listing_id,
    listing_title_snapshot,
    neighborhood_snapshot,
    rent_snapshot_inr,
    image_snapshot,
    host_phone_snapshot,
    host_whatsapp_snapshot
  ) VALUES (
    p_firebase_uid,
    p_listing_id,
    listing_row.title,
    listing_row.neighborhood,
    listing_row.base_rent,
    coalesce(listing_row.image, ''),
    coalesce(listing_row.host_phone, ''),
    coalesce(listing_row.host_whatsapp, '')
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_contact_credit_firebase(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_contact_credit_firebase(text, uuid) TO service_role;
