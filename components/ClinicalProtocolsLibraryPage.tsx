import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData.minimal';
import { useAuth } from '../hooks/useAuth';
import { ClinicalProtocol, UserRole } from '../types';
import PageShell from './ui/PageShell';
import Button from './ui/Button';
import FormField from './ui/FormField';
import NewProtocolModal from './NewProtocolModal';
import {
  IconPlus,
  IconSearch,
  IconBook,
  IconStar,
  IconClock,
  IconUsers,
  IconChartBar,
  IconShield,
  IconActivity,
  IconScience,
  IconHeart,
  IconTrendingUp,
  IconAward,
  IconEye,
} from './icons/IconComponents';

interface ClinicalProtocolsLibraryPageProps {
  onSelectProtocol?: (protocolId: string) => void;
}

const ClinicalProtocolsLibraryPage: React.FC<
  ClinicalProtocolsLibraryPageProps
> = ({ onSelectProtocol }) => {
  const { clinicalProtocols, protocolAnalytics } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<
    'name' | 'effectiveness' | 'usage' | 'recent'
  >('effectiveness');
  const [isNewProtocolModalOpen, setIsNewProtocolModalOpen] = useState(false);

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
  const categories = [
    'Pós-Cirúrgico',
    'Conservador',
    'Preventivo',
    'Manutenção',
  ];

  const protocolsWithAnalytics = useMemo(() => {
    return clinicalProtocols.map((protocol) => {
      const analytics = protocolAnalytics.find(
        (a) => a.protocolId === protocol.id
      );
      return {
        ...protocol,
        analytics,
      };
    });
  }, [clinicalProtocols, protocolAnalytics]);

  const filteredAndSortedProtocols = useMemo(() => {
    const filtered = protocolsWithAnalytics.filter((protocol) => {
      const matchesSearch =
        !searchTerm ||
        protocol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        protocol.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        protocol.indication.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSpecialty =
        !selectedSpecialty || protocol.specialty === selectedSpecialty;
      const matchesCategory =
        !selectedCategory || protocol.category === selectedCategory;
      const isActive = protocol.isActive;

      return matchesSearch && matchesSpecialty && matchesCategory && isActive;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'effectiveness':
          return (
            (b.analytics?.effectivenessScore || 0) -
            (a.analytics?.effectivenessScore || 0)
          );
        case 'usage':
          return (
            (b.analytics?.totalPrescriptions || 0) -
            (a.analytics?.totalPrescriptions || 0)
          );
        case 'recent':
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [
    protocolsWithAnalytics,
    searchTerm,
    selectedSpecialty,
    selectedCategory,
    sortBy,
  ]);

  const specialtyGroups = useMemo(() => {
    const groups: { [key: string]: typeof filteredAndSortedProtocols } = {};
    filteredAndSortedProtocols.forEach((protocol) => {
      if (!groups[protocol.specialty]) {
        groups[protocol.specialty] = [];
      }
      groups[protocol.specialty].push(protocol);
    });
    return groups;
  }, [filteredAndSortedProtocols]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty('');
    setSelectedCategory('');
  };

  const canCreateProtocol =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FISIOTERAPEUTA;

  return (
    <PageShell title="Protocolos Clínicos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">
              Protocolos Clínicos
            </h1>
            <p className="mt-1 text-slate-400">
              Biblioteca de protocolos baseados em evidências científicas
            </p>
          </div>
          {canCreateProtocol && (
            <Button
              variant="primary"
              onClick={() => setIsNewProtocolModalOpen(true)}
              className="flex items-center space-x-2"
            >
              <IconPlus />
              <span>Novo Protocolo</span>
            </Button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-slate-800 p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <IconBook className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total de Protocolos</p>
                <p className="text-2xl font-bold text-slate-50">
                  {clinicalProtocols.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-800 p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-green-600 p-2">
                <IconTrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Taxa Média de Sucesso</p>
                <p className="text-2xl font-bold text-slate-50">
                  {protocolAnalytics.length > 0
                    ? Math.round(
                        protocolAnalytics.reduce(
                          (acc, a) => acc + a.effectivenessScore,
                          0
                        ) / protocolAnalytics.length
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-800 p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-purple-600 p-2">
                <IconUsers className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Pacientes Ativos</p>
                <p className="text-2xl font-bold text-slate-50">
                  {protocolAnalytics.reduce(
                    (acc, a) => acc + a.totalPrescriptions,
                    0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-800 p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-yellow-600 p-2">
                <IconAward className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Aderência Média</p>
                <p className="text-2xl font-bold text-slate-50">
                  {protocolAnalytics.length > 0
                    ? Math.round(
                        protocolAnalytics.reduce(
                          (acc, a) => acc + a.averageAdherence,
                          0
                        ) / protocolAnalytics.length
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 rounded-lg bg-slate-800 p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <FormField
                name="searchTerm"
                label=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar protocolos por nome, descrição ou indicação..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                <option value="">Todas as Especialidades</option>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                <option value="">Todas as Categorias</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                <option value="effectiveness">Mais Efetivos</option>
                <option value="usage">Mais Utilizados</option>
                <option value="recent">Mais Recentes</option>
                <option value="name">Ordem Alfabética</option>
              </select>
            </div>
          </div>

          {(searchTerm || selectedSpecialty || selectedCategory) && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                {filteredAndSortedProtocols.length} protocolo(s) encontrado(s)
              </p>
              <Button variant="secondary" onClick={clearFilters} >
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>

        {/* Protocols by Specialty */}
        <div className="space-y-8">
          {Object.keys(specialtyGroups).length === 0 ? (
            <div className="py-12 text-center">
              <IconBook className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <h3 className="mb-2 text-lg font-medium text-slate-300">
                Nenhum protocolo encontrado
              </h3>
              <p className="text-slate-400">
                {searchTerm || selectedSpecialty || selectedCategory
                  ? 'Tente ajustar os filtros para encontrar protocolos.'
                  : 'Ainda não há protocolos disponíveis.'}
              </p>
            </div>
          ) : (
            Object.entries(specialtyGroups).map(([specialty, protocols]) => (
              <div key={specialty}>
                <div className="mb-4 flex items-center space-x-3">
                  <h2 className="text-xl font-bold text-slate-50">
                    {specialty}
                  </h2>
                  <span className="rounded bg-slate-700 px-2 py-1 text-sm text-slate-300">
                    {protocols.length} protocolo(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {protocols.map((protocol) => (
                    <ProtocolCard
                      key={protocol.id}
                      protocol={protocol}
                      onSelect={onSelectProtocol}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <NewProtocolModal
          isOpen={isNewProtocolModalOpen}
          onClose={() => setIsNewProtocolModalOpen(false)}
        />
      </div>
    </PageShell>
  );
};

interface ProtocolCardProps {
  protocol: ClinicalProtocol & { analytics?: any };
  onSelect?: (protocolId: string) => void;
}

const ProtocolCard: React.FC<ProtocolCardProps> = ({ protocol, onSelect }) => {
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

  const getEvidenceIcon = (level: string) => {
    switch (level) {
      case 'I':
        return <IconScience className="h-4 w-4 text-green-400" />;
      case 'II':
        return <IconScience className="h-4 w-4 text-blue-400" />;
      case 'III':
        return <IconScience className="h-4 w-4 text-yellow-400" />;
      case 'IV':
        return <IconScience className="h-4 w-4 text-orange-400" />;
      case 'V':
        return <IconScience className="h-4 w-4 text-red-400" />;
      default:
        return <IconScience className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div
      className="hover:bg-slate-750 cursor-pointer rounded-lg bg-slate-800 p-6 transition-colors"
      onClick={() => onSelect?.(protocol.id)}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <span
            className={`rounded px-2 py-1 text-xs font-medium text-white ${getCategoryColor(protocol.category)}`}
          >
            {protocol.category}
          </span>
          <span className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-slate-300">
            v{protocol.version}
          </span>
        </div>
        {protocol.analytics && protocol.analytics.effectivenessScore >= 85 && (
          <IconHeart className="h-5 w-5 fill-current text-red-500" />
        )}
      </div>

      <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-slate-50">
        {protocol.name}
      </h3>

      <p className="mb-3 line-clamp-2 text-sm text-slate-400">
        {protocol.description}
      </p>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Duração:</span>
          <span className="text-slate-300">{protocol.expectedDuration}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Fases:</span>
          <span className="text-slate-300">{protocol.phases.length}</span>
        </div>
        {protocol.evidences && protocol.evidences.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Evidências:</span>
            <div className="flex items-center space-x-1">
              {getEvidenceIcon(protocol.evidences[0].evidenceLevel)}
              <span className="text-slate-300">
                Nível {protocol.evidences[0].evidenceLevel}
              </span>
            </div>
          </div>
        )}
      </div>

      {protocol.analytics && (
        <div className="space-y-2 border-t border-slate-700 pt-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <IconTrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-slate-400">Efetividade:</span>
            </div>
            <span className="font-medium text-green-400">
              {protocol.analytics.effectivenessScore}%
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <IconUsers className="h-4 w-4 text-blue-400" />
              <span className="text-slate-400">Prescrições:</span>
            </div>
            <span className="font-medium text-blue-400">
              {protocol.analytics.totalPrescriptions}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <IconActivity className="h-4 w-4 text-yellow-400" />
              <span className="text-slate-400">Aderência:</span>
            </div>
            <span className="font-medium text-yellow-400">
              {protocol.analytics.averageAdherence}%
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-slate-700 pt-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1">
            <IconClock className="h-3 w-3" />
            <span>Atualizado em {formatDate(protocol.updatedAt)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <IconShield className="h-3 w-3" />
            <span>
              Evidência Nível {protocol.evidences?.[0]?.evidenceLevel || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalProtocolsLibraryPage;
