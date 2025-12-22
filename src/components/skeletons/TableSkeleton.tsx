interface TableSkeletonProps {
    rows?: number;
    cols?: number;
    showHeader?: boolean;
}

/**
 * Skeleton loader for table content.
 * Displays animated placeholder rows while data is loading.
 */
export const TableSkeleton = ({ rows = 5, cols = 5, showHeader = true }: TableSkeletonProps) => (
    <div className="animate-pulse">
        {/* Header skeleton */}
        {showHeader && (
            <div className="bg-gray-50 border-b px-4 py-3 flex gap-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={`header-${i}`} className="h-3 bg-gray-200 rounded flex-1" />
                ))}
            </div>
        )}

        {/* Row skeletons */}
        <div className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="px-4 py-3 flex gap-4 items-center">
                    {Array.from({ length: cols }).map((_, colIndex) => (
                        <div
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="h-4 bg-gray-200 rounded flex-1"
                            style={{
                                // Vary widths slightly for more natural look
                                maxWidth: colIndex === 0 ? '120px' : colIndex === cols - 1 ? '200px' : undefined,
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    </div>
);
