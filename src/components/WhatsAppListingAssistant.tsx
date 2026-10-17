import { useState } from 'react';
import {
  X, Copy, Check, MessageCircle, FlaskConical, ChevronDown, ChevronUp,
  ImagePlus, AlertCircle, Send
} from 'lucide-react';
import type { Listing } from '@/data/listings';

interface WhatsAppListingAssistantProps {
  onClose: () => void;
  onCreateDemoListing: (listing: Listing) => void;
}

const SUPPORT_WHATSAPP = '919876543210';
const showDemoSimulator = import.meta.env.VITE_ENABLE_WHATSAPP_DEMO === 'true';
const LISTING_TEMPLATE = `Area / Locality: [e.g. Navrangpura / Bodakdev]
Host Type: [PG Owner / Existing Flatmate]
Room Type: [Single / 2-Sharing / 3-Sharing]
Monthly Rent: ₹[e.g. 8500]
Deposit: ₹[amount, or 0]
Maintenance: [Included / ₹ Extra: amount]
Food / Mess: [Included in Rent / ₹ Extra: amount / Self-Cooking Kitchen Allowed / No Cooking]
Electricity: [Included in Rent / Sub-meter as per usage / Fixed ₹/month: amount]
Wi-Fi: [Included / Shared Split: amount per month]
Water: [Included / Shared Split: amount per month]
Gender: [Any / Male Only / Female Only]
Food Habit Allowed: [Strict Pure Veg Only / Eggetarian / Non-Veg Friendly]
Curfew: [No Curfew / 10:30 PM / 11:00 PM]
Guests: [Daytime Visitors Only / Overnight Allowed / No Outside Guests]
Work Preference: [Student Friendly / WFH / Working Professionals]
Attached: [At least 2 photos & optional 30s Walkthrough Video]`;

const SAMPLE_SUBMISSION = `Area / Locality: Bodakdev
Host Type: PG Owner
Room Type: 2-Sharing
Monthly Rent: ₹12500
Deposit: ₹12500
Maintenance: ₹ Extra: 1000
Food / Mess: ₹ Extra: 2500
Electricity: Sub-meter as per usage
Wi-Fi: Shared Split: 300 per month
Water: Included
Gender: Female Only
Food Habit Allowed: Eggetarian
Curfew: 11:00 PM
Guests: Overnight Allowed
Work Preference: WFH / Working Professionals
Attached: 2 photos & 30s Walkthrough Video`;

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=800&q=80',
];

function readField(text: string, name: string): string {
  const line = text.split(/\r?\n/).find((item) => item.trim().toLowerCase().startsWith(`${name.toLowerCase()}:`));
  return line?.slice(line.indexOf(':') + 1).trim() ?? '';
}

function parseAmount(value: string): number {
  return Number(value.replace(/[^\d]/g, '')) || 0;
}

