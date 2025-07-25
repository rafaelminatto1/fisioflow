import React, { useState, useEffect } from 'react';
import {
  SymptomDiaryEntry,
  PainLocation,
  MedicationTaken,
  ExerciseCompleted,
  PainQuality,
  BodyRegion,
  MoodLevel,
  EnergyLevel,
  SleepQuality,
  Patient,
} from '../types';
import { useNotification } from '../hooks/useNotification';

interface SymptomDiaryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<SymptomDiaryEntry, 'id'>) => void;
  patient: Patient;
  existingEntry?: SymptomDiaryEntry;
  quickMode?: boolean;
}

const MOOD_EMOJIS: Record<MoodLevel, { emoji: string; label: string }> = {
  1: { emoji: '😢', label: 'Muito Ruim' },
  2: { emoji: '😔', label: 'Ruim' },
  3: { emoji: '😐', label: 'Regular' },
  4: { emoji: '🙂', label: 'Bem' },
  5: { emoji: '😊', label: 'Excelente' },
};

const ENERGY_EMOJIS: Record<EnergyLevel, { emoji: string; label: string }> = {
  1: { emoji: '🪫', label: 'Exausto' },
  2: { emoji: '😴', label: 'Cansado' },
  3: { emoji: '😊', label: 'Normal' },
  4: { emoji: '💪', label: 'Energético' },
  5: { emoji: '⚡', label: 'Muito Energético' },
};

const SLEEP_EMOJIS: Record<SleepQuality, { emoji: string; label: string }> = {
  1: { emoji: '😵', label: 'Péssima' },
  2: { emoji: '😴', label: 'Ruim' },
  3: { emoji: '😐', label: 'Regular' },
  4: { emoji: '😌', label: 'Boa' },
  5: { emoji: '🛌', label: 'Excelente' },
};

const PAIN_QUALITIES: Record<PainQuality, { label: string; color: string }> = {
  stabbing: { label: 'Pontada', color: '#ff4444' },
  burning: { label: 'Queimação', color: '#ff8800' },
  aching: { label: 'Dolorida', color: '#ffaa00' },
  throbbing: { label: 'Latejante', color: '#ff6600' },
  sharp: { label: 'Aguda', color: '#ff0000' },
  dull: { label: 'Surda', color: '#888888' },
  cramping: { label: 'Cãibra', color: '#aa4444' },
  tingling: { label: 'Formigamento', color: '#4488ff' },
  numb: { label: 'Dormência', color: '#666666' },
};

const COMMON_SYMPTOMS = [
  'Dor de cabeça',
  'Tontura',
  'Náusea',
  'Fadiga',
  'Rigidez',
  'Inchaço',
  'Formigamento',
  'Dormência',
  'Fraqueza',
  'Espasmos',
  'Sensibilidade',
  'Dificuldade de movimento',
  'Instabilidade',
  'Perda de equilíbrio',
];

