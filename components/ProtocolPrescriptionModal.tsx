import React, { useState, useMemo } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import {
  ClinicalProtocol,
  Patient,
  ProtocolCustomization,
  ProtocolPhase,
  ProtocolExercise,
} from '../types';

import {
  IconUser,
  IconCalendar,
  IconActivity,
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconSave,
  IconX,
} from './icons/IconComponents';
import BaseModal from './ui/BaseModal';
import { Button } from './ui/Button';
import FormField from './ui/FormField';

interface ProtocolPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  protocol: ClinicalProtocol | null;
  selectedPatientId?: string;
}

const ProtocolPrescriptionModal: React.FC<ProtocolPrescriptionModalProps> = ({
  isOpen,
  onClose,
  protocol,
  selectedPatientId,
}) => {
  const {
    patients,
    protocolPhases,
    protocolExercises,
    exercises,
    prescribeProtocol,
  } = useData();
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState(
    selectedPatientId || ''
  );
  const [customizations, setCustomizations] = useState<ProtocolCustomization[]>(
    []
  );
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  const phases = useMemo(() => {
    if (!protocol) return [];
    return protocolPhases
      .filter((phase) => phase.protocolId === protocol.id)
      .sort((a, b) => a.order - b.order);
  }, [protocolPhases, protocol]);

  const phaseExercises = useMemo(() => {
    const exercisesByPhase: { [phaseId: string]: any[] } = {};
    phases.forEach((phase) => {
      const phaseExs = protocolExercises
        .filter((pe) => pe.phaseId === phase.id)
        .sort((a, b) => a.order - b.order)
        .map((pe) => {
          const exercise = exercises.find((ex) => ex.id === pe.exerciseId);
          const customization = customizations.find(
            (c) => c.exerciseId === pe.exerciseId
          );
          return {
            ...pe,
            exercise,
            customSets: customization?.customSets || pe.sets,
            customReps: customization?.customReps || pe.reps,
            customIntensity: customization?.customIntensity || pe.intensity,
          };
        });
      exercisesByPhase[phase.id] = phaseExs;
    });
    return exercisesByPhase;
  }, [phases, protocolExercises, exercises, customizations]);

  const handleCustomizeExercise = (
    exerciseId: string,
    field: 'sets' | 'reps' | 'intensity',
    value: string | number
  ) => {
    const originalExercise = protocolExercises.find(
      (pe) => pe.exerciseId === exerciseId
    );
    if (!originalExercise) return;

    setCustomizations((prev) => {
      const existing = prev.find((c) => c.exerciseId === exerciseId);
      if (existing) {
        return prev.map((c) =>
          c.exerciseId === exerciseId
            ? {
                ...c,
                [`custom${field.charAt(0).toUpperCase() + field.slice(1)}`]:
                  value,
                [`original${field.charAt(0).toUpperCase() + field.slice(1)}`]:
                  field === 'sets'
                    ? originalExercise.sets
                    : field === 'reps'
                      ? originalExercise.reps
                      : originalExercise.intensity,
              }
            : c
        );
      } else {
        const newCustomization: Partial<ProtocolCustomization> = {
          exerciseId,
          originalSets: originalExercise.sets,
          customSets: field === 'sets' ? Number(value) : originalExercise.sets,
          originalReps: originalExercise.reps,
          customReps: field === 'reps' ? String(value) : originalExercise.reps,
          originalIntensity: originalExercise.intensity,
          customIntensity:
            field === 'intensity' ? String(value) : originalExercise.intensity,
          reason: 'Personalização do fisioterapeuta',
          modifiedById: user?.id || '',
          modifiedAt: new Date().toISOString(),
        };
        return [...prev, newCustomization as ProtocolCustomization];
      }
    });
  };

  const handleSubmit = () => {
    if (!protocol || !selectedPatient || !user) return;

    prescribeProtocol(selectedPatient, protocol.id, customizations);
    onClose();
    setSelectedPatient('');
    setCustomizations([]);
    setNotes('');
  };

  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  if (!protocol) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Prescrever Protocolo: ${protocol.name}`}
    >
      <div className="space-y-6">
        {/* Patient Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            <IconUser className="mr-2 inline h-4 w-4" />
            Paciente
          </label>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
          >
            <option value="">Selecione um paciente</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            <IconCalendar className="mr-2 inline h-4 w-4" />
            Data de Início
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
          />
        </div>

        {/* Protocol Overview */}
        <div className="rounded-lg bg-slate-800 p-4">
          <h3 className="mb-2 text-lg font-semibold text-slate-50">
            Visão Geral do Protocolo
          </h3>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <span className="text-slate-400">Duração:</span>
              <span className="ml-2 text-slate-300">
                {protocol.expectedDuration}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Fases:</span>
              <span className="ml-2 text-slate-300">{phases.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Categoria:</span>
              <span className="ml-2 text-slate-300">{protocol.category}</span>
            </div>
          </div>
        </div>

        {/* Phases and Exercises Customization */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-50">
            <IconActivity className="mr-2 inline h-5 w-5" />
            Personalizar Exercícios
          </h3>
          <div className="space-y-4">
            {phases.map((phase, index) => (
              <div key={phase.id} className="rounded-lg bg-slate-800">
                <button
                  onClick={() => togglePhaseExpansion(phase.id)}
                  className="hover:bg-slate-750 flex w-full items-center justify-between rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {phase.order}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-50">
                        {phase.name}
                      </h4>
                      <p className="text-sm text-slate-400">
                        {phase.duration} • {phase.frequency}
                      </p>
                    </div>
                  </div>
                  {expandedPhases.has(phase.id) ? (
                    <IconChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <IconChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>

                {expandedPhases.has(phase.id) && phaseExercises[phase.id] && (
                  <div className="space-y-3 px-4 pb-4">
                    {phaseExercises[phase.id].map((protocolEx) => (
                      <div
                        key={protocolEx.id}
                        className="rounded-lg bg-slate-900 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h5 className="font-medium text-slate-50">
                            {protocolEx.exercise?.name ||
                              'Exercício não encontrado'}
                          </h5>
                          <button
                            onClick={() =>
                              setEditingExercise(
                                editingExercise === protocolEx.id
                                  ? null
                                  : protocolEx.id
                              )
                            }
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {editingExercise === protocolEx.id ? (
                              <IconX className="h-4 w-4" />
                            ) : (
                              <IconEdit className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {editingExercise === protocolEx.id ? (
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="mb-1 block text-xs text-slate-400">
                                Séries
                              </label>
                              <input
                                type="number"
                                value={protocolEx.customSets}
                                onChange={(e) =>
                                  handleCustomizeExercise(
                                    protocolEx.exerciseId,
                                    'sets',
                                    parseInt(e.target.value)
                                  )
                                }
                                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-50"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-slate-400">
                                Repetições
                              </label>
                              <input
                                type="text"
                                value={protocolEx.customReps}
                                onChange={(e) =>
                                  handleCustomizeExercise(
                                    protocolEx.exerciseId,
                                    'reps',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-50"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-slate-400">
                                Intensidade
                              </label>
                              <select
                                value={protocolEx.customIntensity}
                                onChange={(e) =>
                                  handleCustomizeExercise(
                                    protocolEx.exerciseId,
                                    'intensity',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-50"
                              >
                                <option value="Leve">Leve</option>
                                <option value="Moderada">Moderada</option>
                                <option value="Intensa">Intensa</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-slate-400">Séries:</span>
                              <span
                                className={`ml-1 ${protocolEx.customSets !== protocolEx.sets ? 'font-medium text-yellow-400' : 'text-slate-300'}`}
                              >
                                {protocolEx.customSets}
                                {protocolEx.customSets !== protocolEx.sets && (
                                  <span className="ml-1 text-slate-500 line-through">
                                    ({protocolEx.sets})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Reps:</span>
                              <span
                                className={`ml-1 ${protocolEx.customReps !== protocolEx.reps ? 'font-medium text-yellow-400' : 'text-slate-300'}`}
                              >
                                {protocolEx.customReps}
                                {protocolEx.customReps !== protocolEx.reps && (
                                  <span className="ml-1 text-slate-500 line-through">
                                    ({protocolEx.reps})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">
                                Intensidade:
                              </span>
                              <span
                                className={`ml-1 ${protocolEx.customIntensity !== protocolEx.intensity ? 'font-medium text-yellow-400' : 'text-slate-300'}`}
                              >
                                {protocolEx.customIntensity}
                                {protocolEx.customIntensity !==
                                  protocolEx.intensity && (
                                  <span className="ml-1 text-slate-500 line-through">
                                    ({protocolEx.intensity})
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <FormField
            label="Observações Adicionais"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações específicas para este paciente..."
            isTextArea
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 border-t border-slate-700 pt-6">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedPatient}
            className="flex items-center space-x-2"
          >
            <IconSave className="h-4 w-4" />
            <span>Prescrever Protocolo</span>
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ProtocolPrescriptionModal;
