import { Search, SlidersHorizontal, IndianRupee, Users, Leaf, Video, X, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Gender, FoodPolicy } from '@/data/listings';

export interface Filters {
  query: string;
  budget: number;
  gender: Gender;
  foodPolicy: FoodPolicy;
  videoVerifiedOnly: boolean;
}

interface FilterBarProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
}

export default function FilterBar({ filters, setFilters }: FilterBarProps) {
  const [budgetOpen, setBudgetOpen] = useState(false);
  const budgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!budgetOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (budgetRef.current && !budgetRef.current.contains(e.target as Node)) {
        setBudgetOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [budgetOpen]);

  const activeCount =
    (filters.gender !== 'any' ? 1 : 0) +
    (filters.foodPolicy !== 'any' ? 1 : 0) +
    (filters.videoVerifiedOnly ? 1 : 0) +
    (filters.budget < 20000 ? 1 : 0);

  const reset = () =>
    setFilters({ query: '', budget: 20000, gender: 'any', foodPolicy: 'any', videoVerifiedOnly: false });

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm lg:p-5">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400" />
        <input
          type="text"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          placeholder="Search locality or area — e.g. Navrangpura, SG Highway, Prahlad Nagar"
          className="w-full rounded-xl border border-navy-200 bg-navy-50 py-3.5 pl-12 pr-4 text-sm font-medium text-navy-800 outline-none transition-all duration-300 placeholder:text-navy-300 focus:border-coral-400 focus:bg-white focus:ring-2 focus:ring-coral-100"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Budget */}
        <div className="relative w-full rounded-[24px] border border-navy-200 bg-white p-2 sm:w-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0" ref={budgetRef}>
          <button
            onClick={() => setBudgetOpen(!budgetOpen)}
            className={`flex min-h-10 w-full items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-all duration-300 sm:min-h-0 sm:w-auto sm:border sm:px-4 sm:py-2 ${
              budgetOpen || filters.budget < 20000
                ? 'bg-coral-50 text-coral-600 sm:border-coral-400'
                : 'text-navy-600 hover:bg-navy-50 sm:border-navy-200 sm:bg-white sm:hover:border-navy-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Budget
            {filters.budget < 20000 && (
              <span className="flex items-center text-xs font-bold">
                <IndianRupee className="h-3 w-3" />{filters.budget.toLocaleString('en-IN')}
              </span>
            )}
          </button>
          {budgetOpen && (
            <div className="absolute left-0 top-full z-30 mt-2 w-72 animate-slide-up rounded-2xl border border-navy-100 bg-white p-5 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-navy-700">Max Monthly Budget</span>
                <span className="flex items-center text-lg font-extrabold text-coral-500">
                  <IndianRupee className="h-4 w-4" />{filters.budget.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min={3000}
                max={20000}
                step={500}
                value={filters.budget}
                onChange={(e) => setFilters({ ...filters, budget: Number(e.target.value) })}
                className="w-full"
                style={{
                  background: `linear-gradient(to right, #E05A47 ${(filters.budget - 3000) / 170 * 100}%, #E2E8F0 ${(filters.budget - 3000) / 170 * 100}%)`,
                }}
              />
              <div className="mt-1 flex justify-between text-xs text-navy-400">
                <span>₹3,000</span>
                <span>₹20,000+</span>
              </div>
              <button
                onClick={() => setBudgetOpen(false)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-navy-800 py-2.5 text-sm font-bold text-white transition-all hover:bg-navy-900 active:scale-95"
              >
                <Check className="h-4 w-4" />
                Done
              </button>
            </div>
          )}
        </div>

        {/* Gender */}
        <div className="flex w-full items-center gap-1 rounded-[24px] border border-navy-200 bg-white p-2 sm:w-auto sm:rounded-full sm:p-1">
          {(['any', 'male', 'female'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => setFilters({ ...filters, gender: g })}
              className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-semibold capitalize transition-all duration-300 sm:min-h-0 sm:flex-none sm:px-3.5 sm:text-sm ${
                filters.gender === g
                  ? 'bg-navy-800 text-white'
                  : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              {g === 'male' && <Users className="h-3.5 w-3.5" />}
              {g === 'female' && <Users className="h-3.5 w-3.5" />}
              {g === 'any' ? 'Any Gender' : g === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>

        {/* Food Policy */}
        <div className="grid w-full min-w-0 grid-cols-3 items-center gap-1.5 rounded-[24px] border border-navy-200 bg-white p-2 sm:flex sm:w-auto sm:rounded-full sm:gap-1 sm:p-1">
          {([
            { value: 'any' as FoodPolicy, label: 'Any Food' },
            { value: 'strict-veg' as FoodPolicy, label: 'Strict Veg' },
            { value: 'eggetarian' as FoodPolicy, label: 'Eggetarian' },
            { value: 'non-veg' as FoodPolicy, label: 'Non-Veg' },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ ...filters, foodPolicy: opt.value })}
              className={`flex w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 py-1.5 text-xs font-semibold transition-all duration-300 sm:w-auto sm:gap-1.5 sm:px-3.5 sm:text-sm ${
                opt.value === 'any'
                  ? 'col-start-1 row-start-1 ml-0.5 min-h-10 justify-self-start sm:ml-0 sm:min-h-0'
                  : `row-start-2 min-h-9 justify-self-stretch ${opt.value === 'strict-veg' ? 'col-start-1' : opt.value === 'eggetarian' ? 'col-start-2' : 'col-start-3'} sm:row-auto sm:min-h-0 sm:justify-self-auto sm:col-auto`
              } ${
                filters.foodPolicy === opt.value
                  ? opt.value === 'strict-veg'
                    ? 'bg-emerald-500 text-white'
                    : opt.value === 'eggetarian'
                      ? 'bg-amber-500 text-white'
                      : opt.value === 'non-veg'
                        ? 'bg-red-500 text-white'
                        : 'bg-navy-800 text-white'
                  : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              {opt.value !== 'any' && <Leaf className="h-3.5 w-3.5" />}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Video Verified */}
        <div className="w-full rounded-[24px] border border-navy-200 bg-white p-2 sm:w-auto sm:rounded-full sm:border-0 sm:bg-transparent sm:p-0">
          <button
            onClick={() => setFilters({ ...filters, videoVerifiedOnly: !filters.videoVerifiedOnly })}
            className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-all duration-300 sm:min-h-0 sm:w-auto sm:border sm:px-4 sm:py-2 ${
              filters.videoVerifiedOnly
                ? 'bg-navy-800 text-white sm:border-navy-800'
                : 'text-navy-600 hover:bg-navy-50 sm:border-navy-200 sm:bg-white sm:hover:border-navy-300'
            }`}
          >
            <Video className="h-4 w-4" />
            Video Verified Only
          </button>
        </div>

        {/* Reset */}
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-coral-500 transition-all hover:text-coral-600"
          >
            <X className="h-4 w-4" />
            Clear ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
