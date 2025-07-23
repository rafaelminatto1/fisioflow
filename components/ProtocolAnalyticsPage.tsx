import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData.minimal';
import { ClinicalProtocol, PatientProtocol, ProtocolAnalytics } from '../types';
import PageShell from './ui/PageShell';
import {
  IconTrendingUp,
  IconUsers,
  IconActivity,
  IconClock,
  IconAward,
  IconHeart,
  IconChartBar,
  IconTarget,
  IconTrendingDown,
  IconEqual,
} from './icons/IconComponents';

const ProtocolAnalyticsPage: React.FC = () => {
  const {
    clinicalProtocols,
    patientProtocols,
    protocolAnalytics,
    protocolProgressNotes,
    patients,
  } = useData();
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    'month' | 'quarter' | 'year'
  >('quarter');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  const specialties = [
    'Ortopedia',
    'Neurologia',
    'Cardio',
    'Respiratoria',
    'Pediatria',
    'Geriatria',
    'Esportiva',
    'Geral',
  ];

  const filteredProtocols = useMemo(() => {
    let filtered = clinicalProtocols;
    if (selectedSpecialty) {
      filtered = filtered.filter((p) => p.specialty === selectedSpecialty);
    }
    return filtered;
  }, [clinicalProtocols, selectedSpecialty]);

  const overallMetrics = useMemo(() => {
    const totalProtocols = filteredProtocols.length;
    const totalPrescriptions = patientProtocols.filter((pp) =>
      selectedSpecialty
        ? filteredProtocols.some((p) => p.id === pp.protocolId)
        : true
    ).length;

    const activeProtocols = patientProtocols.filter(
      (pp) =>
        pp.status === 'Ativo' &&
        (selectedSpecialty
          ? filteredProtocols.some((p) => p.id === pp.protocolId)
          : true)
    ).length;

    const completedProtocols = patientProtocols.filter(
      (pp) =>
        pp.status === 'Concluído' &&
        (selectedSpecialty
          ? filteredProtocols.some((p) => p.id === pp.protocolId)
          : true)
    ).length;

    const completionRate =
      totalPrescriptions > 0
        ? Math.round((completedProtocols / totalPrescriptions) * 100)
        : 0;

    const relevantAnalytics = protocolAnalytics.filter((analytics) =>
      selectedSpecialty
        ? filteredProtocols.some((p) => p.id === analytics.protocolId)
        : true
    );

    const avgEffectiveness =
      relevantAnalytics.length > 0
        ? Math.round(
            relevantAnalytics.reduce(
              (sum, a) => sum + a.effectivenessScore,
              0
            ) / relevantAnalytics.length
          )
        : 0;

    const avgAdherence =
      relevantAnalytics.length > 0
        ? Math.round(
            relevantAnalytics.reduce((sum, a) => sum + a.averageAdherence, 0) /
              relevantAnalytics.length
          )
        : 0;

    const avgSatisfaction =
      relevantAnalytics.length > 0
        ? (
            relevantAnalytics.reduce(
              (sum, a) => sum + a.patientSatisfaction,
              0
            ) / relevantAnalytics.length
          ).toFixed(1)
        : '0.0';

    return {
      totalProtocols,
      totalPrescriptions,
      activeProtocols,
      completedProtocols,
      completionRate,
      avgEffectiveness,
      avgAdherence,
      avgSatisfaction: parseFloat(avgSatisfaction),
    };
  }, [
    filteredProtocols,
    patientProtocols,
    protocolAnalytics,
    selectedSpecialty,
  ]);

  const topPerformingProtocols = useMemo(() => {
    return filteredProtocols
      .map((protocol) => {
        const analytics = protocolAnalytics.find(
          (a) => a.protocolId === protocol.id
        );
        return {
          ...protocol,
          analytics,
        };
      })
      .filter((p) => p.analytics)
      .sort(
        (a, b) =>
          (b.analytics?.effectivenessScore || 0) -
          (a.analytics?.effectivenessScore || 0)
      )
      .slice(0, 5);
  }, [filteredProtocols, protocolAnalytics]);

  const getEffectivenessIcon = (score: number) => {
    if (score >= 85)
      return <IconTrendingUp className="h-5 w-5 text-green-400" />;
    if (score >= 70) return <IconEqual className="h-5 w-5 text-yellow-400" />;
    return <IconTrendingDown className="h-5 w-5 text-red-400" />;
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatDuration = (days: number) => {
    const weeks = Math.round(days / 7);
    return `${weeks} sem`;
  };

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">
              Analytics de Protocolos
            </h1>
            <p className="mt-1 text-slate-400">
              Métricas de efetividade e desempenho dos protocolos clínicos
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg bg-slate-800 p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Especialidade
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                <option value="">Todas as Especialidades</option>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Período
              </label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                <option value="month">Último Mês</option>
                <option value="quarter">Último Trimestre</option>
                <option value="year">Último Ano</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-800 p-6">
            <div className="mb-4 flex items-center space-x-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <IconChartBar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Protocolos Totais</p>
                <p className="text-2xl font-bold text-slate-50">
                  {overallMetrics.totalProtocols}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {selectedSpecialty
                ? `Na especialidade ${selectedSpecialty}`
                : 'Todas as especialidades'}
            </p>
          </div>

          <div className="rounded-lg bg-slate-800 p-6">
            <div className="mb-4 flex items-center space-x-3">
              <div className="rounded-lg bg-green-600 p-2">
                <IconUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Prescrições Ativas</p>
                <p className="text-2xl font-bold text-slate-50">
                  {overallMetrics.activeProtocols}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              De {overallMetrics.totalPrescriptions} prescrições totais
            </p>
          </div>

          <div className="rounded-lg bg-slate-800 p-6">
            <div className="mb-4 flex items-center space-x-3">
              <div className="rounded-lg bg-purple-600 p-2">
                <IconTarget className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-slate-50">
                  {overallMetrics.completionRate}%
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {overallMetrics.completedProtocols} protocolos concluídos
            </p>
          </div>

          <div className="rounded-lg bg-slate-800 p-6">
            <div className="mb-4 flex items-center space-x-3">
              <div className="rounded-lg bg-yellow-600 p-2">
                <IconAward className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Efetividade Média</p>
                <p className="text-2xl font-bold text-slate-50">
                  {overallMetrics.avgEffectiveness}%
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Baseado em resultados clínicos
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-slate-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-50">
              Métricas de Desempenho
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <IconActivity className="h-4 w-4 text-blue-400" />
                  <span className="text-slate-300">Aderência Média</span>
                </div>
                <span className="font-semibold text-blue-400">
                  {overallMetrics.avgAdherence}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-700">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${overallMetrics.avgAdherence}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <IconHeart className="h-4 w-4 text-pink-400" />
                  <span className="text-slate-300">
                    Satisfação dos Pacientes
                  </span>
                </div>
                <span className="font-semibold text-pink-400">
                  {overallMetrics.avgSatisfaction}/10
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-700">
                <div
                  className="h-2 rounded-full bg-pink-600"
                  style={{
                    width: `${(overallMetrics.avgSatisfaction / 10) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-50">
              Distribuição por Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Ativos</span>
                <span className="font-semibold text-green-400">
                  {overallMetrics.activeProtocols}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Concluídos</span>
                <span className="font-semibold text-blue-400">
                  {overallMetrics.completedProtocols}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Taxa de Sucesso</span>
                <span className="font-semibold text-purple-400">
                  {overallMetrics.completionRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Protocols */}
        <div className="rounded-lg bg-slate-800 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-50">
            <IconTrendingUp className="mr-2 inline h-5 w-5" />
            Protocolos com Melhor Desempenho
          </h3>
          <div className="space-y-4">
            {topPerformingProtocols.map((protocol, index) => (
              <div key={protocol.id} className="rounded-lg bg-slate-900 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center space-x-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <h4 className="font-medium text-slate-50">
                        {protocol.name}
                      </h4>
                      <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">
                        {protocol.specialty}
                      </span>
                    </div>
                    <p className="mb-3 line-clamp-2 text-sm text-slate-400">
                      {protocol.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <span className="text-slate-400">Efetividade:</span>
                        <div className="flex items-center space-x-1">
                          {getEffectivenessIcon(
                            protocol.analytics?.effectivenessScore || 0
                          )}
                          <span
                            className={`font-medium ${getEffectivenessColor(protocol.analytics?.effectivenessScore || 0)}`}
                          >
                            {protocol.analytics?.effectivenessScore}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Prescrições:</span>
                        <span className="ml-1 font-medium text-slate-300">
                          {protocol.analytics?.totalPrescriptions}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Aderência:</span>
                        <span className="ml-1 font-medium text-slate-300">
                          {protocol.analytics?.averageAdherence}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Duração Média:</span>
                        <span className="ml-1 font-medium text-slate-300">
                          {formatDuration(
                            protocol.analytics?.averageDuration || 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {topPerformingProtocols.length === 0 && (
              <div className="py-8 text-center">
                <IconChartBar className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                <p className="text-slate-400">
                  {selectedSpecialty
                    ? `Nenhum protocolo encontrado para ${selectedSpecialty}`
                    : 'Nenhum dado de analytics disponível'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Insights and Recommendations */}
        <div className="rounded-lg bg-slate-800 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-50">
            Insights e Recomendações
          </h3>
          <div className="space-y-4">
            {overallMetrics.avgEffectiveness >= 85 ? (
              <div className="flex items-start space-x-3 rounded-lg border border-green-600/20 bg-green-900/20 p-4">
                <IconAward className="mt-0.5 h-5 w-5 text-green-400" />
                <div>
                  <p className="font-medium text-green-400">
                    Excelente Desempenho
                  </p>
                  <p className="text-sm text-slate-300">
                    Os protocolos demonstram alta efetividade clínica com
                    resultados consistentes. Continue monitorando para manter
                    este nível de qualidade.
                  </p>
                </div>
              </div>
            ) : overallMetrics.avgEffectiveness >= 70 ? (
              <div className="flex items-start space-x-3 rounded-lg border border-yellow-600/20 bg-yellow-900/20 p-4">
                <IconTrendingUp className="mt-0.5 h-5 w-5 text-yellow-400" />
                <div>
                  <p className="font-medium text-yellow-400">Bom Desempenho</p>
                  <p className="text-sm text-slate-300">
                    Os protocolos apresentam bons resultados, mas há
                    oportunidades de otimização. Considere revisar protocolos
                    com baixa efetividade.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-3 rounded-lg border border-red-600/20 bg-red-900/20 p-4">
                <IconTrendingDown className="mt-0.5 h-5 w-5 text-red-400" />
                <div>
                  <p className="font-medium text-red-400">Necessita Atenção</p>
                  <p className="text-sm text-slate-300">
                    A efetividade média está abaixo do esperado. Revise os
                    protocolos, treinamento da equipe e aderência dos pacientes.
                  </p>
                </div>
              </div>
            )}

            {overallMetrics.avgAdherence < 70 && (
              <div className="flex items-start space-x-3 rounded-lg border border-orange-600/20 bg-orange-900/20 p-4">
                <IconActivity className="mt-0.5 h-5 w-5 text-orange-400" />
                <div>
                  <p className="font-medium text-orange-400">Baixa Aderência</p>
                  <p className="text-sm text-slate-300">
                    A aderência média está baixa. Considere estratégias de
                    motivação, simplificação dos exercícios ou maior
                    acompanhamento.
                  </p>
                </div>
              </div>
            )}

            {overallMetrics.completionRate < 60 && (
              <div className="flex items-start space-x-3 rounded-lg border border-purple-600/20 bg-purple-900/20 p-4">
                <IconTarget className="mt-0.5 h-5 w-5 text-purple-400" />
                <div>
                  <p className="font-medium text-purple-400">
                    Taxa de Conclusão Baixa
                  </p>
                  <p className="text-sm text-slate-300">
                    Muitos protocolos não estão sendo concluídos. Investigue
                    possíveis barreiras e ajuste a duração ou complexidade dos
                    protocolos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ProtocolAnalyticsPage;
