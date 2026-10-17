import { ShieldAlert, X } from 'lucide-react';

interface TermsModalProps {
  onClose: () => void;
}

export default function TermsModal({ onClose }: TermsModalProps) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-navy-900/60 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" onClick={onClose} aria-label="Close terms" className="absolute inset-0" />
      <article role="dialog" aria-modal="true" aria-labelledby="terms-title" className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-navy-100 bg-navy-800 px-6 py-5 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-coral-300">Rahoa · Terms of Service</p>
            <h2 id="terms-title" className="mt-1 text-xl font-extrabold">Listing and tenant safety terms</h2>
          </div>
          <button onClick={onClose} aria-label="Close terms" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-6 overflow-y-auto px-6 py-6 text-sm leading-6 text-navy-600">
          <section>
            <h3 className="text-base font-extrabold text-navy-800">Host Media &amp; Listing Truthfulness Guarantee</h3>
            <p className="mt-2">Hosts are responsible for having the authority to offer a property and for ensuring that listing descriptions, photographs, video walkthroughs, prices, availability, amenities, and house rules are accurate and current. Rahoa may remove content or restrict accounts when information appears misleading or unauthorized. A listing label or verification indicator describes the checks shown on the listing and is not a guarantee of ownership, condition, availability, or suitability.</p>
          </section>
          <section>
            <h3 className="text-base font-extrabold text-navy-800">Limitation of Liability: Tenant Due Diligence and Third-Party Listing Disclaimer</h3>
            <p className="mt-2">Listings are provided by their hosts. Rahoa does not physically inspect every premise and, to the extent permitted by applicable law, is not responsible for host-side discrepancies, third-party conduct, or arrangements made directly between a host and seeker. Before making a payment or commitment, independently verify the host’s authority, visit the physical premises, confirm all costs and terms in writing, and use your own judgment. Do not send an advance deposit solely in reliance on online media or a listing.</p>
          </section>
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 font-bold text-amber-800"><ShieldAlert className="h-4 w-4" />Prototype notice</div>
            <p className="mt-1 text-xs leading-5 text-amber-800">This page is a product disclosure draft, not legal advice or a substitute for jurisdiction-specific terms reviewed by counsel. Verify listings and counterparties independently before making a payment or commitment.</p>
          </section>
        </div>
      </article>
    </div>
  );
}
