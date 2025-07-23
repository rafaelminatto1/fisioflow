import React, { createContext, useContext, ReactNode } from 'react';
import { SubscriptionPlan } from '../types';
import { useAuth } from './useAuth';
import { useData } from './useData.minimal';
import useSubscriptionLimits from './useSubscriptionLimits';

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  requiredPlan: SubscriptionPlan;
  category: 'core' | 'ai' | 'analytics' | 'integrations' | 'advanced';
  betaFeature?: boolean;
  deprecatedFeature?: boolean;
}

interface FeatureFlagsContextType {
  isFeatureEnabled: (featureKey: string) => boolean;
  getFeatureFlag: (featureKey: string) => FeatureFlag | undefined;
  getAllFeatures: () => FeatureFlag[];
  getFeaturesByCategory: (category: string) => FeatureFlag[];
  canAccessFeature: (featureKey: string) => {
    canAccess: boolean;
    reason?: string;
    requiredPlan?: SubscriptionPlan;
  };
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(
  undefined
);

// Define all feature flags with their requirements
const FEATURE_FLAGS: FeatureFlag[] = [
  // Core Features
  {
    key: 'patient_management',
    name: 'Gestão de Pacientes',
    description: 'Cadastro e gerenciamento de pacientes',
    enabled: true,
    requiredPlan: 'free',
    category: 'core',
  },
  {
    key: 'appointment_scheduling',
    name: 'Agendamento',
    description: 'Sistema de agendamento de consultas',
    enabled: true,
    requiredPlan: 'free',
    category: 'core',
  },
  {
    key: 'exercise_prescription',
    name: 'Prescrição de Exercícios',
    description: 'Criação e prescrição de exercícios',
    enabled: true,
    requiredPlan: 'free',
    category: 'core',
  },
  {
    key: 'basic_reports',
    name: 'Relatórios Básicos',
    description: 'Relatórios básicos de pacientes e consultas',
    enabled: true,
    requiredPlan: 'free',
    category: 'core',
  },
  {
    key: 'chat_messaging',
    name: 'Chat e Mensagens',
    description: 'Sistema de chat interno',
    enabled: true,
    requiredPlan: 'free',
    category: 'core',
  },

  // Advanced Features
  {
    key: 'advanced_reports',
    name: 'Relatórios Avançados',
    description: 'Relatórios detalhados com métricas avançadas',
    enabled: true,
    requiredPlan: 'silver',
    category: 'analytics',
  },
  {
    key: 'multi_therapist',
    name: 'Múltiplos Fisioterapeutas',
    description: 'Suporte para múltiplos fisioterapeutas',
    enabled: true,
    requiredPlan: 'silver',
    category: 'core',
  },
  {
    key: 'custom_templates',
    name: 'Templates Personalizados',
    description: 'Criação de templates personalizados',
    enabled: true,
    requiredPlan: 'silver',
    category: 'advanced',
  },
  {
    key: 'bulk_operations',
    name: 'Operações em Lote',
    description: 'Operações em massa para pacientes e agendamentos',
    enabled: true,
    requiredPlan: 'silver',
    category: 'advanced',
  },

  // AI Features
  {
    key: 'ai_exercise_recommendation',
    name: 'IA - Recomendação de Exercícios',
    description: 'Recomendações inteligentes de exercícios baseadas em IA',
    enabled: true,
    requiredPlan: 'gold',
    category: 'ai',
  },
  {
    key: 'ai_treatment_analysis',
    name: 'IA - Análise de Tratamento',
    description: 'Análise preditiva de resultados de tratamento',
    enabled: true,
    requiredPlan: 'gold',
    category: 'ai',
  },
  {
    key: 'ai_risk_assessment',
    name: 'IA - Avaliação de Risco',
    description: 'Avaliação de risco de abandono de tratamento',
    enabled: true,
    requiredPlan: 'gold',
    category: 'ai',
  },
  {
    key: 'ai_posture_analysis',
    name: 'IA - Análise de Postura',
    description: 'Análise de postura através de visão computacional',
    enabled: true,
    requiredPlan: 'gold',
    category: 'ai',
    betaFeature: true,
  },

  // Analytics Features
  {
    key: 'business_intelligence',
    name: 'Business Intelligence',
    description: 'Dashboards executivos e métricas de negócio',
    enabled: true,
    requiredPlan: 'gold',
    category: 'analytics',
  },
  {
    key: 'predictive_analytics',
    name: 'Analytics Preditivo',
    description: 'Análises preditivas e forecasting',
    enabled: true,
    requiredPlan: 'gold',
    category: 'analytics',
  },
  {
    key: 'custom_dashboards',
    name: 'Dashboards Personalizados',
    description: 'Criação de dashboards personalizados',
    enabled: true,
    requiredPlan: 'gold',
    category: 'analytics',
  },

  // Integration Features
  {
    key: 'api_access',
    name: 'Acesso à API',
    description: 'Acesso completo à API REST',
    enabled: true,
    requiredPlan: 'gold',
    category: 'integrations',
  },
  {
    key: 'webhook_support',
    name: 'Suporte a Webhooks',
    description: 'Configuração de webhooks para integrações',
    enabled: true,
    requiredPlan: 'gold',
    category: 'integrations',
  },
  {
    key: 'third_party_integrations',
    name: 'Integrações Terceiros',
    description: 'Integrações com sistemas externos',
    enabled: true,
    requiredPlan: 'gold',
    category: 'integrations',
  },

  // Premium Features
  {
    key: 'white_label',
    name: 'White Label',
    description: 'Personalização completa da marca',
    enabled: true,
    requiredPlan: 'platinum',
    category: 'advanced',
  },
  {
    key: 'advanced_security',
    name: 'Segurança Avançada',
    description: 'Recursos avançados de segurança e compliance',
    enabled: true,
    requiredPlan: 'platinum',
    category: 'advanced',
  },
  {
    key: 'dedicated_support',
    name: 'Suporte Dedicado',
    description: 'Suporte técnico dedicado 24/7',
    enabled: true,
    requiredPlan: 'platinum',
    category: 'advanced',
  },
  {
    key: 'custom_development',
    name: 'Desenvolvimento Personalizado',
    description: 'Desenvolvimento de funcionalidades personalizadas',
    enabled: true,
    requiredPlan: 'platinum',
    category: 'advanced',
  },
  {
    key: 'enterprise_sso',
    name: 'SSO Empresarial',
    description: 'Single Sign-On para empresas',
    enabled: true,
    requiredPlan: 'platinum',
    category: 'integrations',
  },

  // Beta Features
  {
    key: 'mobile_app_sync',
    name: 'Sincronização App Mobile',
    description: 'Sincronização com aplicativo móvel',
    enabled: true,
    requiredPlan: 'silver',
    category: 'core',
    betaFeature: true,
  },
  {
    key: 'voice_commands',
    name: 'Comandos de Voz',
    description: 'Controle por comandos de voz',
    enabled: false,
    requiredPlan: 'gold',
    category: 'ai',
    betaFeature: true,
  },
  {
    key: 'ar_exercise_guide',
    name: 'Guia de Exercícios AR',
    description: 'Guias de exercícios em realidade aumentada',
    enabled: false,
    requiredPlan: 'platinum',
    category: 'ai',
    betaFeature: true,
  },
];

interface FeatureFlagsProviderProps {
  children: ReactNode;
}

export const FeatureFlagsProvider: React.FC<FeatureFlagsProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const { tenants } = useData();
  const { currentPlan } = useSubscriptionLimits();

