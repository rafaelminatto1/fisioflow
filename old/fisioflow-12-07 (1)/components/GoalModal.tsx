import React, { useState, useEffect } from 'react';
import { GoalModalProps, TherapistGoal } from '../types';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { suggestTherapistGoals } from '../services/geminiService.ts';
import { useNotification } from '../hooks/useNotification';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';
import { IconSparkles, IconTrash } from './icons/IconComponents';

type GoalErrors = {
    description?: string;
    currentValue?: string;
    targetValue?: string;
    unit?: string;
    startDate?: string;
    targetDate?: string;
};

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, onDelete, goal, patientId, assessment }) => {
    usePreventBodyScroll(isOpen);
    const { addNotification } = useNotification();
    const [editedGoal, setEditedGoal] = useState<Partial<TherapistGoal> | null>(null);
    const [errors, setErrors] = useState<GoalErrors>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<{ description: string; targetValue: number; unit: string }[] | null>(null);

    useEffect(() => {
        const initialGoal = {
            ...goal,
            patientId,
            startDate: goal?.startDate || new Date().toISOString().split('T')[0],
            targetDate: goal?.targetDate || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        };
        setEditedGoal(initialGoal);
        setErrors({});
        setAiSuggestions(null);
    }, [goal, patientId]);
    
    const validate = (): boolean => {
        const newErrors: GoalErrors = {};
        if (!editedGoal?.description?.trim()) newErrors.description = 'A descrição é obrigatória.';
        if (editedGoal?.currentValue === undefined || isNaN(editedGoal.currentValue)) newErrors.currentValue = 'Valor inválido.';
        if (!editedGoal?.targetValue || isNaN(editedGoal.targetValue)) newErrors.targetValue = 'Valor inválido.';
        if (!editedGoal?.unit?.trim()) newErrors.unit = 'A unidade é obrigatória.';
        if (!editedGoal?.startDate) newErrors.startDate = 'Data inicial obrigatória.';
        if (!editedGoal?.targetDate) newErrors.targetDate = 'Data alvo obrigatória.';
        if (editedGoal?.startDate && editedGoal.targetDate && new Date(editedGoal.startDate) >= new Date(editedGoal.targetDate)) {
            newErrors.targetDate = 'A data alvo deve ser posterior à inicial.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['currentValue', 'targetValue'].includes(name);
        setEditedGoal(prev => prev ? { ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value } : null);
        if (errors[name as keyof GoalErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };
    
    const handleSave = () => {
        if (!validate() || !editedGoal) return;
        setIsSaving(true);
        setTimeout(() => {
            onSave(editedGoal as TherapistGoal);
            setIsSaving(false);
        }, 300);
    };

    const handleDelete = () => {
        if (editedGoal && 'id' in editedGoal && window.confirm('Tem certeza que deseja excluir esta meta?')) {
            onDelete(editedGoal.id!);
        }
    };

    const handleSuggestGoals = async () => {
        if (!assessment) return;
        setIsLoadingAi(true);
        setAiSuggestions(null);
        try {
            const suggestions = await suggestTherapistGoals(assessment);
            setAiSuggestions(suggestions);
        } catch (error) {
            if (error instanceof Error) {
                addNotification({ type: 'error', title: 'Erro da IA', message: error.message });
            }
        } finally {
            setIsLoadingAi(false);
        }
    };
    
    const applySuggestion = (suggestion: { description: string; targetValue: number; unit: string }) => {
        setEditedGoal(prev => ({...prev, ...suggestion, currentValue: 0}));
        setAiSuggestions(null);
    };

    const isNew = !goal || !('id' in goal);

    if (!isOpen || !editedGoal) return null;

    const renderFooter = () => (
        <>
            <div>
                {!isNew && <Button variant="ghost" onClick={handleDelete} icon={<IconTrash />}>Excluir</Button>}
            </div>
            <div className="flex items-center space-x-3">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Meta'}
                </Button>
            </div>
        </>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isNew ? 'Nova Meta Clínica' : 'Editar Meta Clínica'}
            footer={renderFooter()}
        >
            <div className="space-y-4">
                <FormField
                    label="Descrição da Meta"
                    name="description"
                    id="description"
                    value={editedGoal.description || ''}
                    onChange={handleChange}
                    error={errors.description}
                    placeholder="Ex: Amplitude de flexão do joelho"
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        label="Data de Início"
                        name="startDate"
                        id="startDate"
                        type="date"
                        value={editedGoal.startDate ? new Date(editedGoal.startDate).toISOString().split('T')[0] : ''}
                        onChange={handleChange}
                        error={errors.startDate}
                    />
                    <FormField
                        label="Data Alvo"
                        name="targetDate"
                        id="targetDate"
                        type="date"
                        value={editedGoal.targetDate ? new Date(editedGoal.targetDate).toISOString().split('T')[0] : ''}
                        onChange={handleChange}
                        error={errors.targetDate}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField
                        label="Valor Inicial"
                        name="currentValue"
                        id="currentValue"
                        type="number"
                        value={String(editedGoal.currentValue || '0')}
                        onChange={handleChange}
                        error={errors.currentValue}
                    />
                    <FormField
                        label="Valor Alvo"
                        name="targetValue"
                        id="targetValue"
                        type="number"
                        value={String(editedGoal.targetValue || '')}
                        onChange={handleChange}
                        error={errors.targetValue}
                    />
                    <FormField
                        label="Unidade"
                        name="unit"
                        id="unit"
                        value={editedGoal.unit || ''}
                        onChange={handleChange}
                        error={errors.unit}
                        placeholder="Ex: graus, cm, %"
                    />
                </div>
                <FormField
                    as="textarea"
                    label="Observações (opcional)"
                    name="observations"
                    id="observations"
                    value={editedGoal.observations || ''}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Notas sobre a medição ou contexto da meta..."
                />
                 {assessment?.diagnosticHypothesis && (
                     <div className="pt-2">
                        <Button 
                            variant="ghost" 
                            onClick={handleSuggestGoals} 
                            isLoading={isLoadingAi}
                            disabled={isLoadingAi}
                            icon={<IconSparkles/>}
                        >
                            {isLoadingAi ? 'Sugerindo...' : 'Sugerir com IA'}
                        </Button>
                         {aiSuggestions && (
                            <div className="mt-2 space-y-2">
                                <p className="text-xs text-slate-400">Sugestões baseadas em "{assessment.diagnosticHypothesis}":</p>
                                {aiSuggestions.map((sug, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => applySuggestion(sug)}
                                        className="w-full text-left p-2 bg-blue-900/50 border border-blue-500/30 rounded-md hover:bg-blue-900/80 transition-colors"
                                    >
                                        <p className="font-semibold text-blue-300 text-sm">{sug.description}</p>
                                        <p className="text-xs text-blue-400">Meta: {sug.targetValue} {sug.unit}</p>
                                    </button>
                                ))}
                            </div>
                         )}
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default GoalModal;