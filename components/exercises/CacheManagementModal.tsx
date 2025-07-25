import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData.minimal';
import { cacheService, CachedExercise } from '../../services/cacheService';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';

interface CacheManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CacheManagementModal: React.FC<CacheManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { exercises, getExerciseVideos, getExerciseImages } = useData();

  const [cachedExercises, setCachedExercises] = useState<CachedExercise[]>([]);
  const [cacheStats, setCacheStats] = useState({
    totalCached: 0,
    totalSize: '0 B',
    oldestCache: null as string | null,
    newestCache: null as string | null,
  });
  const [isPreCaching, setIsPreCaching] = useState(false);
  const [preCacheProgress, setPreCacheProgress] = useState({
    current: 0,
    total: 0,
  });

  // Only allow therapists and admins to manage cache
  if (user?.role !== UserRole.FISIOTERAPEUTA && user?.role !== UserRole.ADMIN) {
    return null;
  }

  useEffect(() => {
    if (isOpen) {
      refreshCacheData();
    }
  }, [isOpen]);

  const refreshCacheData = () => {
    const cached = cacheService.getAllCachedExercises();
    const stats = cacheService.getCacheStats();
    setCachedExercises(cached);
    setCacheStats(stats);
  };

  const handlePreCacheAll = async () => {
    setIsPreCaching(true);
    setPreCacheProgress({ current: 0, total: exercises.length });

    try {
      await cacheService.preCacheExercises(
        exercises,
        getExerciseVideos,
        getExerciseImages,
        (current, total) => {
          setPreCacheProgress({ current, total });
        }
      );

      refreshCacheData();
      alert('Todos os exercícios foram armazenados para acesso offline!');
    } catch (error) {
      console.error('Erro no pré-cache:', error);
      alert('Erro ao armazenar exercícios. Tente novamente.');
    } finally {
      setIsPreCaching(false);
      setPreCacheProgress({ current: 0, total: 0 });
    }
  };

  const handleClearCache = () => {
    if (
      confirm(
        'Tem certeza que deseja limpar todo o cache? Isso removerá todos os dados offline.'
      )
    ) {
      cacheService.clearAllCache();
      refreshCacheData();
      alert('Cache limpo com sucesso!');
    }
  };

  const handleRemoveCachedExercise = (exerciseId: string) => {
    if (confirm('Remover este exercício do cache offline?')) {
      cacheService.removeCachedExercise(exerciseId);
      refreshCacheData();
    }
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

  const getOnlineStatus = () => {
    return cacheService.isOnline() ? 'Online' : 'Offline';
  };

  const getOnlineStatusColor = () => {
    return cacheService.isOnline()
      ? 'text-green-700 bg-green-100'
      : 'text-red-700 bg-red-100';
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerenciar Cache Offline"
      size="large"
    >
      <div className="space-y-6">
        {/* Status Section */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">
              {cacheStats.totalCached}
            </div>
            <div className="text-sm text-blue-600">Exercícios em Cache</div>
          </div>

          <div className="rounded-lg bg-green-50 p-4 text-center">
            <div className="text-2xl font-bold text-green-700">
              {cacheStats.totalSize}
            </div>
            <div className="text-sm text-green-600">Tamanho do Cache</div>
          </div>

          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {exercises.length}
            </div>
            <div className="text-sm text-purple-600">Total de Exercícios</div>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <div
              className={`rounded-full px-2 py-1 text-sm font-medium ${getOnlineStatusColor()}`}
            >
              {getOnlineStatus()}
            </div>
            <div className="mt-1 text-sm text-slate-600">Status da Conexão</div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">Ações</h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={handlePreCacheAll}
              disabled={isPreCaching}
              className="flex items-center justify-center space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
            >
              <span className="text-lg">💾</span>
              <span className="font-medium">
                {isPreCaching ? 'Armazenando...' : 'Armazenar Todos'}
              </span>
            </button>

            <button
              onClick={handleClearCache}
              disabled={isPreCaching}
              className="flex items-center justify-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              <span className="text-lg">🗑️</span>
              <span className="font-medium">Limpar Cache</span>
            </button>
          </div>

          {isPreCaching && (
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  Armazenando exercícios para acesso offline...
                </span>
                <span className="text-sm text-blue-600">
                  {preCacheProgress.current} / {preCacheProgress.total}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-blue-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${preCacheProgress.total > 0 ? (preCacheProgress.current / preCacheProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="rounded-lg bg-blue-50 p-4">
          <h5 className="mb-2 font-medium text-blue-900">
            💡 Como funciona o cache offline:
          </h5>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • Os exercícios são automaticamente armazenados quando acessados
            </li>
            <li>• Dados ficam disponíveis mesmo sem internet</li>
            <li>• QR Codes funcionam offline para exercícios em cache</li>
            <li>• Cache expira automaticamente após 24 horas</li>
            <li>• Máximo de 50 exercícios em cache simultaneamente</li>
          </ul>
        </div>

        {/* Cached Exercises List */}
        {cachedExercises.length > 0 && (
          <div>
            <h4 className="mb-3 font-semibold text-slate-900">
              Exercícios em Cache ({cachedExercises.length})
            </h4>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {cachedExercises.map((cached) => (
                <div
                  key={cached.exercise.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h6 className="text-sm font-medium text-slate-900">
                          {cached.exercise.name}
                        </h6>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                          <span>{cached.exercise.category}</span>
                          <span>•</span>
                          <span>{cached.videos.length} vídeos</span>
                          <span>•</span>
                          <span>{cached.images.length} imagens</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Armazenado em: {formatDate(cached.cachedAt)}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleRemoveCachedExercise(cached.exercise.id)
                    }
                    className="ml-3 rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Remover do cache"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {cachedExercises.length === 0 && (
          <div className="py-8 text-center text-slate-500">
            <div className="mb-2 text-4xl">📱</div>
            <p className="font-medium">Nenhum exercício em cache</p>
            <p className="text-sm">
              Use "Armazenar Todos" para disponibilizar exercícios offline
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default CacheManagementModal;
