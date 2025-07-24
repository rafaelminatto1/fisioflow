import React, { useState } from 'react';
import { AssessmentTemplate, RangeOfMotionEntry, MuscleStrengthEntry, FunctionalTestEntry } from '../types';
import { useAssessmentTemplates } from '../hooks/useAssessmentTemplates';
import { IconPlus, IconFileCheck, IconPencil, IconTrash, IconAlertTriangle } from './icons/IconComponents';
import EmptyState from './ui/EmptyState';
import BaseModal from './ui/BaseModal';
import FormField from './ui/FormField';
import Button from './ui/Button';

const AssessmentTemplateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: AssessmentTemplate) => void;
    template: Partial<AssessmentTemplate> | null;
}> = ({ isOpen, onClose, onSave, template }) => {
    const [editedTemplate, setEditedTemplate] = useState(template);
    
    React.useEffect(() => {
        setEditedTemplate(template);
    }, [template]);

    if (!isOpen || !editedTemplate) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumeric = name === 'painLevel';
        setEditedTemplate(prev => prev ? { ...prev, [name]: isNumeric ? Number(value) : value } : null);
    };

    const handleTableChange = <T,>(
        fieldName: 'rangeOfMotion' | 'muscleStrength' | 'functionalTests',
        index: number,
        field: keyof T,
        value: string
    ) => {
        setEditedTemplate(prev => {
            if (!prev) return null;
            const tableData = ((prev[fieldName] as unknown) as T[] | undefined) || [];
            const updatedTableData = [...tableData];
            updatedTableData[index] = { ...updatedTableData[index], [field]: value };
            return { ...prev, [fieldName]: updatedTableData };
        });
    };

     const addTableRow = (fieldName: 'rangeOfMotion' | 'muscleStrength' | 'functionalTests', newRow: any) => {
        setEditedTemplate(prev => {
             if (!prev) return null;
             const tableData = (prev[fieldName] as any[] | undefined) || [];
             return { ...prev, [fieldName]: [...tableData, { ...newRow }]};
        });
    };

    const removeTableRow = (fieldName: 'rangeOfMotion' | 'muscleStrength' | 'functionalTests', index: number) => {
        setEditedTemplate(prev => {
             if (!prev) return null;
             const tableData = (prev[fieldName] as any[] | undefined) || [];
             return { ...prev, [fieldName]: tableData.filter((_, i) => i !== index) };
        });
    }

    const handleSave = () => {
        if (editedTemplate.name?.trim()) {
            onSave(editedTemplate as AssessmentTemplate);
        }
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Template</Button>
        </div>
    );
    
    const renderTableEditor = <T,>(
        title: string,
        fieldName: 'rangeOfMotion' | 'muscleStrength' | 'functionalTests',
        columns: { header: string, field: keyof T, placeholder: string }[],
        newRow: Omit<T, 'id'>
    ) => (
        <div className="space-y-2">
             <h4 className="text-sm font-semibold text-slate-300">{title}</h4>
            <div className="overflow-x-auto border border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-slate-900/50">
                        <tr>
                            {columns.map(col => <th key={String(col.field)} className="px-3 py-2 text-left font-medium text-slate-400">{col.header}</th>)}
                            <th className="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {(((editedTemplate[fieldName] as unknown) as T[]) || []).map((row, index) => (
                            <tr key={index}>
                                {columns.map(col => (
                                    <td key={String(col.field)} className="px-1 py-1">
                                        <input
                                            type="text"
                                            value={String(row[col.field] || '')}
                                            onChange={e => handleTableChange<T>(fieldName, index, col.field, e.target.value)}
                                            placeholder={col.placeholder}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                        />
                                    </td>
                                ))}
                                 <td className="px-1 py-1">
                                    <button onClick={() => removeTableRow(fieldName, index)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md"><IconTrash size={14}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button onClick={() => addTableRow(fieldName, newRow)} className="flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors">
                <IconPlus size={14} className="mr-1"/> Adicionar Linha
            </button>
        </div>
    );
    
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={editedTemplate.id ? 'Editar Template de Avaliação' : 'Novo Template de Avaliação'} footer={footer}>
            <div className="space-y-4">
                <FormField
                    label="Nome do Template" name="name" id="name"
                    value={editedTemplate.name || ''} onChange={handleChange}
                    placeholder="Ex: Avaliação de Joelho - Padrão LCA"
                />
                <FormField as="textarea" label="Descrição" name="description" id="description"
                    value={editedTemplate.description || ''} onChange={handleChange} rows={2}
                    placeholder="Descrição breve do propósito deste template"
                />
                
                <h3 className="text-sm font-semibold text-slate-300 pt-2 border-t border-slate-700">Estrutura da Avaliação</h3>
                
                <FormField as="textarea" label="Queixa Principal (Modelo)" name="mainComplaint" id="mainComplaint"
                    value={editedTemplate.mainComplaint || ''} onChange={handleChange} rows={2}
                    placeholder="Dor e instabilidade no joelho [D/E]..."
                />
                 <FormField as="textarea" label="Histórico (Modelo)" name="history" id="history"
                    value={editedTemplate.history || ''} onChange={handleChange} rows={3}
                    placeholder="Paciente refere entorse em [valgo/varo] do joelho..."
                />

                {renderTableEditor<Omit<RangeOfMotionEntry, 'id' | 'active' | 'passive'>>(
                    'Amplitude de Movimento (ADM)', 'rangeOfMotion',
                    [{ header: 'Articulação', field: 'joint', placeholder: 'Joelho' }, { header: 'Movimento', field: 'movement', placeholder: 'Flexão' }],
                    { joint: '', movement: '' }
                )}

                 {renderTableEditor<Omit<MuscleStrengthEntry, 'id' | 'grade'>>(
                    'Força Muscular', 'muscleStrength',
                    [{ header: 'Músculo', field: 'muscle', placeholder: 'Quadríceps' }],
                    { muscle: '' }
                )}

                {renderTableEditor<Omit<FunctionalTestEntry, 'id' | 'result'>>(
                    'Testes Funcionais', 'functionalTests',
                    [{ header: 'Nome do Teste', field: 'testName', placeholder: 'Teste de Lachman' }],
                    { testName: '' }
                )}
            </div>
        </BaseModal>
    );
};