export const SymptomDiaryEntryModal: React.FC<SymptomDiaryEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  patient,
  existingEntry,
  quickMode = false,
}) => {
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<
    'pain' | 'wellbeing' | 'activities' | 'notes'
  >('pain');
  const [startTime] = useState(Date.now());

  // Estado do formulário
  const [formData, setFormData] = useState<Partial<SymptomDiaryEntry>>({
    patientId: patient.id,
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    overallPainLevel: 0,
    painLocations: [],
    energyLevel: 3,
    sleepQuality: 3,
    moodLevel: 3,
    medicationsTaken: [],
    exercisesCompleted: [],
    symptoms: [],
    notes: '',
    isComplete: false,
    lastModified: new Date().toISOString(),
    tenantId: patient.tenantId,
  });

  useEffect(() => {
    if (existingEntry) {
      setFormData(existingEntry);
    }
  }, [existingEntry]);

  const handleSave = () => {
    const entryDuration = Math.floor((Date.now() - startTime) / 1000);

    // Verificar se a entrada está completa
    const isComplete = !!(
      formData.overallPainLevel !== undefined &&
      formData.energyLevel &&
      formData.sleepQuality &&
      formData.moodLevel
    );

    const finalEntry: Omit<SymptomDiaryEntry, 'id'> = {
      ...formData,
      entryDuration,
      isComplete,
      lastModified: new Date().toISOString(),
    } as Omit<SymptomDiaryEntry, 'id'>;

    onSave(finalEntry);

    addNotification({
      type: 'success',
      title: 'Diário Salvo',
      message: 'Sua entrada do diário de sintomas foi salva com sucesso!',
    });

    onClose();
  };

  const updateFormData = (updates: Partial<SymptomDiaryEntry>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const addPainLocation = () => {
    const newPainLocation: PainLocation = {
      id: `pain_${Date.now()}`,
      region: 'lower_back',
      intensity: 5,
      quality: ['aching'],
      notes: '',
    };

    updateFormData({
      painLocations: [...(formData.painLocations || []), newPainLocation],
    });
  };

  const updatePainLocation = (
    index: number,
    updates: Partial<PainLocation>
  ) => {
    const updatedLocations = [...(formData.painLocations || [])];
    updatedLocations[index] = { ...updatedLocations[index], ...updates };
    updateFormData({ painLocations: updatedLocations });
  };

  const removePainLocation = (index: number) => {
    const updatedLocations = [...(formData.painLocations || [])];
    updatedLocations.splice(index, 1);
    updateFormData({ painLocations: updatedLocations });
  };

  const addMedication = () => {
    const newMedication: MedicationTaken = {
      id: `med_${Date.now()}`,
      name: '',
      dosage: '',
      time: new Date().toTimeString().slice(0, 5),
      takenAsScheduled: true,
      effectiveness: 3,
    };

    updateFormData({
      medicationsTaken: [...(formData.medicationsTaken || []), newMedication],
    });
  };

  const updateMedication = (
    index: number,
    updates: Partial<MedicationTaken>
  ) => {
    const updatedMedications = [...(formData.medicationsTaken || [])];
    updatedMedications[index] = { ...updatedMedications[index], ...updates };
    updateFormData({ medicationsTaken: updatedMedications });
  };

  const removeMedication = (index: number) => {
    const updatedMedications = [...(formData.medicationsTaken || [])];
    updatedMedications.splice(index, 1);
    updateFormData({ medicationsTaken: updatedMedications });
  };

  const addExercise = () => {
    const newExercise: ExerciseCompleted = {
      id: `ex_${Date.now()}`,
      exerciseId: '',
      exerciseName: '',
      duration: 15,
      intensity: 3,
      difficulty: 3,
      notes: '',
    };

    updateFormData({
      exercisesCompleted: [...(formData.exercisesCompleted || []), newExercise],
    });
  };

  const updateExercise = (
    index: number,
    updates: Partial<ExerciseCompleted>
  ) => {
    const updatedExercises = [...(formData.exercisesCompleted || [])];
    updatedExercises[index] = { ...updatedExercises[index], ...updates };
    updateFormData({ exercisesCompleted: updatedExercises });
  };

  const removeExercise = (index: number) => {
    const updatedExercises = [...(formData.exercisesCompleted || [])];
    updatedExercises.splice(index, 1);
    updateFormData({ exercisesCompleted: updatedExercises });
  };

  const toggleSymptom = (symptom: string) => {
    const currentSymptoms = formData.symptoms || [];
    const updatedSymptoms = currentSymptoms.includes(symptom)
      ? currentSymptoms.filter((s) => s !== symptom)
      : [...currentSymptoms, symptom];

    updateFormData({ symptoms: updatedSymptoms });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold">
              {existingEntry ? 'Editar' : 'Novo'} Registro do Diário
            </h2>
            <p className="text-sm text-gray-500">
              {formData.date} - {patient.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${
                !quickMode && activeTab === 'pain'
                  ? 25
                  : !quickMode && activeTab === 'wellbeing'
                    ? 50
                    : !quickMode && activeTab === 'activities'
                      ? 75
                      : 100
              }%`,
            }}
          />
        </div>

        {/* Tabs - Only in full mode */}
        {!quickMode && (
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'pain', label: 'Dor e Sintomas', icon: '🔴' },
                { id: 'wellbeing', label: 'Bem-estar', icon: '😊' },
                { id: 'activities', label: 'Atividades', icon: '💊' },
                { id: 'notes', label: 'Observações', icon: '📝' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`border-b-2 px-1 py-4 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[calc(95vh-200px)] overflow-y-auto p-6">
          {/* Quick Mode - All fields in one view */}
          {quickMode && (
            <div className="space-y-6">
              {/* Pain Level */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nível de Dor Geral (0-10)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.overallPainLevel || 0}
                    onChange={(e) =>
                      updateFormData({
                        overallPainLevel: parseInt(e.target.value),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="w-12 text-center text-lg font-bold">
                    {formData.overallPainLevel || 0}
                  </span>
                </div>
              </div>

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Energy */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Energia
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() =>
                          updateFormData({ energyLevel: level as EnergyLevel })
                        }
                        className={`flex-1 rounded-md p-2 text-center ${
                          formData.energyLevel === level
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <div className="text-lg">
                          {ENERGY_EMOJIS[level as EnergyLevel].emoji}
                        </div>
                        <div className="text-xs">{level}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleep */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Sono
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() =>
                          updateFormData({
                            sleepQuality: level as SleepQuality,
                          })
                        }
                        className={`flex-1 rounded-md p-2 text-center ${
                          formData.sleepQuality === level
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <div className="text-lg">
                          {SLEEP_EMOJIS[level as SleepQuality].emoji}
                        </div>
                        <div className="text-xs">{level}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Humor
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() =>
                          updateFormData({ moodLevel: level as MoodLevel })
                        }
                        className={`flex-1 rounded-md p-2 text-center ${
                          formData.moodLevel === level
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <div className="text-lg">
                          {MOOD_EMOJIS[level as MoodLevel].emoji}
                        </div>
                        <div className="text-xs">{level}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Observações Rápidas
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => updateFormData({ notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Como você se sentiu hoje? Alguma observação importante..."
                />
              </div>
            </div>
          )}

          {/* Full Mode - Tabbed interface */}
          {!quickMode && (
            <>
              {/* Pain and Symptoms Tab */}
              {activeTab === 'pain' && (
                <div className="space-y-6">
                  {/* Overall Pain Level */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Nível de Dor Geral (0-10)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={formData.overallPainLevel || 0}
                        onChange={(e) =>
                          updateFormData({
                            overallPainLevel: parseInt(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="w-12 text-center text-lg font-bold text-red-600">
                        {formData.overallPainLevel || 0}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                      <span>Sem dor</span>
                      <span>Dor insuportável</span>
                    </div>
                  </div>

                  {/* Pain Locations */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Localizações da Dor
                      </label>
                      <button
                        onClick={addPainLocation}
                        className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                      >
                        + Adicionar Local
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(formData.painLocations || []).map((location, index) => (
                        <div
                          key={location.id}
                          className="rounded-lg border border-gray-200 p-4"
                        >
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                Região
                              </label>
                              <select
                                value={location.region}
                                onChange={(e) =>
                                  updatePainLocation(index, {
                                    region: e.target.value as BodyRegion,
                                  })
                                }
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="head">Cabeça</option>
                                <option value="neck">Pescoço</option>
                                <option value="shoulder_left">
                                  Ombro Esquerdo
                                </option>
                                <option value="shoulder_right">
                                  Ombro Direito
                                </option>
                                <option value="upper_back">
                                  Parte Superior das Costas
                                </option>
                                <option value="lower_back">
                                  Parte Inferior das Costas
                                </option>
                                <option value="knee_left">
                                  Joelho Esquerdo
                                </option>
                                <option value="knee_right">
                                  Joelho Direito
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                Intensidade (0-10)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={location.intensity}
                                onChange={(e) =>
                                  updatePainLocation(index, {
                                    intensity: parseInt(e.target.value),
                                  })
                                }
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                onClick={() => removePainLocation(index)}
                                className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                              >
                                Remover
                              </button>
                            </div>
                          </div>

                          {/* Pain Quality */}
                          <div className="mt-3">
                            <label className="mb-2 block text-xs font-medium text-gray-700">
                              Tipo de Dor
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(PAIN_QUALITIES).map(
                                ([quality, info]) => (
                                  <button
                                    key={quality}
                                    onClick={() => {
                                      const currentQualities =
                                        location.quality || [];
                                      const updatedQualities =
                                        currentQualities.includes(
                                          quality as PainQuality
                                        )
                                          ? currentQualities.filter(
                                              (q) => q !== quality
                                            )
                                          : [
                                              ...currentQualities,
                                              quality as PainQuality,
                                            ];
                                      updatePainLocation(index, {
                                        quality: updatedQualities,
                                      });
                                    }}
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                      location.quality?.includes(
                                        quality as PainQuality
                                      )
                                        ? 'text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    style={{
                                      backgroundColor:
                                        location.quality?.includes(
                                          quality as PainQuality
                                        )
                                          ? info.color
                                          : undefined,
                                    }}
                                  >
                                    {info.label}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Common Symptoms */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      Sintomas Relatados
                    </label>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {COMMON_SYMPTOMS.map((symptom) => (
                        <button
                          key={symptom}
                          onClick={() => toggleSymptom(symptom)}
                          className={`rounded-md px-3 py-2 text-sm font-medium ${
                            formData.symptoms?.includes(symptom)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Wellbeing Tab */}
              {activeTab === 'wellbeing' && (
                <div className="space-y-6">
                  {/* Energy Level */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      Nível de Energia
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          onClick={() =>
                            updateFormData({
                              energyLevel: level as EnergyLevel,
                            })
                          }
                          className={`rounded-lg p-4 text-center transition-all ${
                            formData.energyLevel === level
                              ? 'bg-blue-500 text-white shadow-lg'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <div className="mb-2 text-2xl">
                            {ENERGY_EMOJIS[level as EnergyLevel].emoji}
                          </div>
                          <div className="text-sm font-medium">
                            {ENERGY_EMOJIS[level as EnergyLevel].label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sleep Quality */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      Qualidade do Sono
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          onClick={() =>
                            updateFormData({
                              sleepQuality: level as SleepQuality,
                            })
                          }
                          className={`rounded-lg p-4 text-center transition-all ${
                            formData.sleepQuality === level
                              ? 'bg-blue-500 text-white shadow-lg'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <div className="mb-2 text-2xl">
                            {SLEEP_EMOJIS[level as SleepQuality].emoji}
                          </div>
                          <div className="text-sm font-medium">
                            {SLEEP_EMOJIS[level as SleepQuality].label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sleep Hours */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Horas de Sono
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={formData.sleepHours || ''}
                      onChange={(e) =>
                        updateFormData({
                          sleepHours: parseFloat(e.target.value),
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 7.5"
                    />
                  </div>

                  {/* Mood Level */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      Humor
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          onClick={() =>
                            updateFormData({ moodLevel: level as MoodLevel })
                          }
                          className={`rounded-lg p-4 text-center transition-all ${
                            formData.moodLevel === level
                              ? 'bg-blue-500 text-white shadow-lg'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <div className="mb-2 text-2xl">
                            {MOOD_EMOJIS[level as MoodLevel].emoji}
                          </div>
                          <div className="text-sm font-medium">
                            {MOOD_EMOJIS[level as MoodLevel].label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stress Level */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Nível de Estresse (0-10)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={formData.stressLevel || 0}
                        onChange={(e) =>
                          updateFormData({
                            stressLevel: parseInt(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="w-12 text-center text-lg font-bold">
                        {formData.stressLevel || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Activities Tab */}
              {activeTab === 'activities' && (
                <div className="space-y-6">
                  {/* Medications */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Medicamentos Tomados
                      </label>
                      <button
                        onClick={addMedication}
                        className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                      >
                        + Adicionar Medicamento
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(formData.medicationsTaken || []).map(
                        (medication, index) => (
                          <div
                            key={medication.id}
                            className="rounded-lg border border-gray-200 p-4"
                          >
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                  Nome
                                </label>
                                <input
                                  type="text"
                                  value={medication.name}
                                  onChange={(e) =>
                                    updateMedication(index, {
                                      name: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Nome do medicamento"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                  Dosagem
                                </label>
                                <input
                                  type="text"
                                  value={medication.dosage}
                                  onChange={(e) =>
                                    updateMedication(index, {
                                      dosage: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ex: 500mg"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                  Horário
                                </label>
                                <input
                                  type="time"
                                  value={medication.time}
                                  onChange={(e) =>
                                    updateMedication(index, {
                                      time: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div className="flex items-end">
                                <button
                                  onClick={() => removeMedication(index)}
                                  className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={medication.takenAsScheduled}
                                  onChange={(e) =>
                                    updateMedication(index, {
                                      takenAsScheduled: e.target.checked,
                                    })
                                  }
                                  className="mr-2 rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">
                                  Tomado conforme prescrito
                                </span>
                              </label>

                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-700">
                                  Efetividade:
                                </span>
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <button
                                    key={level}
                                    onClick={() =>
                                      updateMedication(index, {
                                        effectiveness: level,
                                      })
                                    }
                                    className={`h-6 w-6 rounded-full text-xs ${
                                      medication.effectiveness === level
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                  >
                                    {level}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Exercises */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Exercícios Realizados
                      </label>
                      <button
                        onClick={addExercise}
                        className="rounded-md bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
                      >
                        + Adicionar Exercício
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(formData.exercisesCompleted || []).map(
                        (exercise, index) => (
                          <div
                            key={exercise.id}
                            className="rounded-lg border border-gray-200 p-4"
                          >
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                  Nome do Exercício
                                </label>
                                <input
                                  type="text"
                                  value={exercise.exerciseName}
                                  onChange={(e) =>
                                    updateExercise(index, {
                                      exerciseName: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Nome do exercício"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                  Duração (min)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={exercise.duration}
                                  onChange={(e) =>
                                    updateExercise(index, {
                                      duration: parseInt(e.target.value),
                                    })
                                  }
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div className="flex items-end">
                                <button
                                  onClick={() => removeExercise(index)}
                                  className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-4">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                  Intensidade (1-5)
                                </label>
                                <div className="flex space-x-1">
                                  {[1, 2, 3, 4, 5].map((level) => (
                                    <button
                                      key={level}
                                      onClick={() =>
                                        updateExercise(index, {
                                          intensity: level,
                                        })
                                      }
                                      className={`h-8 w-8 rounded text-xs ${
                                        exercise.intensity === level
                                          ? 'bg-blue-500 text-white'
                                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                      }`}
                                    >
                                      {level}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                  Dificuldade (1-5)
                                </label>
                                <div className="flex space-x-1">
                                  {[1, 2, 3, 4, 5].map((level) => (
                                    <button
                                      key={level}
                                      onClick={() =>
                                        updateExercise(index, {
                                          difficulty: level,
                                        })
                                      }
                                      className={`h-8 w-8 rounded text-xs ${
                                        exercise.difficulty === level
                                          ? 'bg-green-500 text-white'
                                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                      }`}
                                    >
                                      {level}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  {/* General Notes */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Observações Gerais
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) =>
                        updateFormData({ notes: e.target.value })
                      }
                      rows={6}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Como você se sentiu hoje? Algo diferente aconteceu? Observações sobre o tratamento, exercícios, ou sintomas..."
                    />
                  </div>

                  {/* Treatment Adherence */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Aderência ao Tratamento (0-10)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={formData.treatmentAdherence || 5}
                        onChange={(e) =>
                          updateFormData({
                            treatmentAdherence: parseInt(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="w-12 text-center text-lg font-bold">
                        {formData.treatmentAdherence || 5}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      O quanto você seguiu o tratamento prescrito hoje?
                    </p>
                  </div>

                  {/* Treatment Satisfaction */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Satisfação com o Tratamento (0-10)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={formData.treatmentSatisfaction || 5}
                        onChange={(e) =>
                          updateFormData({
                            treatmentSatisfaction: parseInt(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="w-12 text-center text-lg font-bold">
                        {formData.treatmentSatisfaction || 5}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Como você avalia a efetividade do seu tratamento atual?
                    </p>
                  </div>

                  {/* External Factors */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Influência do Clima
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.weatherInfluence || false}
                          onChange={(e) =>
                            updateFormData({
                              weatherInfluence: e.target.checked,
                            })
                          }
                          className="mr-2 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">
                          O clima afetou meus sintomas hoje
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Estresse no Trabalho (0-10)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={formData.workStressLevel || 0}
                        onChange={(e) =>
                          updateFormData({
                            workStressLevel: parseInt(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Nenhum</span>
                        <span className="font-medium">
                          {formData.workStressLevel || 0}
                        </span>
                        <span>Muito alto</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <div className="flex space-x-3">
              {!quickMode && (
                <button
                  onClick={() => {
                    // Switch to quick mode for faster completion
                    setActiveTab('pain');
                  }}
                  className="rounded-md border border-blue-600 px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50"
                >
                  Modo Rápido
                </button>
              )}
              <button
                onClick={handleSave}
                className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Salvar Registro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymptomDiaryEntryModal;
