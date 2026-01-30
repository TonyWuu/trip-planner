'use client';

import { DayInfo } from '@/lib/types';
import { formatDateHeader } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface MobileDayPickerProps {
  days: DayInfo[];
  currentDayIndex: number;
  onDayChange: (index: number) => void;
}

export default function MobileDayPicker({
  days,
  currentDayIndex,
  onDayChange,
}: MobileDayPickerProps) {
  const currentDay = days[currentDayIndex];

  if (!currentDay) return null;

  const canGoPrev = currentDayIndex > 0;
  const canGoNext = currentDayIndex < days.length - 1;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 md:hidden">
      <button
        onClick={() => canGoPrev && onDayChange(currentDayIndex - 1)}
        disabled={!canGoPrev}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous day"
      >
        <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {formatDateHeader(currentDay.date)} ({currentDay.dayOfWeek})
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {currentDay.city}
        </div>
      </div>

      <button
        onClick={() => canGoNext && onDayChange(currentDayIndex + 1)}
        disabled={!canGoNext}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next day"
      >
        <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
}
