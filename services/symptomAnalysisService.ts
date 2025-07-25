import {
  SymptomDiaryEntry,
  SymptomAnalysis,
  SymptomInsight,
  SymptomAlert,
  SymptomTrend,
  PainLocation,
} from '../types';

export class SymptomAnalysisService {
  /**
   * Analisa tendências nos dados de sintomas
   */
  static analyzeTrends(
    entries: SymptomDiaryEntry[],
    days: number = 30
  ): SymptomTrend[] {
    if (entries.length < 2) return [];

    const sortedEntries = [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-days);

    const trends: SymptomTrend[] = [];

    // Análise de tendência da dor
    const painTrend = this.calculateTrend(
      sortedEntries.map((e) => ({ date: e.date, value: e.overallPainLevel })),
      'pain',
      'Nível de Dor'
    );
    if (painTrend) trends.push(painTrend);

    // Análise de tendência da energia
    const energyTrend = this.calculateTrend(
      sortedEntries.map((e) => ({ date: e.date, value: e.energyLevel })),
      'energy',
      'Nível de Energia'
    );
    if (energyTrend) trends.push(energyTrend);

    // Análise de tendência do sono
    const sleepTrend = this.calculateTrend(
      sortedEntries.map((e) => ({ date: e.date, value: e.sleepQuality })),
      'sleep',
      'Qualidade do Sono'
    );
    if (sleepTrend) trends.push(sleepTrend);

    // Análise de tendência do humor
    const moodTrend = this.calculateTrend(
      sortedEntries.map((e) => ({ date: e.date, value: e.moodLevel })),
      'mood',
      'Nível de Humor'
    );
    if (moodTrend) trends.push(moodTrend);

    return trends;
  }

  /**
   * Calcula tendência linear para uma série de dados
   */
  private static calculateTrend(
    data: Array<{ date: string; value: number }>,
    metric: string,
    label: string
  ): SymptomTrend | null {
    if (data.length < 2) return null;

    // Converter datas para números (dias desde a primeira entrada)
    const firstDate = new Date(data[0].date).getTime();
    const points = data.map((item, index) => ({
      x: (new Date(item.date).getTime() - firstDate) / (1000 * 60 * 60 * 24), // dias
      y: item.value,
    }));

    // Calcular regressão linear usando método dos mínimos quadrados
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcular coeficiente de correlação (R²)
    const meanY = sumY / n;
    const totalVariation = points.reduce(
      (sum, p) => sum + Math.pow(p.y - meanY, 2),
      0
    );
    const residualVariation = points.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);

    const rSquared =
      totalVariation > 0 ? 1 - residualVariation / totalVariation : 0;

