'use client';

import { TIME_SLOTS } from '@/lib/constants';

export default function TimeColumn() {
  return (
    <div className="sticky left-0 z-20 bg-gradient-to-r from-slate-50 to-transparent">
      {/* Header spacer */}
      <div className="h-14" />

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
