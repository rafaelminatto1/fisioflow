import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  CreditCard,
  Loader2,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useNotification } from '../hooks/useNotification';
import useSubscriptionLimits from '../hooks/useSubscriptionLimits';

interface SubscriptionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: SubscriptionPlan;
}

interface PlanFeature {
  name: string;
  free: boolean | string;
  silver: boolean | string;
  gold: boolean | string;
  platinum: boolean | string;
}

const PLAN_FEATURES: PlanFeature[] = [
  {
    name: 'Fisioterapeutas',
    free: '1',
    silver: '3',
    gold: '10',
    platinum: 'Ilimitado',
  },
  {
    name: 'Pacientes',
    free: '10',
    silver: '50',
    gold: '200',
    platinum: 'Ilimitado',
  },
  {
    name: 'Agendamentos/mês',
    free: '50',
    silver: '200',
    gold: '1.000',
    platinum: 'Ilimitado',
  },
  {
    name: 'Armazenamento',
    free: '1GB',
    silver: '5GB',
    gold: '20GB',
    platinum: '100GB',
  },
  {
    name: 'Relatórios básicos',
    free: true,
    silver: true,
    gold: true,
    platinum: true,
  },
  {
    name: 'Relatórios avançados',
    free: false,
    silver: true,
    gold: true,
    platinum: true,
  },
  {
    name: 'IA para análise preditiva',
    free: false,
    silver: false,
    gold: true,
    platinum: true,
  },
  {
    name: 'API Access',
    free: false,
    silver: false,
    gold: true,
    platinum: true,
  },
  {
    name: 'Suporte',
    free: 'Email',
    silver: 'Email',
    gold: 'Prioritário',
    platinum: 'Premium 24/7',
  },
];

const PLAN_PRICES: Record<
  SubscriptionPlan,
  { monthly: number; yearly: number; savings?: number }
