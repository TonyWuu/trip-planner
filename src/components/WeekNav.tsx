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
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onPrevWeek}
        disabled={!canGoPrev}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous week"
      >
        <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
      </span>

      <button
        onClick={onNextWeek}
        disabled={!canGoNext}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next week"
      >
        <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
}
