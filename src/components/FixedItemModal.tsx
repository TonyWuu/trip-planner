'use client';

import { useState, useEffect } from 'react';
import { FixedItem, FlightDetails, HotelDetails } from '@/lib/types';
import { XMarkIcon, TrashIcon } from './Icons';

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
          start_datetime: new Date(flightForm.start_datetime).toISOString(),
          end_datetime: new Date(flightForm.end_datetime).toISOString(),
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
          start_datetime: new Date(hotelForm.start_datetime).toISOString(),
          end_datetime: new Date(hotelForm.end_datetime).toISOString(),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit {item.type === 'flight' ? 'Flight' : 'Hotel'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {item.type === 'flight' ? (
            <>
              {/* Flight Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={flightForm.name}
                  onChange={(e) => setFlightForm({ ...flightForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Flight Number
                  </label>
                  <input
                    type="text"
                    value={flightForm.flight_number}
                    onChange={(e) => setFlightForm({ ...flightForm, flight_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="CX 805"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Airline
                  </label>
                  <input
                    type="text"
                    value={flightForm.airline}
                    onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Cathay Pacific"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    From
                  </label>
                  <input
                    type="text"
                    value={flightForm.departure_city}
                    onChange={(e) => setFlightForm({ ...flightForm, departure_city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Toronto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    To
                  </label>
                  <input
                    type="text"
                    value={flightForm.arrival_city}
                    onChange={(e) => setFlightForm({ ...flightForm, arrival_city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Hong Kong"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departure Code
                  </label>
                  <input
                    type="text"
                    value={flightForm.departure_code}
                    onChange={(e) => setFlightForm({ ...flightForm, departure_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="YYZ"
                    maxLength={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Arrival Code
                  </label>
                  <input
                    type="text"
                    value={flightForm.arrival_code}
                    onChange={(e) => setFlightForm({ ...flightForm, arrival_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="HKG"
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departure Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={flightForm.start_datetime}
                    onChange={(e) => setFlightForm({ ...flightForm, start_datetime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Arrival Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={flightForm.end_datetime}
                    onChange={(e) => setFlightForm({ ...flightForm, end_datetime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Hotel Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hotel Name
                </label>
                <input
                  type="text"
                  required
                  value={hotelForm.name}
                  onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={hotelForm.city}
                  onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Hong Kong"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={hotelForm.address}
                  onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Example Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmation Number
                </label>
                <input
                  type="text"
                  value={hotelForm.confirmation}
                  onChange={(e) => setHotelForm({ ...hotelForm, confirmation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Check-in
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={hotelForm.start_datetime}
                    onChange={(e) => setHotelForm({ ...hotelForm, start_datetime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Check-out
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={hotelForm.end_datetime}
                    onChange={(e) => setHotelForm({ ...hotelForm, end_datetime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <TrashIcon className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
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
