export type ListingType = 'pg' | 'tenant';
export type Gender = 'male' | 'female' | 'any';
export type FoodPolicy = 'strict-veg' | 'eggetarian' | 'non-veg' | 'any';

export interface QuizAnswers {
  food: string | null;
  schedule: string | null;
  curfew: string | null;
  social: string | null;
  gender: string | null;
}

export interface MatchPoint {
  label: string;
  type: 'match' | 'mismatch';
}

export interface FlatmateProfile {
  name: string;
  age: number;
  profession: string;
  bio: string;
  interests: string[];
  lifestyle: string[];
}

export interface Listing {
  id: string;
  ownerId?: string;
  availabilityStatus?: 'active' | 'full';
  totalBeds?: number;
  filledBeds?: number;
  title: string;
  neighborhood: string;
  image: string;
  images?: string[];
  hostType: ListingType;
  hostLabel: string;
  baseRent: number;
  mess: number;
  bills: number;
  electricity: number;
  wifi: number;
  water: number;
  maintenance: number;
  maintenanceIncluded?: boolean;
  maintenanceFee?: number;
  deposit: number;
  matchScore: number;
  tags: string[];
  gender: Gender;
  foodPolicy: FoodPolicy;
  videoVerified: boolean;
  videoUrl?: string;
  messOption?: string;
  electricityOption?: string;
  wifiIncluded?: boolean;
  waterIncluded?: boolean;
  foodHabit?: string;
  guestPolicy?: string;
  workPreference?: string;
  sharingType: string;
  curfew?: string;
  zeroDeposit?: boolean;
  promo?: string;
  matchPoints: MatchPoint[];
  flatmateProfile?: FlatmateProfile;
  hostPhone: string;
  hostWhatsApp: string;
}

export const defaultQuizAnswers: QuizAnswers = {
  food: null,
  schedule: null,
  curfew: null,
  social: null,
  gender: null,
};

export const quizQuestions = [
  {
    key: 'food' as const,
    title: 'Dietary & Food Habits',
    subtitle: 'What best describes your food preference?',
    icon: 'Utensils',
    options: [
      { label: 'Strict Pure Veg Only' },
      { label: 'Eggetarian' },
      { label: 'Non-Veg Friendly' },
    ],
  },
  {
    key: 'schedule' as const,
    title: 'Sleeping & Daily Schedule',
    subtitle: 'When are you typically active?',
    icon: 'Sun',
    options: [
      { label: 'Early Riser (Sleep by 10-11 PM)' },
      { label: 'Night Owl (Active post-midnight)' },
      { label: 'Flexible / Mixed' },
    ],
  },
  {
    key: 'curfew' as const,
    title: 'Curfew & Late-Night Freedom',
    subtitle: 'How important is late-night access to you?',
    icon: 'Clock',
    options: [
      { label: 'Need 24/7 Access (No Curfew)' },
      { label: 'Okay with 11 PM Curfew' },
      { label: 'Strict/Early Entry is Fine' },
    ],
  },
  {
    key: 'social' as const,
    title: 'Social Vibe & Guests',
    subtitle: 'What is your ideal social atmosphere?',
    icon: 'Users',
    options: [
      { label: 'Peaceful & Private (Rarely bring guests)' },
      { label: 'Social / Friends & Weekend Hangouts' },
      { label: 'Overnight Visitors Allowed' },
    ],
  },
  {
    key: 'gender' as const,
    title: 'Gender Preference',
    subtitle: 'Which living arrangement do you prefer?',
    icon: 'UserCircle',
    options: [
      { label: 'Male Only' },
      { label: 'Female Only' },
      { label: 'Any / Co-Living' },
    ],
  },
];

