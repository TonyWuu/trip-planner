'use client';

import { FixedItem, DayInfo } from '@/lib/types';
import { getFixedItemSpan, formatTime } from '@/lib/utils';
import { TRIP_START_DATE, TRIP_END_DATE } from '@/lib/constants';
import { PlaneIcon, BuildingIcon } from './Icons';

// Distinct colors for different hotels
const HOTEL_COLORS = [
  { bg: 'rgba(107, 203, 119, 0.35)', border: 'rgba(107, 203, 119, 0.6)', text: '#15803d' }, // Green
  { bg: 'rgba(176, 136, 249, 0.35)', border: 'rgba(176, 136, 249, 0.6)', text: '#7c3aed' }, // Purple
  { bg: 'rgba(255, 143, 171, 0.35)', border: 'rgba(255, 143, 171, 0.6)', text: '#be185d' }, // Pink
  { bg: 'rgba(255, 207, 51, 0.35)', border: 'rgba(255, 207, 51, 0.6)', text: '#92400e' },  // Yellow
  { bg: 'rgba(20, 184, 166, 0.35)', border: 'rgba(20, 184, 166, 0.6)', text: '#0f766e' },  // Teal
  { bg: 'rgba(251, 146, 60, 0.35)', border: 'rgba(251, 146, 60, 0.6)', text: '#c2410c' },  // Orange
];

interface FixedItemsBarProps {
  flights: FixedItem[];
  hotels: FixedItem[];
  weekDays: DayInfo[];
  weekStart: Date;
  onItemClick: (item: FixedItem) => void;
}

// Calculate row assignments for overlapping items
function assignRows(items: FixedItem[], weekStart: Date, daysToShow: number): Map<string, number> {
  const rowAssignments = new Map<string, number>();
  const itemSpans: { id: string; startCol: number; endCol: number }[] = [];

  // Calculate spans for all items
  for (const item of items) {
    const { startCol, span } = getFixedItemSpan(item, weekStart, TRIP_START_DATE, TRIP_END_DATE, daysToShow);
    if (span > 0) {
      itemSpans.push({ id: item.id, startCol, endCol: startCol + span });
    }
  }

  // Sort by start column
  itemSpans.sort((a, b) => a.startCol - b.startCol);

  // Assign rows - track end column for each row
  const rowEnds: number[] = [];

  for (const item of itemSpans) {
    // Find first row where this item fits
    let assignedRow = -1;
    for (let row = 0; row < rowEnds.length; row++) {
      if (rowEnds[row] <= item.startCol) {
        assignedRow = row;
        break;
      }
    }

    if (assignedRow === -1) {
      // Need a new row
      assignedRow = rowEnds.length;
      rowEnds.push(item.endCol);
    } else {
      rowEnds[assignedRow] = item.endCol;
    }

    rowAssignments.set(item.id, assignedRow);
  }

  return rowAssignments;
}

export default function FixedItemsBar({ flights, hotels, weekDays, weekStart, onItemClick }: FixedItemsBarProps) {
  if (weekDays.length === 0) return null;

  // Calculate row assignments for flights and hotels
  const flightRows = assignRows(flights, weekStart, weekDays.length);
  const maxFlightRows = Math.max(1, ...Array.from(flightRows.values()).map(r => r + 1));
  const hotelRows = assignRows(hotels, weekStart, weekDays.length);
  const maxHotelRows = Math.max(1, ...Array.from(hotelRows.values()).map(r => r + 1));

  const renderBar = (item: FixedItem, type: 'flight' | 'hotel', index: number = 0, row: number = 0) => {
    const { startCol, span } = getFixedItemSpan(item, weekStart, TRIP_START_DATE, TRIP_END_DATE, weekDays.length);

    if (span === 0) return null;

    const isFlightType = type === 'flight';
    const hotelColor = HOTEL_COLORS[index % HOTEL_COLORS.length];

    const leftPercent = (startCol / weekDays.length) * 100;
    const widthPercent = (span / weekDays.length) * 100;
    const rowHeight = 22;
    const topOffset = row * rowHeight;

    return (
      <div
        key={item.id}
        onClick={() => onItemClick(item)}
        className="absolute h-5 rounded-md flex items-center px-2 text-[10px] font-semibold overflow-hidden cursor-pointer transition-colors hover:opacity-80"
        style={{
          left: `${leftPercent}%`,
          width: `calc(${widthPercent}% - 4px)`,
          marginLeft: '2px',
          top: `${topOffset}px`,
          background: isFlightType ? 'rgba(77, 150, 255, 0.15)' : hotelColor.bg,
          border: `1px solid ${isFlightType ? 'rgba(77, 150, 255, 0.3)' : hotelColor.border}`,
          color: isFlightType ? '#2563eb' : hotelColor.text,
        }}
        title={`${item.name}${isFlightType ? ` - ${formatTime(item.start_datetime)}` : ''}`}
      >
        <span className="mr-1 text-xs flex-shrink-0">{isFlightType ? '✈️' : '🏨'}</span>
        <span className="truncate">{item.name}</span>
      </div>
    );
  };

  const flightRowHeight = maxFlightRows * 22 + 4;
  const hotelRowHeight = maxHotelRows * 22 + 4;

  return (
    <div
      className="mb-1 rounded-lg py-1 px-1"
      style={{
        background: 'rgba(255, 255, 255, 0.5)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Flights row - height adjusts based on overlapping flights */}
      <div className="relative ml-[68px] mr-10 overflow-hidden rounded" style={{ height: `${flightRowHeight}px` }}>
        <div className="absolute inset-0">
          {flights.map((flight) => {
            const row = flightRows.get(flight.id) ?? 0;
            return renderBar(flight, 'flight', 0, row);
          })}
        </div>
      </div>

      {/* Hotels rows */}
      <div className="relative ml-[68px] mr-10 overflow-hidden rounded" style={{ height: `${hotelRowHeight}px` }}>
        <div className="absolute inset-0">
          {hotels.map((hotel, index) => {
            const row = hotelRows.get(hotel.id) ?? 0;
            return renderBar(hotel, 'hotel', index, row);
          })}
        </div>
      </div>
    </div>
  );
}
