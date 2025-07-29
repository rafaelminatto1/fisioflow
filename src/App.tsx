import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth, AuthProvider } from './hooks/useAuthSimple';
import './index.css';

// Lazy loading dos componentes principais
const Dashboard = React.lazy(() => import('../components/Dashboard'));
const LoginPage = React.lazy(() => import('../components/LoginPage'));
const PatientPage = React.lazy(() => import('../components/PatientPage'));
const CalendarPage = React.lazy(() => import('../components/CalendarPage'));
const ReportsPage = React.lazy(() => import('../components/ReportsPage'));
const SubscriptionManager = React.lazy(() => import('../components/SubscriptionManager'));

// Configuração do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Componente de Loading
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
  </div>
);

// Componente de Rota Protegida
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTier?: 'free' | 'premium' | 'enterprise';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredTier = 'free' 
}) => {
  const { user, isAuthenticated, tier, checkLimit } = useAuth();

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
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
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </div>
          </Router>
        </ErrorBoundary>
        
        {/* React Query DevTools apenas em desenvolvimento */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;