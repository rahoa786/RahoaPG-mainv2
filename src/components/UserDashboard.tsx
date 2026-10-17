import { useState, useMemo, useEffect } from 'react';
import {
  X, Ticket, Contact, Heart, Clock, CheckCircle2, AlertCircle,
  Copy, MessageCircle, Phone, MapPin, IndianRupee,
  CalendarClock, Sparkles, Lock, Home, Eye, ShieldCheck
} from 'lucide-react';
import type { Listing } from '@/data/listings';
import { PASS_PLANS, type AccessPass, type PassType } from '@/data/accessPass';
import { listingWhatsAppMessage, whatsappLink } from '@/lib/whatsapp';
import type { UnlockedContact } from '@/lib/userStorage';
import type { DemoTransaction, HostListingMeta, DemoLead, PortalRole, PortalUser } from '@/lib/demoPortal';
import HostCommandCenter from '@/components/HostCommandCenter';
import type { QuizAnswers } from '@/data/listings';

interface UserDashboardProps {
  open: boolean;
  onClose: () => void;
  accessPass: AccessPass | null;
  firebaseCreditBalance: number | null;
  unlockedIds: string[];
  unlockedContacts: UnlockedContact[];
  savedIds: string[];
  listings: Listing[];
  onRemoveSaved: (id: string) => void;
  onRenew: (plan: PassType) => void;
  onViewDetails: (listing: Listing) => void;
  user: PortalUser;
  preferences: QuizAnswers | null;
  transactions: DemoTransaction[];
  hostListings: (Listing & { hostMeta: HostListingMeta })[];
  hostLeads: DemoLead[];
  onEditPreferences: () => void;
  onSwitchRole: (role: PortalRole) => void;
  onSignOut: () => void;
  onSaveHostMeta: (listingId: string, meta: HostListingMeta) => void;
  onEditListing: (listing: Listing) => void;
}

type Tab = 'passes' | 'unlocked' | 'saved' | 'host';

