'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity } from '@/lib/types';
import { getActivities, subscribeToActivities, createActivity as createActivityApi, updateActivity as updateActivityApi, deleteActivity as deleteActivityApi } from '@/lib/supabase';

export function useActivities(tripId: string | undefined) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;

    const currentTripId = tripId;

    async function fetchActivities() {
      setLoading(true);
      const data = await getActivities(currentTripId);
      setActivities(data);
      setLoading(false);
    }

    fetchActivities();

    // Subscribe to realtime changes
    const unsubscribe = subscribeToActivities(
      currentTripId,
      (newActivity) => {
        setActivities((prev) => {
          // Check if activity already exists (avoid duplicates)
          if (prev.some((a) => a.id === newActivity.id)) {
            return prev;
          }
          return [...prev, newActivity].sort(
            (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          );
        });
      },
      (updatedActivity) => {
        setActivities((prev) =>
          prev.map((a) => (a.id === updatedActivity.id ? updatedActivity : a))
        );
      },
      (deletedId) => {
        setActivities((prev) => prev.filter((a) => a.id !== deletedId));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tripId]);

  const createActivity = useCallback(
    async (activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>) => {
      const newActivity = await createActivityApi(activity);
      if (newActivity) {
        // Optimistic update - will also be handled by realtime
        setActivities((prev) => {
          if (prev.some((a) => a.id === newActivity.id)) {
            return prev;
          }
          return [...prev, newActivity].sort(
            (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          );
        });
      }
      return newActivity;
    },
    []
  );

  const updateActivity = useCallback(async (id: string, updates: Partial<Activity>) => {
    // Optimistic update - update UI immediately
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );

    // Then sync with database in background
    const updated = await updateActivityApi(id, updates);
    if (!updated) {
      // Rollback on error - refetch to get correct state
      if (tripId) {
        const data = await getActivities(tripId);
        setActivities(data);
      }
    }
    return updated;
  }, [tripId]);

  const deleteActivity = useCallback(async (id: string) => {
    const success = await deleteActivityApi(id);
    if (success) {
      setActivities((prev) => prev.filter((a) => a.id !== id));
    }
    return success;
  }, []);

  return { activities, loading, createActivity, updateActivity, deleteActivity };
}
