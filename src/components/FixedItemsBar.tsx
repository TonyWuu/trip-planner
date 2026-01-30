'use client';

import { FixedItem, DayInfo } from '@/lib/types';
import { getFixedItemSpan, formatTime } from '@/lib/utils';
import { TRIP_START_DATE, TRIP_END_DATE } from '@/lib/constants';
import { PlaneIcon, BuildingIcon } from './Icons';

interface FixedItemsBarProps {
  flights: FixedItem[];
  hotels: FixedItem[];
  weekDays: DayInfo[];
  weekStart: Date;
  onItemClick: (item: FixedItem) => void;
}

export default function FixedItemsBar({ flights, hotels, weekDays, weekStart, onItemClick }: FixedItemsBarProps) {
  if (weekDays.length === 0) return null;

  const renderBar = (item: FixedItem, type: 'flight' | 'hotel') => {
    const { startCol, span } = getFixedItemSpan(item, weekStart, TRIP_START_DATE, TRIP_END_DATE, weekDays.length);

    if (span === 0) return null;

    const isFlightType = type === 'flight';

    const leftPercent = (startCol / weekDays.length) * 100;
    const widthPercent = (span / weekDays.length) * 100;

    return (
      <div
        key={item.id}
        onClick={() => onItemClick(item)}
        className="absolute h-5 rounded-md flex items-center px-2 text-[10px] font-semibold overflow-hidden cursor-pointer transition-colors hover:opacity-80"
        style={{
          left: `${leftPercent}%`,
          width: `calc(${widthPercent}% - 4px)`,
          marginLeft: '2px',
          background: isFlightType ? 'rgba(77, 150, 255, 0.15)' : 'rgba(107, 203, 119, 0.15)',
          border: `1px solid ${isFlightType ? 'rgba(77, 150, 255, 0.3)' : 'rgba(107, 203, 119, 0.3)'}`,
          color: isFlightType ? '#2563eb' : '#15803d',
        }}
        title={`${item.name}${isFlightType ? ` - ${formatTime(item.start_datetime)}` : ''}`}
      >
        <span className="mr-1 text-xs flex-shrink-0">{isFlightType ? '✈️' : '🏨'}</span>
        <span className="truncate">{item.name}</span>
      </div>
    );
  };

  return (
    <div
      className="mb-1 rounded-lg py-1 px-1"
      style={{
        background: 'rgba(255, 255, 255, 0.5)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Flights row */}
      <div className="relative h-6 ml-[68px] mr-10 overflow-hidden rounded">
        <div className="absolute inset-0 flex items-center">
          {flights.map((flight) => renderBar(flight, 'flight'))}
        </div>
      </div>

      {/* Hotels row */}
      <div className="relative h-6 ml-[68px] mr-10 overflow-hidden rounded">
        <div className="absolute inset-0 flex items-center">
          {hotels.map((hotel) => renderBar(hotel, 'hotel'))}
        </div>
      </div>
    </div>
  );
}
