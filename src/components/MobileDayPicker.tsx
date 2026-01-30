'use client';

import { DayInfo } from '@/lib/types';
import { formatDateHeader } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface MobileDayPickerProps {
  days: DayInfo[];
  currentDayIndex: number;
  onDayChange: (index: number) => void;
}

function getCityStyle(city: string): { bg: string; text: string } {
  const cityLower = city.toLowerCase();
  if (cityLower.includes('hong kong')) {
    return { bg: 'bg-rose-100', text: 'text-rose-700' };
  } else if (cityLower.includes('shanghai')) {
    return { bg: 'bg-blue-100', text: 'text-blue-700' };
  } else if (cityLower.includes('chengdu')) {
    return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  }
  return { bg: 'bg-gray-100', text: 'text-gray-700' };
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
  const cityStyle = getCityStyle(currentDay.city);

  return (
    <div className="bg-white border-b border-gray-200 md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => canGoPrev && onDayChange(currentDayIndex - 1)}
          disabled={!canGoPrev}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
        </button>

        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {formatDateHeader(currentDay.date)}
          </div>
          <div className="text-sm text-gray-500">
            {currentDay.dayOfWeek}
          </div>
          {currentDay.city && (
            <span className={`inline-block mt-1 px-3 py-0.5 text-xs font-semibold rounded-full ${cityStyle.bg} ${cityStyle.text}`}>
              {currentDay.city}
            </span>
          )}
        </div>

        <button
          onClick={() => canGoNext && onDayChange(currentDayIndex + 1)}
          disabled={!canGoNext}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next day"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
