'use client';

import { format, addDays } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface WeekNavProps {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export default function WeekNav({
  weekStart,
  onPrevWeek,
  onNextWeek,
  canGoPrev,
  canGoNext,
}: WeekNavProps) {
  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3">
      <button
        onClick={onPrevWeek}
        disabled={!canGoPrev}
        className="p-2.5 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-sm transition-all"
        aria-label="Previous week"
      >
        <ChevronLeftIcon className="w-4 h-4 text-slate-600" />
      </button>

      <div className="px-5 py-2 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm">
        <span className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
          {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d, yyyy')}
        </span>
      </div>

      <button
        onClick={onNextWeek}
        disabled={!canGoNext}
        className="p-2.5 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-sm transition-all"
        aria-label="Next week"
      >
        <ChevronRightIcon className="w-4 h-4 text-slate-600" />
      </button>
    </div>
  );
}