  const currentTenant = tenants.find((t) => t.id === user?.tenantId);
  const userPlan = currentTenant?.plan || 'free';

  const getPlanLevel = (plan: SubscriptionPlan): number => {
    const levels = { free: 0, silver: 1, gold: 2, platinum: 3 };
    return levels[plan] || 0;
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    const feature = FEATURE_FLAGS.find((f) => f.key === featureKey);
    if (!feature) return false;

    // Check if feature is globally enabled
    if (!feature.enabled) return false;

    // Check if user's plan meets the requirement
    const userPlanLevel = getPlanLevel(userPlan);
    const requiredPlanLevel = getPlanLevel(feature.requiredPlan);

    return userPlanLevel >= requiredPlanLevel;
  };

  const getFeatureFlag = (featureKey: string): FeatureFlag | undefined => {
    return FEATURE_FLAGS.find((f) => f.key === featureKey);
  };

  const getAllFeatures = (): FeatureFlag[] => {
    return FEATURE_FLAGS;
  };

  const getFeaturesByCategory = (category: string): FeatureFlag[] => {
    return FEATURE_FLAGS.filter((f) => f.category === category);
  };

  const canAccessFeature = (
    featureKey: string
  ): {
    canAccess: boolean;
    reason?: string;
    requiredPlan?: SubscriptionPlan;
  } => {
    const feature = FEATURE_FLAGS.find((f) => f.key === featureKey);

    if (!feature) {
      return {
        canAccess: false,
        reason: 'Funcionalidade não encontrada',
      };
    }

    if (!feature.enabled) {
      return {
        canAccess: false,
        reason: 'Funcionalidade desabilitada',
      };
    }

    const userPlanLevel = getPlanLevel(userPlan);
    const requiredPlanLevel = getPlanLevel(feature.requiredPlan);

    if (userPlanLevel < requiredPlanLevel) {
      return {
        canAccess: false,
        reason: `Requer plano ${feature.requiredPlan.toUpperCase()} ou superior`,
        requiredPlan: feature.requiredPlan,
      };
    }

    if (feature.betaFeature) {
      return {
        canAccess: true,
        reason: 'Funcionalidade em beta',
      };
    }

    if (feature.deprecatedFeature) {
      return {
        canAccess: true,
        reason: 'Funcionalidade será descontinuada',
      };
    }

    return { canAccess: true };
  };

  const value: FeatureFlagsContextType = {
    isFeatureEnabled,
    getFeatureFlag,
    getAllFeatures,
    getFeaturesByCategory,
    canAccessFeature,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = (): FeatureFlagsContextType => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error(
      'useFeatureFlags must be used within a FeatureFlagsProvider'
    );
  }
  return context;
};

// Higher-order component for feature gating
interface WithFeatureGateProps {
  featureKey: string;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  children: ReactNode;
}

export const WithFeatureGate: React.FC<WithFeatureGateProps> = ({
  featureKey,
  fallback = null,
  showUpgradePrompt = false,
  children,
}) => {
  const { isFeatureEnabled, canAccessFeature } = useFeatureFlags();

  const canAccess = canAccessFeature(featureKey);

  if (!isFeatureEnabled(featureKey)) {
    if (showUpgradePrompt && !canAccess.canAccess && canAccess.requiredPlan) {
      return (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Recurso Premium</h3>
              <p className="text-sm text-slate-400">{canAccess.reason}</p>
            </div>
          </div>
          <button className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
            Fazer Upgrade
          </button>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for conditional rendering based on features
export const useConditionalFeature = (featureKey: string) => {
  const { isFeatureEnabled, canAccessFeature } = useFeatureFlags();

  return {
    isEnabled: isFeatureEnabled(featureKey),
    canAccess: canAccessFeature(featureKey),
  };
};

export default useFeatureFlags;
export type { FeatureFlag, FeatureFlagsContextType };
