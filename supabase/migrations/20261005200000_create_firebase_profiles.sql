CREATE TABLE IF NOT EXISTS public.firebase_profiles (
  firebase_uid text PRIMARY KEY,
  phone text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('host', 'seeker')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firebase_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.firebase_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.firebase_profiles TO service_role;
