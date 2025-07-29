// components/ai-economica/KnowledgeContribution.tsx
// Interface para fisioterapeutas contribuírem com conhecimento

import React, { useState, useEffect } from 'react';
import { KnowledgeEntry } from '../../types/ai-economica.types';
import { KnowledgeBaseService } from '../../services/ai-economica/knowledgeBaseService';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';

interface KnowledgeContributionProps {
  onSubmit?: (entry: KnowledgeEntry) => void;
  onCancel?: () => void;
  initialData?: Partial<KnowledgeEntry>;
  isOpen: boolean;
}

interface FormData {
  title: string;
  content: string;
  type: KnowledgeEntry['type'];
  tags: string[];
  conditions: string[];
  techniques: string[];
  contraindications: string[];
  references: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  evidenceLevel: 'low' | 'moderate' | 'high';
  specialty: string[];
}

const INITIAL_FORM_DATA: FormData = {
  title: '',
  content: '',
  type: 'experience',
  tags: [],
  conditions: [],
  techniques: [],
  contraindications: [],
  references: [],
  difficulty: 'intermediate',
  evidenceLevel: 'moderate',
  specialty: []
};

const KNOWLEDGE_TYPES = [
  { value: 'protocol', label: 'Protocolo Clínico', description: 'Protocolo estruturado de tratamento' },
  { value: 'exercise', label: 'Exercício', description: 'Exercício terapêutico específico' },
  { value: 'case', label: 'Caso Clínico', description: 'Caso real de paciente (anonimizado)' },
  { value: 'technique', label: 'Técnica', description: 'Técnica manual ou procedimento' },
  { value: 'experience', label: 'Experiência', description: 'Conhecimento baseado em experiência prática' }
];

const SPECIALTIES = [
  'Ortopedia', 'Neurologia', 'Cardiorrespiratória', 'Pediátrica', 
  'Geriátrica', 'Esportiva', 'Dermatofuncional', 'Uroginecológica',
  'Traumato-ortopédica', 'Reumatologia', 'Oncologia'
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Iniciante', description: 'Para estudantes e recém-formados' },
  { value: 'intermediate', label: 'Intermediário', description: 'Para profissionais com experiência' },
  { value: 'advanced', label: 'Avançado', description: 'Para especialistas e casos complexos' }
];

const EVIDENCE_LEVELS = [
  { value: 'low', label: 'Baixo', description: 'Baseado em experiência clínica' },
  { value: 'moderate', label: 'Moderado', description: 'Alguns estudos ou consensos' },
  { value: 'high', label: 'Alto', description: 'Evidência científica robusta' }
];

