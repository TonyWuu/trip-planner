'use client';

import { use } from 'react';
import { useTrip } from '@/hooks/useTrip';
import TripGrid from '@/components/TripGrid';
import Link from 'next/link';

interface TripPageProps {
  params: Promise<{ shareToken: string }>;
}

export default function TripPage({ params }: TripPageProps) {
  const { shareToken } = use(params);
  const { trip, loading, error } = useTrip(shareToken);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Trip Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The trip you&apos;re looking for doesn&apos;t exist or the link may be incorrect.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            Create a New Trip
          </Link>
        </div>
      </div>
    );
  }

  return <TripGrid trip={trip} />;
}
