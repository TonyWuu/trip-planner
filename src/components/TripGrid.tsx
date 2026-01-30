'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { parseISO, addDays, startOfDay, isBefore, isAfter, differenceInMilliseconds, addMinutes, format } from 'date-fns';
import { Trip, Activity, Category, ModalMode, FixedItem, WishlistItem } from '@/lib/types';
import { getWeekDays, getDaysInRange } from '@/lib/utils';
import { getCategories } from '@/lib/supabase';
import { useActivities } from '@/hooks/useActivities';
import { useFixedItems } from '@/hooks/useFixedItems';
import { useWishlist } from '@/hooks/useWishlist';
import TimeColumn from './TimeColumn';
import DayColumn from './DayColumn';
import FixedItemsBar from './FixedItemsBar';
import MobileDayPicker from './MobileDayPicker';
import ActivityModal from './ActivityModal';
import FixedItemModal from './FixedItemModal';
import WishlistSidebar from './WishlistSidebar';

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
  const [wishlistOpen, setWishlistOpen] = useState(true);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const { activities, createActivity, updateActivity, deleteActivity } = useActivities(trip.id);
  const { flights, hotels, updateFixedItem, deleteFixedItem } = useFixedItems(trip.id);
  const { items: wishlistItems, createItem: createWishlistItem, updateItem: updateWishlistItem, deleteItem: deleteWishlistItemLocal } = useWishlist(trip.id);

  const tripStart = parseISO(trip.start_date);
  const tripEnd = parseISO(trip.end_date);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function fetchCategories() {
      const cats = await getCategories(trip.id);
      setCategories(cats);
    }
    fetchCategories();
  }, [trip.id]);

  // Scroll to core hours (8am) on load and when week changes
  const hasScrolledInitially = useRef(false);
  useEffect(() => {
    if (gridContainerRef.current) {
      // 8am is slot index 16 (8 hours * 2 slots per hour)
      // Each slot is 40px tall, plus account for the day header (~56px)
      const coreHourOffset = 16 * 40 + 56;
      gridContainerRef.current.scrollTo({
        top: coreHourOffset,
        // Use instant scroll on first load, smooth on week changes
        behavior: hasScrolledInitially.current ? 'smooth' : 'instant',
      });
      hasScrolledInitially.current = true;
    }
  }, [weekStart]);

  const allDays = getDaysInRange(trip.start_date, trip.end_date);
  const weekDays = getWeekDays(weekStart, trip.start_date, trip.end_date);

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

  const handleCellClick = useCallback((date: string, hour: number, minute: number) => {
    setModalMode('create');
    setSelectedActivity(null);
    setInitialDateTime({ date, hour, minute });
    setModalOpen(true);
  }, []);

  const handleActivityClick = useCallback((activity: Activity) => {
    setModalMode('edit');
    setSelectedActivity(activity);
    setInitialDateTime(null);
    setModalOpen(true);
  }, []);

  const handleFixedItemClick = useCallback((item: FixedItem) => {
    setSelectedFixedItem(item);
    setFixedItemModalOpen(true);
  }, []);

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

  const handleCategoryCreated = useCallback((category: Category) => {
    setCategories((prev) => [...prev, category]);
  }, []);

  const handleCategoryDeleted = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleActivityResize = useCallback(
    async (activityId: string, newEndTime: string, newStartTime?: string) => {
      const updates: Partial<Activity> = { end_datetime: newEndTime };
      if (newStartTime) {
        updates.start_datetime = newStartTime;
      }
      await updateActivity(activityId, updates);
    },
    [updateActivity]
  );

  const handleActivityDrop = useCallback(
    async (activity: Activity, newDate: string, newHour: number, newMinute: number) => {
      const oldStart = new Date(activity.start_datetime);
      const oldEnd = new Date(activity.end_datetime);
      const durationMs = differenceInMilliseconds(oldEnd, oldStart);

      const newStartStr = `${newDate}T${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
      const newStart = new Date(newStartStr);
      const newEnd = new Date(newStart.getTime() + durationMs);

      const formatDateTime = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}`;
      };

      await updateActivity(activity.id, {
        start_datetime: formatDateTime(newStart),
        end_datetime: formatDateTime(newEnd),
      });
    },
    [updateActivity]
  );

  const handleWishlistDrop = useCallback(
    async (wishlistItem: WishlistItem, newDate: string, newHour: number, newMinute: number) => {
      const newStartStr = `${newDate}T${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
      const newStart = new Date(newStartStr);
      const newEnd = addMinutes(newStart, wishlistItem.duration_minutes);

      const formatDateTime = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}`;
      };

      await createActivity({
        trip_id: trip.id,
        name: wishlistItem.name,
        category: wishlistItem.category,
        start_datetime: formatDateTime(newStart),
        end_datetime: formatDateTime(newEnd),
        address: wishlistItem.address,
        notes: wishlistItem.notes,
        booking_reference: null,
        cost_amount: null,
        cost_currency: null,
        links: wishlistItem.links,
      });

      await deleteWishlistItemLocal(wishlistItem.id);
    },
    [createActivity, deleteWishlistItemLocal, trip.id]
  );

  const handleWishlistDragStart = useCallback((e: React.DragEvent, item: WishlistItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ ...item, isWishlistItem: true }));
  }, []);

  // Handle dropping an activity onto the wishlist (move from calendar to wishlist)
  const handleActivityToWishlist = useCallback(
    async (activity: Activity) => {
      const startDate = new Date(activity.start_datetime);
      const endDate = new Date(activity.end_datetime);
      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

      // Create wishlist item from activity
      await createWishlistItem({
        trip_id: trip.id,
        name: activity.name,
        category: activity.category,
        duration_minutes: durationMinutes,
        address: activity.address,
        notes: activity.notes,
        links: activity.links,
      });

      // Delete the activity from calendar
      await deleteActivity(activity.id);
    },
    [createWishlistItem, deleteActivity, trip.id]
  );

  const handleDrop = useCallback(
    async (data: Activity | (WishlistItem & { isWishlistItem: true }), newDate: string, newHour: number, newMinute: number) => {
      if ('isWishlistItem' in data && data.isWishlistItem) {
        await handleWishlistDrop(data, newDate, newHour, newMinute);
      } else {
        await handleActivityDrop(data as Activity, newDate, newHour, newMinute);
      }
    },
    [handleWishlistDrop, handleActivityDrop]
  );

  const displayDays = isMobile ? [allDays[mobileDayIndex]].filter(Boolean) : weekDays;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-amber-50 via-orange-50/40 to-yellow-50">
      {/* Header with integrated week navigation */}
      <header className="bg-white/70 backdrop-blur-md px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {trip.name}
              </h1>
              <div className="hidden md:flex items-center gap-1 text-[10px]">
                <span className="text-rose-500 font-medium">HK</span>
                <span className="text-slate-300">→</span>
                <span className="text-blue-500 font-medium">Shanghai</span>
                <span className="text-slate-300">→</span>
                <span className="text-emerald-500 font-medium">Chengdu</span>
              </div>
            </div>
          </div>

          {/* Center: Week date range display */}
          <div className="hidden md:block px-3 py-1 rounded-lg bg-amber-100/80 text-amber-800 text-xs font-medium">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </div>

          {/* Right: Empty for balance */}
          <div className="w-10 md:w-32" />
        </div>
      </header>

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

      {/* Main content area with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Grid Container */}
        <div ref={gridContainerRef} className="flex-1 overflow-auto px-4 pb-4">
          <div className="flex min-w-fit">
            <TimeColumn
              onPrevWeek={handlePrevWeek}
              canGoPrev={canGoPrev && startOfDay(weekStart).getTime() !== startOfDay(tripStart).getTime()}
            />
            {displayDays.map((day) => (
              <DayColumn
                key={day.dateStr}
                day={day}
                activities={activities}
                flights={flights}
                categories={categories}
                onCellClick={handleCellClick}
                onActivityClick={handleActivityClick}
                onActivityDelete={handleDelete}
                onActivityDrop={handleDrop}
                onActivityResize={handleActivityResize}
                onFlightClick={handleFixedItemClick}
              />
            ))}
            {/* Right navigation column */}
            <div className="flex-shrink-0 w-10">
              <div className="h-14 flex items-center justify-center mb-2 sticky top-0 z-20 bg-gradient-to-l from-amber-50 to-amber-50/80 backdrop-blur-sm">
                <button
                  onClick={handleNextWeek}
                  disabled={!canGoNext}
                  className="p-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next week"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Wishlist Sidebar */}
        <WishlistSidebar
        items={wishlistItems}
        categories={categories}
        onAddItem={createWishlistItem}
        onUpdateItem={updateWishlistItem}
        onDeleteItem={deleteWishlistItemLocal}
        onDragStart={handleWishlistDragStart}
        onActivityDrop={handleActivityToWishlist}
        onCategoryCreated={handleCategoryCreated}
        onCategoryDeleted={handleCategoryDeleted}
        tripId={trip.id}
        isOpen={wishlistOpen}
        onToggle={() => setWishlistOpen(!wishlistOpen)}
      />
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
        onCategoryCreated={handleCategoryCreated}
        onCategoryDeleted={handleCategoryDeleted}
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
