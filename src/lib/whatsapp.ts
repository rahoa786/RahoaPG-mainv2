import type { Listing } from '@/data/listings';

/**
 * Builds a https://wa.me/<digits> link for a listing.
 *
 * WhatsApp numbers can be stored with spaces, "+", dashes, etc. wa.me only
 * accepts plain digits (with the country code, no leading +). We prefer the
 * dedicated `hostWhatsApp` field and fall back to `hostPhone` when the
 * WhatsApp field is empty. Returns null when neither field yields digits.
 */
export function whatsappLink(
  listing: Pick<Listing, 'hostWhatsApp' | 'hostPhone'>,
  message?: string
): string | null {
  const raw = (listing.hostWhatsApp || '').trim() || (listing.hostPhone || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function listingWhatsAppMessage(title: string, neighborhood: string): string {
  return `Hi, I found your listing on Rahoa for ${title} in ${neighborhood}. Is it still available?`;
}
