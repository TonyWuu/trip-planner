import CreateTripForm from '@/components/CreateTripForm';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Trip Planner
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          A collaborative trip planner for your Hong Kong & China adventure.
          Create a trip and share the link with your travel companions.
        </p>

        <CreateTripForm />

        <div className="mt-12 text-sm text-gray-500 dark:text-gray-500">
          <p className="mb-2">Features:</p>
          <ul className="space-y-1">
            <li>Real-time collaboration</li>
            <li>Pre-populated flights & hotels</li>
            <li>Weekly schedule grid view</li>
            <li>No account required</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