const AssessmentTemplatesPage: React.FC = () => {
    const { templates = [], saveTemplate, deleteTemplate, isLoading, isError } = useAssessmentTemplates();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Partial<AssessmentTemplate> | null>(null);

    const handleOpenModal = (template: Partial<AssessmentTemplate> | null) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    const handleSave = async (templateToSave: AssessmentTemplate) => {
        await saveTemplate(templateToSave);
        setIsModalOpen(false);
    };

    const handleDelete = async (templateId: string) => {
        if(window.confirm('Tem certeza que deseja excluir este template?')) {
            await deleteTemplate(templateId);
        }
    }
    
    if (isLoading) {
        return <div>Carregando templates...</div>;
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

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Templates de Avaliação</h1>
                <Button onClick={() => handleOpenModal({})} icon={<IconPlus />}>
                    Novo Template
                </Button>
            </header>

            {templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bento-box group relative cursor-pointer" onClick={() => handleOpenModal(template)}>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(template)}} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconPencil size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(template.id)}} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconTrash size={14} /></button>
                            </div>
                             <IconFileCheck className="text-blue-400 mb-3" size={24} />
                            <h3 className="font-semibold text-slate-100 text-base mb-2 truncate">{template.name}</h3>
                             <p className="text-xs text-slate-400 line-clamp-2">
                                {template.description || "Sem descrição."}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<IconFileCheck size={32} />}
                    title="Nenhum Template Criado"
                    message="Crie templates para agilizar e padronizar suas avaliações."
                    action={
                        <Button onClick={() => handleOpenModal({})} icon={<IconPlus />}>
                            Criar Primeiro Template
                        </Button>
                    }
                />
            )}

            {isModalOpen && (
                <AssessmentTemplateModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    template={selectedTemplate}
                />
            )}
        </div>
    );
};

export default AssessmentTemplatesPage;