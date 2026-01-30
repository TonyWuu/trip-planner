'use client';

import { useState, useCallback, useEffect } from 'react';
import { parseISO, addDays, startOfDay, isBefore, isAfter } from 'date-fns';
import { Trip, Activity, Category, ModalMode, FixedItem } from '@/lib/types';
import { getWeekDays, getDaysInRange } from '@/lib/utils';
import { getCategories } from '@/lib/supabase';
import { useActivities } from '@/hooks/useActivities';
import { useFixedItems } from '@/hooks/useFixedItems';
import TimeColumn from './TimeColumn';
import DayColumn from './DayColumn';
import FixedItemsBar from './FixedItemsBar';
import WeekNav from './WeekNav';
import MobileDayPicker from './MobileDayPicker';
import ActivityModal from './ActivityModal';
import FixedItemModal from './FixedItemModal';

interface TripGridProps {
  trip: Trip;
}

export default function TripGrid({ trip }: TripGridProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => {
    return startOfDay(parseISO(trip.start_date));
  });
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [initialDateTime, setInitialDateTime] = useState<{
    date: string;
    hour: number;
    minute: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [fixedItemModalOpen, setFixedItemModalOpen] = useState(false);
  const [selectedFixedItem, setSelectedFixedItem] = useState<FixedItem | null>(null);

  const { activities, createActivity, updateActivity, deleteActivity } = useActivities(trip.id);
  const { flights, hotels, updateFixedItem, deleteFixedItem } = useFixedItems(trip.id);

  const tripStart = parseISO(trip.start_date);
  const tripEnd = parseISO(trip.end_date);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      const cats = await getCategories(trip.id);
      setCategories(cats);
    }
    fetchCategories();
  }, [trip.id]);

  // Get all days for mobile view
  const allDays = getDaysInRange(trip.start_date, trip.end_date);

  // Get visible days for current week (desktop)
  const weekDays = getWeekDays(weekStart, trip.start_date, trip.end_date);

  // Navigation handlers (desktop)
  const canGoPrev = isAfter(weekStart, tripStart) || startOfDay(weekStart).getTime() !== startOfDay(tripStart).getTime();
  const nextWeekStart = addDays(weekStart, 7);
  const canGoNext = isBefore(nextWeekStart, tripEnd);

  const handlePrevWeek = useCallback(() => {
    const newStart = addDays(weekStart, -7);
    if (isBefore(newStart, tripStart)) {
      setWeekStart(startOfDay(tripStart));
    } else {
      setWeekStart(newStart);
    }
  }, [weekStart, tripStart]);

  const handleNextWeek = useCallback(() => {
    if (canGoNext) {
      setWeekStart(nextWeekStart);
    }
  }, [canGoNext, nextWeekStart]);

  // Cell click handler
  const handleCellClick = useCallback((date: string, hour: number, minute: number) => {
    setModalMode('create');
    setSelectedActivity(null);
    setInitialDateTime({ date, hour, minute });
    setModalOpen(true);
  }, []);

  // Activity click handler
  const handleActivityClick = useCallback((activity: Activity) => {
    setModalMode('edit');
    setSelectedActivity(activity);
    setInitialDateTime(null);
    setModalOpen(true);
  }, []);

  // Fixed item click handler
  const handleFixedItemClick = useCallback((item: FixedItem) => {
    setSelectedFixedItem(item);
    setFixedItemModalOpen(true);
  }, []);

  // Modal handlers
  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedActivity(null);
    setInitialDateTime(null);
  }, []);

  const handleCloseFixedItemModal = useCallback(() => {
    setFixedItemModalOpen(false);
    setSelectedFixedItem(null);
  }, []);

  const handleSave = useCallback(
    async (data: Omit<Activity, 'id' | 'created_at' | 'updated_at'>) => {
      await createActivity(data);
    },
    [createActivity]
  );

  const handleUpdate = useCallback(
    async (id: string, data: Partial<Activity>) => {
      await updateActivity(id, data);
    },
    [updateActivity]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteActivity(id);
    },
    [deleteActivity]
  );

  const handleUpdateFixedItem = useCallback(
    async (id: string, data: Partial<FixedItem>) => {
      await updateFixedItem(id, data);
    },
    [updateFixedItem]
  );

  const handleDeleteFixedItem = useCallback(
    async (id: string) => {
      await deleteFixedItem(id);
    },
    [deleteFixedItem]
  );

  // Handle activity drag and drop
  const handleActivityDrop = useCallback(
    async (activity: Activity, newDate: string, newHour: number, newMinute: number) => {
      // Calculate the duration of the activity
      const oldStart = new Date(activity.start_datetime);
      const oldEnd = new Date(activity.end_datetime);
      const durationMs = oldEnd.getTime() - oldStart.getTime();

      // Create new start time
      const newStart = new Date(`${newDate}T${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}:00`);
      const newEnd = new Date(newStart.getTime() + durationMs);

      await updateActivity(activity.id, {
        start_datetime: newStart.toISOString(),
        end_datetime: newEnd.toISOString(),
      });
    },
    [updateActivity]
  );

  // Days to display based on viewport
  const displayDays = isMobile ? [allDays[mobileDayIndex]].filter(Boolean) : weekDays;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{trip.name}</h1>
      </header>

      {/* Week Navigation (Desktop) */}
      <div className="hidden md:block">
        <WeekNav
          weekStart={weekStart}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          canGoPrev={canGoPrev && startOfDay(weekStart).getTime() !== startOfDay(tripStart).getTime()}
          canGoNext={canGoNext}
        />
      </div>

      {/* Mobile Day Picker */}
      <MobileDayPicker
        days={allDays}
        currentDayIndex={mobileDayIndex}
        onDayChange={setMobileDayIndex}
      />

      {/* Fixed Items Bar */}
      <div className="hidden md:block">
        <FixedItemsBar
          flights={flights}
          hotels={hotels}
          weekDays={weekDays}
          weekStart={weekStart}
          onItemClick={handleFixedItemClick}
        />
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-fit">
          {/* Time Column */}
          <TimeColumn />

          {/* Day Columns */}
          {displayDays.map((day) => (
            <DayColumn
              key={day.dateStr}
              day={day}
              activities={activities}
              categories={categories}
              onCellClick={handleCellClick}
              onActivityClick={handleActivityClick}
              onActivityDelete={handleDelete}
              onActivityDrop={handleActivityDrop}
            />
          ))}
        </div>
      </div>

      {/* Activity Modal */}
      <ActivityModal
        isOpen={modalOpen}
        mode={modalMode}
        activity={selectedActivity}
        categories={categories}
        initialDateTime={initialDateTime}
        onClose={handleCloseModal}
        onSave={handleSave}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        tripId={trip.id}
      />

      {/* Fixed Item Modal */}
      <FixedItemModal
        isOpen={fixedItemModalOpen}
        item={selectedFixedItem}
        onClose={handleCloseFixedItemModal}
        onUpdate={handleUpdateFixedItem}
        onDelete={handleDeleteFixedItem}
      />
    </div>
  );
}
