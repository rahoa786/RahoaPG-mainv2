import { BadgeCheck, IndianRupee, Clock, Leaf, Laptop, Sparkles, Tag, Lock, MessageCircle, Zap, ImageIcon, Briefcase, Shield, Users, Building, Flame, UserCircle, Heart } from 'lucide-react';
import type { Listing } from '@/data/listings';
import { listingWhatsAppMessage, whatsappLink } from '@/lib/whatsapp';
import { useState } from 'react';

function MatchScorePill({ score, quizActive }: { score: number; quizActive: boolean }) {
  if (!quizActive) {
    const color =
      score >= 85
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : score >= 75
          ? 'bg-amber-100 text-amber-700 border-amber-200'
          : 'bg-navy-100 text-navy-600 border-navy-200';
    return (
      <div className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${color}`}>
        <Sparkles className="h-3.5 w-3.5" />
        {score}% Match
      </div>
    );
  }
  // Quiz-active compatibility badge tiers
  if (score >= 85) {
    return (
      <div className="flex h-7 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-500 px-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-500/30">
        <Flame className="h-3.5 w-3.5 fill-white" />
        {score}% Compatibility Match
      </div>
    );
  }
  if (score >= 70) {
    return (
      <div className="flex h-7 items-center gap-1.5 rounded-full border border-blue-300 bg-blue-500 px-3 text-xs font-bold text-white shadow-lg shadow-blue-500/30">
        <Zap className="h-3.5 w-3.5 fill-white" />
        {score}% Match
      </div>
    );
  }
  return (
    <div className="flex h-7 items-center gap-1.5 rounded-full border border-navy-200 bg-white/90 px-3 text-xs font-semibold text-navy-500">
      <Sparkles className="h-3.5 w-3.5" />
      {score}% Match
    </div>
  );
}

function TagPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <span className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${color}`}>
      {icon}
      {label}
    </span>
  );
}

interface ListingCardProps {
  listing: Listing;
  matchScore: number;
  quizActive: boolean;
  unlocked: boolean;
  saved: boolean;
  onCardClick: () => void;
  onUnlockClick: () => void;
  onToggleSave: () => void;
  activeBalance: number;
  onAddContacts: () => void;
}

