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
        className={`absolute h-7 rounded-xl flex items-center px-3 text-xs font-medium overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] shadow-sm ${
          isFlightType
            ? 'bg-gradient-to-r from-blue-100 to-sky-50 text-blue-700'
            : 'bg-gradient-to-r from-emerald-100 to-teal-50 text-emerald-700'
        }`}
        style={{
          left: `${leftPercent}%`,
          width: `calc(${widthPercent}% - 6px)`,
          marginLeft: '3px',
        }}
        title={`Click to edit: ${item.name}`}
      >
        {isFlightType ? (
          <PlaneIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 opacity-80" style={{ transform: 'rotate(-45deg)' }} />
        ) : (
          <BuildingIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 opacity-80" />
        )}
        <span className="truncate font-semibold">{item.name}</span>
        {isFlightType && (
          <span className="ml-1.5 opacity-60 flex-shrink-0 text-[10px]">{formatTime(item.start_datetime)}</span>
        )}
      </div>
    );
  };

  return (
    <div className="mx-4 mb-2 rounded-2xl bg-white/50 backdrop-blur-sm p-2">
      {/* Flights row */}
      <div className="relative h-9 ml-14">
        <div className="absolute inset-0 flex items-center px-0.5">
          {flights.map((flight) => renderBar(flight, 'flight'))}
        </div>
      </div>

      {/* Hotels row */}
      <div className="relative h-9 ml-14">
        <div className="absolute inset-0 flex items-center px-0.5">
          {hotels.map((hotel) => renderBar(hotel, 'hotel'))}
        </div>
      </div>
    </div>
  );
}
