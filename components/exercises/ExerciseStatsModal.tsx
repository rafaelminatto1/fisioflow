import React, { useMemo } from 'react';
import { Exercise, ExerciseRating, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData.minimal';
import BaseModal from '../ui/BaseModal';

interface ExerciseStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise;
}

const ExerciseStatsModal: React.FC<ExerciseStatsModalProps> = ({
  isOpen,
  onClose,
  exercise,
}) => {
  const { user } = useAuth();
  const { getExerciseStatistics, getExerciseRatings } = useData();

  const statistics = useMemo(() => {
    return getExerciseStatistics(exercise.id);
  }, [exercise.id, getExerciseStatistics]);

  const recentRatings = useMemo(() => {
    const ratings = getExerciseRatings(exercise.id);
    return ratings
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [exercise.id, getExerciseRatings]);

  const ratingIcons = {
    '😊': { icon: '😊', label: 'Fácil', color: 'text-green-600 bg-green-50' },
    '😐': { icon: '😐', label: 'Médio', color: 'text-yellow-600 bg-yellow-50' },
    '😰': { icon: '😰', label: 'Difícil', color: 'text-red-600 bg-red-50' },
  } as const;

  const getPainLevelColor = (level: number) => {
    if (level === 0) return 'text-green-600';
    if (level <= 3) return 'text-yellow-600';
    if (level <= 6) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Only show to therapists and admins
  if (user?.role !== UserRole.FISIOTERAPEUTA && user?.role !== UserRole.ADMIN) {
    return null;
  }

  if (!statistics) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Estatísticas do Exercício">
        <div className="text-center py-8">
          <p className="text-slate-500">Ainda não há dados suficientes para exibir estatísticas.</p>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Estatísticas do Exercício">
      <div className="space-y-6">
        {/* Exercise Info */}
        <div className="rounded-lg bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">{exercise.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{exercise.description}</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{statistics.totalRatings}</div>
            <div className="text-sm text-blue-600">Total de Avaliações</div>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{statistics.favoriteCount}</div>
            <div className="text-sm text-purple-600">Favoritos</div>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">
              {statistics.averagePainLevel.toFixed(1)}
            </div>
            <div className="text-sm text-orange-600">Dor Média</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{statistics.usageCount}</div>
            <div className="text-sm text-green-600">Vezes Usado</div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div>
          <h4 className="mb-3 font-semibold text-slate-900">Distribuição de Avaliações</h4>
          <div className="space-y-2">
            {Object.entries(statistics.ratingDistribution).map(([key, count]) => {
              const ratingKey = key === 'easy' ? '😊' : key === 'medium' ? '😐' : '😰';
              const rating = ratingIcons[ratingKey];
              const percentage = statistics.totalRatings > 0 
                ? ((count / statistics.totalRatings) * 100).toFixed(1) 
                : '0';
              
              return (
                <div key={key} className="flex items-center space-x-3">
                  <div className={`rounded-full px-3 py-1 text-sm font-medium ${rating.color}`}>
                    {rating.icon} {rating.label}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="h-2 flex-1 rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-slate-600">
                        {count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Ratings */}
        {recentRatings.length > 0 && (
          <div>
            <h4 className="mb-3 font-semibold text-slate-900">Avaliações Recentes</h4>
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {recentRatings.map((rating) => (
                <div
                  key={rating.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`rounded-full px-2 py-1 text-sm ${ratingIcons[rating.rating].color}`}>
                        {ratingIcons[rating.rating].icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {ratingIcons[rating.rating].label}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDate(rating.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getPainLevelColor(rating.painLevel)}`}>
                        Dor: {rating.painLevel}/10
                      </div>
                      {rating.sessionNumber && (
                        <div className="text-xs text-slate-500">
                          Sessão {rating.sessionNumber}
                        </div>
                      )}
                    </div>
                  </div>
                  {rating.comments && (
                    <div className="mt-2 text-sm text-slate-600 italic">
                      "{rating.comments}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default ExerciseStatsModal;