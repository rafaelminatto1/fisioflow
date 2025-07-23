import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useData } from './useData.minimal';
import { useAuth } from './useAuth';
import IntegrationAPI from '../services/integrationAPI';

export interface SearchResult {
  id: string;
  type: 'patient' | 'appointment' | 'protocol' | 'case' | 'task' | 'equipment' | 'report' | 'user';
  title: string;
  subtitle?: string;
  description?: string;
  url?: string;
  score: number;
  metadata?: any;
}

export interface SearchFilters {
  modules: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  type?: string;
  status?: string;
}

interface GlobalSearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
  performSearch: (query: string, filters?: SearchFilters) => void;
  clearSearch: () => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  savedSearches: { name: string; query: string; filters: SearchFilters }[];
  saveSearch: (name: string, query: string, filters: SearchFilters) => void;
  deleteSearch: (name: string) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export const useGlobalSearch = () => {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error('useGlobalSearch must be used within a GlobalSearchProvider');
  }
  return context;
};

interface GlobalSearchProviderProps {
  children: React.ReactNode;
}

export const GlobalSearchProvider: React.FC<GlobalSearchProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const {
    patients,
    appointments,
    clinicalProtocols,
    clinicalCases,
    tasks,
    equipment,
    executiveReports,
    users,
    assessments,
    transactions,
    courses,
    mentorshipSessions,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    modules: ['all'],
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<{ name: string; query: string; filters: SearchFilters }[]>([]);

  // Advanced search function with scoring and ranking
  const performAdvancedSearch = useCallback((query: string, filters: SearchFilters): SearchResult[] => {
    if (!query.trim() || !user?.tenantId) return [];

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    // Helper function to calculate relevance score
    const calculateScore = (text: string, field: 'title' | 'content' | 'metadata' = 'content'): number => {
      const lowerText = text.toLowerCase();
      let score = 0;

      // Exact match gets highest score
      if (lowerText === searchTerm) score += 100;
      
      // Starts with search term
      if (lowerText.startsWith(searchTerm)) score += 80;
      
      // Contains exact phrase
      if (lowerText.includes(searchTerm)) score += 60;
      
      // Contains all words
      const searchWords = searchTerm.split(' ');
      const matchedWords = searchWords.filter(word => lowerText.includes(word));
      score += (matchedWords.length / searchWords.length) * 40;

      // Boost score based on field type
      if (field === 'title') score *= 2;
      if (field === 'metadata') score *= 0.5;

      return score;
    };

    // Search patients
    if (filters.modules.includes('all') || filters.modules.includes('patients')) {
      patients.forEach(patient => {
        let score = 0;
        score += calculateScore(patient.name, 'title');
        score += calculateScore(patient.email, 'metadata');
        score += calculateScore(patient.medicalHistory, 'content');
        score += calculateScore(patient.phone, 'metadata');

        if (score > 0) {
          results.push({
            id: patient.id,
            type: 'patient',
            title: patient.name,
            subtitle: patient.email,
            description: `Telefone: ${patient.phone}`,
            url: `/patients/${patient.id}`,
            score,
            metadata: { consent: patient.consent.given },
          });
        }
      });
    }

    // Search appointments
    if (filters.modules.includes('all') || filters.modules.includes('appointments')) {
      appointments.forEach(appointment => {
        let score = 0;
        score += calculateScore(appointment.title, 'title');
        score += calculateScore(appointment.notes || '', 'content');

        const patient = patients.find(p => p.id === appointment.patientId);
        if (patient) {
          score += calculateScore(patient.name, 'metadata');
        }

        if (score > 0) {
          results.push({
            id: appointment.id,
            type: 'appointment',
            title: appointment.title,
            subtitle: `${new Date(appointment.start).toLocaleDateString('pt-BR')} às ${new Date(appointment.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            description: patient ? `Paciente: ${patient.name}` : '',
            url: `/calendar/${appointment.id}`,
            score,
            metadata: { patientName: patient?.name },
          });
        }
      });
    }

    // Search clinical protocols
    if (filters.modules.includes('all') || filters.modules.includes('protocols')) {
      clinicalProtocols.forEach(protocol => {
        let score = 0;
        score += calculateScore(protocol.name, 'title');
        score += calculateScore(protocol.description, 'content');
        score += calculateScore(protocol.indication, 'content');
        score += calculateScore(protocol.specialty, 'metadata');

        if (score > 0) {
          results.push({
            id: protocol.id,
            type: 'protocol',
            title: protocol.name,
            subtitle: `${protocol.specialty} - ${protocol.category}`,
            description: protocol.description,
            url: `/protocols/${protocol.id}`,
            score,
            metadata: { specialty: protocol.specialty, isActive: protocol.isActive },
          });
        }
      });
    }

    // Search clinical cases
    if (filters.modules.includes('all') || filters.modules.includes('cases')) {
      clinicalCases.forEach(clinicalCase => {
        let score = 0;
        score += calculateScore(clinicalCase.title, 'title');
        score += calculateScore(clinicalCase.pathology, 'content');
        score += calculateScore(clinicalCase.clinicalHistory, 'content');
        score += calculateScore(clinicalCase.specialty, 'metadata');
        
        // Search in tags
        clinicalCase.tags.forEach(tag => {
          score += calculateScore(tag, 'metadata');
        });

        if (score > 0) {
          results.push({
            id: clinicalCase.id,
            type: 'case',
            title: clinicalCase.title,
            subtitle: `${clinicalCase.specialty} - ${clinicalCase.difficulty}`,
            description: clinicalCase.pathology,
            url: `/cases/${clinicalCase.id}`,
            score,
            metadata: { 
              specialty: clinicalCase.specialty, 
              difficulty: clinicalCase.difficulty,
              isPublished: clinicalCase.isPublished 
            },
          });
        }
      });
    }

    // Search tasks
    if (filters.modules.includes('all') || filters.modules.includes('tasks')) {
      tasks.forEach(task => {
        let score = 0;
        score += calculateScore(task.title, 'title');
        score += calculateScore(task.description || '', 'content');

        const patient = patients.find(p => p.id === task.patientId);
        if (patient) {
          score += calculateScore(patient.name, 'metadata');
        }

        if (score > 0) {
          results.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: `${task.priority} - ${task.status}`,
            description: patient ? `Paciente: ${patient.name}` : task.description,
            url: `/tasks/${task.id}`,
            score,
            metadata: { 
              priority: task.priority, 
              status: task.status,
              patientName: patient?.name 
            },
          });
        }
      });
    }

    // Search equipment
    if (filters.modules.includes('all') || filters.modules.includes('equipment')) {
      equipment.forEach(eq => {
        let score = 0;
        score += calculateScore(eq.name, 'title');
        score += calculateScore(eq.brand, 'metadata');
        score += calculateScore(eq.model, 'metadata');
        score += calculateScore(eq.location, 'content');
        score += calculateScore(eq.notes || '', 'content');

        if (score > 0) {
          results.push({
            id: eq.id,
            type: 'equipment',
            title: eq.name,
            subtitle: `${eq.brand} ${eq.model}`,
            description: `Localização: ${eq.location} - Status: ${eq.status}`,
            url: `/equipment/${eq.id}`,
            score,
            metadata: { 
              status: eq.status, 
              condition: eq.condition,
              location: eq.location 
            },
          });
        }
      });
    }

    // Search reports
    if (filters.modules.includes('all') || filters.modules.includes('reports')) {
      executiveReports.forEach(report => {
        let score = 0;
        score += calculateScore(report.title, 'title');
        score += calculateScore(report.type, 'metadata');

        if (score > 0) {
          results.push({
            id: report.id,
            type: 'report',
            title: report.title,
            subtitle: `${report.type} - ${new Date(report.generatedAt).toLocaleDateString('pt-BR')}`,
            description: `Status: ${report.status}`,
            url: `/reports/${report.id}`,
            score,
            metadata: { 
              type: report.type, 
              status: report.status,
              generatedAt: report.generatedAt 
            },
          });
        }
      });
    }

    // Search users (staff)
    if (filters.modules.includes('all') || filters.modules.includes('users')) {
      users.forEach(userItem => {
        let score = 0;
        score += calculateScore(userItem.name, 'title');
        score += calculateScore(userItem.email || '', 'metadata');

        if (score > 0) {
          results.push({
            id: userItem.id,
            type: 'user',
            title: userItem.name,
            subtitle: userItem.role,
            description: userItem.email,
            url: `/staff/${userItem.id}`,
            score,
            metadata: { role: userItem.role },
          });
        }
      });
    }

    // Apply date filters if specified
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      // Filter results by date (this would need date fields in metadata)
      // For now, we'll skip this filtering
    }

    // Sort by score (highest first) and return top 50 results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }, [
    patients, 
    appointments, 
    clinicalProtocols, 
    clinicalCases, 
    tasks, 
    equipment, 
    executiveReports, 
    users, 
    user?.tenantId
  ]);

  const performSearch = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Use advanced search
      const results = performAdvancedSearch(query, filters || searchFilters);
      setSearchResults(results);
      
      // Add to recent searches
      addRecentSearch(query);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [performAdvancedSearch, searchFilters]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    setRecentSearches(prev => {
      const newRecent = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      return newRecent;
    });
  }, []);

  const saveSearch = useCallback((name: string, query: string, filters: SearchFilters) => {
    setSavedSearches(prev => [
      ...prev.filter(s => s.name !== name),
      { name, query, filters }
    ]);
  }, []);

  const deleteSearch = useCallback((name: string) => {
    setSavedSearches(prev => prev.filter(s => s.name !== name));
  }, []);

  // Auto-search when query changes (with debounce)
  React.useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, performSearch]);

  const value: GlobalSearchContextType = {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchFilters,
    setSearchFilters,
    performSearch,
    clearSearch,
    recentSearches,
    addRecentSearch,
    savedSearches,
    saveSearch,
    deleteSearch,
  };

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
};

export default GlobalSearchProvider;