
import React, { useState, useEffect } from 'react';
import { FormTemplate, FormQuestion, FormQuestionType } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';
import { IconPlus, IconTrash, IconArrowUp, IconArrowDown } from './icons/IconComponents';

interface FormTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: FormTemplate) => void;
    template: Partial<FormTemplate> | null;
}

const QuestionEditor: React.FC<{
    question: FormQuestion;
    index: number;
    onUpdate: (index: number, updatedQuestion: FormQuestion) => void;
    onRemove: (index: number) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ question, index, onUpdate, onRemove, onMove, isFirst, isLast }) => {

    const handleQuestionChange = (field: keyof FormQuestion, value: any) => {
        onUpdate(index, { ...question, [field]: value });
    };

    const handleOptionChange = (optionIndex: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[optionIndex] = value;
        handleQuestionChange('options', newOptions);
    };

    const addOption = () => {
        const newOptions = [...(question.options || []), `Opção ${ (question.options?.length || 0) + 1 }`];
        handleQuestionChange('options', newOptions);
    };

    const removeOption = (optionIndex: number) => {
        const newOptions = (question.options || []).filter((_, i) => i !== optionIndex);
        handleQuestionChange('options', newOptions);
    };
    
    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-3">
            <div className="flex justify-between items-start">
                <FormField
                    label={`Questão ${index + 1}`} name={`q-label-${index}`} id={`q-label-${index}`}
                    value={question.label} onChange={(e) => handleQuestionChange('label', e.target.value)}
                    placeholder="Digite o texto da questão"
                    containerClassName="flex-grow"
                />
                <div className="flex items-center gap-1 pl-4 pt-6">
                    <button onClick={() => onMove(index, 'up')} disabled={isFirst} className="p-1 disabled:opacity-30"><IconArrowUp size={16}/></button>
                    <button onClick={() => onMove(index, 'down')} disabled={isLast} className="p-1 disabled:opacity-30"><IconArrowDown size={16}/></button>
                    <button onClick={() => onRemove(index)} className="p-1 text-red-400"><IconTrash size={16}/></button>
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField as="select" label="Tipo de Questão" name={`q-type-${index}`} id={`q-type-${index}`} value={question.type} onChange={(e) => handleQuestionChange('type', e.target.value as FormQuestionType)}>
                    <option value="text">Texto Curto</option>
                    <option value="textarea">Texto Longo</option>
                    <option value="number">Número</option>
                    <option value="scale">Escala (ex: 0-10)</option>
                    <option value="multiple-choice">Múltipla Escolha</option>
                    <option value="checkbox">Caixa de Seleção</option>
                </FormField>
                <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                         <input type="checkbox" checked={question.required} onChange={(e) => handleQuestionChange('required', e.target.checked)} className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-blue-500 focus:ring-blue-600"/>
                         Obrigatória
                    </label>
                </div>
             </div>
             { (question.type === 'multiple-choice' || question.type === 'checkbox') && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400">Opções</label>
                    {question.options?.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input type="text" value={opt} onChange={(e) => handleOptionChange(i, e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-100 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                            <button onClick={() => removeOption(i)} className="p-1 text-red-400"><IconTrash size={16} /></button>
                        </div>
                    ))}
                    <Button variant="ghost" onClick={addOption} icon={<IconPlus size={14} />}>Adicionar Opção</Button>
                </div>
             )}
             { question.type === 'scale' && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <FormField label="Mín." name={`q-min-${index}`} id={`q-min-${index}`} type="number" value={String(question.scaleMin ?? 0)} onChange={e => handleQuestionChange('scaleMin', parseInt(e.target.value, 10))} />
                     <FormField label="Máx." name={`q-max-${index}`} id={`q-max-${index}`} type="number" value={String(question.scaleMax ?? 10)} onChange={e => handleQuestionChange('scaleMax', parseInt(e.target.value, 10))} />
                     <FormField label="Label Mín." name={`q-minlabel-${index}`} id={`q-minlabel-${index}`} value={question.scaleMinLabel || ''} onChange={e => handleQuestionChange('scaleMinLabel', e.target.value)} placeholder="Ex: Sem dor" />
                     <FormField label="Label Máx." name={`q-maxlabel-${index}`} id={`q-maxlabel-${index}`} value={question.scaleMaxLabel || ''} onChange={e => handleQuestionChange('scaleMaxLabel', e.target.value)} placeholder="Ex: Pior dor" />
                 </div>
             )}
        </div>
    );
}

export const FormTemplateModal: React.FC<FormTemplateModalProps> = ({ isOpen, onClose, onSave, template }) => {
    const [editedTemplate, setEditedTemplate] = useState<Partial<FormTemplate>>(template || { name: '', description: '', questions: [] });
    
    useEffect(() => {
        setEditedTemplate(template || { name: '', description: '', questions: [] });
    }, [template]);

    if (!isOpen || !editedTemplate) return null;

    const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditedTemplate(prev => prev ? { ...prev, [e.target.name]: e.target.value } : null);
    };

    const addQuestion = () => {
        const newQuestion: FormQuestion = {
            id: `q-${crypto.randomUUID()}`,
            type: 'text',
            label: '',
            required: false,
        };
        setEditedTemplate(prev => ({
            ...prev,
            questions: [...(prev?.questions || []), newQuestion]
        }));
    };
    
    const updateQuestion = (index: number, updatedQuestion: FormQuestion) => {
        setEditedTemplate(prev => {
            if (!prev) return null;
            const newQuestions = [...(prev.questions || [])];
            newQuestions[index] = updatedQuestion;
            return { ...prev, questions: newQuestions };
        });
    };

    const removeQuestion = (index: number) => {
        setEditedTemplate(prev => {
            if (!prev) return null;
            return {
                ...prev,
                questions: (prev.questions || []).filter((_, i) => i !== index)
            }
        });
    };

    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        setEditedTemplate(prev => {
            if (!prev || !prev.questions) return null;
            const newQuestions = [...prev.questions];
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= newQuestions.length) return prev;

            [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]]; // Swap
            return { ...prev, questions: newQuestions };
        });
    };

    const handleSave = () => {
        if (editedTemplate.name?.trim()) {
            onSave(editedTemplate as FormTemplate);
        }
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Formulário</Button>
        </div>
    );
    
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={editedTemplate.id ? 'Editar Formulário' : 'Novo Formulário'} footer={footer}>
            <div className="space-y-4">
                <FormField
                    label="Nome do Formulário" name="name" id="name"
                    value={editedTemplate.name || ''} onChange={handleTemplateChange}
                />
                <FormField as="textarea" label="Descrição" name="description" id="description"
                    value={editedTemplate.description || ''} onChange={handleTemplateChange} rows={2}
                />
                
                <h3 className="text-sm font-semibold text-slate-300 pt-2 border-t border-slate-700">Questões</h3>
                <div className="space-y-4">
                    {editedTemplate.questions?.map((q, i) => (
                        <QuestionEditor 
                            key={q.id || i} 
                            question={q} 
                            index={i} 
                            onUpdate={updateQuestion} 
                            onRemove={removeQuestion}
                            onMove={moveQuestion}
                            isFirst={i === 0}
                            isLast={i === (editedTemplate.questions?.length || 0) - 1}
                        />
                    ))}
                </div>
                 <Button variant="ghost" onClick={addQuestion} icon={<IconPlus />}>
                    Adicionar Questão
                </Button>
            </div>
        </BaseModal>
    );
};
