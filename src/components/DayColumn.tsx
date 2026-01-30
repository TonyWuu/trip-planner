'use client';

import { useState } from 'react';
import { Activity, Category, DayInfo, WishlistItem } from '@/lib/types';
import { TIME_SLOTS } from '@/lib/constants';
import { formatDateHeader, getTimeSlotIndex, isActivityInSlot } from '@/lib/utils';
import ActivityCell from './ActivityCell';

interface DayColumnProps {
  day: DayInfo;
  activities: Activity[];
  categories: Category[];
  onCellClick: (date: string, hour: number, minute: number) => void;
  onActivityClick: (activity: Activity) => void;
  onActivityDelete: (id: string) => void;
  onActivityDrop: (data: Activity | (WishlistItem & { isWishlistItem: true }), newDate: string, newHour: number, newMinute: number) => Promise<void>;
  onActivityResize?: (activityId: string, newEndTime: string, newStartTime?: string) => void;
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

// Calculate overlap layout for activities
function calculateOverlapLayout(activities: Activity[]): Map<string, { column: number; totalColumns: number }> {
  const layout = new Map<string, { column: number; totalColumns: number }>();

  if (activities.length === 0) return layout;

  // Sort by start time, then by end time (longer activities first)
  const sorted = [...activities].sort((a, b) => {
    const startA = new Date(a.start_datetime).getTime();
    const startB = new Date(b.start_datetime).getTime();
    if (startA !== startB) return startA - startB;
    const endA = new Date(a.end_datetime).getTime();
    const endB = new Date(b.end_datetime).getTime();
    return endB - endA; // Longer activities first
  });

  // Track columns and their end times
  const columns: number[] = []; // End time for each column

  for (const activity of sorted) {
    const start = new Date(activity.start_datetime).getTime();
    const end = new Date(activity.end_datetime).getTime();

    // Find the first available column
    let column = -1;
    for (let i = 0; i < columns.length; i++) {
      if (columns[i] <= start) {
        column = i;
        break;
      }
    }

    // If no column available, create a new one
    if (column === -1) {
      column = columns.length;
      columns.push(end);
    } else {
      columns[column] = end;
    }

    layout.set(activity.id, { column, totalColumns: 1 }); // totalColumns updated later
  }

  // Group overlapping activities and update totalColumns
  for (const activity of sorted) {
    const activityStart = new Date(activity.start_datetime).getTime();
    const activityEnd = new Date(activity.end_datetime).getTime();

    // Find all activities that overlap with this one
    const overlapping = sorted.filter((other) => {
      const otherStart = new Date(other.start_datetime).getTime();
      const otherEnd = new Date(other.end_datetime).getTime();
      return activityStart < otherEnd && activityEnd > otherStart;
    });

    // The max column index + 1 among overlapping activities is the totalColumns
    const maxColumn = Math.max(...overlapping.map((a) => layout.get(a.id)?.column ?? 0));
    const totalColumns = maxColumn + 1;

    // Update all overlapping activities with the same totalColumns
    for (const a of overlapping) {
      const existing = layout.get(a.id);
      if (existing) {
        layout.set(a.id, { ...existing, totalColumns: Math.max(existing.totalColumns, totalColumns) });
      }
    }
  }

  return layout;
}

export default function DayColumn({
  day,
  activities,
  categories,
  onCellClick,
  onActivityClick,
  onActivityDelete,
  onActivityDrop,
  onActivityResize,
}: DayColumnProps) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const dayActivities = activities.filter((activity) => {
    return TIME_SLOTS.some((_, index) => isActivityInSlot(activity, day.dateStr, index));
  });

  // Calculate overlap layout for all activities in this day
  const overlapLayout = calculateOverlapLayout(dayActivities);

  const getActivitiesStartingInSlot = (slotIndex: number): Activity[] => {
    return dayActivities.filter((activity) => {
      const activitySlotIndex = getTimeSlotIndex(activity.start_datetime);
      return activitySlotIndex === slotIndex;
    });
  };

  const handleDragStart = (e: React.DragEvent, activity: Activity) => {
    e.dataTransfer.setData('application/json', JSON.stringify(activity));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slotIndex);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    setDragOverSlot(null);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const data = JSON.parse(jsonData);
        const slot = TIME_SLOTS[slotIndex];
        onActivityDrop(data, day.dateStr, slot.hour, slot.minute);
      }
    } catch (err) {
      console.error('Error parsing dropped item:', err);
    }
  };

  const isToday = day.dateStr === new Date().toISOString().split('T')[0];
  const isWeekend = day.dayOfWeek === 'Sat' || day.dayOfWeek === 'Sun';
  const cityStyle = getCityStyle(day.city);

  return (
    <div className="flex-1 min-w-[140px]">
      {/* Header */}
      <div className={`hidden md:flex md:flex-col md:items-center md:justify-center h-14 mx-1 mb-2 rounded-xl sticky top-0 z-10 ${
        isToday
          ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200'
          : 'bg-white/80 backdrop-blur-sm shadow-sm'
      }`}>
        <span className={`text-lg font-bold ${isToday ? 'text-white' : 'text-slate-800'}`}>
          {formatDateHeader(day.date)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${isToday ? 'text-violet-100' : 'text-slate-400'}`}>
            {day.dayOfWeek}
          </span>
          {day.city && (
            <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${
              isToday ? 'bg-white/20 text-white' : `${cityStyle.bg} ${cityStyle.text}`
            }`}>
              {day.city.split(' ')[0].slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Time slots */}
      <div className="mx-1 rounded-2xl bg-white/50 backdrop-blur-sm overflow-hidden">
        {TIME_SLOTS.map((slot, index) => {
          const slotActivities = getActivitiesStartingInSlot(index);
          const isDragOver = dragOverSlot === index;
          const isHourStart = slot.minute === 0;

          return (
            <div
              key={index}
              className={`h-10 relative cursor-pointer transition-all duration-150 ${
                isHourStart ? 'border-t border-slate-200/60' : ''
              } ${
                isDragOver
                  ? 'bg-violet-100/80 ring-2 ring-inset ring-violet-300 rounded-lg'
                  : 'hover:bg-slate-100/50'
              }`}
              onClick={() => onCellClick(day.dateStr, slot.hour, slot.minute)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              {slotActivities.map((activity) => {
                const layout = overlapLayout.get(activity.id) ?? { column: 0, totalColumns: 1 };
                return (
                  <ActivityCell
                    key={activity.id}
                    activity={activity}
                    categories={categories}
                    onClick={() => onActivityClick(activity)}
                    onDelete={onActivityDelete}
                    onDragStart={handleDragStart}
                    onResize={onActivityResize}
                    column={layout.column}
                    totalColumns={layout.totalColumns}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
