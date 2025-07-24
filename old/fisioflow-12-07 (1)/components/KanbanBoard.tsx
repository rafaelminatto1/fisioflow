import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Task, Project } from '../types.js';
import KanbanColumn from './KanbanColumn.js';
import TaskModal from './TaskModal.js';
import { IconPlus, IconFolder } from './icons/IconComponents.js';
import { TASK_PRIORITY_STYLES, TASK_STATUSES } from '../constants.js';
import { useTasks } from '../hooks/useTasks.js';
import { useUsers } from '../hooks/useUsers.js';
import { usePatients } from '../hooks/usePatients.js';
import { useNotification } from '../hooks/useNotification.js';
import KanbanColumnSkeleton from './ui/KanbanColumnSkeleton.js';
import { useProjects } from '../hooks/useProjects.js';
import ProjectModal from './ProjectModal.js';
import Button from './ui/Button.js';
import { useAuth } from '../hooks/useAuth.js';

const KanbanBoard: React.FC = () => {
  const { user } = useAuth();
  const { tasks = [], saveTask, deleteTask, isLoading: isLoadingTasks, isError: isErrorTasks } = useTasks();
  const { users = [], isLoading: isLoadingUsers } = useUsers();
  const { patients = [], isLoading: isLoadingPatients } = usePatients();
  const { projects = [], saveProject, isLoading: isLoadingProjects } = useProjects();
  const { addNotification } = useNotification();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | Partial<Task> | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  const isLoading = isLoadingTasks || isLoadingUsers || isLoadingPatients || isLoadingProjects;

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
        setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);
  
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);
  
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter(task => task.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    return projectTasks.filter(task => {
        const matchesAssignee = assigneeFilter === 'all' || task.assigneeId === assigneeFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        return matchesAssignee && matchesPriority;
    });
  }, [projectTasks, assigneeFilter, priorityFilter]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, status: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const taskToMove = tasks.find(t => t.id === taskId);
    if(taskToMove && taskToMove.status !== status) {
        try {
            await saveTask({ ...taskToMove, status });
             addNotification({ type: 'info', title: 'Tarefa Movida', message: `A tarefa "${taskToMove.title}" foi movida para "${TASK_STATUSES[status]}".` });
        } catch (error) {
            addNotification({ type: 'error', title: 'Erro ao Mover Tarefa', message: (error as Error).message });
        }
    }
    e.currentTarget.classList.remove('bg-blue-900/20', 'border-blue-500', 'border-dashed');
  }, [tasks, saveTask, addNotification]);
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-900/20', 'border-blue-500', 'border-dashed');
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.currentTarget.classList.remove('bg-blue-900/20', 'border-blue-500', 'border-dashed');
  };

  const handleOpenTaskModal = (task: Task | null) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenNewTaskModal = () => {
    if(!selectedProjectId) {
      addNotification({type: 'error', title: 'Nenhum Projeto Selecionado', message: 'Por favor, selecione um projeto antes de criar uma tarefa.'});
      return;
    }
    setSelectedTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        projectId: selectedProjectId
    });
    setIsTaskModalOpen(true);
  };
  
  const handleOpenProjectModal = () => {
    if (!user) return;
    setIsProjectModalOpen(true);
  }
  
  const handleSaveProject = async (project: Project) => {
    await saveProject(project);
    setIsProjectModalOpen(false);
  }

  const handleCloseModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  const handleSaveTask = async (task: Task) => {
    try {
        await saveTask(task);
        addNotification({type: 'success', title: 'Tarefa Salva', message: `A tarefa "${task.title}" foi salva com sucesso.`});
        handleCloseModal();
    } catch (e) {
        addNotification({type: 'error', title: 'Erro ao Salvar', message: (e as Error).message});
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
        const taskTitle = tasks.find(t => t.id === taskId)?.title || 'a tarefa';
        await deleteTask({ taskId, userId: user!.id });
        addNotification({type: 'info', title: 'Tarefa Excluída', message: `A tarefa "${taskTitle}" foi excluída.`});
        handleCloseModal();
    } catch (e) {
        addNotification({type: 'error', title: 'Erro ao Excluir', message: (e as Error).message});
    }
  };

  const renderContent = () => {
      if (isLoading) {
          return (
              <div className="flex overflow-x-auto space-x-4 pb-4">
                  {(Object.keys(TASK_STATUSES) as Array<Task['status']>).map(status => (
                      <KanbanColumnSkeleton key={status} status={status} />
                  ))}
              </div>
          )
      }
      if (isErrorTasks) {
          return <div className="text-center p-8 bg-slate-800 rounded-lg text-red-400">Erro ao carregar as tarefas.</div>
      }
      return (
          <div className="flex overflow-x-auto space-x-4 pb-4">
            {(Object.keys(TASK_STATUSES) as Array<Task['status']>).map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={filteredTasks.filter(task => task.status === status)}
                users={users}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onSelectTask={handleOpenTaskModal}
              />
            ))}
          </div>
      );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
                <IconFolder size={32} className="text-blue-400 flex-shrink-0" />
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">{selectedProject?.name || 'Carregando Projeto...'}</h1>
                    <p className="text-sm text-slate-400 max-w-lg truncate">{selectedProject?.description}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <select 
                    value={selectedProjectId || ''} 
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                >
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Button variant="secondary" onClick={handleOpenProjectModal}>Novo Projeto</Button>
            </div>
        </div>
       <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex-grow md:flex-grow-0">
                    <label htmlFor="assigneeFilter" className="text-sm font-medium text-slate-400 sr-only">Filtrar por Responsável</label>
                    <select 
                        id="assigneeFilter"
                        value={assigneeFilter} 
                        onChange={e => setAssigneeFilter(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    >
                        <option value="all">Todos os Responsáveis</option>
                        {users.filter(u => u.role !== 'paciente').map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-grow md:flex-grow-0">
                    <label htmlFor="priorityFilter" className="text-sm font-medium text-slate-400 sr-only">Filtrar por Prioridade</label>
                    <select 
                        id="priorityFilter"
                        value={priorityFilter} 
                        onChange={e => setPriorityFilter(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    >
                        <option value="all">Todas as Prioridades</option>
                        {(Object.keys(TASK_PRIORITY_STYLES) as Array<Task['priority']>).map(p => (
                            <option key={p} value={p} className="capitalize">{p}</option>
                        ))}
                    </select>
                </div>
            </div>
            <Button onClick={handleOpenNewTaskModal} icon={<IconPlus />}>Nova Tarefa</Button>
        </div>
      {renderContent()}
      
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          task={selectedTask}
          users={users.filter(u => u.role !== 'paciente')}
          patients={patients}
        />
      )}

      {isProjectModalOpen && user && (
        <ProjectModal
            isOpen={isProjectModalOpen}
            onClose={() => setIsProjectModalOpen(false)}
            onSave={handleSaveProject}
            project={{ ownerId: user.id, memberIds: [user.id] }}
            users={users}
        />
      )}
    </div>
  );
};

export default KanbanBoard;