import { useState, useRef } from 'react';
import {
  X, Check, AlertTriangle, BadgeCheck, IndianRupee,
  Home, Utensils, Zap, Wifi, Clock, Leaf, Users, Briefcase, ChevronRight,
  ChevronLeft, ImagePlus, ShieldCheck, Loader2, AlertCircle, Trash2, Camera, Rocket,
  Building, MessageCircle
} from 'lucide-react';
import type { Listing, ListingType, Gender } from '@/data/listings';
import { uploadImageToCloudinary, uploadVideoToCloudinary, MAX_FILE_SIZE } from '@/lib/cloudinary';

interface HostListingModalProps {
  onClose: () => void;
  onPublish: (listing: Listing) => void;
  onWhatsAppClick: () => void;
}

const AREAS = ['Navrangpura', 'SG Highway', 'Prahlad Nagar', 'Bodakdev', 'Vastrapur', 'Satellite'];

const ROOM_TYPES = ['Single Private Room', '2-Sharing', '3-Sharing'];

const CURFEW_OPTIONS = ['No Curfew (24/7 Access)', '10:30 PM', '11:00 PM'];
const FOOD_OPTIONS = ['Strict Pure Veg Only', 'Eggetarian', 'Non-Veg Friendly'];
const GUEST_OPTIONS = ['Daytime Visitors Only', 'Overnight Allowed', 'No Outside Guests'];
const WORK_OPTIONS = ['Student Friendly', 'WFH / Working Professionals'];

const FOOD_MESS_OPTIONS = ['Included in Rent', '₹ Extra / month', 'Self-Cooking Kitchen Allowed', 'No Cooking'];
const ELECTRICITY_OPTIONS = ['Included in Rent', 'Sub-meter as per usage', 'Fixed ₹/month'];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'any', label: 'Any / Co-Living' },
  { value: 'male', label: 'Male Only' },
  { value: 'female', label: 'Female Only' },
];

