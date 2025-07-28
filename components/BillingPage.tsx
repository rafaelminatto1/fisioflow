import React, { useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Tenant, BillingPlan, SubscriptionPlan } from '../types';
import { IconCheckCircle } from './icons/IconComponents';
import { Button } from './ui/Button';

const ALL_PLANS: Omit<BillingPlan, 'isCurrent'>[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R$ 0',
    features: ['Até 10 pacientes', 'Até 2 usuários', 'Funcionalidades básicas'],
  },
  {
    id: 'silver',
    name: 'Silver',
    price: 'R$ 99/mês',
    features: ['Até 50 pacientes', 'Até 5 usuários', 'Suporte por email'],
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 'R$ 199/mês',
    features: [
      'Pacientes ilimitados',
      'Usuários ilimitados',
      'Mentoria com IA',
      'Suporte prioritário',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 'R$ 299/mês',
    features: ['Tudo do Gold', 'Analytics avançado', 'API de integração'],
  },
];

const PlanCard: React.FC<{
  plan: BillingPlan;
  onSelect: (planId: SubscriptionPlan) => void;
}> = ({ plan, onSelect }) => {
  return (
    <div
      className={`flex flex-col rounded-lg border-2 p-6 ${plan.isCurrent ? 'border-blue-500 bg-slate-800' : 'border-slate-700 bg-slate-900/50'}`}
    >
      <h3 className="text-xl font-bold text-slate-100">{plan.name}</h3>
      <p className="my-3 text-3xl font-bold text-slate-50">{plan.price}</p>
      <ul className="mb-6 flex-1 space-y-2 text-slate-300">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <IconCheckCircle size={16} className="text-emerald-400" />
            {feature}
          </li>
        ))}
      </ul>
      {plan.isCurrent ? (
        <Button disabled>Plano Atual</Button>
      ) : (
        <Button variant="secondary" onClick={() => onSelect(plan.id)}>
          Selecionar Plano
        </Button>
      )}
    </div>
  );
};

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const { tenants, saveTenant } = useData();

  const currentTenant = useMemo(() => {
    return tenants.find((t) => t.id === user?.tenantId);
  }, [tenants, user]);

  const handleSelectPlan = (planId: SubscriptionPlan) => {
    if (!currentTenant || !user) return;
    if (
      window.confirm(
        `Tem certeza que deseja mudar para o plano ${planId.charAt(0).toUpperCase() + planId.slice(1)}?`
      )
    ) {
      const updatedTenant: Tenant = { ...currentTenant, plan: planId };
      saveTenant(updatedTenant, user);
    }
  };

  if (!currentTenant) {
    return (
      <div className="text-center text-slate-400">
        Dados da clínica não encontrados.
      </div>
    );
  }

  const plans: BillingPlan[] = ALL_PLANS.map((p) => ({
    ...p,
    isCurrent: p.id === currentTenant.plan,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">
          Faturamento e Assinatura
        </h1>
        <p className="mt-1 text-slate-400">
          Gerencie o plano de assinatura da sua clínica:{' '}
          <span className="font-semibold text-white">{currentTenant.name}</span>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onSelect={handleSelectPlan} />
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-6 text-center">
        <p className="text-slate-300">
          Esta é uma simulação de uma página de billing. A integração com um
          gateway de pagamento como o Stripe seria o próximo passo.
        </p>
      </div>
    </div>
  );
};

export default BillingPage;
