'use client';

import { useState, useEffect } from 'react';
import { Trip } from '@/lib/types';
import { getTripByShareToken } from '@/lib/supabase';

export function useTrip(shareToken: string) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrip() {
      setLoading(true);
      setError(null);

      const data = await getTripByShareToken(shareToken);

      if (!data) {
        setError('Trip not found');
      } else {
        setTrip(data);
      }

      setLoading(false);
    }

    if (shareToken) {
      fetchTrip();
    }
  }, [shareToken]);

  return { trip, loading, error };
}
