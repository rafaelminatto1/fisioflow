// components/ai-economica/KnowledgeFeedback.tsx
// Sistema de feedback para melhoria contínua da base de conhecimento

import React, { useState } from 'react';
import { KnowledgeEntry } from '../../types/ai-economica.types';
import { KnowledgeBaseService } from '../../services/ai-economica/knowledgeBaseService';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';

interface KnowledgeFeedbackProps {
  entry: KnowledgeEntry;
  onFeedbackSubmitted?: (feedback: FeedbackData) => void;
  compact?: boolean;
}

interface FeedbackData {
  entryId: string;
  rating: 'positive' | 'negative';
  category: 'accuracy' | 'completeness' | 'clarity' | 'relevance' | 'safety';
  comment?: string;
  suggestions?: string;
  userId: string;
  timestamp: string;
}

interface FeedbackStats {
  totalFeedbacks: number;
  positiveRate: number;
  categoryBreakdown: Record<string, { positive: number; negative: number }>;
  recentComments: Array<{
    comment: string;
    rating: 'positive' | 'negative';
    category: string;
    timestamp: string;
    userId: string;
  }>;
}

const FEEDBACK_CATEGORIES = [
  { value: 'accuracy', label: 'Precisão', description: 'Informação está correta e atualizada' },
  { value: 'completeness', label: 'Completude', description: 'Informação está completa e abrangente' },
  { value: 'clarity', label: 'Clareza', description: 'Informação é clara e fácil de entender' },
  { value: 'relevance', label: 'Relevância', description: 'Informação é útil e aplicável' },
  { value: 'safety', label: 'Segurança', description: 'Informação é segura para aplicação clínica' }
];

