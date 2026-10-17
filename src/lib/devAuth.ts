import { normalizePortalRole, type PortalRole, type PortalUser } from '@/lib/demoPortal';

const DEV_SESSION_KEY = 'rahoa_development_session';

interface DevelopmentSession {
  phone: string;
  role: PortalRole;
  verified: true;
}

export function createDevelopmentSession(phone: string, role: PortalRole): PortalUser {
  const normalizedRole = normalizePortalRole(role);
  const session: DevelopmentSession = { phone, role: normalizedRole, verified: true };
  try {
    localStorage.setItem(DEV_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Could not persist the development auth session.', error);
  }
  return {
    id: `dev:${phone}`,
    contact: phone,
    phone,
    role: normalizedRole,
    authMode: 'development',
  };
}

export function loadDevelopmentSession(): PortalUser | null {
  try {
    const raw = localStorage.getItem(DEV_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<DevelopmentSession>;
    if (session.verified !== true ||
        typeof session.phone !== 'string' ||
        !/^\+91[6-9]\d{9}$/.test(session.phone)) {
      localStorage.removeItem(DEV_SESSION_KEY);
      return null;
    }
    return {
      id: `dev:${session.phone}`,
      contact: session.phone,
      phone: session.phone,
      role: normalizePortalRole(session.role),
      authMode: 'development',
    };
  } catch (error) {
    console.error('Could not restore the development auth session.', error);
    return null;
  }
}

export function clearDevelopmentSession(): void {
  try {
    localStorage.removeItem(DEV_SESSION_KEY);
  } catch (error) {
    console.error('Could not clear the development auth session.', error);
  }
}
