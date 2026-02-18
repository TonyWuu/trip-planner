'use client';

import { useState, useEffect } from 'react';
import { Activity, ActivityFormData, Category, ModalMode } from '@/lib/types';
import { TRIP_YEAR } from '@/lib/constants';
import { getMapsUrl } from '@/lib/utils';
import { createCategory, deleteCategory } from '@/lib/supabase';
import { XMarkIcon, TrashIcon, PlusIcon, getCategoryIcon, LinkIcon } from './Icons';
import ConfirmModal from './ConfirmModal';
import AddressAutocomplete from './AddressAutocomplete';

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
    links: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [newLinkInput, setNewLinkInput] = useState('');

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
        links: '',
      });
    }
  }, [mode, initialDateTime]);

  // Reset category UI when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowNewCategory(false);
      setNewCategoryName('');
      setNewLinkInput('');
    }
  }, [isOpen]);

  // Helper to get links as array
  const getLinksArray = (): string[] => {
    return formData.links ? formData.links.split('\n').filter((l) => l.trim()) : [];
  };

  // Add a new link
  const handleAddLink = () => {
    const trimmedLink = newLinkInput.trim();
    if (!trimmedLink) return;

    // Add https:// if no protocol specified
    const linkToAdd = trimmedLink.match(/^https?:\/\//) ? trimmedLink : `https://${trimmedLink}`;

    const currentLinks = getLinksArray();
    if (!currentLinks.includes(linkToAdd)) {
      setFormData({ ...formData, links: [...currentLinks, linkToAdd].join('\n') });
    }
    setNewLinkInput('');
  };

  // Remove a link
  const handleRemoveLink = (linkToRemove: string) => {
    const currentLinks = getLinksArray();
    setFormData({ ...formData, links: currentLinks.filter((l) => l !== linkToRemove).join('\n') });
  };

  // Get display name for a link (domain or shortened URL)
  const getLinkDisplayName = (url: string): string => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  };

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
      {/* Backdrop - playful with subtle pattern */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255, 107, 107, 0.15), transparent 50%), radial-gradient(circle at 70% 70%, rgba(77, 150, 255, 0.15), transparent 50%), rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-hidden rounded-xl shadow-2xl animate-slideUp"
        style={{
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.08), rgba(255, 143, 171, 0.08))',
            borderBottom: '1px solid rgba(255, 107, 107, 0.15)',
          }}
        >
          <h2 className="text-sm font-bold" style={{ color: '#ff6b6b' }}>
            {mode === 'create' ? 'New Activity' : 'Edit Activity'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#ff6b6b]/10 transition-colors"
            style={{ color: '#ff6b6b' }}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative overflow-y-auto overflow-x-hidden max-h-[calc(85vh-90px)]">
          <div className="p-4 space-y-3">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40 focus:ring-1 focus:ring-[#ff6b6b]/20 transition-colors"
                placeholder="e.g., Dim Sum at Tim Ho Wan"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Category *</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const CategoryIcon = getCategoryIcon(cat.name);
                  const isSelected = formData.category === cat.name;
                  return (
                  <div key={cat.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.name })}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected ? 'text-white shadow-sm' : 'text-gray-600 hover:opacity-80'
                      }`}
                      style={{
                        background: isSelected ? cat.color : `${cat.color}15`,
                        border: `1.5px solid ${isSelected ? 'transparent' : cat.color + '30'}`,
                      }}
                    >
                      <CategoryIcon className="w-3 h-3 flex-shrink-0" />
                      <span>{cat.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCategory(e, cat)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff6b6b] text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[10px] font-bold shadow-sm"
                      title={`Delete ${cat.name}`}
                    >
                      ×
                    </button>
                  </div>
                );
                })}
                <button
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all border-2 border-dashed ${
                    showNewCategory
                      ? 'border-[#ff6b6b] bg-[#ff6b6b]/10 text-[#ff6b6b]'
                      : 'border-gray-300 text-gray-400 hover:border-[#ff6b6b] hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/5'
                  }`}
                >
                  <PlusIcon className="w-3.5 h-3.5 mx-auto" />
                </button>
              </div>

              {/* New Category Form */}
              {showNewCategory && (
                <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="flex-1 h-8 px-3 rounded-lg text-sm bg-white border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim()}
                      className="h-8 px-4 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                      style={{ background: '#ff6b6b' }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCategoryColor(color)}
                        className={`w-5 h-5 rounded-full transition-transform ${newCategoryColor === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* When - Date & Time combined */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">When *</label>
              <div className="flex items-center gap-2">
                <div className="flex">
                  <select
                    required
                    value={formData.start_datetime.split('T')[0]?.split('-')[1] || ''}
                    onChange={(e) => {
                      const currentDate = formData.start_datetime.split('T')[0] || `${TRIP_YEAR}-01-01`;
                      const [, , day] = currentDate.split('-');
                      const newDate = `${TRIP_YEAR}-${e.target.value}-${day}`;
                      const startTime = formData.start_datetime.split('T')[1] || '09:00';
                      const endTime = formData.end_datetime.split('T')[1] || '10:00';
                      setFormData({
                        ...formData,
                        start_datetime: `${newDate}T${startTime}`,
                        end_datetime: `${newDate}T${endTime}`,
                      });
                    }}
                    className="h-9 px-3 rounded-l-lg text-sm text-gray-700 bg-gray-50 border border-r-0 border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40"
                  >
                    <option value="01">Jan</option>
                    <option value="02">Feb</option>
                    <option value="03">Mar</option>
                    <option value="04">Apr</option>
                    <option value="05">May</option>
                    <option value="06">Jun</option>
                    <option value="07">Jul</option>
                    <option value="08">Aug</option>
                    <option value="09">Sep</option>
                    <option value="10">Oct</option>
                    <option value="11">Nov</option>
                    <option value="12">Dec</option>
                  </select>
                  <select
                    required
                    value={formData.start_datetime.split('T')[0]?.split('-')[2] || ''}
                    onChange={(e) => {
                      const currentDate = formData.start_datetime.split('T')[0] || `${TRIP_YEAR}-01-01`;
                      const [, month] = currentDate.split('-');
                      const newDate = `${TRIP_YEAR}-${month}-${e.target.value}`;
                      const startTime = formData.start_datetime.split('T')[1] || '09:00';
                      const endTime = formData.end_datetime.split('T')[1] || '10:00';
                      setFormData({
                        ...formData,
                        start_datetime: `${newDate}T${startTime}`,
                        end_datetime: `${newDate}T${endTime}`,
                      });
                    }}
                    className="h-9 w-16 px-2 rounded-r-lg text-sm text-gray-700 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={String(day).padStart(2, '0')}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    required
                    value={formData.start_datetime.split('T')[1] || ''}
                    onChange={(e) => {
                      const date = formData.start_datetime.split('T')[0] || '';
                      setFormData({ ...formData, start_datetime: `${date}T${e.target.value}` });
                    }}
                    className="h-9 flex-1 min-w-0 px-3 rounded-lg text-sm text-gray-700 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40"
                  />
                  <span className="text-gray-400 text-sm font-medium">→</span>
                  <input
                    type="time"
                    required
                    value={formData.end_datetime.split('T')[1] || ''}
                    onChange={(e) => {
                      const date = formData.end_datetime.split('T')[0] || '';
                      setFormData({ ...formData, end_datetime: `${date}T${e.target.value}` });
                    }}
                    className="h-9 flex-1 min-w-0 px-3 rounded-lg text-sm text-gray-700 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Address</label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(address) => setFormData({ ...formData, address })}
                placeholder="Search for a place..."
                onMapsClick={() => {
                  if (formData.address) {
                    window.open(getMapsUrl(formData.address), '_blank', 'noopener,noreferrer');
                  }
                }}
                showMapsButton={!!formData.address}
                className="h-9"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Notes</label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40 focus:ring-1 focus:ring-[#ff6b6b]/20 transition-colors resize-y"
                placeholder="Additional notes..."
              />
            </div>

            {/* Links */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Links</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {getLinksArray().map((link, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-100"
                  >
                    <LinkIcon className="w-3 h-3 flex-shrink-0" />
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline max-w-[140px] truncate"
                      title={link}
                    >
                      {getLinkDisplayName(link)}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(link)}
                      className="text-blue-400 hover:text-blue-600 ml-0.5"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newLinkInput}
                    onChange={(e) => setNewLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLink();
                      }
                    }}
                    className="h-9 w-44 px-3 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40"
                    placeholder="Add URL..."
                  />
                  {newLinkInput.trim() && (
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="ml-1.5 h-7 w-7 rounded-lg text-white flex items-center justify-center"
                      style={{ background: '#ff6b6b' }}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div
            className="sticky bottom-0 flex items-center justify-between px-4 py-2.5 bg-white"
            style={{
              borderTop: '1px solid rgba(255, 107, 107, 0.15)',
            }}
          >
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-lg transition-colors disabled:opacity-50 text-sm font-semibold"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: '#ff6b6b' }}
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
