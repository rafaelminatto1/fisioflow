import React, { useState, useMemo } from 'react';
import {
  SymptomDiaryEntry,
  SymptomReport,
  Patient,
  SymptomAnalysis,
} from '../types';
import { SymptomAnalysisService } from '../services/symptomAnalysisService';

interface SymptomReportsProps {
  entries: SymptomDiaryEntry[];
  patient: Patient;
  onExportReport?: (
    report: SymptomReport,
    format: 'pdf' | 'excel' | 'csv'
  ) => void;
}

type ReportType =
  | 'weekly'
  | 'monthly'
  | 'period_comparison'
  | 'detailed_analysis';
type ComparisonPeriod = 'week' | 'month' | 'quarter';

interface ReportConfig {
  type: ReportType;
  title: string;
  description: string;
  icon: string;
}

const REPORT_CONFIGS: ReportConfig[] = [
  {
    type: 'weekly',
    title: 'Relatório Semanal',
    description:
      'Resumo dos últimos 7 dias com tendências e métricas principais',
    icon: '📅',
  },
  {
    type: 'monthly',
    title: 'Relatório Mensal',
    description: 'Análise completa do mês com padrões e comparações',
    icon: '📊',
  },
  {
    type: 'period_comparison',
    title: 'Comparação de Períodos',
    description: 'Compare diferentes períodos para avaliar progresso',
    icon: '📈',
  },
  {
    type: 'detailed_analysis',
    title: 'Análise Detalhada',
    description: 'Relatório completo com todos os insights e recomendações',
    icon: '🔍',
  },
];

const generateSymptomReport = (
  entries: SymptomDiaryEntry[],
  patient: Patient,
  type: ReportType,
  config: any = {}
): SymptomReport => {
  const analysis = SymptomAnalysisService.performCompleteAnalysis(
    entries,
    patient.id,
    patient.tenantId
  );

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calcular períodos
  const endDate = new Date();
  const startDate = new Date();

  switch (type) {
    case 'weekly':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'period_comparison':
      if (config.customPeriod) {
        startDate.setTime(new Date(config.customPeriod.start).getTime());
        endDate.setTime(new Date(config.customPeriod.end).getTime());
      }
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  const periodEntries = sortedEntries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });

  // Métricas do período
  const metrics = {
    totalDays: periodEntries.length,
    avgPain:
      periodEntries.length > 0
        ? periodEntries.reduce((sum, e) => sum + e.overallPainLevel, 0) /
          periodEntries.length
        : 0,
    maxPain:
      periodEntries.length > 0
        ? Math.max(...periodEntries.map((e) => e.overallPainLevel))
        : 0,
    minPain:
      periodEntries.length > 0
        ? Math.min(...periodEntries.map((e) => e.overallPainLevel))
        : 0,
    avgEnergy:
      periodEntries.length > 0
        ? periodEntries.reduce((sum, e) => sum + e.energyLevel, 0) /
          periodEntries.length
        : 0,
    avgSleep:
      periodEntries.length > 0
        ? periodEntries.reduce((sum, e) => sum + e.sleepQuality, 0) /
          periodEntries.length
        : 0,
    avgMood:
      periodEntries.length > 0
        ? periodEntries.reduce((sum, e) => sum + e.moodLevel, 0) /
          periodEntries.length
        : 0,
    goodDays: periodEntries.filter((e) => e.overallPainLevel <= 3).length,
    moderateDays: periodEntries.filter(
      (e) => e.overallPainLevel > 3 && e.overallPainLevel <= 6
    ).length,
    badDays: periodEntries.filter((e) => e.overallPainLevel > 6).length,
  };

  // Seções do relatório
  const sections = [
    {
      title: 'Resumo Executivo',
      content: generateExecutiveSummary(analysis, metrics, type),
      type: 'text' as const,
    },
    {
      title: 'Métricas Principais',
      content: generateMetricsSection(metrics),
      type: 'metrics' as const,
    },
    {
      title: 'Tendências Identificadas',
      content: analysis.trends,
      type: 'trends' as const,
    },
    {
      title: 'Padrões e Insights',
      content: analysis.insights,
      type: 'insights' as const,
    },
  ];

  if (type === 'detailed_analysis') {
    sections.push(
      {
        title: 'Análise de Medicamentos',
        content: generateMedicationAnalysis(periodEntries),
        type: 'medication' as const,
      },
      {
        title: 'Análise de Exercícios',
        content: generateExerciseAnalysis(periodEntries),
        type: 'exercise' as const,
      },
      {
        title: 'Localizações de Dor',
        content: generatePainLocationAnalysis(periodEntries),
        type: 'pain_locations' as const,
      }
    );
  }

  return {
    id: `report_${Date.now()}`,
    patientId: patient.id,
    tenantId: patient.tenantId,
    type,
    title: getReportTitle(type, startDate, endDate),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      totalDays: Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
    },
    metrics,
    sections,
    summary: analysis.summary,
    generatedAt: new Date().toISOString(),
    generatedBy: 'system',
  };
};

