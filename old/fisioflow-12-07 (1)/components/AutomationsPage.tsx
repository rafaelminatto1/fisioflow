
import React, { useState, useMemo } from 'react';
import { Automation, AutomationActionType, AutomationTriggerType, User, FormTemplate } from '../types';
import { useAutomations } from '../hooks/useAutomations';
import { useFormTemplates } from '../hooks/useFormTemplates';
import { useUsers } from '../hooks/useUsers';
import { IconPlus, IconZap, IconPencil, IconTrash, IconArrowDown, IconAlertTriangle } from './icons/IconComponents';
import EmptyState from './ui/EmptyState';
import Button from './ui/Button';
import { AutomationModal } from './AutomationModal';
import Skeleton from './ui/Skeleton';

const triggerText: Record<AutomationTriggerType, (value?: number) => string> = {
    [AutomationTriggerType.SESSIONS_COMPLETED]: (value) => `Paciente completa ${value} sessões`,
    [AutomationTriggerType.PAYMENT_OVERDUE]: (value) => `Pagamento fica ${value} dias atrasado`,
    [AutomationTriggerType.PATIENT_CREATED]: () => 'Novo paciente é cadastrado',
};

const actionText = (action: Automation['action'], formTemplates: FormTemplate[], users: User[]): string => {
    switch (action.type) {
        case AutomationActionType.CREATE_TASK:
            const assignee = users.find(u => u.id === action.assigneeId);
            return `Criar tarefa: "${action.value}"${assignee ? ` para ${assignee.name}` : ''}`;
        case AutomationActionType.SEND_FORM:
            const form = formTemplates.find(f => f.id === action.value);
            return `Enviar formulário: "${form?.name || 'Formulário'}"`;
        default:
            return 'Ação desconhecida';
    }
};

const AutomationsPage: React.FC = () => {
    const { automations = [], saveAutomation, deleteAutomation, isLoading, isError } = useAutomations();
    const { templates: formTemplates = [] } = useFormTemplates();
    const { users: allUsers = [] } = useUsers();
    
    const users = useMemo(() => allUsers.filter(u => u.role !== 'paciente'), [allUsers]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAutomation, setSelectedAutomation] = useState<Partial<Automation> | null>(null);

    const handleOpenModal = (automation: Partial<Automation> | null) => {
        setSelectedAutomation(automation);
        setIsModalOpen(true);
    };

    const handleSave = async (automationToSave: Automation) => {
        await saveAutomation(automationToSave);
        setIsModalOpen(false);
    };

    const handleDelete = async (automationId: string) => {
        if(window.confirm('Tem certeza que deseja excluir esta automação?')) {
            await deleteAutomation(automationId);
        }
    }
    
    const renderContent = () => {
        if (isLoading) {
             return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bento-box space-y-3 h-48">
                            <Skeleton className="h-5 w-3/4 rounded" />
                             <Skeleton className="h-10 w-full rounded" />
                             <Skeleton className="h-4 w-1/4" />
                             <Skeleton className="h-10 w-full rounded" />
                        </div>
                    ))}
                </div>
            );
        }
        
        if (isError) {
             return (
                <EmptyState 
                    icon={<IconAlertTriangle size={32} />}
                    title="Erro ao Carregar Automações"
                    message="Não foi possível buscar os dados. Tente recarregar a página."
                />
            )
        }
        
        if (automations.length > 0) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {automations.map(automation => (
                        <div key={automation.id} className="bento-box group relative">
                             <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(automation)} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconPencil size={14} /></button>
                                <button onClick={() => handleDelete(automation.id)} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconTrash size={14} /></button>
                            </div>
                            <h3 className="font-semibold text-slate-100 text-base mb-3 truncate">{automation.name}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="bg-slate-900/50 p-2 rounded-md">
                                    <p className="text-xs font-semibold text-slate-400">QUANDO...</p>
                                    <p className="text-slate-200">{triggerText[automation.trigger.type](automation.trigger.value)}</p>
                                </div>
                                <div className="flex justify-center">
                                    <IconArrowDown className="text-slate-500" />
                                </div>
                                <div className="bg-slate-900/50 p-2 rounded-md">
                                     <p className="text-xs font-semibold text-slate-400">ENTÃO...</p>
                                    <p className="text-slate-200">{actionText(automation.action, formTemplates, users)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
        }
        
        return (
            <EmptyState
                icon={<IconZap size={32} />}
                title="Nenhuma Automação Criada"
                message="Automatize tarefas repetitivas e garanta a consistência dos seus processos."
                action={
                    <Button onClick={() => handleOpenModal({})} icon={<IconPlus />}>
                        Criar Primeira Automação
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Automações</h1>
                <Button onClick={() => handleOpenModal({})} icon={<IconPlus />}>
                    Nova Automação
                </Button>
            </header>
            
            {renderContent()}

            {isModalOpen && (
                <AutomationModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    automation={selectedAutomation}
                    formTemplates={formTemplates}
                    users={users}
                />
            )}
        </div>
    );
};

export default AutomationsPage;
