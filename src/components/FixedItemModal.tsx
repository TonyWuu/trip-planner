'use client';

import { useState, useEffect } from 'react';
import { FixedItem, FlightDetails, HotelDetails } from '@/lib/types';
import { XMarkIcon, TrashIcon, PlaneIcon, BuildingIcon } from './Icons';

interface FixedItemModalProps {
  isOpen: boolean;
  item: FixedItem | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<FixedItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface FlightFormData {
  name: string;
  start_datetime: string;
  end_datetime: string;
  flight_number: string;
  airline: string;
  departure_city: string;
  arrival_city: string;
  departure_code: string;
  arrival_code: string;
}

interface HotelFormData {
  name: string;
  start_datetime: string;
  end_datetime: string;
  address: string;
  city: string;
  confirmation: string;
}

export default function FixedItemModal({
  isOpen,
  item,
  onClose,
  onUpdate,
  onDelete,
}: FixedItemModalProps) {
  const [flightForm, setFlightForm] = useState<FlightFormData>({
    name: '',
    start_datetime: '',
    end_datetime: '',
    flight_number: '',
    airline: '',
    departure_city: '',
    arrival_city: '',
    departure_code: '',
    arrival_code: '',
  });

  const [hotelForm, setHotelForm] = useState<HotelFormData>({
    name: '',
    start_datetime: '',
    end_datetime: '',
    address: '',
    city: '',
    confirmation: '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Handle ESC key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (item) {
      if (item.type === 'flight') {
        const details = item.details as FlightDetails | null;
        setFlightForm({
          name: item.name,
          start_datetime: item.start_datetime.slice(0, 16),
          end_datetime: item.end_datetime.slice(0, 16),
          flight_number: details?.flight_number || '',
          airline: details?.airline || '',
          departure_city: details?.departure_city || '',
          arrival_city: details?.arrival_city || '',
          departure_code: details?.departure_code || '',
          arrival_code: details?.arrival_code || '',
        });
      } else {
        const details = item.details as HotelDetails | null;
        setHotelForm({
          name: item.name,
          start_datetime: item.start_datetime.slice(0, 16),
          end_datetime: item.end_datetime.slice(0, 16),
          address: details?.address || '',
          city: details?.city || '',
          confirmation: details?.confirmation || '',
        });
      }
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (item.type === 'flight') {
        await onUpdate(item.id, {
          name: flightForm.name,
          start_datetime: flightForm.start_datetime,
          end_datetime: flightForm.end_datetime,
          details: {
            flight_number: flightForm.flight_number,
            airline: flightForm.airline,
            departure_city: flightForm.departure_city,
            arrival_city: flightForm.arrival_city,
            departure_code: flightForm.departure_code,
            arrival_code: flightForm.arrival_code,
          },
        });
      } else {
        await onUpdate(item.id, {
          name: hotelForm.name,
          start_datetime: hotelForm.start_datetime,
          end_datetime: hotelForm.end_datetime,
          details: {
            address: hotelForm.address,
            city: hotelForm.city,
            confirmation: hotelForm.confirmation,
          },
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this ${item.type}?`)) return;

    setDeleting(true);
    try {
      await onDelete(item.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const isFlight = item.type === 'flight';
  const headerBg = isFlight ? '#dbeafe' : '#dcfce7';
  const headerText = isFlight ? '#1e40af' : '#166534';
  const buttonBg = isFlight ? '#bfdbfe' : '#bbf7d0';
  const borderColor = isFlight ? '#bfdbfe' : '#bbf7d0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-purple-900/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl animate-slideUp" style={{ borderColor, borderWidth: '2px' }}>
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-3">
            {isFlight ? (
              <PlaneIcon className="w-5 h-5" style={{ color: headerText }} />
            ) : (
              <BuildingIcon className="w-5 h-5" style={{ color: headerText }} />
            )}
            <h2 className="text-lg font-bold" style={{ color: headerText }}>
              Edit {isFlight ? 'Flight' : 'Hotel'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
            style={{ color: headerText }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-5 space-y-5">
            {item.type === 'flight' ? (
              <>
                {/* Flight Form */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={flightForm.name}
                    onChange={(e) => setFlightForm({ ...flightForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-blue-50/30 text-gray-700 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Flight Number
                    </label>
                    <input
                      type="text"
                      value={flightForm.flight_number}
                      onChange={(e) => setFlightForm({ ...flightForm, flight_number: e.target.value })}
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-blue-50/30 text-gray-700 focus:border-blue-400 transition-all"
                      placeholder="CX 805"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Airline
                    </label>
                    <input
                      type="text"
                      value={flightForm.airline}
                      onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })}
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-blue-50/30 text-gray-700 focus:border-blue-400 transition-all"
                      placeholder="Cathay Pacific"
                    />
                  </div>
                </div>

                {/* Route visualization */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-blue-600 mb-1.5 uppercase tracking-wide">
                        From
                      </label>
                      <input
                        type="text"
                        value={flightForm.departure_city}
                        onChange={(e) => setFlightForm({ ...flightForm, departure_city: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white text-gray-700 focus:border-blue-400 transition-all"
                        placeholder="Toronto"
                      />
                      <input
                        type="text"
                        value={flightForm.departure_code}
                        onChange={(e) => setFlightForm({ ...flightForm, departure_code: e.target.value.toUpperCase() })}
                        className="w-full mt-2 px-3 py-2 text-sm font-bold border border-blue-200 rounded-lg bg-white text-gray-700 focus:border-blue-400 transition-all"
                        placeholder="YYZ"
                        maxLength={3}
                      />
                    </div>
                    <div className="flex-shrink-0 text-blue-400">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-indigo-600 mb-1.5 uppercase tracking-wide">
                        To
                      </label>
                      <input
                        type="text"
                        value={flightForm.arrival_city}
                        onChange={(e) => setFlightForm({ ...flightForm, arrival_city: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white text-gray-700 focus:border-indigo-400 transition-all"
                        placeholder="Hong Kong"
                      />
                      <input
                        type="text"
                        value={flightForm.arrival_code}
                        onChange={(e) => setFlightForm({ ...flightForm, arrival_code: e.target.value.toUpperCase() })}
                        className="w-full mt-2 px-3 py-2 text-sm font-bold border border-indigo-200 rounded-lg bg-white text-gray-700 focus:border-indigo-400 transition-all"
                        placeholder="HKG"
                        maxLength={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Departure Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={flightForm.start_datetime}
                      onChange={(e) => setFlightForm({ ...flightForm, start_datetime: e.target.value })}
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-white text-gray-700 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Arrival Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={flightForm.end_datetime}
                      onChange={(e) => setFlightForm({ ...flightForm, end_datetime: e.target.value })}
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-white text-gray-700 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Hotel Form */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Hotel Name
                  </label>
                  <input
                    type="text"
                    required
                    value={hotelForm.name}
                    onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-green-200 rounded-xl bg-green-50/30 text-gray-700 focus:border-green-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={hotelForm.city}
                    onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })}
                    className="w-full px-4 py-3 border border-green-200 rounded-xl bg-green-50/30 text-gray-700 placeholder:text-gray-400 focus:border-green-400 transition-all"
                    placeholder="Hong Kong"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={hotelForm.address}
                    onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                    className="w-full px-4 py-3 border border-green-200 rounded-xl bg-green-50/30 text-gray-700 placeholder:text-gray-400 focus:border-green-400 transition-all"
                    placeholder="123 Example Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Confirmation Number
                  </label>
                  <input
                    type="text"
                    value={hotelForm.confirmation}
                    onChange={(e) => setHotelForm({ ...hotelForm, confirmation: e.target.value })}
                    className="w-full px-4 py-3 border border-green-200 rounded-xl bg-green-50/30 text-gray-700 placeholder:text-gray-400 focus:border-green-400 transition-all"
                    placeholder="Booking reference"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Check-in
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={hotelForm.start_datetime}
                      onChange={(e) => setHotelForm({ ...hotelForm, start_datetime: e.target.value })}
                      className="w-full px-4 py-3 border border-green-200 rounded-xl bg-white text-gray-700 focus:border-green-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Check-out
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={hotelForm.end_datetime}
                      onChange={(e) => setHotelForm({ ...hotelForm, end_datetime: e.target.value })}
                      className="w-full px-4 py-3 border border-green-200 rounded-xl bg-white text-gray-700 focus:border-green-400 transition-all"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 flex items-center justify-between p-5 bg-gray-50/80 backdrop-blur-sm border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
            >
              <TrashIcon className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                style={{ backgroundColor: buttonBg, color: headerText }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
