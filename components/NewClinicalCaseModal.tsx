import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import {
  ClinicalCase,
  CaseExamination,
  CaseIntervention,
  CaseEvolution,
} from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';
import { IconPlus, IconTrash, IconUpload } from './icons/IconComponents';

interface NewClinicalCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewClinicalCaseModal: React.FC<NewClinicalCaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { saveClinicalCase } = useData();
  const { user } = useAuth();

  const [formData, setFormData] = useState<Partial<ClinicalCase>>({
    title: '',
    specialty: 'Geral',
    pathology: '',
    tags: [],
    difficulty: 'Iniciante',
    anonymizedPatientData: {
      age: 0,
      gender: 'M',
      occupation: '',
      relevantHistory: '',
    },
    clinicalHistory: '',
    examinations: [],
    treatment: {
      objectives: [],
      interventions: [],
      duration: '',
      frequency: '',
      precautions: [],
    },
    evolution: [],
    attachments: [],
    discussionQuestions: [],
    learningObjectives: [],
    isPublished: false,
  });

  const [currentTag, setCurrentTag] = useState('');
  const [currentObjective, setCurrentObjective] = useState('');
  const [currentPrecaution, setCurrentPrecaution] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentLearningObjective, setCurrentLearningObjective] = useState('');

  const specialties = [
    'Ortopedia',
    'Neurologia',
    'Cardio',
    'Respiratoria',
    'Pediatria',
    'Geriatria',
    'Esportiva',
    'Geral',
  ];
  const difficulties = ['Iniciante', 'Intermediário', 'Avançado'];
  const examinationTypes = [
    'Física',
    'Laboratorial',
    'Imagem',
    'Funcional',
    'Outro',
  ];
  const interventionTypes = [
    'Cinesioterapia',
    'Terapia Manual',
    'Eletroterapia',
    'Hidroterapia',
    'Educação',
    'Outro',
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePatientDataChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      anonymizedPatientData: {
        ...prev.anonymizedPatientData!,
        [field]: value,
      },
    }));
  };

  const handleTreatmentChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      treatment: {
        ...prev.treatment!,
        [field]: value,
      },
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      handleInputChange('tags', [...(formData.tags || []), currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange(
      'tags',
      formData.tags?.filter((tag) => tag !== tagToRemove) || []
    );
  };

  const addObjective = () => {
    if (currentObjective.trim()) {
      handleTreatmentChange('objectives', [
        ...(formData.treatment?.objectives || []),
        currentObjective.trim(),
      ]);
      setCurrentObjective('');
    }
  };

  const removeObjective = (index: number) => {
    const objectives = [...(formData.treatment?.objectives || [])];
    objectives.splice(index, 1);
    handleTreatmentChange('objectives', objectives);
  };

  const addPrecaution = () => {
    if (currentPrecaution.trim()) {
      handleTreatmentChange('precautions', [
        ...(formData.treatment?.precautions || []),
        currentPrecaution.trim(),
      ]);
      setCurrentPrecaution('');
    }
  };

  const removePrecaution = (index: number) => {
    const precautions = [...(formData.treatment?.precautions || [])];
    precautions.splice(index, 1);
    handleTreatmentChange('precautions', precautions);
  };

  const addQuestion = () => {
    if (currentQuestion.trim()) {
      handleInputChange('discussionQuestions', [
        ...(formData.discussionQuestions || []),
        currentQuestion.trim(),
      ]);
      setCurrentQuestion('');
    }
  };

  const removeQuestion = (index: number) => {
    const questions = [...(formData.discussionQuestions || [])];
    questions.splice(index, 1);
    handleInputChange('discussionQuestions', questions);
  };

  const addLearningObjective = () => {
    if (currentLearningObjective.trim()) {
      handleInputChange('learningObjectives', [
        ...(formData.learningObjectives || []),
        currentLearningObjective.trim(),
      ]);
      setCurrentLearningObjective('');
    }
  };

  const removeLearningObjective = (index: number) => {
    const objectives = [...(formData.learningObjectives || [])];
    objectives.splice(index, 1);
    handleInputChange('learningObjectives', objectives);
  };

  const addExamination = () => {
    const newExamination: CaseExamination = {
      id: `exam-${Date.now()}`,
      type: 'Física',
      name: '',
      findings: '',
      date: new Date().toISOString().split('T')[0],
      attachments: [],
    };
    handleInputChange('examinations', [
      ...(formData.examinations || []),
      newExamination,
    ]);
  };

  const updateExamination = (index: number, field: string, value: any) => {
    const examinations = [...(formData.examinations || [])];
    examinations[index] = { ...examinations[index], [field]: value };
    handleInputChange('examinations', examinations);
  };

  const removeExamination = (index: number) => {
    const examinations = [...(formData.examinations || [])];
    examinations.splice(index, 1);
    handleInputChange('examinations', examinations);
  };

  const addIntervention = () => {
    const newIntervention: CaseIntervention = {
      id: `intervention-${Date.now()}`,
      type: 'Cinesioterapia',
      description: '',
      parameters: '',
      progression: '',
    };
    handleTreatmentChange('interventions', [
      ...(formData.treatment?.interventions || []),
      newIntervention,
    ]);
  };

  const updateIntervention = (index: number, field: string, value: any) => {
    const interventions = [...(formData.treatment?.interventions || [])];
    interventions[index] = { ...interventions[index], [field]: value };
    handleTreatmentChange('interventions', interventions);
  };

  const removeIntervention = (index: number) => {
    const interventions = [...(formData.treatment?.interventions || [])];
    interventions.splice(index, 1);
    handleTreatmentChange('interventions', interventions);
  };

  const addEvolution = () => {
    const newEvolution: CaseEvolution = {
      id: `evolution-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      sessionNumber: (formData.evolution?.length || 0) + 1,
      findings: '',
      progress: '',
      modifications: '',
      nextSteps: '',
    };
    handleInputChange('evolution', [
      ...(formData.evolution || []),
      newEvolution,
    ]);
  };

  const updateEvolution = (index: number, field: string, value: any) => {
    const evolution = [...(formData.evolution || [])];
    evolution[index] = { ...evolution[index], [field]: value };
    handleInputChange('evolution', evolution);
  };

  const removeEvolution = (index: number) => {
    const evolution = [...(formData.evolution || [])];
    evolution.splice(index, 1);
    handleInputChange('evolution', evolution);
  };

  const handleSave = () => {
    if (
      !user ||
      !formData.title ||
      !formData.pathology ||
      !formData.clinicalHistory
    ) {
      return;
    }

    const now = new Date().toISOString();
    const newCase: ClinicalCase = {
      ...(formData as ClinicalCase),
      id: `case-${crypto.randomUUID()}`,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
      viewCount: 0,
      rating: 0,
      ratingCount: 0,
      tenantId: user.tenantId!,
    };

    saveClinicalCase(newCase, user);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      specialty: 'Geral',
      pathology: '',
      tags: [],
      difficulty: 'Iniciante',
      anonymizedPatientData: {
        age: 0,
        gender: 'M',
        occupation: '',
        relevantHistory: '',
      },
      clinicalHistory: '',
      examinations: [],
      treatment: {
        objectives: [],
        interventions: [],
        duration: '',
        frequency: '',
        precautions: [],
      },
      evolution: [],
      attachments: [],
      discussionQuestions: [],
      learningObjectives: [],
      isPublished: false,
    });
    setCurrentTag('');
    setCurrentObjective('');
    setCurrentPrecaution('');
    setCurrentQuestion('');
    setCurrentLearningObjective('');
  };

  const isFormValid =
    formData.title && formData.pathology && formData.clinicalHistory;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Caso Clínico"
      size="xl"
    >
      <div className="max-h-[80vh] space-y-6 overflow-y-auto">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-50">
            Informações Básicas
          </h3>

          <FormField
            label="Título do Caso"
            value={formData.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Ex: Lesão de Menisco com Reabilitação Pós-Cirúrgica"
            required
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Especialidade
              </label>
              <select
                value={formData.specialty}
                onChange={(e) => handleInputChange('specialty', e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Dificuldade
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) =>
                  handleInputChange('difficulty', e.target.value)
                }
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormField
            label="Patologia"
            value={formData.pathology || ''}
            onChange={(e) => handleInputChange('pathology', e.target.value)}
            placeholder="Ex: Lesão de Menisco Medial"
            required
          />

          {/* Tags */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Tags
            </label>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addTag())
                }
                placeholder="Adicionar tag..."
                className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              />
              <Button variant="secondary" onClick={addTag} size="sm">
                <IconPlus />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-sm text-white"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-200"
                  >
                    <IconTrash className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Patient Data */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-50">
            Dados do Paciente (Anonimizados)
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label="Idade"
              type="number"
              value={formData.anonymizedPatientData?.age || ''}
              onChange={(e) =>
                handlePatientDataChange('age', parseInt(e.target.value) || 0)
              }
              placeholder="Ex: 35"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Sexo
              </label>
              <select
                value={formData.anonymizedPatientData?.gender}
                onChange={(e) =>
                  handlePatientDataChange('gender', e.target.value)
                }
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <FormField
              label="Profissão"
              value={formData.anonymizedPatientData?.occupation || ''}
              onChange={(e) =>
                handlePatientDataChange('occupation', e.target.value)
              }
              placeholder="Ex: Engenheiro"
            />
          </div>

          <FormField
            label="Histórico Relevante"
            value={formData.anonymizedPatientData?.relevantHistory || ''}
            onChange={(e) =>
              handlePatientDataChange('relevantHistory', e.target.value)
            }
            placeholder="Histórico médico relevante para o caso..."
            multiline
            rows={3}
          />
        </div>

        {/* Clinical History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-50">
            Histórico Clínico
          </h3>
          <FormField
            label="Descrição Detalhada"
            value={formData.clinicalHistory || ''}
            onChange={(e) =>
              handleInputChange('clinicalHistory', e.target.value)
            }
            placeholder="Descreva a queixa principal, início dos sintomas, evolução..."
            multiline
            rows={5}
            required
          />
        </div>

        {/* Examinations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-50">
              Exames Realizados
            </h3>
            <Button variant="secondary" onClick={addExamination} size="sm">
              <IconPlus />
              <span>Adicionar Exame</span>
            </Button>
          </div>

          {formData.examinations?.map((exam, index) => (
            <div
              key={exam.id}
              className="space-y-3 rounded-lg bg-slate-800 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-300">
                  Exame #{index + 1}
                </span>
                <Button
                  variant="danger"
                  onClick={() => removeExamination(index)}
                  size="sm"
                >
                  <IconTrash />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Tipo
                  </label>
                  <select
                    value={exam.type}
                    onChange={(e) =>
                      updateExamination(index, 'type', e.target.value)
                    }
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
                  >
                    {examinationTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <FormField
                  label="Nome do Exame"
                  value={exam.name}
                  onChange={(e) =>
                    updateExamination(index, 'name', e.target.value)
                  }
                  placeholder="Ex: Ressonância Magnética do Joelho"
                />
              </div>

              <FormField
                label="Achados"
                value={exam.findings}
                onChange={(e) =>
                  updateExamination(index, 'findings', e.target.value)
                }
                placeholder="Descreva os principais achados do exame..."
                multiline
                rows={3}
              />
            </div>
          ))}
        </div>

        {/* Treatment */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-50">Tratamento</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Duração do Tratamento"
              value={formData.treatment?.duration || ''}
              onChange={(e) =>
                handleTreatmentChange('duration', e.target.value)
              }
              placeholder="Ex: 8 semanas"
            />
            <FormField
              label="Frequência"
              value={formData.treatment?.frequency || ''}
              onChange={(e) =>
                handleTreatmentChange('frequency', e.target.value)
              }
              placeholder="Ex: 3x por semana"
            />
          </div>

          {/* Objectives */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Objetivos do Tratamento
            </label>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={currentObjective}
                onChange={(e) => setCurrentObjective(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addObjective())
                }
                placeholder="Adicionar objetivo..."
                className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              />
              <Button variant="secondary" onClick={addObjective} size="sm">
                <IconPlus />
              </Button>
            </div>
            <ul className="space-y-1">
              {formData.treatment?.objectives?.map((objective, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between rounded bg-slate-800 p-2"
                >
                  <span className="text-slate-300">{objective}</span>
                  <Button
                    variant="danger"
                    onClick={() => removeObjective(index)}
                    size="sm"
                  >
                    <IconTrash className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          {/* Interventions */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">
                Intervenções
              </label>
              <Button variant="secondary" onClick={addIntervention} size="sm">
                <IconPlus />
                <span>Adicionar Intervenção</span>
              </Button>
            </div>

            {formData.treatment?.interventions?.map((intervention, index) => (
              <div
                key={intervention.id}
                className="mb-3 space-y-3 rounded-lg bg-slate-800 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-300">
                    Intervenção #{index + 1}
                  </span>
                  <Button
                    variant="danger"
                    onClick={() => removeIntervention(index)}
                    size="sm"
                  >
                    <IconTrash />
                  </Button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    Tipo
                  </label>
                  <select
                    value={intervention.type}
                    onChange={(e) =>
                      updateIntervention(index, 'type', e.target.value)
                    }
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
                  >
                    {interventionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <FormField
                  label="Descrição"
                  value={intervention.description}
                  onChange={(e) =>
                    updateIntervention(index, 'description', e.target.value)
                  }
                  placeholder="Descreva a intervenção..."
                  multiline
                  rows={2}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    label="Parâmetros"
                    value={intervention.parameters || ''}
                    onChange={(e) =>
                      updateIntervention(index, 'parameters', e.target.value)
                    }
                    placeholder="Ex: 3x10 repetições"
                  />
                  <FormField
                    label="Progressão"
                    value={intervention.progression}
                    onChange={(e) =>
                      updateIntervention(index, 'progression', e.target.value)
                    }
                    placeholder="Como progredir a intervenção..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Precautions */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Precauções
            </label>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={currentPrecaution}
                onChange={(e) => setCurrentPrecaution(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addPrecaution())
                }
                placeholder="Adicionar precaução..."
                className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              />
              <Button variant="secondary" onClick={addPrecaution} size="sm">
                <IconPlus />
              </Button>
            </div>
            <ul className="space-y-1">
              {formData.treatment?.precautions?.map((precaution, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between rounded bg-slate-800 p-2"
                >
                  <span className="text-slate-300">{precaution}</span>
                  <Button
                    variant="danger"
                    onClick={() => removePrecaution(index)}
                    size="sm"
                  >
                    <IconTrash className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Evolution */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-50">
              Evolução do Caso
            </h3>
            <Button variant="secondary" onClick={addEvolution} size="sm">
              <IconPlus />
              <span>Adicionar Sessão</span>
            </Button>
          </div>

          {formData.evolution?.map((evolution, index) => (
            <div
              key={evolution.id}
              className="space-y-3 rounded-lg bg-slate-800 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-300">
                  Sessão #{evolution.sessionNumber}
                </span>
                <Button
                  variant="danger"
                  onClick={() => removeEvolution(index)}
                  size="sm"
                >
                  <IconTrash />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Data"
                  type="date"
                  value={evolution.date}
                  onChange={(e) =>
                    updateEvolution(index, 'date', e.target.value)
                  }
                />
                <FormField
                  label="Número da Sessão"
                  type="number"
                  value={evolution.sessionNumber}
                  onChange={(e) =>
                    updateEvolution(
                      index,
                      'sessionNumber',
                      parseInt(e.target.value) || 1
                    )
                  }
                />
              </div>

              <FormField
                label="Achados"
                value={evolution.findings}
                onChange={(e) =>
                  updateEvolution(index, 'findings', e.target.value)
                }
                placeholder="O que foi observado nesta sessão..."
                multiline
                rows={2}
              />

              <FormField
                label="Progresso"
                value={evolution.progress}
                onChange={(e) =>
                  updateEvolution(index, 'progress', e.target.value)
                }
                placeholder="Progresso observado..."
                multiline
                rows={2}
              />

              <FormField
                label="Modificações"
                value={evolution.modifications}
                onChange={(e) =>
                  updateEvolution(index, 'modifications', e.target.value)
                }
                placeholder="Modificações feitas no tratamento..."
                multiline
                rows={2}
              />

              <FormField
                label="Próximos Passos"
                value={evolution.nextSteps}
                onChange={(e) =>
                  updateEvolution(index, 'nextSteps', e.target.value)
                }
                placeholder="Planejamento para as próximas sessões..."
                multiline
                rows={2}
              />
            </div>
          ))}
        </div>

        {/* Discussion Questions */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Questões para Discussão
          </label>
          <div className="mb-2 flex gap-2">
            <input
              type="text"
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              onKeyPress={(e) =>
                e.key === 'Enter' && (e.preventDefault(), addQuestion())
              }
              placeholder="Adicionar questão para discussão..."
              className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
            />
            <Button variant="secondary" onClick={addQuestion} size="sm">
              <IconPlus />
            </Button>
          </div>
          <ul className="space-y-1">
            {formData.discussionQuestions?.map((question, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded bg-slate-800 p-2"
              >
                <span className="text-slate-300">{question}</span>
                <Button
                  variant="danger"
                  onClick={() => removeQuestion(index)}
                  size="sm"
                >
                  <IconTrash className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {/* Learning Objectives */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Objetivos de Aprendizado
          </label>
          <div className="mb-2 flex gap-2">
            <input
              type="text"
              value={currentLearningObjective}
              onChange={(e) => setCurrentLearningObjective(e.target.value)}
              onKeyPress={(e) =>
                e.key === 'Enter' &&
                (e.preventDefault(), addLearningObjective())
              }
              placeholder="Adicionar objetivo de aprendizado..."
              className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
            />
            <Button
              variant="secondary"
              onClick={addLearningObjective}
              size="sm"
            >
              <IconPlus />
            </Button>
          </div>
          <ul className="space-y-1">
            {formData.learningObjectives?.map((objective, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded bg-slate-800 p-2"
              >
                <span className="text-slate-300">{objective}</span>
                <Button
                  variant="danger"
                  onClick={() => removeLearningObjective(index)}
                  size="sm"
                >
                  <IconTrash className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {/* Publication Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-50">
            Configurações de Publicação
          </h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isPublished}
              onChange={(e) =>
                handleInputChange('isPublished', e.target.checked)
              }
              className="rounded border-slate-600 bg-slate-700"
            />
            <span className="text-slate-300">
              Publicar caso (tornar visível para outros usuários)
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3 border-t border-slate-700 pt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!isFormValid}>
          Salvar Caso
        </Button>
      </div>
    </BaseModal>
  );
};

export default NewClinicalCaseModal;
