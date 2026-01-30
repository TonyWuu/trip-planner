'use client';

import { TIME_SLOTS } from '@/lib/constants';

export default function TimeColumn() {
  return (
    <div className="sticky left-0 z-20 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Empty header cell to align with day headers */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-700" />

      {/* Time slots */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {TIME_SLOTS.map((slot, index) => (
          <div
            key={index}
            className="h-10 w-16 flex items-center justify-end pr-2 text-xs text-gray-500 dark:text-gray-400"
          >
            {slot.minute === 0 && slot.label}
          </div>
        ))}
      </div>
    </div>
  );
}
