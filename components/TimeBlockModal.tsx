import React, { useState, useEffect } from 'react';
import { TimeBlock, User } from '../types';
import BaseModal from './ui/BaseModal';
import FormField from './ui/FormField';

interface TimeBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (timeBlock: TimeBlock) => void;
  onDelete?: (timeBlockId: string) => void;
  timeBlock: TimeBlock | Partial<TimeBlock> | null;
  users: User[];
  initialDate?: string;
}

const TimeBlockModal: React.FC<TimeBlockModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  timeBlock,
  users,
  initialDate,
}) => {
  const [title, setTitle] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<'break' | 'lunch' | 'unavailable'>('break');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (timeBlock) {
      setTitle(timeBlock.title || '');
      setTherapistId(timeBlock.therapistId || '');
      setType(timeBlock.type || 'break');
      setDescription(timeBlock.description || '');

      if (timeBlock.start) {
        const startDateTime = new Date(timeBlock.start);
        setStartDate(startDateTime.toISOString().split('T')[0]);
        setStartTime(startDateTime.toTimeString().slice(0, 5));
      }
      if (timeBlock.end) {
        const endDateTime = new Date(timeBlock.end);
        setEndDate(endDateTime.toISOString().split('T')[0]);
        setEndTime(endDateTime.toTimeString().slice(0, 5));
      }
    }

    if (initialDate) {
      setStartDate(initialDate);
      setEndDate(initialDate);
    }
  }, [timeBlock, initialDate]);

  const handleSave = () => {
    if (
      !title ||
      !therapistId ||
      !startDate ||
      !startTime ||
      !endDate ||
      !endTime
    )
      return;

    const startISO = new Date(`${startDate}T${startTime}`).toISOString();
    const endISO = new Date(`${endDate}T${endTime}`).toISOString();

    const timeBlockToSave: TimeBlock = {
      ...(timeBlock as TimeBlock),
      title,
      therapistId,
      start: startISO,
      end: endISO,
      type,
      description,
      tenantId: (timeBlock as TimeBlock)?.tenantId || '',
    };

    onSave(timeBlockToSave);
  };

  const handleDelete = () => {
    if (timeBlock && 'id' in timeBlock && timeBlock.id && onDelete) {
      onDelete(timeBlock.id);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        timeBlock && 'id' in timeBlock ? 'Editar Bloqueio' : 'Novo Bloqueio'
      }
    >
      <div className="space-y-4">
        <FormField label="Título" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Almoço, Reunião, etc."
          />
        </FormField>

        <FormField label="Tipo" required>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as 'break' | 'lunch' | 'unavailable')
            }
            className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="break">Pausa</option>
            <option value="lunch">Almoço</option>
            <option value="unavailable">Indisponível</option>
          </select>
        </FormField>

        <FormField label="Terapeuta" required>
          <select
            value={therapistId}
            onChange={(e) => setTherapistId(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um terapeuta</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Data de Início" required>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </FormField>

          <FormField label="Hora de Início" required>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Data de Término" required>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </FormField>

          <FormField label="Hora de Término" required>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </div>

        <FormField label="Descrição">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            placeholder="Detalhes opcionais sobre o bloqueio..."
          />
        </FormField>
      </div>

      <div className="mt-6 flex justify-between">
        <div>
          {timeBlock && 'id' in timeBlock && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              Excluir
            </button>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-600 px-4 py-2 text-slate-100 transition-colors hover:bg-slate-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              !title ||
              !therapistId ||
              !startDate ||
              !startTime ||
              !endDate ||
              !endTime
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            Salvar
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TimeBlockModal;
