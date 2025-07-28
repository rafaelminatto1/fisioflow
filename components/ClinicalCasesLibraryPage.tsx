import React, { useState, useMemo } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { ClinicalCase, UserRole } from '../types';

import {
  IconPlus,
  IconSearch,
  IconFilter,
  IconStar,
  IconEye,
  IconHeart,
  IconBookOpen,
  IconUser,
  IconClock,
} from './icons/IconComponents';
import NewClinicalCaseModal from './NewClinicalCaseModal';
import { Button } from './ui/Button';
import FormField from './ui/FormField';
import PageShell from './ui/PageShell';

const ClinicalCasesLibraryPage: React.FC = () => {
  const { clinicalCases, caseFavorites, caseViews, caseRatings } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'views' | 'title'>(
    'recent'
  );
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

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
  const difficulties = ['Iniciante', 'Intermediário', 'Avançado'];

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clinicalCases.forEach((clinicalCase) => {
      clinicalCase.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [clinicalCases]);

  const userFavorites = useMemo(() => {
    return new Set(
      caseFavorites
        .filter((fav) => fav.userId === user?.id)
        .map((fav) => fav.caseId)
    );
  }, [caseFavorites, user?.id]);

  const filteredAndSortedCases = useMemo(() => {
    const filtered = clinicalCases.filter((clinicalCase) => {
      const matchesSearch =
        !searchTerm ||
        clinicalCase.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinicalCase.pathology
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        clinicalCase.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesSpecialty =
        !selectedSpecialty || clinicalCase.specialty === selectedSpecialty;
      const matchesDifficulty =
        !selectedDifficulty || clinicalCase.difficulty === selectedDifficulty;
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => clinicalCase.tags.includes(tag));
      const matchesFavorites =
        !showFavoritesOnly || userFavorites.has(clinicalCase.id);
      const isPublished = clinicalCase.isPublished;

      return (
        matchesSearch &&
        matchesSpecialty &&
        matchesDifficulty &&
        matchesTags &&
        matchesFavorites &&
        isPublished
      );
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'views':
          return b.viewCount - a.viewCount;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'recent':
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return filtered;
  }, [
    clinicalCases,
    searchTerm,
    selectedSpecialty,
    selectedDifficulty,
    selectedTags,
    showFavoritesOnly,
    sortBy,
    userFavorites,
  ]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty('');
    setSelectedDifficulty('');
    setSelectedTags([]);
    setShowFavoritesOnly(false);
  };

  const canCreateCase =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FISIOTERAPEUTA;

  return (
    <PageShell title="Biblioteca de Casos Clínicos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="mt-1 text-slate-400">
              Explore casos clínicos educacionais para aprimorar seu aprendizado
            </p>
          </div>
          {canCreateCase && (
            <Button
              variant="primary"
              onClick={() => setIsNewCaseModalOpen(true)}
              className="flex items-center space-x-2"
            >
              <IconPlus />
              <span>Novo Caso</span>
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 rounded-lg bg-slate-800 p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <FormField
                name="search"
                label=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, patologia ou tags..."
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
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                <option value="">Todas as Dificuldades</option>
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
              >
                <option value="recent">Mais Recentes</option>
                <option value="rating">Melhor Avaliados</option>
                <option value="views">Mais Visualizados</option>
                <option value="title">Ordem Alfabética</option>
              </select>
            </div>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Tags:
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 20).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700"
              />
              <span className="text-slate-300">Apenas Favoritos</span>
            </label>

            {(searchTerm ||
              selectedSpecialty ||
              selectedDifficulty ||
              selectedTags.length > 0 ||
              showFavoritesOnly) && (
              <Button variant="secondary" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* Cases Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedCases.map((clinicalCase) => (
            <CaseCard
              key={clinicalCase.id}
              clinicalCase={clinicalCase}
              isFavorite={userFavorites.has(clinicalCase.id)}
            />
          ))}
        </div>

        {filteredAndSortedCases.length === 0 && (
          <div className="py-12 text-center">
            <IconBookOpen className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h3 className="mb-2 text-lg font-medium text-slate-300">
              Nenhum caso encontrado
            </h3>
            <p className="text-slate-400">
              {searchTerm ||
              selectedSpecialty ||
              selectedDifficulty ||
              selectedTags.length > 0 ||
              showFavoritesOnly
                ? 'Tente ajustar os filtros para encontrar mais casos.'
                : 'Ainda não há casos clínicos publicados.'}
            </p>
          </div>
        )}

        <NewClinicalCaseModal
          isOpen={isNewCaseModalOpen}
          onClose={() => setIsNewCaseModalOpen(false)}
        />
      </div>
    </PageShell>
  );
};

interface CaseCardProps {
  clinicalCase: ClinicalCase;
  isFavorite: boolean;
}

const CaseCard: React.FC<CaseCardProps> = ({ clinicalCase, isFavorite }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Iniciante':
        return 'bg-green-600';
      case 'Intermediário':
        return 'bg-yellow-600';
      case 'Avançado':
        return 'bg-red-600';
      default:
        return 'bg-slate-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="hover:bg-slate-750 cursor-pointer rounded-lg bg-slate-800 p-6 transition-colors">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <span
            className={`rounded px-2 py-1 text-xs font-medium text-white ${getDifficultyColor(clinicalCase.difficulty)}`}
          >
            {clinicalCase.difficulty}
          </span>
          <span className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white">
            {clinicalCase.specialty}
          </span>
        </div>
        {isFavorite && (
          <IconHeart className="h-5 w-5 fill-current text-red-500" />
        )}
      </div>

      <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-slate-50">
        {clinicalCase.title}
      </h3>

      <p className="mb-3 line-clamp-2 text-sm text-slate-400">
        {clinicalCase.pathology}
      </p>

      <div className="mb-4 flex flex-wrap gap-1">
        {clinicalCase.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300"
          >
            {tag}
          </span>
        ))}
        {clinicalCase.tags.length > 3 && (
          <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">
            +{clinicalCase.tags.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <IconStar className="h-4 w-4 fill-current text-yellow-500" />
            <span>{clinicalCase.rating.toFixed(1)}</span>
            <span>({clinicalCase.ratingCount})</span>
          </div>
          <div className="flex items-center space-x-1">
            <IconEye className="h-4 w-4" />
            <span>{clinicalCase.viewCount}</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <IconClock className="h-4 w-4" />
          <span>{formatDate(clinicalCase.createdAt)}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-700 pt-4">
        <p className="text-xs text-slate-500">
          Paciente: {clinicalCase.anonymizedPatientData.gender},{' '}
          {clinicalCase.anonymizedPatientData.age} anos
        </p>
      </div>
    </div>
  );
};

export default ClinicalCasesLibraryPage;
