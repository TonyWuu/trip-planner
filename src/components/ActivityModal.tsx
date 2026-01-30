'use client';

import { useState, useEffect } from 'react';
import { Activity, ActivityFormData, Category, ModalMode } from '@/lib/types';
import { CURRENCIES } from '@/lib/constants';
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
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl animate-slideUp"
        style={{
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.08), rgba(255, 143, 171, 0.08))',
            borderBottom: '1px solid rgba(255, 107, 107, 0.15)',
          }}
        >
          <h2
            className="text-xl font-bold"
            style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              color: '#ff6b6b',
            }}
          >
            {mode === 'create' ? 'New Activity' : 'Edit Activity'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#ff6b6b]/10 transition-colors"
            style={{ color: '#ff6b6b' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-5 space-y-5">
            {/* Name */}
            <div>
              <label
                className="block text-sm font-semibold text-gray-600 mb-2"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Activity Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3.5 rounded-xl text-gray-700 placeholder:text-gray-400 transition-all duration-200 font-medium"
                style={{
                  background: 'linear-gradient(145deg, rgba(255, 107, 107, 0.05), rgba(255, 217, 61, 0.05))',
                  border: '2px solid rgba(255, 107, 107, 0.2)',
                }}
                placeholder="e.g., Dim Sum at Tim Ho Wan"
              />
            </div>

            {/* Category */}
            <div>
              <label
                className="block text-sm font-semibold text-gray-600 mb-2"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Category *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const CategoryIcon = getCategoryIcon(cat.name);
                  const isSelected = formData.category === cat.name;
                  return (
                  <div key={cat.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.name })}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'text-white shadow-md'
                          : 'text-gray-600 hover:opacity-80'
                      }`}
                      style={{
                        background: isSelected
                          ? `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)`
                          : `linear-gradient(145deg, ${cat.color}15, ${cat.color}25)`,
                        border: `2px solid ${isSelected ? 'transparent' : cat.color + '40'}`,
                        boxShadow: isSelected ? `0 4px 12px ${cat.color}40` : 'none',
                        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                      }}
                    >
                      <CategoryIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCategory(e, cat)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#ff6b6b] text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs font-bold hover:scale-110 shadow-md"
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
                  className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border-2 border-dashed ${
                    showNewCategory
                      ? 'border-[#ff6b6b] bg-[#ff6b6b]/10 text-[#ff6b6b] rotate-0'
                      : 'border-gray-300 text-gray-400 hover:border-[#ff6b6b] hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/5'
                  }`}
                >
                  <PlusIcon className="w-4 h-4 mx-auto" />
                </button>
              </div>

              {/* New Category Form */}
              {showNewCategory && (
                <div
                  className="mt-3 p-4 rounded-xl"
                  style={{
                    background: 'rgba(255, 107, 107, 0.05)',
                    border: '1px solid rgba(255, 107, 107, 0.2)',
                  }}
                >
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="w-full px-3 py-2.5 rounded-xl bg-white text-gray-700 placeholder:text-gray-400 text-sm font-medium"
                    style={{ border: '2px solid rgba(255, 107, 107, 0.2)' }}
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-gray-500 font-medium">Color:</span>
                    <div className="flex gap-1.5">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategoryColor(color)}
                          className={`w-7 h-7 rounded-full transition-all duration-200 ${
                            newCategoryColor === color ? 'scale-125 shadow-lg' : 'hover:scale-110'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                            boxShadow: newCategoryColor === color ? `0 4px 12px ${color}50` : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    className="mt-3 w-full px-3 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{
                      background: '#ff6b6b',
                      fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                    }}
                  >
                    Add Category
                  </button>
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="space-y-3">
              <div>
                <label
                  className="block text-sm font-semibold text-gray-600 mb-2"
                  style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                >
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
                  className="w-full px-4 py-3 rounded-xl text-gray-700 font-medium transition-all duration-200"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255, 107, 107, 0.05), rgba(255, 217, 61, 0.05))',
                    border: '2px solid rgba(255, 107, 107, 0.2)',
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm font-semibold text-gray-600 mb-2"
                    style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                  >
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
                    className="w-full px-4 py-3 rounded-xl text-gray-700 font-medium transition-all duration-200"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255, 107, 107, 0.05), rgba(255, 217, 61, 0.05))',
                      border: '2px solid rgba(255, 107, 107, 0.2)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-semibold text-gray-600 mb-2"
                    style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                  >
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
                    className="w-full px-4 py-3 rounded-xl text-gray-700 font-medium transition-all duration-200"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255, 107, 107, 0.05), rgba(255, 217, 61, 0.05))',
                      border: '2px solid rgba(255, 107, 107, 0.2)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label
                className="block text-sm font-semibold text-gray-600 mb-2"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Address
              </label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(address) => setFormData({ ...formData, address })}
                placeholder="Search for a place or address..."
                onMapsClick={() => {
                  if (formData.address) {
                    window.open(getMapsUrl(formData.address), '_blank', 'noopener,noreferrer');
                  }
                }}
                showMapsButton={!!formData.address}
              />
            </div>

            {/* Notes */}
            <div>
              <label
                className="block text-sm font-semibold text-gray-600 mb-2"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-gray-700 placeholder:text-gray-400 transition-all resize-none font-medium"
                style={{
                  background: 'linear-gradient(145deg, rgba(255, 107, 107, 0.05), rgba(255, 217, 61, 0.05))',
                  border: '2px solid rgba(255, 107, 107, 0.2)',
                }}
                placeholder="Additional notes..."
              />
            </div>

            {/* Cost */}
            <div>
              <label
                className="block text-sm font-semibold text-gray-600 mb-2"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Cost
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_amount}
                  onChange={(e) => setFormData({ ...formData, cost_amount: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-xl text-gray-700 placeholder:text-gray-400 transition-all font-medium"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255, 107, 107, 0.05), rgba(255, 217, 61, 0.05))',
                    border: '2px solid rgba(255, 107, 107, 0.2)',
                  }}
                  placeholder="0.00"
                />
                <select
                  value={formData.cost_currency}
                  onChange={(e) => setFormData({ ...formData, cost_currency: e.target.value })}
                  className="w-24 px-3 py-3 rounded-xl text-gray-700 transition-all font-medium"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255, 107, 107, 0.05), rgba(255, 217, 61, 0.05))',
                    border: '2px solid rgba(255, 107, 107, 0.2)',
                  }}
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
              <label
                className="block text-sm font-semibold text-gray-600 mb-2"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Links
              </label>

              {/* Existing links */}
              {getLinksArray().length > 0 && (
                <div className="space-y-2 mb-3">
                  {getLinksArray().map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl group"
                      style={{
                        background: 'linear-gradient(145deg, rgba(255, 107, 107, 0.08), rgba(255, 217, 61, 0.08))',
                        border: '2px solid rgba(255, 107, 107, 0.15)',
                      }}
                    >
                      <LinkIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#ff6b6b' }} />
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-sm font-medium hover:underline truncate"
                        style={{ color: '#ff6b6b' }}
                        title={link}
                      >
                        {getLinkDisplayName(link)}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(link)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ff6b6b]/20"
                        style={{ color: '#ff6b6b' }}
                        title="Remove link"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new link */}
              <div className="flex gap-2">
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
                  className="flex-1 px-4 py-3 rounded-xl text-gray-700 placeholder:text-gray-400 transition-colors font-medium"
                  style={{
                    background: 'rgba(255, 107, 107, 0.05)',
                    border: '2px solid rgba(255, 107, 107, 0.2)',
                  }}
                  placeholder="https://example.com"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  disabled={!newLinkInput.trim()}
                  className="px-4 py-3 rounded-xl text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                  style={{
                    background: '#ff6b6b',
                  }}
                  title="Add link"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div
            className="sticky bottom-0 flex items-center justify-between p-5 bg-white"
            style={{
              borderTop: '1px solid rgba(255, 107, 107, 0.15)',
            }}
          >
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-xl transition-colors disabled:opacity-50 font-semibold"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
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
                className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{
                  background: '#ff6b6b',
                  fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
                }}
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