export default function HostListingModal({ onClose, onPublish, onWhatsAppClick }: HostListingModalProps) {
  const [step, setStep] = useState(1);

  // Step 1
  const [hostType, setHostType] = useState<ListingType>('pg');
  const [roomType, setRoomType] = useState('Single Private Room');
  const [area, setArea] = useState('');
  const [baseRent, setBaseRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [hostPhone, setHostPhone] = useState('');
  const [hostWhatsApp, setHostWhatsApp] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [replacingPhotoIndex, setReplacingPhotoIndex] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [messOption, setMessOption] = useState(FOOD_MESS_OPTIONS[0]);
  const [messExtra, setMessExtra] = useState('');
  const [electricityOption, setElectricityOption] = useState(ELECTRICITY_OPTIONS[0]);
  const [electricityFixed, setElectricityFixed] = useState('');
  const [wifiIncluded, setWifiIncluded] = useState(true);
  const [wifiShared, setWifiShared] = useState('');
  const [waterIncluded, setWaterIncluded] = useState(true);
  const [waterShared, setWaterShared] = useState('');
  const [maintenanceIncluded, setMaintenanceIncluded] = useState(true);
  const [maintenanceFee, setMaintenanceFee] = useState('');

  // Step 3
  const [curfew, setCurfew] = useState(CURFEW_OPTIONS[0]);
  const [foodHabit, setFoodHabit] = useState(FOOD_OPTIONS[0]);
  const [guests, setGuests] = useState(GUEST_OPTIONS[0]);
  const [workPref, setWorkPref] = useState(WORK_OPTIONS[0]);
  const [listingGender, setListingGender] = useState<Gender>('any');
  const [legalDeclarationAccepted, setLegalDeclarationAccepted] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!area) errs.area = 'Please select a locality';
    if (!baseRent || Number(baseRent) <= 0) errs.baseRent = 'Monthly rent is required';
    if (hostPhone.replace(/\D/g, '').length < 10) errs.hostPhone = 'Enter a valid host contact number';
    if (hostWhatsApp.replace(/\D/g, '').length < 10) errs.hostWhatsApp = 'Enter a valid WhatsApp number';
    if (photoCount < 2) errs.photos = 'At least 2 photos are required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!wifiIncluded && (!wifiShared || Number(wifiShared) <= 0)) errs.wifiShared = 'Enter the monthly shared Wi-Fi amount';
    if (!waterIncluded && (!waterShared || Number(waterShared) <= 0)) errs.waterShared = 'Enter the monthly shared water amount';
    if (!maintenanceIncluded && (!maintenanceFee || Number(maintenanceFee) <= 0)) errs.maintenanceFee = 'Enter the monthly maintenance amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const photoCount = photoUrls.length;
  const photosValid = photoCount >= 2;
  const canPublish = photosValid && !photoUploading && !videoUploading && legalDeclarationAccepted;

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handlePhotoClick = (index: number) => {
    if (photoUploading) return;
    if (photoUrls[index]) {
      setReplacingPhotoIndex(index);
    } else if (photoCount < 3) {
      setReplacingPhotoIndex(null);
    } else {
      return;
    }
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (allFiles.length === 0) return;

    const isReplacing = replacingPhotoIndex !== null;
    const files = isReplacing ? [allFiles[0]] : allFiles.slice(0, 3 - photoCount);
    const targetIndex = replacingPhotoIndex;

    setPhotoError('');
    setPhotoUploading(true);
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadImageToCloudinary(file)));
      setPhotoUrls((current) => {
        if (isReplacing && targetIndex !== null) {
          const updated = [...current];
          updated[targetIndex] = uploadedUrls[0];
          return updated;
        }
        return [...current, ...uploadedUrls];
      });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Image upload failed. Please try again.');
    } finally {
      setPhotoUploading(false);
      setReplacingPhotoIndex(null);
    }
  };

  const handlePhotoRemove = (index: number) => {
    setPhotoUrls((current) => current.filter((_, i) => i !== index));
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setVideoError('Video upload failed. Please choose a shorter clip (under 30s).');
      return;
    }

    setVideoError('');
    setVideoUploading(true);
    setVideoProgress(0);
    setVideoFileName(file.name);

    try {
      const secureUrl = await uploadVideoToCloudinary(file, (pct) => setVideoProgress(pct));
      setVideoUrl(secureUrl);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Video upload failed. Please choose a shorter clip (under 30s).');
      setVideoUrl('');
    } finally {
      setVideoUploading(false);
    }
  };

  const handleVideoRemove = () => {
    setVideoUrl('');
    setVideoFileName('');
    setVideoError('');
    setVideoProgress(0);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handlePublish = () => {
    if (!legalDeclarationAccepted) return;
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    const rent = Number(baseRent) || 0;
    const dep = Number(deposit) || 0;
    const messVal = messOption === '₹ Extra / month' ? (Number(messExtra) || 0) : 0;
    const elecVal = electricityOption === 'Fixed ₹/month' ? (Number(electricityFixed) || 0) : 0;
    const wifiVal = wifiIncluded ? 0 : Number(wifiShared);
    const waterVal = waterIncluded ? 0 : Number(waterShared);
    const maintVal = maintenanceIncluded ? 0 : Number(maintenanceFee);

    const isStrictVeg = foodHabit === 'Strict Pure Veg Only';
    const isEggitarian = foodHabit === 'Eggetarian';
    const isNoCurfew = curfew === 'No Curfew (24/7 Access)';
    const isStudent = workPref === 'Student Friendly';
    const isWfh = workPref === 'WFH / Working Professionals';

    const tags: string[] = [];
    if (isStrictVeg) tags.push('Strict Veg');
    else if (isEggitarian) tags.push('Eggetarian');
    else tags.push('Non-Veg OK');
    if (isWfh) tags.push('Work from Home friendly');
    if (isNoCurfew) tags.push('No Curfew');
    if (isStudent) tags.push('Student Zone');
    if (dep === 0) tags.push('Zero Deposit');

    const matchPoints = [
      { label: isStrictVeg ? 'Strict Veg kitchen' : isEggitarian ? 'Eggetarian kitchen' : 'Non-veg friendly kitchen', type: 'match' as const },
      { label: isNoCurfew ? 'No curfew — full freedom' : `Curfew ${curfew}`, type: isNoCurfew ? ('match' as const) : ('mismatch' as const) },
      { label: isWfh ? 'WFH-friendly setup' : 'Student-friendly environment', type: 'match' as const },
      { label: messOption === 'Included in Rent' ? 'Mess included in rent' : messOption, type: 'match' as const },
      { label: guests, type: 'match' as const },
    ];

    const sharingType = roomType === 'Single Private Room' ? 'Single Private' : roomType;

    const newListing: Listing = {
      id: `user-${Date.now()}`,
      title: `${roomType} in ${area}`,
      neighborhood: area,
      image: photoUrls[0] ?? '',
      images: photoUrls,
      hostType,
      hostLabel: hostType === 'pg' ? 'PG Host' : 'Listed by Flatmate',
      baseRent: rent,
      mess: messVal,
      bills: 0,
      electricity: elecVal,
      wifi: wifiVal,
      water: waterVal,
      maintenance: 0,
      maintenanceIncluded,
      maintenanceFee: maintVal,
      deposit: dep,
      matchScore: 75,
      tags,
      gender: listingGender,
      foodPolicy: isStrictVeg ? 'strict-veg' : 'any',
      videoVerified: !!videoUrl,
      videoUrl: videoUrl || undefined,
      messOption,
      electricityOption,
      wifiIncluded,
      waterIncluded,
      foodHabit,
      guestPolicy: guests,
      workPreference: workPref,
      sharingType,
      curfew: isNoCurfew ? undefined : curfew,
      zeroDeposit: dep === 0 || undefined,
      promo: 'Just Added',
      matchPoints,
      hostPhone,
      hostWhatsApp: hostWhatsApp.replace(/\D/g, ''),
    };

    onPublish(newListing);
  };

  const stepLabels = ['Property Info', 'Monthly Outflow', 'House Rules'];

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-navy-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header with progress */}
        <div className="border-b border-navy-100 bg-white px-6 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-navy-800">Post a Listing</h2>
              <p className="text-xs text-navy-400">Step {step} of 3 · {stepLabels[step - 1]}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-navy-600 transition-all hover:bg-navy-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    s < step
                      ? 'bg-emerald-500 text-white'
                      : s === step
                        ? 'bg-coral-500 text-white shadow-md shadow-coral-500/30'
                        : 'bg-navy-100 text-navy-400'
                  }`}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`h-0.5 flex-1 rounded-full transition-all ${s < step ? 'bg-emerald-500' : 'bg-navy-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="animate-fade-in space-y-5">
              {/* Host type toggle */}
              <div>
                <label className="mb-2 block text-sm font-bold text-navy-800">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setHostType('pg')}
                    className={`flex items-center gap-2 rounded-xl border-2 p-3.5 text-left transition-all ${
                      hostType === 'pg' ? 'border-coral-400 bg-coral-50/50' : 'border-navy-200 hover:border-navy-300'
                    }`}
                  >
                    <Home className={`h-5 w-5 ${hostType === 'pg' ? 'text-coral-500' : 'text-navy-400'}`} />
                    <div>
                      <div className="text-sm font-bold text-navy-800">PG Owner / Manager</div>
                      <div className="text-[11px] text-navy-400">Running a managed PG</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="host-phone" className="mb-2 block text-sm font-bold text-navy-800">Host contact number</label>
                        <input id="host-phone" type="tel" autoComplete="tel" value={hostPhone} onChange={(event) => setHostPhone(event.target.value)} placeholder="+91 98765 43210" className="w-full rounded-xl border-2 border-navy-200 px-3 py-3 text-sm outline-none focus:border-coral-400" />
                        {errors.hostPhone && <p className="mt-1 text-xs font-semibold text-red-500">{errors.hostPhone}</p>}
                      </div>
                      <div>
                        <label htmlFor="host-whatsapp" className="mb-2 block text-sm font-bold text-navy-800">WhatsApp number</label>
                        <input id="host-whatsapp" type="tel" value={hostWhatsApp} onChange={(event) => setHostWhatsApp(event.target.value)} placeholder="919876543210" className="w-full rounded-xl border-2 border-navy-200 px-3 py-3 text-sm outline-none focus:border-coral-400" />
                        {errors.hostWhatsApp && <p className="mt-1 text-xs font-semibold text-red-500">{errors.hostWhatsApp}</p>}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setHostType('tenant')}
                    className={`flex items-center gap-2 rounded-xl border-2 p-3.5 text-left transition-all ${
                      hostType === 'tenant' ? 'border-coral-400 bg-coral-50/50' : 'border-navy-200 hover:border-navy-300'
                    }`}
                  >
                    <Users className={`h-5 w-5 ${hostType === 'tenant' ? 'text-coral-500' : 'text-navy-400'}`} />
                    <div>
                      <div className="text-sm font-bold text-navy-800">Existing Flatmate</div>
                      <div className="text-[11px] text-navy-400">Sharing an empty bed</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sublet warning for tenant */}
              {hostType === 'tenant' && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 animate-fade-in">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <p className="text-xs font-medium text-amber-700">
                    Check: Ensure your main tenancy agreement allows sharing/subletting before listing.
                  </p>
                </div>
              )}

              {/* Room type selector */}
              <div>
                <label className="mb-2 block text-sm font-bold text-navy-800">Room Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROOM_TYPES.map((rt) => (
                    <button
                      key={rt}
                      onClick={() => setRoomType(rt)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                        roomType === rt
                          ? 'border-coral-400 bg-coral-50/50 text-coral-600'
                          : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      {rt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender preference */}
              <div>
                <label className="mb-2 block text-sm font-bold text-navy-800">Gender Preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setListingGender(opt.value)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                        listingGender === opt.value
                          ? 'border-coral-400 bg-coral-50/50 text-coral-600'
                          : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Locality dropdown */}
              <div>
                <label className="mb-2 block text-sm font-bold text-navy-800">Locality / Area</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium outline-none transition-all ${
                    errors.area ? 'border-red-400' : 'border-navy-200 focus:border-coral-400'
                  }`}
                >
                  <option value="">Select a locality...</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                {errors.area && <p className="mt-1 text-xs font-semibold text-red-500">{errors.area}</p>}
              </div>

              {/* Rent & deposit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-navy-800">Monthly Base Rent</label>
                  <div className={`flex items-center rounded-xl border-2 px-3 transition-all ${
                    errors.baseRent ? 'border-red-400' : 'border-navy-200 focus-within:border-coral-400'
                  }`}>
                    <IndianRupee className="h-4 w-4 text-navy-400" />
                    <input
                      type="number"
                      value={baseRent}
                      onChange={(e) => setBaseRent(e.target.value)}
                      placeholder="8,500"
                      className="w-full bg-transparent px-2 py-3 text-sm font-medium outline-none"
                    />
                  </div>
                  {errors.baseRent && <p className="mt-1 text-xs font-semibold text-red-500">{errors.baseRent}</p>}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-navy-800">Security Deposit</label>
                  <div className="flex items-center rounded-xl border-2 border-navy-200 px-3 transition-all focus-within:border-coral-400">
                    <IndianRupee className="h-4 w-4 text-navy-400" />
                    <input
                      type="number"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                      placeholder="5,000"
                      className="w-full bg-transparent px-2 py-3 text-sm font-medium outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-bold text-navy-800">Room Photos (up to 3)</label>
                  <span className={`text-xs font-bold ${photosValid ? 'text-emerald-600' : 'text-coral-500'}`}>
                    {photoUploading ? 'Uploading photos...' : `(Uploaded: ${photoCount}/2 minimum required)`}
                  </span>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all ${
                        i < photoCount
                          ? 'border-emerald-300 bg-emerald-50'
                          : i === photoCount
                            ? 'cursor-pointer border-navy-300 bg-navy-50/50 hover:border-coral-400 hover:bg-coral-50/30'
                            : 'border-navy-100 bg-navy-50/30 opacity-50'
                      }`}
                    >
                      {photoUrls[i] ? (
                        <>
                          <img
                            src={photoUrls[i]}
                            alt={`Room photo ${i + 1}`}
                            className="h-full w-full rounded-lg object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-navy-900/0 opacity-0 transition-all group-hover:bg-navy-900/40 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handlePhotoClick(i)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy-700 shadow-lg transition-all hover:bg-white"
                              title="Replace photo"
                            >
                              <ImagePlus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePhotoRemove(i)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-lg transition-all hover:bg-white"
                              title="Remove photo"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePhotoClick(i)}
                          className="flex h-full w-full flex-col items-center justify-center"
                          disabled={i > photoCount}
                        >
                          <ImagePlus className="h-6 w-6 text-navy-300" />
                          <span className="mt-1 text-[10px] font-medium text-navy-400">Photo {i + 1}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {photoError && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{photoError}</span>
                  </div>
                )}
                <div className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium ${photosValid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {photosValid ? (
                    <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {photosValid
                      ? 'Great! Your photos meet the minimum requirement.'
                      : 'Please upload at least 2 clear photos (e.g., bedroom and washroom/common area) to protect tenant trust.'}
                  </span>
                </div>
              </div>

              {/* Video upload */}
              <div>
                <label className="mb-2 block text-sm font-bold text-navy-800">30s Live Video Tour (Optional — Highly Recommended)</label>

                {/* Boost incentive callout */}
                <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-coral-200 bg-gradient-to-r from-coral-50 to-amber-50 px-4 py-3">
                  <Rocket className="h-4 w-4 shrink-0 text-coral-500 mt-0.5" />
                  <p className="text-xs font-semibold text-coral-700">
                    <span className="font-extrabold">Boost Visibility:</span> Listings with verified live tours get pinned to the top and receive 3x more direct WhatsApp inquiries.
                  </p>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={handleVideoChange}
                  className="hidden"
                />

                {/* Uploading state */}
                {videoUploading && (
                  <div className="flex items-center gap-3 rounded-xl border-2 border-coral-200 bg-coral-50/50 p-4 animate-fade-in">
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-coral-500" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-coral-700">Optimizing & uploading 30s tour to Cloudinary...</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-coral-100">
                        <div
                          className="h-full rounded-full bg-coral-500 transition-all duration-300"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-coral-400">{videoProgress}% · {videoFileName}</p>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {!videoUploading && videoError && (
                  <div className="flex items-start gap-2.5 rounded-xl border-2 border-red-200 bg-red-50 p-4 animate-fade-in">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-700">Upload Failed</p>
                      <p className="mt-0.5 text-xs text-red-500">{videoError}</p>
                    </div>
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 transition-all hover:bg-red-100"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Success state — inline video player */}
                {!videoUploading && !videoError && videoUrl && (
                  <div className="animate-fade-in overflow-hidden rounded-xl border-2 border-emerald-200">
                    <video
                      src={videoUrl}
                      controls
                      className="aspect-video w-full bg-navy-900"
                    />
                    <div className="flex items-center justify-between gap-2 bg-emerald-50 px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <BadgeCheck className="h-4 w-4" />
                        Verified Tour Attached
                      </span>
                      <button
                        onClick={handleVideoRemove}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-navy-400 transition-all hover:bg-navy-100 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Idle state — upload prompt */}
                {!videoUploading && !videoError && !videoUrl && (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-300 bg-navy-50/50 py-8 transition-all hover:border-coral-400 hover:bg-coral-50/30"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-100">
                      <Camera className="h-6 w-6 text-coral-500" />
                    </div>
                    <span className="text-sm font-bold text-navy-700">Record or upload a 30s video tour</span>
                    <span className="text-xs text-navy-400">MP4, MOV up to 30MB · Mobile camera supported</span>
                  </button>
                )}

                {videoUrl && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <ShieldCheck className="h-3 w-3" /> Video Verified badge will appear on your listing
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-5">
              {/* Food / Mess */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                  <Utensils className="h-4 w-4 text-coral-500" />
                  Food / Mess
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FOOD_MESS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setMessOption(opt)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                        messOption === opt
                          ? 'border-coral-400 bg-coral-50/50 text-coral-600'
                          : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {messOption === '₹ Extra / month' && (
                  <div className="mt-2 flex items-center rounded-xl border-2 border-navy-200 px-3 transition-all focus-within:border-coral-400">
                    <IndianRupee className="h-4 w-4 text-navy-400" />
                    <input
                      type="number"
                      value={messExtra}
                      onChange={(e) => setMessExtra(e.target.value)}
                      placeholder="3,500"
                      className="w-full bg-transparent px-2 py-2.5 text-sm font-medium outline-none"
                    />
                    <span className="text-xs text-navy-400">/month</span>
                  </div>
                )}
              </div>

              {/* Electricity */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                  <Zap className="h-4 w-4 text-coral-500" />
                  Electricity
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {ELECTRICITY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setElectricityOption(opt)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                        electricityOption === opt
                          ? 'border-coral-400 bg-coral-50/50 text-coral-600'
                          : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {electricityOption === 'Fixed ₹/month' && (
                  <div className="mt-2 flex items-center rounded-xl border-2 border-navy-200 px-3 transition-all focus-within:border-coral-400">
                    <IndianRupee className="h-4 w-4 text-navy-400" />
                    <input
                      type="number"
                      value={electricityFixed}
                      onChange={(e) => setElectricityFixed(e.target.value)}
                      placeholder="500"
                      className="w-full bg-transparent px-2 py-2.5 text-sm font-medium outline-none"
                    />
                    <span className="text-xs text-navy-400">/month</span>
                  </div>
                )}
              </div>

              {/* Wi-Fi & Water */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                    <Wifi className="h-4 w-4 text-coral-500" />
                    Wi-Fi
                  </label>
                  <div className="flex rounded-xl border-2 border-navy-200 p-1">
                    <button
                      onClick={() => setWifiIncluded(true)}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        wifiIncluded ? 'bg-emerald-500 text-white' : 'text-navy-400'
                      }`}
                    >
                      Included Free
                    </button>
                    <button
                      onClick={() => setWifiIncluded(false)}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        !wifiIncluded ? 'bg-navy-700 text-white' : 'text-navy-400'
                      }`}
                    >
                      Shared Split
                    </button>
                  </div>
                  {!wifiIncluded && (
                    <div className="mt-2 flex items-center rounded-xl border-2 border-navy-200 px-3 transition-all focus-within:border-coral-400">
                      <IndianRupee className="h-4 w-4 text-navy-400" />
                      <input
                        type="number"
                        min="0"
                        value={wifiShared}
                        onChange={(e) => setWifiShared(e.target.value)}
                        placeholder="Enter monthly amount"
                        className="w-full bg-transparent px-2 py-2.5 text-sm font-medium outline-none"
                      />
                      <span className="text-xs text-navy-400">/month</span>
                    </div>
                  )}
                  {errors.wifiShared && <p className="mt-1 text-xs font-semibold text-red-500">{errors.wifiShared}</p>}
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                    <Home className="h-4 w-4 text-coral-500" />
                    Water
                  </label>
                  <div className="flex rounded-xl border-2 border-navy-200 p-1">
                    <button
                      onClick={() => setWaterIncluded(true)}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        waterIncluded ? 'bg-emerald-500 text-white' : 'text-navy-400'
                      }`}
                    >
                      Included Free
                    </button>
                    <button
                      onClick={() => setWaterIncluded(false)}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        !waterIncluded ? 'bg-navy-700 text-white' : 'text-navy-400'
                      }`}
                    >
                      Shared Split
                    </button>
                  </div>
                  {!waterIncluded && (
                    <div className="mt-2 flex items-center rounded-xl border-2 border-navy-200 px-3 transition-all focus-within:border-coral-400">
                      <IndianRupee className="h-4 w-4 text-navy-400" />
                      <input
                        type="number"
                        min="0"
                        value={waterShared}
                        onChange={(e) => setWaterShared(e.target.value)}
                        placeholder="Enter monthly amount"
                        className="w-full bg-transparent px-2 py-2.5 text-sm font-medium outline-none"
                      />
                      <span className="text-xs text-navy-400">/month</span>
                    </div>
                  )}
                  {errors.waterShared && <p className="mt-1 text-xs font-semibold text-red-500">{errors.waterShared}</p>}
                </div>
              </div>

              {/* Society / Building Maintenance */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                  <Building className="h-4 w-4 text-coral-500" />
                  Society / Building Maintenance
                </label>
                <div className="flex rounded-xl border-2 border-navy-200 p-1">
                  <button
                    onClick={() => setMaintenanceIncluded(true)}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                      maintenanceIncluded ? 'bg-emerald-500 text-white' : 'text-navy-400'
                    }`}
                  >
                    Included in Rent
                  </button>
                  <button
                    onClick={() => setMaintenanceIncluded(false)}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                      !maintenanceIncluded ? 'bg-navy-700 text-white' : 'text-navy-400'
                    }`}
                  >
                    Extra / Separate
                  </button>
                </div>
                {!maintenanceIncluded && (
                  <div className="mt-2 flex items-center rounded-xl border-2 border-navy-200 px-3 transition-all focus-within:border-coral-400">
                    <IndianRupee className="h-4 w-4 text-navy-400" />
                    <input
                      type="number"
                      min="0"
                      value={maintenanceFee}
                      onChange={(e) => setMaintenanceFee(e.target.value)}
                      placeholder="1,500"
                      className="w-full bg-transparent px-2 py-2.5 text-sm font-medium outline-none"
                    />
                    <span className="text-xs text-navy-400">/month</span>
                  </div>
                )}
                {errors.maintenanceFee && <p className="mt-1 text-xs font-semibold text-red-500">{errors.maintenanceFee}</p>}
              </div>

              {/* Summary preview */}
              <div className="rounded-xl bg-navy-50 p-4">
                <p className="mb-2 text-xs font-bold text-navy-700">True Monthly Outflow Preview</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-500">Base rent + utilities</span>
                  <span className="flex items-center font-extrabold text-navy-800">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {((Number(baseRent) || 0) + (messOption === '₹ Extra / month' ? (Number(messExtra) || 0) : 0) + (electricityOption === 'Fixed ₹/month' ? (Number(electricityFixed) || 0) : 0) + (wifiIncluded ? 0 : (Number(wifiShared) || 0)) + (waterIncluded ? 0 : (Number(waterShared) || 0)) + (maintenanceIncluded ? 0 : (Number(maintenanceFee) || 0))).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in space-y-5">
              {/* Curfew */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                  <Clock className="h-4 w-4 text-coral-500" />
                  Curfew / Entry Timing
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {CURFEW_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setCurfew(opt)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                        curfew === opt
                          ? 'border-coral-400 bg-coral-50/50 text-coral-600'
                          : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food habit */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                  <Leaf className="h-4 w-4 text-coral-500" />
                  Food Habit Allowed
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {FOOD_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFoodHabit(opt)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                        foodHabit === opt
                          ? 'border-coral-400 bg-coral-50/50 text-coral-600'
                          : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                  <Users className="h-4 w-4 text-coral-500" />
                  Guests & Visitors
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {GUEST_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setGuests(opt)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                        guests === opt
                          ? 'border-coral-400 bg-coral-50/50 text-coral-600'
                          : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work preference */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-800">
                  <Briefcase className="h-4 w-4 text-coral-500" />
                  Work Preference
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WORK_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setWorkPref(opt)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                        workPref === opt
                          ? 'border-coral-400 bg-coral-50/50 text-coral-600'
                          : 'border-navy-200 text-navy-500 hover:border-navy-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trust note */}
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                <p className="text-xs font-medium text-emerald-700">
                  Your listing will appear instantly with a "Just Added" badge. Hosts who add a live video walkthrough get 3x more unlocks.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="border-t border-navy-100 px-6 py-4">
          {step === 3 && (
            <label className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <input
                type="checkbox"
                checked={legalDeclarationAccepted}
                onChange={(event) => setLegalDeclarationAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
              />
              <span>I solemnly affirm that I am the lawful owner, authorized manager, or primary leaseholder of this property. All uploaded photos, 30s video walkthroughs, pricing breakdowns, and house rules are true, accurate, and current. I understand that posting misleading or third-party broker content without authorization will result in an immediate permanent ban and legal forfeiture.</span>
            </label>
          )}
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 rounded-xl border border-navy-200 px-4 py-3 text-sm font-bold text-navy-600 transition-all hover:bg-navy-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-coral-500 py-3 text-sm font-bold text-white shadow-lg shadow-coral-500/30 transition-all hover:bg-coral-600 active:scale-95"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="relative flex-1">
                <button
                  onClick={handlePublish}
                  disabled={!canPublish}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {photoUploading || videoUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {photoUploading ? 'Uploading photos...' : 'Uploading video...'}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Publish Listing
                    </>
                  )}
                </button>
                {!photosValid && (
                  <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                    Upload at least 2 photos to publish
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-navy-800" />
                  </div>
                )}
                {photosValid && !legalDeclarationAccepted && (
                  <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                    Accept the declaration to publish
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-navy-800" />
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onWhatsAppClick}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <MessageCircle className="h-4 w-4" />
            ⚡ Busy? List via WhatsApp in 60s
          </button>
        </div>
      </div>
    </div>
  );
}
