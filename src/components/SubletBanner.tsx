import { BedDouble, MessageCircle } from 'lucide-react';

interface SubletBannerProps {
  onWhatsAppClick: () => void;
}

export default function SubletBanner({ onWhatsAppClick }: SubletBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-navy-800 to-navy-700 p-6 lg:p-8">
      {/* Decorative circles */}
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-coral-500/10 blur-2xl" />
      <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-coral-500/5 blur-2xl" />

      <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <BedDouble className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white lg:text-2xl">
              Are you a PG Owner or looking for a flatmate?
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-navy-200">
              Skip the forms. Just send photos and rent details on WhatsApp to list for free.
            </p>
          </div>
        </div>

        <div className="flex w-full md:w-auto">
          <button
            onClick={onWhatsAppClick}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:bg-emerald-600 hover:shadow-xl active:scale-95 md:w-auto"
          >
            <MessageCircle className="h-5 w-5" />
            📲 Post via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
