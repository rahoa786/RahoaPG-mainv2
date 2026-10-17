export type PassType = 'single' | 'day' | 'week';

export interface AccessPass {
  type: PassType;
  unlockedIds: string[];
  expiresAt: number;
  remainingCredits: number;
  totalCredits: number;
}

export const PASS_PLANS: Record<PassType, {
  label: string;
  price: number;
  amountPaise: number;
  description: string;
  credits: number;
  durationHours: number;
  pricePerContact: string;
  savings?: string;
  badge?: string;
}> = {
  single: {
    label: 'Single Contact Unlock',
    price: 9,
    amountPaise: 900,
    description: 'Single Contact Unlock — 1 contact',
    credits: 1,
    durationHours: 24,
    pricePerContact: '₹9.00 per contact',
  },
  day: {
    label: 'Standard Seeker Pass',
    price: 49,
    amountPaise: 4900,
    description: 'Standard Seeker Pass — 6 contacts, valid 24 hours',
    credits: 6,
    durationHours: 24,
    pricePerContact: '₹8.17 / contact',
    savings: 'Save 9%',
    badge: 'Most Popular',
  },
  week: {
    label: 'Power Seeker Pass',
    price: 99,
    amountPaise: 9900,
    description: 'Power Seeker Pass — 15 contacts, valid 7 days',
    credits: 15,
    durationHours: 24 * 7,
    pricePerContact: '₹6.60 / contact',
    savings: 'Save 27%',
    badge: 'Best Value',
  },
};

export function normalizeAccessPass(value: unknown): AccessPass | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<AccessPass>;
  if ((record.type !== 'single' && record.type !== 'day' && record.type !== 'week') ||
      !Array.isArray(record.unlockedIds) || typeof record.expiresAt !== 'number') return null;
  const unlockedIds = record.unlockedIds.filter((id): id is string => typeof id === 'string');
  if (typeof record.remainingCredits === 'number' && Number.isFinite(record.remainingCredits)) {
    return {
      type: record.type,
      unlockedIds,
      expiresAt: record.expiresAt,
      remainingCredits: Math.max(0, Math.floor(record.remainingCredits)),
      totalCredits: typeof record.totalCredits === 'number'
        ? Math.max(0, Math.floor(record.totalCredits))
        : PASS_PLANS[record.type].credits,
    };
  }

  const legacyCredits = record.type === 'day' ? 3 : record.type === 'week' ? 15 : 1;
  return {
    type: record.type,
    unlockedIds,
    expiresAt: record.expiresAt,
    remainingCredits: Math.max(0, legacyCredits - unlockedIds.length),
    totalCredits: legacyCredits,
  };
}

export function isPassActive(pass: AccessPass | null): boolean {
  return !!pass && Date.now() < pass.expiresAt && pass.remainingCredits > 0;
}

export function canUnlock(pass: AccessPass | null, listingId: string): boolean {
  return !!pass && Date.now() < pass.expiresAt &&
    (pass.unlockedIds.includes(listingId) || pass.remainingCredits > 0);
}

export function isUnlocked(pass: AccessPass | null, listingId: string): boolean {
  return !!pass?.unlockedIds.includes(listingId);
}
