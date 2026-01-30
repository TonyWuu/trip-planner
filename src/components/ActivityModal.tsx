'use client';

import { useState, useEffect } from 'react';
import { Activity, ActivityFormData, Category, ModalMode } from '@/lib/types';
import { CURRENCIES } from '@/lib/constants';
import { getMapsUrl } from '@/lib/utils';
import { XMarkIcon, TrashIcon, MapPinIcon, LinkIcon } from './Icons';

interface ActivityModalProps {
  isOpen: boolean;
  mode: ModalMode;
  activity?: Activity | null;
  categories: Category[];
  initialDateTime: { date: string; hour: number; minute: number } | null;
  onClose: () => void;
  onSave: (data: Omit<Activity, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Activity>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  tripId: string;
}

export default function ActivityModal({
  isOpen,
  mode,
  activity,
  categories,
  initialDateTime,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  tripId,
}: ActivityModalProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    name: '',
    category: 'Activity',
    start_datetime: '',
    end_datetime: '',
    address: '',
    notes: '',
    booking_reference: '',
    cost_amount: '',
    cost_currency: 'HKD',
    links: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && activity) {
      setFormData({
        name: activity.name,
        category: activity.category,
        start_datetime: activity.start_datetime.slice(0, 16),
        end_datetime: activity.end_datetime.slice(0, 16),
        address: activity.address || '',
        notes: activity.notes || '',
        booking_reference: activity.booking_reference || '',
        cost_amount: activity.cost_amount?.toString() || '',
        cost_currency: activity.cost_currency || 'HKD',
        links: activity.links?.join('\n') || '',
      });
    } else if (mode === 'create' && initialDateTime) {
      const { date, hour, minute } = initialDateTime;
      const startTime = `${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const endHour = hour + 1;
      const endTime = `${date}T${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      setFormData({
        name: '',
        category: 'Activity',
        start_datetime: startTime,
        end_datetime: endTime,
        address: '',
        notes: '',
        booking_reference: '',
        cost_amount: '',
        cost_currency: 'HKD',
        links: '',
      });
    }
  }, [mode, activity, initialDateTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const activityData = {
      trip_id: tripId,
      name: formData.name,
      category: formData.category,
      start_datetime: new Date(formData.start_datetime).toISOString(),
      end_datetime: new Date(formData.end_datetime).toISOString(),
      address: formData.address || null,
      notes: formData.notes || null,
      booking_reference: formData.booking_reference || null,
      cost_amount: formData.cost_amount ? parseFloat(formData.cost_amount) : null,
      cost_currency: formData.cost_amount ? formData.cost_currency : null,
      links: formData.links ? formData.links.split('\n').filter((l) => l.trim()) : null,
    };

    try {
      if (mode === 'edit' && activity) {
        await onUpdate(activity.id, activityData);
      } else {
        await onSave(activityData);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activity || !confirm('Are you sure you want to delete this activity?')) return;

    setDeleting(true);
    try {
      await onDelete(activity.id);
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
            {mode === 'create' ? 'Add Activity' : 'Edit Activity'}
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
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Dim Sum at Tim Ho Wan"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.start_datetime}
                onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.end_datetime}
                onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Example Street"
              />
              {formData.address && (
                <a
                  href={getMapsUrl(formData.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-500 hover:text-blue-600"
                >
                  <MapPinIcon className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Additional notes..."
            />
          </div>

          {/* Booking Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Booking Reference
            </label>
            <input
              type="text"
              value={formData.booking_reference}
              onChange={(e) => setFormData({ ...formData, booking_reference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirmation number"
            />
          </div>

          {/* Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cost
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={formData.cost_amount}
                onChange={(e) => setFormData({ ...formData, cost_amount: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              <select
                value={formData.cost_currency}
                onChange={(e) => setFormData({ ...formData, cost_currency: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Links (one per line)
            </label>
            <textarea
              value={formData.links}
              onChange={(e) => setFormData({ ...formData, links: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="https://example.com"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <TrashIcon className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <div className={`flex gap-2 ${mode === 'create' ? 'ml-auto' : ''}`}>
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
