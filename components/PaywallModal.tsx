import {
  X,
  Crown,
  Zap,
  TrendingUp,
  Shield,
  Users,
  Calendar,
  Database,
  Bot,
} from 'lucide-react';
import React from 'react';

import { PlanLimits } from '../hooks/useSubscriptionLimits';
import { SubscriptionPlan } from '../types';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  blockedResource: string;
  currentPlan: SubscriptionPlan;
  recommendedPlan: SubscriptionPlan | null;
  onUpgrade: (plan: SubscriptionPlan) => void;
  feature?: string;
  title?: string;
  description?: string;
}

const PLAN_DETAILS: Record<
  SubscriptionPlan,
  {
    name: string;
    price: string;
    color: string;
    icon: React.ReactNode;
    features: string[];
    highlight?: string;
  }
> = {
  free: {
    name: 'Gratuito',
    price: 'R$ 0',
    color: 'bg-gray-500',
    icon: <Users className="h-5 w-5" />,
    features: [
      '1 fisioterapeuta',
      '10 pacientes',
      '50 agendamentos/mês',
      'Funcionalidades básicas',
      'Suporte por email',
    ],
  },
  silver: {
    name: 'Silver',
    price: 'R$ 97',
    color: 'bg-gray-400',
    icon: <TrendingUp className="h-5 w-5" />,
    features: [
      '3 fisioterapeutas',
      '50 pacientes',
      '200 agendamentos/mês',
      'Relatórios básicos',
      '5GB de armazenamento',
      'Suporte prioritário',
    ],
  },
  gold: {
    name: 'Gold',
    price: 'R$ 197',
    color: 'bg-yellow-500',
    icon: <Zap className="h-5 w-5" />,
    features: [
      '10 fisioterapeutas',
      '200 pacientes',
      '1000 agendamentos/mês',
      'IA para análise preditiva',
      'Relatórios avançados',
      'API access',
      '20GB de armazenamento',
      'Suporte prioritário',
    ],
    highlight: 'Mais Popular',
  },
  platinum: {
    name: 'Platinum',
    price: 'R$ 397',
    color: 'bg-purple-600',
    icon: <Crown className="h-5 w-5" />,
    features: [
      'Fisioterapeutas ilimitados',
      'Pacientes ilimitados',
      'Agendamentos ilimitados',
      'IA avançada completa',
      'Relatórios executivos',
      'API completa',
      '100GB de armazenamento',
      'Suporte premium 24/7',
      'Consultoria especializada',
    ],
    highlight: 'Empresarial',
  },
};

const getResourceIcon = (resource: string) => {
  switch (resource) {
    case 'therapists':
      return <Users className="h-6 w-6 text-blue-400" />;
    case 'patients':
      return <Users className="h-6 w-6 text-green-400" />;
    case 'appointments':
      return <Calendar className="h-6 w-6 text-purple-400" />;
    case 'storage':
      return <Database className="h-6 w-6 text-orange-400" />;
    case 'aiFeatures':
      return <Bot className="h-6 w-6 text-pink-400" />;
    case 'advancedReports':
      return <TrendingUp className="h-6 w-6 text-indigo-400" />;
    default:
      return <Shield className="h-6 w-6 text-gray-400" />;
  }
};

const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  reason,
  blockedResource,
  currentPlan,
  recommendedPlan,
  onUpgrade,
}) => {
  if (!isOpen) return null;

  const plans = Object.entries(PLAN_DETAILS).filter(([key]) => key !== 'free');
  const currentPlanIndex = Object.keys(PLAN_DETAILS).indexOf(currentPlan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-6">
          <div className="flex items-center space-x-3">
            {getResourceIcon(blockedResource)}
            <div>
              <h2 className="text-xl font-bold text-white">
                Upgrade Necessário
              </h2>
              <p className="text-sm text-slate-400">
                Desbloqueie todo o potencial do FisioFlow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Reason */}
        <div className="border-b border-slate-700 bg-slate-900 p-6">
          <div className="flex items-start space-x-3">
            <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-yellow-400"></div>
            <p className="leading-relaxed text-slate-300">{reason}</p>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6">
          <h3 className="mb-6 text-lg font-semibold text-white">
            Escolha seu plano ideal:
          </h3>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map(([planKey, plan], index) => {
              const isRecommended = planKey === recommendedPlan;
              const isCurrentOrLower =
                Object.keys(PLAN_DETAILS).indexOf(planKey) <= currentPlanIndex;

              return (
                <div
                  key={planKey}
                  className={`relative rounded-lg border-2 p-6 transition-all duration-200 ${
                    isRecommended
                      ? 'scale-105 border-yellow-400 bg-yellow-400/10'
                      : isCurrentOrLower
                        ? 'border-slate-600 bg-slate-700/50 opacity-60'
                        : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                  }`}
                >
                  {/* Highlight Badge */}
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                      <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-slate-900">
                        {plan.highlight}
                      </span>
                    </div>
                  )}

                  {isRecommended && (
                    <div className="absolute -top-3 right-4">
                      <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
                        Recomendado
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6 text-center">
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${plan.color} mb-3`}
                    >
                      {plan.icon}
                    </div>
                    <h4 className="mb-2 text-xl font-bold text-white">
                      {plan.name}
                    </h4>
                    <div className="text-3xl font-bold text-white">
                      {plan.price}
                      <span className="text-sm font-normal text-slate-400">
                        /mês
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="mb-6 space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-start space-x-2"
                      >
                        <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400"></div>
                        <span className="text-sm text-slate-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  <button
                    onClick={() => onUpgrade(planKey as SubscriptionPlan)}
                    disabled={isCurrentOrLower}
                    className={`w-full rounded-lg px-4 py-3 font-semibold transition-all duration-200 ${
                      isCurrentOrLower
                        ? 'cursor-not-allowed bg-slate-600 text-slate-400'
                        : isRecommended
                          ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
                          : 'bg-slate-600 text-white hover:bg-slate-500'
                    }`}
                  >
                    {isCurrentOrLower
                      ? planKey === currentPlan
                        ? 'Plano Atual'
                        : 'Plano Inferior'
                      : 'Fazer Upgrade'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Benefits Section */}
          <div className="mt-8 rounded-lg bg-slate-900 p-6">
            <h4 className="mb-4 text-lg font-semibold text-white">
              Por que fazer upgrade?
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start space-x-3">
                <TrendingUp className="mt-0.5 h-5 w-5 text-green-400" />
                <div>
                  <h5 className="font-medium text-white">
                    Aumente sua produtividade
                  </h5>
                  <p className="text-sm text-slate-400">
                    Gerencie mais pacientes e otimize seu tempo
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Bot className="mt-0.5 h-5 w-5 text-purple-400" />
                <div>
                  <h5 className="font-medium text-white">
                    IA para melhores resultados
                  </h5>
                  <p className="text-sm text-slate-400">
                    Análises preditivas e recomendações inteligentes
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Shield className="mt-0.5 h-5 w-5 text-blue-400" />
                <div>
                  <h5 className="font-medium text-white">
                    Segurança e compliance
                  </h5>
                  <p className="text-sm text-slate-400">
                    Proteção total dos dados dos seus pacientes
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Zap className="mt-0.5 h-5 w-5 text-yellow-400" />
                <div>
                  <h5 className="font-medium text-white">
                    Suporte especializado
                  </h5>
                  <p className="text-sm text-slate-400">
                    Atendimento prioritário e consultoria
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Todos os planos incluem 30 dias de garantia. Cancele a qualquer
              momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
