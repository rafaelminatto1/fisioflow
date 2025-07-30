// components/ai-economica/KnowledgeFeedback.tsx
// Componente para feedback e avaliação de conhecimento

import React, { useState, useEffect } from 'react'
import { feedbackService, FeedbackEntry, QualityMetrics, ImprovementSuggestion } from '../../services/ai-economica/feedbackService'
import { KnowledgeEntry } from '../../types/ai-economica.types'

interface KnowledgeFeedbackProps {
  knowledgeEntry: KnowledgeEntry
  userId: string
  userRole: string
  tenantId: string
  onFeedbackSubmitted?: () => void
}

interface FeedbackFormData {
  type: FeedbackEntry['type']
  rating: number
  comment: string
  suggestions: string
}

const FEEDBACK_TYPES = [
  { value: 'helpful', label: '👍 Útil', description: 'Este conhecimento me ajudou', color: 'text-green-600' },
  { value: 'not_helpful', label: '👎 Não útil', description: 'Este conhecimento não me ajudou', color: 'text-red-600' },
  { value: 'incorrect', label: '❌ Incorreto', description: 'Há informações incorretas', color: 'text-red-700' },
  { value: 'outdated', label: '📅 Desatualizado', description: 'As informações estão desatualizadas', color: 'text-orange-600' },
  { value: 'suggestion', label: '💡 Sugestão', description: 'Tenho sugestões de melhoria', color: 'text-blue-600' }
]

const RATING_LABELS = {
  1: 'Muito ruim',
  2: 'Ruim', 
  3: 'Regular',
  4: 'Bom',
  5: 'Excelente'
}

