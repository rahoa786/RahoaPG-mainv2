CREATE OR REPLACE FUNCTION public.grant_firebase_test_contact_credits(
  p_firebase_uid text,
  p_credits integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_credits integer;
BEGIN
  IF p_credits NOT IN (1, 6, 15) THEN
    RAISE EXCEPTION 'Invalid test credit amount';
  END IF;

  UPDATE public.firebase_profiles
  SET contact_credits = contact_credits + p_credits,
      updated_at = now()
  WHERE firebase_uid = p_firebase_uid
    AND role = 'seeker'
  RETURNING contact_credits INTO updated_credits;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Firebase seeker profile not found';
  END IF;

  RETURN updated_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_firebase_test_contact_credits(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_firebase_test_contact_credits(text, integer) TO service_role;
