import React, { useMemo } from 'react';
import { Task, User } from '../types.js';
import { TASK_PRIORITY_STYLES } from '../constants.js';
import { useComments } from '../hooks/useComments.js';
import { IconMessageCircle } from './icons/IconComponents.js';

interface TaskCardProps {
  task: Task;
  users: User[];
  onSelect: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, users, onSelect }) => {
  const assignee = task.assigneeId ? users.find(u => u.id === task.assigneeId) : null;
  const priorityStyle = TASK_PRIORITY_STYLES[task.priority];
  const { comments: allComments = [] } = useComments();

  const commentCount = useMemo(() => 
    allComments.filter(c => c.taskId === task.id).length, 
  [allComments, task.id]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onClick={() => onSelect(task)}
      className="bg-slate-900 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-colors"
      role="button"
      aria-label={`Abrir detalhes da tarefa: ${task.title}`}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-slate-100 pr-2">{task.title}</p>
        {assignee && (
          <img
            src={assignee.avatarUrl}
            alt={assignee.name}
            title={assignee.name}
            className="w-7 h-7 rounded-full flex-shrink-0 border-2 border-slate-700"
          />
        )}
      </div>
      {task.description && (
          <p className="text-xs text-slate-400 mt-2 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center">
            <span className={`font-bold text-xs ${priorityStyle.color}`} title={`Prioridade ${task.priority}`}>
                {priorityStyle.icon}
            </span>
        </div>
        {commentCount > 0 && (
          <div className="flex items-center text-xs text-slate-400 gap-1">
            <IconMessageCircle size={14}/>
            <span>{commentCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;