export const KnowledgeFeedback: React.FC<KnowledgeFeedbackProps> = ({
  knowledgeEntry,
  userId,
  userRole,
  tenantId,
  onFeedbackSubmitted
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'helpful',
    rating: 5,
    comment: '',
    suggestions: ''
  })
  
  const [existingFeedbacks, setExistingFeedbacks] = useState<FeedbackEntry[]>([])
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null)
  const [improvements, setImprovements] = useState<ImprovementSuggestion[]>([])

  useEffect(() => {
    loadFeedbackData()
  }, [knowledgeEntry.id])

  const loadFeedbackData = async () => {
    try {
      const [feedbacks, metrics, suggestions] = await Promise.all([
        feedbackService.getFeedbacksForEntry(knowledgeEntry.id),
        feedbackService.getQualityMetrics(knowledgeEntry.id),
        feedbackService.getImprovementSuggestions({ entryId: knowledgeEntry.id })
      ])

      setExistingFeedbacks(feedbacks)
      setQualityMetrics(metrics)
      setImprovements(suggestions)
    } catch (error) {
      console.error('Erro ao carregar dados de feedback:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await feedbackService.submitFeedback({
        knowledgeEntryId: knowledgeEntry.id,
        userId,
        tenantId,
        type: formData.type,
        rating: formData.rating,
        comment: formData.comment || undefined,
        suggestions: formData.suggestions || undefined,
        metadata: {
          userRole,
          queryContext: 'knowledge_review'
        }
      })

      // Reset form
      setFormData({
        type: 'helpful',
        rating: 5,
        comment: '',
        suggestions: ''
      })

      setIsOpen(false)
      await loadFeedbackData()
      onFeedbackSubmitted?.()
    } catch (error) {
      console.error('Erro ao enviar feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFeedbackTypeInfo = (type: FeedbackEntry['type']) => {
    return FEEDBACK_TYPES.find(t => t.value === type) || FEEDBACK_TYPES[0]
  }

  const getPriorityColor = (priority: ImprovementSuggestion['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-700 bg-red-100'
      case 'high': return 'text-orange-700 bg-orange-100'
      case 'medium': return 'text-yellow-700 bg-yellow-100'
      case 'low': return 'text-blue-700 bg-blue-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getStatusColor = (status: ImprovementSuggestion['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-700 bg-yellow-100'
      case 'in_progress': return 'text-blue-700 bg-blue-100'
      case 'completed': return 'text-green-700 bg-green-100'
      case 'rejected': return 'text-red-700 bg-red-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      {/* Header com métricas */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Feedback</h3>
          
          {qualityMetrics && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-1">Avaliação:</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${
                        star <= qualityMetrics.averageRating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="ml-1 text-sm text-gray-600">
                    {qualityMetrics.averageRating.toFixed(1)} ({qualityMetrics.totalFeedbacks})
                  </span>
                </div>
              </div>
              
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-1">Confiança:</span>
                <span className={`text-sm font-medium ${
                  qualityMetrics.confidenceScore >= 0.8 ? 'text-green-600' :
                  qualityMetrics.confidenceScore >= 0.6 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {Math.round(qualityMetrics.confidenceScore * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showHistory ? 'Ocultar histórico' : 'Ver histórico'}
          </button>
          
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Dar Feedback
          </button>
        </div>
      </div>

      {/* Alertas de problemas */}
      {qualityMetrics && (qualityMetrics.incorrectCount > 0 || qualityMetrics.outdatedCount > 0) && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <span className="font-medium text-yellow-800">Atenção:</span>
              <span className="text-yellow-700 ml-1">
                {qualityMetrics.incorrectCount > 0 && `${qualityMetrics.incorrectCount} relato(s) de conteúdo incorreto`}
                {qualityMetrics.incorrectCount > 0 && qualityMetrics.outdatedCount > 0 && ', '}
                {qualityMetrics.outdatedCount > 0 && `${qualityMetrics.outdatedCount} relato(s) de conteúdo desatualizado`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sugestões de melhoria pendentes */}
      {improvements.filter(i => i.status === 'pending' && (i.priority === 'critical' || i.priority === 'high')).length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-800">Melhorias Urgentes Pendentes</span>
          </div>
          <div className="space-y-1">
            {improvements
              .filter(i => i.status === 'pending' && (i.priority === 'critical' || i.priority === 'high'))
              .slice(0, 3)
              .map((improvement) => (
                <div key={improvement.id} className="text-sm text-red-700">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium mr-2 ${getPriorityColor(improvement.priority)}`}>
                    {improvement.priority.toUpperCase()}
                  </span>
                  {improvement.description}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Histórico de feedbacks */}
      {showHistory && existingFeedbacks.length > 0 && (
        <div className="mb-6 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Histórico de Feedbacks</h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {existingFeedbacks.slice(0, 10).map((feedback) => {
              const typeInfo = getFeedbackTypeInfo(feedback.type)
              return (
                <div key={feedback.id} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-sm font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-3 h-3 ${
                                star <= feedback.rating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="ml-1 text-xs text-gray-600">
                            {feedback.rating}/5
                          </span>
                        </div>
                      </div>
                      
                      {feedback.comment && (
                        <p className="text-sm text-gray-700 mb-1">{feedback.comment}</p>
                      )}
                      
                      {feedback.suggestions && (
                        <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                          <strong>Sugestão:</strong> {feedback.suggestions}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 ml-4">
                      {formatDate(feedback.timestamp)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal de feedback */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Avaliar Conhecimento</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de feedback */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Feedback
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {FEEDBACK_TYPES.map((type) => (
                      <label key={type.value} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value={type.value}
                          checked={formData.type === type.value}
                          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as FeedbackEntry['type'] }))}
                          className="sr-only"
                        />
                        <div className={`border-2 rounded-lg p-3 transition-all ${
                          formData.type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <div className={`font-medium ${type.color}`}>{type.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Avaliação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Avaliação Geral
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                          className={`w-8 h-8 ${
                            star <= formData.rating
                              ? 'text-yellow-400 hover:text-yellow-500'
                              : 'text-gray-300 hover:text-gray-400'
                          } transition-colors`}
                        >
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {RATING_LABELS[formData.rating as keyof typeof RATING_LABELS]}
                    </span>
                  </div>
                </div>

                {/* Comentário */}
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Comentário {formData.type === 'incorrect' || formData.type === 'outdated' ? '(obrigatório)' : '(opcional)'}
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={formData.comment}
                    onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      formData.type === 'incorrect' ? 'Descreva qual informação está incorreta...' :
                      formData.type === 'outdated' ? 'Explique por que o conteúdo está desatualizado...' :
                      'Compartilhe sua experiência com este conhecimento...'
                    }
                    required={formData.type === 'incorrect' || formData.type === 'outdated'}
                  />
                </div>

                {/* Sugestões */}
                {formData.type === 'suggestion' && (
                  <div>
                    <label htmlFor="suggestions" className="block text-sm font-medium text-gray-700 mb-2">
                      Sugestões de Melhoria *
                    </label>
                    <textarea
                      id="suggestions"
                      rows={4}
                      value={formData.suggestions}
                      onChange={(e) => setFormData(prev => ({ ...prev, suggestions: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descreva suas sugestões para melhorar este conhecimento..."
                      required
                    />
                  </div>
                )}

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KnowledgeFeedback