import { useState } from 'react';
import { X, Check, ArrowLeft, ArrowRight, PartyPopper, Sun, Utensils, Users, Clock, Sparkles, UserCircle } from 'lucide-react';
import { quizQuestions, defaultQuizAnswers, type QuizAnswers } from '@/data/listings';

interface QuizModalProps {
  onClose: () => void;
  onComplete: (answers: QuizAnswers) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Sun: <Sun className="h-6 w-6" />,
  Utensils: <Utensils className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  Clock: <Clock className="h-6 w-6" />,
  UserCircle: <UserCircle className="h-6 w-6" />,
};

export default function QuizModal({ onClose, onComplete }: QuizModalProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(defaultQuizAnswers);
  const [done, setDone] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const total = quizQuestions.length;
  const question = quizQuestions[step];
  const selectedValue = answers[question.key];
  const isLast = step === total - 1;

  const handleSelect = (label: string) => {
    setAnswers((prev) => ({ ...prev, [question.key]: label }));
  };

  const handleNext = () => {
    if (!selectedValue) return;
    if (isLast) {
      setDone(true);
      setTimeout(() => onComplete({ ...answers, [question.key]: selectedValue }), 1200);
      return;
    }
    setDirection('forward');
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    setDirection('back');
    setStep(step - 1);
  };

  const progress = ((step + 1) / total) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in bg-navy-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg animate-slide-up overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-50 text-coral-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-navy-800">Lifestyle Match Quiz</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          /* Celebration state */
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="relative mb-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
                  <Check className="h-8 w-8 text-white" strokeWidth={3} />
                </div>
              </div>
              <PartyPopper className="absolute -right-2 -top-2 h-8 w-8 text-coral-500 animate-pulse-soft" />
            </div>
            <h3 className="text-2xl font-extrabold text-navy-800">Quiz Complete!</h3>
            <p className="mt-2 max-w-sm text-sm text-navy-500">
              Your match scores are now personalized. Listings have been sorted by your top compatibility matches.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="rounded-full bg-navy-800 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-navy-900 active:scale-95"
              >
                View My Matches
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Progress bar + indicator */}
            <div className="px-6 pt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-navy-500">
                <span>Question {step + 1} of {total}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-full rounded-full bg-coral-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* Step dots */}
              <div className="mt-3 flex items-center justify-center gap-2">
                {quizQuestions.map((q, i) => (
                  <div
                    key={q.key}
                    className={`h-2 rounded-full transition-all duration-400 ${
                      i === step
                        ? 'w-6 bg-coral-500'
                        : i < step
                          ? 'w-2 bg-coral-300'
                          : 'w-2 bg-navy-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Question with transition */}
            <div className="px-6 py-8">
              <div
                key={step}
                className={`animate-${direction === 'forward' ? 'slide-up' : 'fade-in'}`}
              >
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
                    {iconMap[question.icon]}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-navy-800">{question.title}</h3>
                    <p className="mt-0.5 text-sm text-navy-400">{question.subtitle}</p>
                  </div>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-3">
                  {question.options.map((opt) => {
                    const isSelected = selectedValue === opt.label;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => handleSelect(opt.label)}
                        className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all duration-300 ${
                          isSelected
                            ? 'border-coral-400 bg-coral-50 shadow-md'
                            : 'border-navy-100 bg-white hover:border-navy-200 hover:bg-navy-50'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${isSelected ? 'text-coral-600' : 'text-navy-700'}`}>
                          {opt.label}
                        </span>
                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-coral-500">
                            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between border-t border-navy-100 px-6 py-4">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  step === 0
                    ? 'cursor-not-allowed text-navy-300'
                    : 'text-navy-600 hover:bg-navy-50'
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedValue}
                className={`flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
                  !selectedValue
                    ? 'cursor-not-allowed bg-navy-100 text-navy-300'
                    : 'bg-coral-500 text-white shadow-lg shadow-coral-500/30 hover:bg-coral-600 active:scale-95'
                }`}
              >
                {isLast ? 'See My Matches' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
