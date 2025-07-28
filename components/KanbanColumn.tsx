import React from 'react';

import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '../constants';
import { Task, User } from '../types';

import TaskCard from './TaskCard';

interface KanbanColumnProps {
  status: Task['status'];
  tasks: Task[];
  users: User[];
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: Task['status']) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onSelectTask: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  users,
  onDrop,
  onDragOver,
  onDragLeave,
  onSelectTask,
}) => {
  const statusColor = TASK_STATUS_COLORS[status] || '#6b7280';

  return (
    <div
      onDrop={(e) => onDrop(e, status)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className="flex h-full min-h-[300px] w-[300px] flex-shrink-0 flex-col rounded-lg border border-slate-700 bg-slate-800/80 p-4 transition-colors duration-300"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <span 
            className="h-3 w-3 rounded-full mr-2" 
            style={{ backgroundColor: statusColor }}
          ></span>
          <h2 className="font-semibold text-slate-100">
            {TASK_STATUS_LABELS[status]}
          </h2>
        </div>
        <span className="bg-slate-700 text-slate-300 text-xs font-medium px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            users={users}
            onSelect={onSelectTask}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;
