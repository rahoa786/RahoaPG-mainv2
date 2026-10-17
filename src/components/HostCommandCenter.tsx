import { useMemo, useState } from 'react';
import { Building2, Check, Edit3, IndianRupee, Users } from 'lucide-react';
import type { Listing } from '@/data/listings';
import type { DemoLead, HostListingMeta } from '@/lib/demoPortal';

interface HostProperty extends Listing {
  hostMeta: HostListingMeta;
}

interface HostCommandCenterProps {
  listings: HostProperty[];
  leads: DemoLead[];
  onSaveMeta: (listingId: string, meta: HostListingMeta) => void;
  onEdit: (listing: Listing) => void;
}

export default function HostCommandCenter({ listings, leads, onSaveMeta, onEdit }: HostCommandCenterProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, HostListingMeta>>({});
  const [listingDrafts, setListingDrafts] = useState<Record<string, { title: string; neighborhood: string; baseRent: number }>>({});
  const listingIds = useMemo(() => new Set(listings.map((listing) => listing.id)), [listings]);
  const hostLeads = leads.filter((lead) => listingIds.has(lead.listingId));
  const bedsAvailable = listings.reduce((total, listing) => total + Math.max(0, listing.hostMeta.totalBeds - listing.hostMeta.filledBeds), 0);
  const filledBeds = listings.reduce((total, listing) => total + listing.hostMeta.filledBeds, 0);

  const draftFor = (listing: HostProperty) => drafts[listing.id] ?? listing.hostMeta;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        Local demo portal: properties and leads recorded in this browser only. Do not enter real seeker data; accounts are not verified and records are not shared with hosts on other devices.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Metric icon={<Building2 className="h-4 w-4" />} label="Beds available" value={bedsAvailable} />
        <Metric icon={<Users className="h-4 w-4" />} label="Filled through Rahoa" value={filledBeds} />
      </div>

      <section>
        <h3 className="mb-3 text-sm font-extrabold text-navy-800">My Properties</h3>
        {listings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy-200 px-4 py-8 text-center text-sm text-navy-400">No properties from this browser account yet. Post a listing to see it here.</p>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => {
              const meta = draftFor(listing);
              const editing = editingId === listing.id;
              return (
                <article key={listing.id} className="rounded-2xl border border-navy-100 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <img src={listing.image} alt="" className="h-14 w-16 rounded-lg bg-navy-100 object-cover" />
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-navy-800">{listing.title}</h4>
                        <p className="text-xs text-navy-400">{listing.neighborhood} · ₹{listing.baseRent.toLocaleString('en-IN')}/month</p>
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-navy-100 text-navy-600'}`}>{meta.status === 'active' ? 'Active' : 'Full'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(editing ? null : listing.id); setDrafts((current) => ({ ...current, [listing.id]: listing.hostMeta })); setListingDrafts((current) => ({ ...current, [listing.id]: { title: listing.title, neighborhood: listing.neighborhood, baseRent: listing.baseRent } })); }} className="flex items-center gap-1 rounded-lg border border-navy-200 px-2.5 py-1.5 text-xs font-bold text-navy-600"><Edit3 className="h-3.5 w-3.5" />Edit</button>
                      <button onClick={() => onSaveMeta(listing.id, { ...listing.hostMeta, status: listing.hostMeta.status === 'active' ? 'full' : 'active' })} className="rounded-lg bg-navy-50 px-2.5 py-1.5 text-xs font-bold text-navy-600">Mark {listing.hostMeta.status === 'active' ? 'Full' : 'Active'}</button>
                    </div>
                  </div>
                  {editing && (
                    <div className="mt-4 space-y-3 border-t border-navy-100 pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <TextField label="Listing title" value={listingDrafts[listing.id]?.title ?? listing.title} onChange={(title) => setListingDrafts((current) => ({ ...current, [listing.id]: { ...current[listing.id], title, neighborhood: current[listing.id]?.neighborhood ?? listing.neighborhood, baseRent: current[listing.id]?.baseRent ?? listing.baseRent } }))} />
                        <TextField label="Locality" value={listingDrafts[listing.id]?.neighborhood ?? listing.neighborhood} onChange={(neighborhood) => setListingDrafts((current) => ({ ...current, [listing.id]: { ...current[listing.id], title: current[listing.id]?.title ?? listing.title, neighborhood, baseRent: current[listing.id]?.baseRent ?? listing.baseRent } }))} />
                      </div>
                      <NumberField label="Monthly rent (₹)" value={listingDrafts[listing.id]?.baseRent ?? listing.baseRent} onChange={(baseRent) => setListingDrafts((current) => ({ ...current, [listing.id]: { ...current[listing.id], title: current[listing.id]?.title ?? listing.title, neighborhood: current[listing.id]?.neighborhood ?? listing.neighborhood, baseRent } }))} />
                      <div className="grid grid-cols-2 gap-2">
                        <NumberField label="Total beds" value={meta.totalBeds} onChange={(totalBeds) => setDrafts((current) => ({ ...current, [listing.id]: { ...meta, totalBeds } }))} />
                        <NumberField label="Filled through Rahoa" value={meta.filledBeds} onChange={(filledBeds) => setDrafts((current) => ({ ...current, [listing.id]: { ...meta, filledBeds: Math.min(filledBeds, meta.totalBeds) } }))} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-2 text-xs font-bold text-navy-500">Cancel</button>
                        <button onClick={() => { onSaveMeta(listing.id, meta); onEdit({ ...listing, ...listingDrafts[listing.id] }); setEditingId(null); }} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" />Save changes</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-extrabold text-navy-800">Lead Vault · Who Contacted</h3>
        {hostLeads.length === 0 ? (
          <p className="rounded-xl bg-navy-50 px-4 py-5 text-sm text-navy-400">No local demo contact-unlock events for these properties yet.</p>
        ) : (
          <div className="space-y-2">
            {hostLeads.map((lead, index) => {
              const property = listings.find((listing) => listing.id === lead.listingId);
              return <div key={`${lead.listingId}-${lead.seekerContact}-${index}`} className="rounded-xl border border-navy-100 p-3 text-xs">
                <p className="font-bold text-navy-800">{property?.title ?? 'Your property'}</p>
                <p className="mt-1 text-navy-600">Seeker: {lead.seekerContact}</p>
                <p className="text-navy-400">{new Date(lead.inquiryAt).toLocaleString()} · {lead.matchScore}% match</p>
              </div>;
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-navy-100 bg-navy-50 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-navy-800"><IndianRupee className="h-4 w-4" />Financial Ledger</h3>
        <p className="mt-1 text-xs leading-5 text-navy-500">Rent collected via Rahoa, deposits, tokens, and dues are not connected to any platform payment or tenancy records in this prototype. No financial amounts are reported here.</p>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-xl border border-navy-100 bg-white p-3"><div className="flex items-center gap-1.5 text-xs font-semibold text-navy-400">{icon}{label}</div><p className="mt-1 text-xl font-extrabold text-navy-800">{value}</p></div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-[11px] font-bold text-navy-500">{label}<input type="number" min={0} value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="mt-1 w-full rounded-lg border border-navy-200 px-2 py-2 text-sm text-navy-800" /></label>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-[11px] font-bold text-navy-500">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-navy-200 px-2 py-2 text-sm text-navy-800" /></label>;
}
