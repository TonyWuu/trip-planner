'use client';

import { useState, useEffect } from 'react';
import { Activity, Category, DayInfo, WishlistItem, FixedItem } from '@/lib/types';
import { TIME_SLOTS } from '@/lib/constants';
import {
  formatDateHeader,
  getTimeSlotIndex,
  isActivityInSlot,
  isFlightInSlot,
  getFlightTimeSlotIndex,
  doesActivityStartInSlot,
  doesActivityContinueOnDay,
  getActivitySpanForDay,
  doesFlightStartInSlot,
  doesFlightContinueOnDay,
  getFlightSpanForDay
} from '@/lib/utils';
import ActivityCell from './ActivityCell';
import FlightCell from './FlightCell';

// Module-level state for tracking dragged item info across components
let draggedItemSpan: number | null = null;
let draggedItemColor: string | null = null;
let draggedItemYOffset: number = 0; // Y offset from mouse to top of activity

export function setDraggedItemSpan(span: number | null) {
  draggedItemSpan = span;
}

export function getDraggedItemSpan(): number | null {
  return draggedItemSpan;
}

export function setDraggedItemColor(color: string | null) {
  draggedItemColor = color;
}

export function getDraggedItemColor(): string | null {
  return draggedItemColor;
}

export function setDraggedItemYOffset(offset: number) {
  draggedItemYOffset = offset;
}

export function getDraggedItemYOffset(): number {
  return draggedItemYOffset;
}

interface DayColumnProps {
  day: DayInfo;
  activities: Activity[];
  flights?: FixedItem[];
  categories: Category[];
  onCellClick: (date: string, hour: number, minute: number) => void;
  onActivityClick: (activity: Activity) => void;
  onActivityDelete: (id: string) => void;
  onActivityDrop: (data: Activity | (WishlistItem & { isWishlistItem: true }), newDate: string, newHour: number, newMinute: number) => Promise<void>;
  onActivityResize?: (activityId: string, newEndTime: string, newStartTime?: string) => void;
  onFlightClick?: (flight: FixedItem) => void;
  showHeader?: boolean;
}

