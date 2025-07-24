
import React, { useState, useEffect } from 'react';
import { default as ReactMarkdown } from 'react-markdown';
import { default as remarkGfm } from 'remark-gfm';
import { AssessmentModalProps, Assessment, RangeOfMotionEntry, MuscleStrengthEntry, FunctionalTestEntry, UserRole, Exercise, BodyChartMarking } from '../types';
import { useAuth } from '../hooks/useAuth';
import { IconX, IconTrash, IconPlus, IconPencil, IconSparkles } from './icons/IconComponents';
import { generateTreatmentPlan, recommendExercises, analyzeBodyChart } from '../services/geminiService';
import { useNotification } from '../hooks/useNotification';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import Button from './ui/Button';
import { useSettings } from '../hooks/useSettings';
import BodyChart from './BodyChart';

type AssessmentErrors = {
    mainComplaint?: string;
    diagnosticHypothesis?: string;
};

const Slider: React.FC<{
    label: string;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    minLabel: string;
    maxLabel: string;
    readOnly?: boolean;
}> = ({ label, value, onChange, minLabel, maxLabel, readOnly }) => {
    const getSliderColor = (value: number) => {
        const percentage = value * 10;
        let colorFrom = '#3b82f6';
        let colorTo = '#ef4444';
        
        if (label.toLowerCase().includes('dor')) {
            if (percentage <= 50) {
                const r = Math.round(74 + (239 - 74) * (percentage/50));
                const g = Math.round(222 - (239 - 222) * (percentage/50));
                const b = Math.round(129 - (129-80) * (percentage/50));
                colorFrom = `rgb(${r},${g},${b})`;
            } else {
                 const r = 239;
                 const g = Math.round(239 - (239-68) * ((percentage-50)/50));
                 const b = Math.round(80 - (80-68) * ((percentage-50)/50));
                 colorFrom = `rgb(${r},${g},${b})`;
            }
             return `linear-gradient(90deg, ${colorFrom} ${percentage}%, #475569 ${percentage}%)`;
        }

        return `linear-gradient(90deg, #3b82f6 ${percentage}%, #475569 ${percentage}%)`;
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">{label}</label>
                <span className="text-sm font-bold text-slate-100 bg-slate-700 px-2 py-0.5 rounded">{value}</span>
            </div>
            <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={value}
                onChange={onChange}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                style={{ background: getSliderColor(value) }}
                disabled={readOnly}
            />
            <div className="flex justify-between text-xs text-slate-400">
                <span>{minLabel}</span>
                <span>{maxLabel}</span>
            </div>
        </div>
    );
};

