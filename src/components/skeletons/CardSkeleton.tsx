interface CardSkeletonProps {
    /** Number of cards to display */
    count?: number;
    /** Layout direction */
    direction?: 'horizontal' | 'vertical';
    /** Card size variant */
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Skeleton loader for card layouts.
 * Displays animated placeholder cards while data is loading.
 */
export const CardSkeleton = ({ count = 3, direction = 'horizontal', size = 'md' }: CardSkeletonProps) => {
    const sizeClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    const heightClasses = {
        sm: 'h-24',
        md: 'h-32',
        lg: 'h-40',
    };

    return (
        <div
            className={`animate-pulse ${direction === 'horizontal' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-4'}`}
        >
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={`card-${i}`}
                    className={`bg-white rounded-xl shadow-sm border border-gray-100 ${sizeClasses[size]} ${heightClasses[size]}`}
                >
                    {/* Card header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                        <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                    </div>

                    {/* Card content lines */}
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-full" />
                        <div className="h-3 bg-gray-100 rounded w-4/5" />
                    </div>
                </div>
            ))}
        </div>
    );
};
