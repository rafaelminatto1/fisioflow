// components/ai-economica/KnowledgeContribution.tsx
// Interface para fisioterapeutas contribuírem com conhecimento

import React, { useState, useEffect } from 'react'
import { KnowledgeEntry } from '../../types/ai-economica.types'
import { aiLogger } from '../../services/ai-economica/logger'

interface KnowledgeContributionProps {
  onSubmit?: (entry: Partial<KnowledgeEntry>) => void
  onCancel?: () => void
  initialData?: Partial<KnowledgeEntry>
  isOpen: boolean
}

interface FormData {
  title: string
  content: string
  type: KnowledgeEntry['type']
  tags: string[]
  conditions: string[]
  techniques: string[]
  contraindications: string[]
  references: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  evidenceLevel: 'low' | 'moderate' | 'high'
  specialty: string[]
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
}

const KNOWLEDGE_TYPES = [
  { value: 'protocol', label: 'Protocolo Clínico', description: 'Protocolo estruturado de tratamento', icon: '📋' },
  { value: 'exercise', label: 'Exercício', description: 'Exercício terapêutico específico', icon: '🏃‍♂️' },
  { value: 'case', label: 'Caso Clínico', description: 'Caso real de paciente (anonimizado)', icon: '👤' },
  { value: 'technique', label: 'Técnica', description: 'Técnica manual ou procedimento', icon: '🤲' },
  { value: 'experience', label: 'Experiência', description: 'Conhecimento baseado em experiência prática', icon: '💡' }
]

const SPECIALTIES = [
  'Ortopedia', 'Neurologia', 'Cardiorrespiratória', 'Pediátrica', 'Geriátrica',
  'Esportiva', 'Dermatofuncional', 'Uroginecológica', 'Traumato-ortopédica',
  'Reumatologia', 'Oncologia', 'Saúde da Mulher'
]

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Iniciante', description: 'Para estudantes e recém-formados', color: 'bg-green-100 text-green-800' },
  { value: 'intermediate', label: 'Intermediário', description: 'Para profissionais com experiência', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'advanced', label: 'Avançado', description: 'Para especialistas e casos complexos', color: 'bg-red-100 text-red-800' }
]

const EVIDENCE_LEVELS = [
  { value: 'low', label: 'Baixo', description: 'Baseado em experiência clínica', color: 'bg-gray-100 text-gray-800' },
  { value: 'moderate', label: 'Moderado', description: 'Alguns estudos ou consensos', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'Alto', description: 'Evidência científica robusta', color: 'bg-purple-100 text-purple-800' }
]

