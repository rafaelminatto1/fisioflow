/**
 * Dashboard Analytics Avançado para Documentos Legais
 * Métricas detalhadas, insights e relatórios em tempo real
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  Calendar,
  PieChart,
  Activity,
  Zap,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

import { InteractiveChart } from '../analytics/components/InteractiveChart';
import type { 
  BaseDocument, 
  DocumentType, 
  DocumentStatus,
  ComplianceValidationResult 
} from '../../types/legalDocuments';

import { complianceService } from '../../services/complianceService';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';

interface DocumentMetrics {
  totalDocuments: number;
  signedDocuments: number;
  pendingDocuments: number;
  expiredDocuments: number;
  complianceScore: number;
  averageSigningTime: number;
  documentsThisMonth: number;
  documentGrowth: number;
  topDocumentTypes: Array<{
    type: DocumentType;
    count: number;
    percentage: number;
  }>;
  complianceByRegulation: Record<string, number>;
  signingTrends: Array<{
    date: string;
    signed: number;
    created: number;
  }>;
  criticalIssues: number;
  performanceMetrics: {
    avgGenerationTime: number;
    avgComplianceScore: number;
    signatureRate: number;
    errorRate: number;
  };
}

interface AnalyticsPeriod {
  label: string;
  value: '7d' | '30d' | '90d' | '1y';
  days: number;
}

export function DocumentAnalyticsDashboard() {
  const { currentTenant } = useAuth();
  const { patients, therapists } = useData();
  
  const [documents, setDocuments] = useState<BaseDocument[]>([]);
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>({
    label: 'Últimos 30 dias',
    value: '30d',
    days: 30
  });
  const [complianceData, setComplianceData] = useState<Record<string, ComplianceValidationResult>>({});

  const periods: AnalyticsPeriod[] = [
    { label: 'Últimos 7 dias', value: '7d', days: 7 },
    { label: 'Últimos 30 dias', value: '30d', days: 30 },
    { label: 'Últimos 90 dias', value: '90d', days: 90 },
    { label: 'Último ano', value: '1y', days: 365 }
  ];

  useEffect(() => {
    loadDocumentsAndMetrics();
  }, [currentTenant, selectedPeriod]);

  const loadDocumentsAndMetrics = async () => {
    setLoading(true);
    try {
      // Carregar documentos
      const savedDocs = localStorage.getItem('fisioflow_legal_documents');
      let docs: BaseDocument[] = savedDocs ? JSON.parse(savedDocs) : [];
      
      // Filtrar por tenant e período
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - selectedPeriod.days);
      
      docs = docs.filter(doc => 
        doc.tenantId === currentTenant?.id &&
        new Date(doc.createdAt) >= cutoffDate
      );

      setDocuments(docs);

      // Carregar dados de compliance
      const compliancePromises = docs.map(async (doc) => ({
        id: doc.id,
        compliance: await complianceService.validateDocumentCompliance(doc)
      }));

      const complianceResults = await Promise.all(compliancePromises);
      const complianceMap = {};
      complianceResults.forEach(result => {
        complianceMap[result.id] = result.compliance;
      });
      setComplianceData(complianceMap);

      // Calcular métricas
      const calculatedMetrics = calculateMetrics(docs, complianceResults.map(r => r.compliance));
      setMetrics(calculatedMetrics);

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (docs: BaseDocument[], complianceResults: ComplianceValidationResult[]): DocumentMetrics => {
    const total = docs.length;
    const signed = docs.filter(d => d.status === DocumentStatus.SIGNED).length;
    const pending = docs.filter(d => d.status === DocumentStatus.PENDING_SIGNATURE).length;
    const expired = docs.filter(d => d.status === DocumentStatus.EXPIRED).length;

    // Compliance score médio
    const avgCompliance = complianceResults.length > 0 
      ? complianceResults.reduce((sum, r) => sum + r.score, 0) / complianceResults.length
      : 100;

    // Crescimento mensal
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthDocs = docs.filter(d => new Date(d.createdAt) >= thisMonth).length;
    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthDocs = docs.filter(d => {
      const docDate = new Date(d.createdAt);
      return docDate >= lastMonth && docDate < thisMonth;
    }).length;
    const growth = lastMonthDocs > 0 ? ((thisMonthDocs - lastMonthDocs) / lastMonthDocs) * 100 : 0;

    // Top tipos de documentos
    const typeCounts = {};
    docs.forEach(doc => {
      typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1;
    });
    const topTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type: type as DocumentType,
        count: count as number,
        percentage: total > 0 ? ((count as number) / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Status por regulamentação
    const complianceByRegulation = {
      CFM: complianceResults.filter(r => !r.violations.some(v => v.regulation === 'CFM')).length / Math.max(complianceResults.length, 1) * 100,
      COFFITO: complianceResults.filter(r => !r.violations.some(v => v.regulation === 'COFFITO')).length / Math.max(complianceResults.length, 1) * 100,
      LGPD: complianceResults.filter(r => !r.violations.some(v => v.regulation === 'LGPD')).length / Math.max(complianceResults.length, 1) * 100,
      ANVISA: complianceResults.filter(r => !r.violations.some(v => v.regulation === 'ANVISA')).length / Math.max(complianceResults.length, 1) * 100
    };

    // Tendências de assinatura (últimos 30 dias)
    const signingTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayString = date.toISOString().split('T')[0];
      
      const dayCreated = docs.filter(d => d.createdAt.startsWith(dayString)).length;
      const daySigned = docs.filter(d => 
        d.signatures.some(s => s.timestamp.startsWith(dayString))
      ).length;

      signingTrends.push({
        date: dayString,
        created: dayCreated,
        signed: daySigned
      });
    }

    // Issues críticos
    const criticalIssues = complianceResults.reduce((sum, r) => 
      sum + r.violations.filter(v => v.severity === 'critical').length, 0
    );

    // Tempo médio de assinatura (simulado)
    const avgSigningTime = 2.5; // Em dias

    return {
      totalDocuments: total,
      signedDocuments: signed,
      pendingDocuments: pending,
      expiredDocuments: expired,
      complianceScore: avgCompliance,
      averageSigningTime: avgSigningTime,
      documentsThisMonth: thisMonthDocs,
      documentGrowth: growth,
      topDocumentTypes: topTypes,
      complianceByRegulation,
      signingTrends,
      criticalIssues,
      performanceMetrics: {
        avgGenerationTime: 0.8, // segundos
        avgComplianceScore: avgCompliance,
        signatureRate: total > 0 ? (signed / total) * 100 : 0,
        errorRate: 2.1 // %
      }
    };
  };

  const chartData = useMemo(() => {
    if (!metrics) return [];
    
    return [
      { label: 'Assinados', value: metrics.signedDocuments, color: '#10B981', trend: 'up' },
      { label: 'Pendentes', value: metrics.pendingDocuments, color: '#F59E0B', trend: 'stable' },
      { label: 'Expirados', value: metrics.expiredDocuments, color: '#EF4444', trend: 'down' },
      { label: 'Total', value: metrics.totalDocuments, color: '#3B82F6', trend: 'up' }
    ];
  }, [metrics]);

  const complianceChartData = useMemo(() => {
    if (!metrics) return [];
    
    return Object.entries(metrics.complianceByRegulation).map(([regulation, score]) => ({
      label: regulation,
      value: Math.round(score),
      color: score >= 90 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444'
    }));
  }, [metrics]);

  const trendsChartData = useMemo(() => {
    if (!metrics) return [];
    
    return metrics.signingTrends.slice(-7).map(trend => ({
      label: new Date(trend.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: trend.signed,
      date: trend.date
    }));
  }, [metrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Dados não disponíveis
        </h3>
        <p className="text-gray-600">
          Não foi possível carregar os dados de analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Analytics de Documentos
            </h2>
            <p className="text-sm text-gray-600">
              Insights detalhados sobre documentação legal
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod.value}
            onChange={(e) => {
              const period = periods.find(p => p.value === e.target.value);
              if (period) setSelectedPeriod(period);
            }}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>

          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Documentos */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className={`flex items-center space-x-1 text-sm ${
              metrics.documentGrowth > 0 ? 'text-green-600' :
              metrics.documentGrowth < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {metrics.documentGrowth > 0 ? <ArrowUpRight className="h-4 w-4" /> :
               metrics.documentGrowth < 0 ? <ArrowDownRight className="h-4 w-4" /> :
               <Minus className="h-4 w-4" />}
              <span>{Math.abs(metrics.documentGrowth).toFixed(1)}%</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {metrics.totalDocuments.toLocaleString()}
          </div>
          <p className="text-sm text-gray-600">Total de Documentos</p>
        </div>

        {/* Score de Compliance */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div className={`flex items-center space-x-1 text-sm ${
              metrics.complianceScore >= 90 ? 'text-green-600' :
              metrics.complianceScore >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {metrics.complianceScore.toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600">Score de Compliance</p>
        </div>

        {/* Taxa de Assinatura */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {metrics.performanceMetrics.signatureRate.toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600">Taxa de Assinatura</p>
        </div>

        {/* Tempo Médio de Assinatura */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex items-center space-x-1 text-sm text-blue-600">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {metrics.averageSigningTime.toFixed(1)}d
          </div>
          <p className="text-sm text-gray-600">Tempo Médio de Assinatura</p>
        </div>
      </div>

      {/* Alertas Críticos */}
      {metrics.criticalIssues > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">
                {metrics.criticalIssues} questão(s) crítica(s) de compliance detectada(s)
              </h3>
              <p className="text-sm text-red-700">
                Requer atenção imediata para manter conformidade regulatória.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status dos Documentos */}
        <InteractiveChart
          data={chartData}
          type="pie"
          title="Status dos Documentos"
          height={300}
          showLegend={true}
          showTrend={false}
        />

        {/* Compliance por Regulamentação */}
        <InteractiveChart
          data={complianceChartData}
          type="bar"
          title="Compliance por Regulamentação"
          height={300}
          showTrend={false}
        />
      </div>

      {/* Tendências de Assinatura */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InteractiveChart
          data={trendsChartData}
          type="line"
          title="Tendência de Assinaturas (7 dias)"
          height={300}
          showTrend={true}
        />

        {/* Top Tipos de Documentos */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PieChart className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Tipos Mais Utilizados</h3>
          </div>

          <div className="space-y-4">
            {metrics.topDocumentTypes.map((type, index) => (
              <div key={type.type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {type.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-gray-600">
                      {type.count} documento(s)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {type.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas de Performance */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Activity className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Métricas de Performance</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">
              {metrics.performanceMetrics.avgGenerationTime.toFixed(1)}s
            </div>
            <p className="text-sm text-gray-600">Tempo Médio de Geração</p>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {metrics.performanceMetrics.avgComplianceScore.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Score Médio de Compliance</p>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {metrics.performanceMetrics.signatureRate.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Taxa de Assinatura</p>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {metrics.performanceMetrics.errorRate.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Taxa de Erro</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentAnalyticsDashboard;