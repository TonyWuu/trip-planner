'use client';

import { TIME_SLOTS } from '@/lib/constants';

interface TimeColumnProps {
  onPrevWeek?: () => void;
  canGoPrev?: boolean;
}

export default function TimeColumn({ onPrevWeek, canGoPrev = true }: TimeColumnProps) {
  return (
    <div className="sticky left-0 z-20 bg-gradient-to-r from-amber-50/80 to-transparent">
      {/* Header with prev navigation - sticky at top */}
      <div className="h-14 flex items-center justify-center mb-2 sticky top-0 z-30 bg-gradient-to-r from-amber-50 to-amber-50/80 backdrop-blur-sm">
        {onPrevWeek && (
          <button
            onClick={onPrevWeek}
            disabled={!canGoPrev}
            className="p-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous week"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Time slots */}
      <div className="pr-2">
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={index}
            className="h-10 w-14 flex items-center justify-end"
          >
            {slot.minute === 0 && (
              <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                {slot.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
