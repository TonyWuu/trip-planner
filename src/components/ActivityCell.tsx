'use client';

import { Activity, Category } from '@/lib/types';
import { formatTimeRange, getActivitySpan } from '@/lib/utils';
import { CATEGORY_COLORS } from '@/lib/constants';
import { XMarkIcon } from './Icons';

interface ActivityCellProps {
  activity: Activity;
  categories: Category[];
  onClick: () => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, activity: Activity) => void;
}

export default function ActivityCell({ activity, categories, onClick, onDelete, onDragStart }: ActivityCellProps) {
  const span = getActivitySpan(activity);
  const heightPx = span * 40; // Each slot is 40px (h-10)

  // Get color from categories or fallback to default
  const category = categories.find((c) => c.name === activity.category);
  const bgColor = category?.color || CATEGORY_COLORS[activity.category] || '#6B7280';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this activity?')) {
      onDelete(activity.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart(e, activity);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="absolute left-0 right-0 mx-0.5 rounded-md cursor-grab active:cursor-grabbing overflow-hidden shadow-sm hover:shadow-md transition-shadow z-10 group"
      style={{
        height: `${heightPx}px`,
        backgroundColor: bgColor,
      }}
    >
      <div className="p-1.5 h-full flex flex-col relative">
        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="absolute top-1 right-1 p-0.5 rounded bg-black/20 hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <XMarkIcon className="w-3 h-3 text-white" />
        </button>

        <p className="text-xs font-medium text-white truncate pr-5">{activity.name}</p>
        {span > 1 && (
          <p className="text-xs text-white/80 truncate">
            {formatTimeRange(activity.start_datetime, activity.end_datetime)}
          </p>
        )}
        {span > 2 && activity.address && (
          <p className="text-xs text-white/70 truncate mt-0.5">{activity.address}</p>
        )}
      </div>
    </div>
  );
}
