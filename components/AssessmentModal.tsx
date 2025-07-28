import React, { useState, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth';
import { generateTreatmentPlan } from '../services/geminiService';
import {
  AssessmentModalProps,
  Assessment,
  RangeOfMotionEntry,
  MuscleStrengthEntry,
  FunctionalTestEntry,
  UserRole,
} from '../types';

import {
  IconX,
  IconTrash,
  IconPlus,
  IconPencil,
  IconSparkles,
} from './icons/IconComponents';


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
    const colorTo = '#ef4444';

    if (label.toLowerCase().includes('dor')) {
      if (percentage <= 50) {
        const r = Math.round(74 + (239 - 74) * (percentage / 50));
        const g = Math.round(222 - (239 - 222) * (percentage / 50));
        const b = Math.round(129 - (129 - 80) * (percentage / 50));
        colorFrom = `rgb(${r},${g},${b})`;
      } else {
        const r = 239;
        const g = Math.round(239 - (239 - 68) * ((percentage - 50) / 50));
        const b = Math.round(80 - (80 - 68) * ((percentage - 50) / 50));
        colorFrom = `rgb(${r},${g},${b})`;
      }
      return `linear-gradient(90deg, ${colorFrom} ${percentage}%, #475569 ${percentage}%)`;
    }

    return `linear-gradient(90deg, #3b82f6 ${percentage}%, #475569 ${percentage}%)`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="rounded bg-slate-700 px-2 py-0.5 text-sm font-bold text-slate-100">
          {value}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={value}
        onChange={onChange}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 disabled:cursor-not-allowed"
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

const AssessmentModal: React.FC<AssessmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  assessment,
  patientId,
  therapistId,
  isReadOnly: initialReadOnly = false,
}) => {
  const { user } = useAuth();
  const [editedAssessment, setEditedAssessment] =
    useState<Partial<Assessment> | null>(null);
  const [errors, setErrors] = useState<AssessmentErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [aiPlan, setAiPlan] = useState('');

  const canManage =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FISIOTERAPEUTA;
  const isNew = !assessment || !('id' in assessment);

  useEffect(() => {
    setIsReadOnly(initialReadOnly);
    if (assessment) {
      setEditedAssessment({ ...assessment, patientId, therapistId });
    } else {
      setEditedAssessment({
        patientId,
        therapistId,
        date: new Date().toISOString(),
        painLevel: 0,
        rangeOfMotion: [],
        muscleStrength: [],
        functionalTests: [],
      });
    }
    setErrors({});
    setAiPlan('');
  }, [assessment, patientId, therapistId, initialReadOnly]);

  const validate = (): boolean => {
    const newErrors: AssessmentErrors = {};
    if (!editedAssessment?.mainComplaint?.trim())
      newErrors.mainComplaint = 'A queixa principal é obrigatória.';
    if (!editedAssessment?.diagnosticHypothesis?.trim())
      newErrors.diagnosticHypothesis = 'A hipótese diagnóstica é obrigatória.';
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
    if (
      editedAssessment &&
      'id' in editedAssessment &&
      window.confirm('Tem certeza que deseja excluir esta avaliação?')
    ) {
      onDelete(editedAssessment.id!);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditedAssessment((prev) => (prev ? { ...prev, [name]: value } : null));
    if (errors[name as keyof AssessmentErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePainSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedAssessment((prev) =>
      prev ? { ...prev, painLevel: Number(e.target.value) } : null
    );
  };

  const handleGeneratePlan = async () => {
    if (!editedAssessment) return;
    setIsGeneratingPlan(true);
    setAiPlan('');
    try {
      const plan = await generateTreatmentPlan(editedAssessment);
      setAiPlan(plan);
    } catch (error) {
      console.error(error);
      setAiPlan('Erro ao gerar plano. Tente novamente.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const applyAiPlan = () => {
    if (aiPlan && !aiPlan.startsWith('Erro')) {
      setEditedAssessment((prev) =>
        prev ? { ...prev, treatmentPlan: aiPlan } : null
      );
      setAiPlan('');
    }
  };

  const handleDynamicTableChange = <T extends { id: string }>(
    fieldName: keyof Assessment,
    index: number,
    field: keyof T,
    value: string
  ) => {
    setEditedAssessment((prev) => {
      if (!prev) return null;
      const tableData = (prev[fieldName] as unknown as T[] | undefined) || [];
      const updatedTableData = [...tableData];
      updatedTableData[index] = { ...updatedTableData[index], [field]: value };
      return { ...prev, [fieldName]: updatedTableData };
    });
  };

  const addDynamicTableRow = (fieldName: keyof Assessment, newRow: any) => {
    setEditedAssessment((prev) => {
      if (!prev) return null;
      const tableData = (prev[fieldName] as any[] | undefined) || [];
      return {
        ...prev,
        [fieldName]: [
          ...tableData,
          { ...newRow, id: `temp-${crypto.randomUUID()}` },
        ],
      };
    });
  };

  const removeDynamicTableRow = (
    fieldName: keyof Assessment,
    index: number
  ) => {
    setEditedAssessment((prev) => {
      if (!prev) return null;
      const tableData = (prev[fieldName] as any[] | undefined) || [];
      return { ...prev, [fieldName]: tableData.filter((_, i) => i !== index) };
    });
  };

  if (!isOpen || !editedAssessment) return null;

  const renderDynamicTable = <T extends { id: string }>(
    title: string,
    fieldName: 'rangeOfMotion' | 'muscleStrength' | 'functionalTests',
    columns: {
      header: string;
      field: keyof T;
      type?: 'text' | 'select';
      options?: readonly string[];
    }[],
    newRow: T
  ) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-300">{title}</h4>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.field)}
                  className="px-3 py-2 text-left font-medium text-slate-400"
                >
                  {col.header}
                </th>
              ))}
              {!isReadOnly && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {((editedAssessment[fieldName] as unknown as T[]) || []).map(
              (row, index) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={String(col.field)} className="px-1 py-1 align-top">
                      {isReadOnly ? (
                        <span className="block px-2 py-1">
                          {String(row[col.field])}
                        </span>
                      ) : col.type === 'select' && col.options ? (
                        <select
                          value={String(row[col.field] || '')}
                          onChange={(e) =>
                            handleDynamicTableChange<T>(
                              fieldName,
                              index,
                              col.field,
                              e.target.value
                            )
                          }
                          className="w-full rounded-md border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {col.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={String(row[col.field] || '')}
                          onChange={(e) =>
                            handleDynamicTableChange<T>(
                              fieldName,
                              index,
                              col.field,
                              e.target.value
                            )
                          }
                          className="w-full rounded-md border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </td>
                  ))}
                  {!isReadOnly && (
                    <td className="px-1 py-1 align-top">
                      <button
                        onClick={() => removeDynamicTableRow(fieldName, index)}
                        className="rounded-md p-1.5 text-red-400 hover:bg-red-500/10"
                      >
                        <IconTrash size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      {!isReadOnly && (
        <button
          onClick={() => addDynamicTableRow(fieldName, newRow)}
          className="flex items-center text-xs text-blue-400 transition-colors hover:text-blue-300"
        >
          <IconPlus size={14} className="mr-1" /> Adicionar Linha
        </button>
      )}
    </div>
  );

  const ReadOnlyField = ({
    label,
    value,
  }: {
    label: string;
    value: string | undefined | null;
  }) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-400">{label}</label>
      <p className="min-h-[38px] whitespace-pre-wrap rounded-md bg-slate-800 p-2 text-slate-200">
        {value || <span className="italic text-slate-500">Não informado</span>}
      </p>
    </div>
  );

  const EditableField = ({
    label,
    name,
    value,
    error,
    type = 'text',
  }: {
    label: string;
    name: keyof Assessment;
    value: string;
    error?: string;
    type?: 'text' | 'textarea';
  }) => (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          rows={3}
          className={`w-full border bg-slate-900 ${error ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
        />
      ) : (
        <input
          type="text"
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          className={`w-full border bg-slate-900 ${error ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-700 p-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {isNew ? 'Nova Avaliação' : 'Detalhes da Avaliação'}
            </h2>
            <p className="text-sm text-slate-400">
              {new Date(editedAssessment.date!).toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && isReadOnly && !isNew && (
              <button
                onClick={() => setIsReadOnly(false)}
                className="flex items-center rounded-md px-3 py-2 text-sm text-amber-400 transition-colors hover:bg-amber-500/10 hover:text-amber-300"
              >
                <IconPencil className="mr-2" /> Editar
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
              aria-label="Fechar modal"
            >
              <IconX size={20} />
            </button>
          </div>
        </header>

        <main className="space-y-6 overflow-y-auto p-6">
          <section>
            <h3 className="mb-3 border-b border-slate-700 pb-2 text-base font-bold text-slate-200">
              Subjetivo
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isReadOnly ? (
                <ReadOnlyField
                  label="Queixa Principal"
                  value={editedAssessment.mainComplaint}
                />
              ) : (
                <EditableField
                  label="Queixa Principal"
                  name="mainComplaint"
                  value={editedAssessment.mainComplaint || ''}
                  error={errors.mainComplaint}
                />
              )}
              {isReadOnly ? (
                <ReadOnlyField
                  label="História da Moléstia Atual"
                  value={editedAssessment.history}
                />
              ) : (
                <EditableField
                  label="História da Moléstia Atual"
                  name="history"
                  value={editedAssessment.history || ''}
                  type="textarea"
                />
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 border-b border-slate-700 pb-2 text-base font-bold text-slate-200">
              Objetivo
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Slider
                  label="Nível de Dor Atual"
                  value={editedAssessment.painLevel || 0}
                  onChange={handlePainSliderChange}
                  minLabel="Sem Dor"
                  maxLabel="Dor Máxima"
                  readOnly={isReadOnly}
                />
                {isReadOnly ? (
                  <ReadOnlyField
                    label="Análise Postural"
                    value={editedAssessment.posturalAnalysis}
                  />
                ) : (
                  <EditableField
                    label="Análise Postural"
                    name="posturalAnalysis"
                    value={editedAssessment.posturalAnalysis || ''}
                    type="textarea"
                  />
                )}
              </div>
              <div className="space-y-4">
                {renderDynamicTable<RangeOfMotionEntry>(
                  'Amplitude de Movimento (ADM)',
                  'rangeOfMotion',
                  [
                    { header: 'Articulação', field: 'joint' },
                    { header: 'Movimento', field: 'movement' },
                    { header: 'Ativa', field: 'active' },
                    { header: 'Passiva', field: 'passive' },
                  ],
                  { id: '', joint: '', movement: '', active: '', passive: '' }
                )}
                {renderDynamicTable<MuscleStrengthEntry>(
                  'Força Muscular',
                  'muscleStrength',
                  [
                    { header: 'Músculo', field: 'muscle' },
                    {
                      header: 'Grau',
                      field: 'grade',
                      type: 'select',
                      options: ['0', '1', '2', '3', '4', '5'],
                    },
                  ],
                  { id: '', muscle: '', grade: '3' }
                )}
                {renderDynamicTable<FunctionalTestEntry>(
                  'Testes Funcionais',
                  'functionalTests',
                  [
                    { header: 'Teste', field: 'testName' },
                    { header: 'Resultado', field: 'result' },
                  ],
                  { id: '', testName: '', result: '' }
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 border-b border-slate-700 pb-2 text-base font-bold text-slate-200">
              Avaliação & Plano
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isReadOnly ? (
                <ReadOnlyField
                  label="Hipótese Diagnóstica"
                  value={editedAssessment.diagnosticHypothesis}
                />
              ) : (
                <EditableField
                  label="Hipótese Diagnóstica"
                  name="diagnosticHypothesis"
                  value={editedAssessment.diagnosticHypothesis || ''}
                  error={errors.diagnosticHypothesis}
                  type="textarea"
                />
              )}

              <div className="space-y-2">
                {isReadOnly ? (
                  <ReadOnlyField
                    label="Plano de Tratamento"
                    value={editedAssessment.treatmentPlan}
                  />
                ) : (
                  <>
                    <EditableField
                      label="Plano de Tratamento"
                      name="treatmentPlan"
                      value={editedAssessment.treatmentPlan || ''}
                      type="textarea"
                    />
                    <button
                      onClick={handleGeneratePlan}
                      disabled={
                        isGeneratingPlan ||
                        !editedAssessment.mainComplaint ||
                        !editedAssessment.diagnosticHypothesis
                      }
                      className="flex items-center text-xs text-blue-400 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IconSparkles
                        className={`mr-1 ${isGeneratingPlan ? 'animate-spin' : ''}`}
                      />
                      {isGeneratingPlan ? 'Gerando...' : 'Sugerir Plano com IA'}
                    </button>
                    {aiPlan && (
                      <div className="mt-2 space-y-2 rounded-md border border-slate-700 bg-slate-900/70 p-3">
                        <p className="whitespace-pre-wrap text-xs text-slate-300">
                          {aiPlan}
                        </p>
                        <button
                          onClick={applyAiPlan}
                          className="rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
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
        </main>

        <footer className="flex items-center justify-between border-t border-slate-700 bg-slate-800 p-4">
          <div>
            {!isNew && canManage && !isReadOnly && (
              <button
                onClick={handleDelete}
                className="flex items-center rounded-md px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <IconTrash className="mr-2" /> Excluir
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {isReadOnly ? (
              <button
                onClick={onClose}
                className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Fechar
              </button>
            ) : (
              <>
                <button
                  onClick={() => (isNew ? onClose() : setIsReadOnly(true))}
                  className="rounded-md bg-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AssessmentModal;
