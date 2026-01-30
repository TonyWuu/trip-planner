'use client';

import { DayInfo } from '@/lib/types';
import { formatDateHeader } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface MobileDayPickerProps {
  days: DayInfo[];
  currentDayIndex: number;
  onDayChange: (index: number) => void;
}

function getCityStyle(city: string): { gradient: string; color: string; emoji: string } {
  const cityLower = city.toLowerCase();
  if (cityLower.includes('hong kong')) {
    return { gradient: 'linear-gradient(135deg, #ff6b6b, #ff8fab)', color: '#ff6b6b', emoji: '🏙️' };
  } else if (cityLower.includes('shanghai')) {
    return { gradient: 'linear-gradient(135deg, #4d96ff, #6bb3ff)', color: '#4d96ff', emoji: '🌆' };
  } else if (cityLower.includes('chengdu')) {
    return { gradient: 'linear-gradient(135deg, #6bcb77, #8ce99a)', color: '#6bcb77', emoji: '🐼' };
  }
  return { gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)', color: '#6b7280', emoji: '📍' };
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
    <div className="md:hidden px-4 py-3">
      <div
        className="flex items-center justify-between rounded-2xl px-3 py-4"
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 251, 245, 0.9))',
          border: '2px solid rgba(255, 107, 107, 0.15)',
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.08)',
        }}
      >
        <button
          onClick={() => canGoPrev && onDayChange(currentDayIndex - 1)}
          disabled={!canGoPrev}
          className="p-3 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: canGoPrev ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 217, 61, 0.1))' : 'transparent',
            border: canGoPrev ? '2px solid rgba(255, 107, 107, 0.2)' : 'none',
          }}
          aria-label="Previous day"
        >
          <ChevronLeftIcon className="w-5 h-5" style={{ color: '#ff6b6b' }} />
        </button>

        <div className="text-center">
          <div
            className="text-2xl font-bold"
            style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              background: cityStyle.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {formatDateHeader(currentDay.date)}
          </div>
          <div className="text-sm text-gray-400 font-medium mt-0.5">
            {currentDay.dayOfWeek}
          </div>
          {currentDay.city && (
            <span
              className="inline-flex items-center gap-1 mt-2 px-3 py-1 text-xs font-bold rounded-xl text-white shadow-md"
              style={{
                background: cityStyle.gradient,
                boxShadow: `0 2px 8px ${cityStyle.color}40`,
              }}
            >
              <span>{cityStyle.emoji}</span>
              {currentDay.city}
            </span>
          )}
        </div>

        <button
          onClick={() => canGoNext && onDayChange(currentDayIndex + 1)}
          disabled={!canGoNext}
          className="p-3 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: canGoNext ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 217, 61, 0.1))' : 'transparent',
            border: canGoNext ? '2px solid rgba(255, 107, 107, 0.2)' : 'none',
          }}
          aria-label="Next day"
        >
          <ChevronRightIcon className="w-5 h-5" style={{ color: '#ff6b6b' }} />
        </button>
      </div>
    </div>
  );
}
