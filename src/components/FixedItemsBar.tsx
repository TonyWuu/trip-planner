'use client';

import { FixedItem, DayInfo, FlightDetails, HotelDetails } from '@/lib/types';
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
    const bgColor = isFlightType ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600';
    const Icon = isFlightType ? PlaneIcon : BuildingIcon;

    // Calculate position and width based on visible columns
    const leftPercent = (startCol / weekDays.length) * 100;
    const widthPercent = (span / weekDays.length) * 100;

    return (
      <div
        key={item.id}
        onClick={() => onItemClick(item)}
        className={`absolute h-6 ${bgColor} rounded-md flex items-center px-2 text-white text-xs font-medium overflow-hidden shadow-sm cursor-pointer transition-colors`}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
        }}
        title={`Click to edit: ${item.name}`}
      >
        <Icon className="w-3 h-3 mr-1 flex-shrink-0" />
        <span className="truncate">
          {item.name}
          {isFlightType && (
            <span className="ml-1 opacity-75">
              {formatTime(item.start_datetime)}
            </span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Flights row */}
      <div className="relative h-8 ml-16">
        <div className="absolute inset-0 flex items-center">
          {flights.map((flight) => renderBar(flight, 'flight'))}
        </div>
      </div>

      {/* Hotels row */}
      <div className="relative h-8 ml-16 border-t border-gray-200 dark:border-gray-700">
        <div className="absolute inset-0 flex items-center">
          {hotels.map((hotel) => renderBar(hotel, 'hotel'))}
        </div>
      </div>
    </div>
  );
}
