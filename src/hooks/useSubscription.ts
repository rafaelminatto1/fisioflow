import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';

import type { SubscriptionPlan, PaymentMethod } from '../types';

import { useAuth } from './useAuth';

// ============================================================================
// TIPOS E SCHEMAS
// ============================================================================

export type SubscriptionTier = 'free' | 'premium' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'trialing';

// Planos de assinatura
export interface SubscriptionPlanDetails {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  features: string[];
  limits: {
    maxPatients: number;
    maxSessions: number;
    maxUsers: number;
    maxStorage: number; // em MB
    aiRequestsPerMonth: number;
  };
  pricing: {
    monthly: number;
    yearly: number;
    yearlyDiscount: number; // porcentagem
  };
  isPopular?: boolean;
  isEnterprise?: boolean;
}

// Assinatura atual
export interface CurrentSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  paymentMethodId?: string;
  lastPayment?: {
    id: string;
    amount: number;
    status: PaymentStatus;
    date: Date;
  };
  nextPayment?: {
    amount: number;
    date: Date;
  };
  usage: {
    patients: number;
    sessions: number;
    users: number;
    storage: number;
    aiRequests: number;
  };
}

// Histórico de pagamentos
export interface PaymentHistory {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  date: Date;
  invoiceUrl?: string;
  description: string;
}

// Dados para upgrade
export interface UpgradeData {
  planId: string;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
  promoCode?: string;
}

// Schema de validação
const UpgradeSchema = z.object({
  planId: z.string().min(1, 'Plano é obrigatório'),
  billingCycle: z.enum(['monthly', 'yearly']),
  paymentMethodId: z.string().optional(),
  promoCode: z.string().optional(),
});

// ============================================================================
// CONFIGURAÇÕES E DADOS
// ============================================================================

// Planos disponíveis
const SUBSCRIPTION_PLANS: SubscriptionPlanDetails[] = [
  {
    id: 'free',
    tier: 'free',
    name: 'Gratuito',
    description: 'Ideal para fisioterapeutas iniciantes',
    features: [
      'Até 10 pacientes',
      'Até 50 sessões/mês',
      '100MB de armazenamento',
      '10 consultas IA/mês',
      'Relatórios básicos',
      'Suporte por email',
    ],
    limits: {
      maxPatients: 10,
      maxSessions: 50,
      maxUsers: 1,
      maxStorage: 100,
      aiRequestsPerMonth: 10,
    },
    pricing: {
      monthly: 0,
      yearly: 0,
      yearlyDiscount: 0,
    },
  },
  {
    id: 'premium',
    tier: 'premium',
    name: 'Premium',
    description: 'Para clínicas em crescimento',
    features: [
      'Até 100 pacientes',
      'Até 1000 sessões/mês',
      '1GB de armazenamento',
      '100 consultas IA/mês',
      'Relatórios avançados',
      'Analytics detalhados',
      'Integração WhatsApp',
      'Suporte prioritário',
      'Backup automático',
    ],
    limits: {
      maxPatients: 100,
      maxSessions: 1000,
      maxUsers: 5,
      maxStorage: 1000,
      aiRequestsPerMonth: 100,
    },
    pricing: {
      monthly: 97,
      yearly: 970,
      yearlyDiscount: 17, // 2 meses grátis
    },
    isPopular: true,
  },
  {
    id: 'enterprise',
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'Para grandes clínicas e redes',
    features: [
      'Pacientes ilimitados',
      'Sessões ilimitadas',
      'Armazenamento ilimitado',
      'IA ilimitada',
      'Relatórios customizados',
      'API completa',
      'Multi-clínicas',
      'Suporte 24/7',
      'Treinamento personalizado',
      'Compliance LGPD',
    ],
    limits: {
      maxPatients: -1,
      maxSessions: -1,
      maxUsers: -1,
      maxStorage: -1,
      aiRequestsPerMonth: -1,
    },
    pricing: {
      monthly: 297,
      yearly: 2970,
      yearlyDiscount: 17,
    },
    isEnterprise: true,
  },
];

// ============================================================================
// SIMULAÇÃO DE API (substituir por chamadas reais)
// ============================================================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data
let mockSubscription: CurrentSubscription | null = null;
const mockPaymentHistory: PaymentHistory[] = [];

