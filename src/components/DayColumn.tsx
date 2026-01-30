'use client';

import { useState } from 'react';
import { Activity, Category, DayInfo } from '@/lib/types';
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
  onActivityDrop: (activity: Activity, newDate: string, newHour: number, newMinute: number) => void;
}

export default function DayColumn({
  day,
  activities,
  categories,
  onCellClick,
  onActivityClick,
  onActivityDelete,
  onActivityDrop,
}: DayColumnProps) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  // Filter activities for this day
  const dayActivities = activities.filter((activity) => {
    return TIME_SLOTS.some((_, index) => isActivityInSlot(activity, day.dateStr, index));
  });

  // Get activities that start in each slot
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
      const activityData = e.dataTransfer.getData('application/json');
      if (activityData) {
        const activity = JSON.parse(activityData) as Activity;
        const slot = TIME_SLOTS[slotIndex];
        onActivityDrop(activity, day.dateStr, slot.hour, slot.minute);
      }
    } catch (err) {
      console.error('Error parsing dropped activity:', err);
    }
  };

  return (
    <div className="flex-1 min-w-[120px] md:min-w-[120px] border-r border-gray-200 dark:border-gray-700 last:border-r-0">
      {/* Header - hidden on mobile since MobileDayPicker shows this info */}
      <div className="hidden md:block h-16 border-b border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {formatDateHeader(day.date)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{day.dayOfWeek}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{day.city}</div>
      </div>

      {/* Time slots */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {TIME_SLOTS.map((slot, index) => {
          const slotActivities = getActivitiesStartingInSlot(index);
          const isDragOver = dragOverSlot === index;

          return (
            <div
              key={index}
              className={`h-10 relative bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                isDragOver ? 'bg-blue-100 dark:bg-blue-900/30' : ''
              }`}
              onClick={() => onCellClick(day.dateStr, slot.hour, slot.minute)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              {slotActivities.map((activity) => (
                <ActivityCell
                  key={activity.id}
                  activity={activity}
                  categories={categories}
                  onClick={() => onActivityClick(activity)}
                  onDelete={onActivityDelete}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
