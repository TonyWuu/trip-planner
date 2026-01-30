'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Activity, Category } from '@/lib/types';
import { formatTimeRange, getActivitySpan } from '@/lib/utils';
import { XMarkIcon, getCategoryIcon } from './Icons';
import ConfirmModal from './ConfirmModal';
import { setDraggedItemSpan, getDraggedItemSpan, setDraggedItemColor, setDraggedItemYOffset } from './DayColumn';

interface ActivityCellProps {
  activity: Activity;
  categories: Category[];
  onClick: () => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, activity: Activity) => void;
  onResize?: (activityId: string, newEndTime: string, newStartTime?: string) => void;
  column?: number;
  totalColumns?: number;
  isAnyDragActive?: boolean;
  daySpan?: number;
  isContinuation?: boolean;
}

// Playful candy colors for categories
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  '#3B82F6': { bg: 'bg-[#4d96ff]/15', text: 'text-[#2563eb]', border: 'border-[#4d96ff]/30', gradient: 'linear-gradient(135deg, #4d96ff, #6bb3ff)' },
  '#22C55E': { bg: 'bg-[#6bcb77]/15', text: 'text-[#15803d]', border: 'border-[#6bcb77]/30', gradient: 'linear-gradient(135deg, #6bcb77, #8ce99a)' },
  '#F97316': { bg: 'bg-[#ffa07a]/15', text: 'text-[#c2410c]', border: 'border-[#ffa07a]/30', gradient: 'linear-gradient(135deg, #ff6b6b, #ffa07a)' },
  '#A855F7': { bg: 'bg-[#b088f9]/15', text: 'text-[#7c3aed]', border: 'border-[#b088f9]/30', gradient: 'linear-gradient(135deg, #b088f9, #c9a8ff)' },
  '#6B7280': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)' },
  '#EC4899': { bg: 'bg-[#ff8fab]/15', text: 'text-[#be185d]', border: 'border-[#ff8fab]/30', gradient: 'linear-gradient(135deg, #ff8fab, #ffc0cb)' },
  '#14B8A6': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', gradient: 'linear-gradient(135deg, #14b8a6, #5eead4)' },
  '#F59E0B': { bg: 'bg-[#ffd93d]/15', text: 'text-[#b45309]', border: 'border-[#ffd93d]/30', gradient: 'linear-gradient(135deg, #ffd93d, #ffe066)' },
  '#EF4444': { bg: 'bg-[#ff6b6b]/15', text: 'text-[#dc2626]', border: 'border-[#ff6b6b]/30', gradient: 'linear-gradient(135deg, #ff6b6b, #ff8fab)' },
};

function getCategoryStyle(color: string): { bg: string; text: string; border: string; gradient: string } {
  return CATEGORY_COLORS[color] || { bg: 'bg-[#b088f9]/15', text: 'text-[#7c3aed]', border: 'border-[#b088f9]/30', gradient: 'linear-gradient(135deg, #b088f9, #c9a8ff)' };
}

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')}${period}`;
}

