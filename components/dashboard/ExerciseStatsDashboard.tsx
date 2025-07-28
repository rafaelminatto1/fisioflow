import React, { useMemo } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { UserRole } from '../../types';

const ExerciseStatsDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    getMostUsedExercises,
    getExerciseFavorites,
    exerciseRatings,
    exerciseFavorites,
  } = useData();

  const mostUsedExercises = useMemo(() => {
    return getMostUsedExercises().slice(0, 5);
  }, [getMostUsedExercises]);

  const userFavorites = useMemo(() => {
    if (!user?.id) return [];
    return getExerciseFavorites(user.id);
  }, [user?.id, getExerciseFavorites]);

  const totalStats = useMemo(() => {
    const totalRatings = exerciseRatings.length;
    const totalFavorites = exerciseFavorites.length;
    const averagePainLevel =
      totalRatings > 0
        ? exerciseRatings.reduce((sum, r) => sum + r.painLevel, 0) /
          totalRatings
        : 0;

    const ratingDistribution = {
      easy: exerciseRatings.filter((r) => r.rating === '😊').length,
      medium: exerciseRatings.filter((r) => r.rating === '😐').length,
      difficult: exerciseRatings.filter((r) => r.rating === '😰').length,
    };

    return {
      totalRatings,
      totalFavorites,
      averagePainLevel,
      ratingDistribution,
    };
  }, [exerciseRatings, exerciseFavorites]);

  const ratingIcons = {
    easy: { icon: '😊', label: 'Fácil', color: 'text-green-600 bg-green-50' },
    medium: {
      icon: '😐',
      label: 'Médio',
      color: 'text-yellow-600 bg-yellow-50',
    },
    difficult: {
      icon: '😰',
      label: 'Difícil',
      color: 'text-red-600 bg-red-50',
    },
  };

  // Only show to therapists and admins
  if (user?.role !== UserRole.FISIOTERAPEUTA && user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          📊 Estatísticas Gerais dos Exercícios
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">
              {totalStats.totalRatings}
            </div>
            <div className="text-sm text-blue-600">Total de Avaliações</div>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {totalStats.totalFavorites}
            </div>
            <div className="text-sm text-purple-600">Total de Favoritos</div>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">
              {totalStats.averagePainLevel.toFixed(1)}
            </div>
            <div className="text-sm text-orange-600">Dor Média Geral</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <div className="text-2xl font-bold text-green-700">
              {userFavorites.length}
            </div>
            <div className="text-sm text-green-600">Meus Favoritos</div>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      {totalStats.totalRatings > 0 && (
        <div>
          <h4 className="mb-3 font-semibold text-slate-900">
            Distribuição Geral de Avaliações
          </h4>
          <div className="space-y-3">
            {Object.entries(totalStats.ratingDistribution).map(
              ([key, count]) => {
                const rating = ratingIcons[key as keyof typeof ratingIcons];
                const percentage =
                  totalStats.totalRatings > 0
                    ? ((count / totalStats.totalRatings) * 100).toFixed(1)
                    : '0';

                return (
                  <div key={key} className="flex items-center space-x-3">
                    <div
                      className={`rounded-full px-3 py-1 text-sm font-medium ${rating.color}`}
                    >
                      {rating.icon} {rating.label}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="h-3 flex-1 rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="ml-3 text-sm font-medium text-slate-600">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Most Used Exercises */}
      {mostUsedExercises.length > 0 && (
        <div>
          <h4 className="mb-3 font-semibold text-slate-900">
            🏆 Exercícios Mais Utilizados
          </h4>
          <div className="space-y-3">
            {mostUsedExercises.map((exercise, index) => (
              <div
                key={exercise.exerciseId}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {exercise.exerciseName}
                    </div>
                    <div className="text-sm text-slate-500">
                      {exercise.totalRatings} avaliações • Dor média:{' '}
                      {exercise.averagePainLevel.toFixed(1)}/10
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-slate-600">
                    ⭐ {exercise.favoriteCount}
                  </div>
                  <div className="flex space-x-1">
                    <span className="text-green-600">
                      {exercise.ratingDistribution.easy}😊
                    </span>
                    <span className="text-yellow-600">
                      {exercise.ratingDistribution.medium}😐
                    </span>
                    <span className="text-red-600">
                      {exercise.ratingDistribution.difficult}😰
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalStats.totalRatings === 0 && (
        <div className="rounded-lg bg-slate-50 p-8 text-center">
          <div className="mb-4 text-4xl">📊</div>
          <h4 className="mb-2 font-semibold text-slate-900">
            Ainda não há dados suficientes
          </h4>
          <p className="text-slate-600">
            As estatísticas aparecerão conforme os pacientes avaliarem os
            exercícios.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExerciseStatsDashboard;