> = {
  free: { monthly: 0, yearly: 0 },
  silver: { monthly: 97, yearly: 970, savings: 194 },
  gold: { monthly: 197, yearly: 1970, savings: 394 },
  platinum: { monthly: 397, yearly: 3970, savings: 794 },
};

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  isOpen,
  onClose,
  initialPlan = 'silver',
}) => {
  const { user } = useAuth();
  const { saveTenant, tenants } = useData();
  const { addNotification } = useNotification();
  const { currentPlan, usage, limits } = useSubscriptionLimits();

  const [selectedPlan, setSelectedPlan] =
    useState<SubscriptionPlan>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'boleto'>(
    'card'
  );

  const currentTenant = tenants.find((t) => t.id === user?.tenantId);

  useEffect(() => {
    if (initialPlan && initialPlan !== selectedPlan) {
      setSelectedPlan(initialPlan);
    }
  }, [initialPlan]);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!user || !currentTenant) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Usuário ou clínica não encontrados.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In a real implementation, this would integrate with Stripe
      // For now, we'll simulate a successful payment
      const success = Math.random() > 0.1; // 90% success rate for demo

      if (success) {
        // Update tenant plan
        const updatedTenant = {
          ...currentTenant,
          plan: selectedPlan,
        };

        saveTenant(updatedTenant, user);

        addNotification({
          type: 'success',
          title: 'Upgrade Realizado!',
          message: `Seu plano foi atualizado para ${selectedPlan.toUpperCase()} com sucesso.`,
        });

        onClose();
      } else {
        throw new Error('Falha no processamento do pagamento');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erro no Pagamento',
        message: 'Não foi possível processar o pagamento. Tente novamente.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-4 w-4 text-green-400" />
      ) : (
        <X className="h-4 w-4 text-red-400" />
      );
    }
    return <span className="text-sm text-slate-300">{value}</span>;
  };

  const getPlanColor = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'free':
        return 'border-gray-500';
      case 'silver':
        return 'border-gray-400';
      case 'gold':
        return 'border-yellow-500';
      case 'platinum':
        return 'border-purple-500';
      default:
        return 'border-slate-600';
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    const price = PLAN_PRICES[plan];
    return billingCycle === 'monthly' ? price.monthly : price.yearly;
  };

  const getSavings = (plan: SubscriptionPlan) => {
    return PLAN_PRICES[plan].savings || 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Gerenciar Assinatura
            </h2>
            <p className="text-slate-400">
              Escolha o plano ideal para sua clínica
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Current Usage */}
        <div className="border-b border-slate-700 bg-slate-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">Uso Atual</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {usage.therapists}
              </div>
              <div className="text-sm text-slate-400">Fisioterapeutas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {usage.patients}
              </div>
              <div className="text-sm text-slate-400">Pacientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {usage.appointments}
              </div>
              <div className="text-sm text-slate-400">Agendamentos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {usage.storage}GB
              </div>
              <div className="text-sm text-slate-400">Armazenamento</div>
            </div>
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="border-b border-slate-700 p-6">
          <div className="flex items-center justify-center space-x-4">
            <span
              className={`text-sm ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}
            >
              Mensal
            </span>
            <button
              onClick={() =>
                setBillingCycle(
                  billingCycle === 'monthly' ? 'yearly' : 'monthly'
                )
              }
              className="relative h-6 w-12 rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6 transform' : ''
                }`}
              />
            </button>
            <span
              className={`text-sm ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-400'}`}
            >
              Anual
              <span className="ml-1 font-semibold text-green-400">
                (Economize até 20%)
              </span>
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6">
          <div className="mb-8 grid gap-6 md:grid-cols-4">
            {(['free', 'silver', 'gold', 'platinum'] as SubscriptionPlan[]).map(
              (plan) => {
                const isSelected = selectedPlan === plan;
                const isCurrent = currentPlan === plan;
                const price = getPrice(plan);
                const savings = getSavings(plan);

                return (
                  <div
                    key={plan}
                    className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all duration-200 ${
                      isSelected
                        ? `${getPlanColor(plan)} bg-slate-700/50`
                        : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                        <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                          Plano Atual
                        </span>
                      </div>
                    )}

                    {plan === 'gold' && (
                      <div className="absolute -top-3 right-4">
                        <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-slate-900">
                          Mais Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-4 text-center">
                      {plan === 'platinum' && (
                        <Crown className="mx-auto mb-2 h-8 w-8 text-purple-400" />
                      )}
                      <h4 className="mb-2 text-xl font-bold capitalize text-white">
                        {plan}
                      </h4>
                      <div className="text-3xl font-bold text-white">
                        R$ {price}
                        {plan !== 'free' && (
                          <span className="text-sm font-normal text-slate-400">
                            /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                          </span>
                        )}
                      </div>
                      {billingCycle === 'yearly' && savings > 0 && (
                        <div className="mt-1 text-sm text-green-400">
                          Economize R$ {savings}/ano
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {PLAN_FEATURES.slice(0, 4).map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-300">
                            {feature.name}:
                          </span>
                          {renderFeatureValue(feature[plan])}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Feature Comparison Table */}
          <div className="mb-6 rounded-lg bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">
              Comparação Completa
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-3 text-left text-slate-300">Recursos</th>
                    <th className="py-3 text-center text-slate-300">Free</th>
                    <th className="py-3 text-center text-slate-300">Silver</th>
                    <th className="py-3 text-center text-slate-300">Gold</th>
                    <th className="py-3 text-center text-slate-300">
                      Platinum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_FEATURES.map((feature, index) => (
                    <tr key={index} className="border-b border-slate-800">
                      <td className="py-3 text-slate-300">{feature.name}</td>
                      <td className="py-3 text-center">
                        {renderFeatureValue(feature.free)}
                      </td>
                      <td className="py-3 text-center">
                        {renderFeatureValue(feature.silver)}
                      </td>
                      <td className="py-3 text-center">
                        {renderFeatureValue(feature.gold)}
                      </td>
                      <td className="py-3 text-center">
                        {renderFeatureValue(feature.platinum)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Method */}
          {selectedPlan !== 'free' && selectedPlan !== currentPlan && (
            <div className="mb-6 rounded-lg bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Método de Pagamento
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'card', name: 'Cartão de Crédito', icon: CreditCard },
                  { key: 'pix', name: 'PIX', icon: Zap },
                  { key: 'boleto', name: 'Boleto', icon: FileText },
                ].map(({ key, name, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setPaymentMethod(key as any)}
                    className={`rounded-lg border-2 p-4 transition-all duration-200 ${
                      paymentMethod === key
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                    <div className="text-sm text-slate-300">{name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-400 transition-colors hover:text-white"
            >
              Cancelar
            </button>

            {selectedPlan !== currentPlan && (
              <button
                onClick={handleUpgrade}
                disabled={isProcessing}
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-8 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <span>
                    {selectedPlan === 'free'
                      ? 'Fazer Downgrade'
                      : 'Confirmar Upgrade'}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;
