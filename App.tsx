import React, { useState, useMemo, useEffect, Suspense } from 'react';
import {
  Sidebar,
  Header,
  LoginPage,
  LazyWrapper,
  preloadCriticalRoutes,
  preloadUserRoutes,
  usePrefetchRoutes,
} from './components/LazyRoutes';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataProvider } from './hooks/useData';
// Garantindo que estamos usando a versão completa do useData, não a minimal
import { SystemEventsProvider } from './hooks/useSystemEvents';
import { ChatProvider } from './hooks/useChat';
import { UserRole, Page, Notebook, SubscriptionPlan, Tenant } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { useData } from './hooks/useData';
import { NotificationProvider } from './hooks/useNotification';
import NotificationContainer from './components/NotificationContainer';
import { Bot } from 'lucide-react';
import ClinicOnboardingModal from './components/ClinicOnboardingModal';
import PageLoader from './components/ui/PageLoader';

// Importa componentes lazy do LazyRoutes
import {
  Dashboard,
  KanbanBoard,
  PatientPage,
  NotebookPage,
  PatientPortal,
  CalendarPage,
  ExercisePage,
  FinancialPage,
  ReportsPage,
  StaffPage,
  MentorshipPage,
  ClinicalCasesLibraryPage,
  ClinicalProtocolsLibraryPage,
  ClinicalProtocolViewerPage,
  PatientProtocolTrackingPage,
  ProtocolAnalyticsPage,
  AIAssistant,
  HomePage,
  CompliancePage,
  BillingPage,
  SystemStatusPage,
  ChatPage,
  SuportePage,
  ParceriasPage,
  OperationalDashboard,
  UnifiedDashboard,
  AnalyticsDashboard,
  FinancialSummaryDashboard,
  IntegrationsPage,
} from './components/LazyRoutes';
import SubscriptionMetricsPanel from './components/admin/SubscriptionMetricsPanel';

import { CommandPalette } from './components/ui/CommandPalette';

