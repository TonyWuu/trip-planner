import CreateTripForm from '@/components/CreateTripForm';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <div className="text-center max-w-xl">
        {/* Icon */}
        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Trip Planner
        </h1>

        <p className="text-gray-600 mb-10 text-lg">
          Plan your Hong Kong & China adventure together.
        </p>

        <CreateTripForm />

        {/* Cities */}
        <div className="mt-12 flex items-center justify-center gap-3">
          <span className="px-4 py-2 text-sm font-semibold rounded-full bg-rose-100 text-rose-700">
            Hong Kong
          </span>
          <span className="text-gray-400">→</span>
          <span className="px-4 py-2 text-sm font-semibold rounded-full bg-blue-100 text-blue-700">
            Shanghai
          </span>
          <span className="text-gray-400">→</span>
          <span className="px-4 py-2 text-sm font-semibold rounded-full bg-emerald-100 text-emerald-700">
            Chengdu
          </span>
        </div>
      </div>
    </div>
  );
}
