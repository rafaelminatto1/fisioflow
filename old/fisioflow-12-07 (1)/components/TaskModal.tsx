
import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskModalProps, UserRole } from '/types.js';
import { useAuth } from '/hooks/useAuth.js';
import { getTaskSummary } from '/services/geminiService.js';
import { TASK_STATUSES, TASK_PRIORITY_STYLES } from '/constants.js';
import { IconSparkles, IconTrash, IconSend } from '/components/icons/IconComponents.js';
import BaseModal from '/components/ui/BaseModal.js';
import Button from '/components/ui/Button.js';
import FormField from '/components/ui/FormField.js';
import { useNotification } from '/hooks/useNotification.js';
import { useComments } from '/hooks/useComments.js';
import { useSettings } from '/hooks/useSettings.js';

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, onDelete, task, users, patients }) => {
  const { user: loggedInUser } = useAuth();
  const { addNotification } = useNotification();
  const { comments: allComments = [], saveComment, deleteComment } = useComments();
  const { settings } = useSettings();

  const [editedTask, setEditedTask] = useState<Task | Partial<Task> | null>(task);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [newComment, setNewComment] = useState('');

  const taskComments = useMemo(() => 
    task && 'id' in task ? allComments.filter(c => c.taskId === task.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [],
  [allComments, task]);

  useEffect(() => {
    setEditedTask(task);
    setAiSummary(''); // Reset AI summary when task changes
    setErrors({}); // Reset errors
    setNewComment('');
  }, [task]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;
    
    setEditedTask(prev => prev ? { ...prev, [name]: isCheckbox ? checked : value } : null);
     if (name === 'title' && value.trim()) {
        setErrors(prev => ({...prev, title: undefined}));
    }
  };

  const validate = (): boolean => {
    const newErrors: { title?: string } = {};
    if (!editedTask?.title?.trim()) {
      newErrors.title = 'O título é obrigatório.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    if (editedTask) {
      setIsSaving(true);
      try {
        await onSave(editedTask as Task);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    if (editedTask && 'id' in editedTask && loggedInUser && window.confirm(`Tem certeza que deseja excluir a tarefa "${editedTask.title}"?`)) {
      await onDelete(editedTask.id!);
    }
  };

  const handleAddComment = async () => {
    if(!newComment.trim() || !loggedInUser || !task || !('id' in task)) return;
    try {
        await saveComment({
            taskId: task.id,
            userId: loggedInUser.id,
            text: newComment,
        });
        setNewComment('');
    } catch(e) {
        // notification is handled by the hook
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if(window.confirm('Tem certeza que deseja excluir este comentário?')) {
        await deleteComment(commentId);
    }
  }

  const handleGetSummary = async () => {
    if (!editedTask?.description) return;
    setIsLoadingAi(true);
    setAiSummary('');
    try {
      const summary = await getTaskSummary(editedTask.description);
      setAiSummary(summary);
    } catch (error) {
       if (error instanceof Error) {
        addNotification({ type: 'error', title: 'Erro da IA', message: error.message });
      }
      setAiSummary('Não foi possível obter a análise da IA.');
    } finally {
      setIsLoadingAi(false);
    }
  };
  
  const isNewTask = !task || !('id' in task);
  const isFormInvalid = !!errors.title;

  if (!isOpen || !editedTask) return null;

  const renderFooter = () => (
     <>
        <div>
            {!isNewTask && (
                <Button variant="ghost" onClick={handleDelete} icon={<IconTrash />}>
                    Excluir
                </Button>
            )}
        </div>
        <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving || isFormInvalid}>
                {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
        </div>
    </>
  );

  return (
    <BaseModal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={isNewTask ? 'Nova Tarefa' : 'Editar Tarefa'}
        footer={renderFooter()}
    >
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
            <div className="space-y-4">
                <FormField
                    label="Título"
                    name="title"
                    id="title"
                    value={editedTask.title || ''}
                    onChange={handleChange}
                    error={errors.title}
                />
                <FormField
                    as="textarea"
                    label="Descrição"
                    name="description"
                    id="description"
                    value={editedTask.description || ''}
                    onChange={handleChange}
                    rows={5}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField as="select" label="Responsável" name="assigneeId" id="assigneeId" value={editedTask.assigneeId || ''} onChange={handleChange}>
                        <option value="">Não atribuído</option>
                        {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </FormField>
                    <FormField as="select" label="Paciente" name="patientId" id="patientId" value={editedTask.patientId || ''} onChange={handleChange}>
                        <option value="">Nenhum paciente associado</option>
                        {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </FormField>
                    <FormField as="select" label="Status" name="status" id="status" value={editedTask.status} onChange={handleChange}>
                        {Object.entries(TASK_STATUSES).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </FormField>
                    <FormField as="select" label="Prioridade" name="priority" id="priority" value={editedTask.priority} onChange={handleChange}>
                        {(Object.keys(TASK_PRIORITY_STYLES) as Array<Task['priority']>).map(key => (
                            <option key={key} value={key} className="capitalize">{key}</option>
                        ))}
                    </FormField>
                </div>
                 <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <label htmlFor="dueDate" className="text-sm font-medium text-slate-300">Data de Vencimento</label>
                        <input
                            type="date"
                            id="dueDate"
                            name="dueDate"
                            value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => setEditedTask(prev => prev ? { ...prev, dueDate: e.target.value ? new Date(e.target.value) : undefined } : null)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>
                     <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isReminder"
                                checked={!!editedTask.isReminder}
                                onChange={handleChange}
                                className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-blue-500 focus:ring-blue-600"
                            />
                            Marcar como lembrete
                        </label>
                    </div>
                </div>
                {loggedInUser?.role === UserRole.FISIOTERAPEUTA && editedTask.status === 'review' && editedTask.description && (settings?.aiMentoringEnabled ?? true) && (
                <div className="pt-4 border-t border-slate-700">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Análise de Mentoria com IA</h3>
                    <Button 
                        onClick={handleGetSummary} 
                        isLoading={isLoadingAi}
                        disabled={isLoadingAi}
                        className="w-full bg-blue-600/20 text-blue-300 hover:bg-blue-600/40"
                        icon={<IconSparkles/>}
                    >
                        {isLoadingAi ? 'Analisando...' : 'Obter Análise da IA'}
                    </Button>
                    {aiSummary && (
                    <div className="mt-3 p-3 bg-slate-900 rounded-md border border-slate-700">
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{aiSummary}</p>
                    </div>
                    )}
                </div>
                )}
            </div>

             <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-4 flex flex-col">
                <h3 className="text-base font-semibold text-slate-200">Comentários</h3>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 -mr-2">
                    {taskComments.length > 0 ? taskComments.map(comment => {
                        const commenter = users.find(u => u.id === comment.userId);
                        const canDelete = loggedInUser?.id === comment.userId || loggedInUser?.role === UserRole.ADMIN;
                        return (
                            <div key={comment.id} className="group flex items-start gap-2">
                                <img src={commenter?.avatarUrl} alt={commenter?.name || 'Avatar do usuário'} className="w-6 h-6 rounded-full mt-1" />
                                <div className="flex-1 bg-slate-900/50 p-2 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-semibold text-slate-300">{commenter?.name}</p>
                                        <p className="text-xs text-slate-500">{new Date(comment.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                                    </div>
                                    <p className="text-sm text-slate-300">{comment.text}</p>
                                </div>
                                {canDelete && 
                                    <button onClick={() => { void handleDeleteComment(comment.id) }} className="opacity-0 group-hover:opacity-100 p-1 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-opacity">
                                        <IconTrash size={12}/>
                                    </button>
                                }
                            </div>
                        )
                    }) : <p className="text-sm text-slate-500 text-center pt-8">Nenhum comentário ainda.</p>}
                </div>
                 <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') void handleAddComment() }}
                        placeholder="Adicionar um comentário..."
                        className="w-full bg-slate-900 border border-slate-600 rounded-full px-3 py-1.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <button onClick={() => { void handleAddComment() }} disabled={!newComment.trim()} className="p-2 rounded-full bg-blue-600 text-white disabled:bg-slate-600 transition-colors">
                        <IconSend size={16}/>
                    </button>
                </div>
            </div>
        </div>
    </BaseModal>
  );
};

export default TaskModal;