import OnboardingTour from './components/OnboardingTour';

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const { saveTenant } = useData();
  const [activeView, setActiveView] = useState('home');
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(
    null
  );
  const { notebooks } = useData();
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);

  // Preload otimizado baseado no usuário
  useEffect(() => {
    if (user) {
      preloadUserRoutes(user.role);
      preloadCriticalRoutes();
      // Inicia o tour se for a primeira vez (lógica a ser melhorada com localStorage)
      const hasSeenTour = localStorage.getItem('fisioflow_tour_seen');
      if (!hasSeenTour) {
        setRunTour(true);
        localStorage.setItem('fisioflow_tour_seen', 'true');
      }
    }
  }, [user?.role]);

  // Hook de prefetch inteligente
  usePrefetchRoutes(activeView, user?.role || '');

  useEffect(() => {
    if (user && user.role === UserRole.ADMIN && !user.tenantId) {
      setIsOnboardingOpen(true);
    } else {
      setIsOnboardingOpen(false);
    }
  }, [user]);

  const handleOnboard = (clinicName: string, plan: SubscriptionPlan) => {
    if (!user) return;
    const newTenant: Partial<Tenant> = { name: clinicName, plan };
    saveTenant(newTenant, user);
    // The user object in useAuth will update automatically because useData's users state changes
    // which will cause this component to re-render, and onboarding will close.
  };

  const handleSetView = (view: string) => {
    setActiveView(view);
    if (view !== 'notebook') {
      setActivePageId(null);
    }
    setIsSidebarOpen(false); // Fecha a sidebar ao trocar de view no mobile
  };

  const handleSelectPage = (pageId: string) => {
    setActiveView('notebook');
    setActivePageId(pageId);
    setIsSidebarOpen(false); // Fecha a sidebar ao selecionar página no mobile
  };

  const breadcrumbs = useMemo(() => {
    const base = [{ name: 'FisioFlow', href: '#' }];
    switch (
      activeView
      // ... (cases for breadcrumbs)
    ) {
    }
    return base;
  }, [activeView, activePageId, notebooks]);

  if (!user) {
    return <LoginPage />;
  }

  if (isOnboardingOpen) {
    return (
      <ClinicOnboardingModal
        isOpen={true}
        onOnboard={handleOnboard}
        onClose={logout}
      />
    );
  }

  if (user.role === UserRole.PACIENTE) {
    return (
      <Suspense
        fallback={<PageLoader message="Carregando portal do paciente..." />}
      >
        <PatientPortal />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <OnboardingTour run={runTour} setRun={setRunTour} />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        setIsOpen={setIsCommandPaletteOpen}
      />
      <Sidebar
        activeView={activeView}
        setActiveView={handleSetView}
        handleSelectPage={handleSelectPage}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          breadcrumbs={breadcrumbs}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main
          key={activeView}
          className="flex-1 animate-fade-in-up overflow-y-auto p-4 pb-20 md:p-6 md:pb-6"
        >
          <LazyWrapper>
            {(() => {
              switch (activeView) {
                case 'home':
                  return <HomePage />;
                case 'dashboard':
                  return <Dashboard />;
                case 'projects':
                  return <KanbanBoard />;
                case 'patients':
                  return <PatientPage />;
                case 'calendar':
                  return <CalendarPage />;
                case 'chat':
                  return <ChatPage />;
                case 'financeiro':
                  return <FinancialPage />;
                case 'exercises':
                  return <ExercisePage />;
                case 'reports':
                  return <ReportsPage />;
                case 'mentorship':
                  return <MentorshipPage />;
                case 'clinical-cases':
                  return <ClinicalCasesLibraryPage />;
                case 'clinical-protocols':
                  return <ClinicalProtocolsLibraryPage />;
                case 'protocol-viewer':
                  return (
                    <ClinicalProtocolViewerPage
                      selectedProtocolId={selectedProtocolId}
                    />
                  );
                case 'patient-protocol-tracking':
                  return <PatientProtocolTrackingPage />;
                case 'protocol-analytics':
                  return <ProtocolAnalyticsPage />;
                case 'staff':
                  return <StaffPage />;
                case 'compliance':
                  return <CompliancePage />;
                case 'billing':
                  return <BillingPage />;
                case 'system-status':
                  return <SystemStatusPage />;
                case 'suporte':
                  return <SuportePage />;
                case 'parcerias':
                  return <ParceriasPage />;
                case 'operational-dashboard':
                  return <OperationalDashboard />;
                case 'unified-dashboard':
                  return <UnifiedDashboard />;
                case 'analytics-dashboard':
                  return <AnalyticsDashboard />;
                case 'financial-summary':
                  return <FinancialSummaryDashboard />;
                case 'integrations':
                  return <IntegrationsPage />;
                case 'notebook':
                  return <NotebookPage activePageId={activePageId} />;
                case 'subscription-metrics':
                  return <SubscriptionMetricsPanel />;
                default:
                  return <HomePage />;
              }
            })()}
          </LazyWrapper>
        </main>
      </div>

      <button
        onClick={() => setIsAIAssistantOpen(true)}
        className="animate-fade-in fixed bottom-20 right-6 z-30 rounded-full bg-primary p-4 text-primary-foreground shadow-lg transition-transform hover:scale-110 hover:bg-primary/90 md:bottom-6"
        aria-label="Abrir Assistente IA"
      >
        <Bot size={24} />
      </button>

      <Suspense fallback={null}>
        <AIAssistant
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
        />
      </Suspense>
    </div>
  );
};

import Toaster from './components/ui/Toaster';

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <SystemEventsProvider>
        <DataProvider>
          <AuthProvider>
            <ChatProvider>
              <ErrorBoundary>
                <AppContent />
                <Toaster />
              </ErrorBoundary>
            </ChatProvider>
          </AuthProvider>
        </DataProvider>
      </SystemEventsProvider>
      <NotificationContainer />
    </NotificationProvider>
  );
};

export default App;