const generateExecutiveSummary = (
  analysis: SymptomAnalysis,
  metrics: any,
  reportType: ReportType
): string => {
  const status = analysis.summary.overallStatus;
  const avgPain = metrics.avgPain.toFixed(1);
  const totalDays = metrics.totalDays;

  let summary = `Durante o período analisado de ${totalDays} dias, `;

  if (status === 'improving') {
    summary += `o paciente apresentou sinais de melhora, com dor média de ${avgPain}/10. `;
  } else if (status === 'stable') {
    summary += `o paciente manteve-se estável, com dor média de ${avgPain}/10. `;
  } else if (status === 'concerning') {
    summary += `foram identificados sinais preocupantes, com dor média de ${avgPain}/10. `;
  } else {
    summary += `o quadro requer atenção imediata, com dor média de ${avgPain}/10. `;
  }

  summary += `Foram registrados ${metrics.goodDays} dias bons, ${metrics.moderateDays} dias moderados e ${metrics.badDays} dias difíceis. `;

  if (analysis.trends.length > 0) {
    const significantTrends = analysis.trends.filter((t) => t.isSignificant);
    if (significantTrends.length > 0) {
      summary += `Detectadas ${significantTrends.length} tendências significativas que requerem acompanhamento.`;
    }
  }

  return summary;
};

const generateMetricsSection = (metrics: any) => ({
  avgPain: metrics.avgPain,
  painRange: { min: metrics.minPain, max: metrics.maxPain },
  avgEnergy: metrics.avgEnergy,
  avgSleep: metrics.avgSleep,
  avgMood: metrics.avgMood,
  dayDistribution: {
    good: metrics.goodDays,
    moderate: metrics.moderateDays,
    bad: metrics.badDays,
  },
  totalDays: metrics.totalDays,
});

const generateMedicationAnalysis = (entries: SymptomDiaryEntry[]) => {
  const medicationEntries = entries.filter(
    (e) => e.medications && e.medications.length > 0
  );
  const nonMedicationEntries = entries.filter(
    (e) => !e.medications || e.medications.length === 0
  );

  const medicationStats = {
    daysWithMedication: medicationEntries.length,
    avgPainWithMeds:
      medicationEntries.length > 0
        ? medicationEntries.reduce((sum, e) => sum + e.overallPainLevel, 0) /
          medicationEntries.length
        : 0,
    avgPainWithoutMeds:
      nonMedicationEntries.length > 0
        ? nonMedicationEntries.reduce((sum, e) => sum + e.overallPainLevel, 0) /
          nonMedicationEntries.length
        : 0,
    mostUsedMedications: {} as Record<string, number>,
  };

  // Contar medicamentos mais usados
  medicationEntries.forEach((entry) => {
    entry.medications?.forEach((med) => {
      if (med.name) {
        medicationStats.mostUsedMedications[med.name] =
          (medicationStats.mostUsedMedications[med.name] || 0) + 1;
      }
    });
  });

  return medicationStats;
};

const generateExerciseAnalysis = (entries: SymptomDiaryEntry[]) => {
  const exerciseEntries = entries.filter(
    (e) => e.exercisesCompleted && e.exercisesCompleted.length > 0
  );
  const nonExerciseEntries = entries.filter(
    (e) => !e.exercisesCompleted || e.exercisesCompleted.length === 0
  );

  return {
    daysWithExercise: exerciseEntries.length,
    adherenceRate:
      entries.length > 0 ? (exerciseEntries.length / entries.length) * 100 : 0,
    avgPainWithExercise:
      exerciseEntries.length > 0
        ? exerciseEntries.reduce((sum, e) => sum + e.overallPainLevel, 0) /
          exerciseEntries.length
        : 0,
    avgPainWithoutExercise:
      nonExerciseEntries.length > 0
        ? nonExerciseEntries.reduce((sum, e) => sum + e.overallPainLevel, 0) /
          nonExerciseEntries.length
        : 0,
    avgEnergyWithExercise:
      exerciseEntries.length > 0
        ? exerciseEntries.reduce((sum, e) => sum + e.energyLevel, 0) /
          exerciseEntries.length
        : 0,
  };
};

const generatePainLocationAnalysis = (entries: SymptomDiaryEntry[]) => {
  const locationCounts: Record<
    string,
    { count: number; totalIntensity: number; avgIntensity: number }
  > = {};

  entries.forEach((entry) => {
    entry.painLocations?.forEach((location) => {
      if (!locationCounts[location.region]) {
        locationCounts[location.region] = {
          count: 0,
          totalIntensity: 0,
          avgIntensity: 0,
        };
      }
      locationCounts[location.region].count++;
      locationCounts[location.region].totalIntensity += location.intensity;
    });
  });

  // Calcular médias
  Object.keys(locationCounts).forEach((region) => {
    const data = locationCounts[region];
    data.avgIntensity = data.totalIntensity / data.count;
  });

  return locationCounts;
};

