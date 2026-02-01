'use client';

import { useState } from 'react';
import { WishlistItem, Category, Activity } from '@/lib/types';
import { PlusIcon, XMarkIcon, ClockIcon, getCategoryIcon } from './Icons';
import WishlistModal from './WishlistModal';
import ConfirmModal from './ConfirmModal';
import { setDraggedItemHeight, setDraggedItemColor } from './DayColumn';

interface WishlistSidebarProps {
  items: WishlistItem[];
  categories: Category[];
  onAddItem: (item: Omit<WishlistItem, 'id' | 'created_at'>) => Promise<WishlistItem | null>;
  onUpdateItem?: (id: string, data: Partial<WishlistItem>) => Promise<WishlistItem | null>;
  onDeleteItem: (id: string) => Promise<boolean>;
  onDragStart: (e: React.DragEvent, item: WishlistItem) => void;
  onActivityDrop?: (activity: Activity) => Promise<void>;
  onCategoryCreated?: (category: Category) => void;
  onCategoryDeleted?: (id: string) => void;
  tripId: string;
  isOpen: boolean;
  onToggle: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; color: string }> = {
  '#3B82F6': { bg: 'bg-[#4d96ff]/10', text: 'text-[#2563eb]', border: 'border-[#4d96ff]/25', color: '#4d96ff' },
  '#22C55E': { bg: 'bg-[#6bcb77]/10', text: 'text-[#15803d]', border: 'border-[#6bcb77]/25', color: '#6bcb77' },
  '#F97316': { bg: 'bg-[#ffa07a]/10', text: 'text-[#c2410c]', border: 'border-[#ffa07a]/25', color: '#ffa07a' },
  '#A855F7': { bg: 'bg-[#b088f9]/10', text: 'text-[#7c3aed]', border: 'border-[#b088f9]/25', color: '#b088f9' },
  '#6B7280': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', color: '#6b7280' },
  '#EC4899': { bg: 'bg-[#ff8fab]/10', text: 'text-[#be185d]', border: 'border-[#ff8fab]/25', color: '#ff8fab' },
  '#14B8A6': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', color: '#14b8a6' },
  '#F59E0B': { bg: 'bg-[#ffd93d]/10', text: 'text-[#b45309]', border: 'border-[#ffd93d]/25', color: '#ffd93d' },
  '#EF4444': { bg: 'bg-[#ff6b6b]/10', text: 'text-[#dc2626]', border: 'border-[#ff6b6b]/25', color: '#ff6b6b' },
};

function getCategoryStyle(color: string): { bg: string; text: string; border: string; color: string } {
  return CATEGORY_COLORS[color] || { bg: 'bg-[#ff6b6b]/10', text: 'text-[#dc2626]', border: 'border-[#ff6b6b]/25', color: '#ff6b6b' };
}

export default function WishlistSidebar({
  items,
  categories,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onDragStart,
  onActivityDrop,
  onCategoryCreated,
  onCategoryDeleted,
  tripId,
  isOpen,
  onToggle,
}: WishlistSidebarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<WishlistItem | null>(null);

  const handleAddClick = () => {
    setSelectedItem(null);
    setModalOpen(true);
  };

  const handleItemClick = (item: WishlistItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleDeleteClick = (item: WishlistItem) => {
    setDeleteConfirmItem(item);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmItem) {
      await onDeleteItem(deleteConfirmItem.id);
      setDeleteConfirmItem(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmItem(null);
  };

  const handleDragStart = (e: React.DragEvent, item: WishlistItem) => {
    e.dataTransfer.effectAllowed = 'move';
    // Set the dragged item height for highlighting (duration in pixels, 30 min = 40px)
    const heightPx = (item.duration_minutes / 30) * 40;
    setDraggedItemHeight(heightPx);
    // Set color from category
    const category = categories.find((c) => c.name === item.category);
    const style = getCategoryStyle(category?.color || '#A855F7');
    setDraggedItemColor(style.color);
    onDragStart(e, item);
  };

  const handleDragEnd = () => {
    // Clear the dragged item info when drag ends
    setDraggedItemHeight(null);
    setDraggedItemColor(null);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set to false if leaving the sidebar entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData && onActivityDrop) {
        const data = JSON.parse(jsonData);
        // Only accept activities (not wishlist items being dragged back)
        if (!data.isWishlistItem && data.start_datetime) {
          await onActivityDrop(data);
        }
      }
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  };

  return (
    <>
      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="h-full flex-shrink-0 w-10 bg-gradient-to-b from-[#ff6b6b]/5 to-[#ff6b6b]/10 hover:from-[#ff6b6b]/10 hover:to-[#ff6b6b]/15 border-l border-[#ff6b6b]/20 flex flex-col items-center justify-center gap-2 transition-colors"
          title="Open wishlist"
        >
          <svg className="w-5 h-5 text-[#ff6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-[10px] font-medium text-[#ff6b6b]" style={{ writingMode: 'vertical-rl' }}>Wishlist</span>
        </button>
      )}

      {/* Sidebar container */}
      <div
        className={`h-full flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'w-56' : 'w-0'
        }`}
      >
        <div
          className={`h-full w-56 border-l shadow-xl flex flex-col transition-colors ${
            isDragOver
              ? 'bg-[#ff6b6b]/5 border-[#ff6b6b] border-2'
              : 'bg-white/90 backdrop-blur-sm border-[#ff6b6b]/10'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-[#ff6b6b]/5">
            <h2 className="text-sm font-bold text-gray-900">Wishlist</h2>
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleAddClick}
                className="p-1.5 rounded-lg bg-[#ff6b6b] hover:bg-[#ff6b6b]/90 text-white transition-colors"
                title="Add item"
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="Close"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#ff6b6b]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#ff6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 font-medium">No items yet</p>
                <button
                  onClick={handleAddClick}
                  className="mt-2 px-3 py-1.5 text-xs font-medium text-[#ff6b6b] hover:bg-[#ff6b6b]/5 rounded-lg transition-colors"
                >
                  + Add item
                </button>
              </div>
            ) : (
              items.map((item) => {
                const category = categories.find((c) => c.name === item.category);
                const catColor = category?.color || '#ff6b6b';
                const CategoryIcon = getCategoryIcon(item.category);

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleItemClick(item)}
                    className="group relative p-2 rounded-lg cursor-grab active:cursor-grabbing active:scale-[0.98] transition-all hover:shadow-md"
                    style={{
                      background: `${catColor}10`,
                      border: `1px solid ${catColor}25`,
                    }}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(item);
                      }}
                      className="absolute top-1.5 right-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/50"
                      style={{ color: catColor }}
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-1 pr-5" style={{ color: catColor }}>
                      <CategoryIcon className="w-3 h-3 flex-shrink-0 opacity-80" />
                      <p className="text-xs font-semibold truncate">
                        {item.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] flex items-center gap-0.5 opacity-75" style={{ color: catColor }}>
                        <ClockIcon className="w-2.5 h-2.5" />
                        {formatDuration(item.duration_minutes)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <WishlistModal
        isOpen={modalOpen}
        item={selectedItem}
        categories={categories}
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={onAddItem}
        onUpdate={onUpdateItem}
        onDelete={onDeleteItem}
        onCategoryCreated={onCategoryCreated}
        onCategoryDeleted={onCategoryDeleted}
        tripId={tripId}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmItem !== null}
        title="Remove from Wishlist"
        message={`Are you sure you want to remove "${deleteConfirmItem?.name}" from your wishlist?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
