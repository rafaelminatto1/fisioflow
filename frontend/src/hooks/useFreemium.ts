/**
 * Hook personalizado para gerenciamento do sistema Freemium
 * 
 * Este hook fornece funcionalidades para verificar limites de tier,
 * validar permissões, rastrear uso e gerenciar upgrades.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { api } from '../services/api';
import { toast } from 'react-toastify';

export type TierType = 'free' | 'premium' | 'enterprise';

export interface TierLimits {
  interns: number;
  cases: number;
  resources: number;
  sessions: number;
  storage_bytes: number;
  ai_requests: number;
  video_sessions: number;
  custom_competencies: number;
  export_reports: boolean;
  priority_support: boolean;
  white_label: boolean;
  advanced_analytics: boolean;
}

export interface UsageMetrics {
  user_id: string;
  tier: TierType;
  period_start: string;
  period_end: string;
  interns_count: number;
  cases_count: number;
  resources_count: number;
  sessions_count: number;
  storage_used: number;
  ai_requests_count: number;
  video_sessions_count: number;
  custom_competencies_count: number;
}

export interface TierValidation {
  is_valid: boolean;
  upgrade_required: boolean;
  exceeded_limits: string[];
  recommendations: string[];
  usage_percentage: Record<string, number>;
}

export interface UpgradeRecommendation {
  current_tier: TierType;
  suggested_tier: TierType;
  benefits: string[];
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
    discount_percentage?: number;
  };
  trial_available: boolean;
}

export interface FreemiumState {
  currentTier: TierType;
  limits: TierLimits;
  usage: UsageMetrics | null;
  validation: TierValidation | null;
  recommendations: UpgradeRecommendation | null;
  loading: boolean;
  error: string | null;
}

export interface FreemiumActions {
  checkLimits: () => Promise<void>;
  canPerformAction: (action: string, params?: any) => Promise<boolean>;
  trackUsage: (action: string, metadata?: any) => Promise<void>;
  getUpgradeRecommendations: () => Promise<void>;
  simulateUpgrade: (targetTier: TierType) => Promise<any>;
  processUpgrade: (targetTier: TierType, paymentData: any) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const TIER_LIMITS: Record<TierType, TierLimits> = {
  free: {
    interns: 5,
    cases: 10,
    resources: 20,
    sessions: 5,
    storage_bytes: 1073741824, // 1GB
    ai_requests: 50,
    video_sessions: 2,
    custom_competencies: 0,
    export_reports: false,
    priority_support: false,
    white_label: false,
    advanced_analytics: false,
  },
  premium: {
    interns: 50,
    cases: 100,
    resources: -1, // Ilimitado
    sessions: 50,
    storage_bytes: 10737418240, // 10GB
    ai_requests: 500,
    video_sessions: 25,
    custom_competencies: 10,
    export_reports: true,
    priority_support: true,
    white_label: false,
    advanced_analytics: true,
  },
  enterprise: {
    interns: -1, // Ilimitado
    cases: -1, // Ilimitado
    resources: -1, // Ilimitado
    sessions: -1, // Ilimitado
    storage_bytes: 107374182400, // 100GB
    ai_requests: -1, // Ilimitado
    video_sessions: -1, // Ilimitado
    custom_competencies: -1, // Ilimitado
    export_reports: true,
    priority_support: true,
    white_label: true,
    advanced_analytics: true,
  },
};

const TIER_PRICING = {
  free: { monthly: 0, yearly: 0, currency: 'BRL' },
  premium: { monthly: 49.90, yearly: 499.00, currency: 'BRL' },
  enterprise: { monthly: 199.90, yearly: 1999.00, currency: 'BRL' },
};

export function useFreemium(): FreemiumState & FreemiumActions {
  const { user } = useAuth();
  
  const [state, setState] = useState<FreemiumState>({
    currentTier: 'free',
    limits: TIER_LIMITS.free,
    usage: null,
    validation: null,
    recommendations: null,
    loading: false,
    error: null,
  });

  // Inicializa o tier do usuário
  useEffect(() => {
    if (user?.tier) {
      setState(prev => ({
        ...prev,
        currentTier: user.tier as TierType,
        limits: TIER_LIMITS[user.tier as TierType],
      }));
    }
  }, [user]);

  // Carrega dados iniciais
  useEffect(() => {
    if (user?.id) {
      refreshData();
    }
  }, [user?.id]);

  const checkLimits = useCallback(async () => {
    if (!user?.id) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await api.get(`/mentorship/freemium/validate-limits/${user.id}`);
      
      setState(prev => ({
        ...prev,
        validation: response.data,
        loading: false,
      }));
      
      // Mostra alertas se necessário
      if (!response.data.is_valid) {
        toast.warning(
          'Alguns limites do seu plano foram excedidos. Considere fazer upgrade.',
          { toastId: 'tier-limits-exceeded' }
        );
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Erro ao verificar limites',
        loading: false,
      }));
    }
  }, [user?.id]);

  const canPerformAction = useCallback(async (
    action: string,
    params?: any
  ): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const response = await api.post(`/mentorship/freemium/can-perform-action`, {
        user_id: user.id,
        action,
        ...params,
      });
      
      if (!response.data.allowed) {
        toast.error(response.data.message || 'Ação não permitida para seu plano atual');
        
        // Se é um limite de tier, mostra recomendações
        if (response.data.upgrade_required) {
          await getUpgradeRecommendations();
        }
      }
      
      return response.data.allowed;
    } catch (error: any) {
      toast.error('Erro ao verificar permissões');
      return false;
    }
  }, [user?.id]);

  const trackUsage = useCallback(async (
    action: string,
    metadata?: any
  ): Promise<void> => {
    if (!user?.id) return;
    
    try {
      await api.post('/mentorship/freemium/track-usage', {
        user_id: user.id,
        action,
        metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Falha silenciosa para tracking
      console.warn('Falha ao rastrear uso:', error);
    }
  }, [user?.id]);

  const getUpgradeRecommendations = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await api.get(`/mentorship/freemium/upgrade-recommendations/${user.id}`);
      
      setState(prev => ({
        ...prev,
        recommendations: response.data,
      }));
    } catch (error: any) {
      console.error('Erro ao obter recomendações:', error);
    }
  }, [user?.id]);

  const simulateUpgrade = useCallback(async (targetTier: TierType) => {
    if (!user?.id) return null;
    
    try {
      const response = await api.post('/mentorship/freemium/simulate-upgrade', {
        user_id: user.id,
        target_tier: targetTier,
      });
      
      return response.data;
    } catch (error: any) {
      toast.error('Erro ao simular upgrade');
      return null;
    }
  }, [user?.id]);

  const processUpgrade = useCallback(async (
    targetTier: TierType,
    paymentData: any
  ): Promise<boolean> => {
    if (!user?.id) return false;
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await api.post('/mentorship/freemium/process-upgrade', {
        user_id: user.id,
        target_tier: targetTier,
        payment_data: paymentData,
      });
      
      if (response.data.success) {
        // Atualiza o tier local
        setState(prev => ({
          ...prev,
          currentTier: targetTier,
          limits: TIER_LIMITS[targetTier],
          loading: false,
        }));
        
        toast.success('Upgrade realizado com sucesso!');
        
        // Recarrega dados
        await refreshData();
        
        return true;
      } else {
        toast.error(response.data.message || 'Falha no upgrade');
        return false;
      }
    } catch (error: any) {
      toast.error('Erro ao processar upgrade');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [user?.id]);

  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Carrega métricas de uso
      const usageResponse = await api.get(`/mentorship/freemium/usage-metrics/${user.id}`);
      
      setState(prev => ({
        ...prev,
        usage: usageResponse.data,
        loading: false,
      }));
      
      // Verifica limites automaticamente
      await checkLimits();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Erro ao carregar dados',
        loading: false,
      }));
    }
  }, [user?.id, checkLimits]);

  // Computed values
  const isFeatureAvailable = useCallback((feature: keyof TierLimits): boolean => {
    const limit = state.limits[feature];
    return typeof limit === 'boolean' ? limit : limit !== 0;
  }, [state.limits]);

  const getUsagePercentage = useCallback((metric: keyof UsageMetrics): number => {
    if (!state.usage) return 0;
    
    const used = state.usage[metric] as number;
    const limit = state.limits[metric as keyof TierLimits] as number;
    
    if (limit === -1) return 0; // Ilimitado
    if (limit === 0) return 100; // Não permitido
    
    return Math.min((used / limit) * 100, 100);
  }, [state.usage, state.limits]);

  const isNearLimit = useCallback((metric: keyof UsageMetrics, threshold = 80): boolean => {
    return getUsagePercentage(metric) >= threshold;
  }, [getUsagePercentage]);

  const canUpgrade = useMemo(() => {
    return state.currentTier !== 'enterprise';
  }, [state.currentTier]);

  const nextTier = useMemo((): TierType | null => {
    switch (state.currentTier) {
      case 'free': return 'premium';
      case 'premium': return 'enterprise';
      case 'enterprise': return null;
      default: return null;
    }
  }, [state.currentTier]);

  const tierBenefits = useMemo(() => {
    const benefits = {
      free: [
        '5 estagiários',
        '10 casos clínicos',
        '20 recursos educacionais',
        '1GB de armazenamento',
        'Suporte básico'
      ],
      premium: [
        '50 estagiários',
        '100 casos clínicos',
        'Recursos ilimitados',
        '10GB de armazenamento',
        'Exportação de relatórios',
        'Suporte prioritário',
        'Analytics avançados'
      ],
      enterprise: [
        'Estagiários ilimitados',
        'Casos ilimitados',
        'Recursos ilimitados',
        '100GB de armazenamento',
        'White label',
        'Suporte dedicado',
        'Integrações personalizadas'
      ]
    };
    
    return benefits[state.currentTier];
  }, [state.currentTier]);

  return {
    // State
    ...state,
    
    // Actions
    checkLimits,
    canPerformAction,
    trackUsage,
    getUpgradeRecommendations,
    simulateUpgrade,
    processUpgrade,
    refreshData,
    
    // Computed values
    isFeatureAvailable,
    getUsagePercentage,
    isNearLimit,
    canUpgrade,
    nextTier,
    tierBenefits,
  };
}

// Hook para componentes que precisam verificar tier mínimo
export function useRequireTier(requiredTier: TierType) {
  const { currentTier, canUpgrade, nextTier, getUpgradeRecommendations } = useFreemium();
  
  const tierOrder = { free: 0, premium: 1, enterprise: 2 };
  const hasAccess = tierOrder[currentTier] >= tierOrder[requiredTier];
  
  const requestUpgrade = useCallback(async () => {
    if (!hasAccess) {
      await getUpgradeRecommendations();
      toast.info(`Esta funcionalidade requer o plano ${requiredTier.toUpperCase()}`);
    }
  }, [hasAccess, requiredTier, getUpgradeRecommendations]);
  
  return {
    hasAccess,
    currentTier,
    requiredTier,
    canUpgrade,
    nextTier,
    requestUpgrade,
  };
}

// Hook para rastreamento automático de uso
export function useUsageTracking() {
  const { trackUsage } = useFreemium();
  
  const track = useCallback((action: string, metadata?: any) => {
    trackUsage(action, {
      ...metadata,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  }, [trackUsage]);
  
  return { track };
}

export default useFreemium;