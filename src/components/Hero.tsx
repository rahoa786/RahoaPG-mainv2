import { Search, MapPin } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-50 to-white pb-6 pt-12 lg:pt-16">
      {/* Decorative blurs */}
      <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-coral-100/40 blur-3xl" />
      <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-navy-100/50 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 text-center lg:px-8">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-navy-800 lg:text-5xl">
          Find your perfect{' '}
          <span className="relative whitespace-nowrap">
            <span className="relative z-10 text-coral-500">roommate</span>
            <span className="absolute bottom-1 left-0 h-3 w-full -skew-x-3 bg-coral-100/60" />
          </span>{' '}
          and room — matched on lifestyle, not just rent.
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base text-navy-500 lg:text-lg">
          Stop guessing. See true monthly costs, live video tours, and a lifestyle match score before you ever schedule a visit.
        </p>

        {/* Quick stats */}
        <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          <div className="flex items-center gap-2 text-navy-600">
            <MapPin className="h-4 w-4 text-coral-500" />
            <span className="font-semibold">240+ verified listings</span> and counting
          </div>
          <div className="hidden h-4 w-px bg-navy-200 sm:block" />
          <div className="flex items-center gap-2 text-navy-600">
            <Search className="h-4 w-4 text-coral-500" />
            <span className="font-semibold">88% avg match score</span> in first 3 results
          </div>
        </div>
      </div>
    </section>
  );
}