export default function ActivityCell({ activity, categories, onClick, onDelete, onDragStart, onResize, column = 0, totalColumns = 1, isAnyDragActive = false, daySpan, isContinuation = false }: ActivityCellProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHeight, setResizeHeight] = useState<number | null>(null);
  const [resizeTopOffset, setResizeTopOffset] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewTime, setPreviewTime] = useState<string | null>(null);
  const currentHeightRef = useRef<number>(0);
  const currentTopOffsetRef = useRef<number>(0);
  const wasResizingRef = useRef(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate sub-slot offset for 15-min positioning (needed for resize handlers)
  const startDate = new Date(activity.start_datetime);
  const endDate = new Date(activity.end_datetime);
  const startMinute = startDate.getMinutes();
  const minuteWithinSlot = startMinute % 30;
  const subSlotOffset = isContinuation ? 0 : (minuteWithinSlot / 30) * 40;

  // Calculate height based on actual duration in pixels (30 min = 40px)
  // This ensures the bottom aligns correctly regardless of start time offset
  const span = daySpan ?? getActivitySpan(activity);
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  const baseHeightPx = daySpan ? span * 40 : (durationMinutes / 30) * 40;
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
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
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
    // Don't open modal if we just finished resizing or delete confirm is showing
    if (wasResizingRef.current) {
      wasResizingRef.current = false;
      return;
    }
    if (showDeleteConfirm) {
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

    const SLOT_HEIGHT = 40;
    const SNAP_HEIGHT = 20;
    const MIN_HEIGHT = 20;
    const startY = e.clientY;
    const startHeight = baseHeightPx;
    let currentDelta = 0;
    let pendingHeight = startHeight;

    const updateVisuals = () => {
      if (cellRef.current) {
        cellRef.current.style.height = `${pendingHeight - 2}px`;
      }
      rafRef.current = null;
    };

    const syncState = (height: number) => {
      const deltaHeight = height - baseHeightPx;
      const deltaMinutes = (deltaHeight / SLOT_HEIGHT) * 30;
      const endDate = new Date(activity.end_datetime);
      const startDate = new Date(activity.start_datetime);
      const rawNewEnd = new Date(endDate.getTime() + deltaMinutes * 60 * 1000);
      // Snap preview to nearest 15-minute boundary
      const minutes = rawNewEnd.getMinutes();
      const snappedMinutes = Math.round(minutes / 15) * 15;
      const newEnd = new Date(rawNewEnd);
      newEnd.setMinutes(snappedMinutes % 60);
      if (snappedMinutes >= 60) {
        newEnd.setHours(newEnd.getHours() + 1);
      }
      // Sync both height state and preview time together to avoid stale renders
      setResizeHeight(height);
      setPreviewTime(`${formatTime(startDate)} - ${formatTime(newEnd)}`);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      currentDelta = deltaY;
      pendingHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);
      currentHeightRef.current = pendingHeight;

      // Use RAF for smooth visual updates
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updateVisuals);
      }

      // Debounce state sync to reduce re-renders
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
      previewDebounceRef.current = setTimeout(() => {
        syncState(pendingHeight);
      }, 30);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      wasResizingRef.current = true;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
        previewDebounceRef.current = null;
      }

      // Calculate the new end time based on pixel delta
      const deltaMinutes = (currentDelta / SLOT_HEIGHT) * 30;
      const endDate = new Date(activity.end_datetime);
      const rawNewEndDate = new Date(endDate.getTime() + deltaMinutes * 60 * 1000);

      // Snap the final time to nearest 15-minute boundary
      const minutes = rawNewEndDate.getMinutes();
      const snappedMinutes = Math.round(minutes / 15) * 15;
      const newEndDate = new Date(rawNewEndDate);
      newEndDate.setMinutes(snappedMinutes % 60);
      if (snappedMinutes >= 60) {
        newEndDate.setHours(newEndDate.getHours() + 1);
      }
      newEndDate.setSeconds(0, 0);

      const startDate = new Date(activity.start_datetime);
      if (newEndDate.getTime() - startDate.getTime() < 15 * 60 * 1000) {
        setResizeHeight(null);
        setPreviewTime(null);
        return;
      }

      if (onResize) {
        onResize(activity.id, formatDateTime(newEndDate));
      }
      setResizeHeight(null);
      setPreviewTime(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [baseHeightPx, activity.start_datetime, activity.end_datetime, activity.id, onResize]);

  const handleTopResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);

    const SLOT_HEIGHT = 40;
    const SNAP_HEIGHT = 20;
    const MIN_HEIGHT = 20;
    const startY = e.clientY;
    const startHeight = baseHeightPx;
    const startTop = subSlotOffset;
    let currentDelta = 0;
    let pendingHeight = startHeight;
    let pendingTop = startTop;

    const updateVisuals = () => {
      if (cellRef.current) {
        cellRef.current.style.height = `${pendingHeight - 2}px`;
        cellRef.current.style.top = `${pendingTop}px`;
      }
      rafRef.current = null;
    };

    const syncState = (height: number, topOffset: number) => {
      const deltaMinutes = (topOffset / SLOT_HEIGHT) * 30;
      const startDate = new Date(activity.start_datetime);
      const endDate = new Date(activity.end_datetime);
      const rawNewStart = new Date(startDate.getTime() + deltaMinutes * 60 * 1000);
      // Snap preview to nearest 15-minute boundary
      const minutes = rawNewStart.getMinutes();
      const snappedMinutes = Math.round(minutes / 15) * 15;
      const newStart = new Date(rawNewStart);
      newStart.setMinutes(snappedMinutes % 60);
      if (snappedMinutes >= 60) {
        newStart.setHours(newStart.getHours() + 1);
      }
      // Sync height, top offset, and preview time together to avoid stale renders
      setResizeHeight(height);
      setResizeTopOffset(topOffset);
      setPreviewTime(`${formatTime(newStart)} - ${formatTime(endDate)}`);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      currentDelta = deltaY;
      pendingHeight = Math.max(MIN_HEIGHT, startHeight - deltaY);
      pendingTop = startTop + deltaY;
      currentHeightRef.current = pendingHeight;
      currentTopOffsetRef.current = deltaY;

      // Use RAF for smooth visual updates
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updateVisuals);
      }

      // Debounce state sync to reduce re-renders
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
      previewDebounceRef.current = setTimeout(() => {
        syncState(pendingHeight, deltaY);
      }, 30);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      wasResizingRef.current = true;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
        previewDebounceRef.current = null;
      }

      // Calculate the new start time based on pixel delta
      const deltaMinutes = (currentDelta / SLOT_HEIGHT) * 30;
      const startDate = new Date(activity.start_datetime);
      const endDate = new Date(activity.end_datetime);
      const rawNewStartDate = new Date(startDate.getTime() + deltaMinutes * 60 * 1000);

      // Snap the final time to nearest 15-minute boundary
      const minutes = rawNewStartDate.getMinutes();
      const snappedMinutes = Math.round(minutes / 15) * 15;
      const newStartDate = new Date(rawNewStartDate);
      newStartDate.setMinutes(snappedMinutes % 60);
      if (snappedMinutes >= 60) {
        newStartDate.setHours(newStartDate.getHours() + 1);
      }
      newStartDate.setSeconds(0, 0);

      if (endDate.getTime() - newStartDate.getTime() < 15 * 60 * 1000) {
        setResizeHeight(null);
        setResizeTopOffset(0);
        setPreviewTime(null);
        return;
      }

      if (onResize) {
        onResize(activity.id, formatDateTime(endDate), formatDateTime(newStartDate));
      }
      setResizeHeight(null);
      setResizeTopOffset(0);
      setPreviewTime(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [baseHeightPx, subSlotOffset, activity.start_datetime, activity.end_datetime, activity.id, onResize]);

  // Reset resize state when activity changes
  useEffect(() => {
    setResizeHeight(null);
    setResizeTopOffset(0);
    setPreviewTime(null);
  }, [activity.start_datetime, activity.end_datetime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
    };
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();

    const dragEl = e.currentTarget as HTMLElement;
    const rect = dragEl.getBoundingClientRect();

    // Calculate Y offset from mouse to top of activity
    const yOffset = e.clientY - rect.top;
    setDraggedItemYOffset(yOffset);

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

    e.dataTransfer.setDragImage(ghost, rect.width / 2, yOffset);
    e.dataTransfer.effectAllowed = 'move';

    // Set the dragged item span and color for highlighting
    setDraggedItemSpan(span);
    setDraggedItemColor(bgColor);

    // Clean up ghost after a short delay
    setTimeout(() => {
      if (document.body.contains(ghost)) {
        document.body.removeChild(ghost);
      }
    }, 0);

    // Mark as dragging after a brief delay so the drag can start first
    requestAnimationFrame(() => {
      setIsDragging(true);
    });

    onDragStart(e, activity);
  };

  const handleDragEnd = () => {
    // Clear the dragged item info when drag ends
    setDraggedItemSpan(null);
    setDraggedItemColor(null);
    setDraggedItemYOffset(0);
    setIsDragging(false);
  };

  // Calculate width and position for overlapping activities
  const widthPercent = 100 / totalColumns;
  const leftPercent = column * widthPercent;

  return (
    <div
      ref={cellRef}
      draggable={!isResizing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={isResizing ? undefined : handleClick}
      className={`absolute rounded-lg overflow-hidden z-10 group ${
        isDragging
          ? 'opacity-30 pointer-events-none'
          : isAnyDragActive
          ? 'pointer-events-none'
          : isResizing
          ? 'cursor-ns-resize z-30 shadow-lg'
          : 'transition-all duration-150 cursor-grab active:cursor-grabbing active:scale-[0.98] hover:shadow-md hover:z-20'
      }`}
      style={{
        height: `${heightPx - 2}px`,
        top: `${subSlotOffset + resizeTopOffset}px`,
        left: `calc(${leftPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
        background: `${bgColor}15`,
        border: `1px solid ${bgColor}30`,
        boxShadow: isResizing ? `0 4px 12px ${bgColor}25` : undefined,
      }}
    >
      <div className="p-1.5 h-full flex flex-col">
        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/50"
          style={{ color: bgColor }}
          title="Delete"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>

        <div className="flex items-center gap-1 pr-4" style={{ color: bgColor }}>
          <CategoryIcon className="w-3 h-3 flex-shrink-0 opacity-80" />
          <p className="text-xs font-semibold truncate leading-tight">
            {isContinuation ? '↳ ' : ''}{activity.name}
          </p>
          {isContinuation && (
            <span className="text-[9px] opacity-60 flex-shrink-0">(cont&apos;d)</span>
          )}
        </div>
        {(span > 1 || isResizing) && (
          <p className="text-[10px] truncate mt-0.5 opacity-75" style={{ color: bgColor }}>
            {previewTime ?? formatTimeRange(activity.start_datetime, activity.end_datetime)}
          </p>
        )}
        {span > 2 && activity.address && !isResizing && (
          <p className="text-[10px] truncate mt-0.5 opacity-60" style={{ color: bgColor }}>
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
          <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: bgColor }} />
        </div>
      )}

      {/* Bottom resize handle */}
      {onResize && (
        <div
          onMouseDown={handleBottomResizeStart}
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: bgColor }} />
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
