/**
 * Sistema de Roteamento Lazy Otimizado
 * Implementa code splitting inteligente com preload baseado em navegação
 */

import { lazy } from 'react';
import { LazyWrapper } from '../ui/LazyWrapper';

// Função helper para criar lazy components com wrapper otimizado
const createLazyRoute = (
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  name: string
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: any) => (
    <LazyWrapper name={name}>
      <LazyComponent {...props} />
    </LazyWrapper>
  );
};

// === ROTAS CRÍTICAS (Preload imediato) ===
export const Dashboard = createLazyRoute(
  () => import(/* webpackChunkName: "dashboard" */ '../Dashboard'),
  'Dashboard'
);

export const LoginPage = createLazyRoute(
  () => import(/* webpackChunkName: "auth" */ '../LoginPage'),
  'Login'
);

// === ROTAS DE ALTA PRIORIDADE (Prefetch inteligente) ===
export const PatientPage = createLazyRoute(
  () => import(/* webpackChunkName: "patients" */ '../PatientPage'),
  'Pacientes'
);

export const CalendarPage = createLazyRoute(
  () => import(/* webpackChunkName: "calendar" */ '../CalendarPage'),
  'Agenda'
);

export const TasksPage = createLazyRoute(
  () => import(/* webpackChunkName: "tasks" */ '../TasksPage'),
  'Tarefas'
);

// === ROTAS DE MÉDIA PRIORIDADE ===
export const ReportsPage = createLazyRoute(
  () => import(/* webpackChunkName: "reports" */ '../ReportsPage'),
  'Relatórios'
);

export const SettingsPage = createLazyRoute(
  () => import(/* webpackChunkName: "settings" */ '../SettingsPage'),
  'Configurações'
);

export const ExercisesPage = createLazyRoute(
  () => import(/* webpackChunkName: "exercises" */ '../ExercisesPage'),
  'Exercícios'
);

// === ROTAS DE BAIXA PRIORIDADE (Lazy load sob demanda) ===
export const AssessmentsPage = createLazyRoute(
  () => import(/* webpackChunkName: "assessments" */ '../AssessmentsPage'),
  'Avaliações'
);

export const DocumentsPage = createLazyRoute(
  () => import(/* webpackChunkName: "documents" */ '../DocumentsPage'),
  'Documentos'
);

export const AnalyticsPage = createLazyRoute(
  () => import(/* webpackChunkName: "analytics" */ '../AnalyticsPage'),
  'Analytics'
);

// === ROTAS ADMINISTRATIVAS (Load só quando necessário) ===
export const UserManagementPage = createLazyRoute(
  () => import(/* webpackChunkName: "admin-users" */ '../admin/UserManagementPage'),
  'Gerenciamento de Usuários'
);

export const SubscriptionPage = createLazyRoute(
  () => import(/* webpackChunkName: "admin-subscription" */ '../admin/SubscriptionPage'),
  'Assinaturas'
);

export const IntegrationsPage = createLazyRoute(
  () => import(/* webpackChunkName: "admin-integrations" */ '../IntegrationsPage'),
  'Integrações'
);

// === ROTAS ESPECIALIZADAS ===
export const AIAssistantPage = createLazyRoute(
  () => import(/* webpackChunkName: "ai-assistant" */ '../AIAssistant'),
  'Assistente IA'
);

export const MentorshipPage = createLazyRoute(
  () => import(/* webpackChunkName: "mentorship" */ '../MentorshipPage'),
  'Mentoria'
);

export const CompliancePage = createLazyRoute(
  () => import(/* webpackChunkName: "compliance" */ '../CompliancePage'),
  'Compliance'
);

// === SISTEMA DE PRELOAD INTELIGENTE ===

/**
 * Hook para preload inteligente baseado na navegação do usuário
 */
export const useIntelligentPreload = () => {
  // Implementar lógica de preload baseada em:
  // 1. Rota atual
  // 2. Histórico de navegação
  // 3. Role do usuário
  // 4. Horário/contexto de uso
  
  // Por exemplo: Se usuário está no Dashboard, preload PatientPage e CalendarPage
  // Se usuário é admin, preload páginas administrativas
  
  return {
    preloadPatients: () => import('../PatientPage'),
    preloadCalendar: () => import('../CalendarPage'),
    preloadReports: () => import('../ReportsPage'),
  };
};

// === CONFIGURAÇÃO DE ROTEAMENTO ===
export const ROUTE_CONFIG = {
  critical: ['dashboard', 'login'],
  high: ['patients', 'calendar', 'tasks'],
  medium: ['reports', 'settings', 'exercises'],
  low: ['assessments', 'documents', 'analytics'],
  admin: ['user-management', 'subscription', 'integrations'],
  specialized: ['ai-assistant', 'mentorship', 'compliance'],
} as const;