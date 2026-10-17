import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, Phone, UserRound, X } from 'lucide-react';
import { RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
import { normalizePortalRole, type PortalRole, type PortalUser } from '@/lib/demoPortal';
import { auth } from '@/lib/firebase';
import { requestFirebaseOtp, verifyFirebaseOtp } from '@/lib/firebaseAuth';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (user: PortalUser) => void;
  onOpenTerms: () => void;
  defaultRole?: PortalRole;
}

function formatPhoneInput(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

export default function LoginModal({ onClose, onLogin, onOpenTerms, defaultRole = 'seeker' }: LoginModalProps) {
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<PortalRole>(() => normalizePortalRole(defaultRole));
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [resendSeconds, setResendSeconds] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const validPhone = /^[6-9]\d{9}$/.test(phone);

  const clearRecaptchaVerifier = () => {
    const verifier = verifierRef.current;
    verifierRef.current = null;
    verifier?.clear();
  };

  const getRecaptchaVerifier = (): RecaptchaVerifier => {
    if (verifierRef.current) return verifierRef.current;
    const container = captchaContainerRef.current;
    if (!container) throw new Error('reCAPTCHA container element not found in the sign-in dialog.');
    if (import.meta.env.DEV) {
      auth.settings.appVerificationDisabledForTesting = true;
    }
    const verifier = new RecaptchaVerifier(auth, container, {
      size: 'invisible',
      callback: () => setError(''),
      'expired-callback': () => {
        setError('reCAPTCHA expired. Please tap Get OTP again.');
        clearRecaptchaVerifier();
      },
    });
    verifierRef.current = verifier;
    return verifier;
  };

  useEffect(() => () => {
    clearRecaptchaVerifier();
  }, []);

  useEffect(() => {
    if (step !== 'otp' || resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, resendSeconds]);

  useEffect(() => {
    if (step === 'otp') inputRefs.current[0]?.focus();
  }, [step]);

  const requestCode = async () => {
    if (!validPhone) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      clearRecaptchaVerifier();
      const result = await requestFirebaseOtp(`+91${phone}`, role, getRecaptchaVerifier());
      setConfirmation(result);
      setOtp(Array(6).fill(''));
      setResendSeconds(30);
      setStep('otp');
    } catch (requestError) {
      const firebaseError = requestError as { code?: string; message?: string };
      setError(firebaseError.message ?? 'Could not send the OTP. Please try again.');
      clearRecaptchaVerifier();
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code = otp.join('')) => {
    if (code.length !== 6) {
      setError('Enter the 6-digit OTP sent to your phone.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (!confirmation) throw new Error('Request an OTP before verifying it.');
      onLogin(await verifyFirebaseOtp(confirmation, code, role));
    } catch (verifyError) {
      const firebaseError = verifyError as { code?: string; message?: string };
      const codeMessage = firebaseError.code === 'auth/invalid-verification-code'
        ? 'That OTP is incorrect. Check the code or request a new one.'
        : firebaseError.code === 'auth/code-expired'
          ? 'That OTP has expired. Request a new code and try again.'
          : firebaseError.message;
      setError(codeMessage ?? 'OTP verification failed. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateDigit = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      const next = [...otp];
      next[index] = '';
      setOtp(next);
      return;
    }
    const next = [...otp];
    for (let offset = 0; offset < digits.length && index + offset < 6; offset += 1) {
      next[index + offset] = digits[offset];
    }
    setOtp(next);
    const focusIndex = Math.min(index + digits.length, 5);
    inputRefs.current[focusIndex]?.focus();
    if (next.every(Boolean)) void verifyCode(next.join(''));
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const editPhone = () => {
    setError('');
    setOtp(Array(6).fill(''));
    setConfirmation(null);
    setStep('phone');
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-navy-900/60 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" onClick={onClose} aria-label="Close sign in" className="absolute inset-0" />
      <section role="dialog" aria-modal="true" aria-labelledby="login-title" className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <button type="button" onClick={onClose} aria-label="Close sign in" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-navy-600">
          <X className="h-5 w-5" />
        </button>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral-50 text-coral-500">
          {step === 'otp' ? <Phone className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
        </div>
        <div id="recaptcha-container" ref={captchaContainerRef} />
        <h2 id="login-title" className="mt-4 text-xl font-extrabold text-navy-800">
          {step === 'phone' ? 'Welcome to Rahoa' : 'Verify your mobile number'}
        </h2>
        {step === 'phone' ? (
          <>
            <p className="mt-1 text-sm text-navy-500">Sign in or create an account with a one-time SMS code.</p>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-navy-700" htmlFor="portal-phone">Indian mobile number</label>
              <div className="flex items-center overflow-hidden rounded-xl border border-navy-200 focus-within:border-coral-400">
                <span className="flex items-center gap-2 border-r border-navy-100 bg-navy-50 px-3 py-3 text-sm font-bold text-navy-700" aria-label="India country code">
                  <span aria-hidden="true">🇮🇳</span> +91
                </span>
                <input
                  id="portal-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  maxLength={16}
                  value={formatPhoneInput(phone)}
                  onChange={(event) => {
                    let digits = event.target.value.replace(/\D/g, '');
                    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
                    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
                    setPhone(digits.slice(0, 10));
                  }}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void requestCode(); } }}
                  placeholder="98765 43210"
                  className="min-w-0 flex-1 px-3 py-3 text-sm outline-none"
                />
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-bold text-navy-700">I am here to</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['seeker', 'Looking for a Room / PG'],
                    ['host', 'I am a Host / PG Owner'],
                  ] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setRole(value)} aria-pressed={role === value} className={`rounded-xl border-2 px-3 py-3 text-sm font-bold ${role === value ? 'border-coral-400 bg-coral-50 text-coral-700' : 'border-navy-100 text-navy-500'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
              <button type="button" onClick={() => void requestCode()} disabled={loading || !validPhone} className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-3 text-sm font-extrabold text-white hover:bg-coral-600 disabled:opacity-60">
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Get OTP by SMS
              </button>
              <p className="text-center text-xs leading-5 text-navy-500">
                By continuing, you agree to Rahoa&apos;s{' '}
                <button type="button" onClick={onOpenTerms} className="font-bold text-coral-600 underline underline-offset-2">Terms &amp; Anti-Broker Guidelines</button>.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-navy-500">
              Enter the 6-digit code sent to <span className="font-bold text-navy-700">+91 {formatPhoneInput(phone)}</span>.
              {' '}<button type="button" onClick={editPhone} className="font-bold text-coral-600 underline underline-offset-2">Edit number</button>
            </p>
            <div className="mt-6 flex justify-between gap-2" role="group" aria-label="6-digit verification code">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { inputRefs.current[index] = element; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  aria-label={`OTP digit ${index + 1}`}
                  value={digit}
                  maxLength={6}
                  onChange={(event) => updateDigit(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={(event) => {
                    event.preventDefault();
                    updateDigit(index, event.clipboardData.getData('text'));
                  }}
                  className="h-12 w-11 rounded-xl border border-navy-200 text-center text-lg font-extrabold text-navy-800 outline-none focus:border-coral-400 focus:ring-2 focus:ring-coral-100"
                />
              ))}
            </div>
            {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
            <button type="button" onClick={() => void verifyCode()} disabled={loading || otp.some((digit) => !digit)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-3 text-sm font-extrabold text-white hover:bg-coral-600 disabled:opacity-60">
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Verify &amp; Continue
            </button>
            <button
              type="button"
              onClick={() => void requestCode()}
              disabled={loading || resendSeconds > 0}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-bold text-navy-600 disabled:text-navy-300"
            >
              {resendSeconds > 0 ? `Resend OTP in 00:${String(resendSeconds).padStart(2, '0')}` : 'Resend OTP'}
            </button>
            <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              {import.meta.env.DEV
                ? 'Development test mode: verification is simplified for this local build. Only configured test phone numbers and codes can be used.'
                : 'A one-time SMS code will be sent to this number. For development, use a configured test phone number and code.'}
            </p>
            <button type="button" onClick={editPhone} className="mt-4 flex w-full items-center justify-center gap-2 text-xs font-semibold text-navy-500 hover:text-navy-700">
              <ArrowLeft className="h-3.5 w-3.5" /> Change mobile number
            </button>
          </>
        )}
      </section>
    </div>
  );
}
