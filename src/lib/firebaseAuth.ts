import {
  type ConfirmationResult,
  type RecaptchaVerifier,
  type User,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { normalizePortalRole, type PortalRole, type PortalUser } from '@/lib/demoPortal';
import type { UnlockedContact } from '@/lib/userStorage';

const SESSION_KEY = 'rahoa_auth_session';
const PENDING_ROLE_KEY = 'rahoa_firebase_pending_role';
const SAVED_IDS_PREFIX = 'rahoa_firebase_saved:';
const profileSyncs = new Map<string, Promise<void>>();

interface FirebaseSession {
  uid: string;
  phone: string;
  role: PortalRole;
  verified: true;
}

function getStoredRole(uid: string): PortalRole {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object' && 'role' in parsed && 'uid' in parsed && 'verified' in parsed) {
      const session = parsed as { uid?: unknown; role?: unknown; verified?: unknown };
      if (session.uid === uid && session.verified === true) {
        return normalizePortalRole(session.role);
      }
    }
    const pendingRole = localStorage.getItem(PENDING_ROLE_KEY);
    return normalizePortalRole(pendingRole);
  } catch (error) {
    console.error('Could not read saved Rahoa authentication session.', error);
    return 'seeker';
  }
}

function toPortalUser(user: User, role = getStoredRole(user.uid), profileSyncError?: string): PortalUser {
  const phone = user.phoneNumber ?? '';
  return {
    id: user.uid,
    contact: phone,
    phone,
    email: user.email ?? '',
    fullName: user.displayName ?? '',
    role: normalizePortalRole(role),
    authMode: 'firebase',
    profileSyncError,
  };
}

function storeSession(user: User, role: PortalRole): FirebaseSession {
  const normalizedRole = normalizePortalRole(role);
  const session: FirebaseSession = {
    uid: user.uid,
    phone: user.phoneNumber ?? '',
    role: normalizedRole,
    verified: true,
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(PENDING_ROLE_KEY);
  } catch (error) {
    console.error('Could not save the verified Firebase session.', error);
    throw new Error('Phone verified, but Rahoa could not save your session in this browser.');
  }
  return session;
}

function clearPendingRole(): void {
  try {
    localStorage.removeItem(PENDING_ROLE_KEY);
  } catch (error) {
    console.error('Could not clear the pending Firebase account role.', error);
  }
}

async function performFirebaseProfileSync(user: User, role: PortalRole): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('Supabase is not configured.');

  const response = await fetch(`${supabaseUrl}/functions/v1/sync-firebase-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ action: 'sync-profile', role: normalizePortalRole(role) }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Profile sync failed with status ${response.status}.`;
    throw new Error(message);
  }
}

async function postFirebaseAccountAction(user: User, body: Record<string, unknown>): Promise<unknown> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('Supabase is not configured.');

  const idToken = await user.getIdToken();
  const response = await fetch(`${supabaseUrl}/functions/v1/sync-firebase-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = responseBody && typeof responseBody === 'object' && 'error' in responseBody && typeof responseBody.error === 'string'
      ? responseBody.error
      : `Firebase account request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return responseBody;
}

function parseFirebaseSeekerData(response: unknown): {
  contactCredits: number;
  unlockedContacts: UnlockedContact[];
  success?: boolean;
} {
  if (!response || typeof response !== 'object') throw new Error('The server returned invalid contact data.');
  const result = response as {
    contactCredits?: unknown;
    unlockedContacts?: unknown;
    success?: unknown;
  };
  if (!Number.isInteger(result.contactCredits) || (result.contactCredits as number) < 0 || !Array.isArray(result.unlockedContacts)) {
    throw new Error('The server returned an invalid contact balance or unlock list.');
  }
  const unlockedContacts = result.unlockedContacts.map((value): UnlockedContact => {
    if (!value || typeof value !== 'object') throw new Error('The server returned an invalid unlocked contact.');
    const row = value as Record<string, unknown>;
    const unlockedAt = typeof row.unlocked_at === 'string' ? Date.parse(row.unlocked_at) : Number.NaN;
    if (
      typeof row.listing_id !== 'string'
      || typeof row.listing_title_snapshot !== 'string'
      || typeof row.neighborhood_snapshot !== 'string'
      || typeof row.rent_snapshot_inr !== 'number'
      || typeof row.image_snapshot !== 'string'
      || typeof row.host_phone_snapshot !== 'string'
      || typeof row.host_whatsapp_snapshot !== 'string'
      || !Number.isFinite(unlockedAt)
    ) {
      throw new Error('The server returned an incomplete unlocked contact.');
    }
    return {
      id: row.listing_id,
      title: row.listing_title_snapshot,
      neighborhood: row.neighborhood_snapshot,
      baseRent: row.rent_snapshot_inr,
      image: row.image_snapshot,
      hostPhone: row.host_phone_snapshot,
      hostWhatsApp: row.host_whatsapp_snapshot,
      unlockedAt,
    };
  });
  if (result.success !== undefined && typeof result.success !== 'boolean') {
    throw new Error('The server returned an invalid unlock status.');
  }
  return {
    contactCredits: result.contactCredits as number,
    unlockedContacts,
    ...(typeof result.success === 'boolean' ? { success: result.success } : {}),
  };
}

async function getFirebaseSeekerData(action: 'seeker-dashboard' | 'unlock-contact', listingId?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Your Firebase session has expired. Sign in again to manage contact unlocks.');
  const response = await postFirebaseAccountAction(user, {
    action,
    ...(listingId ? { listingId } : {}),
  });
  return parseFirebaseSeekerData(response);
}

