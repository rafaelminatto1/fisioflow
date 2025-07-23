import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { SubscriptionPlan } from '../types';
import { useAuth } from './useAuth';
import { useData } from './useData.minimal';
import { useNotification } from './useNotification';
import useStripe from './useStripe';

interface TrialInfo {
  isActive: boolean;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  hasExpired: boolean;
  canExtend: boolean;
  extensionsUsed: number;
  maxExtensions: number;
}

interface TrialManagerContextType {
  trialInfo: TrialInfo | null;
  startTrial: (
    plan: SubscriptionPlan,
    durationDays?: number
  ) => Promise<boolean>;
  extendTrial: (additionalDays: number) => Promise<boolean>;
  cancelTrial: () => Promise<boolean>;
  convertToSubscription: (plan: SubscriptionPlan) => Promise<boolean>;
  checkTrialStatus: () => void;
  getTrialNotifications: () => TrialNotification[];
}

interface TrialNotification {
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface TrialData {
  id: string;
  tenantId: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  isActive: boolean;
  extensionsUsed: number;
  maxExtensions: number;
  createdAt: string;
  convertedAt?: string;
  canceledAt?: string;
}

const TrialManagerContext = createContext<TrialManagerContextType | undefined>(
  undefined
);

// Trial durations by plan (in days)
const TRIAL_DURATIONS: Record<SubscriptionPlan, number> = {
  free: 0, // Free plan doesn't have trials
  silver: 14,
  gold: 14,
  platinum: 7, // Shorter trial for premium plan
};

// Maximum extensions allowed per plan
const MAX_EXTENSIONS: Record<SubscriptionPlan, number> = {
  free: 0,
  silver: 1,
  gold: 2,
  platinum: 1,
};

interface TrialManagerProviderProps {
  children: ReactNode;
}

export const TrialManagerProvider: React.FC<TrialManagerProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const { tenants, saveTenant, saveAuditLog } = useData();
  const { addNotification } = useNotification();
  const { createSubscription, createCustomer } = useStripe();

  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [trials, setTrials] = useState<TrialData[]>([]);

  const currentTenant = tenants.find((t) => t.id === user?.tenantId);

  // Load trials from localStorage on mount
  useEffect(() => {
    const savedTrials = localStorage.getItem('fisioflow_trials');
    if (savedTrials) {
      try {
        setTrials(JSON.parse(savedTrials));
      } catch (error) {
        console.error('Error loading trials:', error);
      }
    }
  }, []);

  // Save trials to localStorage whenever trials change
  useEffect(() => {
    localStorage.setItem('fisioflow_trials', JSON.stringify(trials));
  }, [trials]);

  // Update trial info when user or trials change
  useEffect(() => {
    if (user?.tenantId) {
      updateTrialInfo();
    }
  }, [user?.tenantId, trials]);

  // Check trial status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      checkTrialStatus();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const updateTrialInfo = () => {
    if (!user?.tenantId) {
      setTrialInfo(null);
      return;
    }

    const activeTrial = trials.find(
      (t) =>
        t.tenantId === user.tenantId &&
        t.isActive &&
        !t.convertedAt &&
        !t.canceledAt
    );

    if (!activeTrial) {
      setTrialInfo(null);
      return;
    }

    const now = new Date();
    const endDate = new Date(activeTrial.endDate);
    const daysRemaining = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const hasExpired = now > endDate;
    const canExtend =
      activeTrial.extensionsUsed < activeTrial.maxExtensions && !hasExpired;

