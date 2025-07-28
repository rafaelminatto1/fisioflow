import React, { useState } from 'react';

import { ClinicOnboardingModalProps, SubscriptionPlan } from '../types';

import { IconBuilding, IconSparkles } from './icons/IconComponents';
import { Button } from './ui/Button';
import FormField from './ui/FormField';

const PlanCard: React.FC<{
  id: SubscriptionPlan;
  name: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}> = ({ id, name, description, selected, onSelect }) => (
  <button
    onClick={onSelect}
    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${selected ? 'border-blue-500 bg-blue-900/40' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}`}
  >
    <h3 className="font-bold text-slate-100">{name}</h3>
    <p className="mt-1 text-sm text-slate-400">{description}</p>
  </button>
);

const ClinicOnboardingModal: React.FC<ClinicOnboardingModalProps> = ({
  isOpen,
  onClose,
  onOnboard,
}) => {
  const [clinicName, setClinicName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('free');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOnboard = () => {
    if (!clinicName.trim()) {
      setError('O nome da clínica é obrigatório.');
      return;
    }
    setError('');
    setIsSaving(true);
    // Simulate async operation
    setTimeout(() => {
      onOnboard(clinicName, selectedPlan);
      setIsSaving(false);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <header className="p-6 text-center">
          <IconBuilding className="mx-auto mb-4 text-blue-400" size={48} />
          <h2 className="text-2xl font-bold text-slate-100">
            Bem-vindo(a) ao FisioFlow!
          </h2>
          <p className="mt-1 text-slate-400">
            Vamos configurar sua nova clínica.
          </p>
        </header>

        <main className="space-y-6 border-y border-slate-700 p-6">
          <FormField
            label="Qual o nome da sua clínica?"
            name="clinicName"
            id="clinicName"
            value={clinicName}
            onChange={(e) => {
              setClinicName(e.target.value);
              if (error) setError('');
            }}
            placeholder="Ex: Clínica Reabilitar"
            error={error}
          />
          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">
              Selecione seu plano inicial
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <PlanCard
                id="free"
                name="Teste Gratuito"
                description="Explore as funcionalidades básicas com limites de uso."
                selected={selectedPlan === 'free'}
                onSelect={() => setSelectedPlan('free')}
              />
              <PlanCard
                id="gold"
                name="Premium"
                description="Acesso completo a todas as funcionalidades, sem limites."
                selected={selectedPlan === 'gold'}
                onSelect={() => setSelectedPlan('gold')}
              />
            </div>
          </div>
        </main>

        <footer className="flex items-center justify-between p-4">
          <Button variant="ghost" onClick={onClose}>
            Sair
          </Button>
          <Button
            onClick={handleOnboard}
            isLoading={isSaving}
            disabled={isSaving || !clinicName.trim()}
            icon={<IconSparkles />}
          >
            Concluir Configuração
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default ClinicOnboardingModal;