export const KnowledgeContribution: React.FC<KnowledgeContributionProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isOpen
}) => {
  const { user } = useAuth();
  const { currentTenant } = useData();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentTag, setCurrentTag] = useState('');
  const [currentCondition, setCurrentCondition] = useState('');
  const [currentTechnique, setCurrentTechnique] = useState('');
  const [currentContraindication, setCurrentContraindication] = useState('');
  const [currentReference, setCurrentReference] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const knowledgeBaseService = new KnowledgeBaseService();

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        type: initialData.type || 'experience',
        tags: initialData.tags || [],
        conditions: initialData.conditions || [],
        techniques: initialData.techniques || [],
        contraindications: initialData.contraindications || [],
        references: initialData.references || [],
        difficulty: initialData.metadata?.difficulty || 'intermediate',
        evidenceLevel: initialData.metadata?.evidenceLevel || 'moderate',
        specialty: initialData.metadata?.specialty || []
      });
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Título deve ter pelo menos 10 caracteres';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Conteúdo é obrigatório';
    } else if (formData.content.length < 50) {
      newErrors.content = 'Conteúdo deve ter pelo menos 50 caracteres';
    }

    if (formData.tags.length === 0) {
      newErrors.tags = 'Pelo menos uma tag é obrigatória';
    }

    if (formData.specialty.length === 0) {
      newErrors.specialty = 'Pelo menos uma especialidade é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user || !currentTenant) return;

    setIsSubmitting(true);

    try {
      const entry = await knowledgeBaseService.addKnowledge({
        title: formData.title.trim(),
        content: formData.content.trim(),
        summary: generateSummary(formData.content),
        type: formData.type,
        tags: formData.tags,
        conditions: formData.conditions,
        techniques: formData.techniques,
        contraindications: formData.contraindications,
        references: formData.references,
        author: {
          id: user.id,
          name: user.name,
          role: user.role,
          experience: calculateExperience(user) // Função para calcular anos de experiência
        },
        tenantId: currentTenant.id,
        metadata: {
          difficulty: formData.difficulty,
          evidenceLevel: formData.evidenceLevel,
          specialty: formData.specialty
        }
      });

      onSubmit?.(entry);
      resetForm();
      
    } catch (error) {
      console.error('Erro ao salvar conhecimento:', error);
      setErrors({ submit: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setCurrentTag('');
    setCurrentCondition('');
    setCurrentTechnique('');
    setCurrentContraindication('');
    setCurrentReference('');
    setPreviewMode(false);
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addCondition = () => {
    if (currentCondition.trim() && !formData.conditions.includes(currentCondition.trim())) {
      setFormData(prev => ({
        ...prev,
        conditions: [...prev.conditions, currentCondition.trim()]
      }));
      setCurrentCondition('');
    }
  };

  const removeCondition = (conditionToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter(condition => condition !== conditionToRemove)
    }));
  };

  const addTechnique = () => {
    if (currentTechnique.trim() && !formData.techniques.includes(currentTechnique.trim())) {
      setFormData(prev => ({
        ...prev,
        techniques: [...prev.techniques, currentTechnique.trim()]
      }));
      setCurrentTechnique('');
    }
  };

  const removeTechnique = (techniqueToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      techniques: prev.techniques.filter(technique => technique !== techniqueToRemove)
    }));
  };

  const addContraindication = () => {
    if (currentContraindication.trim() && !formData.contraindications.includes(currentContraindication.trim())) {
      setFormData(prev => ({
        ...prev,
        contraindications: [...prev.contraindications, currentContraindication.trim()]
      }));
      setCurrentContraindication('');
    }
  };

  const removeContraindication = (contraindicationToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      contraindications: prev.contraindications.filter(contraindication => contraindication !== contraindicationToRemove)
    }));
  };

  const addReference = () => {
    if (currentReference.trim() && !formData.references.includes(currentReference.trim())) {
      setFormData(prev => ({
        ...prev,
        references: [...prev.references, currentReference.trim()]
      }));
      setCurrentReference('');
    }
  };

  const removeReference = (referenceToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.filter(reference => reference !== referenceToRemove)
    }));
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialty: prev.specialty.includes(specialty)
        ? prev.specialty.filter(s => s !== specialty)
        : [...prev.specialty, specialty]
    }));
  };

  const generateSummary = (content: string): string => {
    // Gerar resumo automático dos primeiros 200 caracteres
    const summary = content.trim().substring(0, 200);
    return summary.length < content.length ? summary + '...' : summary;
  };

  const calculateExperience = (user: any): number => {
    // Lógica para calcular anos de experiência baseado no perfil do usuário
    // Por enquanto, retorna um valor padrão
    return 5;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Contribuir com Conhecimento
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                {previewMode ? 'Editar' : 'Visualizar'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {previewMode ? (
          <div className="p-6">
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold mb-4">{formData.title}</h3>
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
                  {KNOWLEDGE_TYPES.find(t => t.value === formData.type)?.label}
                </span>
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-2">
                  {DIFFICULTY_LEVELS.find(d => d.value === formData.difficulty)?.label}
                </span>
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  Evidência {EVIDENCE_LEVELS.find(e => e.value === formData.evidenceLevel)?.label}
                </span>
              </div>
              <div className="whitespace-pre-wrap mb-6">{formData.content}</div>
              
              {formData.tags.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.conditions.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Condições Relacionadas:</h4>
                  <ul className="list-disc list-inside">
                    {formData.conditions.map(condition => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </div>
              )}

              {formData.contraindications.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2 text-red-600">Contraindicações:</h4>
                  <ul className="list-disc list-inside text-red-600">
                    {formData.contraindications.map(contraindication => (
                      <li key={contraindication}>{contraindication}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Tipo de Conhecimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Conhecimento *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {KNOWLEDGE_TYPES.map(type => (
                  <label key={type.value} className="relative">
                    <input
                      type="radio"
                      name="type"
                      value={type.value}
                      checked={formData.type === type.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as KnowledgeEntry['type'] }))}
                      className="sr-only"
                    />
                    <div className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Título */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Protocolo para lombalgia aguda"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Conteúdo */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo *
              </label>
              <textarea
                id="content"
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.content ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Descreva detalhadamente o conhecimento que deseja compartilhar..."
              />
              <div className="mt-1 text-sm text-gray-500">
                {formData.content.length} caracteres (mínimo 50)
              </div>
              {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags * (palavras-chave para busca)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite uma tag e pressione Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {errors.tags && <p className="mt-1 text-sm text-red-600">{errors.tags}</p>}
            </div>

            {/* Especialidades */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidades * (selecione todas as aplicáveis)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {SPECIALTIES.map(specialty => (
                  <label key={specialty} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.specialty.includes(specialty)}
                      onChange={() => toggleSpecialty(specialty)}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{specialty}</span>
                  </label>
                ))}
              </div>
              {errors.specialty && <p className="mt-1 text-sm text-red-600">{errors.specialty}</p>}
            </div>

            {/* Nível de Dificuldade e Evidência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível de Dificuldade
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DIFFICULTY_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label} - {level.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível de Evidência
                </label>
                <select
                  value={formData.evidenceLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, evidenceLevel: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EVIDENCE_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label} - {level.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condições Relacionadas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condições Médicas Relacionadas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentCondition}
                  onChange={(e) => setCurrentCondition(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Lombalgia, Hérnia de disco, etc."
                />
                <button
                  type="button"
                  onClick={addCondition}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.conditions.map(condition => (
                  <span key={condition} className="inline-flex items-center bg-green-100 text-green-800 text-sm px-2 py-1 rounded">
                    {condition}
                    <button
                      type="button"
                      onClick={() => removeCondition(condition)}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Técnicas Envolvidas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Técnicas Envolvidas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentTechnique}
                  onChange={(e) => setCurrentTechnique(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTechnique())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Mobilização articular, Terapia manual, etc."
                />
                <button
                  type="button"
                  onClick={addTechnique}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.techniques.map(technique => (
                  <span key={technique} className="inline-flex items-center bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded">
                    {technique}
                    <button
                      type="button"
                      onClick={() => removeTechnique(technique)}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Contraindicações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraindicações
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentContraindication}
                  onChange={(e) => setCurrentContraindication(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addContraindication())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Fratura não consolidada, Infecção ativa, etc."
                />
                <button
                  type="button"
                  onClick={addContraindication}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.contraindications.map(contraindication => (
                  <span key={contraindication} className="inline-flex items-center bg-red-100 text-red-800 text-sm px-2 py-1 rounded">
                    {contraindication}
                    <button
                      type="button"
                      onClick={() => removeContraindication(contraindication)}
                      className="ml-1 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Referências */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referências (opcional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentReference}
                  onChange={(e) => setCurrentReference(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addReference())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="URL ou citação de estudo/artigo"
                />
                <button
                  type="button"
                  onClick={addReference}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {formData.references.map(reference => (
                  <div key={reference} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700 truncate">{reference}</span>
                    <button
                      type="button"
                      onClick={() => removeReference(reference)}
                      className="text-red-600 hover:text-red-800 ml-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Conhecimento'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};