export const listings: Listing[] = [
  {
    id: '1',
    title: '2-Sharing PG Room with Attached Balcony',
    neighborhood: 'Navrangpura',
    image: 'https://images.pexels.com/photos/6933767/pexels-photo-6933767.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hostType: 'pg',
    hostLabel: 'PG Host',
    baseRent: 8500,
    mess: 3500,
    bills: 800,
    electricity: 500,
    wifi: 300,
    water: 200,
    maintenance: 0,
    maintenanceIncluded: true,
    maintenanceFee: 0,
    deposit: 5000,
    matchScore: 88,
    tags: ['Strict Veg', 'Work from Home friendly', 'Food Included'],
    gender: 'male',
    foodPolicy: 'strict-veg',
    videoVerified: true,
    sharingType: '2-Sharing',
    curfew: '10:30 PM',
    matchPoints: [
      { label: 'Strict Veg kitchen', type: 'match' },
      { label: 'WFH-friendly quiet hours', type: 'match' },
      { label: 'Early riser friendly (natural light)', type: 'match' },
      { label: 'No smoking policy', type: 'match' },
      { label: '10:30 PM curfew may be restrictive', type: 'mismatch' },
    ],
    hostPhone: '+91 98250 12345',
    hostWhatsApp: '919825012345',
  },
  {
    id: '2',
    title: '1 Empty Bed in 2-BHK Flat — Fully Furnished',
    neighborhood: 'SG Highway',
    image: 'https://images.pexels.com/photos/6934170/pexels-photo-6934170.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hostType: 'tenant',
    hostLabel: 'Listed by Tenant Rohan',
    baseRent: 12000,
    mess: 0,
    bills: 1200,
    electricity: 800,
    wifi: 400,
    water: 200,
    maintenance: 0,
    maintenanceIncluded: false,
    maintenanceFee: 1500,
    deposit: 12000,
    matchScore: 76,
    tags: ['Non-Veg OK', 'Work from Home friendly', 'No Curfew'],
    gender: 'any',
    foodPolicy: 'any',
    videoVerified: true,
    sharingType: '1 Bed in 2-BHK',
    matchPoints: [
      { label: 'No curfew — full freedom', type: 'match' },
      { label: 'Non-veg friendly kitchen', type: 'match' },
      { label: 'WFH desk setup available', type: 'match' },
      { label: 'Social drinker compatible', type: 'match' },
      { label: 'No mess — self-cooking required', type: 'mismatch' },
    ],
    hostPhone: '+91 99100 67890',
    hostWhatsApp: '919910067890',
    flatmateProfile: {
      name: 'Rohan Mehta',
      age: 26,
      profession: 'Software Engineer at Tech Corp',
      bio: 'Easy-going techie who loves weekend cricket and cooking. Looking for a flatmate who is chill, clean, and respects shared spaces. I work hybrid so Im home 2-3 days a week.',
      interests: ['Cricket', 'Cooking', 'Tech', 'Netflix'],
      lifestyle: ['Hybrid worker', 'Social drinker', 'Non-smoker', 'Weekend chill'],
    },
  },
  {
    id: '3',
    title: 'Private Single Room in Managed PG',
    neighborhood: 'Prahlad Nagar',
    image: 'https://images.pexels.com/photos/5710702/pexels-photo-5710702.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hostType: 'pg',
    hostLabel: 'PG Host',
    baseRent: 15000,
    mess: 4000,
    bills: 1000,
    electricity: 600,
    wifi: 350,
    water: 200,
    maintenance: 50,
    maintenanceIncluded: true,
    maintenanceFee: 0,
    deposit: 8000,
    matchScore: 82,
    tags: ['Strict Veg', 'AC Room', 'Curfew 11 PM'],
    gender: 'female',
    foodPolicy: 'strict-veg',
    videoVerified: true,
    sharingType: 'Single Private',
    curfew: '11:00 PM',
    matchPoints: [
      { label: 'Strict Veg kitchen', type: 'match' },
      { label: 'Private AC room — no sharing', type: 'match' },
      { label: 'Maid-managed cleaning', type: 'match' },
      { label: 'Quiet, study-friendly environment', type: 'match' },
      { label: '11 PM curfew may limit late outings', type: 'mismatch' },
    ],
    hostPhone: '+91 90990 33221',
    hostWhatsApp: '919099033221',
  },
  {
    id: '4',
    title: '3-Sharing Student Room Near Gujarat University',
    neighborhood: 'Naranpura',
    image: 'https://images.pexels.com/photos/5137980/pexels-photo-5137980.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hostType: 'pg',
    hostLabel: 'PG Host',
    baseRent: 5500,
    mess: 2500,
    bills: 500,
    electricity: 300,
    wifi: 200,
    water: 200,
    maintenance: 0,
    maintenanceIncluded: true,
    maintenanceFee: 0,
    deposit: 0,
    matchScore: 71,
    tags: ['Strict Veg', 'Student Zone', 'Zero Deposit'],
    gender: 'any',
    foodPolicy: 'strict-veg',
    videoVerified: true,
    sharingType: '3-Sharing',
    curfew: '10:00 PM',
    zeroDeposit: true,
    promo: 'Zero Deposit',
    matchPoints: [
      { label: 'Zero deposit — instant move-in', type: 'match' },
      { label: 'Strict Veg mess included', type: 'match' },
      { label: 'Student-friendly zone near campus', type: 'match' },
      { label: 'Budget-friendly total outflow', type: 'match' },
      { label: '3-sharing may feel crowded', type: 'mismatch' },
      { label: '10 PM curfew — early for night owls', type: 'mismatch' },
    ],
    hostPhone: '+91 88667 44556',
    hostWhatsApp: '918866744556',
  },
];

