import CreateTripForm from '@/components/CreateTripForm';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-xl">
        {/* Globe Icon */}
        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff6b6b] to-[#ff8fab] shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
          Trip Planner
        </h1>

        <p className="text-gray-600 mb-10 text-lg">
          Plan your Hong Kong & China adventure together.
        </p>

        <CreateTripForm />

        {/* Cities */}
        <div className="mt-12 flex items-center justify-center gap-3 flex-wrap">
          <span className="px-4 py-2 text-sm font-semibold rounded-full bg-[#ff6b6b]/10 text-[#ff6b6b]">
            Hong Kong
          </span>
          <span className="text-gray-300">→</span>
          <span className="px-4 py-2 text-sm font-semibold rounded-full bg-[#4d96ff]/10 text-[#4d96ff]">
            Shanghai
          </span>
          <span className="text-gray-300">→</span>
          <span className="px-4 py-2 text-sm font-semibold rounded-full bg-[#6bcb77]/10 text-[#6bcb77]">
            Chengdu
          </span>
        </div>
      </div>
    </div>
  );
}