export default function ListingCard({ listing, matchScore, quizActive, unlocked, saved, onCardClick, onUnlockClick, onToggleSave, activeBalance, onAddContacts }: ListingCardProps) {
  const [verificationTipOpen, setVerificationTipOpen] = useState(false);
  const maintFee = listing.maintenanceIncluded === false ? (listing.maintenanceFee ?? 0) : 0;
  const isFixedElectricity = listing.electricityOption === 'Fixed ₹/month';
  const electricityValue = isFixedElectricity ? listing.electricity : 0;
  const isExtraMess = listing.messOption === '₹ Extra / month';
  const messValue = isExtraMess ? listing.mess : 0;
  const totalOutflow = listing.baseRent + messValue + electricityValue + listing.wifi + listing.water + maintFee;

  return (
    <div
      onClick={onCardClick}
      className="group animate-slide-up cursor-pointer rounded-2xl border border-navy-100 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-navy-200 hover:shadow-xl"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-navy-100">
        {listing.image ? (
          <img
            src={listing.image}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-navy-100">
            <ImageIcon className="h-10 w-10 text-navy-300" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-900/50 via-transparent to-transparent" />

        {/* Save / favourite toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved homes' : 'Save home'}
          title={saved ? 'Saved' : 'Save'}
          className={`absolute right-3 top-3 z-10 flex h-7 min-h-7 w-7 min-w-7 items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 ${
            saved
              ? 'bg-coral-500 text-white shadow-lg shadow-coral-500/40'
              : 'bg-white/85 text-navy-600 hover:bg-white hover:text-coral-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-white' : ''}`} />
        </button>

        {/* Video badge — only when video tour is attached */}
        {listing.videoVerified && (
          <div className="absolute left-3 top-3 flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-coral-500 px-3 shadow-lg">
            <Zap className="h-3.5 w-3.5 fill-white text-white" />
            <span className="text-xs font-extrabold text-white">Live Video Tour</span>
          </div>
        )}

        {/* Verified badge */}
        {listing.videoVerified && (
          <div
            className="group/verified absolute right-14 top-3 z-10"
            onMouseEnter={() => setVerificationTipOpen(true)}
            onMouseLeave={() => setVerificationTipOpen(false)}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setVerificationTipOpen((open) => !open);
              }}
              onFocus={() => setVerificationTipOpen(true)}
              onBlur={() => setVerificationTipOpen(false)}
              aria-label="Live video verified. Show details."
              aria-expanded={verificationTipOpen}
              aria-describedby={`video-verified-tip-${listing.id}`}
              className="flex h-7 min-h-7 w-7 min-w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <BadgeCheck className="h-4 w-4" />
            </button>
            <span
              id={`video-verified-tip-${listing.id}`}
              role="tooltip"
              className={`pointer-events-none absolute right-0 top-11 z-20 w-52 rounded-xl bg-navy-900 px-3 py-2 text-left text-xs font-semibold leading-4 text-white shadow-xl transition-opacity ${
                verificationTipOpen ? 'visible opacity-100' : 'invisible opacity-0'
              }`}
            >
              Live video verified — this listing includes a video walkthrough.
            </span>
          </div>
        )}

        {/* Promo badge */}
        {listing.promo && (
          <div className="absolute bottom-3 left-3 flex h-7 items-center gap-1 rounded-full bg-coral-500 px-2.5 text-xs font-bold text-white shadow-lg">
            <Tag className="h-3.5 w-3.5" />
            {listing.promo}
          </div>
        )}

        {/* Match score */}
        <div className="absolute bottom-3 right-3">
          <MatchScorePill score={matchScore} quizActive={quizActive} />
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Host type badge */}
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
          {listing.gender && listing.gender !== 'any' && (
            <span className="flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-600">
              <UserCircle className="h-3 w-3" />
              {listing.gender === 'male' ? 'Male Only' : 'Female Only'}
            </span>
          )}
          <span className="text-xs font-medium text-navy-400">{listing.sharingType}</span>
        </div>

        <h3 className="text-base font-bold leading-snug text-navy-800 transition-colors group-hover:text-coral-500">
          {listing.title}
        </h3>
        <p className="mt-1 text-sm text-navy-400">{listing.neighborhood}</p>
        {unlocked && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2">
            <span className="truncate text-xs font-bold text-emerald-700">✓ Already Unlocked · {listing.hostPhone || 'Contact unlocked'}</span>
          </div>
        )}

        {/* Tenant-led label */}
        {listing.hostType === 'tenant' && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-coral-50 px-3 py-1.5 text-xs font-semibold text-coral-600">
            <BadgeCheck className="h-3.5 w-3.5" />
            {listing.hostLabel}
          </div>
        )}

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {listing.foodHabit === 'Strict Pure Veg Only' && (
            <TagPill
              icon={<Leaf className="h-3 w-3" />}
              label="Strict Veg"
              color="bg-emerald-50 text-emerald-700"
            />
          )}
          {listing.foodHabit === 'Non-Veg Friendly' && (
            <TagPill
              icon={<Leaf className="h-3 w-3" />}
              label="Non-Veg OK"
              color="bg-red-50 text-red-600"
            />
          )}
          {listing.foodHabit === 'Eggetarian' && (
            <TagPill
              icon={<Leaf className="h-3 w-3" />}
              label="Eggetarian"
              color="bg-yellow-50 text-yellow-700"
            />
          )}
          {listing.tags.includes('Work from Home friendly') && (
            <TagPill
              icon={<Laptop className="h-3 w-3" />}
              label="WFH Friendly"
              color="bg-blue-50 text-blue-600"
            />
          )}
          {listing.tags.includes('Student Zone') && (
            <TagPill
              icon={<Briefcase className="h-3 w-3" />}
              label="Student Zone"
              color="bg-purple-50 text-purple-600"
            />
          )}
          {listing.tags.includes('Zero Deposit') && (
            <TagPill
              icon={<Shield className="h-3 w-3" />}
              label="Zero Deposit"
              color="bg-emerald-50 text-emerald-700"
            />
          )}
          {listing.curfew && (
            <TagPill
              icon={<Clock className="h-3 w-3" />}
              label={`Curfew ${listing.curfew}`}
              color="bg-navy-50 text-navy-600"
            />
          )}
          {listing.tags.includes('No Curfew') && (
            <TagPill
              icon={<Clock className="h-3 w-3" />}
              label="No Curfew"
              color="bg-green-50 text-green-600"
            />
          )}
          {listing.guestPolicy && (
            <TagPill
              icon={<Users className="h-3 w-3" />}
              label={listing.guestPolicy}
              color="bg-navy-50 text-navy-600"
            />
          )}
          {listing.maintenanceIncluded === false && (
            <TagPill
              icon={<Building className="h-3 w-3" />}
              label={`₹${(listing.maintenanceFee ?? 0).toLocaleString('en-IN')}/mo Maint. Extra`}
              color="bg-amber-50 text-amber-700"
            />
          )}
          {listing.maintenanceIncluded === true && (
            <TagPill
              icon={<Building className="h-3 w-3" />}
              label="Maintenance: Included"
              color="bg-emerald-50 text-emerald-700"
            />
          )}
        </div>

        {/* Price breakdown */}
        <div className="mt-4 rounded-xl bg-navy-50 p-3.5">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col">
              <span className="flex items-center text-2xl font-extrabold text-navy-800">
                <IndianRupee className="h-5 w-5" />
                {listing.baseRent.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-medium text-navy-400">Base rent / month</span>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="flex items-center text-2xl font-extrabold text-coral-500">
                <IndianRupee className="h-5 w-5" />
                {totalOutflow.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-medium text-navy-400">True monthly outflow</span>
            </div>
          </div>
          {/* Breakdown bar */}
          <div className="mt-3 flex h-2 overflow-hidden rounded-full">
            <div
              className="bg-navy-700"
              style={{ width: `${(listing.baseRent / totalOutflow) * 100}%` }}
              title="Rent"
            />
            {electricityValue > 0 && (
              <div
                className="bg-coral-500"
                style={{ width: `${(electricityValue / totalOutflow) * 100}%` }}
                title="Electricity"
              />
            )}
            <div
              className="bg-blue-400"
              style={{ width: `${(listing.wifi / totalOutflow) * 100}%` }}
              title="Wi-Fi"
            />
            <div
              className="bg-amber-400"
              style={{ width: `${(listing.water / totalOutflow) * 100}%` }}
              title="Water"
            />
            {maintFee > 0 && (
              <div
                className="bg-navy-300"
                style={{ width: `${(maintFee / totalOutflow) * 100}%` }}
                title="Society Maintenance"
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium text-navy-400">
            {electricityValue > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Electricity ₹{electricityValue.toLocaleString('en-IN')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-400" /> Wi-Fi ₹{listing.wifi.toLocaleString('en-IN')}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Water ₹{listing.water.toLocaleString('en-IN')}
            </span>
            {maintFee > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-navy-300" /> Maint. ₹{maintFee.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* Unlock / WhatsApp CTA */}
        {!unlocked && activeBalance > 0 && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
            <span>Active Balance: {activeBalance} contact{activeBalance === 1 ? '' : 's'}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddContacts(); }}
              className="shrink-0 underline underline-offset-2 hover:text-emerald-900"
            >
              + Add More Contacts
            </button>
          </div>
        )}
        {unlocked && whatsappLink(listing, listingWhatsAppMessage(listing.title, listing.neighborhood)) ? (
          <a
            href={whatsappLink(listing, listingWhatsAppMessage(listing.title, listing.neighborhood)) as string}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-600 active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        ) : unlocked ? (
          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-100 py-3 text-sm font-bold text-navy-400">
            <MessageCircle className="h-4 w-4" />
            WhatsApp number not available
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onUnlockClick(); }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-3 text-sm font-bold text-white shadow-lg shadow-coral-500/30 transition-all hover:bg-coral-600 active:scale-95"
          >
            <Lock className="h-4 w-4" />
            Unlock Host Contact & WhatsApp
          </button>
        )}

        {/* Secondary view details */}
        <button
          onClick={(e) => { e.stopPropagation(); onCardClick(); }}
          className="mt-2 w-full rounded-xl bg-navy-50 py-2.5 text-xs font-bold text-navy-600 transition-all hover:bg-navy-100"
        >
          View Details & Match Breakdown
        </button>
      </div>
    </div>
  );
}
