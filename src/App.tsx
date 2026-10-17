import { useState, useMemo, useCallback, useEffect } from 'react';
import Navbar, { type Mode } from '@/components/Navbar';
import Hero from '@/components/Hero';
import FilterBar, { type Filters } from '@/components/FilterBar';
import ListingCard from '@/components/ListingCard';
import SubletBanner from '@/components/SubletBanner';
import QuizModal from '@/components/QuizModal';
import DetailModal from '@/components/DetailModal';
import PaymentModal from '@/components/PaymentModal';
import HostListingModal from '@/components/HostListingModal';
import WhatsAppListingAssistant from '@/components/WhatsAppListingAssistant';
import UserDashboard from '@/components/UserDashboard';
import LoginModal from '@/components/LoginModal';
import TermsModal from '@/components/TermsModal';
import { listings as mockListings, computeMatchScore, type QuizAnswers, type Listing } from '@/data/listings';
import { canUnlock, isUnlocked, isPassActive, PASS_PLANS, type AccessPass, type PassType } from '@/data/accessPass';
import { fetchListings, insertListing, updateListing } from '@/lib/listingsApi';
import {
  initDeviceId, loadAccessPass, saveAccessPass,
  loadUnlockedIds, addUnlockedId, loadUnlockedContacts, addUnlockedContact,
} from '@/lib/userStorage';
import {
  normalizePortalRole, type DemoLead, type DemoTransaction,
  type HostListingMeta, type PortalRole, type PortalUser,
} from '@/lib/demoPortal';
import { setPortalRole, signOutPortalUser } from '@/lib/authApi';
import { clearDevelopmentSession, createDevelopmentSession } from '@/lib/devAuth';
import {
  canUseFirebaseTestCheckout, fetchFirebaseSeekerData, grantFirebaseTestCredits, loadFirebaseSavedIds,
  observeFirebaseUser, saveFirebaseSavedIds, setFirebasePortalRole, signOutFirebaseUser, unlockFirebaseContact,
} from '@/lib/firebaseAuth';
import {
  consumeRemoteContactCredit, fetchHostLeads, fetchPaidTransactions, fetchSavedListingIds,
  fetchSeekerAccessData, fetchSeekerPreferences,
  saveHostOccupancy, saveHostProfile, saveSeekerPreferences, setSavedListing,
} from '@/lib/portalDataApi';
import { SearchX, CheckCircle2, AlertCircle, PartyPopper, ArrowUpDown, Sparkles, Target, X } from 'lucide-react';

type SortMode = 'match' | 'newest' | 'price-low';

