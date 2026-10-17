import { normalizeAccessPass, type AccessPass } from '@/data/accessPass';

export interface UnlockedContact {
  id: string;
  title: string;
  neighborhood: string;
  baseRent: number;
  image: string;
  hostPhone: string;
  hostWhatsApp: string;
  unlockedAt: number;
}

/**
 * Persists per-device user state in localStorage behind a stable device key:
 *  - access pass (Razorpay unlock)
 *  - unlocked listing IDs (sum of every listing ever unlocked on this device)
 *  - contact snapshots for unlocked listings
 *  - saved (favourited) listing IDs
 *
 * The device key is generated once and reused so state survives reloads.
 */

const DEVICE_KEY = 'rahoa_device_id';
const PASS_KEY = 'rahoa_access_pass';
const UNLOCKED_KEY = 'rahoa_unlocked_listings';
const CONTACTS_KEY = 'rahoa_unlocked_contacts';
const SAVED_KEY = 'rahoa_saved_listings';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Returns a stable device id, creating one on first use. */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'dev_fallback';
  }
}

/** Ensure a device id exists (call once on mount). */
export function initDeviceId(): void {
  getDeviceId();
}

// ---- Access pass ----

export function loadAccessPass(): AccessPass | null {
  try {
    const pass = normalizeAccessPass(safeParse<unknown>(localStorage.getItem(PASS_KEY), null));
    if (pass) saveAccessPass(pass);
    return pass;
  } catch {
    return null;
  }
}

export function saveAccessPass(pass: AccessPass | null): void {
  try {
    if (pass) {
      localStorage.setItem(PASS_KEY, JSON.stringify(pass));
    } else {
      localStorage.removeItem(PASS_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

// ---- Unlocked listing IDs (cumulative across passes) ----

export function loadUnlockedIds(): string[] {
  try {
    return safeParse<string[]>(localStorage.getItem(UNLOCKED_KEY), []);
  } catch {
    return [];
  }
}

export function saveUnlockedIds(ids: string[]): void {
  try {
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage errors
  }
}

export function addUnlockedId(id: string): string[] {
  const current = loadUnlockedIds();
  if (current.includes(id)) return current;
  const next = [...current, id];
  saveUnlockedIds(next);
  return next;
}

export function loadUnlockedContacts(): UnlockedContact[] {
  try {
    const contacts = safeParse<unknown>(localStorage.getItem(CONTACTS_KEY), []);
    if (!Array.isArray(contacts)) return [];
    return contacts.filter((contact): contact is UnlockedContact =>
      !!contact &&
      typeof contact === 'object' &&
      typeof contact.id === 'string' &&
      typeof contact.title === 'string' &&
      typeof contact.neighborhood === 'string' &&
      typeof contact.baseRent === 'number' &&
      typeof contact.image === 'string' &&
      typeof contact.hostPhone === 'string' &&
      typeof contact.hostWhatsApp === 'string' &&
      typeof contact.unlockedAt === 'number'
    );
  } catch {
    return [];
  }
}

export function addUnlockedContact(contact: UnlockedContact): UnlockedContact[] {
  const current = loadUnlockedContacts();
  if (current.some((item) => item.id === contact.id)) return current;
  const next = [contact, ...current];
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable or full; the active session still keeps the contact in memory.
  }
  return next;
}

// ---- Saved (favourited) listing IDs ----

export function loadSavedIds(): string[] {
  try {
    return safeParse<string[]>(localStorage.getItem(SAVED_KEY), []);
  } catch {
    return [];
  }
}

export function saveSavedIds(ids: string[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage errors
  }
}

export function toggleSavedId(id: string): { saved: boolean; ids: string[] } {
  const current = loadSavedIds();
  const exists = current.includes(id);
  const next = exists ? current.filter((x) => x !== id) : [...current, id];
  saveSavedIds(next);
  return { saved: !exists, ids: next };
}
