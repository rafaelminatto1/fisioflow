/**
 * Componente para exibir informações do plano Freemium
 * 
 * Este componente mostra o plano atual do usuário, uso de recursos,
 * limites e opções de upgrade com design moderno e responsivo.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Progress,
  Badge,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui';
import {
  Crown,
  Users,
  FileText,
  BookOpen,
  Video,
  HardDrive,
  Zap,
  TrendingUp,
  CheckCircle,
  XCircle,
  ArrowUp,
  Sparkles,
  Shield,
  Headphones,
} from 'lucide-react';
import { useFreemium, TierType } from '../hooks/useFreemium';
import { formatBytes, formatCurrency } from '../utils/formatters';
import { toast } from 'react-toastify';

interface FreemiumPlanCardProps {
  showUpgradeDialog?: boolean;
  compact?: boolean;
  className?: string;
}

const TIER_COLORS = {
  free: 'bg-gray-100 text-gray-800 border-gray-200',
  premium: 'bg-blue-100 text-blue-800 border-blue-200',
  enterprise: 'bg-purple-100 text-purple-800 border-purple-200',
};

const TIER_ICONS = {
  free: Users,
  premium: Crown,
  enterprise: Sparkles,
};

const TIER_NAMES = {
  free: 'Gratuito',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

export function FreemiumPlanCard({
  showUpgradeDialog = true,
  compact = false,
  className = '',
}: FreemiumPlanCardProps) {
  const {
    currentTier,
    limits,
    usage,
    validation,
    recommendations,
    loading,
    error,
    getUsagePercentage,
    isNearLimit,
    canUpgrade,
    nextTier,
    tierBenefits,
    refreshData,
    simulateUpgrade,
    processUpgrade,
  } = useFreemium();

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<TierType>('premium');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<any>(null);

  const TierIcon = TIER_ICONS[currentTier];

  // Simula upgrade quando tier é selecionado
  useEffect(() => {
    if (upgradeDialogOpen && selectedUpgradeTier) {
      handleSimulateUpgrade(selectedUpgradeTier);
    }
  }, [selectedUpgradeTier, upgradeDialogOpen]);

  const handleSimulateUpgrade = async (tier: TierType) => {
    const simulation = await simulateUpgrade(tier);
    setSimulationData(simulation);
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    
    try {
      // Aqui você integraria com o sistema de pagamento
      // Por enquanto, vamos simular o processo
      const paymentData = {
        tier: selectedUpgradeTier,
        payment_method: 'credit_card',
        // Outros dados de pagamento...
      };
      
      const success = await processUpgrade(selectedUpgradeTier, paymentData);
      
      if (success) {
        setUpgradeDialogOpen(false);
        toast.success('Plano atualizado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao processar upgrade');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (value: number) => {
    if (value === -1) return 'Ilimitado';
    if (value === 0) return 'Não disponível';
    return value.toLocaleString();
  };

  if (loading && !usage) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="ml-2"
          >
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card className={`${className} ${TIER_COLORS[currentTier]} border-2`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TierIcon className="h-5 w-5" />
              <CardTitle className="text-lg">
                Plano {TIER_NAMES[currentTier]}
              </CardTitle>
            </div>
            
            {canUpgrade && showUpgradeDialog && (
              <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Upgrade
                  </Button>
                </DialogTrigger>
                <UpgradeDialog
                  currentTier={currentTier}
                  selectedTier={selectedUpgradeTier}
                  onTierSelect={setSelectedUpgradeTier}
                  simulationData={simulationData}
                  onUpgrade={handleUpgrade}
                  loading={upgradeLoading}
                />
              </Dialog>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Alertas de limite */}
          {validation && !validation.is_valid && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Alguns limites foram excedidos. Considere fazer upgrade.
              </AlertDescription>
            </Alert>
          )}

          {/* Métricas de uso */}
          {usage && !compact && (
            <div className="space-y-3">
              <UsageMetric
                icon={Users}
                label="Estagiários"
                current={usage.interns_count}
                limit={limits.interns}
                percentage={getUsagePercentage('interns_count')}
              />
              
              <UsageMetric
                icon={FileText}
                label="Casos Clínicos"
                current={usage.cases_count}
                limit={limits.cases}
                percentage={getUsagePercentage('cases_count')}
              />
              
              <UsageMetric
                icon={BookOpen}
                label="Recursos"
                current={usage.resources_count}
                limit={limits.resources}
                percentage={getUsagePercentage('resources_count')}
              />
              
              <UsageMetric
                icon={HardDrive}
                label="Armazenamento"
                current={formatBytes(usage.storage_used)}
                limit={formatBytes(limits.storage_bytes)}
                percentage={getUsagePercentage('storage_used')}
                isStorage
              />
              
              <UsageMetric
                icon={Zap}
                label="Requisições IA"
                current={usage.ai_requests_count}
                limit={limits.ai_requests}
                percentage={getUsagePercentage('ai_requests_count')}
              />
            </div>
          )}

          {/* Versão compacta */}
          {compact && usage && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{usage.interns_count}/{formatLimit(limits.interns)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3" />
                <span>{usage.cases_count}/{formatLimit(limits.cases)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <HardDrive className="h-3 w-3" />
                <span>{formatBytes(usage.storage_used)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3" />
                <span>{usage.ai_requests_count}/{formatLimit(limits.ai_requests)}</span>
              </div>
            </div>
          )}

          {/* Benefícios do plano atual */}
          {!compact && (
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">Benefícios inclusos:</h4>
              <div className="grid grid-cols-1 gap-1 text-xs">
                {tierBenefits.slice(0, 3).map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>{benefit}</span>
                  </div>
                ))}
                {tierBenefits.length > 3 && (
                  <span className="text-gray-500">+{tierBenefits.length - 3} mais...</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Componente para métricas de uso individuais
interface UsageMetricProps {
  icon: React.ComponentType<any>;
  label: string;
  current: number | string;
  limit: number;
  percentage: number;
  isStorage?: boolean;
}

function UsageMetric({
  icon: Icon,
  label,
  current,
  limit,
  percentage,
  isStorage = false,
}: UsageMetricProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (value: number) => {
    if (value === -1) return 'Ilimitado';
    if (value === 0) return 'Não disponível';
    return isStorage ? formatBytes(value) : value.toLocaleString();
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <span className="font-medium">
          {current} / {formatLimit(limit)}
        </span>
      </div>
      
      {limit !== -1 && limit !== 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              getProgressColor(percentage)
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      
      {percentage >= 80 && limit !== -1 && (
        <p className="text-xs text-orange-600">
          ⚠️ Próximo do limite ({percentage.toFixed(0)}%)
        </p>
      )}
    </div>
  );
}

// Dialog de upgrade
interface UpgradeDialogProps {
  currentTier: TierType;
  selectedTier: TierType;
  onTierSelect: (tier: TierType) => void;
  simulationData: any;
  onUpgrade: () => void;
  loading: boolean;
}

function UpgradeDialog({
  currentTier,
  selectedTier,
  onTierSelect,
  simulationData,
  onUpgrade,
  loading,
}: UpgradeDialogProps) {
  const tiers: TierType[] = ['premium', 'enterprise'];
  const availableTiers = tiers.filter(tier => {
    const tierOrder = { free: 0, premium: 1, enterprise: 2 };
    return tierOrder[tier] > tierOrder[currentTier];
  });

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Upgrade do Plano</span>
        </DialogTitle>
      </DialogHeader>

      <Tabs value={selectedTier} onValueChange={onTierSelect as any}>
        <TabsList className="grid w-full grid-cols-2">
          {availableTiers.map(tier => (
            <TabsTrigger key={tier} value={tier} className="capitalize">
              {TIER_NAMES[tier]}
            </TabsTrigger>
          ))}
        </TabsList>

        {availableTiers.map(tier => (
          <TabsContent key={tier} value={tier} className="space-y-6">
            <TierComparisonCard tier={tier} simulationData={simulationData} />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-600">
          💳 Pagamento seguro • 🔄 Cancele a qualquer momento
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => {}}>
            Começar Trial Gratuito
          </Button>
          <Button onClick={onUpgrade} disabled={loading}>
            {loading ? 'Processando...' : `Upgrade para ${TIER_NAMES[selectedTier]}`}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// Card de comparação de tier
interface TierComparisonCardProps {
  tier: TierType;
  simulationData: any;
}

function TierComparisonCard({ tier, simulationData }: TierComparisonCardProps) {
  const benefits = {
    premium: [
      { icon: Users, text: '50 estagiários', highlight: true },
      { icon: FileText, text: '100 casos clínicos', highlight: true },
      { icon: BookOpen, text: 'Recursos ilimitados', highlight: true },
      { icon: HardDrive, text: '10GB de armazenamento', highlight: false },
      { icon: TrendingUp, text: 'Analytics avançados', highlight: true },
      { icon: CheckCircle, text: 'Exportação de relatórios', highlight: true },
      { icon: Headphones, text: 'Suporte prioritário', highlight: false },
    ],
    enterprise: [
      { icon: Users, text: 'Estagiários ilimitados', highlight: true },
      { icon: FileText, text: 'Casos ilimitados', highlight: true },
      { icon: BookOpen, text: 'Recursos ilimitados', highlight: true },
      { icon: HardDrive, text: '100GB de armazenamento', highlight: true },
      { icon: Sparkles, text: 'White label', highlight: true },
      { icon: Shield, text: 'Segurança avançada', highlight: true },
      { icon: Headphones, text: 'Suporte dedicado', highlight: false },
    ],
  };

  const pricing = {
    premium: { monthly: 49.90, yearly: 499.00 },
    enterprise: { monthly: 199.90, yearly: 1999.00 },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Benefícios */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">O que você ganha:</h3>
        <div className="space-y-2">
          {benefits[tier].map((benefit, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 p-2 rounded ${
                benefit.highlight ? 'bg-green-50 border border-green-200' : ''
              }`}
            >
              <benefit.icon className={`h-4 w-4 ${
                benefit.highlight ? 'text-green-600' : 'text-gray-600'
              }`} />
              <span className={benefit.highlight ? 'font-medium' : ''}>
                {benefit.text}
              </span>
              {benefit.highlight && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Novo
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preços e simulação */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Preços:</h3>
        
        <div className="space-y-3">
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <span>Mensal</span>
              <span className="text-xl font-bold">
                {formatCurrency(pricing[tier].monthly)}/mês
              </span>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <span>Anual</span>
                <Badge variant="secondary" className="ml-2">2 meses grátis</Badge>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold">
                  {formatCurrency(pricing[tier].yearly)}/ano
                </span>
                <div className="text-sm text-gray-600">
                  {formatCurrency(pricing[tier].yearly / 12)}/mês
                </div>
              </div>
            </div>
          </div>
        </div>

        {simulationData && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Resumo do upgrade:</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Plano atual:</span>
                <span>{simulationData.current_tier}</span>
              </div>
              <div className="flex justify-between">
                <span>Novo plano:</span>
                <span>{simulationData.target_tier}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Valor:</span>
                <span>{formatCurrency(simulationData.pricing?.monthly || 0)}/mês</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FreemiumPlanCard;