import React from 'react';
import Skeleton from './Skeleton';

const PatientListItemSkeleton: React.FC = () => {
  return (
    <li className="p-4 flex items-center justify-between">
      <div className="flex items-center">
        <Skeleton className="w-12 h-12 rounded-full mr-4" />
        <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
        </div>
      </div>
    </li>
  );
};

export default PatientListItemSkeleton;