function parseDemoListing(text: string): Listing {
  const neighborhood = readField(text, 'Area / Locality') || readField(text, 'Locality');
  const rentText = readField(text, 'Monthly Rent') || readField(text, 'Rent');
  const roomType = readField(text, 'Room Type');
  const baseRent = parseAmount(rentText);
  const genderText = readField(text, 'Gender').toLowerCase();
  const foodHabitText = readField(text, 'Food Habit Allowed') || readField(text, 'Food Policy');
  const foodHabit = foodHabitText.toLowerCase();
  const curfewText = readField(text, 'Curfew');
  const guestPolicy = readField(text, 'Guests');
  const workPreferenceText = readField(text, 'Work Preference').toLowerCase();
  const hostTypeText = readField(text, 'Host Type').toLowerCase();
  const messOption = readField(text, 'Food / Mess') || readField(text, 'Mess');
  const electricityOption = readField(text, 'Electricity');
  const maintenanceText = readField(text, 'Maintenance');
  const wifiText = readField(text, 'Wi-Fi');
  const waterText = readField(text, 'Water');
  const requiredFields = [
    ['Area / Locality', neighborhood],
    ['Host Type', hostTypeText],
    ['Room Type', roomType],
    ['Monthly Rent', rentText],
    ['Maintenance', maintenanceText],
    ['Food / Mess', messOption],
    ['Electricity', electricityOption],
    ['Wi-Fi', wifiText],
    ['Water', waterText],
    ['Gender', genderText],
    ['Food Habit Allowed', foodHabitText],
    ['Curfew', curfewText],
    ['Guests', guestPolicy],
    ['Work Preference', workPreferenceText],
  ];
  const missingFields = requiredFields.filter(([, value]) => !value).map(([name]) => name);
  if (missingFields.length > 0) {
    throw new Error(`Complete these listing fields before processing: ${missingFields.join(', ')}.`);
  }
  if (!Number.isFinite(baseRent) || baseRent <= 0) {
    throw new Error('Enter a valid monthly rent greater than zero.');
  }

  const maintenanceIncluded = !maintenanceText.toLowerCase().includes('extra');
  const maintenanceFee = maintenanceIncluded ? 0 : parseAmount(maintenanceText);
  const messAmount = parseAmount(messOption);
  const electricityAmount = parseAmount(electricityOption);
  const wifiIncluded = !wifiText.toLowerCase().includes('shared');
  const waterIncluded = !waterText.toLowerCase().includes('shared');
  const wifiAmount = wifiIncluded ? 0 : parseAmount(wifiText);
  const waterAmount = waterIncluded ? 0 : parseAmount(waterText);
  const electricityFixed = electricityOption.toLowerCase().includes('fixed');
  const isStrictVeg = foodHabit.includes('strict pure veg');
  const isEggetarian = foodHabit.includes('eggetarian');
  const isNonVeg = foodHabit.includes('non-veg');
  const noCurfew = curfewText.toLowerCase().includes('no curfew');
  const hostType: Listing['hostType'] = hostTypeText.includes('flatmate')
    ? 'tenant'
    : hostTypeText.includes('pg owner')
      ? 'pg'
      : (() => { throw new Error('Host Type must be PG Owner or Existing Flatmate.'); })();
  const optionErrors: string[] = [];
  if (!['single', '2-sharing', '3-sharing'].some((option) => roomType.toLowerCase().includes(option))) {
    optionErrors.push('Room Type must be Single, 2-Sharing, or 3-Sharing');
  }
  if (!maintenanceIncluded && maintenanceFee <= 0) optionErrors.push('enter the extra maintenance amount');
  if (messOption.toLowerCase().includes('extra') && messAmount <= 0) optionErrors.push('enter the extra food/mess amount');
  if (electricityFixed && electricityAmount <= 0) optionErrors.push('enter the fixed electricity amount');
  if (!wifiIncluded && wifiAmount <= 0) optionErrors.push('enter the shared Wi-Fi amount');
  if (!waterIncluded && waterAmount <= 0) optionErrors.push('enter the shared water amount');
  if (optionErrors.length > 0) {
    throw new Error(`Please ${optionErrors.join(', ')}.`);
  }
  const gender: Listing['gender'] = genderText.includes('male only') && !genderText.includes('female')
    ? 'male'
    : genderText.includes('female only')
      ? 'female'
      : genderText.includes('any')
        ? 'any'
        : (() => { throw new Error('Gender must be Any, Male Only, or Female Only.'); })();
  if (!isStrictVeg && !isEggetarian && !isNonVeg) {
    throw new Error('Food Habit Allowed must be Strict Pure Veg Only, Eggetarian, or Non-Veg Friendly.');
  }
  const foodPolicy: Listing['foodPolicy'] = isStrictVeg ? 'strict-veg' : isEggetarian ? 'eggetarian' : 'non-veg';
  const foodLabel = isStrictVeg ? 'Strict Pure Veg Only' : isEggetarian ? 'Eggetarian' : 'Non-Veg Friendly';
  const workPreference = workPreferenceText.includes('student')
    ? 'Student Friendly'
    : workPreferenceText.includes('wfh') || workPreferenceText.includes('working')
      ? 'WFH / Working Professionals'
      : (() => { throw new Error('Work Preference must be Student Friendly or WFH / Working Professionals.'); })();
  const normalizedRoomType = roomType.toLowerCase().includes('single')
    ? 'Single Private'
    : roomType;
  const tags = [
    isStrictVeg ? 'Strict Veg' : isEggetarian ? 'Eggetarian' : 'Non-Veg OK',
    ...(workPreference.startsWith('WFH') ? ['Work from Home friendly'] : ['Student Zone']),
    ...(noCurfew ? ['No Curfew'] : []),
  ];
  const matchPoints = [
    { label: `${foodLabel} kitchen`, type: 'match' as const },
    { label: noCurfew ? 'No curfew — full freedom' : `Curfew ${curfewText}`, type: 'match' as const },
    { label: guestPolicy, type: guestPolicy.toLowerCase().includes('overnight') ? 'match' as const : 'mismatch' as const },
    { label: workPreference, type: 'match' as const },
  ];
  const id = `wa-demo-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

  return {
    id,
    title: `${roomType} ${hostType === 'pg' ? 'PG' : 'Flatmate Listing'} in ${neighborhood}`,
    neighborhood,
    image: SAMPLE_PHOTOS[0],
    hostType,
    hostLabel: 'Listed via WhatsApp',
    baseRent,
    mess: messOption.toLowerCase().includes('extra') ? messAmount : 0,
    bills: 0,
    electricity: electricityFixed ? electricityAmount : 0,
    wifi: wifiAmount,
    water: waterAmount,
    maintenance: 0,
    maintenanceIncluded,
    maintenanceFee,
    deposit: parseAmount(readField(text, 'Deposit')),
    matchScore: 75,
    tags: ['Listed via WhatsApp', ...tags],
    gender,
    foodPolicy,
    videoVerified: false,
    messOption,
    electricityOption,
    wifiIncluded,
    waterIncluded,
    foodHabit: foodLabel,
    guestPolicy,
    workPreference,
    sharingType: normalizedRoomType,
    curfew: noCurfew ? undefined : curfewText || undefined,
    promo: 'Listed via WhatsApp',
    matchPoints,
    hostPhone: '+91 98765 43210',
    hostWhatsApp: SUPPORT_WHATSAPP,
  };
}

export default function WhatsAppListingAssistant({ onClose, onCreateDemoListing }: WhatsAppListingAssistantProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoText, setDemoText] = useState(SAMPLE_SUBMISSION);
  const [demoError, setDemoError] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(LISTING_TEMPLATE);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  const handleDemoSubmit = () => {
    try {
      const listing = parseDemoListing(demoText);
      onCreateDemoListing(listing);
      onClose();
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : 'Could not process the demo listing.');
    }
  };

  const whatsAppHref = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(LISTING_TEMPLATE)}`;

  return (
    <div className="fixed inset-0 z-[125] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close WhatsApp listing assistant"
        className="absolute inset-0 animate-fade-in bg-navy-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-assistant-title"
        className="relative z-10 flex max-h-[94vh] w-full max-w-xl animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="relative bg-gradient-to-br from-navy-800 to-navy-700 px-6 py-5 text-white">
          <button
            onClick={onClose}
            aria-label="Close assistant"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <MessageCircle className="h-4 w-4" />
            Free host onboarding
          </div>
          <h2 id="whatsapp-assistant-title" className="mt-2 text-xl font-extrabold">
            Instant WhatsApp Listing Assistant
          </h2>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <h3 className="text-sm font-bold text-navy-800">
              Step 1: Copy our quick listing template or tap below to launch WhatsApp directly.
            </h3>
            <div className="mt-3 rounded-2xl border border-navy-200 bg-navy-50 p-4">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-6 text-navy-700">{LISTING_TEMPLATE}</pre>
              <button
                onClick={handleCopy}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white py-2.5 text-sm font-bold text-navy-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Template Copied' : '📋 Copy Template'}
              </button>
              {copyError && <p role="alert" className="mt-2 text-xs font-medium text-red-600">Copy failed. Please select and copy the template text.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <h3 className="text-sm font-bold text-emerald-800">
              Step 2: Send photos &amp; 30s video directly in chat.
            </h3>
            <p className="mt-1 text-xs leading-5 text-emerald-700">
              Our team verifies the details and activates your listing within 15 minutes.
            </p>
          </section>

          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-600"
          >
            <MessageCircle className="h-5 w-5" />
            🚀 Open WhatsApp with Template
          </a>

          {showDemoSimulator && (
            <section className="border-t border-navy-100 pt-4">
              <button
                onClick={() => setDemoOpen((open) => !open)}
                aria-expanded={demoOpen}
                className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-navy-700"
              >
                <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-coral-500" />🧪 Demo: Simulate Inbound WhatsApp Submission</span>
                {demoOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              {demoOpen && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {SAMPLE_PHOTOS.map((photo, index) => (
                      <div key={photo} className="relative h-24 overflow-hidden rounded-xl bg-navy-100">
                        <img src={photo} alt={`Sample Ahmedabad PG photo ${index + 1}`} className="h-full w-full object-cover" />
                        <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          <ImagePlus className="h-3 w-3" /> Sample photo {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  <label htmlFor="whatsapp-demo-text" className="block text-xs font-bold text-navy-600">Sample WhatsApp message (editable)</label>
                  <textarea
                    id="whatsapp-demo-text"
                    value={demoText}
                    onChange={(event) => { setDemoText(event.target.value); setDemoError(''); }}
                    rows={7}
                    className="w-full resize-y rounded-xl border border-navy-200 bg-white p-3 font-mono text-xs leading-5 text-navy-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  {demoError && (
                    <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-red-600">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{demoError}
                    </p>
                  )}
                  <button
                    onClick={handleDemoSubmit}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-700"
                  >
                    <Send className="h-4 w-4" />
                    Process WhatsApp Text &amp; Add to Live Feed
                  </button>
                  <p className="text-[11px] leading-4 text-navy-400">
                    Demo listings are added to this browser session only and are not sent to the database.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
