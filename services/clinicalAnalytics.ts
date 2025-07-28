/**
 * Sistema de Analytics e Business Intelligence Clínico
 * Análise de dados, KPIs, tendências e insights para gestão clínica
 */

import { secureAIService } from './secureAIService';
import { auditLogger, AuditAction, LegalBasis } from './auditLogger';

// === INTERFACES PRINCIPAIS ===
interface AnalyticsMetric {
  id: string;
  name: string;
  category: 'clinical' | 'operational' | 'financial' | 'patient_satisfaction' | 'performance';
  
  // Valor e contexto
  value: number;
  unit: string;
  timestamp: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  
  // Comparação
  previousValue?: number;
  changePercentage?: number;
  trend: 'up' | 'down' | 'stable';
  
  // Metadados
  description: string;
  dataSource: string;
  calculationMethod: string;
  
  // Segmentação
  segments?: Record<string, number>;
  filters?: Record<string, any>;
  
  // Status
  status: 'good' | 'warning' | 'critical';
  threshold?: {
    warning: number;
    critical: number;
    target?: number;
  };
  
  tenantId: string;
}

interface ClinicalKPI {
  id: string;
  name: string;
  description: string;
  
  // Configuração
  formula: string;
  dataFields: string[];
  updateFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  
  // Valor atual
  currentValue: number;
  unit: string;
  lastUpdated: string;
  
  // Metas e benchmarks
  target?: number;
  benchmark?: number;
  industryAverage?: number;
  
  // Histórico
  history: Array<{
    date: string;
    value: number;
  }>;
  
  // Alertas
  alertRules: AlertRule[];
  
  // Visualização
  chartType: 'line' | 'bar' | 'gauge' | 'number' | 'pie';
  color: string;
  
  isActive: boolean;
  tenantId: string;
}

interface AlertRule {
  id: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'between' | 'percentage_change';
  value: number;
  value2?: number; // Para condições 'between'
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  
  // Ações automáticas
  actions: {
    notify?: string[]; // User IDs para notificar
    createTask?: boolean;
    sendEmail?: boolean;
    webhook?: string;
  };
  
  isActive: boolean;
}

interface PatientCohort {
  id: string;
  name: string;
  description: string;
  
  // Critérios de inclusão
  inclusionCriteria: CohortCriterion[];
  exclusionCriteria: CohortCriterion[];
  
  // Resultados
  patientCount: number;
  patientIds: string[];
  
  // Análises
  demographics: {
    averageAge: number;
    genderDistribution: Record<string, number>;
    conditions: Record<string, number>;
  };
  
  outcomes: {
    averageTreatmentDuration: number;
    successRate: number;
    satisfactionScore: number;
    readmissionRate: number;
  };
  
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

interface CohortCriterion {
  field: string; // e.g., 'age', 'condition', 'lastVisit'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in';
  value: any;
  value2?: any; // Para operadores 'between'
  logicalOperator?: 'AND' | 'OR';
}

interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'custom' | 'automated';
  
  // Configuração
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string; // HH:mm
    dayOfWeek?: number; // 0-6 para weekly
    dayOfMonth?: number; // 1-31 para monthly
  };
  
  // Dados
  metrics: string[]; // KPI IDs
  dateRange: {
    start: string;
    end: string;
    type: 'fixed' | 'rolling'; // rolling = últimos X dias
    rollingDays?: number;
  };
  
  // Filtros
  filters: Record<string, any>;
  
  // Conteúdo
  sections: ReportSection[];
  
  // Distribuição
  recipients: string[]; // User IDs
  format: 'pdf' | 'excel' | 'email' | 'dashboard';
  
  // Status
  lastGenerated?: string;
  nextGeneration?: string;
  isActive: boolean;
  
  createdBy: string;
  tenantId: string;
}

interface ReportSection {
  id: string;
  title: string;
  type: 'kpi_grid' | 'chart' | 'table' | 'text' | 'insights';
  
  // Configuração por tipo
  config: {
    kpis?: string[]; // Para kpi_grid
    chartConfig?: ChartConfig; // Para chart
    tableConfig?: TableConfig; // Para table
    content?: string; // Para text
    aiInsights?: boolean; // Para insights
  };
  