const subscriptionApi = {
  // Buscar assinatura atual
  getCurrentSubscription: async (userId: string): Promise<CurrentSubscription | null> => {
    await delay(500);
    
    if (!mockSubscription) {
      // Criar assinatura free padrão
      mockSubscription = {
        id: 'sub_free_' + userId,
        userId,
        planId: 'free',
        tier: 'free',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        usage: {
          patients: 3,
          sessions: 12,
          users: 1,
          storage: 25,
          aiRequests: 2,
        },
      };
    }
    
    return mockSubscription;
  },
  
  // Buscar planos disponíveis
  getAvailablePlans: async (): Promise<SubscriptionPlanDetails[]> => {
    await delay(300);
    return SUBSCRIPTION_PLANS;
  },
  
  // Fazer upgrade
  upgradeSubscription: async (userId: string, data: UpgradeData): Promise<CurrentSubscription> => {
    await delay(1500); // Simular processamento de pagamento
    
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === data.planId);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }
    
    // Simular falha de pagamento ocasional
    if (Math.random() < 0.1) {
      throw new Error('Falha no processamento do pagamento. Tente novamente.');
    }
    
    const now = new Date();
    const periodEnd = new Date(now);
    if (data.billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    
    mockSubscription = {
      id: 'sub_' + plan.tier + '_' + userId,
      userId,
      planId: data.planId,
      tier: plan.tier,
      status: 'active',
      billingCycle: data.billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      paymentMethodId: data.paymentMethodId,
      lastPayment: {
        id: 'pay_' + Date.now(),
        amount: data.billingCycle === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly,
        status: 'completed',
        date: now,
      },
      nextPayment: {
        amount: data.billingCycle === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly,
        date: periodEnd,
      },
      usage: mockSubscription?.usage || {
        patients: 0,
        sessions: 0,
        users: 1,
        storage: 0,
        aiRequests: 0,
      },
    };
    
    // Adicionar ao histórico
    mockPaymentHistory.unshift({
      id: 'pay_' + Date.now(),
      subscriptionId: mockSubscription.id,
      amount: mockSubscription.lastPayment.amount,
      currency: 'BRL',
      status: 'completed',
      paymentMethod: 'Cartão de Crédito',
      date: now,
      description: `Assinatura ${plan.name} - ${data.billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`,
    });
    
    return mockSubscription;
  },
  
  // Cancelar assinatura
  cancelSubscription: async (subscriptionId: string, immediate: boolean = false): Promise<CurrentSubscription> => {
    await delay(800);
    
    if (!mockSubscription || mockSubscription.id !== subscriptionId) {
      throw new Error('Assinatura não encontrada');
    }
    
    if (immediate) {
      mockSubscription.status = 'cancelled';
      mockSubscription.currentPeriodEnd = new Date();
    } else {
      mockSubscription.cancelAtPeriodEnd = true;
    }
    
    return mockSubscription;
  },
  
  // Reativar assinatura
  reactivateSubscription: async (subscriptionId: string): Promise<CurrentSubscription> => {
    await delay(600);
    
    if (!mockSubscription || mockSubscription.id !== subscriptionId) {
      throw new Error('Assinatura não encontrada');
    }
    
    mockSubscription.cancelAtPeriodEnd = false;
    mockSubscription.status = 'active';
    
    return mockSubscription;
  },
  
  // Buscar histórico de pagamentos
  getPaymentHistory: async (userId: string): Promise<PaymentHistory[]> => {
    await delay(400);
    return mockPaymentHistory.filter(p => p.subscriptionId.includes(userId));
  },
  
  // Atualizar método de pagamento
  updatePaymentMethod: async (subscriptionId: string, paymentMethodId: string): Promise<void> => {
    await delay(500);
    
    if (mockSubscription && mockSubscription.id === subscriptionId) {
      mockSubscription.paymentMethodId = paymentMethodId;
    }
  },
  
  // Aplicar código promocional
  applyPromoCode: async (code: string): Promise<{ discount: number; description: string }> => {
    await delay(300);
    
    const promoCodes: Record<string, { discount: number; description: string }> = {
      'FISIO2024': { discount: 20, description: '20% de desconto no primeiro mês' },
      'PREMIUM50': { discount: 50, description: '50% de desconto no plano Premium' },
      'ANUAL15': { discount: 15, description: '15% de desconto adicional no plano anual' },
    };
    
    const promo = promoCodes[code.toUpperCase()];
    if (!promo) {
      throw new Error('Código promocional inválido');
    }
    
    return promo;
  },
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useSubscription = () => {
  const { user, tier, upgradeToTier } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');
  
  // Query para assinatura atual
  const subscriptionQuery = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => user ? subscriptionApi.getCurrentSubscription(user.id) : null,
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
  
  // Query para planos disponíveis
  const plansQuery = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.getAvailablePlans,
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
  
  // Query para histórico de pagamentos
  const paymentHistoryQuery = useQuery({
    queryKey: ['payment-history', user?.id],
    queryFn: () => user ? subscriptionApi.getPaymentHistory(user.id) : [],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  
  // Mutation para upgrade
  const upgradeMutation = useMutation({
    mutationFn: (data: UpgradeData) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const validatedData = UpgradeSchema.parse(data);
      return subscriptionApi.upgradeSubscription(user.id, validatedData);
    },
    onSuccess: (updatedSubscription) => {
      // Atualizar cache da assinatura
      queryClient.setQueryData(['subscription', user?.id], updatedSubscription);
      
      // Atualizar tier no auth
      upgradeToTier(updatedSubscription.tier);
      
      // Invalidar histórico de pagamentos
      queryClient.invalidateQueries({ queryKey: ['payment-history', user?.id] });
      
      // Invalidar outras queries que dependem do tier
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
  
  // Mutation para cancelamento
  const cancelMutation = useMutation({
    mutationFn: ({ subscriptionId, immediate }: { subscriptionId: string; immediate?: boolean }) => {
      return subscriptionApi.cancelSubscription(subscriptionId, immediate);
    },
    onSuccess: (updatedSubscription) => {
      queryClient.setQueryData(['subscription', user?.id], updatedSubscription);
    },
  });
  
  // Mutation para reativação
  const reactivateMutation = useMutation({
    mutationFn: (subscriptionId: string) => {
      return subscriptionApi.reactivateSubscription(subscriptionId);
    },
    onSuccess: (updatedSubscription) => {
      queryClient.setQueryData(['subscription', user?.id], updatedSubscription);
    },
  });
  
  // Mutation para atualizar método de pagamento
  const updatePaymentMethodMutation = useMutation({
    mutationFn: ({ subscriptionId, paymentMethodId }: { subscriptionId: string; paymentMethodId: string }) => {
      return subscriptionApi.updatePaymentMethod(subscriptionId, paymentMethodId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
    },
  });
  
  // Mutation para aplicar código promocional
  const applyPromoCodeMutation = useMutation({
    mutationFn: subscriptionApi.applyPromoCode,
  });
  
  // Funções auxiliares
  const getCurrentPlan = useCallback(() => {
    if (!subscriptionQuery.data || !plansQuery.data) return null;
    return plansQuery.data.find(plan => plan.id === subscriptionQuery.data?.planId) || null;
  }, [subscriptionQuery.data, plansQuery.data]);
  
  const canUpgrade = useCallback((targetTier: SubscriptionTier) => {
    const currentTier = tier;
    const tierOrder = { free: 0, premium: 1, enterprise: 2 };
    return tierOrder[targetTier] > tierOrder[currentTier];
  }, [tier]);
  
  const canDowngrade = useCallback((targetTier: SubscriptionTier) => {
    const currentTier = tier;
    const tierOrder = { free: 0, premium: 1, enterprise: 2 };
    return tierOrder[targetTier] < tierOrder[currentTier];
  }, [tier]);
  
  const getUsagePercentage = useCallback((resource: keyof CurrentSubscription['usage']) => {
    const subscription = subscriptionQuery.data;
    const currentPlan = getCurrentPlan();
    
    if (!subscription || !currentPlan) return 0;
    
    const usage = subscription.usage[resource];
    const limit = currentPlan.limits[resource === 'aiRequests' ? 'aiRequestsPerMonth' : resource];
    
    if (limit === -1) return 0; // Ilimitado
    return Math.min((usage / limit) * 100, 100);
  }, [subscriptionQuery.data, getCurrentPlan]);
  
  const isNearLimit = useCallback((resource: keyof CurrentSubscription['usage'], threshold: number = 80) => {
    return getUsagePercentage(resource) >= threshold;
  }, [getUsagePercentage]);
  
  const getDaysUntilRenewal = useCallback(() => {
    const subscription = subscriptionQuery.data;
    if (!subscription) return 0;
    
    const now = new Date();
    const renewalDate = new Date(subscription.currentPeriodEnd);
    const diffTime = renewalDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [subscriptionQuery.data]);
  
  const calculateSavings = useCallback((planId: string, cycle: BillingCycle) => {
    const plan = plansQuery.data?.find(p => p.id === planId);
    if (!plan || cycle === 'monthly') return 0;
    
    const monthlyTotal = plan.pricing.monthly * 12;
    const yearlyPrice = plan.pricing.yearly;
    return monthlyTotal - yearlyPrice;
  }, [plansQuery.data]);
  
  return {
    // Dados
    subscription: subscriptionQuery.data,
    plans: plansQuery.data || [],
    paymentHistory: paymentHistoryQuery.data || [],
    currentPlan: getCurrentPlan(),
    
    // Estados de loading
    isLoading: subscriptionQuery.isLoading,
    isLoadingPlans: plansQuery.isLoading,
    isLoadingHistory: paymentHistoryQuery.isLoading,
    
    // Mutations
    upgrade: upgradeMutation.mutate,
    cancel: cancelMutation.mutate,
    reactivate: reactivateMutation.mutate,
    updatePaymentMethod: updatePaymentMethodMutation.mutate,
    applyPromoCode: applyPromoCodeMutation.mutate,
    
    // Estados das mutations
    isUpgrading: upgradeMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isReactivating: reactivateMutation.isPending,
    isUpdatingPayment: updatePaymentMethodMutation.isPending,
    isApplyingPromo: applyPromoCodeMutation.isPending,
    
    // Erros
    upgradeError: upgradeMutation.error,
    cancelError: cancelMutation.error,
    promoError: applyPromoCodeMutation.error,
    
    // Dados do promo code
    promoData: applyPromoCodeMutation.data,
    
    // Seleção de plano
    selectedPlan,
    setSelectedPlan,
    selectedCycle,
    setSelectedCycle,
    
    // Funções utilitárias
    canUpgrade,
    canDowngrade,
    getUsagePercentage,
    isNearLimit,
    getDaysUntilRenewal,
    calculateSavings,
    
    // Funções de refetch
    refetchSubscription: subscriptionQuery.refetch,
    refetchHistory: paymentHistoryQuery.refetch,
  };
};

// ============================================================================
// HOOKS AUXILIARES
// ============================================================================

// Hook para verificar limites
export const useSubscriptionLimits = () => {
  const { subscription, currentPlan, getUsagePercentage, isNearLimit } = useSubscription();
  
  const checkLimit = useCallback((resource: keyof CurrentSubscription['usage'], amount: number = 1) => {
    if (!subscription || !currentPlan) return false;
    
    const limit = currentPlan.limits[resource === 'aiRequests' ? 'aiRequestsPerMonth' : resource];
    if (limit === -1) return true; // Ilimitado
    
    const currentUsage = subscription.usage[resource];
    return (currentUsage + amount) <= limit;
  }, [subscription, currentPlan]);
  
  const getRemainingUsage = useCallback((resource: keyof CurrentSubscription['usage']) => {
    if (!subscription || !currentPlan) return 0;
    
    const limit = currentPlan.limits[resource === 'aiRequests' ? 'aiRequestsPerMonth' : resource];
    if (limit === -1) return Infinity;
    
    const currentUsage = subscription.usage[resource];
    return Math.max(0, limit - currentUsage);
  }, [subscription, currentPlan]);
  
  return {
    checkLimit,
    getRemainingUsage,
    getUsagePercentage,
    isNearLimit,
    limits: currentPlan?.limits,
    usage: subscription?.usage,
  };
};

// Hook para notificações de billing
export const useBillingNotifications = () => {
  const { subscription, getDaysUntilRenewal, isNearLimit } = useSubscription();
  
  const shouldShowRenewalReminder = getDaysUntilRenewal() <= 7 && getDaysUntilRenewal() > 0;
  const shouldShowUsageWarning = isNearLimit('patients') || isNearLimit('sessions') || isNearLimit('aiRequests');
  const shouldShowCancellationNotice = subscription?.cancelAtPeriodEnd;
  
  return {
    shouldShowRenewalReminder,
    shouldShowUsageWarning,
    shouldShowCancellationNotice,
    daysUntilRenewal: getDaysUntilRenewal(),
  };
};

export default useSubscription;
