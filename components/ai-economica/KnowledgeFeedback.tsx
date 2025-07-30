import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Send, AlertCircle } from 'lucide-react';
import { FeedbackType } from '../../types/ai-economica.types';
import { feedbackService } from '../../services/ai-economica/feedbackService';

interface KnowledgeFeedbackProps {
  entryId: string;
  userId: string;
  onFeedbackSubmitted?: () => void;
  compact?: boolean;
}

/**
 * Componente para coleta de feedback sobre entradas da base de conhecimento
 */
export const KnowledgeFeedback: React.FC<KnowledgeFeedbackProps> = ({
  entryId,
  userId,
  onFeedbackSubmitted,
  compact = false
}) => {
  const [rating, setRating] = useState<number>(0);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('quality');
  const [comment, setComment] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleQuickFeedback = async (quickRating: number, type: FeedbackType) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await feedbackService.submitFeedback(
        entryId,
        userId,
        quickRating,
        type
      );
      
      setSubmitted(true);
      onFeedbackSubmitted?.();
      
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error('Erro ao enviar feedback rápido:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || rating === 0) return;

    setIsSubmitting(true);
    try {
      const validSuggestions = suggestions.filter(s => s.trim().length > 0);
      
      await feedbackService.submitFeedback(
        entryId,
        userId,
        rating,
        feedbackType,
        comment.trim() || undefined,
        validSuggestions.length > 0 ? validSuggestions : undefined
      );
      
      setSubmitted(true);
      setShowDetailedForm(false);
      resetForm();
      onFeedbackSubmitted?.();
      
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error('Erro ao enviar feedback detalhado:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setFeedbackType('quality');
    setComment('');
    setSuggestions(['']);
  };

  const addSuggestionField = () => {
    setSuggestions([...suggestions, '']);
  };

  const updateSuggestion = (index: number, value: string) => {
    const newSuggestions = [...suggestions];
    newSuggestions[index] = value;
    setSuggestions(newSuggestions);
  };

  const removeSuggestion = (index: number) => {
    if (suggestions.length > 1) {
      setSuggestions(suggestions.filter((_, i) => i !== index));
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
        <ThumbsUp className="w-4 h-4" />
        <span className="text-sm font-medium">Obrigado pelo seu feedback!</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <span className="text-xs text-gray-600">Esta resposta foi útil?</span>
        
        <button
          onClick={() => handleQuickFeedback(5, 'quality')}
          disabled={isSubmitting}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors disabled:opacity-50"
        >
          <ThumbsUp className="w-3 h-3" />
          Sim
        </button>
        
        <button
          onClick={() => handleQuickFeedback(2, 'quality')}
          disabled={isSubmitting}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors disabled:opacity-50"
        >
          <ThumbsDown className="w-3 h-3" />
          Não
        </button>
        
        <button
          onClick={() => setShowDetailedForm(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
        >
          <MessageSquare className="w-3 h-3" />
          Comentar
        </button>
      </div>
    );
  }

  if (!showDetailedForm) {
    return (
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900">
          Como você avalia esta informação?
        </h4>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuickFeedback(5, 'quality')}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm">Muito útil</span>
          </button>
          
          <button
            onClick={() => handleQuickFeedback(3, 'quality')}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Parcialmente útil</span>
          </button>
          
          <button
            onClick={() => handleQuickFeedback(1, 'quality')}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="text-sm">Não útil</span>
          </button>
        </div>
        
        <button
          onClick={() => setShowDetailedForm(true)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Dar feedback detalhado
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">
          Feedback Detalhado
        </h4>
        <button
          onClick={() => setShowDetailedForm(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleDetailedSubmit} className="space-y-4">
        {/* Avaliação por estrelas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Avaliação geral
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`p-1 rounded transition-colors ${
                  star <= rating
                    ? 'text-yellow-400 hover:text-yellow-500'
                    : 'text-gray-300 hover:text-gray-400'
                }`}
              >
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-600">
              {rating > 0 && (
                rating === 1 ? 'Muito ruim' :
                rating === 2 ? 'Ruim' :
                rating === 3 ? 'Regular' :
                rating === 4 ? 'Bom' : 'Excelente'
              )}
            </span>
          </div>
        </div>

        {/* Tipo de feedback */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de feedback
          </label>
          <select
            value={feedbackType}
            onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="quality">Qualidade do conteúdo</option>
            <option value="accuracy">Precisão das informações</option>
            <option value="completeness">Completude da resposta</option>
            <option value="relevance">Relevância para o caso</option>
            <option value="clarity">Clareza da explicação</option>
            <option value="usefulness">Utilidade prática</option>
          </select>
        </div>

        {/* Comentário */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentário (opcional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Descreva sua experiência com esta informação..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sugestões de melhoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sugestões de melhoria (opcional)
          </label>
          {suggestions.map((suggestion, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={suggestion}
                onChange={(e) => updateSuggestion(index, e.target.value)}
                placeholder="Como esta informação poderia ser melhorada?"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {suggestions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSuggestion(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addSuggestionField}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            + Adicionar outra sugestão
          </button>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
          </button>
          
          <button
            type="button"
            onClick={() => setShowDetailedForm(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default KnowledgeFeedback;