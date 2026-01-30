'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Activity, Category } from '@/lib/types';
import { formatTimeRange, getActivitySpan } from '@/lib/utils';
import { XMarkIcon, getCategoryIcon } from './Icons';
import ConfirmModal from './ConfirmModal';

interface ActivityCellProps {
  activity: Activity;
  categories: Category[];
  onClick: () => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, activity: Activity) => void;
  onResize?: (activityId: string, newEndTime: string, newStartTime?: string) => void;
  column?: number;
  totalColumns?: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '#3B82F6': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  '#22C55E': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  '#F97316': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  '#A855F7': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  '#6B7280': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  '#EC4899': { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  '#14B8A6': { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  '#F59E0B': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  '#EF4444': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
};

function getCategoryStyle(color: string): { bg: string; text: string; border: string } {
  return CATEGORY_COLORS[color] || { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' };
}

export default function ActivityCell({ activity, categories, onClick, onDelete, onDragStart, onResize, column = 0, totalColumns = 1 }: ActivityCellProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHeight, setResizeHeight] = useState<number | null>(null);
  const [resizeTopOffset, setResizeTopOffset] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const currentHeightRef = useRef<number>(0);
  const currentTopOffsetRef = useRef<number>(0);
  const wasResizingRef = useRef(false);

  const span = getActivitySpan(activity);
  const baseHeightPx = span * 40;
  const heightPx = resizeHeight ?? baseHeightPx;

  // Keep ref in sync with state
  useEffect(() => {
    currentHeightRef.current = heightPx;
  }, [heightPx]);

  const category = categories.find((c) => c.name === activity.category);
  const bgColor = category?.color || '#A855F7';
  const style = getCategoryStyle(bgColor);
  const CategoryIcon = getCategoryIcon(activity.category);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(activity.id);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling to cell
    // Don't open modal if we just finished resizing
    if (wasResizingRef.current) {
      wasResizingRef.current = false;
      return;
    }
    onClick();
  };

  const formatDateTime = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  const handleBottomResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);

    const SLOT_HEIGHT = 40; // Each 30-min slot is 40px (h-10)
    const SNAP_HEIGHT = 20; // Snap to 15-min increments (20px)
    const MIN_HEIGHT = 20; // Minimum 15 minutes
    const startY = e.clientY;
    const startHeight = baseHeightPx;
    let currentDelta = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      currentDelta = deltaY;

      // Show smooth resize without snapping during drag
      const newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);
      setResizeHeight(newHeight);
      currentHeightRef.current = newHeight;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      wasResizingRef.current = true;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Snap to nearest 15-min increment on release
      const snappedDelta = Math.round(currentDelta / SNAP_HEIGHT) * SNAP_HEIGHT;
      const deltaMinutes = (snappedDelta / SLOT_HEIGHT) * 30; // Convert px to minutes

      const endDate = new Date(activity.end_datetime);
      const newEndDate = new Date(endDate.getTime() + deltaMinutes * 60 * 1000);

      // Ensure minimum duration of 15 minutes
      const startDate = new Date(activity.start_datetime);
      if (newEndDate.getTime() - startDate.getTime() < 15 * 60 * 1000) {
        setResizeHeight(null);
        return;
      }

      if (onResize) {
        onResize(activity.id, formatDateTime(newEndDate));
      }
      setResizeHeight(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [baseHeightPx, activity.start_datetime, activity.end_datetime, activity.id, onResize]);

  const handleTopResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);

    const SLOT_HEIGHT = 40; // Each 30-min slot is 40px (h-10)
    const SNAP_HEIGHT = 20; // Snap to 15-min increments (20px)
    const MIN_HEIGHT = 20; // Minimum 15 minutes
    const startY = e.clientY;
    const startHeight = baseHeightPx;
    let currentDelta = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      currentDelta = deltaY;

      // Show smooth resize without snapping during drag
      // For top edge: negative deltaY = grow (move top up), positive = shrink (move top down)
      const newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY);
      const newTopOffset = deltaY;
      setResizeHeight(newHeight);
      setResizeTopOffset(newTopOffset);
      currentHeightRef.current = newHeight;
      currentTopOffsetRef.current = newTopOffset;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      wasResizingRef.current = true;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Snap to nearest 15-min increment on release
      const snappedDelta = Math.round(currentDelta / SNAP_HEIGHT) * SNAP_HEIGHT;
      const deltaMinutes = (snappedDelta / SLOT_HEIGHT) * 30; // Convert px to minutes

      const startDate = new Date(activity.start_datetime);
      const endDate = new Date(activity.end_datetime);
      const newStartDate = new Date(startDate.getTime() + deltaMinutes * 60 * 1000);

      // Ensure minimum duration of 15 minutes
      if (endDate.getTime() - newStartDate.getTime() < 15 * 60 * 1000) {
        setResizeHeight(null);
        setResizeTopOffset(0);
        return;
      }

      if (onResize) {
        onResize(activity.id, formatDateTime(endDate), formatDateTime(newStartDate));
      }
      setResizeHeight(null);
      setResizeTopOffset(0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [baseHeightPx, activity.start_datetime, activity.end_datetime, activity.id, onResize]);

  // Reset resize state when activity changes
  useEffect(() => {
    setResizeHeight(null);
    setResizeTopOffset(0);
  }, [activity.start_datetime, activity.end_datetime]);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();

    const dragEl = e.currentTarget as HTMLElement;
    const rect = dragEl.getBoundingClientRect();

    // Create a polished drag ghost
    const ghost = dragEl.cloneNode(true) as HTMLElement;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${Math.min(rect.height, 60)}px`; // Cap height for cleaner look
    ghost.style.opacity = '0.95';
    ghost.style.transform = 'rotate(1deg) scale(1.02)';
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    ghost.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
    ghost.style.borderRadius = '8px';
    ghost.style.pointerEvents = 'none';
    document.body.appendChild(ghost);

    e.dataTransfer.setDragImage(ghost, rect.width / 2, 20);
    e.dataTransfer.effectAllowed = 'move';

    // Clean up ghost after a short delay
    setTimeout(() => {
      if (document.body.contains(ghost)) {
        document.body.removeChild(ghost);
      }
    }, 0);

    onDragStart(e, activity);
  };

  // Calculate width and position for overlapping activities
  const widthPercent = 100 / totalColumns;
  const leftPercent = column * widthPercent;

  return (
    <div
      draggable={!isResizing}
      onDragStart={handleDragStart}
      onClick={isResizing ? undefined : handleClick}
      className={`absolute rounded-lg overflow-hidden z-10 group transition-all duration-150 ease-out hover:shadow-md hover:z-20 border ${style.bg} ${style.border} ${
        isResizing
          ? 'cursor-ns-resize z-30 shadow-lg ring-2 ring-purple-400'
          : 'cursor-grab active:cursor-grabbing active:scale-[0.98] active:opacity-70 hover:scale-[1.01]'
      }`}
      style={{
        height: `${heightPx - 2}px`,
        top: `${resizeTopOffset}px`,
        left: `calc(${leftPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
      }}
    >
      <div className="p-1.5 h-full flex flex-col">
        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className={`absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/50 ${style.text}`}
          title="Delete"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>

        <div className={`flex items-center gap-1 pr-4 ${style.text}`}>
          <CategoryIcon className="w-3 h-3 flex-shrink-0 opacity-80" />
          <p className="text-xs font-semibold truncate leading-tight">
            {activity.name}
          </p>
        </div>
        {(span > 1 || isResizing) && (
          <p className={`text-[10px] truncate mt-0.5 opacity-75 ${style.text}`}>
            {isResizing
              ? `${Math.round((heightPx / 40) * 30)} min`
              : formatTimeRange(activity.start_datetime, activity.end_datetime)}
          </p>
        )}
        {span > 2 && activity.address && !isResizing && (
          <p className={`text-[10px] truncate mt-0.5 opacity-60 ${style.text}`}>
            {activity.address}
          </p>
        )}
      </div>

      {/* Top resize handle */}
      {onResize && (
        <div
          onMouseDown={handleTopResizeStart}
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <div className={`w-8 h-1 rounded-full opacity-50`} style={{ backgroundColor: bgColor }} />
        </div>
      )}

      {/* Bottom resize handle */}
      {onResize && (
        <div
          onMouseDown={handleBottomResizeStart}
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <div className={`w-8 h-1 rounded-full opacity-50`} style={{ backgroundColor: bgColor }} />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Activity"
        message={`Are you sure you want to delete "${activity.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