export default function UserDashboard({
  open, onClose, accessPass, firebaseCreditBalance, unlockedIds, unlockedContacts, savedIds, listings, onRemoveSaved, onRenew, onViewDetails,
  user, preferences, transactions, hostListings, hostLeads, onEditPreferences, onSwitchRole, onSignOut, onSaveHostMeta, onEditListing,
}: UserDashboardProps) {
  const [tab, setTab] = useState<Tab>('passes');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setTab(user.role === 'host' ? 'host' : 'passes');
  }, [user.role]);

  // Tick every second so the countdown and active/expired status stay live
  // while the dashboard is open.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const listingById = useMemo(() => {
    const map: Record<string, Listing> = {};
    for (const l of listings) map[l.id] = l;
    return map;
  }, [listings]);

  const unlockedContactById = useMemo(() => {
    const map: Record<string, UnlockedContact> = {};
    for (const contact of unlockedContacts) map[contact.id] = contact;
    return map;
  }, [unlockedContacts]);
  const unlockedEntries = useMemo(
    () => unlockedIds.flatMap((id) => {
      const savedContact = unlockedContactById[id];
      if (savedContact) return [savedContact];
      const listing = listingById[id];
      return listing ? [{
        id: listing.id,
        title: listing.title,
        neighborhood: listing.neighborhood,
        baseRent: listing.baseRent,
        image: listing.image,
        hostPhone: listing.hostPhone,
        hostWhatsApp: listing.hostWhatsApp,
        unlockedAt: 0,
      }] : [];
    }),
    [unlockedIds, listingById, unlockedContactById]
  );
  const savedListings = useMemo(
    () => savedIds.map((id) => listingById[id]).filter((l): l is Listing => !!l),
    [savedIds, listingById]
  );

  if (!open) return null;

  const passActive = accessPass ? now < accessPass.expiresAt && accessPass.remainingCredits > 0 : false;
  const msLeft = accessPass ? Math.max(0, accessPass.expiresAt - now) : 0;
  const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000));
  const minsLeft = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
  const totalSecondsLeft = Math.floor(msLeft / 1000);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(false);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      setCopyError(true);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = user.role === 'host'
    ? [{ key: 'host', label: 'Command Center', icon: <Home className="h-4 w-4" />, count: hostListings.length }]
    : [
      { key: 'passes', label: 'My Passes', icon: <Ticket className="h-4 w-4" />, count: user.authMode === 'firebase' ? firebaseCreditBalance ?? 0 : accessPass ? 1 : 0 },
      { key: 'unlocked', label: 'Unlocked Contacts', icon: <Contact className="h-4 w-4" />, count: unlockedIds.length },
      { key: 'saved', label: 'Saved Homes', icon: <Heart className="h-4 w-4" />, count: savedListings.length },
    ];

  return (
    <div className="fixed inset-0 z-[115] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in bg-navy-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-10 flex h-full w-full max-w-2xl animate-slide-up flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-navy-800 to-navy-700 px-6 py-5 text-white">
          <button
            onClick={onClose}
            aria-label="Close dashboard"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-coral-300">
            <Sparkles className="h-4 w-4" />
            My Rahoa Dashboard
          </div>
          <h2 className="mt-2 text-xl font-extrabold">{user.role === 'host' ? 'Host Command Center' : 'My Passes & Saved Listings'}</h2>
          <p className="mt-1 text-xs text-navy-200">
            Signed in as {user.contact} · {user.role === 'host' ? 'Host / PG Owner' : 'Tenant / Seeker'}
          </p>
          {user.authMode === 'development' && (
            <p className="mt-2 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100">
              Preview session — changes are saved only in this browser.
            </p>
          )}
          {user.authMode === 'firebase' && (
            <p className={`mt-2 rounded-lg border px-3 py-2 text-xs font-bold ${
              user.profileSyncError
                ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                : 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100'
            }`}>
              {user.profileSyncError
                ? 'Phone verified, but we could not sync your account right now. Please try again later.'
                : 'Phone verified. Your account and preferences are securely synced.'}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => onSwitchRole(user.role === 'host' ? 'seeker' : 'host')} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20">
              Switch to {user.role === 'host' ? 'Seeker' : 'Host'}
            </button>
            <button onClick={onSignOut} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20">Sign out</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-navy-100 bg-white">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex flex-1 flex-col items-center gap-1 px-1 py-3 text-[10px] font-bold transition-all sm:text-xs ${
                  active ? 'text-coral-500' : 'text-navy-400 hover:text-navy-600'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  {t.icon}
                  <span className="text-center leading-tight">{t.label}</span>
                  <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    active ? 'bg-coral-500 text-white' : 'bg-navy-100 text-navy-500'
                  }`}>
                    {t.count}
                  </span>
                </span>
                {active && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-coral-500" />}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            ⚠️ Verified Host Content: All room media, pricing, and rules are directly uploaded by the property host. While Rahoa enforces anti-broker media checks, Rahoa does not physically inspect every premise and is not liable for host-side discrepancies. Verify physical premises before paying advance deposits.
          </div>
          {/* ---------- My Passes ---------- */}
          {tab === 'passes' && (
            <div className="space-y-4">
              {user.authMode === 'firebase' ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
                        <Ticket className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-navy-800">Available Contact Credits</p>
                        <p className="text-xs font-bold text-emerald-700">Available Balance</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                      {firebaseCreditBalance === null ? 'Loading…' : `${firebaseCreditBalance} Available`}
                    </span>
                  </div>
                  <p className="mt-4 rounded-xl bg-white p-4 text-xs leading-5 text-navy-600">
                    Your contact balance is loaded from your verified Rahoa account. Credits are deducted only when a new host contact is unlocked.
                  </p>
                </div>
              ) : passActive && accessPass ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
                        <Ticket className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-navy-800">{PASS_PLANS[accessPass.type].label}</p>
                        <p className="text-xs font-bold text-emerald-700">Active Balance: {accessPass.remainingCredits} contacts remaining</p>
                      </div>
                    </div>
                    <span className="flex animate-pulse items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {accessPass.remainingCredits} Contact{accessPass.remainingCredits === 1 ? '' : 's'} Left
                    </span>
                  </div>
                  <div className="mt-4 rounded-xl bg-white p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-500">
                      <Clock className="h-3.5 w-3.5 text-coral-500" />
                      Expires in
                    </div>
                    <Countdown totalSeconds={totalSecondsLeft} />
                    <p className="mt-1 text-xs text-navy-400">{hoursLeft} hrs {minsLeft} mins remaining · Valid until {new Date(accessPass.expiresAt).toLocaleString()}</p>
                  </div>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      {accessPass.remainingCredits} Contact Unlock{accessPass.remainingCredits === 1 ? '' : 's'} Remaining
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Direct WhatsApp Access
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      Verified Host Guarantee
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-400">
                    <Ticket className="h-6 w-6" />
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-navy-700">No Active Pass</h3>
                  <p className="mt-1 max-w-[16rem] text-xs text-navy-400">
                    {accessPass ? 'Your previous pass has expired. Choose a pass to unlock host contacts again.' : 'Choose a pass to unlock host contacts directly.'}
                  </p>
                  {accessPass && <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-navy-400"><AlertCircle className="h-3.5 w-3.5" />Previous pass: {PASS_PLANS[accessPass.type].label}</p>}
                </div>
              )}

              <div className="rounded-2xl border border-navy-100 p-5">
                <div className="flex items-center gap-1.5 text-sm font-bold text-navy-800">
                  <CalendarClock className="h-4 w-4 text-coral-500" />
                  {passActive ? 'Add more contacts' : 'Get contact unlocks'}
                </div>
                <p className="mt-1 text-xs text-navy-400">New credits stack with your remaining balance; validity extends to the later expiry.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(['single', 'day', 'week'] as PassType[]).map((key) => {
                    const plan = PASS_PLANS[key];
                    return (
                      <div key={key} className="relative rounded-xl border border-navy-200 p-3">
                        {plan.badge && <span className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${key === 'week' ? 'bg-emerald-600' : 'bg-coral-500'}`}>{plan.badge}</span>}
                        <p className="mt-1 text-xs font-bold text-navy-800">{plan.label}</p>
                        <p className="mt-1 flex items-center text-xl font-extrabold text-navy-800">
                          <IndianRupee className="h-4 w-4" />{plan.price}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-navy-500">
                          {plan.credits} contact{plan.credits === 1 ? '' : 's'}{key !== 'single' ? ` · ${key === 'day' ? '24 hours' : '7 days'}` : ''}
                        </p>
                        <p className="mb-3 mt-1 text-[10px] font-bold text-emerald-700">{plan.pricePerContact}{plan.savings ? ` · ${plan.savings}` : ''}</p>
                        <button
                          onClick={() => onRenew(key)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-coral-500 py-2 text-xs font-bold text-white transition-colors hover:bg-coral-600"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Add Contacts
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Plan info */}
              <div className="rounded-xl bg-navy-50 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-navy-700">
                  <CalendarClock className="h-4 w-4 text-coral-500" />
                  How passes work
                </div>
                <ul className="mt-2 space-y-1 text-xs text-navy-500">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    Standard Seeker Pass includes 6 contacts for 24 hours.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    Power Seeker Pass includes 15 contacts for 7 days.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    Unlocked contacts stay saved on this device.
                  </li>
                </ul>
              </div>

              {user.role === 'seeker' && (
                <>
                  <section className="rounded-2xl border border-navy-100 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div><h3 className="text-sm font-extrabold text-navy-800">Lifestyle Quiz Preferences</h3><p className="mt-1 text-xs text-navy-400">Saved in this browser profile.</p></div>
                      <button onClick={onEditPreferences} className="shrink-0 rounded-lg border border-navy-200 px-3 py-2 text-xs font-bold text-navy-600">Edit preferences</button>
                    </div>
                    {preferences ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[preferences.food, preferences.curfew, preferences.schedule].filter((value): value is string => !!value).map((value) => <span key={value} className="rounded-full bg-navy-50 px-3 py-1 text-[11px] font-semibold text-navy-600">{value}</span>)}
                      </div>
                    ) : <p className="mt-3 text-xs text-navy-400">No lifestyle quiz saved yet.</p>}
                  </section>
                  <section className="rounded-2xl border border-navy-100 p-4">
                    <h3 className="text-sm font-extrabold text-navy-800">Transactions &amp; Receipts</h3>
                    <p className="mt-1 text-xs text-navy-400">Browser-local demo history; not tax invoices or payment verification.</p>
                    {transactions.length === 0 ? <p className="mt-3 text-xs text-navy-400">No pass purchases recorded in this browser.</p> : (
                      <div className="mt-3 space-y-2">
                        {transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-lg bg-navy-50 px-3 py-2 text-xs">
                          <div><p className="font-bold text-navy-700">{transaction.label}</p><p className="text-navy-400">{new Date(transaction.createdAt).toLocaleString()} · {transaction.status === 'paid' ? 'Paid (demo)' : 'Contact unlocked'}</p></div>
                          <span className="font-extrabold text-navy-800">₹{transaction.amount}</span>
                        </div>)}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {/* ---------- Unlocked Contacts ---------- */}
          {tab === 'unlocked' && (
            <div className="space-y-3">
              {unlockedEntries.length === 0 ? (
                <EmptyState
                  icon={<Contact className="h-6 w-6" />}
                  title="You haven't unlocked any contacts yet"
                  hint="Browse listings to connect directly with hosts."
                />
              ) : (
                unlockedEntries.map((contact) => (
                  <div key={contact.id} className="rounded-2xl border border-navy-100 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-navy-100">
                        {contact.image ? (
                          <img src={contact.image} alt={contact.title} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Home className="h-5 w-5 text-navy-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-navy-800">{contact.title}</p>
                        <p className="flex items-center gap-1 text-xs text-navy-400">
                          <MapPin className="h-3 w-3" />
                          {contact.neighborhood}
                        </p>
                        <p className="mt-1 flex items-center text-xs font-bold text-coral-500">
                          <IndianRupee className="h-3 w-3" />
                          {contact.baseRent.toLocaleString('en-IN')} / month
                        </p>
                      </div>
                    </div>

                    {/* Contact card */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5">
                        <Phone className="h-4 w-4 shrink-0 text-coral-500" />
                        <span className="flex-1 text-sm font-bold text-navy-800">{contact.hostPhone || 'Not available'}</span>
                        {contact.hostPhone && (
                          <button
                            onClick={() => handleCopy(contact.hostPhone, `${contact.id}-phone`)}
                            aria-label="Copy phone number"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-navy-500 transition-colors hover:text-coral-500"
                          >
                            {copiedId === `${contact.id}-phone` ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-navy-50 px-3 py-2.5">
                        <MessageCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="flex-1 text-sm font-bold text-navy-800">{contact.hostWhatsApp || 'Not available'}</span>
                        {(contact.hostWhatsApp || contact.hostPhone) && (
                          <button
                            onClick={() => handleCopy(contact.hostWhatsApp || contact.hostPhone, `${contact.id}-wa`)}
                            aria-label="Copy WhatsApp number"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-navy-500 transition-colors hover:text-coral-500"
                          >
                            {copiedId === `${contact.id}-wa` ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                      {whatsappLink(contact, listingWhatsAppMessage(contact.title, contact.neighborhood)) && (
                        <a
                          href={whatsappLink(contact, listingWhatsAppMessage(contact.title, contact.neighborhood)) as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-600 active:scale-95"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Open WhatsApp Chat
                        </a>
                      )}
                      {contact.unlockedAt > 0 && (
                        <p className="text-[11px] text-navy-400">
                          Unlocked {new Date(contact.unlockedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {copyError && <p role="alert" className="text-xs font-medium text-red-600">Could not copy. Check clipboard permissions and try again.</p>}
            </div>
          )}

          {/* ---------- Saved Homes ---------- */}
          {tab === 'saved' && (
            <div className="space-y-3">
              {savedListings.length === 0 ? (
                <EmptyState
                  icon={<Heart className="h-6 w-6" />}
                  title="No saved listings yet"
                  hint="Tap the heart icon on any listing to shortlist it."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {savedListings.map((l) => {
                    const maintFee = l.maintenanceIncluded === false ? (l.maintenanceFee ?? 0) : 0;
                    const totalOutflow = l.baseRent + l.wifi + l.water + maintFee;
                    return (
                      <div key={l.id} className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
                        <div className="flex gap-3 p-3">
                          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-navy-100">
                            {l.image ? (
                              <img src={l.image} alt={l.title} loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Home className="h-6 w-6 text-navy-300" />
                              </div>
                            )}

                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-navy-800">{l.title}</p>
                            <p className="flex items-center gap-1 text-xs text-navy-400">
                              <MapPin className="h-3 w-3" />
                              {l.neighborhood} · {l.sharingType}
                            </p>
                            <p className="mt-1 flex items-center text-sm font-extrabold text-coral-500">
                              <IndianRupee className="h-3.5 w-3.5" />
                              {totalOutflow.toLocaleString('en-IN')}
                              <span className="ml-1 text-[11px] font-medium text-navy-400">/mo outflow</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex border-t border-navy-100">
                          <button
                            onClick={() => onViewDetails(l)}
                            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-navy-600 transition-colors hover:bg-navy-50 hover:text-coral-500"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </button>
                          <button
                            onClick={() => onRemoveSaved(l.id)}
                            aria-label={`Remove ${l.title} from saved homes`}
                            className="flex flex-1 items-center justify-center gap-1.5 border-l border-navy-100 py-2.5 text-xs font-bold text-navy-500 transition-colors hover:bg-navy-50 hover:text-coral-500"
                          >
                            <X className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {tab === 'host' && user.role === 'host' && (
            <HostCommandCenter listings={hostListings} leads={hostLeads} onSaveMeta={onSaveHostMeta} onEdit={onEditListing} />
          )}
        </div>
      </div>
    </div>
  );
}

function Countdown({ totalSeconds }: { totalSeconds: number }) {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const cells = d > 0
    ? [{ v: d, l: 'days' }, { v: h, l: 'hrs' }, { v: m, l: 'min' }]
    : [{ v: h, l: 'hrs' }, { v: m, l: 'min' }, { v: s, l: 'sec' }];
  return (
    <div className="mt-2 flex gap-2">
      {cells.map((c) => (
        <div key={c.l} className="flex flex-1 flex-col items-center rounded-lg bg-navy-50 py-2">
          <span className="text-lg font-extrabold tabular-nums text-navy-800">
            {String(c.v).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">{c.l}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-400">
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-bold text-navy-700">{title}</h3>
      <p className="mt-1 max-w-[16rem] text-xs text-navy-400">{hint}</p>
    </div>
  );
}
