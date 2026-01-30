'use client';

import { useState, useEffect } from 'react';
import { Category, WishlistItem } from '@/lib/types';
import { XMarkIcon, TrashIcon, PlusIcon } from './Icons';
import { getMapsUrl } from '@/lib/utils';
import { createCategory, deleteCategory } from '@/lib/supabase';
import AddressAutocomplete from './AddressAutocomplete';

// Available colors for new categories
const CATEGORY_COLORS = [
  '#3B82F6', '#22C55E', '#F97316', '#A855F7',
  '#EC4899', '#14B8A6', '#F59E0B', '#EF4444',
];

interface WishlistModalProps {
  isOpen: boolean;
  item?: WishlistItem | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: Omit<WishlistItem, 'id' | 'created_at'>) => Promise<WishlistItem | null>;
  onUpdate?: (id: string, data: Partial<WishlistItem>) => Promise<WishlistItem | null>;
  onDelete?: (id: string) => Promise<boolean>;
  onCategoryCreated?: (category: Category) => void;
  onCategoryDeleted?: (id: string) => void;
  tripId: string;
}

interface FormData {
  name: string;
  category: string;
  duration_minutes: string;
  address: string;
  notes: string;
  links: string;
}

export default function WishlistModal({
  isOpen,
  item,
  categories,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  onCategoryCreated,
  onCategoryDeleted,
  tripId,
}: WishlistModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: 'Activity',
    duration_minutes: '60',
    address: '',
    notes: '',
    links: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);

  const isEditMode = !!item;

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
    if (!isOpen) return;

    // Reset new category state
    setShowNewCategory(false);
    setNewCategoryName('');

    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        duration_minutes: item.duration_minutes.toString(),
        address: item.address || '',
        notes: item.notes || '',
        links: item.links?.join('\n') || '',
      });
    } else {
      setFormData({
        name: '',
        category: 'Activity',
        duration_minutes: '60',
        address: '',
        notes: '',
        links: '',
      });
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = {
      trip_id: tripId,
      name: formData.name,
      category: formData.category,
      duration_minutes: parseInt(formData.duration_minutes) || 60,
      address: formData.address || null,
      notes: formData.notes || null,
      links: formData.links ? formData.links.split('\n').filter((l) => l.trim()) : null,
    };

    try {
      if (isEditMode && item && onUpdate) {
        await onUpdate(item.id, data);
      } else {
        await onSave(data);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !onDelete || !confirm('Remove this from your wishlist?')) return;

    setDeleting(true);
    try {
      await onDelete(item.id);
      onClose();
    } finally {
      setDeleting(false);
    }
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
        className="absolute inset-0 bg-black/40"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl animate-slideUp bg-white"
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
            {isEditMode ? 'Edit Wishlist Item' : 'Add to Wishlist'}
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
        <form onSubmit={handleSubmit} className="relative overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                What do you want to do? *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., Visit Victoria Peak"
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.name })}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.category === cat.name
                          ? 'text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 border-dashed ${
                    showNewCategory
                      ? 'border-amber-400 bg-amber-50 text-amber-600'
                      : 'border-gray-300 text-gray-500 hover:border-amber-300 hover:text-amber-500'
                  }`}
                >
                  <PlusIcon className="w-4 h-4 mx-auto" />
                </button>
              </div>

              {/* New Category Form */}
              {showNewCategory && (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-gray-700 placeholder:text-gray-400 focus:border-amber-400 text-sm"
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
                            newCategoryColor === color ? 'ring-2 ring-offset-1 ring-amber-400 scale-110' : ''
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
                    className="mt-2 w-full px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Category
                  </button>
                </div>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Estimated Duration
              </label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
                <option value="240">4 hours</option>
                <option value="300">5 hours</option>
                <option value="360">6 hours</option>
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Address / Location
              </label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(address) => setFormData({ ...formData, address })}
                placeholder="Search for a place..."
                className="border-gray-300 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                placeholder="Why do you want to do this? Any tips?"
              />
            </div>

            {/* Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Links (one per line)
              </label>
              <textarea
                value={formData.links}
                onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Actions */}
          <div
            className="sticky bottom-0 flex items-center justify-between p-5 bg-white"
            style={{ borderTop: '1px solid rgba(255, 107, 107, 0.15)' }}
          >
            {isEditMode && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-xl transition-colors disabled:opacity-50 font-semibold"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                <TrashIcon className="w-4 h-4" />
                {deleting ? 'Removing...' : 'Remove'}
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
                {saving ? 'Saving...' : isEditMode ? 'Update' : 'Add to Wishlist'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
