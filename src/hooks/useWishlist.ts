'use client';

import { useState, useEffect, useCallback } from 'react';
import { WishlistItem } from '@/lib/types';
import {
  getWishlistItems,
  createWishlistItem as createWishlistItemApi,
  updateWishlistItem as updateWishlistItemApi,
  deleteWishlistItem as deleteWishlistItemApi,
  subscribeToWishlistItems,
} from '@/lib/supabase';

export function useWishlist(tripId: string) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      const data = await getWishlistItems(tripId);
      setItems(data);
      setLoading(false);
    }

    fetchItems();

    // Subscribe to realtime changes
    const unsubscribe = subscribeToWishlistItems(
      tripId,
      (newItem) => {
        setItems((prev) => {
          if (prev.some((i) => i.id === newItem.id)) return prev;
          return [...prev, newItem];
        });
      },
      (updatedItem) => {
        setItems((prev) =>
          prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
        );
      },
      (deletedId) => {
        setItems((prev) => prev.filter((i) => i.id !== deletedId));
      }
    );

    return unsubscribe;
  }, [tripId]);

  const createItem = useCallback(
    async (item: Omit<WishlistItem, 'id' | 'created_at'>) => {
      const newItem = await createWishlistItemApi(item);
      if (newItem) {
        setItems((prev) => [...prev, newItem]);
      }
      return newItem;
    },
    []
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<WishlistItem>) => {
      const updated = await updateWishlistItemApi(id, updates);
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      }
      return updated;
    },
    []
  );

  const deleteItem = useCallback(async (id: string) => {
    const success = await deleteWishlistItemApi(id);
    if (success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    return success;
  }, []);

  return {
    items,
    loading,
    createItem,
    updateItem,
    deleteItem,
  };
}
