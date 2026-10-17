import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Star } from 'lucide-react';
import type { PortalUser } from '@/lib/demoPortal';
import { supabase } from '@/lib/supabase';

const CATEGORIES = ['Food Quality', 'Cleanliness', 'Curfew Flexibility', 'Wi-Fi speed'] as const;
type Category = typeof CATEGORIES[number];

interface TenantReview {
  id: string;
  reviewer: string;
  contact: string;
  createdAt: number;
  ratings: Record<Category, number>;
  feedback: string;
  lifestyle: string;
}

interface ReviewSectionProps {
  listingId: string;
  user: PortalUser | null;
  verifiedTenant: boolean;
  onRequestLogin: () => void;
}

export default function ReviewSection({ listingId, user, verifiedTenant, onRequestLogin }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<TenantReview[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [lifestyle, setLifestyle] = useState('Working Professional • Stayed 6 months');
  const [ratings, setRatings] = useState<Record<Category, number>>({
    'Food Quality': 0,
    Cleanliness: 0,
    'Curfew Flexibility': 0,
    'Wi-Fi speed': 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.from('listing_reviews')
      .select('id, reviewer_display_name, created_at, food_quality, cleanliness, curfew_flexibility, wifi_speed, feedback, lifestyle_tag, moderation_status')
      .eq('listing_id', listingId)
      .in('moderation_status', ['published'])
      .order('created_at', { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setError('Could not load reviews right now. Please try again later.');
          return;
        }
        setReviews((data ?? []).map((row) => ({
            id: row.id,
            reviewer: row.reviewer_display_name || 'Rahoa tenant',
            contact: '',
            createdAt: new Date(row.created_at).getTime(),
            ratings: {
              'Food Quality': row.food_quality,
              Cleanliness: row.cleanliness,
              'Curfew Flexibility': row.curfew_flexibility,
              'Wi-Fi speed': row.wifi_speed,
            },
            feedback: row.feedback,
            lifestyle: row.lifestyle_tag || 'Rahoa tenant',
          })));
      });
    return () => { active = false; };
  }, [listingId]);

  const categoryAverages = useMemo(() => CATEGORIES.map((category) => {
    const rated = reviews.filter((review) => review.ratings[category] > 0);
    return { category, average: rated.length ? rated.reduce((sum, review) => sum + review.ratings[category], 0) / rated.length : 0 };
  }), [reviews]);
  const overall = reviews.length
    ? reviews.reduce((sum, review) => sum + CATEGORIES.reduce((categorySum, category) => categorySum + review.ratings[category], 0) / CATEGORIES.length, 0) / reviews.length
    : 0;

  const openForm = () => {
    if (!user || user.role !== 'seeker') {
      onRequestLogin();
      return;
    }
    if (!verifiedTenant) {
      setError('Unlock this host contact with your seeker account before writing a verified tenant review.');
      return;
    }
    setError('');
    setDialogOpen(true);
  };

  const submitReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== 'seeker' || !verifiedTenant) {
      setError('A signed-in seeker with an unlocked contact is required to submit a verified review.');
      setDialogOpen(false);
      return;
    }
    if (CATEGORIES.some((category) => ratings[category] < 1) || feedback.trim().length < 10) {
      setError('Rate every category and write at least 10 characters of feedback.');
      return;
    }
    const review: TenantReview = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      reviewer: user.contact.includes('@') ? user.contact.split('@')[0] : `Tenant ${user.contact.slice(-4)}`,
      contact: user.contact,
      createdAt: Date.now(),
      ratings,
      feedback: feedback.trim(),
      lifestyle: lifestyle.trim() || 'Rahoa tenant',
    };
    try {
      void supabase.from('listing_reviews').insert({
        listing_id: listingId,
        reviewer_id: user.id,
        reviewer_display_name: user.fullName?.trim() || user.contact.split('@')[0] || 'Rahoa tenant',
        food_quality: ratings['Food Quality'],
        cleanliness: ratings.Cleanliness,
        curfew_flexibility: ratings['Curfew Flexibility'],
        wifi_speed: ratings['Wi-Fi speed'],
        feedback: feedback.trim(),
        lifestyle_tag: lifestyle.trim() || null,
        moderation_status: 'pending',
      }).select('id, created_at').single().then(({ data, error: saveError }) => {
        if (saveError) {
          setError('Your review could not be saved right now. Please try again later.');
          return;
        }
        if (data) {
          setReviews((current) => [{
            ...review,
            id: data.id,
            createdAt: new Date(data.created_at).getTime(),
          }, ...current]);
          setDialogOpen(false);
          setFeedback('');
          setRatings({ 'Food Quality': 0, Cleanliness: 0, 'Curfew Flexibility': 0, 'Wi-Fi speed': 0 });
          setError('Review submitted and is pending moderation.');
        }
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not submit review.');
    }
  };

  return (
    <section className="px-6 pt-5">
      <div className="rounded-2xl border border-navy-100 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-navy-800">Tenant Reviews &amp; Ratings</h3>
            <p className="mt-1 text-xs text-navy-400">Reviews are shown after moderation. An unlocked contact is required.</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-extrabold text-amber-700">
            <Star className="h-4 w-4 fill-current" />{reviews.length ? overall.toFixed(1) : '—'} / 5
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {categoryAverages.map(({ category, average }) => (
            <div key={category} className="rounded-lg bg-navy-50 p-2.5">
              <p className="text-[11px] font-semibold text-navy-500">{category}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-extrabold text-navy-800">{average ? `${average.toFixed(1)} / 5` : 'No ratings'}{average > 0 && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}</p>
            </div>
          ))}
        </div>

        <button onClick={openForm} className="mt-4 w-full rounded-xl border border-coral-200 bg-coral-50 py-2.5 text-sm font-bold text-coral-700">Write a Review</button>
        {error && <p role="status" className="mt-2 text-xs font-semibold text-amber-700">{error}</p>}
        {reviews.length === 0 ? (
          <p className="mt-4 rounded-xl bg-navy-50 px-4 py-5 text-center text-sm text-navy-400">No verified tenant reviews yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-navy-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-bold text-navy-800">{review.reviewer}</p><p className="text-[11px] text-navy-400">{review.lifestyle}</p></div>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />Unlocked tenant · demo</span>
                </div>
                <p className="mt-2 flex items-center gap-0.5">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < Math.round(CATEGORIES.reduce((sum, category) => sum + review.ratings[category], 0) / CATEGORIES.length) ? 'fill-amber-400 text-amber-400' : 'text-navy-200'}`} />)}</p>
                <p className="mt-2 text-sm leading-5 text-navy-600">{review.feedback}</p>
                <p className="mt-2 text-[10px] text-navy-400">{new Date(review.createdAt).toLocaleDateString()}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-[145] flex items-end justify-center bg-navy-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="review-form-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between"><h3 id="review-form-title" className="text-lg font-extrabold text-navy-800">Write a tenant review</h3><button onClick={() => setDialogOpen(false)} aria-label="Close review form" className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-bold text-navy-500">Close</button></div>
            <form onSubmit={submitReview} className="mt-4 space-y-4">
              {CATEGORIES.map((category) => (
                <fieldset key={category}>
                  <legend className="text-xs font-bold text-navy-600">{category}</legend>
                  <div className="mt-1 flex gap-1">
                    {Array.from({ length: 5 }, (_, index) => index + 1).map((score) => <button key={score} type="button" aria-label={`${category}: ${score} stars`} aria-pressed={ratings[category] === score} onClick={() => setRatings((current) => ({ ...current, [category]: score }))}><Star className={`h-6 w-6 ${score <= ratings[category] ? 'fill-amber-400 text-amber-400' : 'text-navy-200'}`} /></button>)}
                  </div>
                </fieldset>
              ))}
              <label className="block text-xs font-bold text-navy-600">Lifestyle tag<input value={lifestyle} onChange={(event) => setLifestyle(event.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border border-navy-200 p-2.5 text-sm font-normal" /></label>
              <label className="block text-xs font-bold text-navy-600">Your feedback<textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} maxLength={1000} className="mt-1 w-full rounded-lg border border-navy-200 p-2.5 text-sm font-normal" placeholder="Share your stay experience..." /></label>
              {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
              <button type="submit" className="w-full rounded-xl bg-coral-500 py-3 text-sm font-bold text-white">Submit verified review</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
