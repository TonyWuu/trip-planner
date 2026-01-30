'use client';

import { useState, useEffect } from 'react';
import { Activity, ActivityFormData, Category, ModalMode } from '@/lib/types';
import { CURRENCIES } from '@/lib/constants';
import { getMapsUrl } from '@/lib/utils';
import { createCategory, deleteCategory } from '@/lib/supabase';
import { XMarkIcon, TrashIcon, MapPinIcon, PlusIcon } from './Icons';
import ConfirmModal from './ConfirmModal';

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
  onCategoryCreated?: (category: Category) => void;
  onCategoryDeleted?: (id: string) => void;
  tripId: string;
}

// Available colors for new categories
const CATEGORY_COLORS = [
  '#3B82F6', // blue
  '#22C55E', // green
  '#F97316', // orange
  '#A855F7', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F59E0B', // amber
  '#EF4444', // red
];

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
  onCategoryCreated,
  onCategoryDeleted,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);

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

  // Initialize form data when activity changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && activity) {
      setFormData({
        name: activity.name,
        category: activity.category,
        start_datetime: activity.start_datetime.slice(0, 16),
        end_datetime: activity.end_datetime.slice(0, 16),
        address: activity.address || '',
        notes: activity.notes || '',
        booking_reference: '',
        cost_amount: activity.cost_amount?.toString() || '',
        cost_currency: activity.cost_currency || 'HKD',
        links: activity.links?.join('\n') || '',
      });
    }
  }, [mode, activity]);

  // Initialize form data for create mode
  useEffect(() => {
    if (mode === 'create' && initialDateTime) {
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
  }, [mode, initialDateTime]);

  // Reset category UI when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowNewCategory(false);
      setNewCategoryName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const activityData = {
      trip_id: tripId,
      name: formData.name,
      category: formData.category,
      start_datetime: formData.start_datetime,
      end_datetime: formData.end_datetime,
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

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!activity) return;

    setDeleting(true);
    setShowDeleteConfirm(false);
    try {
      await onDelete(activity.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    const newCategory = await createCategory({
      trip_id: tripId,
      name: newCategoryName.trim(),
      color: newCategoryColor,
    });

    if (newCategory) {
      onCategoryCreated?.(newCategory);
      setFormData({ ...formData, category: newCategory.name });
      setShowNewCategory(false);
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    if (!confirm(`Delete "${cat.name}" category?`)) return;

    const success = await deleteCategory(cat.id);
    if (success) {
      onCategoryDeleted?.(cat.id);
      // If the deleted category was selected, switch to first available
      if (formData.category === cat.name && categories.length > 1) {
        const remaining = categories.filter((c) => c.id !== cat.id);
        setFormData({ ...formData, category: remaining[0]?.name || 'Activity' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-purple-900/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl animate-slideUp border border-purple-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-100" style={{ backgroundColor: '#f3e8ff' }}>
          <h2 className="text-lg font-bold" style={{ color: '#7c3aed' }}>
            {mode === 'create' ? 'New Activity' : 'Edit Activity'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-purple-200/50 transition-colors"
            style={{ color: '#7c3aed' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-5 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Activity Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl bg-purple-50/30 text-gray-700 placeholder:text-gray-400 focus:border-purple-400 transition-all"
                placeholder="e.g., Dim Sum at Tim Ho Wan"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Category *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.name })}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        formData.category === cat.name
                          ? 'text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={
                        formData.category === cat.name
                          ? { backgroundColor: cat.color }
                          : undefined
                      }
                    >
                      {cat.name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCategory(e, cat)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600"
                      title={`Delete ${cat.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 border-dashed ${
                    showNewCategory
                      ? 'border-purple-400 bg-purple-50 text-purple-600'
                      : 'border-gray-300 text-gray-500 hover:border-purple-300 hover:text-purple-500'
                  }`}
                >
                  <PlusIcon className="w-4 h-4 mx-auto" />
                </button>
              </div>

              {/* New Category Form */}
              {showNewCategory && (
                <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg bg-white text-gray-700 placeholder:text-gray-400 focus:border-purple-400 text-sm"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Color:</span>
                    <div className="flex gap-1">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategoryColor(color)}
                          className={`w-6 h-6 rounded-full transition-all ${
                            newCategoryColor === color ? 'ring-2 ring-offset-1 ring-purple-400 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    className="mt-2 w-full px-3 py-1.5 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Category
                  </button>
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_datetime.split('T')[0] || ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    const startTime = formData.start_datetime.split('T')[1] || '09:00';
                    const endTime = formData.end_datetime.split('T')[1] || '10:00';
                    setFormData({
                      ...formData,
                      start_datetime: `${date}T${startTime}`,
                      end_datetime: `${date}T${endTime}`,
                    });
                  }}
                  className="w-full px-3 py-2.5 border border-purple-200 rounded-xl bg-white text-gray-700 focus:border-purple-400 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Start *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_datetime.split('T')[1] || ''}
                    onChange={(e) => {
                      const date = formData.start_datetime.split('T')[0] || '';
                      setFormData({ ...formData, start_datetime: `${date}T${e.target.value}` });
                    }}
                    className="w-full px-3 py-2.5 border border-purple-200 rounded-xl bg-white text-gray-700 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    End *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.end_datetime.split('T')[1] || ''}
                    onChange={(e) => {
                      const date = formData.end_datetime.split('T')[0] || '';
                      setFormData({ ...formData, end_datetime: `${date}T${e.target.value}` });
                    }}
                    className="w-full px-3 py-2.5 border border-purple-200 rounded-xl bg-white text-gray-700 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-purple-200 rounded-xl bg-purple-50/30 text-gray-700 placeholder:text-gray-400 focus:border-purple-400 transition-all"
                  placeholder="123 Example Street"
                />
                {formData.address && (
                  <a
                    href={getMapsUrl(formData.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-purple-500 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                  >
                    <MapPinIcon className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl bg-purple-50/30 text-gray-700 placeholder:text-gray-400 focus:border-purple-400 transition-all resize-none"
                placeholder="Additional notes..."
              />
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Cost
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_amount}
                  onChange={(e) => setFormData({ ...formData, cost_amount: e.target.value })}
                  className="flex-1 px-4 py-3 border border-purple-200 rounded-xl bg-purple-50/30 text-gray-700 placeholder:text-gray-400 focus:border-purple-400 transition-all"
                  placeholder="0.00"
                />
                <select
                  value={formData.cost_currency}
                  onChange={(e) => setFormData({ ...formData, cost_currency: e.target.value })}
                  className="w-24 px-3 py-3 border border-purple-200 rounded-xl bg-white text-gray-700 focus:border-purple-400 transition-all"
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
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Links (one per line)
              </label>
              <textarea
                value={formData.links}
                onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl bg-purple-50/30 text-gray-700 placeholder:text-gray-400 focus:border-purple-400 transition-all resize-none"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 flex items-center justify-between p-5 bg-purple-50/80 backdrop-blur-sm border-t border-purple-100">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
              >
                <TrashIcon className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            ) : (
              <div />
            )}
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
                style={{ backgroundColor: '#c4b5fd', color: '#6b21a8' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Activity"
        message={`Are you sure you want to delete "${activity?.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
