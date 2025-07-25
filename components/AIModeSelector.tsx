import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Coins, 
  Shield, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  CreditCard,
  Gift,
  Cpu,
  Cloud
} from 'lucide-react';
import { subscriptionAI, SUBSCRIPTION_PLANS, type SubscriptionPlan } from '../services/subscriptionAIService';
import { freeAI } from '../services/freeAIService';
import { useNotification } from '../hooks/useNotification';

interface AIModeProps {
  isOpen: boolean;
  onClose: () => void;
  onModeChange: (mode: 'free' | 'subscription' | 'premium') => void;
}

type AIMode = 'free' | 'subscription' | 'premium';

export function AIModeSelector({ isOpen, onClose, onModeChange }: AIModeProps) {
  const [currentMode, setCurrentMode] = useState<AIMode>('free');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [freeStats, setFreeStats] = useState<any>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      loadCurrentSettings();
    }
  }, [isOpen]);

  const loadCurrentSettings = () => {
    // Carrega configurações atuais
    const mode = localStorage.getItem('aiMode') as AIMode || 'free';
    setCurrentMode(mode);
    
    if (mode === 'subscription') {
      setDashboardData(subscriptionAI.getDashboardData());
      setSelectedPlan(subscriptionAI.getCurrentPlan().id);
    } else if (mode === 'free') {
      setFreeStats(freeAI.getUsageStats());
    }
  };

  const handleModeChange = (newMode: AIMode) => {
    localStorage.setItem('aiMode', newMode);
    setCurrentMode(newMode);
    onModeChange(newMode);
    
    showNotification({
      type: 'success',
      title: 'Modo Alterado',
      message: `Agora usando modo ${getModeDisplayName(newMode)}`
    });
  };

  const handlePlanUpgrade = (planId: string) => {
    const result = subscriptionAI.upgradePlan(planId);
    
    if (result.success) {
      setSelectedPlan(planId);
      setDashboardData(subscriptionAI.getDashboardData());
      showNotification({
        type: 'success',
        title: 'Upgrade Realizado',
        message: result.message
      });
    } else {
      showNotification({
        type: 'error',
        title: 'Erro no Upgrade',
        message: result.message
      });
    }
  };

  const getModeDisplayName = (mode: AIMode): string => {
    const names = {
      free: 'Gratuito',
      subscription: 'Assinatura',
      premium: 'Premium'
    };
    return names[mode];
  };

  const formatPrice = (price: number): string => {
    return price === 0 ? 'Gratuito' : `R$ ${price.toFixed(2)}/mês`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Configuração de IA</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Current Status */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Modo Atual</h3>
              <p className="text-sm text-gray-600">
                {getModeDisplayName(currentMode)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {currentMode === 'subscription' && dashboardData 
                  ? formatPrice(dashboardData.plan.monthlyPrice)
                  : currentMode === 'free' 
                  ? 'R$ 0,00'
                  : 'Personalizado'
                }
              </div>
              <p className="text-sm text-gray-600">por mês</p>
            </div>
          </div>

          {/* Usage Stats */}
          {currentMode === 'subscription' && dashboardData && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-lg font-semibold text-blue-600">
                  {dashboardData.limits.reportsRemaining === -1 
                    ? '∞' 
                    : dashboardData.limits.reportsRemaining
                  }
                </div>
                <div className="text-xs text-gray-600">Relatórios restantes</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-lg font-semibold text-green-600">
                  {dashboardData.limits.voiceMinutesRemaining === -1 
                    ? '∞' 
                    : `${dashboardData.limits.voiceMinutesRemaining}min`
                  }
                </div>
                <div className="text-xs text-gray-600">Voz restante</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-lg font-semibold text-purple-600">
                  {dashboardData.limits.templatesRemaining === -1 
                    ? '∞' 
                    : dashboardData.limits.templatesRemaining
                  }
                </div>
                <div className="text-xs text-gray-600">Templates restantes</div>
              </div>
            </div>
          )}

          {currentMode === 'free' && freeStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-lg font-semibold text-blue-600">
                  {freeStats.remaining}
                </div>
                <div className="text-xs text-gray-600">Usos restantes hoje</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-lg font-semibold text-green-600">
                  R$ 0,00
                </div>
                <div className="text-xs text-gray-600">Custo total</div>
              </div>
            </div>
          )}
        </div>

        {/* Mode Selection */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Escolha seu Modo de IA</h3>
          
          <div className="grid gap-4 mb-6">
            {/* Free Mode */}
            <div 
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                currentMode === 'free' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleModeChange('free')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Gift className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Modo Gratuito</h4>
                    <p className="text-sm text-gray-600">
                      IA local + APIs gratuitas (até 50 usos/dia)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">R$ 0,00</div>
                  <div className="text-xs text-gray-600">para sempre</div>
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Templates básicos
                </div>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Processamento local
                </div>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  50 usos/dia
                </div>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Sem custos
                </div>
              </div>
            </div>

            {/* Subscription Mode */}
            <div 
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                currentMode === 'subscription' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleModeChange('subscription')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Modo Assinatura</h4>
                    <p className="text-sm text-gray-600">
                      Mensalidade fixa com limites previsíveis
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">R$ 29,90+</div>
                  <div className="text-xs text-gray-600">por mês</div>
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  IA avançada
                </div>
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Sem surpresas
                </div>
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Suporte prioritário
                </div>
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Templates personalizados
                </div>
              </div>
            </div>

            {/* Premium Mode */}
            <div 
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                currentMode === 'premium' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleModeChange('premium')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Cloud className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Modo Premium</h4>
                    <p className="text-sm text-gray-600">
                      Sua própria API key (máximo controle)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">Variável</div>
                  <div className="text-xs text-gray-600">por uso</div>
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center text-purple-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Melhor qualidade
                </div>
                <div className="flex items-center text-purple-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Uso ilimitado
                </div>
                <div className="flex items-center text-purple-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Máxima privacidade
                </div>
                <div className="flex items-center text-purple-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Controle total
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Plans (only show if subscription mode selected) */}
          {currentMode === 'subscription' && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Planos de Assinatura</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-4 ${
                      selectedPlan === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="text-center mb-4">
                      <h5 className="font-semibold">{plan.name}</h5>
                      <div className="text-2xl font-bold text-blue-600 my-2">
                        {formatPrice(plan.monthlyPrice)}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Relatórios/dia:</span>
                        <span className="font-medium">
                          {plan.features.dailyReports === -1 ? '∞' : plan.features.dailyReports}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Voz/dia:</span>
                        <span className="font-medium">
                          {plan.features.voiceMinutes === -1 ? '∞' : `${plan.features.voiceMinutes}min`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Templates:</span>
                        <span className="font-medium">
                          {plan.features.customTemplates ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Suporte:</span>
                        <span className="font-medium">
                          {plan.features.prioritySupport ? 'Prioritário' : 'Básico'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePlanUpgrade(plan.id)}
                      disabled={selectedPlan === plan.id}
                      className={`w-full mt-4 py-2 px-4 rounded-lg font-medium ${
                        selectedPlan === plan.id
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {selectedPlan === plan.id ? 'Plano Atual' : 'Selecionar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparison Table */}
          <div className="mt-8">
            <h4 className="font-semibold text-gray-900 mb-4">Comparação de Modos</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left">Recurso</th>
                    <th className="border border-gray-200 p-3 text-center">Gratuito</th>
                    <th className="border border-gray-200 p-3 text-center">Assinatura</th>
                    <th className="border border-gray-200 p-3 text-center">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 p-3">Custo Mensal</td>
                    <td className="border border-gray-200 p-3 text-center text-green-600 font-semibold">R$ 0</td>
                    <td className="border border-gray-200 p-3 text-center text-blue-600 font-semibold">R$ 29,90+</td>
                    <td className="border border-gray-200 p-3 text-center text-purple-600 font-semibold">Variável</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 p-3">Qualidade da IA</td>
                    <td className="border border-gray-200 p-3 text-center">⭐⭐⭐</td>
                    <td className="border border-gray-200 p-3 text-center">⭐⭐⭐⭐</td>
                    <td className="border border-gray-200 p-3 text-center">⭐⭐⭐⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 p-3">Usos por Dia</td>
                    <td className="border border-gray-200 p-3 text-center">50</td>
                    <td className="border border-gray-200 p-3 text-center">15-∞</td>
                    <td className="border border-gray-200 p-3 text-center">∞</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 p-3">Privacidade</td>
                    <td className="border border-gray-200 p-3 text-center">Boa</td>
                    <td className="border border-gray-200 p-3 text-center">Boa</td>
                    <td className="border border-gray-200 p-3 text-center">Máxima</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 p-3">Previsibilidade de Custo</td>
                    <td className="border border-gray-200 p-3 text-center">✅</td>
                    <td className="border border-gray-200 p-3 text-center">✅</td>
                    <td className="border border-gray-200 p-3 text-center">❌</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Você pode alterar o modo a qualquer momento
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}