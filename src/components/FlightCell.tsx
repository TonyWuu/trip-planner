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
      className="absolute left-0 right-0 mx-1 rounded-xl overflow-hidden z-10 cursor-pointer"
      style={{
        height: `${heightPx - 2}px`,
        top: '0px',
        background: 'linear-gradient(145deg, rgba(77, 150, 255, 0.15), rgba(107, 179, 255, 0.25))',
        border: '2px solid rgba(77, 150, 255, 0.3)',
        boxShadow: '0 2px 8px rgba(77, 150, 255, 0.15)',
      }}
    >
      <div className="p-2 h-full flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-base">✈️</span>
          <p
            className="text-xs font-bold truncate leading-tight"
            style={{ color: '#2563eb', fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
          >
            {isContinuation ? '↳ ' : ''}{details?.flight_number || flight.name}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-1" style={{ color: '#3b82f6' }}>
          <span className="text-[10px] font-bold">
            {details?.departure_code} → {details?.arrival_code}
          </span>
          {isContinuation && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#4d96ff]/20 font-medium">cont&apos;d</span>
          )}
        </div>
        {span > 1 && !isContinuation && (
          <p className="text-[10px] truncate mt-1 opacity-70 font-medium" style={{ color: '#2563eb' }}>
            🛫 {departureTime}
          </p>
        )}
        {span > 1 && isContinuation && (
          <p className="text-[10px] truncate mt-1 opacity-70 font-medium" style={{ color: '#2563eb' }}>
            🛬 Arrives: {arrivalTime}
          </p>
        )}
        {span > 2 && !isContinuation && (
          <p className="text-[10px] truncate mt-0.5 opacity-50 font-medium" style={{ color: '#2563eb' }}>
            🛬 Arrives: {arrivalTime}
          </p>
        )}
      </div>
    </div>
  );
}
