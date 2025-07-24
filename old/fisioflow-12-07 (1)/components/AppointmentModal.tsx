
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Appointment, AppointmentModalProps, Patient, SessionNote, UserRole, AppointmentType, Service, ClinicalProtocol, AppointmentLog } from '../types.js';
import { IconX, IconTrash, IconFileText, IconPlus, IconUser, IconSearch, IconHistory } from './icons/IconComponents.js';
import SessionNoteModal from './SessionNoteModal.js';
import { useSessionNotes } from '../hooks/useSessionNotes.js';
import Button from './ui/Button.js';
import { useAuth } from '../hooks/useAuth.js';
import { usePatientDetailData } from '../hooks/usePatientDetailData.js';
import { useAppointmentLogs } from '../hooks/useAppointmentLogs.js';
import { z } from 'zod';
import { appointmentSchema } from '../lib/schemas.js';
import BaseModal from './ui/BaseModal.js';
import AppointmentLogModal from './AppointmentLogModal.js';
import FormField from './ui/FormField.js';

const AppointmentModal: React.FC<AppointmentModalProps> = ({
    isOpen, onClose, onSave, onDelete, onAddNewPatient, appointment,
    users, patients, services, protocols, initialDate, isSchedulingNext
}) => {
    const { user } = useAuth();
    const [editedAppt, setEditedAppt] = useState<Partial<Appointment> | null>(null);
    const [errors, setErrors] = useState<z.ZodFormattedError<Partial<Appointment>> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    // State for patient autocomplete
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Patient[]>([]);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [isCreatingPatient, setIsCreatingPatient] = useState(false);
    const patientInputRef = useRef<HTMLInputElement>(null);

    const { logs } = useAppointmentLogs(appointment?.id || '');

    const isNew = !appointment || !('id' in appointment);

    useEffect(() => {
        const selectedPatient = patients.find(p => p.id === appointment?.patientId);
        setPatientSearchTerm(selectedPatient?.name || '');

        const now = new Date();
        const start = appointment?.start ? new Date(appointment.start) : initialDate ? new Date(initialDate) : new Date();
        if (isNew && !appointment?.start) {
            // Round to next 30 minutes
            const minutes = start.getMinutes();
            if (minutes > 30) {
                start.setHours(start.getHours() + 1, 0, 0, 0);
            } else if (minutes > 0) {
                start.setMinutes(30, 0, 0);
            }
        }
        
        const end = appointment?.end ? new Date(appointment.end) : new Date(start.getTime() + 60 * 60 * 1000);

        setEditedAppt({
            ...appointment,
            title: appointment?.title || (selectedPatient ? `Sessão - ${selectedPatient.name}` : ''),
            start: start.toISOString(),
            end: end.toISOString(),
            therapistId: appointment?.therapistId || user?.id,
            type: appointment?.type || AppointmentType.SESSAO,
            status: appointment?.status || 'agendado',
        });
        
        setErrors(null);
    }, [appointment, isOpen, initialDate, user, patients]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedAppt(prev => prev ? { ...prev, [name]: value } : null);
         if (errors && name in errors) {
            setErrors(null);
        }
    };

    const handleDateTimeChange = (field: 'start' | 'end', part: 'date' | 'time', value: string) => {
        setEditedAppt(prev => {
            if (!prev) return null;
            const currentDateTime = new Date(prev[field]!);
            if (part === 'date') {
                const [year, month, day] = value.split('-').map(Number);
                currentDateTime.setFullYear(year, month - 1, day);
            } else {
                const [hours, minutes] = value.split(':').map(Number);
                currentDateTime.setHours(hours, minutes);
            }
            return { ...prev, [field]: currentDateTime.toISOString() };
        });
    };
    
    useEffect(() => {
        if (patientSearchTerm) {
            setSuggestions(patients.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase())));
            setIsSuggestionsOpen(true);
        } else {
            setSuggestions([]);
            setIsSuggestionsOpen(false);
        }
    }, [patientSearchTerm, patients]);

    const handlePatientSelect = (patient: Patient) => {
        setEditedAppt(prev => {
            if(!prev) return null;
            const newTitle = prev.title?.startsWith('Sessão -') || !prev.title ? `Sessão - ${patient.name}` : prev.title;
            return { ...prev, patientId: patient.id, title: newTitle };
        });
        setPatientSearchTerm(patient.name);
        setIsSuggestionsOpen(false);
    };

    const handleAddNewPatientClick = async () => {
        if (!patientSearchTerm.trim() || isCreatingPatient) return;
        setIsCreatingPatient(true);
        const newPatient = await onAddNewPatient(patientSearchTerm);
        if (newPatient) {
            handlePatientSelect(newPatient);
        }
        setIsCreatingPatient(false);
    };

    const handleSave = async () => {
        if (!editedAppt) return;
        
        const dataToValidate = { ...editedAppt, title: editedAppt.title || `Sessão - ${patients.find(p=>p.id === editedAppt.patientId)?.name}`};

        const validation = appointmentSchema.safeParse(dataToValidate);
        if (!validation.success) {
            setErrors(validation.error.format());
            return;
        }

        setIsSaving(true);
        await onSave(validation.data);
        setIsSaving(false);
    };

    const handleDelete = () => {
        if (editedAppt?.id) {
            onDelete(editedAppt.id);
        }
    };
    
    const { sessionNotes: sessionNotesData } = useSessionNotes();
    const sessionNoteForAppointment = sessionNotesData?.find(note => note.id === appointment?.sessionNoteId);
    const { patient: patientForNote, patientAssessments, patientSessionNotes } = usePatientDetailData(appointment?.patientId || null);

    if (!isOpen || !editedAppt) return null;

    const title = isNew ? (isSchedulingNext ? `Agendar Próxima - ${patients.find(p=>p.id === editedAppt.patientId)?.name}` : 'Novo Agendamento') : 'Editar Agendamento';

    const renderFooter = () => (
        <>
            <div className="flex items-center gap-2">
                {!isNew && (
                    <Button variant="ghost" onClick={handleDelete} icon={<IconTrash />} > Excluir </Button>
                )}
                {!isNew && (
                     <Button variant="ghost" onClick={() => setIsLogModalOpen(true)} icon={<IconHistory />}> Histórico </Button>
                )}
            </div>
            <div className="flex items-center space-x-3">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
            </div>
        </>
    );

    return (
        <>
            <BaseModal isOpen={isOpen} onClose={onClose} title={title} footer={renderFooter()}>
                <div className="space-y-4">
                    <FormField
                        label="Título do Agendamento" name="title" id="title"
                        value={editedAppt.title || ''}
                        onChange={handleChange}
                        error={errors?.title?._errors[0]}
                    />

                    <div className="relative">
                        <FormField
                            label="Paciente" name="patient" id="patient"
                            ref={patientInputRef}
                            value={patientSearchTerm}
                            onChange={(e) => {
                                setPatientSearchTerm(e.target.value)
                                setEditedAppt(prev => prev ? {...prev, patientId: ''} : null)
                            }}
                            placeholder="Buscar ou criar novo paciente..."
                            autoComplete="off"
                            error={errors?.patientId?._errors[0]}
                        />
                        {isSuggestionsOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {suggestions.map(p => (
                                    <div key={p.id} onClick={() => handlePatientSelect(p)} className="px-4 py-2 hover:bg-slate-700 cursor-pointer">{p.name}</div>
                                ))}
                                {patientSearchTerm && !suggestions.find(s => s.name.toLowerCase() === patientSearchTerm.toLowerCase()) && (
                                    <Button variant="ghost" onClick={handleAddNewPatientClick} isLoading={isCreatingPatient} className="w-full text-blue-400 justify-start">
                                        <IconPlus size={16} className="mr-2"/> Criar novo paciente: "{patientSearchTerm}"
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            as="select"
                            label="Tipo" name="type" id="type"
                            value={editedAppt.type}
                            onChange={handleChange}
                        >
                            <option value={AppointmentType.AVALIACAO}>Avaliação</option>
                            <option value={AppointmentType.SESSAO}>Sessão</option>
                            <option value={AppointmentType.RETORNO}>Retorno</option>
                        </FormField>
                        <FormField
                            as="select"
                            label="Terapeuta" name="therapistId" id="therapistId"
                            value={editedAppt.therapistId}
                            onChange={handleChange}
                            error={errors?.therapistId?._errors[0]}
                        >
                            {users.filter(u => u.role !== UserRole.PACIENTE).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="Data" type="date" name="startDate" id="startDate"
                            value={new Date(editedAppt.start!).toISOString().split('T')[0]}
                            onChange={(e) => {
                                handleDateTimeChange('start', 'date', e.target.value);
                                handleDateTimeChange('end', 'date', e.target.value);
                            }}
                        />
                        <FormField
                            as="select"
                            label="Status" name="status" id="status"
                            value={editedAppt.status}
                            onChange={handleChange}
                        >
                            <option value="agendado">Agendado</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="realizado">Realizado</option>
                            <option value="cancelado">Cancelado</option>
                            <option value="em_atendimento">Em Atendimento</option>
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="Início" type="time" name="startTime" id="startTime"
                            value={new Date(editedAppt.start!).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            onChange={(e) => handleDateTimeChange('start', 'time', e.target.value)}
                        />
                        <FormField
                            label="Fim" type="time" name="endTime" id="endTime"
                            value={new Date(editedAppt.end!).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            onChange={(e) => handleDateTimeChange('end', 'time', e.target.value)}
                            error={errors?.end?._errors[0]}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            as="select" label="Serviço" name="serviceId" id="serviceId"
                            value={editedAppt.serviceId || ''} onChange={handleChange}
                        >
                            <option value="">Nenhum</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </FormField>
                        <FormField
                            as="select" label="Protocolo" name="protocolId" id="protocolId"
                            value={editedAppt.protocolId || ''} onChange={handleChange}
                        >
                             <option value="">Nenhum</option>
                             {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </FormField>
                    </div>

                    <FormField
                        as="textarea"
                        label="Observações" name="notes" id="notes"
                        value={editedAppt.notes || ''}
                        onChange={handleChange}
                        rows={3}
                    />

                    {!isNew && (
                        <Button
                            variant="secondary"
                            onClick={() => setIsNoteModalOpen(true)}
                            icon={<IconFileText />}
                        >
                            {appointment?.sessionNoteId ? 'Ver/Editar Nota da Sessão' : 'Criar Nota da Sessão'}
                        </Button>
                    )}
                </div>
            </BaseModal>

            {isLogModalOpen && <AppointmentLogModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} logs={logs || []} />}

            {isNoteModalOpen && patientForNote && editedAppt && (
                <SessionNoteModal
                    isOpen={isNoteModalOpen}
                    onClose={() => setIsNoteModalOpen(false)}
                    onSave={console.log}
                    onDelete={console.log}
                    appointment={editedAppt as Appointment}
                    patient={patientForNote}
                    allPatientAssessments={patientAssessments}
                    allPatientSessionNotes={patientSessionNotes}
                    onCloseAndScheduleNext={() => {}}
                    onCloseAndCreateTask={() => {}}
                />
            )}
        </>
    );
};

export default AppointmentModal;