const getReportTitle = (
  type: ReportType,
  startDate: Date,
  endDate: Date
): string => {
  const start = startDate.toLocaleDateString('pt-BR');
  const end = endDate.toLocaleDateString('pt-BR');

  switch (type) {
    case 'weekly':
      return `Relatório Semanal - ${start} a ${end}`;
    case 'monthly':
      return `Relatório Mensal - ${start} a ${end}`;
    case 'period_comparison':
      return `Comparação de Períodos - ${start} a ${end}`;
    case 'detailed_analysis':
      return `Análise Detalhada - ${start} a ${end}`;
    default:
      return `Relatório de Sintomas - ${start} a ${end}`;
  }
};

export const SymptomReports: React.FC<SymptomReportsProps> = ({
  entries,
  patient,
  onExportReport,
}) => {
  const [selectedReportType, setSelectedReportType] =
    useState<ReportType>('weekly');
  const [customPeriod, setCustomPeriod] = useState({ start: '', end: '' });
  const [generatedReport, setGeneratedReport] = useState<SymptomReport | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // Simular delay de geração
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const config =
        selectedReportType === 'period_comparison' &&
        customPeriod.start &&
        customPeriod.end
          ? { customPeriod }
          : {};

      const report = generateSymptomReport(
        entries,
        patient,
        selectedReportType,
        config
      );
      setGeneratedReport(report);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (generatedReport && onExportReport) {
      onExportReport(generatedReport, format);
    }
  };

  const canGenerate =
    selectedReportType !== 'period_comparison' ||
    (customPeriod.start && customPeriod.end);

  return (
    <div className="space-y-6">
      {/* Seleção do Tipo de Relatório */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Gerar Relatório de Sintomas
        </h2>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {REPORT_CONFIGS.map((config) => (
            <div
              key={config.type}
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                selectedReportType === config.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedReportType(config.type)}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{config.icon}</div>
                <div>
                  <h3 className="font-medium text-gray-900">{config.title}</h3>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Período Customizado */}
        {selectedReportType === 'period_comparison' && (
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <h3 className="mb-3 font-medium text-gray-900">
              Período Personalizado
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={customPeriod.start}
                  onChange={(e) =>
                    setCustomPeriod((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Data Final
                </label>
                <input
                  type="date"
                  value={customPeriod.end}
                  onChange={(e) =>
                    setCustomPeriod((prev) => ({
                      ...prev,
                      end: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerateReport}
          disabled={!canGenerate || isGenerating || entries.length === 0}
          className="w-full rounded-md bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isGenerating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              <span>Gerando Relatório...</span>
            </div>
          ) : (
            '📊 Gerar Relatório'
          )}
        </button>

        {entries.length === 0 && (
          <p className="mt-2 text-center text-sm text-gray-600">
            É necessário ter registros de sintomas para gerar relatórios
          </p>
        )}
      </div>

      {/* Relatório Gerado */}
      {generatedReport && (
        <div className="overflow-hidden rounded-lg border bg-white">
          {/* Header do Relatório */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {generatedReport.title}
                </h2>
                <p className="text-sm text-gray-600">
                  Paciente: {patient.name} • Gerado em{' '}
                  {new Date(generatedReport.generatedAt).toLocaleString(
                    'pt-BR'
                  )}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExport('pdf')}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                >
                  📊 Excel
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  📋 CSV
                </button>
              </div>
            </div>
          </div>

          {/* Conteúdo do Relatório */}
          <div className="space-y-8 p-6">
            {generatedReport.sections.map((section, index) => (
              <div key={index}>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  {section.title}
                </h3>

                {section.type === 'text' && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="leading-relaxed text-gray-700">
                      {section.content as string}
                    </p>
                  </div>
                )}

                {section.type === 'metrics' && (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {Object.entries(section.content as any).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="rounded-lg bg-gray-50 p-4 text-center"
                        >
                          <div className="text-2xl font-bold text-blue-600">
                            {typeof value === 'number'
                              ? value.toFixed(1)
                              : JSON.stringify(value)}
                          </div>
                          <div className="text-sm capitalize text-gray-600">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {section.type === 'trends' && (
                  <div className="space-y-3">
                    {(section.content as any[]).map((trend, i) => (
                      <div key={i} className="rounded-lg bg-gray-50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            {trend.label}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              trend.isSignificant
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {trend.direction === 'increasing'
                              ? '📈'
                              : trend.direction === 'decreasing'
                                ? '📉'
                                : '➡️'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {trend.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {section.type === 'insights' && (
                  <div className="space-y-3">
                    {(section.content as any[]).map((insight, i) => (
                      <div key={i} className="rounded-lg bg-gray-50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            {insight.title}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              insight.severity === 'high'
                                ? 'bg-red-100 text-red-700'
                                : insight.severity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {insight.type}
                          </span>
                        </div>
                        <p className="mb-2 text-sm text-gray-600">
                          {insight.description}
                        </p>
                        <div className="rounded bg-white p-2">
                          <p className="text-sm text-blue-800">
                            💡 {insight.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SymptomReports;
