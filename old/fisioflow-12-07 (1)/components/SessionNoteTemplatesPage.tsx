

import React, { useState } from 'react';
import { SessionNoteTemplate } from '../types';
import { useSessionNoteTemplates } from '../hooks/useSessionNoteTemplates';
import { IconPlus, IconFilePlus, IconPencil, IconTrash, IconAlertTriangle } from './icons/IconComponents';
import EmptyState from './ui/EmptyState';
import BaseModal from './ui/BaseModal';
import FormField from './ui/FormField';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';

const SessionNoteTemplateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: SessionNoteTemplate) => void;
    template: Partial<SessionNoteTemplate> | null;
}> = ({ isOpen, onClose, onSave, template }) => {
    const [editedTemplate, setEditedTemplate] = useState(template);
    
    React.useEffect(() => {
        setEditedTemplate(template);
    }, [template]);

    if (!isOpen || !editedTemplate) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditedTemplate(prev => prev ? { ...prev, [e.target.name]: e.target.value } : null);
    };

    const handleSave = () => {
        if (editedTemplate.name?.trim()) {
            onSave(editedTemplate as SessionNoteTemplate);
        }
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Template</Button>
        </div>
    );
    
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={editedTemplate.id ? 'Editar Template' : 'Novo Template de Nota'} footer={footer}>
            <div className="space-y-4">
                <FormField
                    label="Nome do Template" name="name" id="name"
                    value={editedTemplate.name || ''} onChange={handleChange}
                    placeholder="Ex: Sessão Padrão - Evolução Positiva"
                />
                <FormField as="textarea" label="Descrição" name="description" id="description"
                    value={editedTemplate.description || ''} onChange={handleChange} rows={2}
                    placeholder="Para que este template é usado."
                />
                <h3 className="text-sm font-semibold text-slate-300 pt-2 border-t border-slate-700">Conteúdo do Template (SOAP)</h3>
                <FormField as="textarea" label="Subjetivo (S)" name="subjective" id="subjective" value={editedTemplate.subjective || ''} onChange={handleChange} rows={3} />
                <FormField as="textarea" label="Objetivo (O)" name="objective" id="objective" value={editedTemplate.objective || ''} onChange={handleChange} rows={3} />
                <FormField as="textarea" label="Avaliação (A)" name="assessment" id="assessment" value={editedTemplate.assessment || ''} onChange={handleChange} rows={3} />
                <FormField as="textarea" label="Plano (P)" name="plan" id="plan" value={editedTemplate.plan || ''} onChange={handleChange} rows={3} />
            </div>
        </BaseModal>
    );
};

const SessionNoteTemplatesPage: React.FC = () => {
    const { templates = [], saveTemplate, deleteTemplate, isLoading, isError } = useSessionNoteTemplates();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Partial<SessionNoteTemplate> | null>(null);

    const handleOpenModal = (template: Partial<SessionNoteTemplate> | null) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    const handleSave = async (templateToSave: SessionNoteTemplate) => {
        await saveTemplate(templateToSave);
        setIsModalOpen(false);
    };

    const handleDelete = async (templateId: string) => {
        if(window.confirm('Tem certeza que deseja excluir este template?')) {
            await deleteTemplate(templateId);
        }
    }
    
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
            )
        }

        if (isError) {
             return (
                <EmptyState 
                    icon={<IconAlertTriangle size={32} />}
                    title="Erro ao Carregar Templates"
                    message="Não foi possível buscar os dados. Tente recarregar a página."
                />
            )
        }

        if (templates.length > 0) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bento-box group relative cursor-pointer" onClick={() => handleOpenModal(template)}>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(template)}} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconPencil size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(template.id)}} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconTrash size={14} /></button>
                            </div>
                             <IconFilePlus className="text-blue-400 mb-3" size={24} />
                            <h3 className="font-semibold text-slate-100 text-base mb-2 truncate">{template.name}</h3>
                             <p className="text-xs text-slate-400 line-clamp-2">
                                {template.description || "Sem descrição."}
                            </p>
                        </div>
                    ))}
                </div>
            );
        }
        return (
             <EmptyState
                icon={<IconFilePlus size={32} />}
                title="Nenhum Template Criado"
                message="Crie templates para agilizar a documentação de suas sessões."
                action={
                    <Button onClick={() => handleOpenModal({})} icon={<IconPlus />}>
                        Criar Primeiro Template
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Templates de Nota de Sessão</h1>
                <Button onClick={() => handleOpenModal({})} icon={<IconPlus />}>
                    Novo Template
                </Button>
            </header>

            {renderContent()}

            {isModalOpen && (
                <SessionNoteTemplateModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    template={selectedTemplate}
                />
            )}
        </div>
    );
};

export default SessionNoteTemplatesPage;