    setTrialInfo({
      isActive: activeTrial.isActive && !hasExpired,
      plan: activeTrial.plan,
      startDate: activeTrial.startDate,
      endDate: activeTrial.endDate,
      daysRemaining: Math.max(0, daysRemaining),
      hasExpired,
      canExtend,
      extensionsUsed: activeTrial.extensionsUsed,
      maxExtensions: activeTrial.maxExtensions,
    });
  };

  const startTrial = async (
    plan: SubscriptionPlan,
    durationDays?: number
  ): Promise<boolean> => {
    if (!user || !currentTenant || plan === 'free') {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Não é possível iniciar trial para o plano gratuito.',
      });
      return false;
    }

    // Check if user already has an active trial
    const existingTrial = trials.find(
      (t) =>
        t.tenantId === user.tenantId &&
        t.isActive &&
        !t.convertedAt &&
        !t.canceledAt
    );

    if (existingTrial) {
      addNotification({
        type: 'error',
        title: 'Trial Ativo',
        message: 'Você já possui um trial ativo.',
      });
      return false;
    }

    // Check if user has already used a trial for this plan
    const previousTrial = trials.find(
      (t) => t.tenantId === user.tenantId && t.plan === plan
    );

    if (previousTrial) {
      addNotification({
        type: 'error',
        title: 'Trial Já Utilizado',
        message: `Você já utilizou o trial do plano ${plan.toUpperCase()}.`,
      });
      return false;
    }

    try {
      const duration = durationDays || TRIAL_DURATIONS[plan];
      const startDate = new Date();
      const endDate = new Date(
        startDate.getTime() + duration * 24 * 60 * 60 * 1000
      );

      const newTrial: TrialData = {
        id: `trial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId: user.tenantId,
        plan,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive: true,
        extensionsUsed: 0,
        maxExtensions: MAX_EXTENSIONS[plan],
        createdAt: new Date().toISOString(),
      };

      // Update tenant plan to trial plan
      const updatedTenant = {
        ...currentTenant,
        plan,
        trialEndDate: endDate.toISOString(),
      };

      setTrials((prev) => [...prev, newTrial]);
      saveTenant(updatedTenant, user);

      // Log the trial start
      saveAuditLog(
        {
          action: 'billing_trial_started',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            trialId: newTrial.id,
            plan,
            duration,
            endDate: endDate.toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'success',
        title: 'Trial Iniciado!',
        message: `Seu trial do plano ${plan.toUpperCase()} foi iniciado com sucesso. Você tem ${duration} dias para testar.`,
      });

      return true;
    } catch (error) {
      console.error('Error starting trial:', error);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível iniciar o trial. Tente novamente.',
      });
      return false;
    }
  };

  const extendTrial = async (additionalDays: number): Promise<boolean> => {
    if (!user || !trialInfo || !trialInfo.canExtend) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Não é possível estender este trial.',
      });
      return false;
    }

    try {
      const updatedTrials = trials.map((trial) => {
        if (trial.tenantId === user.tenantId && trial.isActive) {
          const newEndDate = new Date(trial.endDate);
          newEndDate.setDate(newEndDate.getDate() + additionalDays);

          return {
            ...trial,
            endDate: newEndDate.toISOString(),
            extensionsUsed: trial.extensionsUsed + 1,
          };
        }
        return trial;
      });

      setTrials(updatedTrials);

      // Log the trial extension
      saveAuditLog(
        {
          action: 'billing_trial_extended',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            additionalDays,
            newEndDate: updatedTrials.find(
              (t) => t.tenantId === user.tenantId && t.isActive
            )?.endDate,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'success',
        title: 'Trial Estendido!',
        message: `Seu trial foi estendido por ${additionalDays} dias.`,
      });

      return true;
    } catch (error) {
      console.error('Error extending trial:', error);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível estender o trial. Tente novamente.',
      });
      return false;
    }
  };

  const cancelTrial = async (): Promise<boolean> => {
    if (!user || !trialInfo) {
      return false;
    }

    try {
      const updatedTrials = trials.map((trial) => {
        if (trial.tenantId === user.tenantId && trial.isActive) {
          return {
            ...trial,
            isActive: false,
            canceledAt: new Date().toISOString(),
          };
        }
        return trial;
      });

      setTrials(updatedTrials);

      // Revert tenant to free plan
      if (currentTenant) {
        const updatedTenant = {
          ...currentTenant,
          plan: 'free' as SubscriptionPlan,
          trialEndDate: undefined,
        };
        saveTenant(updatedTenant, user);
      }

      // Log the trial cancellation
      saveAuditLog(
        {
          action: 'billing_trial_canceled',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            plan: trialInfo.plan,
            daysRemaining: trialInfo.daysRemaining,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'info',
        title: 'Trial Cancelado',
        message:
          'Seu trial foi cancelado. Você foi movido para o plano gratuito.',
      });

      return true;
    } catch (error) {
      console.error('Error canceling trial:', error);
      return false;
    }
  };

  const convertToSubscription = async (
    plan: SubscriptionPlan
  ): Promise<boolean> => {
    if (!user || !currentTenant || !trialInfo) {
      return false;
    }

    try {
      // Create Stripe customer if needed
      const customer = await createCustomer({
        email: user.email,
        name: user.name,
        phone: user.phone,
      });

      if (!customer) {
        throw new Error('Failed to create customer');
      }

      // Create subscription (this would use actual Stripe price IDs)
      const subscription = await createSubscription(
        customer.id,
        `price_${plan}_monthly`
      );

      if (!subscription) {
        throw new Error('Failed to create subscription');
      }

      // Mark trial as converted
      const updatedTrials = trials.map((trial) => {
        if (trial.tenantId === user.tenantId && trial.isActive) {
          return {
            ...trial,
            isActive: false,
            convertedAt: new Date().toISOString(),
          };
        }
        return trial;
      });

      setTrials(updatedTrials);

      // Update tenant with subscription info
      const updatedTenant = {
        ...currentTenant,
        plan,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        trialEndDate: undefined,
      };
      saveTenant(updatedTenant, user);

      // Log the conversion
      saveAuditLog(
        {
          action: 'billing_trial_converted',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            fromPlan: trialInfo.plan,
            toPlan: plan,
            subscriptionId: subscription.id,
            customerId: customer.id,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'success',
        title: 'Assinatura Ativada!',
        message: `Parabéns! Sua assinatura do plano ${plan.toUpperCase()} foi ativada com sucesso.`,
      });

      return true;
    } catch (error) {
      console.error('Error converting trial:', error);
      addNotification({
        type: 'error',
        title: 'Erro na Conversão',
        message:
          'Não foi possível converter o trial em assinatura. Tente novamente.',
      });
      return false;
    }
  };

  const checkTrialStatus = () => {
    if (!trialInfo || !user) return;

    const now = new Date();
    const endDate = new Date(trialInfo.endDate);

    // Check if trial has expired
    if (now > endDate && trialInfo.isActive) {
      // Auto-expire the trial
      const updatedTrials = trials.map((trial) => {
        if (trial.tenantId === user.tenantId && trial.isActive) {
          return {
            ...trial,
            isActive: false,
          };
        }
        return trial;
      });

      setTrials(updatedTrials);

      // Revert to free plan
      if (currentTenant) {
        const updatedTenant = {
          ...currentTenant,
          plan: 'free' as SubscriptionPlan,
          trialEndDate: undefined,
        };
        saveTenant(updatedTenant, user);
      }

      addNotification({
        type: 'info',
        title: 'Trial Expirado',
        message:
          'Seu trial expirou. Você foi movido para o plano gratuito. Faça upgrade para continuar usando os recursos premium.',
      });
    }
  };

  const getTrialNotifications = (): TrialNotification[] => {
    if (!trialInfo || !trialInfo.isActive) return [];

    const notifications: TrialNotification[] = [];

    // Warning notifications based on days remaining
    if (trialInfo.daysRemaining <= 1) {
      notifications.push({
        type: 'error',
        title: 'Trial Expira Hoje!',
        message:
          'Seu trial expira hoje. Faça upgrade agora para não perder acesso aos recursos premium.',
        action: {
          label: 'Fazer Upgrade',
          onClick: () => convertToSubscription(trialInfo.plan),
        },
      });
    } else if (trialInfo.daysRemaining <= 3) {
      notifications.push({
        type: 'warning',
        title: 'Trial Expira em Breve',
        message: `Seu trial expira em ${trialInfo.daysRemaining} dias. Considere fazer upgrade para continuar usando os recursos premium.`,
        action: {
          label: 'Ver Planos',
          onClick: () => {
            /* Open subscription manager */
          },
        },
      });
    } else if (trialInfo.daysRemaining <= 7) {
      notifications.push({
        type: 'info',
        title: 'Trial em Andamento',
        message: `Você tem ${trialInfo.daysRemaining} dias restantes no seu trial. Aproveite para explorar todos os recursos!`,
      });
    }

    // Extension notification
    if (trialInfo.canExtend && trialInfo.daysRemaining <= 2) {
      notifications.push({
        type: 'info',
        title: 'Estender Trial',
        message: 'Você pode estender seu trial por mais alguns dias.',
        action: {
          label: 'Estender',
          onClick: () => extendTrial(7),
        },
      });
    }

    return notifications;
  };

  const value: TrialManagerContextType = {
    trialInfo,
    startTrial,
    extendTrial,
    cancelTrial,
    convertToSubscription,
    checkTrialStatus,
    getTrialNotifications,
  };

  return (
    <TrialManagerContext.Provider value={value}>
      {children}
    </TrialManagerContext.Provider>
  );
};

export const useTrialManager = (): TrialManagerContextType => {
  const context = useContext(TrialManagerContext);
  if (!context) {
    throw new Error(
      'useTrialManager must be used within a TrialManagerProvider'
    );
  }
  return context;
};

export default useTrialManager;
export type { TrialInfo, TrialNotification };
