import { useMemo } from 'react';

import { SubscriptionPlan } from '../types';

import { useAuth } from './useAuth';
import { useData } from './useData';

export interface PlanLimits {
  therapists: number;
  patients: number;
  appointments: number;
  aiFeatures: boolean;
  advancedReports: boolean;
  apiAccess: boolean;
  storage: number; // in GB
  supportLevel: 'basic' | 'priority' | 'premium';
}

export interface UsageStats {
  therapists: number;
  patients: number;
  appointments: number;
  storage: number;
}

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    therapists: 1,
    patients: 10,
    appointments: 50,
    aiFeatures: false,
    advancedReports: false,
    apiAccess: false,
    storage: 1,
    supportLevel: 'basic',
  },
  silver: {
    therapists: 3,
    patients: 50,
    appointments: 200,
    aiFeatures: false,
    advancedReports: true,
    apiAccess: false,
    storage: 5,
    supportLevel: 'basic',
  },
  gold: {
    therapists: 10,
    patients: 200,
    appointments: 1000,
    aiFeatures: true,
    advancedReports: true,
    apiAccess: true,
    storage: 20,
    supportLevel: 'priority',
  },
  platinum: {
    therapists: -1, // unlimited
    patients: -1, // unlimited
    appointments: -1, // unlimited
    aiFeatures: true,
    advancedReports: true,
    apiAccess: true,
    storage: 100,
    supportLevel: 'premium',
  },
};

export const useSubscriptionLimits = () => {
  const { user } = useAuth();
  const { tenants, users, patients, appointments } = useData();

  const currentTenant = useMemo(() => {
    if (!user?.tenantId) return null;
    return tenants.find((t) => t.id === user.tenantId) || null;
  }, [user?.tenantId, tenants]);

  const currentPlan = currentTenant?.plan || 'free';
  const limits = PLAN_LIMITS[currentPlan];

  const usage = useMemo((): UsageStats => {
    if (!user?.tenantId) {
      return { therapists: 0, patients: 0, appointments: 0, storage: 0 };
    }

    const tenantUsers = users.filter((u) => u.tenantId === user.tenantId);
    const tenantPatients = patients.filter((p) => p.tenantId === user.tenantId);
    const tenantAppointments = appointments.filter(
      (a) => a.tenantId === user.tenantId
    );

    // Calculate therapists (excluding patients)
    const therapistCount = tenantUsers.filter(
      (u) => u.role !== 'paciente'
    ).length;

    // Estimate storage usage (simplified calculation)
    const estimatedStorage = Math.ceil(
      tenantPatients.length * 0.1 + tenantAppointments.length * 0.01
    );

    return {
      therapists: therapistCount,
      patients: tenantPatients.length,
      appointments: tenantAppointments.length,
      storage: estimatedStorage,
    };
  }, [user?.tenantId, users, patients, appointments]);

  const checkLimit = (
    resource: keyof UsageStats
  ): { allowed: boolean; usage: number; limit: number; percentage: number } => {
    const limit = limits[resource] as number;
    const currentUsage = usage[resource];

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, usage: currentUsage, limit: -1, percentage: 0 };
    }

    const percentage = (currentUsage / limit) * 100;
    return {
      allowed: currentUsage < limit,
      usage: currentUsage,
      limit,
      percentage: Math.min(percentage, 100),
    };
  };

  const checkFeature = (
    feature: keyof Omit<
      PlanLimits,
      'therapists' | 'patients' | 'appointments' | 'storage' | 'supportLevel'
    >
  ): boolean => {
    return limits[feature] as boolean;
  };

  const getUpgradeRecommendation = (): SubscriptionPlan | null => {
    if (currentPlan === 'platinum') return null;

    // Check if any limit is exceeded or close to being exceeded (>80%)
    const therapistCheck = checkLimit('therapists');
    const patientCheck = checkLimit('patients');
    const appointmentCheck = checkLimit('appointments');
    const storageCheck = checkLimit('storage');

    const needsUpgrade = [
      therapistCheck,
      patientCheck,
      appointmentCheck,
      storageCheck,
    ].some((check) => !check.allowed || check.percentage > 80);

    if (!needsUpgrade) return null;

    // Recommend next tier
    const planOrder: SubscriptionPlan[] = [
      'free',
      'silver',
      'gold',
      'platinum',
    ];
    const currentIndex = planOrder.indexOf(currentPlan);
    return planOrder[currentIndex + 1] || 'platinum';
  };

  const getPaywallContext = (): {
    shouldShow: boolean;
    reason: string;
    blockedResource: keyof UsageStats | string;
    recommendedPlan: SubscriptionPlan | null;
  } => {
    // Check each resource limit
    const therapistCheck = checkLimit('therapists');
    if (!therapistCheck.allowed) {
      return {
        shouldShow: true,
        reason: `Você atingiu o limite de ${therapistCheck.limit} fisioterapeutas para o plano ${currentPlan.toUpperCase()}.`,
        blockedResource: 'therapists',
        recommendedPlan: getUpgradeRecommendation(),
      };
    }

    const patientCheck = checkLimit('patients');
    if (!patientCheck.allowed) {
      return {
        shouldShow: true,
        reason: `Você atingiu o limite de ${patientCheck.limit} pacientes para o plano ${currentPlan.toUpperCase()}.`,
        blockedResource: 'patients',
        recommendedPlan: getUpgradeRecommendation(),
      };
    }

    const appointmentCheck = checkLimit('appointments');
    if (!appointmentCheck.allowed) {
      return {
        shouldShow: true,
        reason: `Você atingiu o limite de ${appointmentCheck.limit} agendamentos para o plano ${currentPlan.toUpperCase()}.`,
        blockedResource: 'appointments',
        recommendedPlan: getUpgradeRecommendation(),
      };
    }

    // Check AI features
    if (!checkFeature('aiFeatures')) {
      return {
        shouldShow: true,
        reason: `Recursos de IA estão disponíveis apenas nos planos Gold e Platinum.`,
        blockedResource: 'aiFeatures',
        recommendedPlan: 'gold',
      };
    }

    // Check advanced reports
    if (!checkFeature('advancedReports')) {
      return {
        shouldShow: true,
        reason: `Relatórios avançados estão disponíveis a partir do plano Silver.`,
        blockedResource: 'advancedReports',
        recommendedPlan: 'silver',
      };
    }

    return {
      shouldShow: false,
      reason: '',
      blockedResource: '',
      recommendedPlan: null,
    };
  };

  return {
    currentPlan,
    limits,
    usage,
    checkLimit,
    checkFeature,
    getUpgradeRecommendation,
    getPaywallContext,
    isUnlimited: currentPlan === 'platinum',
  };
};

export default useSubscriptionLimits;
