import React, { useState, useCallback, useEffect } from 'react';

import { TASK_STATUSES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { Task } from '../types';

import { IconPlus } from './icons/IconComponents';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import { Button } from './ui/Button';
import PageLoader from './ui/PageLoader';
import PageShell from './ui/PageShell';


const KanbanBoard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user: actingUser } = useAuth();
  const { tasks, saveTask, deleteTask, patients, users } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | Partial<Task> | null>(
    null
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, status: Task['status']) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain');
      const taskToMove = tasks.find((t) => t.id === taskId);
      if (taskToMove && actingUser) {
        saveTask({ ...taskToMove, status }, actingUser);
      }
      e.currentTarget.classList.remove('bg-slate-700/50');
    },
    [tasks, saveTask, actingUser]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-slate-700/50');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('bg-slate-700/50');
  };

  const handleOpenTaskModal = (task: Task | null) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleOpenNewTaskModal = () => {
    setSelectedTask({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      projectId: 'proj-1', // Default project
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleSaveTask = (taskToSave: Task) => {
    if (!actingUser) return;
    saveTask(taskToSave, actingUser);
    handleCloseModal();
  };

  const handleDeleteTask = (taskId: string) => {
    if (!actingUser) return;
    deleteTask(taskId, actingUser);
    handleCloseModal();
  };

  if (isLoading) {
    return <PageLoader message="Carregando quadro de projetos..." />;
  }

  return (
    <PageShell
      title="Quadro de Projetos"
      action={
        <Button onClick={handleOpenNewTaskModal} icon={<IconPlus />}>
          Nova Tarefa
        </Button>
      }
    >
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
            users={users}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onSelectTask={handleOpenTaskModal}
          />
        ))}
      </div>
      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          task={selectedTask}
          users={users.filter((u) => u.role !== 'paciente')}
          patients={patients}
        />
      )}
    </PageShell>
  );
};

export default KanbanBoard;
