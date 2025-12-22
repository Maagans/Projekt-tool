import { CardSkeleton } from './CardSkeleton';

/**
 * Full dashboard skeleton loader.
 * Mimics the dashboard layout with placeholder content.
 */
export const DashboardSkeleton = () => (
    <div className="animate-pulse space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
            <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-32" />
            </div>
            <div className="h-10 bg-gray-200 rounded-lg w-36" />
        </div>

        {/* Navigation cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={`nav-${i}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                        <div className="h-5 bg-gray-200 rounded w-24" />
                    </div>
                    <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
            ))}
        </div>

        {/* Projects section skeleton */}
        <div>
            <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
            <CardSkeleton count={4} size="lg" />
        </div>
    </div>
);
