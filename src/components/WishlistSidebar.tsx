'use client';

import { useState } from 'react';
import { WishlistItem, Category, Activity } from '@/lib/types';
import { PlusIcon, XMarkIcon, ClockIcon, getCategoryIcon } from './Icons';
import WishlistModal from './WishlistModal';
import ConfirmModal from './ConfirmModal';

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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '#3B82F6': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  '#22C55E': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  '#F97316': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  '#A855F7': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  '#6B7280': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  '#EC4899': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  '#14B8A6': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  '#F59E0B': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  '#EF4444': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

function getCategoryStyle(color: string): { bg: string; text: string; border: string } {
  return CATEGORY_COLORS[color] || { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
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
    onDragStart(e, item);
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
      {/* Toggle button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-amber-500 hover:bg-amber-600 text-white px-2 py-4 rounded-l-lg shadow-lg transition-all"
          title="Open wishlist"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full z-30 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div
          className={`h-full w-80 border-l shadow-xl flex flex-col transition-colors ${
            isDragOver
              ? 'bg-amber-100 border-amber-400 border-2'
              : 'bg-white border-gray-200'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-amber-50">
            <div>
              <h2 className="text-base font-bold text-gray-900">Wishlist</h2>
              <p className="text-xs text-gray-500">Drag items to schedule them</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleAddClick}
                className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                title="Add item"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onToggle}
                className="p-2 rounded-lg hover:bg-amber-100 text-gray-500 transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 font-medium">No items yet</p>
                <p className="text-xs text-gray-400 mt-1">Add things you want to do!</p>
                <button
                  onClick={handleAddClick}
                  className="mt-4 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  + Add your first item
                </button>
              </div>
            ) : (
              items.map((item) => {
                const category = categories.find((c) => c.name === item.category);
                const style = getCategoryStyle(category?.color || '#A855F7');
                const CategoryIcon = getCategoryIcon(item.category);

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => handleItemClick(item)}
                    className={`group relative p-3 rounded-lg cursor-grab active:cursor-grabbing active:scale-[0.98] active:opacity-70 transition-all duration-150 ease-out hover:shadow-md hover:scale-[1.01] border ${style.bg} ${style.border}`}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(item);
                      }}
                      className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/50 ${style.text}`}
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>

                    <div className={`flex items-center gap-1.5 pr-6 ${style.text}`}>
                      <CategoryIcon className="w-4 h-4 flex-shrink-0 opacity-80" />
                      <p className="text-sm font-semibold truncate">
                        {item.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs flex items-center gap-1 ${style.text} opacity-75`}>
                        <ClockIcon className="w-3 h-3" />
                        {formatDuration(item.duration_minutes)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded bg-white/50 ${style.text}`}>
                        {item.category}
                      </span>
                    </div>
                    {item.address && (
                      <p className={`text-xs mt-1 truncate ${style.text} opacity-60`}>
                        {item.address}
                      </p>
                    )}
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
