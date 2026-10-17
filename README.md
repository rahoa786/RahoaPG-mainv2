# RahoaPG

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-yzsa92ro)

## Supabase data schema

The SQL migrations in `supabase/migrations` define the persisted listing and
account data schema. The account/portal migration
`20261003111500_create_account_and_portal_data.sql` adds:

- Auth-linked profiles and separate host and seeker profile records.
- Seeker lifestyle preferences.
- Listing ownership, image galleries, availability, bed counts, and legal declaration fields.
- Saved listings, pass balances, payment transaction records, and contact-unlock snapshots.
- Tenant reviews, host occupancy, host financial ledger, and listing declaration history.

Property photos and videos remain hosted in Cloudinary. Supabase listing rows
store only the Cloudinary image/video URLs (`image`, `gallery_images`, and
`video_url`); the migration does not copy media files into Supabase Storage.

Apply migrations using the Supabase CLI after linking the intended project, or
run the migration SQL in the Supabase SQL Editor after the earlier listing
migrations have been applied. Do not place a Supabase `service_role` key in
frontend environment variables; the browser app must use the publishable/anon
key.

Firebase Authentication handles phone OTP. Enable Phone sign-in in Firebase
Console and add the app's development/production hostnames under Authorized
domains; Firebase reCAPTCHA verification is used for web OTP requests. Firebase
test phone numbers and codes can be configured in Authentication settings.
For local testing, use the exact authorized origin
`http://127.0.0.1:5173/`; `localhost` and `127.0.0.1` are different origins for
Firebase/reCAPTCHA. Add `localhost` separately to Firebase Authorized domains
if you also need to test at `http://localhost:5173/`.

Firebase Phone Auth verifies Firebase accounts directly; the application does
not exchange Firebase tokens through Supabase OIDC or use Firebase UIDs as
`auth.users` UUIDs. Basic Firebase account profiles are synchronized by the
`sync-firebase-profile` Edge Function into `public.firebase_profiles`. This
function verifies ID tokens with Firebase Identity Toolkit and uses the
Supabase service role only on the server. The table denies direct `anon` and
`authenticated` access. Apply
`20261005200000_create_firebase_profiles.sql`, deploy the function, and set
these Edge Function secrets (Supabase provides `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` automatically to Edge Functions; do not add either
to the frontend or manually override the built-in values):

- `FIREBASE_API_KEY` — Firebase web API key for project `rahoa-autht`.
- `FIREBASE_PROJECT_ID` — `rahoa-autht`.

In the Supabase SQL Editor for the project used by `VITE_SUPABASE_URL`, run the
contents of `supabase/migrations/20261005200000_create_firebase_profiles.sql`,
`supabase/migrations/20261009160000_add_firebase_contact_credits.sql`, and
`supabase/migrations/20261010100000_allow_firebase_test_credit_grants.sql`.
Then from the repository root, use the Supabase CLI to deploy:

```powershell
supabase link --project-ref vfbkykwuunjrtlyjdljz
supabase secrets set FIREBASE_API_KEY="YOUR_FIREBASE_WEB_API_KEY" FIREBASE_PROJECT_ID=rahoa-autht
supabase functions deploy sync-firebase-profile --no-verify-jwt
```

The Firebase API key is shown in the Firebase web app configuration. Never use
the Supabase service-role key in the browser or commit it to the repository.
The function validates the Firebase ID token itself; gateway JWT verification
is disabled for this function because its incoming bearer token is a Firebase
token rather than a Supabase Auth JWT.

On `localhost`, Firebase users can use the local mock checkout to add 1, 6, or
15 test credits without opening Razorpay. The Edge Function restricts this
action to local origins or the configured Firebase test phone and runs an
atomic service-role-only grant RPC. This is test-only crediting, not payment
verification; do not use it as a production checkout.

Firebase users retain a browser-local authenticated session and saved homes.
Seeker contact credits and unlocks use the `firebase_profiles` and
`unlocked_contacts` tables. The browser sends a Firebase ID token to
`sync-firebase-profile`; the Edge Function verifies it with Firebase Identity
Toolkit, then reads the account data or invokes
`consume_contact_credit_firebase` using the verified UID and service role.
The RPC and unlock table are not directly accessible to browser roles. Apply
`20261009160000_add_firebase_contact_credits.sql` before deploying the updated
function.

The current `profiles` table and other account tables remain tied to Supabase
Auth UUIDs and `auth.uid()` RLS; they are not writable using a Firebase UID.
Firebase saved homes and seeker preferences therefore remain browser-local.

Paid contact unlocks and pass purchases also depend on an active, server-
verified access pass. Contact credits can be spent by Firebase users once
credits have been granted to their Firebase profile. Pass checkout remains
disabled for Firebase users until trusted server-side Razorpay payment
verification is implemented; do not treat the browser checkout callback as
payment verification or grant credits from the client.

For Supabase Auth users, saved listings, seeker preferences, host profiles and
occupancy, reviews, contact unlock records, and host leads use the account
tables/RPCs in Supabase. These features require the migrations to be applied to
the configured project.
Payment transactions and paid contact credits are intentionally not written
from the browser: Razorpay payment signatures must be verified server-side
before an access pass can be trusted. The current browser checkout callback is
not that verification and does not establish a production-safe paid record.
