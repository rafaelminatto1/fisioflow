import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import {
  PatientProtocol,
  ProtocolPhase,
  ProtocolExercise,
  ProtocolProgressNote,
} from '../types';
import PageShell from './ui/PageShell';
import Button from './ui/Button';
import FormField from './ui/FormField';
import Modal from './ui/Modal';
import {
  IconActivity,
  IconClock,
  IconTrendingUp,
  IconCalendar,
  IconCheck,
  IconPlay,
  IconPause,
  IconStop,
  IconChevronRight,
  IconAward,
  IconHeart,
  IconUser,
  IconEdit,
  IconPlus,
  IconX,
} from './icons/IconComponents';

const PatientProtocolTrackingPage: React.FC = () => {
  const {
    patientProtocols,
    clinicalProtocols,
    protocolPhases,
    protocolExercises,
    exercises,
    protocolProgressNotes,
    patients,
    addProtocolProgressNote,
    updatePatientProtocolStatus,
    advanceProtocolPhase,
  } = useData();
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'active' | 'completed' | 'paused'
  >('active');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] =
    useState<PatientProtocol | null>(null);
  const [progressNote, setProgressNote] = useState('');
  const [adherence, setAdherence] = useState(80);
  const [painLevel, setPainLevel] = useState(0);
  const [functionalLevel, setFunctionalLevel] = useState(8);
  const [nextSteps, setNextSteps] = useState('');
  const [phaseProgression, setPhaseProgression] = useState<
    'Manter' | 'Avançar' | 'Regredir'
  >('Manter');

  const filteredProtocols = useMemo(() => {
    let filtered = patientProtocols;

    if (selectedFilter !== 'all') {
      const statusMap = {
        active: 'Ativo',
        completed: 'Concluído',
        paused: 'Pausado',
      };
      filtered = filtered.filter(
        (pp) => pp.status === statusMap[selectedFilter]
      );
    }

    if (selectedPatientId) {
      filtered = filtered.filter((pp) => pp.patientId === selectedPatientId);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }, [patientProtocols, selectedFilter, selectedPatientId]);

  const getProtocolDetails = (patientProtocol: PatientProtocol) => {
    const protocol = clinicalProtocols.find(
      (p) => p.id === patientProtocol.protocolId
    );
    const patient = patients.find((p) => p.id === patientProtocol.patientId);
    const currentPhase = protocolPhases.find(
      (p) => p.id === patientProtocol.currentPhaseId
    );
    const allPhases = protocolPhases
      .filter((p) => p.protocolId === patientProtocol.protocolId)
      .sort((a, b) => a.order - b.order);
    const progressNotes = protocolProgressNotes
      .filter((note) => note.patientProtocolId === patientProtocol.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { protocol, patient, currentPhase, allPhases, progressNotes };
  };

  const getStatusColor = (status: PatientProtocol['status']) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-600';
      case 'Pausado':
        return 'bg-yellow-600';
      case 'Concluído':
        return 'bg-blue-600';
      case 'Descontinuado':
        return 'bg-red-600';
      default:
        return 'bg-slate-600';
    }
  };

  const getStatusIcon = (status: PatientProtocol['status']) => {
    switch (status) {
      case 'Ativo':
        return <IconPlay className="h-4 w-4" />;
      case 'Pausado':
        return <IconPause className="h-4 w-4" />;
      case 'Concluído':
        return <IconCheck className="h-4 w-4" />;
      case 'Descontinuado':
        return <IconStop className="h-4 w-4" />;
      default:
        return <IconClock className="h-4 w-4" />;
    }
  };

  const calculateProgress = (patientProtocol: PatientProtocol) => {
    const { allPhases, currentPhase } = getProtocolDetails(patientProtocol);
    if (!currentPhase || allPhases.length === 0) return 0;

    return Math.round((currentPhase.order / allPhases.length) * 100);
  };

  const handleAddProgressNote = () => {
    if (!selectedProtocol || !user) return;

    const { currentPhase } = getProtocolDetails(selectedProtocol);

    const note: Omit<ProtocolProgressNote, 'id'> = {
      patientProtocolId: selectedProtocol.id,
      date: new Date().toISOString(),
      currentPhase: currentPhase?.name || '',
      adherence,
      painLevel,
      functionalLevel,
      notes: progressNote,
      therapistId: user.id,
      nextSteps,
      phaseProgression,
      tenantId: user.tenantId!,
    };

    addProtocolProgressNote(note);

    // Handle phase progression
    if (phaseProgression === 'Avançar') {
      const { allPhases, currentPhase } = getProtocolDetails(selectedProtocol);
      const nextPhase = allPhases.find(
        (p) => p.order === (currentPhase?.order || 0) + 1
      );
      if (nextPhase) {
        advanceProtocolPhase(selectedProtocol.id, nextPhase.id);
      }
    }

    // Reset form and close modal
    setProgressNote('');
    setAdherence(80);
    setPainLevel(0);
    setFunctionalLevel(8);
    setNextSteps('');
    setPhaseProgression('Manter');
    setIsProgressModalOpen(false);
    setSelectedProtocol(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">
              Acompanhamento de Protocolos
            </h1>
            <p className="mt-1 text-slate-400">
              Monitore o progresso dos pacientes nos protocolos clínicos
              prescritos
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4 rounded-lg bg-slate-800 p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Paciente
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                <option value="">Todos os Pacientes</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'active', label: 'Ativos' },
                { id: 'completed', label: 'Concluídos' },
                { id: 'paused', label: 'Pausados' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id as any)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    selectedFilter === filter.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Protocol Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredProtocols.map((patientProtocol) => {
            const { protocol, patient, currentPhase, progressNotes } =
              getProtocolDetails(patientProtocol);
            const progress = calculateProgress(patientProtocol);
            const daysRemaining = getDaysRemaining(
              patientProtocol.expectedEndDate
            );

            if (!protocol || !patient) return null;

            return (
              <div
                key={patientProtocol.id}
                className="rounded-lg bg-slate-800 p-6"
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="mb-1 text-lg font-semibold text-slate-50">
                      {protocol.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <IconUser className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-300">{patient.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`flex items-center space-x-1 rounded-full px-3 py-1 text-sm font-medium text-white ${getStatusColor(patientProtocol.status)}`}
                    >
                      {getStatusIcon(patientProtocol.status)}
                      <span>{patientProtocol.status}</span>
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="mb-2 flex justify-between text-sm text-slate-400">
                    <span>Progresso</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Phase */}
                {currentPhase && (
                  <div className="mb-4 rounded-lg bg-slate-900 p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <IconActivity className="h-4 w-4 text-blue-400" />
                      <span className="font-medium text-blue-400">
                        Fase Atual
                      </span>
                    </div>
                    <h4 className="font-medium text-slate-50">
                      {currentPhase.name}
                    </h4>
                    <p className="text-sm text-slate-400">
                      {currentPhase.duration} • {currentPhase.frequency}
                    </p>
                  </div>
                )}

                {/* Metrics */}
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-400">
                      {patientProtocol.adherenceRate}%
                    </div>
                    <div className="text-xs text-slate-400">Aderência</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-400">
                      {daysRemaining}
                    </div>
                    <div className="text-xs text-slate-400">Dias Rest.</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-400">
                      {progressNotes.length}
                    </div>
                    <div className="text-xs text-slate-400">Registros</div>
                  </div>
                </div>

                {/* Latest Progress Note */}
                {progressNotes[0] && (
                  <div className="mb-4 rounded-lg bg-slate-900 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Último Registro
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(progressNotes[0].date)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-300">
                      {progressNotes[0].notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedProtocol(patientProtocol);
                      setIsProgressModalOpen(true);
                    }}
                    className="flex items-center space-x-1"
                  >
                    <IconPlus className="h-3 w-3" />
                    <span>Registrar Progresso</span>
                  </Button>

                  {patientProtocol.status === 'Ativo' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        updatePatientProtocolStatus(
                          patientProtocol.id,
                          'Pausado'
                        )
                      }
                    >
                      <IconPause className="h-3 w-3" />
                    </Button>
                  )}

                  {patientProtocol.status === 'Pausado' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        updatePatientProtocolStatus(patientProtocol.id, 'Ativo')
                      }
                    >
                      <IconPlay className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredProtocols.length === 0 && (
          <div className="py-12 text-center">
            <IconActivity className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h3 className="mb-2 text-lg font-medium text-slate-300">
              Nenhum protocolo encontrado
            </h3>
            <p className="text-slate-400">
              {selectedFilter === 'all'
                ? 'Ainda não há protocolos prescritos.'
                : `Não há protocolos ${selectedFilter === 'active' ? 'ativos' : selectedFilter === 'completed' ? 'concluídos' : 'pausados'}.`}
            </p>
          </div>
        )}

        {/* Progress Note Modal */}
        <Modal
          isOpen={isProgressModalOpen}
          onClose={() => {
            setIsProgressModalOpen(false);
            setSelectedProtocol(null);
          }}
          title="Registrar Progresso"
          size="lg"
        >
          {selectedProtocol && (
            <div className="space-y-6">
              <div className="rounded-lg bg-slate-900 p-4">
                <h4 className="mb-2 font-medium text-slate-50">
                  {getProtocolDetails(selectedProtocol).protocol?.name}
                </h4>
                <p className="text-slate-400">
                  Paciente: {getProtocolDetails(selectedProtocol).patient?.name}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Aderência (%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adherence}
                    onChange={(e) => setAdherence(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 text-center text-slate-300">
                    {adherence}%
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Nível de Dor (0-10)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={painLevel}
                    onChange={(e) => setPainLevel(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 text-center text-slate-300">
                    {painLevel}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Funcionalidade (0-10)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={functionalLevel}
                    onChange={(e) =>
                      setFunctionalLevel(parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="mt-1 text-center text-slate-300">
                    {functionalLevel}
                  </div>
                </div>
              </div>

              <FormField
                label="Observações do Progresso"
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                placeholder="Descreva o progresso do paciente, dificuldades encontradas, melhorias observadas..."
                isTextArea
                rows={4}
              />

              <FormField
                label="Próximos Passos"
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="Planos para as próximas sessões, ajustes necessários..."
                isTextArea
                rows={3}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Progressão de Fase
                </label>
                <select
                  value={phaseProgression}
                  onChange={(e) => setPhaseProgression(e.target.value as any)}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
                >
                  <option value="Manter">Manter Fase Atual</option>
                  <option value="Avançar">Avançar para Próxima Fase</option>
                  <option value="Regredir">Regredir Fase</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 border-t border-slate-700 pt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsProgressModalOpen(false);
                    setSelectedProtocol(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleAddProgressNote}>
                  Registrar Progresso
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageShell>
  );
};

export default PatientProtocolTrackingPage;
