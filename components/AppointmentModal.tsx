import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentModalProps } from '../types';
import { useAuth } from '../hooks/useAuth';
import {
  IconX,
  IconTrash,
  IconSparkles,
  IconCopy,
  IconCheckCircle,
} from './icons/IconComponents';
import { generateSOAPNote } from '../services/geminiService';
import { useNotification } from '../hooks/useNotification';

type AppointmentErrors = {
  title?: string;
  patientId?: string;
  therapistId?: string;
  start?: string;
  end?: string;
};

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  appointment,
  users,
  patients,
  initialDate,
}) => {
  const [editedAppt, setEditedAppt] = useState<Partial<Appointment> | null>(
    null
  );
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errors, setErrors] = useState<AppointmentErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSOAP, setIsGeneratingSOAP] = useState(false);
  const [soapNote, setSoapNote] = useState<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  } | null>(null);
  const { currentTenant } = useAuth();
  const { addNotification } = useNotification();

  useEffect(() => {
    setEditedAppt(appointment);
    setSoapNote(null);
    setIsGeneratingSOAP(false);

    if (appointment && 'start' in appointment && appointment.start) {
      const startDate = new Date(appointment.start);
      setDate(startDate.toISOString().split('T')[0]);
      setStartTime(startDate.toTimeString().substring(0, 5));
    } else if (initialDate) {
      setDate(initialDate);
      setStartTime('');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('');
    }

    if (appointment && 'end' in appointment && appointment.end) {
      const endDate = new Date(appointment.end);
      setEndTime(endDate.toTimeString().substring(0, 5));
    } else {
      setEndTime('');
    }

    setErrors({});
  }, [appointment, initialDate]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditedAppt((prev) => (prev ? { ...prev, [name]: value } : null));
    if (errors[name as keyof AppointmentErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: AppointmentErrors = {};
    if (!editedAppt?.title?.trim()) newErrors.title = 'O título é obrigatório.';
    if (!editedAppt?.patientId) newErrors.patientId = 'Selecione um paciente.';
    if (!editedAppt?.therapistId)
      newErrors.therapistId = 'Selecione um terapeuta.';
    if (!startTime) newErrors.start = 'Horário inicial é obrigatório.';
    if (!endTime) newErrors.end = 'Horário final é obrigatório.';

    if (startTime && endTime && startTime >= endTime) {
      newErrors.end = 'O horário final deve ser após o inicial.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !editedAppt) return;

    setIsSaving(true);
    const startISO = new Date(`${date}T${startTime}`).toISOString();
    const endISO = new Date(`${date}T${endTime}`).toISOString();

    const finalAppointment = {
      ...editedAppt,
      start: startISO,
      end: endISO,
    };

    setTimeout(() => {
      onSave(finalAppointment as Appointment);
      setIsSaving(false);
    }, 300);
  };

  const handleDelete = () => {
    if (
      editedAppt &&
      'id' in editedAppt &&
      window.confirm('Tem certeza que deseja excluir este agendamento?')
    ) {
      onDelete(editedAppt.id!);
    }
  };

  const handleGenerateSOAP = async () => {
    if (!editedAppt?.notes?.trim()) return;
    setIsGeneratingSOAP(true);
    setSoapNote(null);
    try {
      const result = await generateSOAPNote(editedAppt.notes);
      setSoapNote(result);
    } catch (e) {
      console.error(e);
      addNotification({
        type: 'error',
        title: 'Erro de IA',
        message: 'Não foi possível gerar o resumo SOAP.',
      });
    } finally {
      setIsGeneratingSOAP(false);
    }
  };

  const handleCopySOAP = () => {
    if (!soapNote) return;
    const soapText = `Subjetivo:\n${soapNote.subjective}\n\nObjetivo:\n${soapNote.objective}\n\nAvaliação:\n${soapNote.assessment}\n\nPlano:\n${soapNote.plan}`;
    navigator.clipboard.writeText(soapText);
    addNotification({
      type: 'success',
      title: 'Copiado!',
      message: 'Resumo SOAP copiado para a área de transferência.',
    });
  };

  const isNew = !appointment || !('id' in appointment);
  const isPastAppointment =
    appointment &&
    'end' in appointment &&
    new Date(appointment.end!) < new Date();

  if (!isOpen || !editedAppt) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            {isNew ? 'Novo Agendamento' : 'Editar Agendamento'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>

        <main className="space-y-4 overflow-y-auto p-6">
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="text-sm font-medium text-slate-300"
            >
              Título
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={editedAppt.title || ''}
              onChange={handleChange}
              className={`w-full border bg-slate-900 ${errors.title ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500`}
              placeholder="Ex: Sessão de Fisioterapia"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="patientId"
                className="text-sm font-medium text-slate-300"
              >
                Paciente
              </label>
              <select
                name="patientId"
                id="patientId"
                value={editedAppt.patientId || ''}
                onChange={handleChange}
                className={`w-full border bg-slate-900 ${errors.patientId ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Selecione...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.patientId && (
                <p className="mt-1 text-xs text-red-400">{errors.patientId}</p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="therapistId"
                className="text-sm font-medium text-slate-300"
              >
                Terapeuta
              </label>
              <select
                name="therapistId"
                id="therapistId"
                value={editedAppt.therapistId || ''}
                onChange={handleChange}
                className={`w-full border bg-slate-900 ${errors.therapistId ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Selecione...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {errors.therapistId && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.therapistId}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <label
                htmlFor="date"
                className="text-sm font-medium text-slate-300"
              >
                Data
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="startTime"
                className="text-sm font-medium text-slate-300"
              >
                Início
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`w-full border bg-slate-900 ${errors.start ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500`}
              />
              {errors.start && (
                <p className="mt-1 text-xs text-red-400">{errors.start}</p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="endTime"
                className="text-sm font-medium text-slate-300"
              >
                Fim
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full border bg-slate-900 ${errors.end ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500`}
              />
              {errors.end && (
                <p className="mt-1 text-xs text-red-400">{errors.end}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="notes"
              className="text-sm font-medium text-slate-300"
            >
              Notas da Sessão
            </label>
            <textarea
              id="notes"
              name="notes"
              value={editedAppt.notes || ''}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Detalhes da sessão, observações, evolução do paciente, etc."
            />
          </div>

          {currentTenant?.plan === 'platinum' && isPastAppointment && (
            <div className="space-y-3 border-t border-slate-700 pt-4">
              <h3 className="text-sm font-medium text-amber-300">
                Resumo da Sessão (Platinum)
              </h3>
              <button
                onClick={handleGenerateSOAP}
                disabled={isGeneratingSOAP || !editedAppt.notes?.trim()}
                className="flex items-center text-sm text-blue-400 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconSparkles
                  className={`mr-2 ${isGeneratingSOAP ? 'animate-spin' : ''}`}
                />
                {isGeneratingSOAP ? 'Gerando...' : 'Gerar Resumo com IA'}
              </button>
              {soapNote && (
                <div className="space-y-2 rounded-md border border-slate-600 bg-slate-900/70 p-3">
                  {Object.entries(soapNote).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs font-bold capitalize text-slate-300">
                        {key}
                      </p>
                      <p className="text-sm text-slate-200">{value}</p>
                    </div>
                  ))}
                  <button
                    onClick={handleCopySOAP}
                    className="mt-2 flex items-center text-xs text-slate-400 hover:text-white"
                  >
                    <IconCopy className="mr-1" /> Copiar Resumo
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="flex flex-shrink-0 items-center justify-between border-t border-slate-700 bg-slate-800 p-4">
          <div>
            {!isNew && (
              <button
                onClick={handleDelete}
                className="flex items-center rounded-md px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                aria-label="Excluir agendamento"
              >
                <IconTrash className="mr-2" /> Excluir
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="rounded-md bg-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppointmentModal;