export function computeMatchScore(listing: Listing, answers: QuizAnswers): number {
  if (!answers.food) return listing.matchScore;

  let score = 80;
  let dealbreaker = false;

  // Dimension 1: Food
  const userFood = answers.food;
  const listingFood = listing.foodHabit ?? (listing.foodPolicy === 'strict-veg' ? 'Strict Pure Veg Only' : 'Non-Veg Friendly');
  if (userFood === listingFood) {
    score += 8;
  } else if (userFood === 'Eggetarian' && listingFood === 'Strict Pure Veg Only') {
    score += 3;
  } else if (userFood === 'Eggetarian' && listingFood === 'Non-Veg Friendly') {
    score += 5;
  } else if (userFood === 'Non-Veg Friendly' && listingFood === 'Strict Pure Veg Only') {
    score -= 40;
    dealbreaker = true;
  } else if (userFood === 'Strict Pure Veg Only' && listingFood === 'Non-Veg Friendly') {
    score -= 25;
  } else {
    score -= 10;
  }

  // Dimension 2: Schedule
  const userSchedule = answers.schedule;
  const hasCurfew = !!listing.curfew && listing.curfew !== 'No Curfew (24/7 Access)';
  if (userSchedule === 'Early Riser (Sleep by 10-11 PM)') {
    score += hasCurfew ? 6 : 2;
  } else if (userSchedule === 'Night Owl (Active post-midnight)') {
    score += hasCurfew ? -12 : 8;
  } else {
    score += 3;
  }

  // Dimension 3: Curfew preference
  const userCurfew = answers.curfew;
  if (userCurfew === 'Need 24/7 Access (No Curfew)') {
    score += hasCurfew ? -15 : 10;
  } else if (userCurfew === 'Okay with 11 PM Curfew') {
    if (!hasCurfew) score -= 3;
    else if (listing.curfew === '11:00 PM') score += 8;
    else score += 2;
  } else {
    score += hasCurfew ? 7 : -3;
  }

  // Dimension 4: Social
  const userSocial = answers.social;
  const listingGuest = listing.guestPolicy ?? '';
  if (userSocial === 'Peaceful & Private (Rarely bring guests)') {
    score += 5;
  } else if (userSocial === 'Social / Friends & Weekend Hangouts') {
    score += listingGuest.toLowerCase().includes('allowed') || listingGuest.toLowerCase().includes('yes') ? 8 : 3;
  } else if (userSocial === 'Overnight Visitors Allowed') {
    score += listingGuest.toLowerCase().includes('overnight') ? 10 : -5;
  }

  if (dealbreaker) score = Math.min(score, 48);

  // Dimension 5: Gender
  if (answers.gender) {
    const listingGender = listing.gender ?? 'any';
    if (answers.gender === 'Any / Co-Living') {
      score += 3;
    } else if (answers.gender === 'Male Only') {
      score += listingGender === 'male' ? 8 : listingGender === 'any' ? 4 : -20;
      if (listingGender === 'female') dealbreaker = true;
    } else if (answers.gender === 'Female Only') {
      score += listingGender === 'female' ? 8 : listingGender === 'any' ? 4 : -20;
      if (listingGender === 'male') dealbreaker = true;
    }
  }

  if (dealbreaker) score = Math.min(score, 48);
  return Math.max(30, Math.min(99, score));
}

