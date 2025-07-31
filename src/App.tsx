import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { ProductionErrorFallback } from './components/ProductionErrorFallback';
import { errorMonitoring } from './utils/errorMonitoring';
import { useAuth, AuthProvider } from './hooks/useAuthSimple';
import { DataProvider } from '../hooks/useData';
import './index.css';

// Lazy loading dos componentes principais
const Dashboard = lazy(() => import('../components/Dashboard'));
const LoginPage = lazy(() => import('../components/LoginPage'));
const PatientPage = lazy(() => import('../components/PatientPage'));
const CalendarPage = lazy(() => import('../components/CalendarPage'));
const ReportsPage = lazy(() => import('../components/ReportsPage'));
const SubscriptionManager = lazy(
  () => import('../components/SubscriptionManager')
);

// Componente de Loading
const LoadingSpinner: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-500"></div>
  </div>
);

// Componente de Rota Protegida
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTier?: 'free' | 'premium' | 'enterprise';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredTier = 'free',
}) => {
  const { user, isAuthenticated, tier } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar se o usuário tem o tier necessário
  const tierLevels = { free: 0, premium: 1, enterprise: 2 };
  const userLevel = tierLevels[tier];
  const requiredLevel = tierLevels[requiredTier];

  if (userLevel < requiredLevel) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};

// Componente principal da aplicação
const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <ErrorBoundary
          fallback={import.meta.env.PROD ? <ProductionErrorFallback /> : undefined}
          onError={(error, errorInfo) => {
            // Reportar erro para o sistema de monitoramento
            errorMonitoring.reportError({
              message: error.message,
              stack: error.stack,
              severity: 'critical',
              context: {
                componentStack: errorInfo.componentStack,
                type: 'react-error-boundary'
              }
            });
          }}
        >
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Rota pública */}
                  <Route path="/login" element={<LoginPage />} />

                  {/* Rotas protegidas - Free tier */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patients"
                    element={
                      <ProtectedRoute>
                        <PatientPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/appointments"
                    element={
                      <ProtectedRoute>
                        <CalendarPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rotas protegidas - Premium tier */}
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute requiredTier="premium">
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rotas de configuração */}
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SubscriptionManager />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/subscription"
                    element={
                      <ProtectedRoute>
                        <SubscriptionManager />
                      </ProtectedRoute>
                    }
                  />

                  {/* Redirect padrão */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </Suspense>
            </div>
          </Router>
        </ErrorBoundary>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
