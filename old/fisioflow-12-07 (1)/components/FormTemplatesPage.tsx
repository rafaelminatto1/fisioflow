
import React, { useState } from 'react';
import { FormTemplate } from '../types';
import { useFormTemplates } from '../hooks/useFormTemplates'; 
import { FormTemplateModal } from './FormTemplateModal'; 
import { IconPlus, IconListChecks, IconPencil, IconTrash, IconAlertTriangle } from './icons/IconComponents';
import EmptyState from './ui/EmptyState';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';

const FormTemplatesPage: React.FC = () => {
    const { templates = [], saveTemplate, deleteTemplate, isLoading, isError } = useFormTemplates();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Partial<FormTemplate> | null>(null);

    const handleOpenModal = (template: Partial<FormTemplate> | null) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    const handleSave = async (templateToSave: FormTemplate) => {
        await saveTemplate(templateToSave);
        setIsModalOpen(false);
    };

    const handleDelete = async (templateId: string) => {
        if(window.confirm('Tem certeza que deseja excluir este formulário?')) {
            await deleteTemplate(templateId);
        }
    };
    
    const renderContent = () => {
        if (isLoading) {
             return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bento-box space-y-3">
                            <Skeleton className="w-8 h-8 rounded" />
                            <Skeleton className="h-5 w-3/4 rounded" />
                            <Skeleton className="h-4 w-1/2 rounded" />
                        </div>
                    ))}
                </div>
            );
        }

        if (isError) {
             return (
                <EmptyState 
                    icon={<IconAlertTriangle size={32} />}
                    title="Erro ao Carregar Formulários"
                    message="Não foi possível buscar os dados. Tente recarregar a página."
                />
            )
        }
        
        if (templates.length > 0) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bento-box group relative">
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(template)}} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconPencil size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(template.id)}} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconTrash size={14} /></button>
                            </div>
                             <IconListChecks className="text-blue-400 mb-3" size={24} />
                            <h3 className="font-semibold text-slate-100 text-base mb-2 truncate">{template.name}</h3>
                             <p className="text-xs text-slate-400 line-clamp-2">
                                {template.description || "Sem descrição."}
                            </p>
                        </div>
                    ))}
                </div>
            )
        }
        
        return (
            <EmptyState
                icon={<IconListChecks size={32} />}
                title="Nenhum Formulário Criado"
                message="Crie formulários e questionários para enviar aos seus pacientes."
                action={
                    <Button onClick={() => handleOpenModal({})} icon={<IconPlus />}>
                        Criar Primeiro Formulário
                    </Button>
                }
            />
        );
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Formulários e Questionários</h1>
                <Button onClick={() => handleOpenModal({})} icon={<IconPlus />}>
                    Novo Formulário
                </Button>
            </header>
            
            {renderContent()}

            {isModalOpen && (
                <FormTemplateModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    template={selectedTemplate}
                />
            )}
        </div>
    );
};

export default FormTemplatesPage;
