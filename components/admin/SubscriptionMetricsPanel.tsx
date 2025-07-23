import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useData } from '../../hooks/useData.minimal';
import { useAppleIAP } from '../../hooks/useAppleIAP';
import { SubscriptionPlan, User, Tenant, AuditLog } from '../../types';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  description?: string;
}

interface ConversionFunnelData {
  stage: string;
  users: number;
  conversionRate: number;
}

interface RevenueData {
  period: string;
  revenue: number;
  subscriptions: number;
  churn: number;
}

interface ChurnAnalysis {
  period: string;
  churnRate: number;
  reason: string;
  count: number;
}

const SubscriptionMetricsPanel: React.FC = () => {
  const { users, tenants, auditLogs } = useData();
  const { products, getActiveSubscriptions } = useAppleIAP();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    const now = new Date();
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    
    const startDate = new Date(now.getTime() - days[selectedPeriod] * 24 * 60 * 60 * 1000);
    return { startDate, endDate: now };
  }, [selectedPeriod]);

  // Filter data based on selected period and plan
  const filteredData = useMemo(() => {
    const { startDate, endDate } = dateRange;
    
    const filteredTenants = tenants.filter(tenant => {
      const createdAt = new Date(tenant.createdAt || '');
      const withinPeriod = createdAt >= startDate && createdAt <= endDate;
      const matchesPlan = selectedPlan === 'all' || tenant.plan === selectedPlan;
      return withinPeriod && matchesPlan;
    });

    const filteredAuditLogs = auditLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      const withinPeriod = logDate >= startDate && logDate <= endDate;
      const isSubscriptionEvent = log.action.includes('subscription') || log.action.includes('iap');
      return withinPeriod && isSubscriptionEvent;
    });

    return { filteredTenants, filteredAuditLogs };
  }, [tenants, auditLogs, dateRange, selectedPlan]);

  // Calculate key metrics
  const metrics = useMemo((): MetricCard[] => {
    const { filteredTenants, filteredAuditLogs } = filteredData;
    
    // Active subscribers
    const activeSubscribers = tenants.filter(t => t.plan !== 'free').length;
    const totalUsers = tenants.length;
    const subscriberGrowth = filteredTenants.filter(t => t.plan !== 'free').length;
    
    // Revenue calculation (mock - in production would come from payment data)
    const revenueByPlan = {
      silver: 29.90,
      gold: 49.90,
      platinum: 99.90,
    };
    
    const monthlyRevenue = tenants.reduce((sum, tenant) => {
      if (tenant.plan === 'free') return sum;
      return sum + (revenueByPlan[tenant.plan as keyof typeof revenueByPlan] || 0);
    }, 0);

    // Conversion rate
    const conversionEvents = filteredAuditLogs.filter(log => 
      log.action.includes('purchase') || log.action.includes('upgrade')
    );
    const conversionRate = totalUsers > 0 ? (activeSubscribers / totalUsers) * 100 : 0;

    // Churn rate (mock calculation)
    const churnEvents = filteredAuditLogs.filter(log => 
      log.action.includes('cancel') || log.action.includes('downgrade')
    );
    const churnRate = activeSubscribers > 0 ? (churnEvents.length / activeSubscribers) * 100 : 0;

    return [
      {
        title: 'Assinantes Ativos',
        value: activeSubscribers.toLocaleString(),
        change: subscriberGrowth,
        changeType: subscriberGrowth > 0 ? 'increase' : subscriberGrowth < 0 ? 'decrease' : 'neutral',
        icon: <Users className="w-6 h-6" />,
        description: `${((activeSubscribers / totalUsers) * 100).toFixed(1)}% dos usuários`,
      },
      {
        title: 'Receita Mensal (MRR)',
        value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        change: 15.3,
        changeType: 'increase',
        icon: <DollarSign className="w-6 h-6" />,
        description: 'Receita recorrente mensal',
      },
      {
        title: 'Taxa de Conversão',
        value: `${conversionRate.toFixed(1)}%`,
        change: conversionEvents.length,
        changeType: conversionEvents.length > 0 ? 'increase' : 'neutral',
        icon: <Target className="w-6 h-6" />,
        description: 'Free para Premium',
      },
      {
        title: 'Taxa de Churn',
        value: `${churnRate.toFixed(1)}%`,
        change: -churnEvents.length,
        changeType: churnEvents.length > 0 ? 'increase' : 'decrease',
        icon: <TrendingDown className="w-6 h-6" />,
        description: 'Cancelamentos no período',
      },
    ];
  }, [filteredData, tenants]);

  // Conversion funnel data
  const conversionFunnel = useMemo((): ConversionFunnelData[] => {
    const totalVisitors = users.length;
    const registeredUsers = users.filter(u => u.createdAt).length;
    const trialUsers = tenants.filter(t => t.plan !== 'free').length;
    const paidUsers = tenants.filter(t => t.plan !== 'free' && t.subscriptionExpiresAt).length;
    
    return [
      {
        stage: 'Visitantes',
        users: totalVisitors,
        conversionRate: 100,
      },
      {
        stage: 'Registros',
        users: registeredUsers,
        conversionRate: totalVisitors > 0 ? (registeredUsers / totalVisitors) * 100 : 0,
      },
      {
        stage: 'Trial/Freemium',
        users: trialUsers,
        conversionRate: registeredUsers > 0 ? (trialUsers / registeredUsers) * 100 : 0,
      },
      {
        stage: 'Assinantes Pagos',
        users: paidUsers,
        conversionRate: trialUsers > 0 ? (paidUsers / trialUsers) * 100 : 0,
      },
    ];
  }, [users, tenants]);

  // Revenue trend data
  const revenueTrend = useMemo((): RevenueData[] => {
    // Mock revenue trend - in production would come from actual payment data
    const periods = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().substr(0, 7);
      
      // Mock data - replace with actual revenue calculation
      const revenue = Math.random() * 10000 + 5000;
      const subscriptions = Math.floor(Math.random() * 100) + 50;
      const churn = Math.random() * 10 + 2;
      
      periods.push({
        period: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        revenue,
        subscriptions,
        churn,
      });
    }
    
    return periods;
  }, []);

  // Plan distribution
  const planDistribution = useMemo(() => {
    const distribution = tenants.reduce((acc, tenant) => {
      acc[tenant.plan] = (acc[tenant.plan] || 0) + 1;
      return acc;
    }, {} as Record<SubscriptionPlan, number>);

    return Object.entries(distribution).map(([plan, count]) => ({
      plan: plan as SubscriptionPlan,
      count,
      percentage: (count / tenants.length) * 100,
    }));
  }, [tenants]);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const exportData = () => {
    const data = {
      metrics,
      conversionFunnel,
      revenueTrend,
      planDistribution,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-metrics-${selectedPeriod}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Métricas de Assinatura
          </h1>
          <p className="text-gray-600">
            Dashboard administrativo para monitoramento de conversões e receita
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          
          <button
            onClick={exportData}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros:</span>
        </div>
        
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="1y">Último ano</option>
        </select>
        
        <select
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value as any)}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value="all">Todos os planos</option>
          <option value="free">Gratuito</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-4">
              <div className="text-blue-600">
                {metric.icon}
              </div>
              <div className={`flex items-center text-sm ${
                metric.changeType === 'increase' ? 'text-green-600' :
                metric.changeType === 'decrease' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {metric.changeType === 'increase' && <TrendingUp className="w-4 h-4 mr-1" />}
                {metric.changeType === 'decrease' && <TrendingDown className="w-4 h-4 mr-1" />}
                {metric.change > 0 ? '+' : ''}{metric.change}
              </div>
            </div>
            
            <div className="mb-2">
              <div className="text-2xl font-bold text-gray-900">
                {metric.value}
              </div>
              <div className="text-sm font-medium text-gray-700">
                {metric.title}
              </div>
            </div>
            
            {metric.description && (
              <div className="text-xs text-gray-500">
                {metric.description}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Funil de Conversão
            </h3>
          </div>
          
          <div className="space-y-4">
            {conversionFunnel.map((stage, index) => (
              <div key={index} className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {stage.stage}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {stage.users.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({stage.conversionRate.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stage.conversionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center mb-4">
            <PieChart className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Distribuição de Planos
            </h3>
          </div>
          
          <div className="space-y-3">
            {planDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full mr-3 ${
                      item.plan === 'free' ? 'bg-gray-400' :
                      item.plan === 'silver' ? 'bg-blue-500' :
                      item.plan === 'gold' ? 'bg-yellow-500' :
                      'bg-purple-500'
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {item.plan === 'free' ? 'Gratuito' : item.plan}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {item.count}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Tendência de Receita
            </h3>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full mr-2" />
              Receita
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-600 rounded-full mr-2" />
              Assinaturas
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-600 rounded-full mr-2" />
              Churn
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {revenueTrend.map((data, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                <span className="font-medium text-gray-700">
                  {data.period}
                </span>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-600">
                    R$ {data.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-gray-500">Receita</div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">
                    {data.subscriptions}
                  </div>
                  <div className="text-xs text-gray-500">Assinaturas</div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-semibold text-red-600">
                    {data.churn.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Churn</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Health Indicators */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Indicadores de Saúde da Assinatura
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-4 border rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <div className="font-semibold text-gray-900">Crescimento Estável</div>
              <div className="text-sm text-gray-600">MRR crescendo 15% ao mês</div>
            </div>
          </div>
          
          <div className="flex items-center p-4 border rounded-lg">
            <AlertCircle className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <div className="font-semibold text-gray-900">Churn Moderado</div>
              <div className="text-sm text-gray-600">Taxa de churn acima da média</div>
            </div>
          </div>
          
          <div className="flex items-center p-4 border rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <div className="font-semibold text-gray-900">Conversão Saudável</div>
              <div className="text-sm text-gray-600">Taxa de conversão em alta</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionMetricsPanel;