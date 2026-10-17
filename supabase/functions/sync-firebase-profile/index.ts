import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizePortalRole(value: unknown): 'host' | 'seeker' {
  return typeof value === 'string' && value.toLowerCase().includes('host') ? 'host' : 'seeker';
}

function tokenPayload(token: string): Record<string, unknown> | null {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed.' });

  const firebaseApiKey = Deno.env.get('FIREBASE_API_KEY');
  const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!firebaseApiKey || !firebaseProjectId || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Firebase profile sync is not configured on the server.' });
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return jsonResponse(401, { error: 'A Firebase ID token is required.' });
  const claims = tokenPayload(match[1]);
  if (
    claims?.aud !== firebaseProjectId
    || claims.iss !== `https://securetoken.google.com/${firebaseProjectId}`
  ) {
    return jsonResponse(401, { error: 'The Firebase ID token is for a different project.' });
  }

  let identityResponse: Response;
  try {
    identityResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: match[1] }),
      },
    );
  } catch (error) {
    console.error('Firebase token verification request failed.', error);
    return jsonResponse(502, { error: 'Could not verify the Firebase ID token.' });
  }
  if (!identityResponse.ok) {
    return jsonResponse(401, { error: 'Firebase rejected the ID token. Sign in again and retry.' });
  }

  const identity: unknown = await identityResponse.json();
  const firebaseUser = identity && typeof identity === 'object' && 'users' in identity
    ? (identity as { users?: Array<{ localId?: string; phoneNumber?: string }> }).users?.[0]
    : undefined;
  if (!firebaseUser?.localId || claims.sub !== firebaseUser.localId || !firebaseUser.phoneNumber) {
    return jsonResponse(401, { error: 'The Firebase token did not resolve to a matching phone account.' });
  }

  const requestBody: unknown = await request.json().catch(() => null);
  if (!isRecord(requestBody)) return jsonResponse(400, { error: 'A valid action is required.' });
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (requestBody.action === 'sync-profile') {
    const role = normalizePortalRole(requestBody.role);
    const { error } = await supabase.from('firebase_profiles').upsert({
      firebase_uid: firebaseUser.localId,
      phone: firebaseUser.phoneNumber,
      role,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'firebase_uid' });
    if (error) {
      console.error('Could not upsert verified Firebase profile.', {
        project: firebaseProjectId,
        code: error.code,
        message: error.message,
      });
      return jsonResponse(500, { error: 'Could not save the verified Firebase profile to Supabase.' });
    }
    return jsonResponse(200, { status: 'synced' });
  }

  if (requestBody.action === 'test-purchase') {
    const planCredits: Record<string, number> = { single: 1, day: 6, week: 15 };
    if (typeof requestBody.plan !== 'string' || !(requestBody.plan in planCredits)) {
      return jsonResponse(400, { error: 'Choose a valid test pass.' });
    }
    const role = normalizePortalRole(requestBody.role);
    if (role !== 'seeker') {
      return jsonResponse(403, { error: 'Test contact credits can only be added to a seeker account.' });
    }
    const origin = request.headers.get('Origin');
    let isLocalOrigin = false;
    if (origin) {
      try {
        isLocalOrigin = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname);
      } catch {
        return jsonResponse(400, { error: 'The request origin is invalid.' });
      }
    }
    if (!isLocalOrigin && firebaseUser.phoneNumber !== '+919999999999') {
      return jsonResponse(403, { error: 'Test purchases are limited to localhost or the configured Firebase test phone.' });
    }

    const { error: profileUpsertError } = await supabase.from('firebase_profiles').upsert({
      firebase_uid: firebaseUser.localId,
      phone: firebaseUser.phoneNumber,
      role,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'firebase_uid' });
    if (profileUpsertError) {
      console.error('Could not normalize the seeker Firebase profile before test purchase.', {
        code: profileUpsertError.code,
        message: profileUpsertError.message,
      });
      return jsonResponse(500, { error: 'Could not prepare your seeker account for test credits.' });
    }

    const creditsGranted = planCredits[requestBody.plan];
    const { error: grantError } = await supabase.rpc('grant_firebase_test_contact_credits', {
      p_firebase_uid: firebaseUser.localId,
      p_credits: creditsGranted,
    });
    if (grantError) {
      console.error('Could not grant Firebase test contact credits.', {
        code: grantError.code,
        message: grantError.message,
      });
      return jsonResponse(500, { error: 'Could not add test credits to your account.' });
    }
    const { data, error } = await loadSeekerDashboard(supabase, firebaseUser.localId);
    if (error) {
      console.error('Could not refresh the Firebase dashboard after test purchase.', error);
      return jsonResponse(500, { error: 'Credits were added, but your dashboard could not be refreshed.' });
    }
    return jsonResponse(200, { ...data, testPurchase: { plan: requestBody.plan, creditsGranted } });
  }

  const { data: profile, error: profileError } = await supabase
    .from('firebase_profiles')
    .select('role, contact_credits')
    .eq('firebase_uid', firebaseUser.localId)
    .maybeSingle();
  if (profileError) {
    console.error('Could not load verified Firebase profile data.', profileError);
    return jsonResponse(500, { error: 'Could not load your contact-credit balance.' });
  }
  if (!profile || profile.role !== 'seeker') {
    return jsonResponse(403, { error: 'A seeker account is required to access contact unlocks.' });
  }

  if (requestBody.action === 'unlock-contact') {
    if (
      typeof requestBody.listingId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestBody.listingId)
    ) {
      return jsonResponse(400, { error: 'This listing is not available for account-based contact unlock yet.' });
    }
    const { data, error } = await supabase.rpc('consume_contact_credit_firebase', {
      p_firebase_uid: firebaseUser.localId,
      p_listing_id: requestBody.listingId,
    });
    if (error) {
      console.error('Firebase contact credit RPC failed.', {
        code: error.code,
        message: error.message,
      });
      return jsonResponse(500, { error: 'Could not unlock this contact. Please try again.' });
    }
    if (typeof data !== 'boolean') {
      console.error('Firebase contact credit RPC returned an unexpected result.');
      return jsonResponse(500, { error: 'Contact unlock returned an invalid result.' });
    }
    const { data: dashboardData, error: dashboardError } = await loadSeekerDashboard(supabase, firebaseUser.localId);
    if (dashboardError) {
      console.error('Could not refresh Firebase seeker data after contact unlock.', dashboardError);
      return jsonResponse(500, { error: 'Contact unlock completed, but your dashboard data could not be refreshed.' });
    }
    return jsonResponse(200, { success: data, ...dashboardData });
  }

  if (requestBody.action === 'seeker-dashboard') {
    const { data, error } = await loadSeekerDashboard(supabase, firebaseUser.localId);
    if (error) {
      console.error('Could not load Firebase seeker dashboard data.', error);
      return jsonResponse(500, { error: 'Could not load your contact unlocks.' });
    }
    return jsonResponse(200, data);
  }

  return jsonResponse(400, { error: 'Unsupported Firebase account action.' });
});

async function loadSeekerDashboard(
  supabase: ReturnType<typeof createClient>,
  firebaseUid: string,
) {
  const [{ data: profile, error: profileError }, { data: unlockedContacts, error: contactsError }] = await Promise.all([
    supabase.from('firebase_profiles')
      .select('contact_credits')
      .eq('firebase_uid', firebaseUid)
      .single(),
    supabase.from('unlocked_contacts')
      .select('listing_id, listing_title_snapshot, neighborhood_snapshot, rent_snapshot_inr, image_snapshot, host_phone_snapshot, host_whatsapp_snapshot, unlocked_at')
      .eq('seeker_firebase_uid', firebaseUid)
      .order('unlocked_at', { ascending: false }),
  ]);
  if (profileError) return { data: null, error: profileError };
  if (contactsError) return { data: null, error: contactsError };
  return {
    data: {
      contactCredits: profile.contact_credits,
      unlockedContacts: unlockedContacts ?? [],
    },
    error: null,
  };
}