  order: number;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  dataSource: string;
  x: string;
  y: string;
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  colors?: string[];
  showTrend?: boolean;
}

interface TableConfig {
  dataSource: string;
  columns: Array<{
    field: string;
    title: string;
    format?: 'number' | 'currency' | 'percentage' | 'date';
    aggregate?: 'sum' | 'avg' | 'count';
  }>;
  sortBy?: string;
  limit?: number;
}

interface PredictiveModel {
  id: string;
  name: string;
  description: string;
  type: 'treatment_outcome' | 'patient_risk' | 'resource_planning' | 'demand_forecast';
  
  // Configuração do modelo
  algorithm: 'linear_regression' | 'random_forest' | 'neural_network' | 'decision_tree';
  features: string[]; // Campos usados como input
  target: string; // Campo a ser previsto
  
  // Performance
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTraining: string;
  
  // Dados de treinamento
  trainingDataSize: number;
  validationDataSize: number;
  
  // Status
  status: 'training' | 'ready' | 'error' | 'outdated';
  isActive: boolean;
  
  createdAt: string;
  tenantId: string;
}

// === CLASSE PRINCIPAL ===
class ClinicalAnalytics {
  private metrics: Map<string, AnalyticsMetric> = new Map();
  private kpis: Map<string, ClinicalKPI> = new Map();
  private cohorts: Map<string, PatientCohort> = new Map();
  private reports: Map<string, AnalyticsReport> = new Map();
  private models: Map<string, PredictiveModel> = new Map();
  
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializar o sistema de analytics
   */
  async initialize(): Promise<void> {
    await this.loadStoredData();
    this.setupDefaultKPIs();
    this.startAutomaticUpdates();
    
    console.log('📊 Clinical Analytics inicializado');
  }

  // === GESTÃO DE KPIs ===

  /**
   * Criar novo KPI
   */
  async createKPI(
    kpi: Omit<ClinicalKPI, 'id' | 'currentValue' | 'lastUpdated' | 'history'>,
    tenantId: string,
    userId: string
  ): Promise<string> {
    const kpiId = this.generateId('kpi');
    
    const fullKPI: ClinicalKPI = {
      ...kpi,
      id: kpiId,
      currentValue: 0,
      lastUpdated: new Date().toISOString(),
      history: [],
      tenantId,
    };

    this.kpis.set(kpiId, fullKPI);
    await this.saveKPIs();

    // Calcular valor inicial
    await this.updateKPI(kpiId, tenantId, userId);

    console.log(`📈 KPI criado: ${kpi.name}`);
    return kpiId;
  }

