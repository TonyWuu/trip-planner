'use client';

import { useState, useEffect } from 'react';
import { Category, WishlistItem } from '@/lib/types';
import { XMarkIcon, TrashIcon, PlusIcon, getCategoryIcon, LinkIcon } from './Icons';
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

const CITIES = ['Hong Kong', 'Shanghai', 'Chengdu', 'Unknown'];

interface FormData {
  name: string;
  category: string;
  city: string;
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
    city: 'Hong Kong',
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
        city: item.city || 'Hong Kong',
        duration_minutes: item.duration_minutes.toString(),
        address: item.address || '',
        notes: item.notes || '',
        links: item.links?.join('\n') || '',
      });
    } else {
      setFormData({
        name: '',
        category: 'Activity',
        city: 'Hong Kong',
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
      city: formData.city,
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
            {isEditMode ? 'Edit Wishlist Item' : 'Add to Wishlist'}
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
        <form onSubmit={handleSubmit} className="relative overflow-y-auto max-h-[calc(85vh-90px)]">
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
                placeholder="e.g., Visit Victoria Peak"
                autoFocus
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

            {/* City */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">City *</label>
              <div className="flex gap-1.5">
                {CITIES.map((city) => {
                  const isSelected = formData.city === city;
                  const cityColors: Record<string, string> = {
                    'Hong Kong': '#ff6b6b',
                    'Shanghai': '#4d96ff',
                    'Chengdu': '#6bcb77',
                    'Unknown': '#9ca3af',
                  };
                  const color = cityColors[city] || '#6b7280';
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setFormData({ ...formData, city })}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
                        isSelected ? 'text-white shadow-sm' : 'text-gray-600 hover:opacity-80'
                      }`}
                      style={{
                        background: isSelected ? color : `${color}15`,
                        border: `1.5px solid ${isSelected ? 'transparent' : color + '30'}`,
                      }}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Duration</label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="h-9 px-3 rounded-lg text-sm text-gray-700 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40"
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
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Address</label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(address) => setFormData({ ...formData, address })}
                placeholder="Search for a place..."
                className="h-9"
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
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Notes</label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40 focus:ring-1 focus:ring-[#ff6b6b]/20 transition-colors resize-y"
                placeholder="Why do you want to do this?"
              />
            </div>

            {/* Links */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Links</label>
              <input
                type="text"
                value={formData.links}
                onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                className="w-full h-9 px-3 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40 focus:ring-1 focus:ring-[#ff6b6b]/20 transition-colors"
                placeholder="https://example.com (one per line)"
              />
            </div>
          </div>

          {/* Actions */}
          <div
            className="sticky bottom-0 flex items-center justify-between px-4 py-2.5 bg-white"
            style={{ borderTop: '1px solid rgba(255, 107, 107, 0.15)' }}
          >
            {isEditMode && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-lg transition-colors disabled:opacity-50 text-sm font-semibold"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                {deleting ? 'Removing...' : 'Remove'}
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
                {saving ? 'Saving...' : isEditMode ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
