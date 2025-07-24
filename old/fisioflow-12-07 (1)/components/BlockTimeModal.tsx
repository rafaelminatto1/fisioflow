
import React, { useState, useEffect } from 'react';
import { BlockTimeModalProps, Appointment, AppointmentType } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';
import { useAuth } from '../hooks/useAuth';

const BlockTimeModal: React.FC<BlockTimeModalProps> = ({ isOpen, onClose, onSave, initialDate }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('12:00');
    const [endTime, setEndTime] = useState('13:00');
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialDate) {
            setDate(initialDate);
        }
    }, [initialDate]);

    const handleSave = () => {
        if (!title.trim()) {
            setError('O título é obrigatório.');
            return;
        }

        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        if (startDateTime >= endDateTime) {
            setError('O horário final deve ser após o inicial.');
            return;
        }

        setError('');

        const blockAppointment: Partial<Appointment> = {
            title,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            type: AppointmentType.BLOQUEIO,
            therapistId: user?.id || '',
            patientId: '', // No patient for block time
            status: 'agendado',
        };

        onSave(blockAppointment);
        onClose();
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Bloqueio</Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Bloquear Horário" footer={footer}>
            <div className="space-y-4">
                <FormField
                    label="Motivo do Bloqueio"
                    name="title"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Almoço, Reunião, Pessoal"
                    error={error.includes('título') ? error : undefined}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        label="Data"
                        name="date"
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        containerClassName="md:col-span-1"
                    />
                    <FormField
                        label="Início"
                        name="startTime"
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                    />
                    <FormField
                        label="Fim"
                        name="endTime"
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        error={error.includes('horário') ? error : undefined}
                    />
                </div>
            </div>
        </BaseModal>
    );
};

export default BlockTimeModal;