  /**
   * Atualizar valor de KPI
   */
  async updateKPI(kpiId: string, tenantId: string, userId: string): Promise<void> {
    const kpi = this.kpis.get(kpiId);
    if (!kpi || kpi.tenantId !== tenantId) return;

    try {
      const newValue = await this.calculateKPIValue(kpi, tenantId);
      const previousValue = kpi.currentValue;
      
      // Atualizar KPI
      kpi.currentValue = newValue;
      kpi.lastUpdated = new Date().toISOString();
      
      // Adicionar ao histórico
      kpi.history.push({
        date: new Date().toISOString(),
        value: newValue,
      });
      
      // Manter apenas últimos 365 pontos
      if (kpi.history.length > 365) {
        kpi.history = kpi.history.slice(-365);
      }

      await this.saveKPIs();

      // Verificar alertas
      await this.checkKPIAlerts(kpi, previousValue, userId);

      console.log(`📊 KPI atualizado: ${kpi.name} = ${newValue}`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar KPI ${kpiId}:`, error);
    }
  }

  /**
   * Obter KPIs por categoria
   */
  getKPIsByCategory(category: string, tenantId: string): ClinicalKPI[] {
    return Array.from(this.kpis.values())
      .filter(kpi => kpi.tenantId === tenantId && kpi.name.toLowerCase().includes(category.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // === ANÁLISE DE COORTES ===

  /**
   * Criar coorte de pacientes
   */
  async createPatientCohort(
    cohort: Omit<PatientCohort, 'id' | 'patientCount' | 'patientIds' | 'demographics' | 'outcomes' | 'createdAt' | 'updatedAt'>,
    tenantId: string,
    userId: string
  ): Promise<string> {
    const cohortId = this.generateId('cohort');
    
    // Encontrar pacientes que atendem aos critérios
    const matchingPatients = await this.findMatchingPatients(
      cohort.inclusionCriteria,
      cohort.exclusionCriteria,
      tenantId
    );

    // Calcular análises demográficas e de outcomes
    const demographics = await this.calculateDemographics(matchingPatients, tenantId);
    const outcomes = await this.calculateOutcomes(matchingPatients, tenantId);

    const fullCohort: PatientCohort = {
      ...cohort,
      id: cohortId,
      patientCount: matchingPatients.length,
      patientIds: matchingPatients,
      demographics,
      outcomes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId,
    };

    this.cohorts.set(cohortId, fullCohort);
    await this.saveCohorts();

    // Log de auditoria
    await auditLogger.logAction(
      tenantId,
      userId,
      'USER',
      AuditAction.CREATE,
      'patient_cohort',
      cohortId,
      {
        entityName: cohort.name,
        legalBasis: LegalBasis.LEGITIMATE_INTEREST,
        dataAccessed: ['patient_demographics', 'clinical_outcomes'],
        metadata: {
          patientCount: matchingPatients.length,
          inclusionCriteria: cohort.inclusionCriteria.length,
          exclusionCriteria: cohort.exclusionCriteria.length,
        },
      }
    );

    console.log(`👥 Coorte criada: ${cohort.name} (${matchingPatients.length} pacientes)`);
    return cohortId;
  }

  /**
   * Comparar coortes
   */
  async compareCohorts(
    cohortIds: string[],
    metrics: string[],
    tenantId: string
  ): Promise<{
    cohorts: Array<{
      id: string;
      name: string;
      patientCount: number;
      metrics: Record<string, number>;
    }>;
    statistical: {
      significantDifferences: Array<{
        metric: string;
        pValue: number;
        isSignificant: boolean;
      }>;
    };
  }> {
    const results = [];
    
    for (const cohortId of cohortIds) {
      const cohort = this.cohorts.get(cohortId);
      if (!cohort || cohort.tenantId !== tenantId) continue;

      const cohortMetrics: Record<string, number> = {};
      for (const metric of metrics) {
        cohortMetrics[metric] = await this.calculateCohortMetric(cohort, metric);
      }

      results.push({
        id: cohort.id,
        name: cohort.name,
        patientCount: cohort.patientCount,
        metrics: cohortMetrics,
      });
    }

    // Análise estatística simples
    const statistical = {
      significantDifferences: await this.performStatisticalTests(results, metrics),
    };

    return { cohorts: results, statistical };
  }

  // === RELATÓRIOS AUTOMATIZADOS ===

  /**
   * Criar relatório
   */
  async createReport(
    report: Omit<AnalyticsReport, 'id' | 'lastGenerated' | 'nextGeneration'>,
    tenantId: string,
    userId: string
  ): Promise<string> {
    const reportId = this.generateId('report');
    
    const fullReport: AnalyticsReport = {
      ...report,
      id: reportId,
      tenantId,
    };

    // Calcular próxima geração se for agendado
    if (report.schedule) {
      fullReport.nextGeneration = this.calculateNextGeneration(report.schedule);
    }

    this.reports.set(reportId, fullReport);
    await this.saveReports();

    console.log(`📋 Relatório criado: ${report.name}`);
    return reportId;
  }

  /**
   * Gerar relatório
   */
  async generateReport(
    reportId: string,
    tenantId: string,
    userId: string
  ): Promise<{
    title: string;
    generatedAt: string;
    sections: Array<{
      title: string;
      type: string;
      content: any;
    }>;
  }> {
    const report = this.reports.get(reportId);
    if (!report || report.tenantId !== tenantId) {
      throw new Error('Relatório não encontrado');
    }

    const generatedSections = [];

    for (const section of report.sections.sort((a, b) => a.order - b.order)) {
      let content;

      switch (section.type) {
        case 'kpi_grid':
          content = await this.generateKPIGrid(section.config.kpis || [], tenantId);
          break;
        
        case 'chart':
          content = await this.generateChartData(section.config.chartConfig!, tenantId);
          break;
        
        case 'table':
          content = await this.generateTableData(section.config.tableConfig!, tenantId);
          break;
        
        case 'insights':
          content = await this.generateAIInsights(report.metrics, tenantId, userId);
          break;
        
        case 'text':
          content = section.config.content;
          break;
        
        default:
          content = null;
      }

      generatedSections.push({
        title: section.title,
        type: section.type,
        content,
      });
    }

    // Atualizar data de geração
    report.lastGenerated = new Date().toISOString();
    if (report.schedule) {
      report.nextGeneration = this.calculateNextGeneration(report.schedule);
    }
    
    await this.saveReports();

    return {
      title: report.name,
      generatedAt: new Date().toISOString(),
      sections: generatedSections,
    };
  }

  // === MODELOS PREDITIVOS ===

  /**
   * Criar modelo preditivo
   */
  async createPredictiveModel(
    model: Omit<PredictiveModel, 'id' | 'accuracy' | 'precision' | 'recall' | 'f1Score' | 'lastTraining' | 'trainingDataSize' | 'validationDataSize' | 'status' | 'createdAt'>,
    tenantId: string,
    userId: string
  ): Promise<string> {
    const modelId = this.generateId('model');
    
    const fullModel: PredictiveModel = {
      ...model,
      id: modelId,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      lastTraining: '',
      trainingDataSize: 0,
      validationDataSize: 0,
      status: 'training',
      createdAt: new Date().toISOString(),
      tenantId,
    };

    this.models.set(modelId, fullModel);
    await this.saveModels();

    // Iniciar treinamento assíncrono
    this.trainModel(modelId, tenantId, userId).catch(error => {
      console.error(`❌ Erro no treinamento do modelo ${modelId}:`, error);
      fullModel.status = 'error';
    });

    console.log(`🤖 Modelo preditivo criado: ${model.name}`);
    return modelId;
  }

  /**
   * Fazer predição
   */
  async predict(
    modelId: string,
    inputData: Record<string, any>,
    tenantId: string,
    userId: string
  ): Promise<{
    prediction: any;
    confidence: number;
    explanation?: string[];
  }> {
    const model = this.models.get(modelId);
    if (!model || model.tenantId !== tenantId || model.status !== 'ready') {
      throw new Error('Modelo não disponível para predição');
    }

    try {
      // Simular predição com IA
      const result = await secureAIService.makePrediction(
        model.type,
        inputData,
        userId,
        tenantId
      );

      // Log de auditoria
      await auditLogger.logAction(
        tenantId,
        userId,
        'USER',
        AuditAction.READ,
        'predictive_model',
        modelId,
        {
          entityName: `Prediction: ${model.name}`,
          legalBasis: LegalBasis.LEGITIMATE_INTEREST,
          dataAccessed: ['clinical_data', 'prediction_model'],
          metadata: {
            modelType: model.type,
            inputFields: Object.keys(inputData),
          },
        }
      );

      return result;
    } catch (error) {
      console.error(`❌ Erro na predição do modelo ${modelId}:`, error);
      throw error;
    }
  }

  // === INSIGHTS AUTOMÁTICOS ===

  /**
   * Gerar insights automáticos
   */
  async generateInsights(tenantId: string, userId: string): Promise<Array<{
    type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    data: any;
    actionable: boolean;
    suggestedActions?: string[];
  }>> {
    const insights = [];

    try {
      // Análise de tendências
      const trendInsights = await this.analyzeTrends(tenantId);
      insights.push(...trendInsights);

      // Detecção de anomalias
      const anomalies = await this.detectAnomalies(tenantId);
      insights.push(...anomalies);

      // Recomendações baseadas em IA
      const recommendations = await this.generateAIRecommendations(tenantId, userId);
      insights.push(...recommendations);

      // Alertas de KPIs
      const kpiAlerts = await this.getKPIAlerts(tenantId);
      insights.push(...kpiAlerts);

    } catch (error) {
      console.error('❌ Erro ao gerar insights:', error);
    }

    return insights.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // === MÉTODOS PRIVADOS ===

  private async calculateKPIValue(kpi: ClinicalKPI, tenantId: string): Promise<number> {
    // Simular cálculo de KPI baseado na fórmula
    // Em produção, executaria a fórmula contra dados reais
    
    switch (kpi.name) {
      case 'Taxa de Ocupação':
        return Math.random() * 100; // 0-100%
      
      case 'Satisfação do Paciente':
        return 4 + Math.random(); // 4-5 estrelas
      
      case 'Tempo Médio de Consulta':
        return 30 + Math.random() * 30; // 30-60 minutos
      
      case 'Taxa de No-Show':
        return Math.random() * 20; // 0-20%
      
      case 'Receita por Paciente':
        return 100 + Math.random() * 400; // R$ 100-500
      
      default:
        return Math.random() * 100;
    }
  }

  private async checkKPIAlerts(kpi: ClinicalKPI, previousValue: number, userId: string): Promise<void> {
    for (const rule of kpi.alertRules) {
      if (!rule.isActive) continue;

      let shouldAlert = false;
      const currentValue = kpi.currentValue;

      switch (rule.condition) {
        case 'greater_than':
          shouldAlert = currentValue > rule.value;
          break;
        case 'less_than':
          shouldAlert = currentValue < rule.value;
          break;
        case 'equals':
          shouldAlert = Math.abs(currentValue - rule.value) < 0.01;
          break;
        case 'between':
          shouldAlert = currentValue >= rule.value && currentValue <= (rule.value2 || rule.value);
          break;
        case 'percentage_change':
          const change = Math.abs(currentValue - previousValue) / previousValue * 100;
          shouldAlert = change > rule.value;
          break;
      }

      if (shouldAlert) {
        await this.triggerKPIAlert(kpi, rule, userId);
      }
    }
  }

  private async triggerKPIAlert(kpi: ClinicalKPI, rule: AlertRule, userId: string): Promise<void> {
    console.log(`🚨 Alerta KPI: ${kpi.name} - ${rule.message}`);
    
    // Implementar ações do alerta
    if (rule.actions.notify) {
      // Notificar usuários específicos
    }
    
    if (rule.actions.createTask) {
      // Criar tarefa automática
    }
    
    if (rule.actions.sendEmail) {
      // Enviar email
    }
  }

  private async findMatchingPatients(
    inclusionCriteria: CohortCriterion[],
    exclusionCriteria: CohortCriterion[],
    tenantId: string
  ): Promise<string[]> {
    // Simular busca de pacientes
    // Em produção, consultaria banco de dados real
    
    const allPatients = ['patient1', 'patient2', 'patient3', 'patient4', 'patient5'];
    
    // Aplicar critérios de inclusão e exclusão
    const matchingPatients = allPatients.filter(patientId => {
      // Simular verificação de critérios
      return Math.random() > 0.3; // 70% dos pacientes atendem aos critérios
    });

    return matchingPatients;
  }

  private async calculateDemographics(patientIds: string[], tenantId: string): Promise<PatientCohort['demographics']> {
    // Simular cálculo de dados demográficos
    return {
      averageAge: 45 + Math.random() * 20,
      genderDistribution: {
        male: Math.floor(patientIds.length * 0.4),
        female: Math.floor(patientIds.length * 0.6),
      },
      conditions: {
        'Dor nas costas': Math.floor(patientIds.length * 0.6),
        'Lesão no joelho': Math.floor(patientIds.length * 0.3),
        'Fibromialgia': Math.floor(patientIds.length * 0.1),
      },
    };
  }

  private async calculateOutcomes(patientIds: string[], tenantId: string): Promise<PatientCohort['outcomes']> {
    // Simular cálculo de outcomes
    return {
      averageTreatmentDuration: 30 + Math.random() * 60, // dias
      successRate: 70 + Math.random() * 25, // %
      satisfactionScore: 4 + Math.random(), // 1-5
      readmissionRate: Math.random() * 10, // %
    };
  }

  private async calculateCohortMetric(cohort: PatientCohort, metric: string): Promise<number> {
    // Simular cálculo de métrica específica da coorte
    switch (metric) {
      case 'successRate':
        return cohort.outcomes.successRate;
      case 'satisfactionScore':
        return cohort.outcomes.satisfactionScore;
      case 'treatmentDuration':
        return cohort.outcomes.averageTreatmentDuration;
      default:
        return Math.random() * 100;
    }
  }

  private async performStatisticalTests(
    cohorts: any[],
    metrics: string[]
  ): Promise<Array<{ metric: string; pValue: number; isSignificant: boolean }>> {
    // Simular testes estatísticos
    return metrics.map(metric => ({
      metric,
      pValue: Math.random(),
      isSignificant: Math.random() < 0.05, // 5% chance de significância
    }));
  }

  private calculateNextGeneration(schedule: any): string {
    const now = new Date();
    let next = new Date(now);

    switch (schedule.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
    }

    return next.toISOString();
  }

  private async generateKPIGrid(kpiIds: string[], tenantId: string): Promise<any> {
    const kpiData = [];
    
    for (const kpiId of kpiIds) {
      const kpi = this.kpis.get(kpiId);
      if (kpi && kpi.tenantId === tenantId) {
        kpiData.push({
          id: kpi.id,
          name: kpi.name,
          value: kpi.currentValue,
          unit: kpi.unit,
          trend: this.calculateTrend(kpi.history),
          status: this.getKPIStatus(kpi),
        });
      }
    }

    return kpiData;
  }

  private async generateChartData(config: ChartConfig, tenantId: string): Promise<any> {
    // Simular dados para gráfico
    return {
      type: config.type,
      data: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [{
          label: 'Dados',
          data: Array(6).fill(0).map(() => Math.random() * 100),
          backgroundColor: config.colors?.[0] || '#3B82F6',
        }],
      },
    };
  }

  private async generateTableData(config: TableConfig, tenantId: string): Promise<any> {
    // Simular dados para tabela
    return {
      columns: config.columns,
      rows: Array(10).fill(0).map((_, index) => ({
        id: index + 1,
        ...config.columns.reduce((row, col) => {
          row[col.field] = Math.random() * 100;
          return row;
        }, {} as any),
      })),
    };
  }

  private async generateAIInsights(metricIds: string[], tenantId: string, userId: string): Promise<string[]> {
    // Gerar insights usando IA
    try {
      const insights = await secureAIService.generateInsights(
        metricIds.join(','),
        userId,
        tenantId
      );
      
      return insights.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error('❌ Erro ao gerar insights IA:', error);
      return ['Insights não disponíveis no momento.'];
    }
  }

  private async trainModel(modelId: string, tenantId: string, userId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) return;

    try {
      // Simular treinamento
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos

      // Atualizar métricas do modelo
      model.accuracy = 0.8 + Math.random() * 0.15;
      model.precision = 0.75 + Math.random() * 0.2;
      model.recall = 0.7 + Math.random() * 0.25;
      model.f1Score = (2 * model.precision * model.recall) / (model.precision + model.recall);
      model.lastTraining = new Date().toISOString();
      model.trainingDataSize = Math.floor(Math.random() * 1000) + 500;
      model.validationDataSize = Math.floor(model.trainingDataSize * 0.2);
      model.status = 'ready';

      await this.saveModels();

      console.log(`🎯 Modelo treinado: ${model.name} (Acurácia: ${(model.accuracy * 100).toFixed(1)}%)`);
    } catch (error) {
      model.status = 'error';
      console.error(`❌ Erro no treinamento:`, error);
    }
  }

  private async analyzeTrends(tenantId: string): Promise<any[]> {
    // Analisar tendências nos KPIs
    const trends = [];
    
    for (const kpi of this.kpis.values()) {
      if (kpi.tenantId !== tenantId || kpi.history.length < 7) continue;

      const recentTrend = this.calculateTrend(kpi.history.slice(-7));
      
      if (Math.abs(recentTrend) > 10) { // Mudança > 10%
        trends.push({
          type: 'trend',
          title: `Tendência em ${kpi.name}`,
          description: `${kpi.name} ${recentTrend > 0 ? 'aumentou' : 'diminuiu'} ${Math.abs(recentTrend).toFixed(1)}% nos últimos 7 períodos`,
          severity: Math.abs(recentTrend) > 20 ? 'high' : 'medium',
          data: { kpiId: kpi.id, trend: recentTrend },
          actionable: true,
        });
      }
    }

    return trends;
  }

  private async detectAnomalies(tenantId: string): Promise<any[]> {
    // Detectar anomalias nos dados
    const anomalies = [];

    for (const kpi of this.kpis.values()) {
      if (kpi.tenantId !== tenantId || kpi.history.length < 10) continue;

      const values = kpi.history.slice(-10).map(h => h.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      
      const currentValue = kpi.currentValue;
      const zScore = Math.abs(currentValue - mean) / stdDev;

      if (zScore > 2) { // Anomalia se Z-score > 2
        anomalies.push({
          type: 'anomaly',
          title: `Anomalia detectada em ${kpi.name}`,
          description: `Valor atual (${currentValue.toFixed(2)}) está ${zScore.toFixed(1)} desvios padrão da média`,
          severity: zScore > 3 ? 'high' : 'medium',
          data: { kpiId: kpi.id, zScore, mean, currentValue },
          actionable: true,
          suggestedActions: ['Verificar dados de origem', 'Investigar causas da variação'],
        });
      }
    }

    return anomalies;
  }

  private async generateAIRecommendations(tenantId: string, userId: string): Promise<any[]> {
    // Gerar recomendações usando IA
    const recommendations = [
      {
        type: 'recommendation',
        title: 'Otimizar agendamentos',
        description: 'Há oportunidade de reduzir no-shows implementando lembretes automáticos',
        severity: 'medium',
        data: { potentialImprovement: '15%' },
        actionable: true,
        suggestedActions: ['Configurar lembretes SMS', 'Implementar confirmação online'],
      },
    ];

    return recommendations;
  }

  private async getKPIAlerts(tenantId: string): Promise<any[]> {
    // Buscar alertas ativos de KPIs
    const alerts = [];

    for (const kpi of this.kpis.values()) {
      if (kpi.tenantId !== tenantId) continue;

      const status = this.getKPIStatus(kpi);
      if (status === 'critical' || status === 'warning') {
        alerts.push({
          type: 'alert',
          title: `Alerta: ${kpi.name}`,
          description: `${kpi.name} está ${status === 'critical' ? 'crítico' : 'em atenção'}: ${kpi.currentValue} ${kpi.unit}`,
          severity: status === 'critical' ? 'high' : 'medium',
          data: { kpiId: kpi.id, value: kpi.currentValue },
          actionable: true,
        });
      }
    }

    return alerts;
  }

  private calculateTrend(history: Array<{ date: string; value: number }>): number {
    if (history.length < 2) return 0;

    const first = history[0].value;
    const last = history[history.length - 1].value;
    
    if (first === 0) return 0;
    
    return ((last - first) / first) * 100;
  }

  private getKPIStatus(kpi: ClinicalKPI): 'good' | 'warning' | 'critical' {
    if (!kpi.threshold) return 'good';

    const value = kpi.currentValue;
    
    if (kpi.threshold.critical !== undefined && value <= kpi.threshold.critical) {
      return 'critical';
    }
    
    if (kpi.threshold.warning !== undefined && value <= kpi.threshold.warning) {
      return 'warning';
    }
    
    return 'good';
  }

  private setupDefaultKPIs(): void {
    const defaultKPIs = [
      {
        name: 'Taxa de Ocupação',
        description: 'Percentual de horários ocupados na agenda',
        formula: 'agendamentos_ocupados / total_horarios_disponiveis * 100',
        dataFields: ['appointments', 'availability'],
        updateFrequency: 'daily' as const,
        unit: '%',
        target: 85,
        chartType: 'gauge' as const,
        color: '#10B981',
        alertRules: [
          {
            id: 'occupancy_low',
            condition: 'less_than' as const,
            value: 70,
            severity: 'medium' as const,
            message: 'Taxa de ocupação abaixo do ideal',
            actions: { notify: ['admin'], createTask: true },
            isActive: true,
          },
        ],
        isActive: true,
      },
      {
        name: 'Satisfação do Paciente',
        description: 'Avaliação média dos pacientes',
        formula: 'sum(avaliacoes) / count(avaliacoes)',
        dataFields: ['patient_reviews'],
        updateFrequency: 'daily' as const,
        unit: '⭐',
        target: 4.5,
        chartType: 'number' as const,
        color: '#F59E0B',
        alertRules: [],
        isActive: true,
      },
    ];

    defaultKPIs.forEach(kpiData => {
      const kpi: ClinicalKPI = {
        ...kpiData,
        id: this.generateId('kpi'),
        currentValue: 0,
        lastUpdated: new Date().toISOString(),
        history: [],
        tenantId: 'default',
      };
      
      this.kpis.set(kpi.id, kpi);
    });

    console.log('📊 KPIs padrão configurados');
  }

  private startAutomaticUpdates(): void {
    // Atualizar KPIs automaticamente
    this.updateInterval = setInterval(async () => {
      for (const kpi of this.kpis.values()) {
        if (kpi.isActive && kpi.updateFrequency === 'hourly') {
          await this.updateKPI(kpi.id, kpi.tenantId, 'system');
        }
      }
    }, 60 * 60 * 1000); // A cada hora
  }

  private async loadStoredData(): Promise<void> {
    try {
      // Carregar KPIs
      const kpisData = localStorage.getItem('fisioflow_analytics_kpis');
      if (kpisData) {
        const kpis = JSON.parse(kpisData);
        kpis.forEach((kpi: ClinicalKPI) => {
          this.kpis.set(kpi.id, kpi);
        });
      }

      // Carregar coortes
      const cohortsData = localStorage.getItem('fisioflow_analytics_cohorts');
      if (cohortsData) {
        const cohorts = JSON.parse(cohortsData);
        cohorts.forEach((cohort: PatientCohort) => {
          this.cohorts.set(cohort.id, cohort);
        });
      }

      // Carregar relatórios
      const reportsData = localStorage.getItem('fisioflow_analytics_reports');
      if (reportsData) {
        const reports = JSON.parse(reportsData);
        reports.forEach((report: AnalyticsReport) => {
          this.reports.set(report.id, report);
        });
      }

      // Carregar modelos
      const modelsData = localStorage.getItem('fisioflow_analytics_models');
      if (modelsData) {
        const models = JSON.parse(modelsData);
        models.forEach((model: PredictiveModel) => {
          this.models.set(model.id, model);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados analytics:', error);
    }
  }

  private async saveKPIs(): Promise<void> {
    try {
      const kpis = Array.from(this.kpis.values());
      localStorage.setItem('fisioflow_analytics_kpis', JSON.stringify(kpis));
    } catch (error) {
      console.error('❌ Erro ao salvar KPIs:', error);
    }
  }

  private async saveCohorts(): Promise<void> {
    try {
      const cohorts = Array.from(this.cohorts.values());
      localStorage.setItem('fisioflow_analytics_cohorts', JSON.stringify(cohorts));
    } catch (error) {
      console.error('❌ Erro ao salvar coortes:', error);
    }
  }

  private async saveReports(): Promise<void> {
    try {
      const reports = Array.from(this.reports.values());
      localStorage.setItem('fisioflow_analytics_reports', JSON.stringify(reports));
    } catch (error) {
      console.error('❌ Erro ao salvar relatórios:', error);
    }
  }

  private async saveModels(): Promise<void> {
    try {
      const models = Array.from(this.models.values());
      localStorage.setItem('fisioflow_analytics_models', JSON.stringify(models));
    } catch (error) {
      console.error('❌ Erro ao salvar modelos:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === INSTÂNCIA SINGLETON ===
export const clinicalAnalytics = new ClinicalAnalytics();

// === HOOKS REACT ===
export const useClinicalKPIs = (tenantId: string) => {
  const [kpis, setKPIs] = React.useState<ClinicalKPI[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadKPIs = () => {
      const allKPIs = Array.from(clinicalAnalytics['kpis'].values())
        .filter(kpi => kpi.tenantId === tenantId)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setKPIs(allKPIs);
      setLoading(false);
    };

    loadKPIs();
    
    // Atualizar a cada minuto
    const interval = setInterval(loadKPIs, 60000);
    return () => clearInterval(interval);
  }, [tenantId]);

  return { kpis, loading };
};

export const useAnalyticsInsights = (tenantId: string, userId: string) => {
  const [insights, setInsights] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const refreshInsights = React.useCallback(async () => {
    try {
      setLoading(true);
      const newInsights = await clinicalAnalytics.generateInsights(tenantId, userId);
      setInsights(newInsights);
    } catch (error) {
      console.error('Erro ao carregar insights:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId]);

  React.useEffect(() => {
    refreshInsights();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(refreshInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshInsights]);

  return { insights, loading, refresh: refreshInsights };
};

export default clinicalAnalytics;

// Adicionar import do React
import React from 'react';