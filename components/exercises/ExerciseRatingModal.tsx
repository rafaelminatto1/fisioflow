import React, { useState } from 'react';
import {
  Exercise,
  ExerciseRating,
  ExerciseRatingEmoji,
  UserRole,
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData.minimal';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';

interface ExerciseRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise;
  prescriptionId?: string;
  sessionNumber?: number;
}

const ExerciseRatingModal: React.FC<ExerciseRatingModalProps> = ({
  isOpen,
  onClose,
  exercise,
  prescriptionId,
  sessionNumber,
}) => {
  const { user } = useAuth();
  const { saveExerciseRating } = useData();

  const [selectedRating, setSelectedRating] =
    useState<ExerciseRatingEmoji | null>(null);
  const [painLevel, setPainLevel] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ratingOptions = [
    {
      emoji: '😊' as ExerciseRatingEmoji,
      label: 'Fácil',
      description: 'Exercício foi fácil de executar',
    },
    {
      emoji: '😐' as ExerciseRatingEmoji,
      label: 'Médio',
      description: 'Exercício com dificuldade moderada',
    },
    {
      emoji: '😰' as ExerciseRatingEmoji,
      label: 'Difícil',
      description: 'Exercício foi difícil de executar',
    },
  ];

  const painLevels = [
    { value: 0, label: '0 - Sem dor', color: 'text-green-600' },
    { value: 1, label: '1', color: 'text-green-500' },
    { value: 2, label: '2', color: 'text-green-400' },
    { value: 3, label: '3', color: 'text-yellow-500' },
    { value: 4, label: '4', color: 'text-yellow-600' },
    { value: 5, label: '5', color: 'text-orange-500' },
    { value: 6, label: '6', color: 'text-orange-600' },
    { value: 7, label: '7', color: 'text-red-400' },
    { value: 8, label: '8', color: 'text-red-500' },
    { value: 9, label: '9', color: 'text-red-600' },
    { value: 10, label: '10 - Dor máxima', color: 'text-red-700' },
  ];

  const handleSubmit = async () => {
    if (!selectedRating || !user) return;

    setIsSubmitting(true);

    try {
      const ratingData: Omit<ExerciseRating, 'id'> = {
        patientId: user.id,
        exerciseId: exercise.id,
        prescriptionId,
        rating: selectedRating,
        painLevel,
        comments: comments.trim() || undefined,
        date: new Date().toISOString(),
        sessionNumber,
        tenantId: user.tenantId || '',
      };

      saveExerciseRating(ratingData, user);

      // Reset form
      setSelectedRating(null);
      setPainLevel(0);
      setComments('');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedRating(null);
    setPainLevel(0);
    setComments('');
    onClose();
  };

  // Only allow patients to rate exercises
  if (user?.role !== UserRole.PACIENTE) {
    return null;
  }

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Avaliar Exercício">
      <div className="space-y-6">
        {/* Exercise Info */}
        <div className="rounded-lg bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">{exercise.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{exercise.description}</p>
        </div>

        {/* Rating Selection */}
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700">
            Como foi executar este exercício?
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ratingOptions.map((option) => (
              <button
                key={option.emoji}
                onClick={() => setSelectedRating(option.emoji)}
                className={`rounded-lg border-2 p-4 text-center transition-all duration-200 ${
                  selectedRating === option.emoji
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-3xl">{option.emoji}</div>
                <div className="mt-1 font-medium">{option.label}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pain Level */}
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700">
            Nível de dor durante o exercício (0-10)
          </label>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
            {painLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => setPainLevel(level.value)}
                className={`rounded-md p-2 text-center text-sm font-medium transition-all duration-200 ${
                  painLevel === level.value
                    ? `${level.color} bg-slate-100 ring-2 ring-blue-500`
                    : `${level.color} hover:bg-slate-50`
                }`}
              >
                {level.value}
              </button>
            ))}
          </div>
          <div className="mt-2 text-center text-sm text-slate-500">
            {painLevels.find((l) => l.value === painLevel)?.label}
          </div>
        </div>

        {/* Comments */}
        <div>
          <label
            htmlFor="comments"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Comentários (opcional)
          </label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Adicione observações sobre o exercício..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedRating || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Avaliação'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ExerciseRatingModal;
