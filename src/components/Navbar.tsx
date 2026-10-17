import { Plus, UserCircle2, Menu, X, MessageCircle, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Logo from './Logo';
import type { PortalUser } from '@/lib/demoPortal';

export type Mode = 'room' | 'bed';

interface NavbarProps {
  mode: Mode;
  setMode: (m: Mode) => void;
  onPostClick: () => void;
  onWhatsAppClick: () => void;
  onProfileClick: () => void;
  portalUser: PortalUser | null;
  savedCount: number;
  unlockedCount: number;
  quizActive: boolean;
  activeBalance: number;
  onAddContacts: () => void;
}

function formatDisplayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}

export default function Navbar({ mode, setMode, onPostClick, onWhatsAppClick, onProfileClick, portalUser, savedCount, unlockedCount, activeBalance, onAddContacts }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const postMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!postMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (postMenuRef.current && !postMenuRef.current.contains(event.target as Node)) {
        setPostMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPostMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [postMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  const postActions = (
    <>
      <button
        onClick={() => { onPostClick(); setPostMenuOpen(false); setMobileOpen(false); }}
        className="flex min-h-10 w-full items-center justify-start gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-bold text-navy-700 transition-colors hover:bg-navy-50"
      >
        <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        Fill out the listing form
      </button>
      <button
        onClick={() => { onWhatsAppClick(); setPostMenuOpen(false); setMobileOpen(false); }}
        className="flex min-h-10 w-full items-center justify-start gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        ⚡ List via WhatsApp in 60s
      </button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-navy-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <Logo />

        {/* Center mode switcher */}
        <div className="hidden items-center rounded-full bg-navy-50 p-1 shadow-inner md:flex">
          <button
            onClick={() => setMode('room')}
            className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${
              mode === 'room'
                ? 'bg-navy-800 text-white shadow-md'
                : 'text-navy-500 hover:text-navy-700'
            }`}
          >
            Find Entire Room / PG
          </button>
          <button
            onClick={() => setMode('bed')}
            className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${
              mode === 'bed'
                ? 'bg-navy-800 text-white shadow-md'
                : 'text-navy-500 hover:text-navy-700'
            }`}
          >
            Find Empty Bed / Flatmate
          </button>
        </div>

        {/* Right actions */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="relative" ref={postMenuRef}>
            <button
              onClick={() => setPostMenuOpen((open) => !open)}
              aria-expanded={postMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-coral-500/30 transition-all duration-300 hover:bg-coral-600 hover:shadow-xl hover:shadow-coral-500/40 active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Post a Listing
              <ChevronDown className={`h-4 w-4 transition-transform ${postMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {postMenuOpen && (
              <div role="menu" className="absolute right-0 top-full z-[60] mt-2 w-72 rounded-2xl border border-navy-100 bg-white p-2 shadow-xl">
                {postActions}
              </div>
            )}
          </div>
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-label={portalUser ? `Open dashboard for ${formatDisplayPhone(portalUser.phone ?? portalUser.contact)}` : 'Sign in or open my dashboard'}
              title="My Dashboard"
              aria-expanded={profileMenuOpen}
              className="relative flex min-h-10 items-center justify-center gap-2 rounded-full bg-navy-100 px-3 text-navy-600 transition-all duration-300 hover:bg-navy-200 hover:text-navy-800"
            >
              <UserCircle2 className="h-6 w-6 shrink-0" />
              {portalUser && (
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-bold">{formatDisplayPhone(portalUser.phone ?? portalUser.contact)}</span>
                  <span className="text-[10px] font-semibold capitalize text-navy-500">{portalUser.role}</span>
                </span>
              )}
              {(savedCount > 0 || unlockedCount > 0) && (
                <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white shadow">
                  {savedCount + unlockedCount}
                </span>
              )}
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-full z-[70] mt-2 w-64 rounded-2xl border border-navy-100 bg-white p-3 shadow-xl">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen(false)}
                  aria-label="Close account menu"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-700"
                >
                  <X className="h-4 w-4" />
                </button>
              {portalUser && (
                <div className="mb-2 rounded-xl bg-navy-50 px-3 py-2">
                  <p className="text-sm font-extrabold text-navy-800">{formatDisplayPhone(portalUser.phone ?? portalUser.contact)}</p>
                  <p className="mt-0.5 text-xs font-semibold capitalize text-navy-500">{portalUser.role} account</p>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                <span>Active Balance: {activeBalance} contact{activeBalance === 1 ? '' : 's'}</span>
                <button onClick={() => { onAddContacts(); setProfileMenuOpen(false); }} className="whitespace-nowrap underline underline-offset-2">+ Add More</button>
              </div>
              <button onClick={() => { onProfileClick(); setProfileMenuOpen(false); }} className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-navy-700 hover:bg-navy-50">
                My Dashboard / Account
              </button>
            </div>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="animate-fade-in border-t border-navy-100 bg-white px-4 py-4 md:hidden">
          <div className="mb-4 flex rounded-full bg-navy-50 p-1">
            <button
              onClick={() => { setMode('room'); setMobileOpen(false); }}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                mode === 'room' ? 'bg-navy-800 text-white' : 'text-navy-500'
              }`}
            >
              Entire Room / PG
            </button>
            <button
              onClick={() => { setMode('bed'); setMobileOpen(false); }}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                mode === 'bed' ? 'bg-navy-800 text-white' : 'text-navy-500'
              }`}
            >
              Empty Bed / Flatmate
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
              {postActions}
            </div>
            <button
              onClick={() => { onProfileClick(); setMobileOpen(false); }}
              className="relative flex items-center justify-center gap-2 rounded-full bg-navy-100 px-4 py-2.5 text-sm font-bold text-navy-700"
            >
              <UserCircle2 className="h-5 w-5" />
              {portalUser ? (
                <span className="flex items-center gap-2">
                  <span>{formatDisplayPhone(portalUser.phone ?? portalUser.contact)}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] capitalize">{portalUser.role}</span>
                </span>
              ) : 'Sign in / My Dashboard'}
              {(savedCount > 0 || unlockedCount > 0) && (
                <span className="ml-1 rounded-full bg-coral-500 px-1.5 text-[10px] font-bold text-white">
                  {savedCount + unlockedCount}
                </span>
              )}
            </button>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <span>Active Balance: {activeBalance} contact{activeBalance === 1 ? '' : 's'}</span>
              <button onClick={() => { onAddContacts(); setMobileOpen(false); }} className="whitespace-nowrap underline underline-offset-2">+ Add More Contacts</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