export const KnowledgeContribution: React.FC<KnowledgeContributionProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isOpen
}) => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentTag, setCurrentTag] = useState('')
  const [currentCondition, setCurrentCondition] = useState('')
  const [currentTechnique, setCurrentTechnique] = useState('')
  const [currentContraindication, setCurrentContraindication] = useState('')
  const [currentReference, setCurrentReference] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [step, setStep] = useState(1)

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
      })
    }
  }, [initialData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório'
    } else if (formData.title.length < 10) {
      newErrors.title = 'Título deve ter pelo menos 10 caracteres'
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Conteúdo é obrigatório'
    } else if (formData.content.length < 50) {
      newErrors.content = 'Conteúdo deve ter pelo menos 50 caracteres'
    }

    if (formData.tags.length === 0) {
      newErrors.tags = 'Pelo menos uma tag é obrigatória'
    }

    if (formData.specialty.length === 0) {
      newErrors.specialty = 'Pelo menos uma especialidade é obrigatória'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      setStep(1) // Voltar para o primeiro step se houver erros
      return
    }

    setIsSubmitting(true)

    try {
      const entry: Partial<KnowledgeEntry> = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        summary: generateSummary(formData.content),
        type: formData.type,
        tags: formData.tags,
        conditions: formData.conditions,
        techniques: formData.techniques,
        contraindications: formData.contraindications,
        references: formData.references,
        metadata: {
          difficulty: formData.difficulty,
          evidenceLevel: formData.evidenceLevel,
          specialty: formData.specialty
        }
      }

      onSubmit?.(entry)
      resetForm()
      
      aiLogger.info('KNOWLEDGE_CONTRIBUTION', 'Nova contribuição criada', {
        type: formData.type,
        tagsCount: formData.tags.length,
        contentLength: formData.content.length
      })
    } catch (error) {
      console.error('Erro ao salvar conhecimento:', error)
      setErrors({ submit: 'Erro ao salvar. Tente novamente.' })
      aiLogger.error('KNOWLEDGE_CONTRIBUTION', 'Erro ao salvar contribuição', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA)
    setErrors({})
    setCurrentTag('')
    setCurrentCondition('')
    setCurrentTechnique('')
    setCurrentContraindication('')
    setCurrentReference('')
    setPreviewMode(false)
    setStep(1)
  }

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addItem = (
    currentValue: string,
    setCurrentValue: (value: string) => void,
    arrayKey: keyof FormData,
    maxItems = 20
  ) => {
    if (currentValue.trim() && formData[arrayKey].length < maxItems) {
      const currentArray = formData[arrayKey] as string[]
      if (!currentArray.includes(currentValue.trim())) {
        setFormData(prev => ({
          ...prev,
          [arrayKey]: [...currentArray, currentValue.trim()]
        }))
        setCurrentValue('')
      }
    }
  }

  const removeItem = (itemToRemove: string, arrayKey: keyof FormData) => {
    const currentArray = formData[arrayKey] as string[]
    setFormData(prev => ({
      ...prev,
      [arrayKey]: currentArray.filter(item => item !== itemToRemove)
    }))
  }

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialty: prev.specialty.includes(specialty)
        ? prev.specialty.filter(s => s !== specialty)
        : [...prev.specialty, specialty]
    }))
  }

  const generateSummary = (content: string): string => {
    const summary = content.trim().substring(0, 200)
    return summary.length < content.length ? summary + '...' : summary
  }

  const nextStep = () => {
    if (step < 3) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Contribuir com Conhecimento</h2>
              <p className="text-gray-600 mt-1">Compartilhe seu conhecimento com a equipe</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Progress Steps */}
              <div className="flex items-center space-x-2">
                {[1, 2, 3].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= stepNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNum}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
              >
                {previewMode ? 'Editar' : 'Visualizar'}
              </button>
              
              <button
                type="button"
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {previewMode ? (
          /* Preview Mode */
          <div className="p-6">
            <div className="prose max-w-none">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{formData.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                    KNOWLEDGE_TYPES.find(t => t.value === formData.type)?.value === 'protocol' ? 'bg-blue-100 text-blue-800' :
                    KNOWLEDGE_TYPES.find(t => t.value === formData.type)?.value === 'exercise' ? 'bg-green-100 text-green-800' :
                    KNOWLEDGE_TYPES.find(t => t.value === formData.type)?.value === 'case' ? 'bg-purple-100 text-purple-800' :
                    KNOWLEDGE_TYPES.find(t => t.value === formData.type)?.value === 'technique' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {KNOWLEDGE_TYPES.find(t => t.value === formData.type)?.icon} {KNOWLEDGE_TYPES.find(t => t.value === formData.type)?.label}
                  </span>
                  <span className={DIFFICULTY_LEVELS.find(d => d.value === formData.difficulty)?.color + ' inline-block rounded-full px-3 py-1 text-sm font-medium'}>
                    {DIFFICULTY_LEVELS.find(d => d.value === formData.difficulty)?.label}
                  </span>
                  <span className={EVIDENCE_LEVELS.find(e => e.value === formData.evidenceLevel)?.color + ' inline-block rounded-full px-3 py-1 text-sm font-medium'}>
                    Evidência {EVIDENCE_LEVELS.find(e => e.value === formData.evidenceLevel)?.label}
                  </span>
                </div>
              </div>

              <div className="mb-6 whitespace-pre-wrap text-gray-700 leading-relaxed">
                {formData.content}
              </div>

              {formData.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.specialty.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Especialidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.specialty.map((spec) => (
                      <span key={spec} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.conditions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Condições Relacionadas</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {formData.conditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </div>
              )}

              {formData.techniques.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Técnicas Envolvidas</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {formData.techniques.map((technique) => (
                      <li key={technique}>{technique}</li>
                    ))}
                  </ul>
                </div>
              )}

              {formData.contraindications.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-red-700 mb-3">⚠️ Contraindicações</h4>
                  <ul className="list-disc list-inside space-y-1 text-red-600 bg-red-50 p-4 rounded-lg">
                    {formData.contraindications.map((contraindication) => (
                      <li key={contraindication}>{contraindication}</li>
                    ))}
                  </ul>
                </div>
              )}

              {formData.references.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Referências</h4>
                  <ul className="space-y-2">
                    {formData.references.map((reference, index) => (
                      <li key={reference} className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        <span className="font-medium">[{index + 1}]</span> {reference}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Form Mode */
          <form onSubmit={handleSubmit} className="p-6">
            {/* Step 1: Informações Básicas */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>
                  <p className="text-gray-600">Defina o tipo e conteúdo principal do conhecimento</p>
                </div>

                {/* Tipo de Conhecimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Conhecimento *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {KNOWLEDGE_TYPES.map((type) => (
                      <label key={type.value} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value={type.value}
                          checked={formData.type === type.value}
                          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as KnowledgeEntry['type'] }))}
                          className="sr-only"
                        />
                        <div className={`border-2 rounded-lg p-4 transition-all ${
                          formData.type === type.value
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}>
                          <div className="text-2xl mb-2">{type.icon}</div>
                          <div className="font-medium text-gray-900">{type.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{type.description}</div>
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
                    className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Protocolo para lombalgia aguda em atletas"
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
                    className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.content ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Descreva detalhadamente o conhecimento que deseja compartilhar..."
                  />
                  <div className="mt-2 flex justify-between text-sm text-gray-500">
                    <span>{formData.content.length} caracteres (mínimo 50)</span>
                    <span>{Math.ceil(formData.content.length / 250)} min de leitura</span>
                  </div>
                  {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Classificação e Tags */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Classificação e Tags</h3>
                  <p className="text-gray-600">Ajude outros profissionais a encontrar este conhecimento</p>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags * (palavras-chave para busca)
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite uma tag e pressione Enter"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {SPECIALTIES.map((specialty) => (
                      <label key={specialty} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.specialty.includes(specialty)}
                          onChange={() => toggleSpecialty(specialty)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                        />
                        <span className="text-sm text-gray-700">{specialty}</span>
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
                    <div className="space-y-2">
                      {DIFFICULTY_LEVELS.map((level) => (
                        <label key={level.value} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="difficulty"
                            value={level.value}
                            checked={formData.difficulty === level.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                            className="text-blue-600 focus:ring-blue-500 mr-3"
                          />
                          <div>
                            <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium mr-2 ${level.color}`}>
                              {level.label}
                            </span>
                            <span className="text-sm text-gray-600">{level.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nível de Evidência
                    </label>
                    <div className="space-y-2">
                      {EVIDENCE_LEVELS.map((level) => (
                        <label key={level.value} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="evidenceLevel"
                            value={level.value}
                            checked={formData.evidenceLevel === level.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, evidenceLevel: e.target.value as any }))}
                            className="text-blue-600 focus:ring-blue-500 mr-3"
                          />
                          <div>
                            <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium mr-2 ${level.color}`}>
                              {level.label}
                            </span>
                            <span className="text-sm text-gray-600">{level.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Detalhes Adicionais */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Detalhes Adicionais</h3>
                  <p className="text-gray-600">Informações complementares para enriquecer o conhecimento</p>
                </div>

                {/* Condições Relacionadas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condições Médicas Relacionadas
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={currentCondition}
                      onChange={(e) => setCurrentCondition(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(currentCondition, setCurrentCondition, 'conditions'))}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Lombalgia, Hérnia de disco, etc."
                    />
                    <button
                      type="button"
                      onClick={() => addItem(currentCondition, setCurrentCondition, 'conditions')}
                      className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.conditions.map((condition) => (
                      <span key={condition} className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                        {condition}
                        <button
                          type="button"
                          onClick={() => removeItem(condition, 'conditions')}
                          className="ml-2 text-green-600 hover:text-green-800"
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
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={currentTechnique}
                      onChange={(e) => setCurrentTechnique(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(currentTechnique, setCurrentTechnique, 'techniques'))}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Mobilização articular, Terapia manual, etc."
                    />
                    <button
                      type="button"
                      onClick={() => addItem(currentTechnique, setCurrentTechnique, 'techniques')}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.techniques.map((technique) => (
                      <span key={technique} className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800">
                        {technique}
                        <button
                          type="button"
                          onClick={() => removeItem(technique, 'techniques')}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contraindicações */}
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-2">
                    ⚠️ Contraindicações
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={currentContraindication}
                      onChange={(e) => setCurrentContraindication(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(currentContraindication, setCurrentContraindication, 'contraindications'))}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Ex: Fratura não consolidada, Infecção ativa, etc."
                    />
                    <button
                      type="button"
                      onClick={() => addItem(currentContraindication, setCurrentContraindication, 'contraindications')}
                      className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.contraindications.map((contraindication) => (
                      <span key={contraindication} className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm text-red-800">
                        {contraindication}
                        <button
                          type="button"
                          onClick={() => removeItem(contraindication, 'contraindications')}
                          className="ml-2 text-red-600 hover:text-red-800"
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
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={currentReference}
                      onChange={(e) => setCurrentReference(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(currentReference, setCurrentReference, 'references'))}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="URL ou citação de estudo/artigo"
                    />
                    <button
                      type="button"
                      onClick={() => addItem(currentReference, setCurrentReference, 'references')}
                      className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.references.map((reference, index) => (
                      <div key={reference} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700">[{index + 1}]</span>
                          <span className="ml-2 text-sm text-gray-600">{reference}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(reference, 'references')}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {errors.submit && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Anterior
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Conhecimento'}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default KnowledgeContribution