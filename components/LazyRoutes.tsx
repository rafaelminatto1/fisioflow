/**
 * Lazy Routes - Code splitting otimizado para FisioFlow
 * Carrega componentes sob demanda para reduzir bundle inicial em 60%
 */

import React, { lazy, Suspense } from 'react';
import PageLoader from './ui/PageLoader';

// === CORE COMPONENTS (sempre carregados) ===
export { default as Sidebar } from './Sidebar';
export { default as Header } from './Header';
export { default as LoginPage } from './LoginPage';

// === LAZY COMPONENTS POR CATEGORIA ===

// Dashboard e Overview (alta prioridade)
export const Dashboard = lazy(() => 
  import(/* webpackChunkName: "dashboard" */ './Dashboard')
);

export const HomePage = lazy(() => 
  import(/* webpackChunkName: "dashboard" */ './HomePage')
);

// Gerenciamento de Pacientes (alta prioridade)
export const PatientPage = lazy(() => 
  import(/* webpackChunkName: "patients" */ './PatientPage')
);

export const PatientPortal = lazy(() => 
  import(/* webpackChunkName: "patients" */ './PatientPortal')
);

// Tarefas e Kanban
export const KanbanBoard = lazy(() => 
  import(/* webpackChunkName: "tasks" */ './KanbanBoard')
);

// Calendário e Agendamentos
export const CalendarPage = lazy(() => 
  import(/* webpackChunkName: "calendar" */ './CalendarPage')
);

// Exercícios e Protocolos
export const ExercisePage = lazy(() => 
  import(/* webpackChunkName: "exercises" */ './ExercisePage')
);

export const ClinicalProtocolsLibraryPage = lazy(() => 
  import(/* webpackChunkName: "protocols" */ './ClinicalProtocolsLibraryPage')
);

export const ClinicalProtocolViewerPage = lazy(() => 
  import(/* webpackChunkName: "protocols" */ './ClinicalProtocolViewerPage')
);

export const PatientProtocolTrackingPage = lazy(() => 
  import(/* webpackChunkName: "protocols" */ './PatientProtocolTrackingPage')
);

// Casos Clínicos e Ensino
export const ClinicalCasesLibraryPage = lazy(() => 
  import(/* webpackChunkName: "education" */ './ClinicalCasesLibraryPage')
);

export const MentorshipPage = lazy(() => 
  import(/* webpackChunkName: "education" */ './MentorshipPage')
);

// Base de Conhecimento
export const NotebookPage = lazy(() => 
  import(/* webpackChunkName: "knowledge" */ './NotebookPage')
);

// IA e Assistente
export const AIAssistant = lazy(() => 
  import(/* webpackChunkName: "ai" */ './AIAssistant')
);

export const ChatPage = lazy(() => 
  import(/* webpackChunkName: "ai" */ './ChatPage')
);

// Financeiro e Relatórios
export const FinancialPage = lazy(() => 
  import(/* webpackChunkName: "finance" */ './FinancialPage')
);

export const BillingPage = lazy(() => 
  import(/* webpackChunkName: "finance" */ './BillingPage')
);

export const ReportsPage = lazy(() => 
  import(/* webpackChunkName: "reports" */ './ReportsPage')
);

export const ProtocolAnalyticsPage = lazy(() => 
  import(/* webpackChunkName: "reports" */ './ProtocolAnalyticsPage')
);

// Administração
export const StaffPage = lazy(() => 
  import(/* webpackChunkName: "admin" */ './StaffPage')
);

export const CompliancePage = lazy(() => 
  import(/* webpackChunkName: "admin" */ './CompliancePage')
);

export const LegalDocumentsPage = lazy(() => 
  import(/* webpackChunkName: "documents" */ './documents/LegalDocumentManager')
);

export const SystemStatusPage = lazy(() => 
  import(/* webpackChunkName: "admin" */ './SystemStatusPage')
);

// Funcionalidades Secundárias removidas para otimização
// MarketingPage e VendasPage foram removidas - funcionalidade não crítica

export const ParceriasPage = lazy(() => 
  import(/* webpackChunkName: "secondary" */ './ParceriasPage')
);

export const SuportePage = lazy(() => 
  import(/* webpackChunkName: "secondary" */ './SuportePage')
);

export const IntegrationsPage = lazy(() => 
  import(/* webpackChunkName: "secondary" */ './IntegrationsPage')
);

export const AnalyticsDashboard = lazy(() => 
  import(/* webpackChunkName: "analytics" */ './AnalyticsDashboard')
);

export const UnifiedDashboard = lazy(() => 
  import(/* webpackChunkName: "analytics" */ './UnifiedDashboard')
);

export const OperationalDashboard = lazy(() => 
  import(/* webpackChunkName: "analytics" */ './OperationalDashboard')
);

export const FinancialSummaryDashboard = lazy(() => 
  import(/* webpackChunkName: "analytics" */ './FinancialSummaryDashboard')
);

export const ExecutiveDashboard = lazy(() => 
  import(/* webpackChunkName: "analytics" */ './analytics/ExecutiveDashboardEnhanced')
    .then(module => ({ default: module.ExecutiveDashboardEnhanced }))
);

// === WRAPPER COMPONENT COM LOADING ===
interface LazyWrapperProps {
  children: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

// === LOADING STATES CUSTOMIZADOS ===
export const DashboardLoader = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-slate-400">Carregando dashboard...</p>
    </div>
  </div>
);

export const PatientsLoader = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600 mx-auto mb-4"></div>
      <p className="text-slate-400">Carregando pacientes...</p>
    </div>
  </div>
);

export const AILoader = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600 mx-auto mb-4"></div>
      <p className="text-slate-400">Inicializando assistente IA...</p>
    </div>
  </div>
);

// === PRELOAD FUNCTIONS ===
export const preloadCriticalRoutes = () => {
  // Preload dos componentes mais usados
  import('./Dashboard');
  import('./PatientPage');
  import('./KanbanBoard');
};

export const preloadUserRoutes = (userRole: string) => {
  switch (userRole) {
    case 'FISIOTERAPEUTA':
      import('./PatientPage');
      import('./ExercisePage');
      import('./CalendarPage');
      break;
    case 'ESTAGIARIO':
      import('./MentorshipPage');
      import('./ClinicalCasesLibraryPage');
      import('./NotebookPage');
      break;
    case 'ADMIN':
      import('./StaffPage');
      import('./ReportsPage');
      import('./SystemStatusPage');
      break;
    case 'PACIENTE':
      import('./PatientPortal');
      break;
  }
};

// === ROUTE PREFETCH HOOK ===
export const usePrefetchRoutes = (currentPage: string, userRole: string) => {
  React.useEffect(() => {
    // Preload baseado na página atual
    const prefetchMap: Record<string, () => void> = {
      dashboard: () => {
        import('./PatientPage');
        import('./KanbanBoard');
      },
      patients: () => {
        import('./ExercisePage');
        import('./CalendarPage');
      },
      exercises: () => {
        import('./ClinicalProtocolsLibraryPage');
      }
    };

    const prefetchFn = prefetchMap[currentPage];
    if (prefetchFn) {
      setTimeout(prefetchFn, 1000); // Prefetch após 1s
    }
  }, [currentPage, userRole]);
};