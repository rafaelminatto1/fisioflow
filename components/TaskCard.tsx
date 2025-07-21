import React from 'react';
import { Task, User } from '../types';
import { TASK_PRIORITY_STYLES } from '../constants';

interface TaskCardProps {
  task: Task;
  users: User[];
  onSelect: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, users, onSelect }) => {
  const assignee = task.assigneeId
    ? users.find((u) => u.id === task.assigneeId)
    : null;
  const priorityStyle = TASK_PRIORITY_STYLES[task.priority];

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    taskId: string
  ) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onClick={() => onSelect(task)}
      className="cursor-grab rounded-lg border border-slate-700 bg-slate-900 p-3 transition-colors hover:bg-slate-800 active:cursor-grabbing"
      role="button"
      aria-label={`Abrir detalhes da tarefa: ${task.title}`}
    >
      <div className="flex items-start justify-between">
        <p className="pr-2 text-sm font-medium text-slate-100">{task.title}</p>
        {assignee && (
          <img
            src={assignee.avatarUrl}
            alt={assignee.name}
            title={assignee.name}
            className="h-7 w-7 flex-shrink-0 rounded-full border-2 border-slate-700"
          />
        )}
      </div>
      {task.description && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-400">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center">
          <span
            className={`text-xs font-bold ${priorityStyle.color}`}
            title={`Prioridade ${task.priority}`}
          >
            {priorityStyle.icon}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
