import React, { useState, useEffect } from 'react';
import { useABTesting, ABTest, ABTestResult } from '../hooks/useABTesting';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Play,
  Pause,
  Plus,
  Eye,
  Settings,
  Calendar,
  Percent,
} from 'lucide-react';

interface ABTestDashboardProps {
  className?: string;
}

interface TestStats {
  totalParticipants: number;
  conversionRate: number;
  conversions: number;
  variantStats: {
    variantId: string;
    variantName: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    isWinning: boolean;
    confidenceLevel: number;
  }[];
}

const ABTestDashboard: React.FC<ABTestDashboardProps> = ({
  className = '',
}) => {
  const {
    getAllActiveTests,
    getTestResults,
    createTest,
    updateTest,
    stopTest,
    trackEvent,
  } = useABTesting();
  const { isFeatureEnabled } = useFeatureFlags();

  const [activeTests, setActiveTests] = useState<ABTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [testStats, setTestStats] = useState<Record<string, TestStats>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'details' | 'create'>(
    'overview'
  );

  // Check if user has access to A/B testing
  const hasABTestingAccess = isFeatureEnabled('ab_testing');

  useEffect(() => {
    if (hasABTestingAccess) {
      loadActiveTests();
    }
  }, [hasABTestingAccess]);

  useEffect(() => {
    if (activeTests.length > 0) {
      calculateTestStats();
    }
  }, [activeTests]);

  const loadActiveTests = () => {
    const tests = getAllActiveTests();
    setActiveTests(tests);
  };

  const calculateTestStats = () => {
    const stats: Record<string, TestStats> = {};

    activeTests.forEach((test) => {
      const results = getTestResults(test.id);
      const totalParticipants = results.length;
      const totalConversions = results.filter((r) => r.convertedAt).length;
      const overallConversionRate =
        totalParticipants > 0
          ? (totalConversions / totalParticipants) * 100
          : 0;

      const variantStats = test.variants.map((variant) => {
        const variantResults = results.filter(
          (r) => r.variantId === variant.id
        );
        const variantParticipants = variantResults.length;
        const variantConversions = variantResults.filter(
          (r) => r.convertedAt
        ).length;
        const variantConversionRate =
          variantParticipants > 0
            ? (variantConversions / variantParticipants) * 100
            : 0;

        // Simple statistical significance calculation (placeholder)
        const confidenceLevel =
          variantParticipants > 30 ? 95 : variantParticipants > 10 ? 80 : 50;

        return {
          variantId: variant.id,
          variantName: variant.name,
          participants: variantParticipants,
          conversions: variantConversions,
          conversionRate: variantConversionRate,
          isWinning:
            variantConversionRate ===
            Math.max(
              ...test.variants.map((v) => {
                const vResults = results.filter((r) => r.variantId === v.id);
                const vParticipants = vResults.length;
                const vConversions = vResults.filter(
                  (r) => r.convertedAt
                ).length;
                return vParticipants > 0
                  ? (vConversions / vParticipants) * 100
                  : 0;
              })
            ),
          confidenceLevel,
        };
      });

      stats[test.id] = {
        totalParticipants,
        conversionRate: overallConversionRate,
        conversions: totalConversions,
        variantStats,
      };
    });

    setTestStats(stats);
  };

  const handleStopTest = async (testId: string) => {
    if (
      confirm(
        'Tem certeza que deseja parar este teste? Esta ação não pode ser desfeita.'
      )
    ) {
      const success = stopTest(testId);
      if (success) {
        loadActiveTests();
        trackEvent('ab_test_dashboard', 'test_stopped', { testId });
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getTestStatusColor = (test: ABTest) => {
    const stats = testStats[test.id];
    if (!stats) return 'bg-gray-100 text-gray-800';

    if (stats.totalParticipants < 30) return 'bg-yellow-100 text-yellow-800';
    if (stats.conversionRate > 10) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getTestStatusText = (test: ABTest) => {
    const stats = testStats[test.id];
    if (!stats) return 'Carregando...';

    if (stats.totalParticipants < 30) return 'Coletando dados';
    if (stats.conversionRate > 10) return 'Performance alta';
    return 'Em andamento';
  };

  if (!hasABTestingAccess) {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${className}`}
      >
        <div className="text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Testes A/B Não Disponíveis
          </h3>
          <p className="mb-4 text-gray-600">
            Os testes A/B estão disponíveis apenas nos planos Gold e Platinum.
          </p>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
            Fazer Upgrade
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'details' && selectedTest) {
    const stats = testStats[selectedTest.id];

    return (
      <div
        className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => setViewMode('overview')}
                className="mb-2 text-sm text-blue-600 hover:text-blue-800"
              >
                ← Voltar aos testes
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedTest.name}
              </h2>
              <p className="mt-1 text-gray-600">{selectedTest.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${getTestStatusColor(selectedTest)}`}
              >
                {getTestStatusText(selectedTest)}
              </span>
              <button
                onClick={() => handleStopTest(selectedTest.id)}
                className="flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
              >
                <Pause className="h-4 w-4" />
                <span>Parar Teste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Test Stats */}
        {stats && (
          <div className="p-6">
            {/* Overview metrics */}
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Participantes
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {stats.totalParticipants.toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="rounded-lg bg-green-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">
                      Conversões
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {stats.conversions.toLocaleString()}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="rounded-lg bg-purple-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">
                      Taxa de Conversão
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats.conversionRate.toFixed(1)}%
                    </p>
                  </div>
                  <Percent className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Variant comparison */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Comparação de Variantes
              </h3>
              <div className="space-y-4">
                {stats.variantStats.map((variant, index) => (
                  <div
                    key={variant.variantId}
                    className={`rounded-lg border-2 p-4 ${
                      variant.isWinning
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            index === 0
                              ? 'bg-blue-500'
                              : index === 1
                                ? 'bg-green-500'
                                : index === 2
                                  ? 'bg-purple-500'
                                  : 'bg-orange-500'
                          }`}
                        />
                        <h4 className="font-medium text-gray-900">
                          {variant.variantName}
                          {variant.isWinning && (
                            <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                              Vencendo
                            </span>
                          )}
                        </h4>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Confiança: {variant.confidenceLevel}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Participantes</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {variant.participants.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Conversões</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {variant.conversions.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          Taxa de Conversão
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {variant.conversionRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full ${
                            index === 0
                              ? 'bg-blue-500'
                              : index === 1
                                ? 'bg-green-500'
                                : index === 2
                                  ? 'bg-purple-500'
                                  : 'bg-orange-500'
                          }`}
                          style={{
                            width: `${Math.min(variant.conversionRate * 2, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test configuration */}
            <div className="mt-8 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-3 font-medium text-gray-900">
                Configuração do Teste
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Data de Início:</p>
                  <p className="font-medium">
                    {formatDate(selectedTest.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Alocação de Tráfego:</p>
                  <p className="font-medium">
                    {selectedTest.trafficAllocation}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Objetivo de Conversão:</p>
                  <p className="font-medium">
                    {selectedTest.metrics.conversionGoal}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Métricas Secundárias:</p>
                  <p className="font-medium">
                    {selectedTest.metrics.secondaryMetrics.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center space-x-2 text-xl font-semibold text-gray-900">
              <BarChart3 className="h-6 w-6" />
              <span>Testes A/B</span>
            </h2>
            <p className="mt-1 text-gray-600">
              Otimize conversões com testes controlados
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Teste</span>
          </button>
        </div>
      </div>

      {/* Tests overview */}
      <div className="p-6">
        {activeTests.length === 0 ? (
          <div className="py-8 text-center">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Nenhum teste ativo
            </h3>
            <p className="mb-4 text-gray-600">
              Crie seu primeiro teste A/B para otimizar conversões.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Criar Primeiro Teste
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTests.map((test) => {
              const stats = testStats[test.id];
              return (
                <div
                  key={test.id}
                  className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">
                          {test.name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getTestStatusColor(test)}`}
                        >
                          {getTestStatusText(test)}
                        </span>
                      </div>
                      <p className="mb-3 text-sm text-gray-600">
                        {test.description}
                      </p>

                      {stats && (
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {stats.totalParticipants} participantes
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {stats.conversions} conversões
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {stats.conversionRate.toFixed(1)}% taxa
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTest(test);
                          setViewMode('details');
                        }}
                        className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleStopTest(test.id)}
                        className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                        title="Parar teste"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Variant preview */}
                  {stats && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <div className="flex space-x-4">
                        {stats.variantStats
                          .slice(0, 3)
                          .map((variant, index) => (
                            <div key={variant.variantId} className="flex-1">
                              <div className="mb-1 flex items-center space-x-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    index === 0
                                      ? 'bg-blue-500'
                                      : index === 1
                                        ? 'bg-green-500'
                                        : 'bg-purple-500'
                                  }`}
                                />
                                <span className="text-xs text-gray-600">
                                  {variant.variantName}
                                </span>
                                {variant.isWinning && (
                                  <span className="text-xs text-green-600">
                                    🏆
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900">
                                {variant.conversionRate.toFixed(1)}%
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ABTestDashboard;