function getCityStyle(city: string): { bg: string; text: string; label: string; color: string } {
  const cityLower = city.toLowerCase();

  if (cityLower.includes('→')) {
    const parts = city.split('→').map(p => p.trim());
    return { bg: 'bg-amber-100', text: 'text-amber-700', label: `${parts[0]} → ${parts[1]}`, color: '#f59e0b' };
  }

  if (cityLower.includes('transit')) {
    return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Transit', color: '#64748b' };
  }

  if (cityLower.includes('hong kong')) {
    return { bg: 'bg-[#ff6b6b]/10', text: 'text-[#ff6b6b]', label: 'Hong Kong', color: '#ff6b6b' };
  }

  if (cityLower.includes('shanghai')) {
    return { bg: 'bg-[#4d96ff]/10', text: 'text-[#4d96ff]', label: 'Shanghai', color: '#4d96ff' };
  }

  if (cityLower.includes('chengdu')) {
    return { bg: 'bg-[#6bcb77]/10', text: 'text-[#6bcb77]', label: 'Chengdu', color: '#6bcb77' };
  }

  if (cityLower.includes('toronto')) {
    return { bg: 'bg-[#b088f9]/10', text: 'text-[#b088f9]', label: 'Toronto', color: '#b088f9' };
  }

  return { bg: 'bg-gray-100', text: 'text-gray-700', label: city, color: '#6b7280' };
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
  flights = [],
  categories,
  onCellClick,
  onActivityClick,
  onActivityDelete,
  onActivityDrop,
  onActivityResize,
  onFlightClick,
  showHeader = true,
}: DayColumnProps) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [dragOver15MinOffset, setDragOver15MinOffset] = useState<boolean>(false);
  const [currentDragSpan, setCurrentDragSpan] = useState<number>(1);
  const [currentDragColor, setCurrentDragColor] = useState<string>('#ff6b6b');

  // Filter activities that are visible on this day (including multi-day activities)
  const dayActivities = activities.filter((activity) => {
    return TIME_SLOTS.some((_, index) => isActivityInSlot(activity, day.dateStr, index));
  });

  // Filter flights that are visible on this day (including multi-day flights)
  const dayFlights = flights.filter((flight) => {
    return TIME_SLOTS.some((_, index) => isFlightInSlot(flight, day.dateStr, index));
  });

  // Calculate overlap layout for all activities in this day
  const overlapLayout = calculateOverlapLayout(dayActivities);

  const getActivitiesStartingInSlot = (slotIndex: number): { activity: Activity; isContinuation: boolean }[] => {
    const results: { activity: Activity; isContinuation: boolean }[] = [];

    for (const activity of dayActivities) {
      // Check if activity starts in this slot on this day
      if (doesActivityStartInSlot(activity, day.dateStr, slotIndex)) {
        results.push({ activity, isContinuation: false });
      }
      // Check if activity continues from previous day and this is slot 0 (midnight)
      else if (slotIndex === 0 && doesActivityContinueOnDay(activity, day.dateStr)) {
        results.push({ activity, isContinuation: true });
      }
    }

    return results;
  };

  const getFlightsStartingInSlot = (slotIndex: number): { flight: FixedItem; isContinuation: boolean }[] => {
    const results: { flight: FixedItem; isContinuation: boolean }[] = [];

    for (const flight of dayFlights) {
      // Check if flight starts in this slot on this day
      if (doesFlightStartInSlot(flight, day.dateStr, slotIndex)) {
        results.push({ flight, isContinuation: false });
      }
      // Check if flight continues from previous day and this is slot 0 (midnight)
      else if (slotIndex === 0 && doesFlightContinueOnDay(flight, day.dateStr)) {
        results.push({ flight, isContinuation: true });
      }
    }

    return results;
  };


  const handleDragStart = (e: React.DragEvent, activity: Activity) => {
    e.dataTransfer.setData('application/json', JSON.stringify(activity));
    e.dataTransfer.effectAllowed = 'move';
    // Calculate and store the span
    const start = new Date(activity.start_datetime);
    const end = new Date(activity.end_datetime);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const span = Math.ceil(durationMinutes / 30);
    setDraggedItemSpan(span);
  };

  const handleDragOver = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Get the Y offset from where user grabbed the activity to its top
    const yOffset = getDraggedItemYOffset();

    // Calculate position accounting for where user grabbed the activity
    const rect = e.currentTarget.getBoundingClientRect();
    const adjustedY = e.clientY - rect.top - yOffset;

    // Calculate which slot the TOP of the activity should land in
    const slotHeight = 40;
    const adjustedSlotIndex = Math.max(0, Math.min(TIME_SLOTS.length - 1, slotIndex + Math.floor(adjustedY / slotHeight)));
    const yWithinSlot = ((adjustedY % slotHeight) + slotHeight) % slotHeight; // Handle negative modulo
    const add15Min = yWithinSlot >= 20;

    setDragOverSlot(adjustedSlotIndex);
    setDragOver15MinOffset(add15Min);

    // Get the span and color from the module-level variables
    const span = getDraggedItemSpan();
    if (span !== null) {
      setCurrentDragSpan(span);
    }
    const color = getDraggedItemColor();
    if (color !== null) {
      setCurrentDragColor(color);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the column entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSlot(null);
      setDragOver15MinOffset(false);
    }
  };

  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();

    // Capture the current preview position before clearing state
    const finalSlot = dragOverSlot;
    const final15MinOffset = dragOver15MinOffset;

    setDragOverSlot(null);
    setDragOver15MinOffset(false);
    setDraggedItemSpan(null);
    setDraggedItemColor(null);
    setDraggedItemYOffset(0);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData && finalSlot !== null) {
        const data = JSON.parse(jsonData);
        const slot = TIME_SLOTS[finalSlot];

        const dropMinute = slot.minute + (final15MinOffset ? 15 : 0);
        const dropHour = dropMinute >= 60 ? slot.hour + 1 : slot.hour;
        const finalMinute = dropMinute % 60;

        onActivityDrop(data, day.dateStr, dropHour, finalMinute);
      }
    } catch (err) {
      console.error('Error parsing dropped item:', err);
    }
  };

  const isToday = day.dateStr === new Date().toISOString().split('T')[0];
  const isWeekend = day.dayOfWeek === 'Sat' || day.dayOfWeek === 'Sun';
  const cityStyle = getCityStyle(day.city);

  return (
    <div className="flex-1 min-w-0">
      {/* Header - only show if showHeader is true */}
      {showHeader && (
        <div
          className={`hidden md:flex md:flex-col md:items-center md:justify-center h-14 mx-1 mb-2 rounded-xl sticky top-[114px] z-30 ${
            isToday
              ? 'bg-gradient-to-br from-[#ff6b6b] to-[#ff8fab] text-white shadow-md'
              : 'bg-white shadow-sm'
          }`}
        >
          <span className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>
            {formatDateHeader(day.date)}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${isToday ? 'text-white/80' : 'text-gray-400'}`}>
              {day.dayOfWeek}
            </span>
            {day.city && (
              <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${
                isToday ? 'bg-white/20 text-white' : `${cityStyle.bg} ${cityStyle.text}`
              }`}>
                {cityStyle.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Time slots */}
      <div className="mx-1 rounded-2xl bg-white/60 backdrop-blur-sm overflow-hidden relative">
        {TIME_SLOTS.map((slot, index) => {
          const slotActivities = getActivitiesStartingInSlot(index);
          const slotFlights = getFlightsStartingInSlot(index);
          const isHourStart = slot.minute === 0;

          return (
            <div
              key={index}
              className={`h-10 relative cursor-pointer ${
                isHourStart ? 'border-t border-gray-200/60' : ''
              }`}
              onClick={() => onCellClick(day.dateStr, slot.hour, slot.minute)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              {/* Render flights */}
              {slotFlights.map(({ flight, isContinuation }) => (
                <FlightCell
                  key={flight.id + (isContinuation ? '-cont' : '')}
                  flight={flight}
                  onClick={onFlightClick ? () => onFlightClick(flight) : undefined}
                  daySpan={getFlightSpanForDay(flight, day.dateStr)}
                  isContinuation={isContinuation}
                />
              ))}
              {/* Render activities */}
              {slotActivities.map(({ activity, isContinuation }) => {
                const layout = overlapLayout.get(activity.id) ?? { column: 0, totalColumns: 1 };
                return (
                  <ActivityCell
                    key={activity.id + (isContinuation ? '-cont' : '')}
                    activity={activity}
                    categories={categories}
                    onClick={() => onActivityClick(activity)}
                    onDelete={onActivityDelete}
                    onDragStart={handleDragStart}
                    onResize={onActivityResize}
                    column={layout.column}
                    totalColumns={layout.totalColumns}
                    isAnyDragActive={dragOverSlot !== null}
                    daySpan={getActivitySpanForDay(activity, day.dateStr)}
                    isContinuation={isContinuation}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Drag preview overlay */}
        {dragOverSlot !== null && (
          <div
            className="absolute left-1 right-1 rounded-lg border-2 border-dashed pointer-events-none z-30"
            style={{
              top: `${dragOverSlot * 40 + (dragOver15MinOffset ? 20 : 0)}px`,
              height: `${Math.min(currentDragSpan, TIME_SLOTS.length - dragOverSlot) * 40 - 2}px`,
              borderColor: currentDragColor,
              backgroundColor: `${currentDragColor}15`,
            }}
          />
        )}
      </div>
    </div>
  );
}
