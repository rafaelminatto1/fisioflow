import React from 'react';
import Skeleton from './Skeleton';

const ExerciseCardSkeleton: React.FC = () => {
    return (
        <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
            <div className="flex items-center gap-1">
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-md" />
            </div>
        </div>
    );
};

export default ExerciseCardSkeleton;