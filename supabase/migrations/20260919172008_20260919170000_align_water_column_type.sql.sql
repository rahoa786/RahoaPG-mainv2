-- Align water column type with other monetary columns (integer)
-- water was numeric; all other money columns (base_rent, mess, bills, electricity, wifi, maintenance, deposit) are integer.
-- This type mismatch can cause PostgREST insert failures when a JS number is sent.

ALTER TABLE public.listings
  ALTER COLUMN water TYPE integer USING water::integer;

NOTIFY pgrst, 'reload schema';