export default function App() {
  const [mode, setMode] = useState<Mode>('room');
  const [filters, setFilters] = useState<Filters>({
    query: '',
    budget: 20000,
    gender: 'any',
    foodPolicy: 'any',
    videoVerifiedOnly: false,
  });
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [accessPass, setAccessPass] = useState<AccessPass | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [unlockedContacts, setUnlockedContacts] = useState(() => loadUnlockedContacts());
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [paymentListing, setPaymentListing] = useState<Listing | null>(null);
  const [paymentRenewal, setPaymentRenewal] = useState<{ plan: PassType } | null>(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [whatsAppAssistantOpen, setWhatsAppAssistantOpen] = useState(false);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [postAfterLogin, setPostAfterLogin] = useState<'form' | 'whatsapp' | null>(null);
  const [ownedListingIds, setOwnedListingIds] = useState<string[]>([]);
  const [hostMetaById, setHostMetaById] = useState<Record<string, HostListingMeta>>({});
  const [hostLeads, setHostLeads] = useState<DemoLead[]>([]);
  const [transactions, setTransactions] = useState<DemoTransaction[]>([]);
  const [firebaseCreditBalance, setFirebaseCreditBalance] = useState<number | null>(null);
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [demoListings, setDemoListings] = useState<Listing[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const quizActive = !!quizAnswers?.food;

  // Load device-bound access state only; account data is loaded after authentication.
  useEffect(() => {
    initDeviceId();
    setAccessPass(loadAccessPass());
    setUnlockedIds(loadUnlockedIds());
    setUnlockedContacts(loadUnlockedContacts());
    setSavedIds([]);
  }, []);

  useEffect(() => {
    const unsubscribe = observeFirebaseUser((user) => {
      setPortalUser(user);
      if (user?.authMode === 'firebase') {
        setSavedIds(loadFirebaseSavedIds(user.id));
        setAccessPass(null);
        setUnlockedIds([]);
        setUnlockedContacts([]);
        setTransactions([]);
        setFirebaseCreditBalance(null);
      }
      if (!user) {
        setOwnedListingIds([]);
        setSavedIds([]);
        setFirebaseCreditBalance(null);
      }
    });
    return unsubscribe;
  }, []);

  const allListings = useMemo(() => {
    const seen = new Set<string>();
    const combined = [...demoListings, ...dbListings, ...mockListings];
    return combined.filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });
  }, [dbListings, demoListings]);

  useEffect(() => {
    fetchListings().then(setDbListings);
  }, []);

  useEffect(() => {
    if (!portalUser) {
      setOwnedListingIds([]);
      setSavedIds([]);
      return;
    }
    setOwnedListingIds(allListings.filter((listing) => listing.ownerId === portalUser.id).map((listing) => listing.id));
    if (portalUser.authMode === 'firebase') {
      setSavedIds(loadFirebaseSavedIds(portalUser.id));
      setAccessPass(null);
      setUnlockedIds([]);
      setUnlockedContacts([]);
      setTransactions([]);
      setFirebaseCreditBalance(null);
      if (portalUser.role !== 'seeker') return;
      let cancelled = false;
      void fetchFirebaseSeekerData().then((seekerData) => {
        if (cancelled) return;
        setFirebaseCreditBalance(seekerData.contactCredits);
        setUnlockedContacts(seekerData.unlockedContacts);
        setUnlockedIds(seekerData.unlockedContacts.map((contact) => contact.id));
        setTransactions(seekerData.unlockedContacts.map((contact) => ({
          id: `unlock-${contact.id}`,
          label: `Contact unlocked · ${contact.title}`,
          amount: 0,
          createdAt: contact.unlockedAt,
          status: 'unlocked' as const,
        })));
      }).catch(() => {
        if (cancelled) return;
        setToast({ message: 'Could not load your account data right now. Please try again.', type: 'error' });
        setTimeout(() => setToast(null), 6000);
      });
      return () => { cancelled = true; };
    }
    setFirebaseCreditBalance(null);
    if (portalUser.authMode === 'development') {
      return;
    }
    const portalData = portalUser.role === 'seeker'
      ? Promise.all([
        fetchSavedListingIds(portalUser.id),
        fetchSeekerPreferences(portalUser.id),
        fetchSeekerAccessData(portalUser.id),
        fetchPaidTransactions(portalUser.id),
      ]).then(([remoteSavedIds, preferences, accessData, paidTransactions]) => {
          setSavedIds(remoteSavedIds);
          setAccessPass(accessData.pass);
          setUnlockedIds(accessData.unlockedIds);
          setUnlockedContacts(accessData.unlockedContacts);
          setTransactions([
            ...paidTransactions.map((item) => ({
              id: item.id, label: item.label, amount: item.amount, createdAt: item.createdAt, status: item.status,
            })),
            ...accessData.unlockedContacts.map((contact) => ({
              id: `unlock-${contact.id}`,
              label: `Contact unlocked · ${contact.title}`,
              amount: 0,
              createdAt: contact.unlockedAt,
              status: 'unlocked' as const,
            })),
          ].sort((a, b) => b.createdAt - a.createdAt));
          if (preferences) {
            setQuizAnswers(preferences);
            setSortMode('match');
          }
        })
      : portalUser.role === 'host'
        ? fetchHostLeads().then(setHostLeads)
        : Promise.resolve();

    portalData.catch(() => {
      setToast({ message: 'Could not load your account data right now. Please try again.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
    });
  }, [allListings, portalUser]);

  const matchScores = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of allListings) {
      map[l.id] = quizAnswers ? computeMatchScore(l, quizAnswers) : l.matchScore;
    }
    return map;
  }, [quizAnswers, allListings]);

  const hostListings = useMemo(
    () => allListings
      .filter((listing) => ownedListingIds.includes(listing.id))
      .map((listing) => ({
        ...listing,
        hostMeta: hostMetaById[listing.id] ?? {
          status: listing.availabilityStatus ?? 'active',
          totalBeds: listing.totalBeds ?? 1,
          filledBeds: listing.filledBeds ?? 0,
        },
      })),
    [allListings, ownedListingIds, hostMetaById]
  );

  const recordContactUnlock = useCallback(async (listing: Listing) => {
    if (!portalUser || portalUser.role !== 'seeker') return false;
    if (portalUser.authMode === 'firebase') {
      setToast({ message: 'Contact unlock is not available for this account yet.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
      return false;
    }
    if (portalUser.authMode === 'development') {
      setToast({ message: 'Contact unlocks are unavailable in preview sessions.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
      return false;
    }
    try {
      await consumeRemoteContactCredit(listing, matchScores[listing.id] ?? listing.matchScore);
      const accessData = await fetchSeekerAccessData(portalUser.id);
      setAccessPass(accessData.pass);
      setUnlockedIds(accessData.unlockedIds);
      setUnlockedContacts(accessData.unlockedContacts);
      setTransactions((current) => [{
        id: `unlock-${listing.id}`,
        label: `Contact unlocked · ${listing.title}`,
        amount: 0,
        createdAt: Date.now(),
        status: 'unlocked',
      }, ...current.filter((item) => item.id !== `unlock-${listing.id}`)]);
      return true;
    } catch {
      setToast({ message: 'Could not unlock this contact right now. Please try again.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
      return false;
    }
  }, [matchScores, portalUser]);

  const handleClearQuiz = useCallback(() => {
    setQuizAnswers(null);
    setSortMode('newest');
  }, []);

  const handleFiltersChange = useCallback((nextFilters: Filters) => {
    setFilters(nextFilters);
    if (quizActive) handleClearQuiz();
  }, [quizActive, handleClearQuiz]);

  const handleQuizComplete = useCallback((answers: QuizAnswers) => {
    setQuizAnswers(answers);
    setFilters({ query: '', budget: 20000, gender: 'any', foodPolicy: 'any', videoVerifiedOnly: false });
    setQuizOpen(false);
    setSortMode('match');
    if (portalUser?.role === 'seeker') {
      if (portalUser.authMode === 'firebase') {
        setToast({ message: 'Preferences updated for this session. Sign in to sync them across devices.', type: 'success' });
        setTimeout(() => setToast(null), 5000);
        return;
      }
      if (portalUser.authMode === 'development') {
        setToast({ message: 'Preferences updated for this preview only.', type: 'success' });
        setTimeout(() => setToast(null), 5000);
        return;
      }
      void saveSeekerPreferences(portalUser.id, answers).then(() => {
        setToast({ message: 'Lifestyle preferences saved to your account.', type: 'success' });
        setTimeout(() => setToast(null), 4000);
      }).catch((error: unknown) => {
        setToast({ message: error instanceof Error ? error.message : 'Could not save your preferences.', type: 'error' });
      });
    } else {
      setToast({ message: 'Sign in as a seeker to save quiz preferences across devices.', type: 'error' });
      setTimeout(() => setToast(null), 5000);
    }
    setToast({ message: 'Quiz Complete! Listings sorted by your top compatibility matches.', type: 'success' });
    setTimeout(() => setToast(null), 5000);
  }, [portalUser]);

  const handleUnlockClick = useCallback((listing: Listing) => {
    if (!portalUser || portalUser.role !== 'seeker') {
      setPostAfterLogin(null);
      setLoginOpen(true);
      return;
    }
    if (portalUser.authMode === 'development') {
      setToast({ message: 'Contact unlocks are unavailable in preview sessions.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
      return;
    }
    // Existing unlocked listing bypasses payment and shows contact directly.
    if (unlockedIds.includes(listing.id) || isUnlocked(accessPass, listing.id)) {
      setSelectedListing(listing);
      return;
    }
    if (portalUser.authMode === 'firebase') {
      void unlockFirebaseContact(listing.id).then((result) => {
        setFirebaseCreditBalance(result.contactCredits);
        setUnlockedContacts(result.unlockedContacts);
        setUnlockedIds(result.unlockedContacts.map((contact) => contact.id));
        setTransactions(result.unlockedContacts.map((contact) => ({
          id: `unlock-${contact.id}`,
          label: `Contact unlocked · ${contact.title}`,
          amount: 0,
          createdAt: contact.unlockedAt,
          status: 'unlocked' as const,
        })));
        if (!result.success) {
          setPaymentListing(listing);
          setSelectedListing(null);
          return;
        }
        setSelectedListing(listing);
        setToast({ message: 'Contact unlocked and saved to your account.', type: 'success' });
        setTimeout(() => setToast(null), 4000);
      }).catch((error: unknown) => {
        setToast({ message: error instanceof Error ? error.message : 'Could not unlock this contact.', type: 'error' });
        setTimeout(() => setToast(null), 6000);
      });
      return;
    }
    if (accessPass && canUnlock(accessPass, listing.id)) {
      void recordContactUnlock(listing).then((unlocked) => {
        if (!unlocked) return;
        setSelectedListing(listing);
        setToast({ message: 'Contact unlocked and saved to your account.', type: 'success' });
        setTimeout(() => setToast(null), 4000);
      });
      return;
    }
    setPaymentListing(listing);
  }, [accessPass, unlockedIds, portalUser, recordContactUnlock]);

  const handlePassActivated = useCallback((pass: AccessPass, listing: Listing | null) => {
    if (portalUser?.authMode === 'firebase') {
      setToast({ message: 'Contact credits are updated after payment verification.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
      return;
    }
    const now = Date.now();
    const canStack = !!accessPass && accessPass.expiresAt > now;
    const alreadyUnlocked = !!listing && (unlockedIds.includes(listing.id) || isUnlocked(accessPass, listing.id));
    const nextPass: AccessPass = {
      type: pass.type,
      unlockedIds: [...new Set([...(canStack ? accessPass?.unlockedIds ?? [] : []), ...pass.unlockedIds])],
      expiresAt: Math.max(canStack ? accessPass?.expiresAt ?? 0 : 0, pass.expiresAt),
      remainingCredits: (canStack ? accessPass?.remainingCredits ?? 0 : 0) + pass.remainingCredits - (listing && !alreadyUnlocked ? 1 : 0),
      totalCredits: (canStack ? accessPass?.totalCredits ?? 0 : 0) + pass.totalCredits,
    };
    setAccessPass(nextPass);
    saveAccessPass(nextPass);
    setTransactions((current) => [{
      id: `pass-${Date.now()}`,
      label: `${PASS_PLANS[pass.type].label} purchase`,
      amount: PASS_PLANS[pass.type].price,
      createdAt: Date.now(),
      status: 'paid',
    }, ...current]);
    // Record the unlocked listing id (cumulative across passes). Skipped for renewals.
    if (listing) {
      const nextUnlocked = addUnlockedId(listing.id);
      setUnlockedIds(nextUnlocked);
      setUnlockedContacts(addUnlockedContact({
        id: listing.id,
        title: listing.title,
        neighborhood: listing.neighborhood,
        baseRent: listing.baseRent,
        image: listing.image,
        hostPhone: listing.hostPhone,
        hostWhatsApp: listing.hostWhatsApp,
        unlockedAt: Date.now(),
      }));
      recordContactUnlock(listing);
    }
    setPaymentListing(null);
    setPaymentRenewal(null);
    setToast({ message: 'Payment Successful! Contact unlocked.', type: 'success' });
    setTimeout(() => setToast(null), 4000);
  }, [accessPass, unlockedIds, recordContactUnlock, portalUser]);

  const handleToggleSave = useCallback((listingId: string) => {
    if (!portalUser || portalUser.role !== 'seeker') {
      setLoginOpen(true);
      return;
    }
    const shouldSave = !savedIds.includes(listingId);
    if (portalUser.authMode === 'firebase') {
      const nextIds = shouldSave
        ? [...new Set([...savedIds, listingId])]
        : savedIds.filter((id) => id !== listingId);
      try {
        saveFirebaseSavedIds(portalUser.id, nextIds);
        setSavedIds(nextIds);
        setToast({ message: shouldSave ? 'Saved in this browser.' : 'Removed from saved homes.', type: 'success' });
      } catch (error) {
        setToast({ message: error instanceof Error ? error.message : 'Could not save this listing.', type: 'error' });
      }
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (portalUser.authMode === 'development') {
      setSavedIds((current) => shouldSave
        ? [...new Set([...current, listingId])]
        : current.filter((id) => id !== listingId));
      setToast({ message: shouldSave ? 'Saved in this preview only.' : 'Removed from preview saves.' , type: 'success' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    void setSavedListing(portalUser.id, listingId, shouldSave).then(() => {
      setSavedIds((current) => shouldSave ? [...new Set([...current, listingId])] : current.filter((id) => id !== listingId));
      setToast({ message: shouldSave ? 'Saved to your account.' : 'Removed from saved homes.', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    }).catch((error: unknown) => {
      setToast({ message: error instanceof Error ? error.message : 'Could not update saved homes.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
    });
  }, [portalUser, savedIds]);

  const handleRemoveSaved = useCallback((listingId: string) => {
    if (!portalUser) return;
    if (portalUser.authMode === 'firebase') {
      const nextIds = savedIds.filter((id) => id !== listingId);
      try {
        saveFirebaseSavedIds(portalUser.id, nextIds);
        setSavedIds(nextIds);
      } catch (error) {
        setToast({ message: error instanceof Error ? error.message : 'Could not remove this listing.', type: 'error' });
        setTimeout(() => setToast(null), 5000);
      }
      return;
    }
    if (portalUser.authMode === 'development') {
      setSavedIds((current) => current.filter((id) => id !== listingId));
      return;
    }
    void setSavedListing(portalUser.id, listingId, false).then(() => {
      setSavedIds((current) => current.filter((id) => id !== listingId));
    }).catch((error: unknown) => {
      setToast({ message: error instanceof Error ? error.message : 'Could not update saved homes.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
    });
  }, [portalUser, savedIds]);

  const handleRenew = useCallback((plan: PassType) => {
    if (portalUser?.authMode === 'firebase') {
      if (canUseFirebaseTestCheckout(portalUser.phone ?? portalUser.contact)) {
        setDashboardOpen(false);
        setPaymentRenewal({ plan });
      } else {
        setToast({ message: 'Pass purchases are temporarily unavailable. Please try again later.', type: 'error' });
        setTimeout(() => setToast(null), 6000);
      }
      return;
    }
    if (portalUser?.authMode === 'development') {
      setToast({ message: 'Purchases are disabled for development sandbox sessions.', type: 'error' });
      setTimeout(() => setToast(null), 5000);
      return;
    }
    setDashboardOpen(false);
    setPaymentRenewal({ plan });
  }, [portalUser]);

  const handleAddContacts = useCallback(() => {
    if (!portalUser || portalUser.role !== 'seeker') {
      setLoginOpen(true);
      return;
    }
    if (portalUser.authMode === 'firebase') {
      if (canUseFirebaseTestCheckout(portalUser.phone ?? portalUser.contact)) {
        setDashboardOpen(false);
        setPaymentRenewal({ plan: 'single' });
      } else {
        setToast({ message: 'Pass purchases are temporarily unavailable. Please try again later.', type: 'error' });
        setTimeout(() => setToast(null), 6000);
      }
      return;
    }
    if (portalUser.authMode === 'development') {
      setToast({ message: 'Purchases are disabled for development sandbox sessions.', type: 'error' });
      setTimeout(() => setToast(null), 5000);
      return;
    }
    setPaymentRenewal({ plan: 'single' });
  }, [portalUser]);

  const handleFirebaseTestPurchase = useCallback(async (plan: PassType) => {
    const result = await grantFirebaseTestCredits(plan);
    setFirebaseCreditBalance(result.contactCredits);
    setUnlockedContacts(result.unlockedContacts);
    setUnlockedIds(result.unlockedContacts.map((contact) => contact.id));
    setTransactions(result.unlockedContacts.map((contact) => ({
      id: `unlock-${contact.id}`,
      label: `Contact unlocked · ${contact.title}`,
      amount: 0,
      createdAt: contact.unlockedAt,
      status: 'unlocked' as const,
    })));
    setPaymentListing(null);
    setPaymentRenewal(null);
    setToast({ message: `${PASS_PLANS[plan].credits} test contact credits added to your account.`, type: 'success' });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleViewDetails = useCallback((listing: Listing) => {
    setDashboardOpen(false);
    setSelectedListing(listing);
  }, []);

  const openHostAction = useCallback((action: 'form' | 'whatsapp') => {
    setDashboardOpen(false);
    if (portalUser?.role === 'host') {
      if (action === 'form') setHostModalOpen(true);
      else setWhatsAppAssistantOpen(true);
      return;
    }
    setPostAfterLogin(action);
    setLoginOpen(true);
  }, [portalUser]);

  const handleLogin = useCallback((candidate: PortalUser) => {
    if (postAfterLogin && candidate.role !== 'host') {
      setPortalUser(candidate);
      setLoginOpen(false);
      setDashboardOpen(true);
      setPostAfterLogin(null);
      setToast({ message: 'Phone verified. Switch your role to Host in the dashboard before posting a listing.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
      return;
    }
    setPortalUser(candidate);
    setLoginOpen(false);
    setDashboardOpen(!postAfterLogin);
    const notification: { message: string; type: 'error' | 'success' } = candidate.profileSyncError
      ? { message: 'Signed in, but we could not sync your account right now. Please try again later.', type: 'error' as const }
      : {
      message: candidate.authMode === 'development'
        ? 'Welcome to Rahoa! Preview session active.'
        : candidate.authMode === 'firebase'
          ? 'Welcome to Rahoa! Your phone was verified.'
          : 'Welcome to Rahoa! Phone verified.',
      type: 'success',
    };
    setToast(notification);
    setTimeout(() => setToast(null), candidate.profileSyncError ? 10000 : 5000);
    if (postAfterLogin === 'form') setHostModalOpen(true);
    if (postAfterLogin === 'whatsapp') setWhatsAppAssistantOpen(true);
    setPostAfterLogin(null);
  }, [postAfterLogin]);

  const handleSwitchRole = useCallback((role: PortalRole) => {
    if (!portalUser) return;
    const normalizedRole = normalizePortalRole(role);
    if (portalUser.authMode === 'firebase') {
      void setFirebasePortalRole(normalizedRole).then((updatedUser) => {
        setPortalUser(updatedUser);
        setToast(updatedUser.profileSyncError
          ? { message: `Role updated on this device, but profile sync failed: ${updatedUser.profileSyncError}`, type: 'error' }
          : { message: 'Your role was updated.', type: 'success' });
        setTimeout(() => setToast(null), updatedUser.profileSyncError ? 10000 : 4000);
      }).catch((error: unknown) => {
        setToast({ message: error instanceof Error ? error.message : 'Could not change your role.', type: 'error' });
        setTimeout(() => setToast(null), 6000);
      });
      return;
    }
    if (portalUser.authMode === 'development') {
      const updatedUser = createDevelopmentSession(portalUser.phone ?? portalUser.contact, normalizedRole);
      setPortalUser(updatedUser);
      return;
    }
    void setPortalRole(portalUser.id, normalizedRole).then(() => {
      setPortalUser({ ...portalUser, role: normalizedRole });
    }).catch((error: unknown) => {
      setToast({ message: error instanceof Error ? error.message : 'Could not switch portal role.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
    });
  }, [portalUser]);

  const handleSignOut = useCallback(() => {
    if (portalUser?.authMode === 'firebase') {
      void signOutFirebaseUser().then(() => setDashboardOpen(false)).catch((error: unknown) => {
        setToast({ message: error instanceof Error ? error.message : 'Could not sign out.', type: 'error' });
        setTimeout(() => setToast(null), 6000);
      });
      return;
    }
    if (portalUser?.authMode === 'development') {
      clearDevelopmentSession();
      setPortalUser(null);
      setDashboardOpen(false);
      setSavedIds([]);
      return;
    }
    void signOutPortalUser().then(() => setDashboardOpen(false)).catch((error: unknown) => {
      setToast({ message: error instanceof Error ? error.message : 'Could not sign out.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
    });
  }, [portalUser]);

  const handleSaveHostMeta = useCallback((listingId: string, meta: HostListingMeta) => {
    if (portalUser?.authMode === 'development' || portalUser?.authMode === 'firebase') {
      setHostMetaById((current) => ({ ...current, [listingId]: meta }));
      setToast({
        message: portalUser.authMode === 'firebase'
          ? 'Occupancy updated in this browser only.'
          : 'Occupancy updated in this preview only.',
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    void saveHostOccupancy(listingId, meta).then(() => {
      setHostMetaById((current) => ({ ...current, [listingId]: meta }));
      setToast({ message: 'Occupancy updated.', type: 'success' });
      setTimeout(() => setToast(null), 4000);
    }).catch((error: unknown) => {
      setToast({ message: error instanceof Error ? error.message : 'Could not save occupancy.', type: 'error' });
      setTimeout(() => setToast(null), 6000);
    });
  }, [portalUser]);

  const handlePublishListing = useCallback(async (listing: Listing) => {
    if (!portalUser || portalUser.role !== 'host') {
      setToast({ message: 'Sign in as a Host / PG Owner before publishing.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setHostModalOpen(false);
    if (portalUser.authMode === 'development' || portalUser.authMode === 'firebase') {
      const localListing = { ...listing, ownerId: portalUser.id };
      setDemoListings((current) => [localListing, ...current]);
      setOwnedListingIds((current) => [...new Set([...current, localListing.id])]);
      const capacity = Number(listing.sharingType.match(/\d+/)?.[0] ?? 1);
      setHostMetaById((current) => ({
        ...current,
        [localListing.id]: { status: 'active', totalBeds: capacity, filledBeds: 0 },
      }));
      setToast({
        message: portalUser.authMode === 'firebase'
          ? 'Listing added in this browser only; it has not been published.'
          : 'Preview listing added in this browser only; it has not been published.',
        type: 'success',
      });
      setTimeout(() => setToast(null), 5000);
      return;
    }
    setToast({ message: 'Publishing your listing...', type: 'success' });
    const { listing: saved, errorMessage } = await insertListing(listing, portalUser.id);
    if (saved) {
      setDbListings((prev) => [saved, ...prev]);
      setOwnedListingIds((current) => [...new Set([...current, saved.id])]);
      const capacity = Number(listing.sharingType.match(/\d+/)?.[0] ?? 1);
      const meta = { status: 'active' as const, totalBeds: capacity, filledBeds: 0 };
      setHostMetaById((current) => ({ ...current, [saved.id]: meta }));
      try {
        await saveHostProfile({ userId: portalUser.id, displayName: portalUser.fullName ?? '', listing });
      } catch (error) {
        setToast({ message: error instanceof Error ? error.message : 'Host contact profile could not be saved.', type: 'error' });
        setTimeout(() => setToast(null), 6000);
        return;
      }
      setToast({ message: 'Listing and host details published.', type: 'success' });
    } else {
      setToast({ message: `Failed to publish: ${errorMessage ?? 'Unknown error'}`, type: 'error' });
    }
    setTimeout(() => setToast(null), 6000);
  }, [portalUser]);

  const handleEditHostListing = useCallback(async (listing: Listing) => {
    if (portalUser?.authMode === 'development' || portalUser?.authMode === 'firebase') {
      setDemoListings((current) => current.map((item) => item.id === listing.id ? listing : item));
      setToast({
        message: portalUser.authMode === 'firebase'
          ? 'Listing updated in this browser only.'
          : 'Preview listing updated locally only.',
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    const { listing: updated, errorMessage } = await updateListing(listing);
    if (!updated) {
      setToast({ message: `Failed to update listing: ${errorMessage ?? 'Unknown error'}`, type: 'error' });
      setTimeout(() => setToast(null), 6000);
      return;
    }
    setDbListings((current) => current.map((item) => item.id === updated.id ? updated : item));
    setToast({ message: 'Listing details updated.', type: 'success' });
    setTimeout(() => setToast(null), 4000);
  }, [portalUser]);

  const handleOpenWhatsAppAssistant = useCallback(() => {
    setHostModalOpen(false);
    openHostAction('whatsapp');
  }, [openHostAction]);

  const handleCreateDemoListing = useCallback((listing: Listing) => {
    if (import.meta.env.VITE_ENABLE_WHATSAPP_DEMO !== 'true' || portalUser?.role !== 'host') {
      setToast({ message: 'WhatsApp demo ingestion is disabled or requires a host demo session.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setDemoListings((previous) => [listing, ...previous]);
    setMode('room');
    setFilters({ query: '', budget: 20000, gender: 'any', foodPolicy: 'any', videoVerifiedOnly: false });
    handleClearQuiz();
    setToast({ message: 'Demo WhatsApp listing added to the live feed!', type: 'success' });
    setTimeout(() => setToast(null), 5000);
  }, [handleClearQuiz, portalUser]);

  const filteredListings = useMemo(() => {
    return allListings
      .filter((l) => {
        if (filters.query) {
          const q = filters.query.toLowerCase();
          if (!l.title.toLowerCase().includes(q) && !l.neighborhood.toLowerCase().includes(q)) {
            return false;
          }
        }
        const maintFee = l.maintenanceIncluded === false ? (l.maintenanceFee ?? 0) : 0;
        const elecVal = l.electricityOption === 'Fixed ₹/month' ? l.electricity : 0;
        const messVal = l.messOption === '₹ Extra / month' ? l.mess : 0;
        const totalOutflow = l.baseRent + messVal + elecVal + l.wifi + l.water + maintFee;
        if (totalOutflow > filters.budget) return false;
        if (filters.gender !== 'any' && l.gender !== 'any' && l.gender !== filters.gender) return false;
        if (filters.foodPolicy !== 'any') {
          const listingFood = l.foodHabit ?? (l.foodPolicy === 'strict-veg' ? 'Strict Pure Veg Only' : 'Non-Veg Friendly');
          if (filters.foodPolicy === 'strict-veg' && listingFood !== 'Strict Pure Veg Only') return false;
          if (filters.foodPolicy === 'eggetarian' && listingFood !== 'Eggetarian') return false;
          if (filters.foodPolicy === 'non-veg' && listingFood !== 'Non-Veg Friendly') return false;
        }
        if (filters.videoVerifiedOnly && !l.videoVerified) return false;

        if (mode === 'bed') {
          return l.hostType === 'tenant' || l.sharingType.includes('Bed');
        }
        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'match') {
          return (matchScores[b.id] ?? 0) - (matchScores[a.id] ?? 0);
        }
        if (sortMode === 'price-low') {
          const aTotal = a.baseRent + a.wifi + a.water;
          const bTotal = b.baseRent + b.wifi + b.water;
          return aTotal - bTotal;
        }
        // newest — db listings first (they were prepended), then mock by id desc
        const aIsDemo = demoListings.some((d) => d.id === a.id);
        const bIsDemo = demoListings.some((d) => d.id === b.id);
        if (aIsDemo && !bIsDemo) return -1;
        if (!aIsDemo && bIsDemo) return 1;
        const aIsDb = dbListings.some((d) => d.id === a.id);
        const bIsDb = dbListings.some((d) => d.id === b.id);
        if (aIsDb && !bIsDb) return -1;
        if (!aIsDb && bIsDb) return 1;
        return b.id.localeCompare(a.id);
      });
  }, [filters, mode, allListings, sortMode, matchScores, dbListings, demoListings]);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar
        mode={mode}
        setMode={setMode}
        onPostClick={() => openHostAction('form')}
        onWhatsAppClick={handleOpenWhatsAppAssistant}
        onProfileClick={() => portalUser ? setDashboardOpen(true) : setLoginOpen(true)}
        portalUser={portalUser}
        savedCount={savedIds.length}
        unlockedCount={unlockedIds.length}
        activeBalance={isPassActive(accessPass) ? accessPass?.remainingCredits ?? 0 : 0}
        onAddContacts={handleAddContacts}
        quizActive={quizActive}
      />

      <Hero />

      <main className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Filter section */}
        <div className="relative z-20 -mt-2 mb-8">
          <FilterBar filters={filters} setFilters={handleFiltersChange} />
        </div>

        {/* Active pass banner */}
        {accessPass && accessPass.expiresAt > Date.now() && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 animate-fade-in">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
              <CheckCircle2 className="h-3 w-3" />
            </span>
            Active Balance: {accessPass.remainingCredits} contact{accessPass.remainingCredits === 1 ? '' : 's'} remaining
            <span className="ml-auto text-xs font-medium">Valid until: {new Date(accessPass.expiresAt).toLocaleString()}</span>
          </div>
        )}

        {/* Quiz personalized banner */}
        {quizActive && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 animate-fade-in">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
              <PartyPopper className="h-3 w-3" />
            </span>
            Match scores personalized to your lifestyle profile
          </div>
        )}

        {/* Results header + sort toggle */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div>
              <h2 className="text-xl font-extrabold text-navy-800 lg:text-2xl">
                {mode === 'room' ? 'Available Rooms & PGs' : 'Empty Beds & Flatmates'}
              </h2>
              <p className="mt-0.5 text-sm text-navy-400">
                {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'} matching your filters
              </p>
            </div>
            {quizActive ? (
              <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 p-1 text-sm font-bold text-emerald-700">
                <button
                  onClick={() => setQuizOpen(true)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-emerald-100"
                >
                  <Target className="h-4 w-4" />
                  Match Quiz Active
                </button>
                <button
                  onClick={handleClearQuiz}
                  aria-label="Clear match quiz"
                  title="Clear match quiz"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-600 transition-colors hover:bg-emerald-200 hover:text-emerald-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setQuizOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 transition-all hover:border-coral-400 hover:text-coral-500"
              >
                <Sparkles className="h-4 w-4" />
                Take Match Quiz
              </button>
            )}
          </div>

          {/* Sort toggle */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-semibold text-navy-400">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort by:
            </span>
            <div className="flex rounded-full bg-navy-50 p-1">
              <button
                onClick={() => setSortMode('match')}
                disabled={!quizActive}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  sortMode === 'match'
                    ? 'bg-coral-500 text-white shadow-md'
                    : quizActive
                      ? 'text-navy-600 hover:text-navy-800'
                      : 'cursor-not-allowed text-navy-300'
                }`}
              >
                Highest Match
              </button>
              <button
                onClick={() => setSortMode('newest')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  sortMode === 'newest'
                    ? 'bg-coral-500 text-white shadow-md'
                    : 'text-navy-600 hover:text-navy-800'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortMode('price-low')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  sortMode === 'price-low'
                    ? 'bg-coral-500 text-white shadow-md'
                    : 'text-navy-600 hover:text-navy-800'
                }`}
              >
                Price: Low to High
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                matchScore={matchScores[listing.id]}
                quizActive={quizActive}
                unlocked={unlockedIds.includes(listing.id) || isUnlocked(accessPass, listing.id)}
                saved={savedIds.includes(listing.id)}
                onCardClick={() => setSelectedListing(listing)}
                onUnlockClick={() => handleUnlockClick(listing)}
                onToggleSave={() => handleToggleSave(listing.id)}
                activeBalance={isPassActive(accessPass) ? accessPass?.remainingCredits ?? 0 : 0}
                onAddContacts={handleAddContacts}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-20 text-center">
            <SearchX className="h-12 w-12 text-navy-300" />
            <h3 className="mt-4 text-lg font-bold text-navy-700">No listings match your filters</h3>
            <p className="mt-1 text-sm text-navy-400">Try widening your budget or clearing some filters.</p>
          </div>
        )}

        {/* Sublet banner */}
        <div className="my-12">
          <SubletBanner onWhatsAppClick={handleOpenWhatsAppAssistant} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-navy-800">Rahoa</span>
              <span className="text-sm text-navy-400">— List. Match. Stay.</span>
            </div>
            <div className="flex gap-6 text-sm font-medium text-navy-500">
              <a href="#" className="transition-colors hover:text-coral-500">About</a>
              <a href="#" className="transition-colors hover:text-coral-500">Safety</a>
              <a href="#" className="transition-colors hover:text-coral-500">Help</a>
              <button onClick={() => setTermsOpen(true)} className="transition-colors hover:text-coral-500">Terms</button>
            </div>
            <p className="text-xs text-navy-400">© 2026 Rahoa. List. Match. Stay.</p>
          </div>
        </div>
      </footer>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-2xl animate-slide-up max-w-[90vw] flex-wrap justify-center text-center ${
            toast.type === 'error'
              ? 'bg-red-500 shadow-red-500/30'
              : 'bg-emerald-500 shadow-emerald-500/30'
          }`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <PartyPopper className="h-5 w-5 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Modals */}
      {quizOpen && (
        <QuizModal onClose={() => setQuizOpen(false)} onComplete={handleQuizComplete} />
      )}
      {selectedListing && (
        <DetailModal
          listing={selectedListing}
          matchScore={matchScores[selectedListing.id]}
          quizAnswers={quizAnswers}
          unlocked={unlockedIds.includes(selectedListing.id) || isUnlocked(accessPass, selectedListing.id)}
          user={portalUser}
          onRequestLogin={() => setLoginOpen(true)}
          onClose={() => setSelectedListing(null)}
          onUnlockClick={() => handleUnlockClick(selectedListing)}
        />
      )}
      {paymentListing && (
        <PaymentModal
          listing={paymentListing}
          onClose={() => setPaymentListing(null)}
          onPassActivated={handlePassActivated}
          currentPass={accessPass}
          checkoutDisabled={portalUser?.authMode === 'firebase'
            && !canUseFirebaseTestCheckout(portalUser.phone ?? portalUser.contact)}
          mockCheckout={portalUser?.authMode === 'firebase'
            && canUseFirebaseTestCheckout(portalUser.phone ?? portalUser.contact)}
          onTestPurchase={handleFirebaseTestPurchase}
        />
      )}
      {paymentRenewal && (
        <PaymentModal
          isRenewal
          initialPlan={paymentRenewal.plan}
          onClose={() => setPaymentRenewal(null)}
          onPassActivated={handlePassActivated}
          currentPass={accessPass}
          checkoutDisabled={portalUser?.authMode === 'firebase'
            && !canUseFirebaseTestCheckout(portalUser.phone ?? portalUser.contact)}
          mockCheckout={portalUser?.authMode === 'firebase'
            && canUseFirebaseTestCheckout(portalUser.phone ?? portalUser.contact)}
          onTestPurchase={handleFirebaseTestPurchase}
        />
      )}
      {hostModalOpen && (
        <HostListingModal
          onClose={() => setHostModalOpen(false)}
          onPublish={handlePublishListing}
          onWhatsAppClick={handleOpenWhatsAppAssistant}
        />
      )}
      {whatsAppAssistantOpen && (
        <WhatsAppListingAssistant
          onClose={() => setWhatsAppAssistantOpen(false)}
          onCreateDemoListing={handleCreateDemoListing}
        />
      )}
      {portalUser && (
        <UserDashboard
          open={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
          accessPass={accessPass}
          firebaseCreditBalance={firebaseCreditBalance}
          unlockedIds={unlockedIds}
          unlockedContacts={unlockedContacts}
          savedIds={savedIds}
          listings={allListings}
          onRemoveSaved={handleRemoveSaved}
          onRenew={handleRenew}
          onViewDetails={handleViewDetails}
          user={portalUser}
          preferences={quizAnswers}
          transactions={transactions}
          hostListings={hostListings}
          hostLeads={hostLeads}
          onEditPreferences={() => { setDashboardOpen(false); setQuizOpen(true); }}
          onSwitchRole={handleSwitchRole}
          onSignOut={handleSignOut}
          onSaveHostMeta={handleSaveHostMeta}
          onEditListing={handleEditHostListing}
        />
      )}
      {loginOpen && (
        <LoginModal
          onClose={() => { setLoginOpen(false); setPostAfterLogin(null); }}
          onLogin={handleLogin}
          onOpenTerms={() => setTermsOpen(true)}
          defaultRole={postAfterLogin ? 'host' : 'seeker'}
        />
      )}
      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
    </div>
  );
}