export const KnowledgeFeedback: React.FC<KnowledgeFeedbackProps> = ({
  entry,
  onFeedbackSubmitted,
  compact = false
}) => {
  const { user } = useAuth();
  const { currentTenant } = useData();
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackData, setFeedbackData] = useState<Partial<FeedbackData>>({
    rating: 'positive',
    category: 'accuracy'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);

  const knowledgeBaseService = new KnowledgeBaseService();

  const handleQuickFeedback = async (rating: 'positive' | 'negative') => {
    if (!user || !currentTenant) return;

    setIsSubmitting(true);
    try {
      await knowledgeBaseService.updateConfidence(entry.id, rating, currentTenant.id);
      
      const feedback: FeedbackData = {
        entryId: entry.id,
        rating,
        category: 'relevance', // Default para feedback rápido
        userId: user.id,
        timestamp: new Date().toISOString()
      };

      onFeedbackSubmitted?.(feedback);
      
      // Mostrar mensagem de sucesso
      showSuccessMessage(rating === 'positive' ? 'Obrigado pelo feedback positivo!' : 'Obrigado pelo feedback. Vamos revisar este conteúdo.');
      
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedFeedback = async () => {
    if (!user || !currentTenant || !feedbackData.rating || !feedbackData.category) return;

    setIsSubmitting(true);
    try {
      await knowledgeBaseService.updateConfidence(entry.id, feedbackData.rating, currentTenant.id);
      
      const feedback: FeedbackData = {
        entryId: entry.id,
        rating: feedbackData.rating,
        category: feedbackData.category,
        comment: feedbackData.comment,
        suggestions: feedbackData.suggestions,
        userId: user.id,
        timestamp: new Date().toISOString()
      };

      // Salvar feedback detalhado no localStorage para análise
      saveFeedbackToStorage(feedback);

      onFeedbackSubmitted?.(feedback);
      setShowFeedbackForm(false);
      setFeedbackData({ rating: 'positive', category: 'accuracy' });
      
      showSuccessMessage('Feedback detalhado enviado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao enviar feedback detalhado:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadFeedbackStats = async () => {
    try {
      const stats = await loadFeedbackStatsFromStorage(entry.id);
      setFeedbackStats(stats);
      setShowStats(true);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const saveFeedbackToStorage = (feedback: FeedbackData) => {
    try {
      const existingFeedbacks = JSON.parse(localStorage.getItem('ai_economica_feedbacks') || '[]');
      existingFeedbacks.push(feedback);
      
      // Manter apenas os últimos 1000 feedbacks
      if (existingFeedbacks.length > 1000) {
        existingFeedbacks.splice(0, existingFeedbacks.length - 1000);
      }
      
      localStorage.setItem('ai_economica_feedbacks', JSON.stringify(existingFeedbacks));
    } catch (error) {
      console.error('Erro ao salvar feedback:', error);
    }
  };

  const loadFeedbackStatsFromStorage = async (entryId: string): Promise<FeedbackStats> => {
    try {
      const allFeedbacks: FeedbackData[] = JSON.parse(localStorage.getItem('ai_economica_feedbacks') || '[]');
      const entryFeedbacks = allFeedbacks.filter(f => f.entryId === entryId);
      
      const totalFeedbacks = entryFeedbacks.length;
      const positiveFeedbacks = entryFeedbacks.filter(f => f.rating === 'positive').length;
      const positiveRate = totalFeedbacks > 0 ? positiveFeedbacks / totalFeedbacks : 0;
      
      const categoryBreakdown: Record<string, { positive: number; negative: number }> = {};
      FEEDBACK_CATEGORIES.forEach(cat => {
        const categoryFeedbacks = entryFeedbacks.filter(f => f.category === cat.value);
        categoryBreakdown[cat.value] = {
          positive: categoryFeedbacks.filter(f => f.rating === 'positive').length,
          negative: categoryFeedbacks.filter(f => f.rating === 'negative').length
        };
      });
      
      const recentComments = entryFeedbacks
        .filter(f => f.comment)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)
        .map(f => ({
          comment: f.comment!,
          rating: f.rating,
          category: f.category,
          timestamp: f.timestamp,
          userId: f.userId
        }));
      
      return {
        totalFeedbacks,
        positiveRate,
        categoryBreakdown,
        recentComments
      };
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      return {
        totalFeedbacks: 0,
        positiveRate: 0,
        categoryBreakdown: {},
        recentComments: []
      };
    }
  };

  const showSuccessMessage = (message: string) => {
    // Implementar notificação de sucesso
    // Por enquanto, usar alert simples
    alert(message);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleQuickFeedback('positive')}
          disabled={isSubmitting}
          className="flex items-center gap-1 px-2 py-1 text-sm text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
          title="Útil"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
          <span>Útil</span>
        </button>
        
        <button
          onClick={() => handleQuickFeedback('negative')}
          disabled={isSubmitting}
          className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          title="Não útil"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" transform="rotate(180)">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
          <span>Não útil</span>
        </button>
        
        <button
          onClick={() => setShowFeedbackForm(true)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Detalhes
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Este conteúdo foi útil?</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Confiança: {(entry.confidence * 100).toFixed(0)}%
          </span>
          <button
            onClick={loadFeedbackStats}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Ver estatísticas
          </button>
        </div>
      </div>

      {!showFeedbackForm ? (
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleQuickFeedback('positive')}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
            Sim, foi útil
          </button>
          
          <button
            onClick={() => handleQuickFeedback('negative')}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" transform="rotate(180)">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
            Não foi útil
          </button>
          
          <button
            onClick={() => setShowFeedbackForm(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Feedback detalhado
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avaliação
              </label>
              <div className="flex gap-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="rating"
                    value="positive"
                    checked={feedbackData.rating === 'positive'}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, rating: e.target.value as 'positive' | 'negative' }))}
                    className="mr-2"
                  />
                  <span className="text-green-600">Positivo</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="rating"
                    value="negative"
                    checked={feedbackData.rating === 'negative'}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, rating: e.target.value as 'positive' | 'negative' }))}
                    className="mr-2"
                  />
                  <span className="text-red-600">Negativo</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={feedbackData.category}
                onChange={(e) => setFeedbackData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FEEDBACK_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label} - {category.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentário (opcional)
            </label>
            <textarea
              rows={3}
              value={feedbackData.comment || ''}
              onChange={(e) => setFeedbackData(prev => ({ ...prev, comment: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva o que pode ser melhorado ou o que achou útil..."
            />
          </div>

          {feedbackData.rating === 'negative' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sugestões de melhoria (opcional)
              </label>
              <textarea
                rows={2}
                value={feedbackData.suggestions || ''}
                onChange={(e) => setFeedbackData(prev => ({ ...prev, suggestions: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Como este conteúdo poderia ser melhorado?"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowFeedbackForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDetailedFeedback}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Estatísticas */}
      {showStats && feedbackStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Estatísticas de Feedback</h3>
                <button
                  onClick={() => setShowStats(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Resumo Geral</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {(feedbackStats.positiveRate * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Taxa de aprovação ({feedbackStats.totalFeedbacks} feedbacks)
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Por Categoria</h4>
                  <div className="space-y-2">
                    {FEEDBACK_CATEGORIES.map(category => {
                      const stats = feedbackStats.categoryBreakdown[category.value];
                      const total = (stats?.positive || 0) + (stats?.negative || 0);
                      const positiveRate = total > 0 ? (stats?.positive || 0) / total : 0;
                      
                      return (
                        <div key={category.value} className="flex justify-between items-center">
                          <span className="text-sm">{category.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${positiveRate * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8">
                              {total > 0 ? `${(positiveRate * 100).toFixed(0)}%` : '-'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {feedbackStats.recentComments.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Comentários Recentes</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {feedbackStats.recentComments.map((comment, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            comment.rating === 'positive' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {comment.rating === 'positive' ? 'Positivo' : 'Negativo'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {FEEDBACK_CATEGORIES.find(c => c.value === comment.category)?.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};