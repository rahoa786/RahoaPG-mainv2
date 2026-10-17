export type PortalRole = 'host' | 'seeker';

export function normalizePortalRole(role: unknown): PortalRole {
  if (typeof role !== 'string') return 'seeker';
  return role.trim().toLowerCase().includes('host') ? 'host' : 'seeker';
}

export interface PortalUser {
  id: string;
  contact: string;
  role: PortalRole;
  authMode?: 'development' | 'firebase';
  profileSyncError?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface DemoLead {
  listingId: string;
  seekerContact: string;
  inquiryAt: number;
  matchScore: number;
}

export interface DemoTransaction {
  id: string;
  label: string;
  amount: number;
  createdAt: number;
  status: 'paid' | 'unlocked';
}

export interface HostListingMeta {
  status: 'active' | 'full';
  totalBeds: number;
  filledBeds: number;
}

const USER_KEY = 'rahoa_demo_portal_user';
const OWNED_LISTINGS_KEY = 'rahoa_demo_owned_listings';
const HOST_META_KEY = 'rahoa_demo_host_meta';
const LEADS_KEY = 'rahoa_demo_host_leads';
const TRANSACTIONS_KEY = 'rahoa_demo_transactions';

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error(`Could not persist Rahoa demo data for ${key}.`);
  }
}

function contactId(contact: string): string {
  let hash = 0;
  for (const character of contact.toLowerCase().trim()) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return `demo-user-${Math.abs(hash).toString(36)}`;
}

export function loadPortalUser(): PortalUser | null {
  const user = read<PortalUser | null>(USER_KEY, null);
  if (!user || typeof user.id !== 'string' || typeof user.contact !== 'string') {
    return null;
  }
  return { ...user, role: normalizePortalRole(user.role) };
}

export function savePortalUser(contact: string, role: PortalRole): PortalUser {
  const normalizedContact = contact.trim();
  const user = { id: contactId(normalizedContact), contact: normalizedContact, role: normalizePortalRole(role) };
  write(USER_KEY, user);
  return user;
}

export function clearPortalUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    console.error('Could not clear the Rahoa demo session.');
  }
}

export function loadOwnedListingIds(userId: string): string[] {
  return read<Record<string, string[]>>(OWNED_LISTINGS_KEY, {})[userId] ?? [];
}

export function addOwnedListingId(userId: string, listingId: string): void {
  const records = read<Record<string, string[]>>(OWNED_LISTINGS_KEY, {});
  records[userId] = [...new Set([...(records[userId] ?? []), listingId])];
  write(OWNED_LISTINGS_KEY, records);
}

export function loadHostListingMeta(listingId: string): HostListingMeta {
  const records = read<Record<string, HostListingMeta>>(HOST_META_KEY, {});
  return records[listingId] ?? { status: 'active', totalBeds: 1, filledBeds: 0 };
}

export function saveHostListingMeta(listingId: string, meta: HostListingMeta): void {
  const records = read<Record<string, HostListingMeta>>(HOST_META_KEY, {});
  records[listingId] = meta;
  write(HOST_META_KEY, records);
}

export function loadDemoLeads(): DemoLead[] {
  return read<DemoLead[]>(LEADS_KEY, []);
}

export function addDemoLead(lead: DemoLead): void {
  const records = loadDemoLeads();
  if (records.some((item) => item.listingId === lead.listingId && item.seekerContact === lead.seekerContact)) return;
  write(LEADS_KEY, [lead, ...records]);
}

export function loadDemoTransactions(): DemoTransaction[] {
  return read<DemoTransaction[]>(TRANSACTIONS_KEY, []);
}

export function addDemoTransaction(transaction: DemoTransaction): void {
  write(TRANSACTIONS_KEY, [transaction, ...loadDemoTransactions()]);
}