    // Determinar direção da tendência
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.1) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Calcular significância estatística (teste t simples)
    const standardError =
      Math.sqrt(residualVariation / (n - 2)) /
      Math.sqrt(sumXX - (sumX * sumX) / n);
    const tStatistic = Math.abs(slope / standardError);
    const isSignificant = tStatistic > 2.0; // aproximadamente p < 0.05 para n > 10

    // Projeção para os próximos 7 dias
    const lastDate = new Date(data[data.length - 1].date);
    const projectedValues = [];
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(lastDate.getDate() + i);
      const futureDays =
        (futureDate.getTime() - firstDate) / (1000 * 60 * 60 * 24);
      const projectedValue = slope * futureDays + intercept;

      projectedValues.push({
        date: futureDate.toISOString().split('T')[0],
        value: Math.max(0, Math.min(10, projectedValue)), // Limitar entre 0 e 10
      });
    }

    return {
      id: `trend_${metric}_${Date.now()}`,
      metric,
      label,
      direction,
      slope,
      confidence: rSquared,
      isSignificant,
      period: {
        start: data[0].date,
        end: data[data.length - 1].date,
        days: data.length,
      },
      currentValue: data[data.length - 1].value,
      averageValue: meanY,
      projectedValues,
      description: this.generateTrendDescription(
        direction,
        slope,
        rSquared,
        label
      ),
    };
  }

  /**
   * Gera descrição textual da tendência
   */
  private static generateTrendDescription(
    direction: 'increasing' | 'decreasing' | 'stable',
    slope: number,
    confidence: number,
    label: string
  ): string {
    const confidenceText =
      confidence > 0.7 ? 'forte' : confidence > 0.4 ? 'moderada' : 'fraca';

    switch (direction) {
      case 'increasing':
        return `${label} apresenta tendência de ${Math.abs(slope) > 0.5 ? 'forte' : 'leve'} aumento (confiança ${confidenceText})`;
      case 'decreasing':
        return `${label} apresenta tendência de ${Math.abs(slope) > 0.5 ? 'forte' : 'leve'} diminuição (confiança ${confidenceText})`;
      case 'stable':
        return `${label} mantém-se relativamente estável (confiança ${confidenceText})`;
      default:
        return `Tendência indeterminada para ${label}`;
    }
  }

  /**
   * Identifica padrões nos dados de sintomas
   */
  static identifyPatterns(entries: SymptomDiaryEntry[]): SymptomInsight[] {
    const insights: SymptomInsight[] = [];

    // Padrão de piora nos fins de semana
    const weekendPattern = this.analyzeWeekendPattern(entries);
    if (weekendPattern) insights.push(weekendPattern);

    // Padrão de correlação entre sintomas
    const correlationPatterns = this.analyzeCorrelationPatterns(entries);
    insights.push(...correlationPatterns);

    // Padrão de medicação vs dor
    const medicationPattern = this.analyzeMedicationPattern(entries);
    if (medicationPattern) insights.push(medicationPattern);

    // Padrão de exercícios vs sintomas
    const exercisePattern = this.analyzeExercisePattern(entries);
    if (exercisePattern) insights.push(exercisePattern);

    // Padrão de localização da dor
    const painLocationPattern = this.analyzePainLocationPattern(entries);
    if (painLocationPattern) insights.push(painLocationPattern);

    return insights;
  }

  /**
   * Analisa padrão de fins de semana
   */
  private static analyzeWeekendPattern(
    entries: SymptomDiaryEntry[]
  ): SymptomInsight | null {
    const weekendEntries = entries.filter((entry) => {
      const dayOfWeek = new Date(entry.date).getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou Sábado
    });

    const weekdayEntries = entries.filter((entry) => {
      const dayOfWeek = new Date(entry.date).getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Segunda a Sexta
    });

    if (weekendEntries.length < 2 || weekdayEntries.length < 2) return null;

    const weekendAvgPain =
      weekendEntries.reduce((sum, e) => sum + e.overallPainLevel, 0) /
      weekendEntries.length;
    const weekdayAvgPain =
      weekdayEntries.reduce((sum, e) => sum + e.overallPainLevel, 0) /
      weekdayEntries.length;

    const difference = weekendAvgPain - weekdayAvgPain;

    if (Math.abs(difference) > 1.0) {
      return {
        id: `pattern_weekend_${Date.now()}`,
        type: 'pattern',
        title:
          difference > 0
            ? 'Piora nos Fins de Semana'
            : 'Melhora nos Fins de Semana',
        description: `Dor ${difference > 0 ? 'aumenta' : 'diminui'} em média ${Math.abs(difference).toFixed(1)} pontos nos fins de semana`,
        severity: Math.abs(difference) > 2 ? 'high' : 'medium',
        recommendation:
          difference > 0
            ? 'Considere manter rotina de exercícios e cuidados nos fins de semana'
            : 'Aproveite os fins de semana para relaxamento e recuperação',
        confidence: 0.8,
        affectedMetrics: ['pain'],
        detectedAt: new Date().toISOString(),
        basedOnEntries: weekendEntries.length + weekdayEntries.length,
      };
    }

    return null;
  }

  /**
   * Analisa correlações entre sintomas
   */
  private static analyzeCorrelationPatterns(
    entries: SymptomDiaryEntry[]
  ): SymptomInsight[] {
    if (entries.length < 5) return [];

    const insights: SymptomInsight[] = [];

    // Correlação dor vs energia
    const painEnergyCorr = this.calculateCorrelation(
      entries.map((e) => e.overallPainLevel),
      entries.map((e) => e.energyLevel)
    );

    if (Math.abs(painEnergyCorr) > 0.6) {
      insights.push({
        id: `correlation_pain_energy_${Date.now()}`,
        type: 'correlation',
        title:
          painEnergyCorr < 0
            ? 'Dor Reduz Energia'
            : 'Dor Aumenta com Baixa Energia',
        description: `Correlação ${painEnergyCorr < 0 ? 'negativa' : 'positiva'} forte entre dor e energia (${painEnergyCorr.toFixed(2)})`,
        severity: 'medium',
        recommendation:
          painEnergyCorr < 0
            ? 'Foque em atividades que preservem energia quando a dor estiver alta'
            : 'Trabalhe no aumento dos níveis de energia para reduzir a dor',
        confidence: Math.abs(painEnergyCorr),
        affectedMetrics: ['pain', 'energy'],
        detectedAt: new Date().toISOString(),
        basedOnEntries: entries.length,
      });
    }

    // Correlação sono vs humor
    const sleepMoodCorr = this.calculateCorrelation(
      entries.map((e) => e.sleepQuality),
      entries.map((e) => e.moodLevel)
    );

    if (Math.abs(sleepMoodCorr) > 0.6) {
      insights.push({
        id: `correlation_sleep_mood_${Date.now()}`,
        type: 'correlation',
        title: 'Sono Afeta Humor',
        description: `Correlação ${sleepMoodCorr > 0 ? 'positiva' : 'negativa'} forte entre qualidade do sono e humor (${sleepMoodCorr.toFixed(2)})`,
        severity: 'medium',
        recommendation:
          'Priorize a qualidade do sono para melhorar o bem-estar emocional',
        confidence: Math.abs(sleepMoodCorr),
        affectedMetrics: ['sleep', 'mood'],
        detectedAt: new Date().toISOString(),
        basedOnEntries: entries.length,
      });
    }

    return insights;
  }

  /**
   * Calcula correlação de Pearson entre duas séries
   */
  private static calculateCorrelation(
    values1: number[],
    values2: number[]
  ): number {
    if (values1.length !== values2.length || values1.length < 2) return 0;

    const n = values1.length;
    const mean1 = values1.reduce((a, b) => a + b, 0) / n;
    const mean2 = values2.reduce((a, b) => a + b, 0) / n;

    const numerator = values1.reduce(
      (sum, val1, i) => sum + (val1 - mean1) * (values2[i] - mean2),
      0
    );

    const denominator1 = Math.sqrt(
      values1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0)
    );
    const denominator2 = Math.sqrt(
      values2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0)
    );

    const denominator = denominator1 * denominator2;
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Analisa padrão de medicação vs dor
   */
  private static analyzeMedicationPattern(
    entries: SymptomDiaryEntry[]
  ): SymptomInsight | null {
    const entriesWithMedication = entries.filter(
      (e) => e.medications && e.medications.length > 0
    );
    const entriesWithoutMedication = entries.filter(
      (e) => !e.medications || e.medications.length === 0
    );

    if (entriesWithMedication.length < 2 || entriesWithoutMedication.length < 2)
      return null;

    const avgPainWithMed =
      entriesWithMedication.reduce((sum, e) => sum + e.overallPainLevel, 0) /
      entriesWithMedication.length;
    const avgPainWithoutMed =
      entriesWithoutMedication.reduce((sum, e) => sum + e.overallPainLevel, 0) /
      entriesWithoutMedication.length;

    const difference = avgPainWithoutMed - avgPainWithMed;

    if (difference > 1.0) {
      return {
        id: `pattern_medication_${Date.now()}`,
        type: 'medication',
        title: 'Medicação Reduz Dor',
        description: `Dor é ${difference.toFixed(1)} pontos menor em dias com medicação`,
        severity: 'low',
        recommendation:
          'Continue seguindo o protocolo de medicação conforme orientação médica',
        confidence: 0.7,
        affectedMetrics: ['pain'],
        detectedAt: new Date().toISOString(),
        basedOnEntries:
          entriesWithMedication.length + entriesWithoutMedication.length,
      };
    }

    return null;
  }

  /**
   * Analisa padrão de exercícios vs sintomas
   */
  private static analyzeExercisePattern(
    entries: SymptomDiaryEntry[]
  ): SymptomInsight | null {
    const entriesWithExercise = entries.filter(
      (e) => e.exercisesCompleted && e.exercisesCompleted.length > 0
    );
    const entriesWithoutExercise = entries.filter(
      (e) => !e.exercisesCompleted || e.exercisesCompleted.length === 0
    );

    if (entriesWithExercise.length < 2 || entriesWithoutExercise.length < 2)
      return null;

    const avgPainWithExercise =
      entriesWithExercise.reduce((sum, e) => sum + e.overallPainLevel, 0) /
      entriesWithExercise.length;
    const avgPainWithoutExercise =
      entriesWithoutExercise.reduce((sum, e) => sum + e.overallPainLevel, 0) /
      entriesWithoutExercise.length;

    const avgEnergyWithExercise =
      entriesWithExercise.reduce((sum, e) => sum + e.energyLevel, 0) /
      entriesWithExercise.length;
    const avgEnergyWithoutExercise =
      entriesWithoutExercise.reduce((sum, e) => sum + e.energyLevel, 0) /
      entriesWithoutExercise.length;

    const painDifference = avgPainWithoutExercise - avgPainWithExercise;
    const energyDifference = avgEnergyWithExercise - avgEnergyWithoutExercise;

    if (painDifference > 0.5 || energyDifference > 0.5) {
      return {
        id: `pattern_exercise_${Date.now()}`,
        type: 'exercise',
        title: 'Exercícios Melhoram Sintomas',
        description: `Em dias com exercícios: dor ${painDifference > 0 ? 'diminui' : 'aumenta'} ${Math.abs(painDifference).toFixed(1)} pontos, energia ${energyDifference > 0 ? 'aumenta' : 'diminui'} ${Math.abs(energyDifference).toFixed(1)} pontos`,
        severity: 'low',
        recommendation:
          'Mantenha consistência nos exercícios para melhor controle dos sintomas',
        confidence: 0.75,
        affectedMetrics: ['pain', 'energy'],
        detectedAt: new Date().toISOString(),
        basedOnEntries:
          entriesWithExercise.length + entriesWithoutExercise.length,
      };
    }

    return null;
  }

  /**
   * Analisa padrão de localização da dor
   */
  private static analyzePainLocationPattern(
    entries: SymptomDiaryEntry[]
  ): SymptomInsight | null {
    const allLocations: PainLocation[] = [];
    entries.forEach((entry) => {
      if (entry.painLocations) {
        allLocations.push(...entry.painLocations);
      }
    });

    if (allLocations.length < 5) return null;

    // Encontrar região mais afetada
    const regionCounts: Record<
      string,
      { count: number; avgIntensity: number; totalIntensity: number }
    > = {};

    allLocations.forEach((location) => {
      if (!regionCounts[location.region]) {
        regionCounts[location.region] = {
          count: 0,
          avgIntensity: 0,
          totalIntensity: 0,
        };
      }
      regionCounts[location.region].count++;
      regionCounts[location.region].totalIntensity += location.intensity;
    });

    // Calcular intensidade média por região
    Object.keys(regionCounts).forEach((region) => {
      const data = regionCounts[region];
      data.avgIntensity = data.totalIntensity / data.count;
    });

    // Encontrar região mais problemática (frequência * intensidade)
    const mostProblematicRegion = Object.entries(regionCounts)
      .map(([region, data]) => ({
        region,
        score: data.count * data.avgIntensity,
        ...data,
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (mostProblematicRegion && mostProblematicRegion.count >= 3) {
      return {
        id: `pattern_pain_location_${Date.now()}`,
        type: 'pain_location',
        title: 'Região Mais Afetada Identificada',
        description: `${mostProblematicRegion.region} é a região mais problemática (${mostProblematicRegion.count} ocorrências, intensidade média ${mostProblematicRegion.avgIntensity.toFixed(1)})`,
        severity: mostProblematicRegion.avgIntensity > 7 ? 'high' : 'medium',
        recommendation:
          'Foque tratamentos específicos nesta região e comunique ao fisioterapeuta',
        confidence: 0.8,
        affectedMetrics: ['pain'],
        detectedAt: new Date().toISOString(),
        basedOnEntries: entries.length,
      };
    }

    return null;
  }

  /**
   * Gera alertas baseados em análises
   */
  static generateAlerts(
    entries: SymptomDiaryEntry[],
    trends: SymptomTrend[],
    insights: SymptomInsight[]
  ): SymptomAlert[] {
    const alerts: SymptomAlert[] = [];

    // Alerta de tendência preocupante
    const worseTrends = trends.filter(
      (t) =>
        (t.metric === 'pain' &&
          t.direction === 'increasing' &&
          t.isSignificant) ||
        ((t.metric === 'energy' ||
          t.metric === 'sleep' ||
          t.metric === 'mood') &&
          t.direction === 'decreasing' &&
          t.isSignificant)
    );

    worseTrends.forEach((trend) => {
      alerts.push({
        id: `alert_trend_${trend.id}`,
        type: 'trend_warning',
        severity: trend.confidence > 0.7 ? 'high' : 'medium',
        title: `Tendência Preocupante: ${trend.label}`,
        message: `${trend.description}. Recomenda-se acompanhamento mais próximo.`,
        triggerCondition: `Tendência ${trend.direction} significativa em ${trend.label}`,
        recommendations: [
          'Entre em contato com seu fisioterapeuta',
          'Revise seu plano de tratamento atual',
          'Considere ajustes na medicação (consulte médico)',
        ],
        createdAt: new Date().toISOString(),
        isRead: false,
        requiresAction: true,
      });
    });

    // Alerta de dor persistente alta
    const recentEntries = entries.slice(-7); // Últimos 7 dias
    const avgRecentPain =
      recentEntries.length > 0
        ? recentEntries.reduce((sum, e) => sum + e.overallPainLevel, 0) /
          recentEntries.length
        : 0;

    if (avgRecentPain > 7 && recentEntries.length >= 3) {
      alerts.push({
        id: `alert_high_pain_${Date.now()}`,
        type: 'high_symptom',
        severity: 'high',
        title: 'Dor Persistente Alta',
        message: `Dor média de ${avgRecentPain.toFixed(1)}/10 nos últimos ${recentEntries.length} dias.`,
        triggerCondition: 'Dor média > 7 por 3+ dias consecutivos',
        recommendations: [
          'Agende consulta de emergência se necessário',
          'Revise e ajuste medicação para dor',
          'Aplique técnicas de alívio imediato',
          'Considere modificar atividades diárias',
        ],
        createdAt: new Date().toISOString(),
        isRead: false,
        requiresAction: true,
      });
    }

    // Alerta de insights de alta prioridade
    const criticalInsights = insights.filter((i) => i.severity === 'high');
    criticalInsights.forEach((insight) => {
      alerts.push({
        id: `alert_insight_${insight.id}`,
        type: 'pattern_detected',
        severity: 'medium',
        title: `Padrão Detectado: ${insight.title}`,
        message: insight.description,
        triggerCondition: `Padrão identificado: ${insight.type}`,
        recommendations: [insight.recommendation],
        createdAt: new Date().toISOString(),
        isRead: false,
        requiresAction: false,
      });
    });

    return alerts;
  }

  /**
   * Análise completa dos sintomas
   */
  static performCompleteAnalysis(
    entries: SymptomDiaryEntry[],
    patientId: string,
    tenantId: string
  ): SymptomAnalysis {
    const trends = this.analyzeTrends(entries);
    const insights = this.identifyPatterns(entries);
    const alerts = this.generateAlerts(entries, trends, insights);

    // Calcular estatísticas gerais
    const recentEntries = entries.slice(-30); // Últimos 30 dias
    const stats = {
      totalEntries: entries.length,
      recentEntries: recentEntries.length,
      avgPain:
        recentEntries.length > 0
          ? recentEntries.reduce((sum, e) => sum + e.overallPainLevel, 0) /
            recentEntries.length
          : 0,
      avgEnergy:
        recentEntries.length > 0
          ? recentEntries.reduce((sum, e) => sum + e.energyLevel, 0) /
            recentEntries.length
          : 0,
      avgSleep:
        recentEntries.length > 0
          ? recentEntries.reduce((sum, e) => sum + e.sleepQuality, 0) /
            recentEntries.length
          : 0,
      avgMood:
        recentEntries.length > 0
          ? recentEntries.reduce((sum, e) => sum + e.moodLevel, 0) /
            recentEntries.length
          : 0,
    };

    return {
      id: `analysis_${Date.now()}`,
      patientId,
      tenantId,
      period: {
        start: entries.length > 0 ? entries[0].date : '',
        end: entries.length > 0 ? entries[entries.length - 1].date : '',
        totalDays: entries.length,
      },
      trends,
      insights,
      alerts,
      summary: {
        overallStatus: this.determineOverallStatus(stats, trends, alerts),
        keyFindings: this.generateKeyFindings(trends, insights),
        recommendations: this.generateRecommendations(trends, insights, alerts),
        riskLevel: this.calculateRiskLevel(stats, trends, alerts),
      },
      statistics: stats,
      generatedAt: new Date().toISOString(),
      analysisVersion: '1.0',
    };
  }

  /**
   * Determina status geral do paciente
   */
  private static determineOverallStatus(
    stats: any,
    trends: SymptomTrend[],
    alerts: SymptomAlert[]
  ): 'improving' | 'stable' | 'concerning' | 'critical' {
    const highAlerts = alerts.filter((a) => a.severity === 'high').length;
    const improvingTrends = trends.filter(
      (t) =>
        (t.metric === 'pain' && t.direction === 'decreasing') ||
        ((t.metric === 'energy' ||
          t.metric === 'sleep' ||
          t.metric === 'mood') &&
          t.direction === 'increasing')
    ).length;

    if (highAlerts > 0 || stats.avgPain > 8) return 'critical';
    if (alerts.length > 2 || stats.avgPain > 6) return 'concerning';
    if (improvingTrends > 1) return 'improving';
    return 'stable';
  }

  /**
   * Gera descobertas principais
   */
  private static generateKeyFindings(
    trends: SymptomTrend[],
    insights: SymptomInsight[]
  ): string[] {
    const findings: string[] = [];

    // Adicionar tendências significativas
    trends
      .filter((t) => t.isSignificant)
      .forEach((trend) => {
        findings.push(trend.description);
      });

    // Adicionar insights de alta confiança
    insights
      .filter((i) => i.confidence > 0.7)
      .forEach((insight) => {
        findings.push(insight.description);
      });

    return findings.slice(0, 5); // Máximo 5 descobertas
  }

  /**
   * Gera recomendações baseadas na análise
   */
  private static generateRecommendations(
    trends: SymptomTrend[],
    insights: SymptomInsight[],
    alerts: SymptomAlert[]
  ): string[] {
    const recommendations = new Set<string>();

    // Recomendações de tendências
    trends.forEach((trend) => {
      if (trend.metric === 'pain' && trend.direction === 'increasing') {
        recommendations.add('Reavalie estratégias de controle da dor');
      }
      if (trend.metric === 'energy' && trend.direction === 'decreasing') {
        recommendations.add('Foque em atividades que aumentem a energia');
      }
    });

    // Recomendações de insights
    insights.forEach((insight) => {
      if (insight.recommendation) {
        recommendations.add(insight.recommendation);
      }
    });

    // Recomendações de alertas
    alerts.forEach((alert) => {
      alert.recommendations.forEach((rec) => recommendations.add(rec));
    });

    return Array.from(recommendations).slice(0, 8);
  }

  /**
   * Calcula nível de risco
   */
  private static calculateRiskLevel(
    stats: any,
    trends: SymptomTrend[],
    alerts: SymptomAlert[]
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Fatores de risco baseados em estatísticas
    if (stats.avgPain > 7) riskScore += 3;
    else if (stats.avgPain > 5) riskScore += 1;

    if (stats.avgEnergy < 2) riskScore += 2;
    if (stats.avgSleep < 2) riskScore += 2;
    if (stats.avgMood < 2) riskScore += 2;

    // Fatores de risco baseados em tendências
    const worseningTrends = trends.filter(
      (t) =>
        (t.metric === 'pain' && t.direction === 'increasing') ||
        ((t.metric === 'energy' ||
          t.metric === 'sleep' ||
          t.metric === 'mood') &&
          t.direction === 'decreasing')
    );
    riskScore += worseningTrends.length;

    // Fatores de risco baseados em alertas
    const highAlerts = alerts.filter((a) => a.severity === 'high').length;
    riskScore += highAlerts * 2;

    if (riskScore >= 6) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }
}
