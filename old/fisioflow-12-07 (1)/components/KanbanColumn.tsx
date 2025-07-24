import React from 'react';
import { Task, User } from '../types.js';
import TaskCard from './TaskCard.js';
import { TASK_STATUSES, TASK_STATUS_COLORS } from '../constants.js';

interface KanbanColumnProps {
  status: Task['status'];
  tasks: Task[];
  users: User[];
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: Task['status']) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onSelectTask: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tasks, users, onDrop, onDragOver, onDragLeave, onSelectTask }) => {
  const statusColor = TASK_STATUS_COLORS[status] || 'bg-gray-500';

  return (
    <div
      onDrop={(e) => onDrop(e, status)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className="bg-slate-800/80 rounded-lg p-4 h-full min-h-[300px] flex flex-col transition-colors duration-300 border border-slate-700 w-[300px] flex-shrink-0"
    >
      <div className="flex items-center mb-4">
        <span className={`w-3 h-3 rounded-full ${statusColor} mr-2`}></span>
        <h2 className="font-semibold text-slate-100">{TASK_STATUSES[status]}</h2>
        <span className="ml-2 text-sm text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} users={users} onSelect={onSelectTask} />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;