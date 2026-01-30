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
    const { startCol, span } = getFixedItemSpan(item, weekStart, TRIP_START_DATE, TRIP_END_DATE);

    if (span === 0) return null;

    const isFlightType = type === 'flight';

    const leftPercent = (startCol / weekDays.length) * 100;
    const widthPercent = (span / weekDays.length) * 100;

    return (
      <div
        key={item.id}
        onClick={() => onItemClick(item)}
        className={`absolute h-7 rounded-lg flex items-center px-2.5 text-xs font-medium overflow-hidden cursor-pointer transition-all hover:shadow-md ${
          isFlightType
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
        }`}
        style={{
          left: `${leftPercent}%`,
          width: `calc(${widthPercent}% - 4px)`,
          marginLeft: '2px',
        }}
        title={`Click to edit: ${item.name}`}
      >
        {isFlightType ? (
          <PlaneIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
        ) : (
          <BuildingIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
        )}
        <span className="truncate font-semibold">{item.name}</span>
        {isFlightType && (
          <span className="ml-1.5 opacity-70 flex-shrink-0">{formatTime(item.start_datetime)}</span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Flights row */}
      <div className="relative h-9 ml-16">
        <div className="absolute inset-0 flex items-center px-0.5">
          {flights.map((flight) => renderBar(flight, 'flight'))}
        </div>
      </div>

      {/* Hotels row */}
      <div className="relative h-9 ml-16">
        <div className="absolute inset-0 flex items-center px-0.5">
          {hotels.map((hotel) => renderBar(hotel, 'hotel'))}
        </div>
      </div>
    </div>
  );
}
