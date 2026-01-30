'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { createTrip } from '@/lib/supabase';

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
        className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
        style={{
          background: 'linear-gradient(135deg, #ff6b6b, #ff8fab)',
          boxShadow: '0 4px 14px rgba(255, 107, 107, 0.3)',
        }}
      >
        {creating ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        )}
        {creating ? 'Creating...' : 'Start Planning'}
      </button>

      {error && (
        <div className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
