
import React, { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/query-core';
import { useAuth, AuthProvider } from '/hooks/useAuth.js';
import { NotificationProvider } from '/hooks/useNotification.js';
import { useInteractiveCardEffect } from '/hooks/useInteractiveCardEffect.js';
import { useBreadcrumbs } from '/hooks/useBreadcrumbs.js';
import { UserRole } from '/types.js';
import Sidebar from '/components/Sidebar.js';
import Header from '/components/Header.js';
import NotificationContainer from '/components/NotificationContainer.js';
import ErrorBoundary from '/components/ErrorBoundary.js';
import PageLoader from '/components/ui/PageLoader.js';
import PrivacyConsentModal from '/components/PrivacyConsentModal.js';

// Lazy load pages
const LoginPage = lazy(() => import('/components/LoginPage.js'));
const Dashboard = lazy(() => import('/components/Dashboard.js'));
const KanbanBoard = lazy(() => import('/components/KanbanBoard.js'));
const PatientPage = lazy(() => import('/components/PatientPage.js').then(module => ({ default: module.PatientPage })));
const NotebookPage = lazy(() => import('/components/NotebookPage.js'));
const ExercisePage = lazy(() => import('/components/ExercisePage.js'));
const CalendarPage = lazy(() => import('/components/CalendarPage.js'));
const FinancialPage = lazy(() => import('/components/FinancialPage.js'));
const ReportsPage = lazy(() => import('/components/ReportsPage.js'));
const StaffPage = lazy(() => import('/components/StaffPage.js'));
const MentorshipPage = lazy(() => import('/components/MentorshipPage.js'));
const ServicesPage = lazy(() => import('/components/ServicesPage.js'));
const ProtocolsPage = lazy(() => import('/components/ProtocolsPage.js'));
const AssessmentTemplatesPage = lazy(() => import('/components/AssessmentTemplatesPage.js'));
const SessionNoteTemplatesPage = lazy(() => import('/components/SessionNoteTemplatesPage.js'));
const AutomationsPage = lazy(() => import('/components/AutomationsPage.js'));
const FormTemplatesPage = lazy(() => import('/components/FormTemplatesPage.js'));
const PermissionsPage = lazy(() => import('/components/PermissionsPage.js'));
const SettingsPage = lazy(() => import('/components/SettingsPage.js'));
const BackupPage = lazy(() => import('/components/BackupPage.js'));
const PatientPortal = lazy(() => import('/components/PatientPortal.js'));
const NotFoundPage = lazy(() => import('/components/NotFoundPage.js'));

const queryClient = new QueryClient();

const AppContent: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const breadcrumbs = useBreadcrumbs();
    useInteractiveCardEffect([location.pathname]);

    const [hasConsented, setHasConsented] = useState<boolean>(() => 
        localStorage.getItem('fisioflow-consent') === 'true'
    );

    const handleConsent = (choices: { analytics: boolean; communication: boolean }) => {
        localStorage.setItem('fisioflow-consent', 'true');
        localStorage.setItem('fisioflow-consent-choices', JSON.stringify(choices));
        setHasConsented(true);
    };

    const handleGoHome = useCallback(() => {
        logout();
        navigate('/');
    }, [logout, navigate]);

    const roleRoutes = useMemo(() => {
        if (!user) return null;

        switch (user.role) {
            case UserRole.ADMIN:
            case UserRole.FISIOTERAPEUTA:
            case UserRole.ESTAGIARIO:
                return (
                    <div className="flex h-screen bg-slate-950">
                        <Sidebar />
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <Header breadcrumbs={breadcrumbs} />
                            <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                                 <ErrorBoundary onGoHome={handleGoHome}>
                                    <Suspense fallback={<PageLoader />}>
                                        <Routes>
                                            <Route path="/" element={<Dashboard />} />
                                            <Route path="/projects" element={<KanbanBoard />} />
                                            <Route path="/patients" element={<PatientPage />} />
                                            <Route path="/patients/:patientId" element={<PatientPage />} />
                                            <Route path="/notebook/:pageId" element={<NotebookPage />} />
                                            <Route path="/exercises" element={<ExercisePage />} />
                                            <Route path="/calendar" element={<CalendarPage />} />
                                            <Route path="/financeiro" element={<FinancialPage />} />
                                            <Route path="/reports" element={<ReportsPage />} />
                                            <Route path="/mentorship" element={<MentorshipPage />} />
                                            <Route path="/settings/services" element={<ServicesPage />} />
                                            <Route path="/settings/protocols" element={<ProtocolsPage />} />
                                            <Route path="/settings/assessment-templates" element={<AssessmentTemplatesPage />} />
                                            <Route path="/settings/session-note-templates" element={<SessionNoteTemplatesPage />} />
                                            <Route path="/settings/staff" element={<StaffPage />} />
                                            <Route path="/settings/permissions" element={<PermissionsPage />} />
                                            <Route path="/settings/automations" element={<AutomationsPage />} />
                                            <Route path="/settings/forms" element={<FormTemplatesPage />} />
                                            <Route path="/settings/clinic" element={<SettingsPage />} />
                                            <Route path="/settings/backup" element={<BackupPage />} />
                                            <Route path="*" element={<NotFoundPage />} />
                                        </Routes>
                                    </Suspense>
                                </ErrorBoundary>
                            </main>
                        </div>
                    </div>
                );
            case UserRole.PACIENTE:
                return (
                     <ErrorBoundary onGoHome={handleGoHome}>
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                <Route path="/" element={<PatientPortal />} />
                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </Suspense>
                     </ErrorBoundary>
                );
            default:
                return <LoginPage />;
        }
    }, [user, breadcrumbs, handleGoHome]);

    if (!user) {
        return <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>;
    }
    
    if (!hasConsented && (user.role === UserRole.ADMIN || user.role === UserRole.FISIOTERAPEUTA)) {
        return <PrivacyConsentModal onConfirm={handleConsent} />;
    }

    return roleRoutes;
};

const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <NotificationProvider>
                 <BrowserRouter>
                    <AuthProvider>
                        <AppContent/>
                    </AuthProvider>
                </BrowserRouter>
                <NotificationContainer />
            </NotificationProvider>
        </QueryClientProvider>
    );
};

export default App;