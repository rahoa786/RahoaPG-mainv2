import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { normalizePortalRole, type PortalRole, type PortalUser } from '@/lib/demoPortal';

interface ProfileRow {
  user_id: string;
  role: PortalRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

function toPortalUser(profile: ProfileRow, authPhone?: string): PortalUser {
  const phone = profile.phone ?? authPhone ?? '';
  return {
    id: profile.user_id,
    role: normalizePortalRole(profile.role),
    contact: phone || profile.email || '',
    fullName: profile.full_name ?? '',
    email: profile.email ?? '',
    phone,
  };
}

function explainAuthError(error: { message: string }): Error {
  const message = error.message;
  if (/sms|phone|provider|twilio|message.?bird/i.test(message)) {
    return new Error(`Supabase could not send the SMS OTP. Check that Phone Auth and an SMS provider are configured in Supabase. ${message}`);
  }
  if (/token|otp|code/i.test(message)) {
    return new Error('That OTP is invalid or expired. Check the code or request a new one.');
  }
  if (/rate limit|too many/i.test(message)) {
    return new Error('Too many OTP requests. Wait a few minutes before trying again.');
  }
  return new Error(message);
}

export async function getPortalProfile(user: User): Promise<PortalUser> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, role, full_name, email, phone')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load your account profile: ${error.message}`);
  if (!data) throw new Error('Your account profile is missing. Please contact support.');
  return toPortalUser(data as ProfileRow, user.phone ?? undefined);
}

export async function requestPhoneOtp(phone: string, role: PortalRole): Promise<void> {
  const normalizedRole = normalizePortalRole(role);
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: true,
      data: { role: normalizedRole, phone },
    },
  });
  if (error) throw explainAuthError(error);
}

export async function verifyPhoneOtp(phone: string, token: string, role: PortalRole): Promise<PortalUser> {
  const normalizedRole = normalizePortalRole(role);
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  if (error) throw explainAuthError(error);
  if (!data.user) throw new Error('Supabase did not return an authenticated user after OTP verification.');

  const { error: roleError } = await supabase.rpc('set_my_portal_role', { new_role: normalizedRole });
  if (roleError) {
    await supabase.auth.signOut();
    throw new Error(`Phone verified, but the selected account role could not be saved: ${roleError.message}`);
  }

  const { error: phoneError } = await supabase.from('profiles')
    .update({ phone })
    .eq('user_id', data.user.id);
  if (phoneError) {
    await supabase.auth.signOut();
    throw new Error(`Phone verified, but your phone number could not be saved to your profile: ${phoneError.message}`);
  }

  return getPortalProfile(data.user);
}

export async function setPortalRole(_userId: string, role: PortalRole): Promise<void> {
  const { error } = await supabase.rpc('set_my_portal_role', { new_role: normalizePortalRole(role) });
  if (error) throw new Error(`Could not update your portal role: ${error.message}`);
}

export async function signOutPortalUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
}
