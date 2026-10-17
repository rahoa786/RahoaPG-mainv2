import { useState } from 'react';
import { X, Check, Zap, MessageCircle, ShieldCheck, IndianRupee, Sparkles, Lock, AlertCircle } from 'lucide-react';
import { PASS_PLANS, type PassType, type AccessPass } from '@/data/accessPass';
import type { Listing } from '@/data/listings';

interface PaymentModalProps {
  /** The listing being unlocked. Omit for a pure pass renewal. */
  listing?: Listing;
  onClose: () => void;
  onPassActivated: (pass: AccessPass, listing: Listing | null) => void;
  /** When opened for a pass renewal (no specific listing), hide listing context. */
  isRenewal?: boolean;
  initialPlan?: PassType;
  currentPass?: AccessPass | null;
  checkoutDisabled?: boolean;
  mockCheckout?: boolean;
  onTestPurchase?: (plan: PassType) => Promise<void>;
}

const RAZORPAY_KEY_ID = 'rzp_test_TdRTZUj2jUdAya';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      on: (event: string, handler: () => void) => void;
      open: () => void;
    };
  }
}

export default function PaymentModal({
  listing, onClose, onPassActivated, isRenewal = false, initialPlan = 'single', currentPass = null,
  checkoutDisabled = false, mockCheckout = false, onTestPurchase,
}: PaymentModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PassType>(initialPlan);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handlePay = async () => {
    const plan = PASS_PLANS[selectedPlan];
    setProcessing(true);
    setPaymentError(null);
    if (mockCheckout) {
      try {
        if (!onTestPurchase) throw new Error('Local test checkout is not configured.');
        await onTestPurchase(selectedPlan);
      } catch (error) {
        setPaymentError(error instanceof Error ? error.message : 'The local test purchase failed.');
        setProcessing(false);
      }
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: plan.amountPaise,
      currency: 'INR',
      name: 'Rahoa',
      description: plan.description,
      prefill: {
        name: 'Test User',
        contact: '9999999999',
      },
      theme: { color: '#E05A47' },
      handler: () => {
        const pass: AccessPass = {
          type: selectedPlan,
          unlockedIds: listing ? [listing.id] : [],
          expiresAt: Date.now() + plan.durationHours * 60 * 60 * 1000,
          remainingCredits: plan.credits,
          totalCredits: plan.credits,
        };
        onPassActivated(pass, listing ?? null);
        setProcessing(false);
      },
      modal: {
        ondismiss: () => {
          setProcessing(false);
        },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setProcessing(false);
        setPaymentError('Payment failed. Please try again.');
      });
      rzp.open();
    } catch {
      setProcessing(false);
      setPaymentError('Payment could not be started. Please try again.');
    }
  };

  const plans: PassType[] = ['single', 'day', 'week'];
  const usedOut = !!currentPass && currentPass.remainingCredits === 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-navy-900/60 backdrop-blur-sm" onClick={processing ? undefined : onClose} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-navy-800 to-navy-700 px-6 py-5 text-white">
          <button
            onClick={processing ? undefined : onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-coral-300">
            <Lock className="h-4 w-4" />
            {isRenewal ? 'Activate Access Pass' : 'Contact Locked'}
          </div>
          <h2 className="mt-2 text-xl font-extrabold">
            {usedOut ? 'Top up your contact balance' : isRenewal ? 'Choose a contact bundle' : 'Unlock Host Contact & WhatsApp'}
          </h2>
          {!isRenewal && listing && (
            <p className="mt-1 text-sm text-navy-200">
              {listing.title} · {listing.neighborhood}
            </p>
          )}
        </div>

        {/* Trust chips */}
        <div className="flex items-center justify-center gap-4 border-b border-navy-100 bg-navy-50/50 px-6 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-600">
            <Zap className="h-3.5 w-3.5 text-coral-500" />
            Instant UPI Activation
          </div>
          <div className="h-3 w-px bg-navy-200" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-600">
            <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
            Direct WhatsApp Access
          </div>
          <div className="h-3 w-px bg-navy-200" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-600">
            <ShieldCheck className="h-3.5 w-3.5 text-navy-500" />
            Zero Brokerage
          </div>
        </div>

        {/* Plan cards */}
        {usedOut && (
          <p className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            You've used all {currentPass.totalCredits} contacts from your {PASS_PLANS[currentPass.type].label}. Top up with 1 contact (₹9) or grab 6 more (₹49) to keep exploring.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 overflow-y-auto px-6 py-5 sm:grid-cols-3">
          {plans.map((key) => {
            const plan = PASS_PLANS[key];
            const isSelected = selectedPlan === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`relative flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
                  isSelected
                    ? 'border-coral-400 bg-coral-50/50 shadow-md'
                    : 'border-navy-200 bg-white hover:border-navy-300'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${key === 'week' ? 'bg-emerald-600' : 'bg-coral-500'}`}>
                    {plan.badge}
                  </span>
                )}
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-bold text-navy-800">{plan.label}</span>
                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral-500">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center text-3xl font-extrabold text-navy-800">
                  <IndianRupee className="h-5 w-5" />
                  {plan.price}
                </div>
                <p className="mt-1.5 text-xs font-medium text-navy-400">
                  {key === 'single' ? 'Includes: 1 Contact Unlock' : `Includes: ${plan.credits} Contact Unlocks${key === 'day' ? ' · Valid 24 hours' : ' · Valid 7 days'}`}
                </p>
                <span className={`mt-3 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${plan.savings ? 'bg-emerald-50 text-emerald-700' : 'bg-navy-50 text-navy-600'}`}>
                  {plan.pricePerContact}{plan.savings ? ` • ${plan.savings}` : ''}
                </span>
              </button>
            );
          })}
        </div>

        {checkoutDisabled ? (
          <p className="mx-6 mb-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            Pass checkout is not available for this account yet. Your contact credits will only change after a verified payment.
          </p>
        ) : (
          /* What you get */
          <div className="px-6 pb-2">
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              After payment you instantly get:
            </div>
            <ul className="mt-2 space-y-1.5">
              <li className="flex items-center gap-2 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5 shrink-0" />
                Host's real phone number revealed
              </li>
              <li className="flex items-center gap-2 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5 shrink-0" />
                One-tap green WhatsApp chat button
              </li>
              <li className="flex items-center gap-2 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5 shrink-0" />
                {selectedPlan === 'single' ? '1 contact unlock · valid 24 hours' : `${PASS_PLANS[selectedPlan].credits} contact unlocks · valid ${selectedPlan === 'day' ? '24 hours' : '7 days'}`}
              </li>
            </ul>
          </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-navy-100 px-6 py-4">
          {mockCheckout && (
            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-900">
              Local test checkout — no payment gateway or real charge. Test credits will be added to your account.
            </p>
          )}
          {paymentError && (
            <p role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {paymentError}
            </p>
          )}
          <button
            onClick={handlePay}
            disabled={processing || checkoutDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-coral-500/30 transition-all hover:bg-coral-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mockCheckout ? (
              <>Add {PASS_PLANS[selectedPlan].credits} Test Credits</>
            ) : checkoutDisabled ? (
              <>
                <Lock className="h-4 w-4" />
                Checkout unavailable
              </>
            ) : processing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Proceed to Pay ₹{PASS_PLANS[selectedPlan].price}
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-navy-400">
            {mockCheckout
              ? 'Development only · no payment gateway is called'
              : checkoutDisabled
                ? 'Contact credits can only be changed by a verified payment flow.'
                : 'Secured by Razorpay · Test Mode — no real charge'}
          </p>
        </div>
      </div>
    </div>
  );
}
