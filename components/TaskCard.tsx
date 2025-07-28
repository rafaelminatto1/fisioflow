import React from 'react';

import { TASK_PRIORITY_STYLES } from '../constants';
import { Task, User } from '../types';

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
      className="cursor-grab rounded-lg border border-slate-700 bg-slate-900 p-4 transition-all duration-200 hover:bg-slate-800 hover:border-slate-600 hover:shadow-lg active:cursor-grabbing"
      role="button"
      aria-label={`Abrir detalhes da tarefa: ${task.title}`}
    >
      {/* Header com título e avatar */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="pr-2 text-sm font-semibold text-slate-100 leading-tight">
          {task.title}
        </h3>
        {assignee && (
          <div className="flex-shrink-0">
            <img
              src={assignee.avatarUrl}
              alt={assignee.name}
              title={assignee.name}
              className="h-8 w-8 rounded-full border-2 border-slate-600 shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Descrição */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer com prioridade e informações adicionais */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityStyle.color} ${priorityStyle.bg}`}
            title={`Prioridade ${task.priority}`}
          >
            <span className="mr-1">{priorityStyle.icon}</span>
            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
          </span>
        </div>
        
        {/* ID da tarefa para referência */}
        <span className="text-xs text-slate-500 font-mono">
          #{task.id.split('-')[1]}
        </span>
      </div>
    </div>
  );
};

export default TaskCard;
