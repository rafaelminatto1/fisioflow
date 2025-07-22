import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { ClinicalProtocol, UserRole, ProtocolPhase } from '../types';
import PageShell from './ui/PageShell';
import Button from './ui/Button';
import ProtocolPrescriptionModal from './ProtocolPrescriptionModal';
import {
  IconBook,
  IconScience,
  IconClock,
  IconUsers,
  IconActivity,
  IconTrendingUp,
  IconShield,
  IconEdit,
  IconUserPlus,
  IconDownload,
  IconShare,
  IconHeart,
  IconAward,
  IconChevronRight,
  IconPlay,
  IconArrowLeft,
} from './icons/IconComponents';

interface ClinicalProtocolViewerPageProps {
  protocolId: string;
  onBack?: () => void;
}

const ClinicalProtocolViewerPage: React.FC<ClinicalProtocolViewerPageProps> = ({
  protocolId,
  onBack,
}) => {
  const {
    clinicalProtocols,
    protocolPhases,
    protocolExercises,
    protocolEvidences,
    protocolAnalytics,
    exercises,
    patients,
  } = useData();
  const { user } = useAuth();

  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'phases' | 'evidences' | 'analytics'
  >('overview');
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);

  const protocol = useMemo(() => {
    return clinicalProtocols.find((p) => p.id === protocolId);
  }, [clinicalProtocols, protocolId]);

  const phases = useMemo(() => {
    return protocolPhases
      .filter((phase) => phase.protocolId === protocolId)
      .sort((a, b) => a.order - b.order);
  }, [protocolPhases, protocolId]);

  const evidences = useMemo(() => {
    return protocolEvidences.filter(
      (evidence) => evidence.protocolId === protocolId
    );
  }, [protocolEvidences, protocolId]);

  const analytics = useMemo(() => {
    return protocolAnalytics.find((a) => a.protocolId === protocolId);
  }, [protocolAnalytics, protocolId]);

  const phaseExercises = useMemo(() => {
    const exercisesByPhase: { [phaseId: string]: any[] } = {};
    phases.forEach((phase) => {
      const phaseExs = protocolExercises
        .filter((pe) => pe.phaseId === phase.id)
        .sort((a, b) => a.order - b.order)
        .map((pe) => {
          const exercise = exercises.find((ex) => ex.id === pe.exerciseId);
          return { ...pe, exercise };
        });
      exercisesByPhase[phase.id] = phaseExs;
    });
    return exercisesByPhase;
  }, [phases, protocolExercises, exercises]);

  if (!protocol) {
    return (
      <PageShell title="Protocolo não encontrado">
        <div className="py-12 text-center">
          <h1 className="mb-4 text-2xl font-bold text-slate-50">
            Protocolo não encontrado
          </h1>
          <p className="text-slate-400">
            O protocolo que você está procurando não existe ou foi removido.
          </p>
        </div>
      </PageShell>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Pós-Cirúrgico':
        return 'bg-red-600';
      case 'Conservador':
        return 'bg-blue-600';
      case 'Preventivo':
        return 'bg-green-600';
      case 'Manutenção':
        return 'bg-yellow-600';
      default:
        return 'bg-slate-600';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Aguda':
        return 'text-red-400';
      case 'Subaguda':
        return 'text-yellow-400';
      case 'Crônica':
        return 'text-blue-400';
      case 'Manutenção':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

  const getEvidenceLevelColor = (level: string) => {
    switch (level) {
      case 'I':
        return 'text-green-400 bg-green-900';
      case 'II':
        return 'text-blue-400 bg-blue-900';
      case 'III':
        return 'text-yellow-400 bg-yellow-900';
      case 'IV':
        return 'text-orange-400 bg-orange-900';
      case 'V':
        return 'text-red-400 bg-red-900';
      default:
        return 'text-slate-400 bg-slate-900';
    }
  };

  const canEditProtocol =
    user && (user.id === protocol.createdById || user.role === UserRole.ADMIN);
  const canPrescribe =
    user &&
    (user.role === UserRole.ADMIN || user.role === UserRole.FISIOTERAPEUTA);

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: IconBook },
    { id: 'phases', label: 'Fases', icon: IconActivity },
    { id: 'evidences', label: 'Evidências', icon: IconScience },
    { id: 'analytics', label: 'Analytics', icon: IconTrendingUp },
  ];

  return (
    <PageShell title={protocol.title}>
      <div className="space-y-6">
        {/* Back Button */}
        {onBack && (
          <Button
            variant="secondary"
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <IconArrowLeft className="h-4 w-4" />
            <span>Voltar aos Protocolos</span>
          </Button>
        )}

        {/* Header */}
        <div className="rounded-lg bg-slate-800 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex items-center space-x-3">
                <span
                  className={`rounded px-3 py-1 text-sm font-medium text-white ${getCategoryColor(protocol.category)}`}
                >
                  {protocol.category}
                </span>
                <span className="rounded bg-slate-700 px-3 py-1 text-sm font-medium text-slate-300">
                  {protocol.specialty}
                </span>
                <span className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white">
                  v{protocol.version}
                </span>
                {analytics && analytics.effectivenessScore >= 85 && (
                  <div className="flex items-center space-x-1">
                    <IconAward className="h-4 w-4 text-yellow-400" />
                    <span className="text-xs text-yellow-400">
                      Alta Efetividade
                    </span>
                  </div>
                )}
              </div>

              <h1 className="mb-2 text-2xl font-bold text-slate-50">
                {protocol.name}
              </h1>
              <p className="mb-4 text-lg text-slate-300">
                {protocol.description}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <IconClock className="h-4 w-4" />
                  <span>Duração: {protocol.expectedDuration}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <IconActivity className="h-4 w-4" />
                  <span>{phases.length} fases</span>
                </div>
                <div className="flex items-center space-x-2">
                  <IconScience className="h-4 w-4" />
                  <span>{evidences.length} evidências</span>
                </div>
                {analytics && (
                  <div className="flex items-center space-x-2">
                    <IconUsers className="h-4 w-4" />
                    <span>{analytics.totalPrescriptions} prescrições</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {canPrescribe && (
                <Button
                  variant="primary"
                  onClick={() => setIsPrescriptionModalOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <IconUserPlus />
                  <span>Prescrever</span>
                </Button>
              )}

              <Button
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <IconShare />
                <span>Compartilhar</span>
              </Button>

              <Button
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <IconDownload />
                <span>Exportar</span>
              </Button>

              {canEditProtocol && (
                <Button
                  variant="secondary"
                  className="flex items-center space-x-2"
                >
                  <IconEdit />
                  <span>Editar</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-slate-800 p-4">
              <div className="mb-2 flex items-center space-x-2">
                <IconTrendingUp className="h-5 w-5 text-green-400" />
                <span className="text-sm text-slate-400">Efetividade</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {analytics.effectivenessScore}%
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <div className="mb-2 flex items-center space-x-2">
                <IconActivity className="h-5 w-5 text-blue-400" />
                <span className="text-sm text-slate-400">Aderência Média</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {analytics.averageAdherence}%
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <div className="mb-2 flex items-center space-x-2">
                <IconUsers className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-slate-400">
                  Taxa de Conclusão
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-400">
                {analytics.completionRate}%
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <div className="mb-2 flex items-center space-x-2">
                <IconHeart className="h-5 w-5 text-yellow-400" />
                <span className="text-sm text-slate-400">Satisfação</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">
                {analytics.patientSatisfaction}/10
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="rounded-lg bg-slate-800">
          <div className="border-b border-slate-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as any)}
                    className={`flex items-center space-x-2 border-b-2 py-4 text-sm font-medium transition-colors ${
                      selectedTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                {/* Indication */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-slate-50">
                    Indicação
                  </h3>
                  <p className="rounded-lg bg-slate-900 p-4 text-slate-300">
                    {protocol.indication}
                  </p>
                </div>

                {/* Criteria */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-slate-50">
                      Critérios de Inclusão
                    </h3>
                    <ul className="space-y-2 rounded-lg bg-slate-900 p-4">
                      {protocol.inclusionCriteria.map((criteria, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="mt-1 text-green-400">✓</span>
                          <span className="text-slate-300">{criteria}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-slate-50">
                      Critérios de Exclusão
                    </h3>
                    <ul className="space-y-2 rounded-lg bg-slate-900 p-4">
                      {protocol.exclusionCriteria.map((criteria, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="mt-1 text-red-400">✗</span>
                          <span className="text-slate-300">{criteria}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Expected Outcomes */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-slate-50">
                    Resultados Esperados
                  </h3>
                  <ul className="space-y-2 rounded-lg bg-slate-900 p-4">
                    {protocol.expectedOutcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="mt-1 text-blue-400">•</span>
                        <span className="text-slate-300">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Precautions and Contraindications */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-slate-50">
                      Precauções
                    </h3>
                    <ul className="space-y-2 rounded-lg border border-yellow-600/20 bg-yellow-900/20 p-4">
                      {protocol.precautions.map((precaution, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="mt-1 text-yellow-400">⚠</span>
                          <span className="text-slate-300">{precaution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-slate-50">
                      Contraindicações
                    </h3>
                    <ul className="space-y-2 rounded-lg border border-red-600/20 bg-red-900/20 p-4">
                      {protocol.contraindications.map(
                        (contraindication, index) => (
                          <li
                            key={index}
                            className="flex items-start space-x-2"
                          >
                            <span className="mt-1 text-red-400">⛔</span>
                            <span className="text-slate-300">
                              {contraindication}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'phases' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-50">
                  Fases do Protocolo
                </h3>

                <div className="space-y-6">
                  {phases.map((phase, index) => (
                    <div key={phase.id} className="rounded-lg bg-slate-900 p-6">
                      <div className="mb-4 flex items-center space-x-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                          {phase.order}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-slate-50">
                            {phase.name}
                          </h4>
                          <div className="mt-1 flex items-center space-x-4">
                            <span
                              className={`text-sm font-medium ${getPhaseColor(phase.phase)}`}
                            >
                              {phase.phase}
                            </span>
                            <span className="text-sm text-slate-400">
                              <IconClock className="mr-1 inline h-3 w-3" />
                              {phase.duration}
                            </span>
                            <span className="text-sm text-slate-400">
                              <IconActivity className="mr-1 inline h-3 w-3" />
                              {phase.frequency}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="mb-4 text-slate-300">{phase.description}</p>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <h5 className="mb-2 font-medium text-slate-50">
                            Objetivos
                          </h5>
                          <ul className="space-y-1">
                            {phase.objectives.map((objective, idx) => (
                              <li
                                key={idx}
                                className="flex items-start space-x-2"
                              >
                                <span className="mt-1 text-blue-400">•</span>
                                <span className="text-sm text-slate-300">
                                  {objective}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="mb-2 font-medium text-slate-50">
                            Critérios de Progressão
                          </h5>
                          <ul className="space-y-1">
                            {phase.progressionCriteria.map((criteria, idx) => (
                              <li
                                key={idx}
                                className="flex items-start space-x-2"
                              >
                                <span className="mt-1 text-green-400">✓</span>
                                <span className="text-sm text-slate-300">
                                  {criteria}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Phase Exercises */}
                      {phaseExercises[phase.id] &&
                        phaseExercises[phase.id].length > 0 && (
                          <div className="mt-6">
                            <h5 className="mb-3 font-medium text-slate-50">
                              Exercícios da Fase
                            </h5>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              {phaseExercises[phase.id].map(
                                (protocolEx, idx) => (
                                  <div
                                    key={protocolEx.id}
                                    className="rounded-lg bg-slate-800 p-4"
                                  >
                                    <div className="mb-2 flex items-center space-x-3">
                                      <span className="text-sm text-slate-400">
                                        #{protocolEx.order}
                                      </span>
                                      <h6 className="font-medium text-slate-50">
                                        {protocolEx.exercise?.name ||
                                          'Exercício não encontrado'}
                                      </h6>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <span className="text-slate-400">
                                          Séries:
                                        </span>
                                        <span className="ml-1 text-slate-300">
                                          {protocolEx.sets}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400">
                                          Reps:
                                        </span>
                                        <span className="ml-1 text-slate-300">
                                          {protocolEx.reps}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400">
                                          Intensidade:
                                        </span>
                                        <span className="ml-1 text-slate-300">
                                          {protocolEx.intensity}
                                        </span>
                                      </div>
                                    </div>
                                    {protocolEx.progression && (
                                      <p className="mt-2 text-xs text-slate-400">
                                        <strong>Progressão:</strong>{' '}
                                        {protocolEx.progression}
                                      </p>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {phase.precautions.length > 0 && (
                        <div className="mt-4 rounded-lg border border-yellow-600/20 bg-yellow-900/20 p-3">
                          <h6 className="mb-2 text-sm font-medium text-yellow-400">
                            Precauções desta Fase:
                          </h6>
                          <ul className="space-y-1">
                            {phase.precautions.map((precaution, idx) => (
                              <li
                                key={idx}
                                className="flex items-start space-x-2 text-xs text-slate-300"
                              >
                                <span className="mt-0.5 text-yellow-400">
                                  ⚠
                                </span>
                                <span>{precaution}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'evidences' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-50">
                  Base Científica
                </h3>

                {evidences.length === 0 ? (
                  <p className="text-slate-400">
                    Nenhuma evidência científica registrada para este protocolo.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {evidences.map((evidence, index) => (
                      <div
                        key={evidence.id}
                        className="rounded-lg bg-slate-900 p-6"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="mb-2 text-lg font-semibold text-slate-50">
                              {evidence.title}
                            </h4>
                            <p className="mb-2 text-sm text-slate-400">
                              {evidence.authors}
                            </p>
                            <p className="text-sm text-slate-400">
                              <span className="font-medium">
                                {evidence.journal}
                              </span>{' '}
                              • {evidence.year}
                              {evidence.doi && (
                                <span>
                                  {' '}
                                  • DOI:{' '}
                                  <code className="text-blue-400">
                                    {evidence.doi}
                                  </code>
                                </span>
                              )}
                            </p>
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-sm font-medium ${getEvidenceLevelColor(evidence.evidenceLevel)}`}
                          >
                            Nível {evidence.evidenceLevel}
                          </div>
                        </div>

                        <p className="mb-4 text-slate-300">
                          {evidence.description}
                        </p>

                        {evidence.link && (
                          <a
                            href={evidence.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300"
                          >
                            <IconPlay className="h-3 w-3" />
                            <span>Acessar Publicação</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'analytics' && analytics && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-50">
                  Analytics de Efetividade
                </h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-slate-900 p-6">
                    <div className="mb-4 flex items-center space-x-3">
                      <div className="rounded-lg bg-blue-600 p-2">
                        <IconUsers className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">
                          Total de Prescrições
                        </p>
                        <p className="text-2xl font-bold text-slate-50">
                          {analytics.totalPrescriptions}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Desde o lançamento do protocolo
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-6">
                    <div className="mb-4 flex items-center space-x-3">
                      <div className="rounded-lg bg-green-600 p-2">
                        <IconTrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">
                          Taxa de Conclusão
                        </p>
                        <p className="text-2xl font-bold text-slate-50">
                          {analytics.completionRate}%
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Pacientes que completaram o protocolo
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-6">
                    <div className="mb-4 flex items-center space-x-3">
                      <div className="rounded-lg bg-purple-600 p-2">
                        <IconActivity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">
                          Aderência Média
                        </p>
                        <p className="text-2xl font-bold text-slate-50">
                          {analytics.averageAdherence}%
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Percentual de exercícios realizados
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-6">
                    <div className="mb-4 flex items-center space-x-3">
                      <div className="rounded-lg bg-yellow-600 p-2">
                        <IconClock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Duração Média</p>
                        <p className="text-2xl font-bold text-slate-50">
                          {Math.round(analytics.averageDuration / 7)} sem
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Tempo médio de tratamento
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-6">
                    <div className="mb-4 flex items-center space-x-3">
                      <div className="rounded-lg bg-red-600 p-2">
                        <IconAward className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">
                          Score de Efetividade
                        </p>
                        <p className="text-2xl font-bold text-slate-50">
                          {analytics.effectivenessScore}%
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Baseado em resultados clínicos
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900 p-6">
                    <div className="mb-4 flex items-center space-x-3">
                      <div className="rounded-lg bg-pink-600 p-2">
                        <IconHeart className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Satisfação</p>
                        <p className="text-2xl font-bold text-slate-50">
                          {analytics.patientSatisfaction}/10
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Avaliação média dos pacientes
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-900 p-6">
                  <h4 className="mb-4 text-lg font-semibold text-slate-50">
                    Interpretação dos Resultados
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`mt-2 h-2 w-2 rounded-full ${analytics.effectivenessScore >= 85 ? 'bg-green-400' : analytics.effectivenessScore >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      ></div>
                      <div>
                        <p className="text-slate-300">
                          <strong>Efetividade:</strong>{' '}
                          {analytics.effectivenessScore >= 85
                            ? 'Excelente'
                            : analytics.effectivenessScore >= 70
                              ? 'Boa'
                              : 'Necessita revisão'}
                        </p>
                        <p className="text-slate-400">
                          {analytics.effectivenessScore >= 85
                            ? 'Protocolo demonstra alta efetividade clínica com resultados consistentes.'
                            : analytics.effectivenessScore >= 70
                              ? 'Protocolo apresenta bons resultados, mas pode ser otimizado.'
                              : 'Protocolo necessita revisão para melhoria dos resultados.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div
                        className={`mt-2 h-2 w-2 rounded-full ${analytics.averageAdherence >= 80 ? 'bg-green-400' : analytics.averageAdherence >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      ></div>
                      <div>
                        <p className="text-slate-300">
                          <strong>Aderência:</strong>{' '}
                          {analytics.averageAdherence >= 80
                            ? 'Alta'
                            : analytics.averageAdherence >= 60
                              ? 'Moderada'
                              : 'Baixa'}
                        </p>
                        <p className="text-slate-400">
                          {analytics.averageAdherence >= 80
                            ? 'Pacientes demonstram excelente aderência ao protocolo.'
                            : analytics.averageAdherence >= 60
                              ? 'Aderência adequada, considerar estratégias de motivação.'
                              : 'Baixa aderência pode indicar necessidade de simplificação.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProtocolPrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        protocol={protocol}
      />
    </PageShell>
  );
};

export default ClinicalProtocolViewerPage;
