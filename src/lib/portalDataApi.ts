import { supabase } from '@/lib/supabase';
import type { Listing, QuizAnswers } from '@/data/listings';
import type { DemoLead, HostListingMeta } from '@/lib/demoPortal';
import type { UnlockedContact } from '@/lib/userStorage';
import { PASS_PLANS, type AccessPass, type PassType } from '@/data/accessPass';

export async function fetchSavedListingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', userId);
  if (error) throw new Error(`Could not load saved homes: ${error.message}`);
  return (data ?? []).map((row) => row.listing_id as string);
}

export async function setSavedListing(userId: string, listingId: string, saved: boolean): Promise<void> {
  const response = saved
    ? await supabase.from('saved_listings').upsert({ user_id: userId, listing_id: listingId })
    : await supabase.from('saved_listings').delete().eq('user_id', userId).eq('listing_id', listingId);
  if (response.error) throw new Error(`Could not update saved homes: ${response.error.message}`);
}

export async function fetchSeekerPreferences(userId: string): Promise<QuizAnswers | null> {
  const { data, error } = await supabase
    .from('seeker_preferences')
    .select('food_preference, sleep_schedule, curfew_preference, social_preference, gender_preference')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load your lifestyle preferences: ${error.message}`);
  if (!data || !data.food_preference) return null;
  return {
    food: data.food_preference,
    schedule: data.sleep_schedule,
    curfew: data.curfew_preference,
    social: data.social_preference,
    gender: data.gender_preference,
  };
}

export async function saveSeekerPreferences(userId: string, answers: QuizAnswers): Promise<void> {
  const { error } = await supabase.from('seeker_preferences').upsert({
    user_id: userId,
    food_preference: answers.food,
    sleep_schedule: answers.schedule,
    curfew_preference: answers.curfew,
    social_preference: answers.social,
    gender_preference: answers.gender,
  });
  if (error) throw new Error(`Could not save your lifestyle preferences: ${error.message}`);
}

export async function saveHostProfile(input: {
  userId: string;
  displayName: string;
  listing: Listing;
}): Promise<void> {
  const digits = input.listing.hostWhatsApp.replace(/\D/g, '');
  const { error } = await supabase.from('host_profiles').upsert({
    user_id: input.userId,
    display_name: input.displayName,
    host_type: input.listing.hostType,
    property_relationship: input.listing.hostType === 'pg' ? 'owner_or_manager' : 'primary_leaseholder',
    public_phone: input.listing.hostPhone,
    public_whatsapp: digits,
  });
  if (error) throw new Error(`Listing was published, but host contact details could not be saved: ${error.message}`);
}

export async function saveHostOccupancy(listingId: string, meta: HostListingMeta): Promise<void> {
  const { error } = await supabase.rpc('update_my_listing_occupancy', {
    target_listing_id: listingId,
    next_total_beds: meta.totalBeds,
    next_filled_beds: meta.filledBeds,
    next_status: meta.status,
  });
  if (error) throw new Error(`Could not save listing occupancy: ${error.message}`);
}

export async function fetchHostLeads(): Promise<DemoLead[]> {
  const { data, error } = await supabase.rpc('get_my_host_leads');
  if (error) throw new Error(`Could not load host leads: ${error.message}`);
  return (data ?? []).map((row: { listing_id: string; seeker_contact: string; inquiry_at: string; match_score: number }) => ({
    listingId: row.listing_id,
    seekerContact: row.seeker_contact,
    inquiryAt: new Date(row.inquiry_at).getTime(),
    matchScore: row.match_score,
  }));
}

export async function fetchSeekerAccessData(userId: string): Promise<{
  pass: AccessPass | null;
  unlockedIds: string[];
  unlockedContacts: UnlockedContact[];
}> {
  const [{ data: passRows, error: passError }, { data: unlockRows, error: unlockError }] = await Promise.all([
    supabase.from('access_passes')
      .select('plan_code, total_credits, remaining_credits, expires_at')
      .eq('user_id', userId)
      .eq('payment_status', 'paid')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false }),
    supabase.from('contact_unlocks')
      .select('listing_id, listing_title_snapshot, neighborhood_snapshot, rent_snapshot_inr, created_at, listings(image, host_phone, host_whatsapp)')
      .eq('seeker_id', userId)
      .order('created_at', { ascending: false }),
  ]);
  if (passError) throw new Error(`Could not load paid contact credits: ${passError.message}`);
  if (unlockError) throw new Error(`Could not load unlocked contacts: ${unlockError.message}`);

  const rows = passRows ?? [];
  const currentPlan = rows[0]?.plan_code;
  const validPlan = currentPlan === 'single' || currentPlan === 'day' || currentPlan === 'week'
    ? currentPlan as PassType
    : null;
  const pass: AccessPass | null = rows.length && validPlan ? {
    type: validPlan,
    unlockedIds: (unlockRows ?? []).map((item) => item.listing_id),
    expiresAt: Math.max(...rows.map((item) => new Date(item.expires_at).getTime())),
    remainingCredits: rows.reduce((total, item) => total + item.remaining_credits, 0),
    totalCredits: rows.reduce((total, item) => total + item.total_credits, 0),
  } : null;
  const unlockedContacts: UnlockedContact[] = (unlockRows ?? []).map((item) => {
    const listing = Array.isArray(item.listings) ? item.listings[0] : item.listings;
    return {
      id: item.listing_id,
      title: item.listing_title_snapshot,
      neighborhood: item.neighborhood_snapshot,
      baseRent: item.rent_snapshot_inr,
      image: listing?.image ?? '',
      hostPhone: listing?.host_phone ?? '',
      hostWhatsApp: listing?.host_whatsapp ?? '',
      unlockedAt: new Date(item.created_at).getTime(),
    };
  });
  return {
    pass,
    unlockedIds: (unlockRows ?? []).map((item) => item.listing_id),
    unlockedContacts,
  };
}

export async function fetchPaidTransactions(userId: string) {
  const { data, error } = await supabase.from('payment_transactions')
    .select('id, plan_code, amount_paise, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load verified payment transactions: ${error.message}`);
  return (data ?? []).map((item) => ({
    id: item.id,
    label: `${item.plan_code ? item.plan_code.toUpperCase() : 'Pass'} purchase`,
    amount: item.amount_paise / 100,
    createdAt: new Date(item.created_at).getTime(),
    status: 'paid' as const,
    planType: item.plan_code && item.plan_code in PASS_PLANS
      ? PASS_PLANS[item.plan_code as PassType].label
      : 'Pass purchase',
  }));
}

export async function consumeRemoteContactCredit(listing: Listing, matchScore: number): Promise<void> {
  const { error } = await supabase.rpc('consume_contact_credit', {
    target_listing_id: listing.id,
    seeker_match_score: matchScore,
  });
  if (error) throw new Error(`Contact unlock was not recorded in Supabase: ${error.message}`);
}
