
import React, { useState, useEffect } from 'react';
import { SendFormModalProps } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export const SendFormModal: React.FC<SendFormModalProps> = ({ isOpen, onClose, onSend, templates, patientName }) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    useEffect(() => {
        if (templates.length > 0) {
            setSelectedTemplateId(templates[0].id);
        }
    }, [templates]);

    if (!isOpen) return null;

    const handleSend = () => {
        if (selectedTemplateId) {
            onSend(selectedTemplateId);
        }
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSend} disabled={!selectedTemplateId}>Enviar Formulário</Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={`Enviar Formulário para ${patientName}`} footer={footer}>
            <div className="space-y-4">
                <p className="text-sm text-slate-400">Selecione o formulário que deseja enviar. O paciente será notificado e poderá respondê-lo em seu portal.</p>
                
                <label htmlFor="templateId" className="block text-sm font-medium text-slate-300">Formulários Disponíveis</label>
                <select 
                    id="templateId" 
                    value={selectedTemplateId} 
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                     {templates.length > 0 ? (
                        templates.map(template => (
                            <option key={template.id} value={template.id}>{template.name}</option>
                        ))
                    ) : (
                        <option disabled>Nenhum template de formulário encontrado.</option>
                    )}
                </select>
            </div>
        </BaseModal>
    );
};
