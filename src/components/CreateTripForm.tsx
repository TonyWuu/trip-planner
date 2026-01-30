'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { createTrip } from '@/lib/supabase';
import { PlusIcon } from './Icons';

export default function CreateTripForm() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTrip = async () => {
    setCreating(true);
    setError(null);

    try {
      const shareToken = nanoid(10);
      const trip = await createTrip(shareToken);

      if (trip) {
        router.push(`/trip/${trip.share_token}`);
      } else {
        setError('Failed to create trip. Please check your Supabase configuration.');
      }
    } catch (err) {
      console.error('Error creating trip:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleCreateTrip}
        disabled={creating}
        className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
      >
        <PlusIcon className="w-5 h-5" />
        {creating ? 'Creating...' : 'Create New Trip'}
      </button>

      {error && (
        <p className="text-red-500 text-sm max-w-md text-center">{error}</p>
      )}
    </div>
  );
}
