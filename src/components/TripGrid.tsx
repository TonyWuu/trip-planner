'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { parseISO, addDays, startOfDay, isBefore, isAfter, differenceInMilliseconds, addMinutes, format } from 'date-fns';
import { Trip, Activity, Category, ModalMode, FixedItem, WishlistItem } from '@/lib/types';

import { getWeekDays, getDaysInRange, getCityForDate } from '@/lib/utils';
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
import MapView from './MapView';

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
  const [viewMode, setViewMode] = useState<'calendar' | 'map'>('calendar');
  const [focusWishlistItem, setFocusWishlistItem] = useState<WishlistItem | null>(null);
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

  // Show fewer days when wishlist is open to fit both side by side
  const daysToShow = wishlistOpen ? 6 : 7;
  const weekDays = getWeekDays(weekStart, trip.start_date, trip.end_date, daysToShow);

  const canGoPrev = isAfter(weekStart, tripStart) || startOfDay(weekStart).getTime() !== startOfDay(tripStart).getTime();
  const lastVisibleDay = weekDays.length > 0 ? weekDays[weekDays.length - 1].date : weekStart;
  const canGoNext = isBefore(startOfDay(lastVisibleDay), startOfDay(tripEnd));

  const handlePrevWeek = useCallback(() => {
    const newStart = addDays(weekStart, -daysToShow);
    if (isBefore(newStart, tripStart)) {
      setWeekStart(startOfDay(tripStart));
    } else {
      setWeekStart(newStart);
    }
  }, [weekStart, tripStart, daysToShow]);

  const handleNextWeek = useCallback(() => {
    if (canGoNext) {
      const newStart = addDays(weekStart, daysToShow);
      const maxStart = addDays(tripEnd, -(daysToShow - 1));
      if (isAfter(newStart, maxStart)) {
        setWeekStart(startOfDay(maxStart));
      } else {
        setWeekStart(newStart);
      }
    }
  }, [canGoNext, weekStart, daysToShow, tripEnd]);

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

      // Determine city from activity date
      const activityDate = format(startDate, 'yyyy-MM-dd');
      const city = getCityForDate(activityDate);
      // Normalize transit/multi-city labels to base city
      const normalizedCity = city.includes('Hong Kong') ? 'Hong Kong'
        : city.includes('Shanghai') ? 'Shanghai'
        : city.includes('Chengdu') ? 'Chengdu'
        : 'Hong Kong';

      // Create wishlist item from activity
      await createWishlistItem({
        trip_id: trip.id,
        name: activity.name,
        category: activity.category,
        city: normalizedCity,
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

  const handleWishlistItemClick = useCallback((item: WishlistItem) => {
    if (item.address) {
      setFocusWishlistItem(item);
      setViewMode('map');
    }
  }, []);

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
    <div className="flex flex-col h-screen bg-[#fffbf5] overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/80 backdrop-blur-sm px-4 py-1.5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ff6b6b] to-[#ff8fab] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-sm font-semibold text-gray-800">
              {trip.name}
            </h1>
            <div className="hidden md:flex items-center gap-1 text-[10px] ml-2">
              <span className="text-[#ff6b6b] font-medium">HK</span>
              <span className="text-gray-300">→</span>
              <span className="text-[#4d96ff] font-medium">Shanghai</span>
              <span className="text-gray-300">→</span>
              <span className="text-[#6bcb77] font-medium">Chengdu</span>
            </div>
          </div>

          {/* Right: View Toggle */}
          <div className="hidden md:flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#ff6b6b] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-[#4d96ff] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Day Picker - flex-shrink-0 to prevent scrolling */}
      <div className="flex-shrink-0">
        <MobileDayPicker
          days={allDays}
          currentDayIndex={mobileDayIndex}
          onDayChange={setMobileDayIndex}
        />
      </div>

      {/* Main content area with sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {viewMode === 'calendar' ? (
          /* Calendar View */
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Mobile hotel cards - fixed above scroll */}
              {isMobile && displayDays[0] && (() => {
                const currentDay = displayDays[0].dateStr;
                const currentDate = parseISO(currentDay);
                const dayHotels = hotels.filter((hotel) => {
                  const checkIn = parseISO(hotel.start_datetime.split('T')[0]);
                  const checkOut = parseISO(hotel.end_datetime.split('T')[0]);
                  return currentDate >= checkIn && currentDate < checkOut;
                });
                if (dayHotels.length === 0) return null;
                return (
                  <div className="flex-shrink-0 px-4 py-2 flex gap-2 bg-[#fffbf5] border-b border-gray-100">
                    {dayHotels.map((hotel) => (
                      <button
                        key={hotel.id}
                        onClick={() => handleFixedItemClick(hotel)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          background: 'rgba(107, 203, 119, 0.2)',
                          border: '1px solid rgba(107, 203, 119, 0.4)',
                          color: '#15803d',
                        }}
                      >
                        <span>🏨</span>
                        <span className="truncate">{hotel.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
          <div ref={gridContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
              {/* Unified sticky header - FixedItemsBar + Date headers */}
              <div className="hidden md:block sticky top-0 z-40 bg-[#fffbf5] px-4 pt-2 shadow-sm">
                <FixedItemsBar
                  flights={flights}
                  hotels={hotels}
                  weekDays={weekDays}
                  weekStart={weekStart}
                  onItemClick={handleFixedItemClick}
                />
                {/* Date headers row */}
                <div className="flex pb-2">
                  {/* Left spacer for time column */}
                  <div className="flex-shrink-0 w-[68px] flex items-center justify-center">
                    <button
                      onClick={handlePrevWeek}
                      disabled={!canGoPrev || startOfDay(weekStart).getTime() === startOfDay(tripStart).getTime()}
                      className="p-1.5 rounded-lg hover:bg-[#ff6b6b]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous week"
                    >
                      <svg className="w-5 h-5 text-[#ff6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                  {/* Day headers */}
                  {displayDays.map((day) => {
                    const isToday = day.dateStr === new Date().toISOString().split('T')[0];
                    return (
                      <div
                        key={day.dateStr}
                        className={`flex-1 min-w-0 flex flex-col items-center justify-center h-14 mx-1 rounded-xl ${
                          isToday
                            ? 'bg-gradient-to-br from-[#ff6b6b] to-[#ff8fab] text-white shadow-md'
                            : 'bg-white shadow-sm'
                        }`}
                      >
                        <span className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>
                          {format(day.date, 'MMM d')}
                        </span>
                        <span className={`text-xs ${isToday ? 'text-white/80' : 'text-gray-400'}`}>
                          {day.dayOfWeek}
                        </span>
                      </div>
                    );
                  })}
                  {/* Right nav */}
                  <div className="flex-shrink-0 w-10 flex items-center justify-center">
                    <button
                      onClick={handleNextWeek}
                      disabled={!canGoNext}
                      className="p-1.5 rounded-lg hover:bg-[#ff6b6b]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Next week"
                    >
                      <svg className="w-5 h-5 text-[#ff6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              {/* Calendar grid - just time slots */}
              <div className="flex px-4">
              <TimeColumn showHeader={false} />
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
                  showHeader={false}
                />
              ))}
              {/* Right spacer */}
              <div className="flex-shrink-0 w-10" />
            </div>
          </div>
          </div>
        ) : (
          /* Map View */
          <div className="flex-1 overflow-hidden">
            <MapView
              activities={activities}
              flights={flights}
              hotels={hotels}
              wishlistItems={wishlistItems}
              categories={categories}
              days={allDays}
              onActivityClick={handleActivityClick}
              onHotelClick={handleFixedItemClick}
              focusWishlistItem={focusWishlistItem}
              onFocusHandled={() => setFocusWishlistItem(null)}
            />
          </div>
        )}

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
        onItemClick={handleWishlistItemClick}
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
