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
    <div className="flex items-center justify-center gap-3 px-4 py-2 bg-white border-b border-gray-200">
      <button
        onClick={onPrevWeek}
        disabled={!canGoPrev}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous week"
      >
        <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
      </button>

      <div className="px-4 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-sm font-semibold">
        {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d, yyyy')}
      </div>

      <button
        onClick={onNextWeek}
        disabled={!canGoNext}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next week"
      >
        <ChevronRightIcon className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
