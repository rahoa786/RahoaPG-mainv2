import {
  X, IndianRupee, Check, AlertTriangle, Shield,
  MessageCircle, Lock, Wifi, Zap, Home, Sparkles, User, Phone, ImageIcon,
  Leaf, Clock, Users, Briefcase, Droplet, Building
} from 'lucide-react';
import type { Listing, QuizAnswers } from '@/data/listings';
import { computeMatchPoints } from '@/data/listings';
import { listingWhatsAppMessage, whatsappLink } from '@/lib/whatsapp';
import ReviewSection from '@/components/ReviewSection';
import type { PortalUser } from '@/lib/demoPortal';

interface DetailModalProps {
  listing: Listing;
  matchScore: number;
  quizAnswers: QuizAnswers | null;
  unlocked: boolean;
  onClose: () => void;
  onUnlockClick: () => void;
  user: PortalUser | null;
  onRequestLogin: () => void;
}

export default function DetailModal({ listing, matchScore, quizAnswers, unlocked, onClose, onUnlockClick, user, onRequestLogin }: DetailModalProps) {
  const maintFee = listing.maintenanceIncluded === false ? (listing.maintenanceFee ?? 0) : 0;
  const isFixedElectricity = listing.electricityOption === 'Fixed ₹/month';
  const electricityValue = isFixedElectricity ? listing.electricity : 0;
  const isExtraMess = listing.messOption === '₹ Extra / month';
  const messValue = isExtraMess ? listing.mess : 0;
  const totalOutflow = listing.baseRent + messValue + electricityValue + listing.wifi + listing.water + maintFee;

  const breakdownRows = [
    { label: 'Base Rent', value: listing.baseRent, icon: <Home className="h-4 w-4" /> },
    ...(isFixedElectricity && electricityValue > 0 ? [{ label: 'Electricity (fixed)', value: electricityValue, icon: <Zap className="h-4 w-4" /> }] : []),
    ...(isExtraMess && messValue > 0 ? [{ label: 'Food / Mess (extra)', value: messValue, icon: <IndianRupee className="h-4 w-4" /> }] : []),
    { label: 'Wi-Fi', value: listing.wifi, icon: <Wifi className="h-4 w-4" /> },
    { label: 'Water', value: listing.water, icon: <Home className="h-4 w-4" /> },
    ...(maintFee > 0 ? [{ label: 'Society Maintenance', value: maintFee, icon: <Building className="h-4 w-4" /> }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in bg-navy-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-navy-600 shadow-lg backdrop-blur-md transition-all hover:bg-white hover:text-navy-900"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto">
          {/* Media header — real video player if video exists, otherwise static image */}
          {listing.videoUrl ? (
            <div className="relative h-56 overflow-hidden bg-navy-900 sm:h-64">
              <video
                src={listing.videoUrl}
                poster={listing.image || undefined}
                controls
                className="h-full w-full object-cover"
              />
              {listing.videoVerified && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-coral-500 px-3 py-1.5 shadow-lg">
                  <Zap className="h-3.5 w-3.5 fill-white text-white" />
                  <span className="text-xs font-extrabold text-white">Live Video Tour</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-56 overflow-hidden bg-navy-100 sm:h-64">
              {listing.image ? (
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="h-full w-full object-cover brightness-90"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-navy-300" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-900/50 via-transparent to-transparent" />
              {listing.videoVerified && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-coral-500 px-3 py-1.5 shadow-lg">
                  <Zap className="h-3.5 w-3.5 fill-white text-white" />
                  <span className="text-xs font-extrabold text-white">Live Video Tour</span>
                </div>
              )}
            </div>
          )}

          {/* Title section */}
          <div className="px-6 pt-5">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  listing.hostType === 'pg'
                    ? 'bg-navy-100 text-navy-700'
                    : 'bg-coral-50 text-coral-600 border border-coral-200'
                }`}
              >
                {listing.hostType === 'pg' ? 'PG Host' : 'Existing Flatmate'}
              </span>
              {listing.videoVerified && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <Check className="h-3 w-3" /> Video Verified
                </span>
              )}
              {unlocked && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                  <Check className="h-3 w-3" /> Already Unlocked
                </span>
              )}
              {listing.promo && (
                <span className="rounded-full bg-coral-500 px-2.5 py-1 text-xs font-bold text-white">
                  {listing.promo}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold leading-tight text-navy-800">{listing.title}</h2>
            <p className="mt-1 text-sm text-navy-400">{listing.neighborhood} · {listing.sharingType}</p>
          </div>

          {/* Flatmate profile (tenant-led only) */}
          {listing.flatmateProfile && (
            <div className="mx-6 mt-5 rounded-2xl border border-coral-200 bg-coral-50/50 p-5">
              <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-coral-600">
                <User className="h-4 w-4" />
                Flatmate Compatibility Profile
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-800 text-lg font-extrabold text-white">
                  {listing.flatmateProfile.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-navy-800">{listing.flatmateProfile.name}</span>
                    <span className="text-xs text-navy-400">· {listing.flatmateProfile.age} yrs</span>
                  </div>
                  <p className="text-xs font-medium text-navy-500">{listing.flatmateProfile.profession}</p>
                  <p className="mt-2 text-sm text-navy-600">{listing.flatmateProfile.bio}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {listing.flatmateProfile.lifestyle.map((tag) => (
                      <span key={tag} className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-navy-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {listing.flatmateProfile.interests.map((interest) => (
                      <span key={interest} className="rounded-lg bg-navy-100 px-2.5 py-1 text-xs font-semibold text-navy-700">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* True Monthly Outflow Table */}
          <div className="px-6 pt-5">
            <h3 className="mb-3 text-sm font-bold text-navy-800">True Monthly Outflow Breakdown</h3>
            <div className="overflow-hidden rounded-2xl border border-navy-100">
              {breakdownRows.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-navy-50/50' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-2.5 text-sm text-navy-600">
                    <span className="text-navy-400">{row.icon}</span>
                    {row.label}
                  </div>
                  <span className="flex items-center text-sm font-bold text-navy-800">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {row.value.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              {/* Total */}
              <div className="flex items-center justify-between bg-navy-800 px-4 py-3.5">
                <span className="text-sm font-bold text-white">Total Monthly Outflow</span>
                <span className="flex items-center text-lg font-extrabold text-coral-400">
                  <IndianRupee className="h-4 w-4" />
                  {totalOutflow.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Security deposit */}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-navy-50 px-4 py-3">
              <span className="text-sm font-semibold text-navy-600">Security Deposit</span>
              <span className="flex items-center text-sm font-bold text-navy-800">
                {listing.deposit === 0 ? (
                  <span className="text-emerald-600">Zero Deposit</span>
                ) : (
                  <>
                    <IndianRupee className="h-3.5 w-3.5" />
                    {listing.deposit.toLocaleString('en-IN')}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* House Rules & Preferences */}
          {(listing.foodHabit || listing.guestPolicy || listing.workPreference || listing.curfew || listing.messOption || listing.electricityOption) && (
            <div className="px-6 pt-5">
              <h3 className="mb-3 text-sm font-bold text-navy-800">House Rules & Preferences</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {listing.foodHabit && (() => {
                  const isNonVeg = listing.foodHabit === 'Non-Veg Friendly';
                  const isEgg = listing.foodHabit === 'Eggetarian';
                  const iconColor = isNonVeg ? 'text-red-500' : isEgg ? 'text-yellow-500' : 'text-emerald-500';
                  const rowBg = isNonVeg ? 'bg-red-50' : isEgg ? 'bg-yellow-50' : 'bg-navy-50';
                  return (
                    <div className={`flex items-center gap-2 rounded-xl ${rowBg} px-3 py-2.5 text-sm text-navy-600`}>
                      <Leaf className={`h-4 w-4 shrink-0 ${iconColor}`} />
                      <span className="font-medium">{listing.foodHabit}</span>
                    </div>
                  );
                })()}
                {listing.curfew && (
                  <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-navy-600">
                    <Clock className="h-4 w-4 shrink-0 text-coral-500" />
                    <span className="font-medium">Curfew: {listing.curfew}</span>
                  </div>
                )}
                {listing.guestPolicy && (
                  <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-navy-600">
                    <Users className="h-4 w-4 shrink-0 text-navy-500" />
                    <span className="font-medium">{listing.guestPolicy}</span>
                  </div>
                )}
                {listing.workPreference && (
                  <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-navy-600">
                    <Briefcase className="h-4 w-4 shrink-0 text-navy-500" />
                    <span className="font-medium">{listing.workPreference}</span>
                  </div>
                )}
                {listing.messOption && (
                  <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-navy-600">
                    <IndianRupee className="h-4 w-4 shrink-0 text-coral-500" />
                    <span className="font-medium">Mess: {listing.messOption}</span>
                  </div>
                )}
                {listing.electricityOption && (
                  <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-navy-600">
                    <Zap className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="font-medium">Electricity: {listing.electricityOption}</span>
                  </div>
                )}
                {listing.wifiIncluded !== undefined && (
                  <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-navy-600">
                    <Wifi className="h-4 w-4 shrink-0 text-blue-500" />
                    <span className="font-medium">Wi-Fi: {listing.wifiIncluded ? 'Included Free' : `Shared Split (₹${listing.wifi.toLocaleString('en-IN')})`}</span>
                  </div>
                )}
                {listing.waterIncluded !== undefined && (
                  <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-navy-600">
                    <Droplet className="h-4 w-4 shrink-0 text-blue-400" />
                    <span className="font-medium">Water: {listing.waterIncluded ? 'Included Free' : `Shared Split (₹${listing.water.toLocaleString('en-IN')})`}</span>
                  </div>
                )}
                {listing.maintenanceIncluded !== undefined && (
                  <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-navy-600">
                    <Building className="h-4 w-4 shrink-0 text-navy-500" />
                    <span className="font-medium">Society Maintenance: {listing.maintenanceIncluded ? 'Included in Rent' : `₹${(listing.maintenanceFee ?? 0).toLocaleString('en-IN')}/month`}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Match Breakdown Card */}
          <div className="px-6 pt-5">
            <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-navy-50 to-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy-800">{quizAnswers ? 'Why You Match' : 'Match Breakdown'}</h3>
                <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold ${
                  matchScore >= 85
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                    : matchScore >= 70
                      ? 'border-blue-200 bg-blue-100 text-blue-700'
                      : 'border-navy-200 bg-navy-100 text-navy-600'
                }`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {matchScore}% {quizAnswers ? 'Compatibility' : 'Match'}
                </div>
              </div>
              <div className="space-y-2">
                {(() => {
                  const points = quizAnswers ? computeMatchPoints(listing, quizAnswers) : listing.matchPoints;
                  return points.map((point) => (
                    <div
                      key={point.label}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${
                        point.type === 'match'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {point.type === 'match' ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <span className="font-medium">{point.label}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          <ReviewSection listingId={listing.id} user={user} verifiedTenant={unlocked} onRequestLogin={onRequestLogin} />

          {/* Deposit Protection Guarantee */}
          <div className="px-6 pt-5">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800">Deposit Protection Guarantee</p>
                <p className="mt-0.5 text-xs text-emerald-600">
                  Protected by Rahoa Digital Move-in/Move-out Photo Audit. Your deposit is documented with timestamped photos before and after tenancy.
                </p>
              </div>
            </div>
          </div>

          {/* Spacer keeps the final content clear of the sticky action footer */}
          <div className={`h-28 ${unlocked ? 'sm:h-40' : ''}`} />
        </div>

        {/* Sticky action footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-navy-100 bg-white/95 px-6 py-4 backdrop-blur-lg">
          {unlocked ? (
            <div className="animate-fade-in">
              <div className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-navy-50 px-4 py-2 text-sm font-bold text-navy-800">
                <Phone className="h-4 w-4 text-coral-500" />
                {listing.hostPhone}
              </div>
              {whatsappLink(listing, listingWhatsAppMessage(listing.title, listing.neighborhood)) ? (
                <a
                  href={whatsappLink(listing, listingWhatsAppMessage(listing.title, listing.neighborhood)) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-600 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp with Host
                </a>
              ) : (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-100 py-3.5 text-sm font-bold text-navy-400">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp number not available
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onUnlockClick}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-coral-500/30 transition-all hover:bg-coral-600 active:scale-95"
            >
              <Lock className="h-4 w-4" />
              Unlock Host Contact & WhatsApp
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">from ₹9</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
