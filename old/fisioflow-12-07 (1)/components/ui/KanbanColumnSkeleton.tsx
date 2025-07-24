import React from 'react';
import Skeleton from './Skeleton';
import { TASK_STATUSES, TASK_STATUS_COLORS } from '../../constants';
import { Task } from '../../types';

interface KanbanColumnSkeletonProps {
  status: Task['status'];
}

const KanbanColumnSkeleton: React.FC<KanbanColumnSkeletonProps> = ({ status }) => {
  const statusColor = TASK_STATUS_COLORS[status] || 'bg-gray-500';

  return (
    <div className="bg-slate-800/80 rounded-lg p-4 h-full min-h-[300px] flex flex-col border border-slate-700 w-[300px] flex-shrink-0">
      <div className="flex items-center mb-4">
        <span className={`w-3 h-3 rounded-full ${statusColor} mr-2`}></span>
        <h2 className="font-semibold text-slate-100">{TASK_STATUSES[status]}</h2>
        <Skeleton className="ml-2 w-8 h-5 rounded-full" />
      </div>
      <div className="space-y-3">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
          <Skeleton className="h-4 w-3/4 mb-3 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
         <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
          <Skeleton className="h-4 w-5/6 mb-3 rounded" />
        </div>
         <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
          <Skeleton className="h-4 w-2/3 mb-3 rounded" />
           <Skeleton className="h-3 w-full rounded" />
        </div>
      </div>
    </div>
  );
};

export default KanbanColumnSkeleton;