const AssessmentModal: React.FC<AssessmentModalProps> = ({ isOpen, onClose, onSave, onDelete, assessment, patientId, therapistId, isReadOnly: initialReadOnly = false, exercises, templates, onPrescribeExercises }) => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const { settings } = useSettings();
    usePreventBodyScroll(isOpen);
    const [editedAssessment, setEditedAssessment] = useState<Partial<Assessment> | null>(null);
    const [errors, setErrors] = useState<AssessmentErrors>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [aiPlan, setAiPlan] = useState('');
    const [aiRecommendations, setAiRecommendations] = useState<{ id: string; name: string; reason: string }[] | null>(null);
    const [isRecommending, setIsRecommending] = useState(false);
    const [aiBodyChartAnalysis, setAiBodyChartAnalysis] = useState('');
    const [isAnalyzingChart, setIsAnalyzingChart] = useState(false);


    const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.FISIOTERAPEUTA;
    const isNew = !assessment || !('id' in assessment);

    useEffect(() => {
        setIsReadOnly(initialReadOnly);
        if (assessment) {
            setEditedAssessment({...assessment, patientId, therapistId });
        } else {
             setEditedAssessment({ patientId, therapistId, date: new Date().toISOString(), painLevel: 0, rangeOfMotion: [], muscleStrength: [], functionalTests: [], bodyChartData: [] });
        }
        setErrors({});
        setAiPlan('');
        setAiRecommendations(null);
        setAiBodyChartAnalysis('');
    }, [assessment, patientId, therapistId, initialReadOnly]);

    const validate = (): boolean => {
        const newErrors: AssessmentErrors = {};
        if (!editedAssessment?.mainComplaint?.trim()) newErrors.mainComplaint = 'A queixa principal é obrigatória.';
        if (!editedAssessment?.diagnosticHypothesis?.trim()) newErrors.diagnosticHypothesis = 'A hipótese diagnóstica é obrigatória.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        if (editedAssessment) {
            setIsSaving(true);
            setTimeout(() => {
                onSave(editedAssessment as Assessment);
                setIsSaving(false);
            }, 300);
        }
    };
    
    const handleDelete = () => {
        if (editedAssessment && 'id' in editedAssessment && window.confirm('Tem certeza que deseja excluir esta avaliação?')) {
          onDelete(editedAssessment.id!);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedAssessment(prev => prev ? { ...prev, [name]: value } : null);
        if (errors[name as keyof AssessmentErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };
    
    const handlePainSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedAssessment(prev => prev ? { ...prev, painLevel: Number(e.target.value) } : null);
    };
    
    const handleGeneratePlan = async () => {
        if (!editedAssessment) return;
        setIsGeneratingPlan(true);
        setAiPlan('');
        try {
            const plan = await generateTreatmentPlan(editedAssessment);
            setAiPlan(plan);
        } catch (error) {
            if (error instanceof Error) {
                addNotification({ type: 'error', title: 'Erro da IA', message: error.message });
            }
            setAiPlan("Não foi possível gerar o plano de tratamento.");
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleRecommendExercises = async () => {
        if (!editedAssessment?.diagnosticHypothesis) return;
        setIsRecommending(true);
        setAiRecommendations(null);
        try {
            const recommendations = await recommendExercises(editedAssessment, exercises);
            setAiRecommendations(recommendations);
        } catch (error) {
            if (error instanceof Error) {
                addNotification({ type: 'error', title: 'Erro da IA', message: error.message });
            }
            setAiRecommendations([]); 
        } finally {
            setIsRecommending(false);
        }
    };
    
    const handlePrescribeClick = () => {
        if (aiRecommendations) {
            onPrescribeExercises(aiRecommendations.map(rec => rec.id));
        }
    };

    const applyAiPlan = () => {
        if(aiPlan && !aiPlan.startsWith("Não foi possível")){
            setEditedAssessment(prev => prev ? {...prev, treatmentPlan: aiPlan} : null);
            setAiPlan('');
        }
    };
    
    const handleBodyChartUpdate = (newMarkings: BodyChartMarking[]) => {
        setEditedAssessment(prev => prev ? { ...prev, bodyChartData: newMarkings } : null);
    };

    const handleAnalyzeChart = async () => {
        if (!editedAssessment?.bodyChartData || editedAssessment.bodyChartData.length === 0) {
            addNotification({ type: 'info', title: 'Mapa Vazio', message: 'Marque ao menos um ponto de dor no mapa para analisar.' });
            return;
        }
        setIsAnalyzingChart(true);
        setAiBodyChartAnalysis('');
        try {
            const analysis = await analyzeBodyChart(editedAssessment.bodyChartData);
            setAiBodyChartAnalysis(analysis);
        } catch (error) {
            if (error instanceof Error) {
                addNotification({ type: 'error', title: 'Erro na Análise', message: error.message });
            }
            setAiBodyChartAnalysis('Não foi possível obter a análise da IA.');
        } finally {
            setIsAnalyzingChart(false);
        }
    };


    const handleDynamicTableChange = <T,>(
        fieldName: 'rangeOfMotion' | 'muscleStrength' | 'functionalTests',
        index: number,
        field: keyof T,
        value: string
    ) => {
        setEditedAssessment(prev => {
            if (!prev) return null;
            const tableData = ((prev[fieldName] as unknown) as T[] | undefined) || [];
            const updatedTableData = [...tableData];
            updatedTableData[index] = { ...updatedTableData[index], [field]: value };
            return { ...prev, [fieldName]: updatedTableData };
        });
    };

    const addDynamicTableRow = (fieldName: 'rangeOfMotion' | 'muscleStrength' | 'functionalTests', newRow: any) => {
        setEditedAssessment(prev => {
             if (!prev) return null;
             const tableData = (prev[fieldName] as any[] | undefined) || [];
             return { ...prev, [fieldName]: [...tableData, { ...newRow, id: `temp-${crypto.randomUUID()}` }]};
        });
    };

    const removeDynamicTableRow = (fieldName: 'rangeOfMotion' | 'muscleStrength' | 'functionalTests', index: number) => {
        setEditedAssessment(prev => {
             if (!prev) return null;
             const tableData = (prev[fieldName] as any[] | undefined) || [];
             return { ...prev, [fieldName]: tableData.filter((_, i) => i !== index) };
        });
    }

    const applyTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return;
        setEditedAssessment(prev => ({
            ...prev,
            mainComplaint: template.mainComplaint,
            history: template.history,
            posturalAnalysis: template.posturalAnalysis,
            rangeOfMotion: template.rangeOfMotion.map(item => ({...item, id: `temp-${crypto.randomUUID()}`, active: '', passive: ''})),
            muscleStrength: template.muscleStrength.map(item => ({...item, id: `temp-${crypto.randomUUID()}`, grade: '3'})),
            functionalTests: template.functionalTests.map(item => ({...item, id: `temp-${crypto.randomUUID()}`, result: ''})),
            bodyChartData: template.bodyChartData || [],
        }));
    };

    if (!isOpen || !editedAssessment) return null;

    const renderDynamicTable = <T extends { id: string }>(
        title: string,
        fieldName: 'rangeOfMotion' | 'muscleStrength' | 'functionalTests',
        columns: { header: string, field: keyof T, type?: 'text' | 'select', options?: readonly string[] }[],
        newRow: Omit<T, 'id'>
    ) => (
        <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300">{title}</h4>
            <div className="overflow-x-auto border border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-slate-900/50">
                        <tr>
                            {columns.map(col => <th key={String(col.field)} className="px-3 py-2 text-left font-medium text-slate-400">{col.header}</th>)}
                            {!isReadOnly && <th className="px-3 py-2"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {(((editedAssessment[fieldName] as unknown) as T[]) || []).map((row, index) => (
                            <tr key={row.id}>
                                {columns.map(col => (
                                    <td key={String(col.field)} className="px-1 py-1 align-top">
                                        {isReadOnly ? (
                                             <span className="px-2 py-1 block">{String(row[col.field])}</span>
                                        ) : col.type === 'select' && col.options ? (
                                             <select
                                                value={String(row[col.field] || '')}
                                                onChange={e => handleDynamicTableChange<T>(fieldName, index, col.field, e.target.value)}
                                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                            >
                                                {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={String(row[col.field] || '')}
                                                onChange={e => handleDynamicTableChange<T>(fieldName, index, col.field, e.target.value)}
                                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                            />
                                        )}
                                    </td>
                                ))}
                                {!isReadOnly && (
                                     <td className="px-1 py-1 align-top">
                                        <button onClick={() => removeDynamicTableRow(fieldName, index)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md"><IconTrash size={14}/></button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!isReadOnly && (
                <button onClick={() => addDynamicTableRow(fieldName, newRow)} className="flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    <IconPlus size={14} className="mr-1"/> Adicionar Linha
                </button>
            )}
        </div>
    );
    
    const ReadOnlyField = ({label, value}: {label: string, value: string | undefined | null}) => (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">{label}</label>
            <p className="text-slate-200 bg-slate-800 p-2 rounded-md min-h-[38px] whitespace-pre-wrap">{value || <span className="italic text-slate-500">Não informado</span>}</p>
        </div>
    );
    
    const EditableField = ({label, name, value, error, type = 'text'}: {label: string, name: keyof Assessment, value: string, error?: string, type?: 'text' | 'textarea'}) => (
        <div className="space-y-1">
            <label htmlFor={name} className="text-sm font-medium text-slate-300">{label}</label>
            {type === 'textarea' ? (
                <textarea id={name} name={name} value={value} onChange={handleChange} rows={3} className={`w-full bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none`} />
            ) : (
                 <input type="text" id={name} name={name} value={value} onChange={handleChange} className={`w-full bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none`} />
            )}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    );

    return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700">
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{isNew ? 'Nova Avaliação' : 'Detalhes da Avaliação'}</h2>
            <p className="text-sm text-slate-400">
                {new Date(editedAssessment.date!).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && isReadOnly && !isNew && (
                <button onClick={() => setIsReadOnly(false)} className="flex items-center text-sm text-amber-400 hover:text-amber-300 px-3 py-2 rounded-md hover:bg-amber-500/10 transition-colors"><IconPencil className="mr-2"/> Editar</button>
            )}
            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Fechar modal"><IconX size={20} /></button>
          </div>
        </header>

        <main className="p-6 overflow-y-auto space-y-6">
            {isNew && templates.length > 0 && (
                <div className="space-y-2">
                    <label htmlFor="template" className="text-sm font-medium text-slate-300">Aplicar Template</label>
                    <select id="template" onChange={e => applyTemplate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Nenhum</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            )}
            <section>
                <h3 className="text-base font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">Subjetivo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isReadOnly ? <ReadOnlyField label="Queixa Principal" value={editedAssessment.mainComplaint} /> : <EditableField label="Queixa Principal" name="mainComplaint" value={editedAssessment.mainComplaint || ''} error={errors.mainComplaint}/>}
                    {isReadOnly ? <ReadOnlyField label="História da Moléstia Atual" value={editedAssessment.history} /> : <EditableField label="História da Moléstia Atual" name="history" value={editedAssessment.history || ''} type="textarea"/>}
                </div>
            </section>

             <section>
                <h3 className="text-base font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">Objetivo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Slider label="Nível de Dor Atual" value={editedAssessment.painLevel || 0} onChange={handlePainSliderChange} minLabel="Sem Dor" maxLabel="Dor Máxima" readOnly={isReadOnly} />
                         {isReadOnly ? <ReadOnlyField label="Análise Postural" value={editedAssessment.posturalAnalysis} /> : <EditableField label="Análise Postural" name="posturalAnalysis" value={editedAssessment.posturalAnalysis || ''} type="textarea"/>}
                    </div>
                    <div className="space-y-4">
                        {renderDynamicTable<RangeOfMotionEntry>(
                            'Amplitude de Movimento (ADM)', 
                            'rangeOfMotion', 
                            [{header: 'Articulação', field: 'joint'}, {header: 'Movimento', field: 'movement'}, {header: 'Ativa', field: 'active'}, {header: 'Passiva', field: 'passive'}],
                            {joint: '', movement: '', active: '', passive: ''}
                        )}
                        {renderDynamicTable<MuscleStrengthEntry>(
                            'Força Muscular', 
                            'muscleStrength', 
                            [{header: 'Músculo', field: 'muscle'}, {header: 'Grau', field: 'grade', type: 'select', options: ['0', '1', '2', '3', '4', '5']}],
                            {muscle: '', grade: '3'}
                        )}
                         {renderDynamicTable<FunctionalTestEntry>(
                            'Testes Funcionais', 
                            'functionalTests', 
                            [{header: 'Teste', field: 'testName'}, {header: 'Resultado', field: 'result'}],
                            {testName: '', result: ''}
                        )}
                    </div>
                </div>
                <div className="mt-6">
                     <h4 className="text-sm font-semibold text-slate-300 mb-2">Mapa Corporal</h4>
                     <BodyChart
                        markings={editedAssessment.bodyChartData || []}
                        onUpdateMarkings={handleBodyChartUpdate}
                        readOnly={isReadOnly}
                    />
                    {!isReadOnly && (
                        <div className="mt-2">
                             <Button
                                variant="ghost"
                                onClick={handleAnalyzeChart}
                                isLoading={isAnalyzingChart}
                                disabled={isAnalyzingChart}
                                icon={<IconSparkles/>}
                            >
                                Analisar com IA
                            </Button>
                        </div>
                    )}
                    {isAnalyzingChart && <div className="text-sm text-slate-400 mt-2">Analisando padrão de dor...</div>}
                    {aiBodyChartAnalysis && (
                        <div className="prose prose-sm prose-invert max-w-none mt-2 p-3 bg-slate-900/70 rounded-md border border-slate-700 text-slate-300">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiBodyChartAnalysis}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </section>
            
            <section>
                 <h3 className="text-base font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">Avaliação & Plano</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isReadOnly ? <ReadOnlyField label="Hipótese Diagnóstica" value={editedAssessment.diagnosticHypothesis} /> : <EditableField label="Hipótese Diagnóstica" name="diagnosticHypothesis" value={editedAssessment.diagnosticHypothesis || ''} error={errors.diagnosticHypothesis} type="textarea"/>}
                    
                    <div className="space-y-2">
                         {isReadOnly ? <ReadOnlyField label="Plano de Tratamento" value={editedAssessment.treatmentPlan} /> : (
                            <>
                                <EditableField label="Plano de Tratamento" name="treatmentPlan" value={editedAssessment.treatmentPlan || ''} type="textarea"/>
                                {(settings?.aiTreatmentPlanEnabled ?? true) && (
                                    <button
                                        onClick={handleGeneratePlan}
                                        disabled={isGeneratingPlan || !editedAssessment.mainComplaint || !editedAssessment.diagnosticHypothesis}
                                        className="flex items-center text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <IconSparkles className={`mr-1 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
                                        {isGeneratingPlan ? 'Gerando...' : 'Sugerir Plano com IA'}
                                    </button>
                                )}
                                {aiPlan && (
                                    <div className="mt-2 p-3 bg-slate-900/70 rounded-md border border-slate-700 space-y-2">
                                        <p className="text-xs text-slate-300 whitespace-pre-wrap">{aiPlan}</p>
                                        <button 
                                            onClick={applyAiPlan} 
                                            className="text-xs font-semibold bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700"
                                        >
                                            Aplicar Sugestão
                                        </button>
                                    </div>
                                )}
                            </>
                         )}
                    </div>
                  </div>
            </section>
            <section>
                 <h3 className="text-base font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">Recomendação de Exercícios (IA)</h3>
                 <div>
                    {(settings?.aiExerciseRecEnabled ?? true) && (
                        <button
                            onClick={handleRecommendExercises}
                            disabled={isRecommending || !editedAssessment.diagnosticHypothesis}
                            className="flex items-center text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <IconSparkles className={`mr-1 ${isRecommending ? 'animate-spin' : ''}`} />
                            {isRecommending ? 'Recomendando...' : 'Sugerir Exercícios'}
                        </button>
                    )}
                     {aiRecommendations && (
                        <div className="mt-2 space-y-2">
                            {aiRecommendations.length > 0 ? (
                                <>
                                {aiRecommendations.map(rec => (
                                    <div key={rec.id} className="p-2 bg-slate-900/70 rounded-md border border-slate-700">
                                        <p className="font-semibold text-slate-200 text-sm">{rec.name}</p>
                                        <p className="text-xs text-slate-400 italic">"{rec.reason}"</p>
                                    </div>
                                ))}
                                <Button onClick={handlePrescribeClick} className="mt-2">
                                    Prescrever Exercícios Recomendados
                                </Button>
                                </>
                            ) : (
                                <p className="text-sm text-slate-400">Nenhuma recomendação específica encontrada.</p>
                            )}
                        </div>
                     )}
                 </div>

            </section>
        </main>
        
        {!isReadOnly && (
            <footer className="flex items-center justify-between p-4 bg-slate-800 border-t border-slate-700">
            <div>
                {!isNew && (
                <button onClick={handleDelete} className="flex items-center text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-md hover:bg-red-500/10 transition-colors">
                    <IconTrash className="mr-2"/> Excluir
                </button>
                )}
            </div>
            <div className="flex items-center space-x-3">
                <button onClick={onClose} className="px-4 py-2 rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600">Cancelar</button>
                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 font-semibold disabled:bg-blue-800 disabled:cursor-not-allowed">
                {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
                </button>
            </div>
            </footer>
        )}
      </div>
    </div>
  );
};

export default AssessmentModal;