export async function fetchFirebaseSeekerData(): Promise<{
  contactCredits: number;
  unlockedContacts: UnlockedContact[];
}> {
  const { contactCredits, unlockedContacts } = await getFirebaseSeekerData('seeker-dashboard');
  return { contactCredits, unlockedContacts };
}

export async function unlockFirebaseContact(listingId: string): Promise<{
  success: boolean;
  contactCredits: number;
  unlockedContacts: UnlockedContact[];
}> {
  const result = await getFirebaseSeekerData('unlock-contact', listingId);
  if (typeof result.success !== 'boolean') throw new Error('The server did not confirm the contact unlock result.');
  return {
    success: result.success,
    contactCredits: result.contactCredits,
    unlockedContacts: result.unlockedContacts,
  };
}

export function canUseFirebaseTestCheckout(phone?: string): boolean {
  return window.location.hostname === 'localhost' || phone === '+919999999999';
}

export async function grantFirebaseTestCredits(plan: 'single' | 'day' | 'week'): Promise<{
  contactCredits: number;
  unlockedContacts: UnlockedContact[];
}> {
  const user = auth.currentUser;
  if (!user) throw new Error('Your Firebase session has expired. Sign in again to purchase test credits.');
  if (!canUseFirebaseTestCheckout(user.phoneNumber ?? undefined)) {
    throw new Error('Test checkout is available only on localhost or for the configured Firebase test phone.');
  }
  const normalizedRole = normalizePortalRole(getStoredRole(user.uid));
  if (normalizedRole !== 'seeker') {
    throw new Error('Test contact credits can only be added to a seeker account. Switch to Seeker and try again.');
  }
  const response = await postFirebaseAccountAction(user, {
    action: 'test-purchase',
    plan,
    role: normalizedRole,
  });
  return parseFirebaseSeekerData(response);
}

async function syncFirebaseProfile(user: User, role: PortalRole): Promise<void> {
  const key = `${user.uid}:${role}`;
  const current = profileSyncs.get(key);
  if (current) return current;

  const sync = performFirebaseProfileSync(user, role);
  profileSyncs.set(key, sync);
  try {
    await sync;
  } finally {
    if (profileSyncs.get(key) === sync) profileSyncs.delete(key);
  }
}

export function observeFirebaseUser(callback: (user: PortalUser | null) => void) {
  let generation = 0;
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    const currentGeneration = ++generation;
    if (!user) {
      try {
        localStorage.removeItem(SESSION_KEY);
        clearPendingRole();
      } catch (error) {
        console.error('Could not clear the signed-out Rahoa session.', error);
      }
      if (generation === currentGeneration) callback(null);
      return;
    }

    const role = getStoredRole(user.uid);
    void syncFirebaseProfile(user, role).then(() => {
      if (generation === currentGeneration) callback(toPortalUser(user, role));
    }).catch((error: unknown) => {
      if (generation !== currentGeneration) return;
      const message = error instanceof Error ? error.message : 'Could not sync your profile to Supabase.';
      console.error('Restored Firebase account profile could not be synced to Supabase.', error);
      callback(toPortalUser(user, role, message));
    });
  });
  return () => {
    generation += 1;
    unsubscribe();
  };
}

export async function requestFirebaseOtp(
  phone: string,
  role: PortalRole,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  const normalizedRole = normalizePortalRole(role);
  try {
    localStorage.setItem(PENDING_ROLE_KEY, normalizedRole);
  } catch (error) {
    console.error('Could not save the selected account role.', error);
    throw new Error('Could not prepare phone verification in this browser.');
  }
  let timeoutId = 0;
  try {
    return await Promise.race([
      signInWithPhoneNumber(auth, phone, verifier),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('Firebase did not finish sending the OTP within 45 seconds. The request may be blocked or delayed by Firebase Auth or the browser network.')),
          45000,
        );
      }),
    ]);
  } catch (error) {
    clearPendingRole();
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function verifyFirebaseOtp(
  confirmation: ConfirmationResult,
  token: string,
  role: PortalRole,
): Promise<PortalUser> {
  const normalizedRole = normalizePortalRole(role);
  const { user } = await confirmation.confirm(token);
  storeSession(user, normalizedRole);

  try {
    await syncFirebaseProfile(user, normalizedRole);
    return toPortalUser(user, normalizedRole);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not sync your profile to Supabase.';
    console.error('Verified Firebase account profile could not be synced to Supabase.', error);
    return toPortalUser(user, normalizedRole, message);
  }
}

export async function setFirebasePortalRole(role: PortalRole): Promise<PortalUser> {
  const normalizedRole = normalizePortalRole(role);
  const user = auth.currentUser;
  if (!user) throw new Error('Your Firebase session has expired. Sign in again to change your role.');
  storeSession(user, normalizedRole);
  try {
    await syncFirebaseProfile(user, normalizedRole);
    return toPortalUser(user, normalizedRole);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not sync your role to Supabase.';
    console.error('Firebase account role could not be synced to Supabase.', error);
    return toPortalUser(user, normalizedRole, message);
  }
}

export function loadFirebaseSavedIds(uid: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`${SAVED_IDS_PREFIX}${uid}`) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    console.error('Could not load Firebase saved listings.', error);
    return [];
  }
}

export function saveFirebaseSavedIds(uid: string, ids: string[]): void {
  try {
    localStorage.setItem(`${SAVED_IDS_PREFIX}${uid}`, JSON.stringify([...new Set(ids)]));
  } catch (error) {
    console.error('Could not save Firebase listings.', error);
    throw new Error('Could not save listings in this browser.');
  }
}

export async function signOutFirebaseUser(): Promise<void> {
  await signOut(auth);
}
