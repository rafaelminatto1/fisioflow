import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { 
  Sidebar, 
  Header, 
  LoginPage,
  LazyWrapper,
  preloadCriticalRoutes,
  preloadUserRoutes,
  usePrefetchRoutes
} from './components/LazyRoutes';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataProvider } from './hooks/useData.minimal';
import { SystemEventsProvider } from './hooks/useSystemEvents';
import { UserRole, Page, Notebook, SubscriptionPlan, Tenant } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { useData } from './hooks/useData.minimal';
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
  IntegrationsPage
} from './components/LazyRoutes';

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

  // Preload otimizado baseado no usuário
  useEffect(() => {
    if (user) {
      preloadUserRoutes(user.role);
      preloadCriticalRoutes();
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
  };

  const handleSelectPage = (pageId: string) => {
    setActiveView('notebook');
    setActivePageId(pageId);
  };

  const breadcrumbs = useMemo(() => {
    const base = [{ name: 'FisioFlow', href: '#' }];
    switch (activeView) {
      case 'home':
        base.push({ name: 'Início', href: '#' });
        break;
      case 'dashboard':
        base.push({ name: 'Dashboard', href: '#' });
        break;
      case 'projects':
        base.push({ name: 'Projetos', href: '#' });
        break;
      case 'patients':
        base.push({ name: 'Pacientes', href: '#' });
        break;
      case 'exercises':
        base.push({ name: 'Exercícios', href: '#' });
        break;
      case 'calendar':
        base.push({ name: 'Agenda', href: '#' });
        break;
      case 'chat':
        base.push({ name: 'Chat', href: '#' });
        break;
      case 'financeiro':
        base.push({ name: 'Financeiro', href: '#' });
        break;
      case 'reports':
        base.push({ name: 'Relatórios', href: '#' });
        break;
      case 'staff':
        base.push({ name: 'Equipe', href: '#' });
        break;
      case 'mentorship':
        base.push({ name: 'Mentoria', href: '#' });
        break;
      case 'clinical-cases':
        base.push({ name: 'Casos Clínicos', href: '#' });
        break;
      case 'clinical-protocols':
        base.push({ name: 'Protocolos Clínicos', href: '#' });
        if (selectedProtocolId) {
          base.push({ name: 'Visualizar Protocolo', href: '#' });
        }
        break;
      case 'patient-protocols':
        base.push({ name: 'Protocolos dos Pacientes', href: '#' });
        break;
      case 'protocol-analytics':
        base.push({ name: 'Analytics de Protocolos', href: '#' });
        break;
      case 'compliance':
        base.push({ name: 'Compliance', href: '#' });
        break;
      case 'billing':
        base.push({ name: 'Faturamento', href: '#' });
        break;
      case 'status':
        base.push({ name: 'Status do Sistema', href: '#' });
        break;
      case 'marketing':
        base.push({ name: 'Marketing', href: '#' });
        break;
      case 'vendas':
        base.push({ name: 'Vendas', href: '#' });
        break;
      case 'suporte':
        base.push({ name: 'Suporte', href: '#' });
        break;
      case 'parcerias':
        base.push({ name: 'Parcerias', href: '#' });
        break;
      case 'operational':
        base.push({ name: 'Gestão Operacional', href: '#' });
        break;
      case 'unified':
        base.push({ name: 'Dashboard 360°', href: '#' });
        break;
      case 'notebook': {
        base.push({ name: 'Notebooks', href: '#' });
        if (activePageId) {
          let foundPage: Page | undefined;
          let foundNotebook: Notebook | undefined;
          for (const notebook of notebooks) {
            const page = notebook.pages.find((p) => p.id === activePageId);
            if (page) {
              foundPage = page;
              foundNotebook = notebook;
              break;
            }
          }
          if (foundNotebook) {
            base.push({ name: foundNotebook.title, href: '#' });
          }
          if (foundPage) {
            base.push({ name: foundPage.title, href: '#' });
          }
        }
        break;
      }
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
    <div className="flex h-screen bg-slate-900 text-slate-50">
      <Sidebar
        activeView={activeView}
        setActiveView={handleSetView}
        handleSelectPage={handleSelectPage}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Header breadcrumbs={breadcrumbs} />
        <div
          key={activeView}
          className="animate-fade-in-up flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6"
        >
          <LazyWrapper>
            {activeView === 'home' && <HomePage />}
            {activeView === 'dashboard' && <Dashboard />}
            {activeView === 'projects' && <KanbanBoard />}
            {activeView === 'patients' && <PatientPage />}
            {activeView === 'exercises' && <ExercisePage />}
            {activeView === 'calendar' && <CalendarPage />}
            {activeView === 'chat' && <ChatPage />}
            {activeView === 'financeiro' && <FinancialPage />}
            {activeView === 'reports' && <ReportsPage />}
            {activeView === 'staff' && <StaffPage />}
            {activeView === 'mentorship' && <MentorshipPage />}
            {activeView === 'clinical-cases' && <ClinicalCasesLibraryPage />}
            {activeView === 'clinical-protocols' && !selectedProtocolId && (
              <ClinicalProtocolsLibraryPage
                onSelectProtocol={setSelectedProtocolId}
              />
            )}
            {activeView === 'clinical-protocols' && selectedProtocolId && (
              <ClinicalProtocolViewerPage
                protocolId={selectedProtocolId}
                onBack={() => setSelectedProtocolId(null)}
              />
            )}
            {activeView === 'patient-protocols' && (
              <PatientProtocolTrackingPage />
            )}
            {activeView === 'protocol-analytics' && <ProtocolAnalyticsPage />}
            {activeView === 'compliance' && <CompliancePage />}
            {activeView === 'billing' && <BillingPage />}
            {activeView === 'status' && <SystemStatusPage />}
            {/* Páginas removidas para otimização - funcionalidade não crítica */}
            {activeView === 'suporte' && <SuportePage />}
            {activeView === 'parcerias' && <ParceriasPage />}
            {activeView === 'operational' && <OperationalDashboard />}
            {activeView === 'unified' && <UnifiedDashboard />}
            {activeView === 'notebook' && activePageId && (
              <NotebookPage pageId={activePageId} />
            )}
          </LazyWrapper>
        </div>
      </main>

      <button
        onClick={() => setIsAIAssistantOpen(true)}
        className="animate-fade-in fixed bottom-6 right-6 z-30 rounded-full bg-blue-600 p-4 text-white shadow-lg transition-transform hover:scale-110 hover:bg-blue-700"
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

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <SystemEventsProvider>
        <DataProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </AuthProvider>
        </DataProvider>
      </SystemEventsProvider>
      <NotificationContainer />
    </NotificationProvider>
  );
};

export default App;
