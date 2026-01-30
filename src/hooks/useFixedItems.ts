'use client';

import { useState, useEffect, useCallback } from 'react';
import { FixedItem } from '@/lib/types';
import { getFixedItems, subscribeToFixedItems, updateFixedItem as updateFixedItemApi, deleteFixedItem as deleteFixedItemApi } from '@/lib/supabase';

export function useFixedItems(tripId: string | undefined) {
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;

    const currentTripId = tripId;

    async function fetchFixedItems() {
      setLoading(true);
      const data = await getFixedItems(currentTripId);
      setFixedItems(data);
      setLoading(false);
    }

    fetchFixedItems();

    // Subscribe to realtime changes
    const unsubscribe = subscribeToFixedItems(
      currentTripId,
      (newItem) => {
        setFixedItems((prev) => {
          if (prev.some((item) => item.id === newItem.id)) {
            return prev;
          }
          return [...prev, newItem].sort(
            (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          );
        });
      },
      (updatedItem) => {
        setFixedItems((prev) =>
          prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
      },
      (deletedId) => {
        setFixedItems((prev) => prev.filter((item) => item.id !== deletedId));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tripId]);

  const updateFixedItem = useCallback(async (id: string, updates: Partial<FixedItem>) => {
    const updated = await updateFixedItemApi(id, updates);
    if (updated) {
      setFixedItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    }
    return updated;
  }, []);

  const deleteFixedItem = useCallback(async (id: string) => {
    const success = await deleteFixedItemApi(id);
    if (success) {
      setFixedItems((prev) => prev.filter((item) => item.id !== id));
    }
    return success;
  }, []);

  const flights = fixedItems.filter((item) => item.type === 'flight');
  const hotels = fixedItems.filter((item) => item.type === 'hotel');

  return { fixedItems, flights, hotels, loading, updateFixedItem, deleteFixedItem };
}