export function computeMatchPoints(listing: Listing, answers: QuizAnswers): MatchPoint[] {
  const points: MatchPoint[] = [];
  if (!answers.food) return listing.matchPoints;

  // Food dimension
  const listingFood = listing.foodHabit ?? (listing.foodPolicy === 'strict-veg' ? 'Strict Pure Veg Only' : 'Non-Veg Friendly');
  if (answers.food === listingFood) {
    const label = listingFood === 'Strict Pure Veg Only'
      ? 'Both prefer pure veg'
      : listingFood === 'Eggetarian'
        ? 'Both eggetarian'
        : 'Both non-veg friendly';
    points.push({ label, type: 'match' });
  } else if (answers.food === 'Non-Veg Friendly' && listingFood === 'Strict Pure Veg Only') {
    points.push({ label: 'Dealbreaker: you want non-veg but kitchen is strict veg', type: 'mismatch' });
  } else if (answers.food === 'Strict Pure Veg Only' && listingFood === 'Non-Veg Friendly') {
    points.push({ label: 'You prefer pure veg, but kitchen allows non-veg', type: 'mismatch' });
  } else {
    points.push({ label: 'Food preferences partially align', type: 'mismatch' });
  }

  // Schedule dimension
  const hasCurfew = !!listing.curfew && listing.curfew !== 'No Curfew (24/7 Access)';
  if (answers.schedule === 'Early Riser (Sleep by 10-11 PM)') {
    points.push({ label: hasCurfew ? 'Curfew fits your early-riser schedule' : 'Flexible timing suits early risers', type: 'match' });
  } else if (answers.schedule === 'Night Owl (Active post-midnight)') {
    points.push({ label: hasCurfew ? `Curfew ${listing.curfew} conflicts with night-owl lifestyle` : 'No curfew matches your night-owl schedule', type: hasCurfew ? 'mismatch' : 'match' });
  } else {
    points.push({ label: 'Your flexible schedule works here', type: 'match' });
  }

  // Curfew dimension
  if (answers.curfew === 'Need 24/7 Access (No Curfew)') {
    points.push({ label: hasCurfew ? 'This place has a curfew — not 24/7 access' : 'No curfew matches your 24/7 access need', type: hasCurfew ? 'mismatch' : 'match' });
  } else if (answers.curfew === 'Okay with 11 PM Curfew') {
    if (hasCurfew) {
      points.push({ label: listing.curfew === '11:00 PM' ? 'Curfew matches your 11 PM expectation' : `Curfew ${listing.curfew} is within your comfort zone`, type: 'match' });
    } else {
      points.push({ label: 'You prefer an 11 PM curfew, but this place has no curfew', type: 'mismatch' });
    }
  } else {
    if (hasCurfew) {
      points.push({ label: 'Early entry curfew is fine with you', type: 'match' });
    } else {
      points.push({ label: 'You prefer a strict/early curfew, but this place has no curfew', type: 'mismatch' });
    }
  }

  // Social dimension
  if (answers.social === 'Peaceful & Private (Rarely bring guests)') {
    points.push({ label: 'Quiet, private vibe suits your lifestyle', type: 'match' });
  } else if (answers.social === 'Social / Friends & Weekend Hangouts') {
    points.push({ label: 'Social-friendly environment for weekend hangouts', type: 'match' });
  } else if (answers.social === 'Overnight Visitors Allowed') {
    const allowsOvernight = listing.guestPolicy?.toLowerCase().includes('overnight') ?? false;
    points.push({ label: allowsOvernight ? 'Overnight visitors are allowed' : 'Overnight visitors may not be permitted', type: allowsOvernight ? 'match' : 'mismatch' });
  }

  // Gender dimension
  if (answers.gender) {
    const listingGender = listing.gender ?? 'any';
    if (answers.gender === 'Any / Co-Living') {
      points.push({ label: 'No gender preference — open to co-living', type: 'match' });
    } else if (answers.gender === 'Male Only') {
      if (listingGender === 'male') points.push({ label: 'Male-only residence matches your preference', type: 'match' });
      else if (listingGender === 'any') points.push({ label: 'Co-living space — male residents welcome', type: 'match' });
      else points.push({ label: 'Dealbreaker: you want male-only but this is female-only', type: 'mismatch' });
    } else if (answers.gender === 'Female Only') {
      if (listingGender === 'female') points.push({ label: 'Female-only residence matches your preference', type: 'match' });
      else if (listingGender === 'any') points.push({ label: 'Co-living space — female residents welcome', type: 'match' });
      else points.push({ label: 'Dealbreaker: you want female-only but this is male-only', type: 'mismatch' });
    }
  }

  return points;
}
