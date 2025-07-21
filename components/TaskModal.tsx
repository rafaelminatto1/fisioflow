import React, { useState, useEffect } from 'react';
import { Task, TaskModalProps, UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getTaskSummary } from '../services/geminiService';
import { TASK_STATUSES, TASK_PRIORITY_STYLES } from '../constants';
import { IconSparkles, IconTrash } from './icons/IconComponents';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  task,
  users,
  patients,
}) => {
  const { user: loggedInUser } = useAuth();
  const [editedTask, setEditedTask] = useState<Task | Partial<Task> | null>(
    task
  );
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedTask(task);
    setAiSummary(''); // Reset AI summary when task changes
    setErrors({}); // Reset errors
  }, [task]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditedTask((prev) => (prev ? { ...prev, [name]: value } : null));
    if (name === 'title' && value.trim()) {
      setErrors((prev) => ({ ...prev, title: undefined }));
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

  const handleSave = () => {
    if (!validate()) return;

    if (editedTask) {
      setIsSaving(true);
      // Simulate async operation
      setTimeout(() => {
        onSave(editedTask as Task);
        setIsSaving(false);
      }, 300);
    }
  };

  const handleDelete = () => {
    if (
      editedTask &&
      'id' in editedTask &&
      window.confirm(
        `Tem certeza que deseja excluir a tarefa "${editedTask.title}"?`
      )
    ) {
      onDelete(editedTask.id!);
    }
  };

  const handleGetSummary = async () => {
    if (!editedTask?.description) return;
    setIsLoadingAi(true);
    setAiSummary('');
    try {
      const summary = await getTaskSummary(editedTask.description);
      setAiSummary(summary);
    } catch (error) {
      console.error(error);
      setAiSummary('Erro ao gerar o resumo.');
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
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          disabled={isSaving || isFormInvalid}
        >
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          as="select"
          label="Responsável"
          name="assigneeId"
          id="assigneeId"
          value={editedTask.assigneeId || ''}
          onChange={handleChange}
        >
          <option value="">Não atribuído</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </FormField>
        <FormField
          as="select"
          label="Paciente"
          name="patientId"
          id="patientId"
          value={editedTask.patientId || ''}
          onChange={handleChange}
        >
          <option value="">Nenhum paciente associado</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </FormField>
        <FormField
          as="select"
          label="Status"
          name="status"
          id="status"
          value={editedTask.status}
          onChange={handleChange}
        >
          {Object.entries(TASK_STATUSES).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </FormField>
        <FormField
          as="select"
          label="Prioridade"
          name="priority"
          id="priority"
          value={editedTask.priority}
          onChange={handleChange}
        >
          {Object.keys(TASK_PRIORITY_STYLES).map((key) => (
            <option key={key} value={key} className="capitalize">
              {key}
            </option>
          ))}
        </FormField>
      </div>

      {loggedInUser?.role === UserRole.FISIOTERAPEUTA &&
        editedTask.status === 'review' &&
        editedTask.description && (
          <div className="border-t border-slate-700 pt-4">
            <h3 className="mb-2 text-sm font-medium text-slate-300">
              Análise de Mentoria com IA
            </h3>
            <Button
              onClick={handleGetSummary}
              isLoading={isLoadingAi}
              disabled={isLoadingAi}
              className="w-full bg-blue-600/20 text-blue-300 hover:bg-blue-600/40"
              icon={<IconSparkles />}
            >
              {isLoadingAi ? 'Analisando...' : 'Obter Análise da IA'}
            </Button>
            {aiSummary && (
              <div className="mt-3 rounded-md border border-slate-700 bg-slate-900 p-3">
                <p className="whitespace-pre-wrap text-sm text-slate-300">
                  {aiSummary}
                </p>
              </div>
            )}
          </div>
        )}
    </BaseModal>
  );
};

export default TaskModal;
