
import React, { useState, useEffect } from 'react';
import { Automation, AutomationModalProps, AutomationTriggerType, AutomationActionType } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';

const triggerOptions = [
    { value: AutomationTriggerType.SESSIONS_COMPLETED, label: 'Paciente completa X sessões' },
    { value: AutomationTriggerType.PAYMENT_OVERDUE, label: 'Pagamento fica X dias atrasado' },
    { value: AutomationTriggerType.PATIENT_CREATED, label: 'Novo paciente é cadastrado' },
];

const actionOptions = [
    { value: AutomationActionType.CREATE_TASK, label: 'Criar uma tarefa' },
    { value: AutomationActionType.SEND_FORM, label: 'Enviar um formulário' },
];

export const AutomationModal: React.FC<AutomationModalProps> = ({ isOpen, onClose, onSave, automation, formTemplates, users }) => {
    const [editedAutomation, setEditedAutomation] = useState<Partial<Automation>>(
        automation || {
            name: '',
            trigger: { type: AutomationTriggerType.SESSIONS_COMPLETED, value: 10 },
            action: { type: AutomationActionType.CREATE_TASK, value: '' }
        }
    );

    useEffect(() => {
        setEditedAutomation(automation || {
            name: '',
            trigger: { type: AutomationTriggerType.SESSIONS_COMPLETED, value: 10 },
            action: { type: AutomationActionType.CREATE_TASK, value: '' }
        });
    }, [automation]);

    if (!isOpen || !editedAutomation) return null;

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedAutomation(prev => prev ? { ...prev, name: e.target.value } : null);
    };

    const handleTriggerChange = (field: 'type' | 'value', value: any) => {
        setEditedAutomation(prev => prev ? {
            ...prev,
            trigger: { ...prev.trigger, [field]: value } as Automation['trigger']
        } : null);
    };

    const handleActionChange = (field: 'type' | 'value' | 'assigneeId', value: any) => {
        setEditedAutomation(prev => {
            if (!prev) return null;
            const newAction = { ...prev.action, [field]: value } as Automation['action'];
            // Reset value if action type changes
            if (field === 'type' && prev.action?.type !== value) {
                newAction.value = '';
            }
            return { ...prev, action: newAction };
        });
    };
    
    const handleSave = () => {
        if (editedAutomation.name?.trim()) {
            onSave(editedAutomation as Automation);
        }
    };
    
    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Automação</Button>
        </div>
    );
    
    const triggerRequiresValue = editedAutomation.trigger?.type === AutomationTriggerType.SESSIONS_COMPLETED || editedAutomation.trigger?.type === AutomationTriggerType.PAYMENT_OVERDUE;
    const triggerValueLabel = editedAutomation.trigger?.type === AutomationTriggerType.SESSIONS_COMPLETED ? 'Número de sessões' : 'Dias de atraso';

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={editedAutomation.id ? 'Editar Automação' : 'Nova Automação'} footer={footer}>
            <div className="space-y-6">
                <FormField
                    label="Nome da Automação"
                    name="name"
                    id="name"
                    value={editedAutomation.name || ''}
                    onChange={handleNameChange}
                    placeholder="Ex: Enviar NPS após 10 sessões"
                />
                
                <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg space-y-4">
                    <h3 className="font-semibold text-slate-300">QUANDO... (Gatilho)</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            as="select"
                            label="O seguinte evento ocorre:"
                            name="triggerType"
                            id="triggerType"
                            value={editedAutomation.trigger?.type || ''}
                            onChange={e => handleTriggerChange('type', e.target.value)}
                        >
                            {triggerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </FormField>
                        {triggerRequiresValue && (
                             <FormField
                                type="number"
                                label={triggerValueLabel}
                                name="triggerValue"
                                id="triggerValue"
                                value={String(editedAutomation.trigger?.value || '')}
                                onChange={e => handleTriggerChange('value', parseInt(e.target.value, 10) || 0)}
                            />
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg space-y-4">
                     <h3 className="font-semibold text-slate-300">ENTÃO... (Ação)</h3>
                     <FormField
                        as="select"
                        label="Executar a seguinte ação:"
                        name="actionType"
                        id="actionType"
                        value={editedAutomation.action?.type || ''}
                        onChange={e => handleActionChange('type', e.target.value)}
                    >
                        {actionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </FormField>
                    
                    {editedAutomation.action?.type === AutomationActionType.CREATE_TASK && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                label="Título da Tarefa"
                                name="actionValue"
                                id="actionValue"
                                value={editedAutomation.action?.value || ''}
                                onChange={e => handleActionChange('value', e.target.value)}
                                placeholder="Ex: Ligar para o paciente"
                                containerClassName="md:col-span-2"
                            />
                             <FormField
                                as="select"
                                label="Atribuir para"
                                name="actionAssignee"
                                id="actionAssignee"
                                value={editedAutomation.action?.assigneeId || ''}
                                onChange={e => handleActionChange('assigneeId', e.target.value)}
                            >
                                <option value="">Não atribuído</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </FormField>
                        </div>
                    )}
                    {editedAutomation.action?.type === AutomationActionType.SEND_FORM && (
                        <FormField
                            as="select"
                            label="Formulário a ser enviado"
                            name="actionValue"
                            id="actionValue"
                            value={editedAutomation.action?.value || ''}
                            onChange={e => handleActionChange('value', e.target.value)}
                        >
                             <option value="" disabled>Selecione um formulário...</option>
                             {formTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </FormField>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};
