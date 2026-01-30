'use client';

import { FixedItem } from '@/lib/types';
import { formatTimeWithEst, getFlightSpan } from '@/lib/utils';
import { PlaneIcon } from './Icons';

interface FlightCellProps {
  flight: FixedItem;
  onClick?: () => void;
  daySpan?: number;
  isContinuation?: boolean;
}

export default function FlightCell({ flight, onClick, daySpan, isContinuation = false }: FlightCellProps) {
  // Use daySpan if provided (for multi-day flights), otherwise use full span
  const span = daySpan ?? getFlightSpan(flight);
  const heightPx = span * 40;

  const details = flight.details as {
    flight_number?: string;
    departure_city?: string;
    arrival_city?: string;
    departure_code?: string;
    arrival_code?: string;
  } | undefined;

  const isFromToronto = details?.departure_city?.toLowerCase().includes('toronto');
  const departureTime = formatTimeWithEst(flight.start_datetime, isFromToronto);
  const arrivalTime = formatTimeWithEst(flight.end_datetime, false);

  return (
    <div
      onClick={onClick}
      className="absolute left-0 right-0 mx-1 rounded-lg overflow-hidden z-10 cursor-pointer transition-all duration-150 ease-out hover:shadow-md hover:z-20 bg-gradient-to-r from-sky-100 to-blue-100 border border-sky-200"
      style={{
        height: `${heightPx - 2}px`,
        top: '0px',
      }}
    >
      <div className="p-1.5 h-full flex flex-col">
        <div className="flex items-center gap-1 text-sky-700">
          <PlaneIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" style={{ transform: 'rotate(-45deg)' }} />
          <p className="text-xs font-semibold truncate leading-tight">
            {isContinuation ? '↳ ' : ''}{details?.flight_number || flight.name}
          </p>
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-sky-600">
          <span className="text-[10px] font-medium">
            {details?.departure_code} → {details?.arrival_code}
          </span>
          {isContinuation && (
            <span className="text-[9px] opacity-60">(cont&apos;d)</span>
          )}
        </div>
        {span > 1 && !isContinuation && (
          <p className="text-[10px] truncate mt-0.5 opacity-75 text-sky-600">
            {departureTime}
          </p>
        )}
        {span > 1 && isContinuation && (
          <p className="text-[10px] truncate mt-0.5 opacity-75 text-sky-600">
            Arrives: {arrivalTime}
          </p>
        )}
        {span > 2 && !isContinuation && (
          <p className="text-[10px] truncate mt-0.5 opacity-60 text-sky-600">
            Arrives: {arrivalTime}
          </p>
        )}
      </div>
    </div>
  );
}
