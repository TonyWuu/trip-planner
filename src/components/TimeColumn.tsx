'use client';

import { TIME_SLOTS } from '@/lib/constants';

interface TimeColumnProps {
  onPrevWeek?: () => void;
  canGoPrev?: boolean;
  showHeader?: boolean;
}

export default function TimeColumn({ onPrevWeek, canGoPrev = true, showHeader = true }: TimeColumnProps) {
  return (
    <div
      className="sticky left-0 z-20"
      style={{
        background: 'linear-gradient(90deg, rgba(255, 251, 245, 0.95), rgba(255, 251, 245, 0.8), transparent)',
      }}
    >
      {/* Header with prev navigation - only show if showHeader is true */}
      {showHeader && (
        <div
          className="h-16 flex items-center justify-center mb-2 sticky top-[114px] z-30 bg-[#fffbf5]"
        >
          {onPrevWeek && (
            <button
              onClick={onPrevWeek}
              disabled={!canGoPrev}
              className="p-2 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110"
              style={{
                background: canGoPrev ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 217, 61, 0.1))' : 'transparent',
                border: canGoPrev ? '2px solid rgba(255, 107, 107, 0.2)' : 'none',
              }}
              aria-label="Previous week"
            >
              <svg className="w-5 h-5" style={{ color: '#ff6b6b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Time slots */}
      <div className="pr-1 md:pr-2">
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={index}
            className="h-10 w-10 md:w-16 flex items-center justify-end"
          >
            {slot.minute === 0 && (
              <span
                className="text-[9px] md:text-[11px] font-bold tabular-nums px-1 md:px-2 py-0.5 rounded-lg"
                style={{
                  color: '#ff6b6b',
                  background: index % 2 === 0 ? 'rgba(255, 107, 107, 0.08)' : 'transparent',
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                }}
              >
                {slot.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
