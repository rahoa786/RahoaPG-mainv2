import { supabase } from '@/lib/supabase';
import { listings as mockListings, type Listing, type ListingType, type Gender, type FoodPolicy, type MatchPoint, type FlatmateProfile } from '@/data/listings';

export interface ListingRow {
  id: string;
  owner_id: string | null;
  title: string;
  neighborhood: string;
  image: string | null;
  gallery_images: string[] | null;
  host_type: string;
  host_label: string;
  base_rent: number;
  mess: number;
  bills: number;
  electricity: number;
  wifi: number;
  water: number;
  maintenance: number;
  maintenance_included: boolean;
  maintenance_fee: number;
  deposit: number;
  match_score: number;
  tags: string[] | null;
  gender: string | null;
  food_policy: string | null;
  video_verified: boolean;
  video_url: string | null;
  mess_option: string | null;
  electricity_option: string | null;
  wifi_included: boolean;
  water_included: boolean;
  food_habit: string | null;
  guest_policy: string | null;
  work_preference: string | null;
  sharing_type: string;
  curfew: string | null;
  zero_deposit: boolean;
  promo: string | null;
  match_points: MatchPoint[] | null;
  flatmate_profile: FlatmateProfile | null;
  host_phone: string | null;
  host_whatsapp: string | null;
  created_at: string;
  availability_status: 'active' | 'full';
  total_beds: number;
  filled_beds: number;
  legal_declaration_accepted: boolean;
  legal_declaration_accepted_at: string | null;
  legal_declaration_version: string | null;
}

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    ownerId: row.owner_id ?? undefined,
    availabilityStatus: row.availability_status,
    totalBeds: row.total_beds,
    filledBeds: row.filled_beds,
    title: row.title,
    neighborhood: row.neighborhood,
    image: row.image ?? '',
    images: row.gallery_images ?? (row.image ? [row.image] : []),
    hostType: row.host_type as ListingType,
    hostLabel: row.host_label,
    baseRent: row.base_rent,
    mess: row.mess,
    bills: row.bills,
    electricity: row.electricity,
    wifi: row.wifi,
    water: row.water ?? 0,
    maintenance: row.maintenance,
    maintenanceIncluded: row.maintenance_included,
    maintenanceFee: row.maintenance_fee ?? 0,
    deposit: row.deposit,
    matchScore: row.match_score,
    tags: row.tags ?? [],
    gender: (row.gender as Gender) ?? 'any',
    foodPolicy: (row.food_policy as FoodPolicy) ?? 'any',
    videoVerified: row.video_verified,
    videoUrl: row.video_url ?? undefined,
    messOption: row.mess_option ?? undefined,
    electricityOption: row.electricity_option ?? undefined,
    wifiIncluded: row.wifi_included,
    waterIncluded: row.water_included,
    foodHabit: row.food_habit ?? undefined,
    guestPolicy: row.guest_policy ?? undefined,
    workPreference: row.work_preference ?? undefined,
    sharingType: row.sharing_type,
    curfew: row.curfew ?? undefined,
    zeroDeposit: row.zero_deposit || undefined,
    promo: row.promo ?? undefined,
    matchPoints: row.match_points ?? [],
    flatmateProfile: row.flatmate_profile ?? undefined,
    hostPhone: row.host_phone ?? '',
    hostWhatsApp: row.host_whatsapp ?? '',
  };
}

function listingToRow(listing: Listing): Omit<ListingRow, 'id' | 'created_at'> {
  return {
    owner_id: listing.ownerId ?? null,
    title: listing.title,
    neighborhood: listing.neighborhood,
    image: listing.image,
    gallery_images: listing.images?.length ? listing.images : listing.image ? [listing.image] : [],
    host_type: listing.hostType,
    host_label: listing.hostLabel,
    base_rent: listing.baseRent,
    mess: listing.mess,
    bills: listing.bills,
    electricity: listing.electricity,
    wifi: listing.wifi,
    water: listing.water,
    maintenance: listing.maintenance,
    maintenance_included: listing.maintenanceIncluded ?? true,
    maintenance_fee: listing.maintenanceFee ?? 0,
    deposit: listing.deposit,
    match_score: listing.matchScore,
    tags: listing.tags,
    gender: listing.gender,
    food_policy: listing.foodPolicy,
    video_verified: listing.videoVerified,
    video_url: listing.videoUrl ?? null,
    mess_option: listing.messOption ?? null,
    electricity_option: listing.electricityOption ?? null,
    wifi_included: listing.wifiIncluded ?? true,
    water_included: listing.waterIncluded ?? true,
    food_habit: listing.foodHabit ?? null,
    guest_policy: listing.guestPolicy ?? null,
    work_preference: listing.workPreference ?? null,
    sharing_type: listing.sharingType,
    curfew: listing.curfew ?? null,
    zero_deposit: listing.zeroDeposit ?? false,
    promo: listing.promo ?? null,
    match_points: listing.matchPoints,
    flatmate_profile: listing.flatmateProfile ?? null,
    host_phone: listing.hostPhone,
    host_whatsapp: listing.hostWhatsApp,
    availability_status: 'active',
    total_beds: Number(listing.sharingType.match(/\d+/)?.[0] ?? 1),
    filled_beds: 0,
    legal_declaration_accepted: !!listing.ownerId,
    legal_declaration_accepted_at: listing.ownerId ? new Date().toISOString() : null,
    legal_declaration_version: listing.ownerId ? '2026-10-03' : null,
  };
}

export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch listings from Supabase:', error.message);
    return mockListings;
  }

  if (!data || data.length === 0) {
    return mockListings;
  }

  return (data as ListingRow[]).map(rowToListing);
}

export async function insertListing(listing: Listing, ownerId: string): Promise<{ listing: Listing | null; errorMessage: string | null }> {
  const insertRow = listingToRow({ ...listing, ownerId });

  if (insertRow.image && insertRow.image.startsWith('blob:')) {
    insertRow.image = null;
  }

  const { data, error } = await supabase
    .from('listings')
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    console.error('Supabase insert failed. Full response:', { data, error });
    return { listing: null, errorMessage: error.message };
  }

  return { listing: rowToListing(data as ListingRow), errorMessage: null };
}

export async function updateListing(listing: Listing): Promise<{ listing: Listing | null; errorMessage: string | null }> {
  const updateRow = listingToRow(listing);
  if (updateRow.image && updateRow.image.startsWith('blob:')) {
    updateRow.image = null;
  }

  const { data, error } = await supabase
    .from('listings')
    .update(updateRow)
    .eq('id', listing.id)
    .select()
    .single();

  if (error) {
    console.error('Supabase listing update failed:', error.message);
    return { listing: null, errorMessage: error.message };
  }

  return { listing: rowToListing(data as ListingRow), errorMessage: null };
}
