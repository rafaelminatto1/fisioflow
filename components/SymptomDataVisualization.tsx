import React, { useState, useMemo } from 'react';

import { SymptomDiaryEntry, SymptomAnalysis, Patient } from '../types';

interface SymptomDataVisualizationProps {
  entries: SymptomDiaryEntry[];
  patient: Patient;
  dateRange?: { start: string; end: string };
  onDateRangeChange?: (range: { start: string; end: string }) => void;
}

type ChartType = 'line' | 'bar' | 'heatmap' | 'correlation';
type MetricType = 'pain' | 'energy' | 'sleep' | 'mood' | 'all';

// Componente de gráfico de linha simples (sem dependências externas)
const LineChart: React.FC<{
  data: Array<{ date: string; value: number; label?: string }>;
  title: string;
  color?: string;
  height?: number;
}> = ({ data, title, color = '#3B82F6', height = 200 }) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const points = data
    .map((item, index) => {
      const x = (index / (data.length - 1)) * 300;
      const y = height - ((item.value - minValue) / range) * (height - 40);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 text-lg font-medium text-gray-900">{title}</h3>
      <div className="relative">
        <svg width="300" height={height} className="w-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              y1={height - 20 - ratio * (height - 40)}
              x2="300"
              y2={height - 20 - ratio * (height - 40)}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          ))}

          {/* Data line */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />

          {/* Data points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 300;
            const y =
              height - ((item.value - minValue) / range) * (height - 40);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={color}
                className="hover:r-6 cursor-pointer"
              >
                <title>{`${item.date}: ${item.value}${item.label ? ` - ${item.label}` : ''}`}</title>
              </circle>
            );
          })}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <text
              key={ratio}
              x="-5"
              y={height - 20 - ratio * (height - 40)}
              textAnchor="end"
              className="fill-gray-600 text-xs"
              dy="0.35em"
            >
              {Math.round(minValue + ratio * range)}
            </text>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="mt-2 flex justify-between text-xs text-gray-600">
          <span>{data[0]?.date}</span>
          <span>{data[Math.floor(data.length / 2)]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
};

// Componente de mapa de calor
const HeatmapChart: React.FC<{
  data: Array<{ date: string; hour: number; value: number }>;
  title: string;
}> = ({ data, title }) => {
  const maxValue = Math.max(...data.map((d) => d.value));

  const getColor = (value: number) => {
    const ratio = value / maxValue;
    if (ratio <= 0.25) return '#10B981'; // Verde
    if (ratio <= 0.5) return '#F59E0B'; // Amarelo
    if (ratio <= 0.75) return '#F97316'; // Laranja
    return '#DC2626'; // Vermelho
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dates = [...new Set(data.map((d) => d.date))].slice(-7); // Últimos 7 dias

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 text-lg font-medium text-gray-900">{title}</h3>
      <div className="overflow-x-auto">
        <div className="grid-cols-25 grid gap-1 text-xs">
          {/* Header com horas */}
          <div></div>
          {hours.map((hour) => (
            <div key={hour} className="p-1 text-center text-gray-600">
              {hour}h
            </div>
          ))}

          {/* Dados por dia */}
          {dates.map((date) => (
            <React.Fragment key={date}>
              <div className="p-1 text-right text-gray-600">
                {new Date(date).toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                })}
              </div>
              {hours.map((hour) => {
                const entry = data.find(
                  (d) => d.date === date && d.hour === hour
                );
                const value = entry?.value || 0;
                return (
                  <div
                    key={`${date}-${hour}`}
                    className="h-4 w-4 rounded"
                    style={{
                      backgroundColor: value > 0 ? getColor(value) : '#F3F4F6',
                    }}
                    title={`${date} ${hour}:00 - Valor: ${value}`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="h-3 w-3 rounded bg-green-500"></div>
          <span>Baixo</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-3 w-3 rounded bg-yellow-500"></div>
          <span>Moderado</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-3 w-3 rounded bg-orange-500"></div>
          <span>Alto</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-3 w-3 rounded bg-red-600"></div>
          <span>Muito Alto</span>
        </div>
      </div>
    </div>
  );
};

// Componente de correlação
const CorrelationMatrix: React.FC<{
  entries: SymptomDiaryEntry[];
}> = ({ entries }) => {
  const metrics = [
    'overallPainLevel',
    'energyLevel',
    'sleepQuality',
    'moodLevel',
  ];
  const metricLabels = {
    overallPainLevel: 'Dor',
    energyLevel: 'Energia',
    sleepQuality: 'Sono',
    moodLevel: 'Humor',
  };

  const calculateCorrelation = (metric1: string, metric2: string) => {
    if (metric1 === metric2) return 1;

    const values1 = entries.map(
      (e) => e[metric1 as keyof SymptomDiaryEntry] as number
    );
    const values2 = entries.map(
      (e) => e[metric2 as keyof SymptomDiaryEntry] as number
    );

    const n = values1.length;
    if (n < 2) return 0;

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
  };

  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return correlation > 0 ? '#059669' : '#DC2626';
    if (abs >= 0.5) return correlation > 0 ? '#10B981' : '#F87171';
    if (abs >= 0.3) return correlation > 0 ? '#34D399' : '#FCA5A5';
    return '#E5E7EB';
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 text-lg font-medium text-gray-900">
        Matriz de Correlação
      </h3>
      <div className="grid grid-cols-5 gap-2 text-sm">
        {/* Header */}
        <div></div>
        {metrics.map((metric) => (
          <div
            key={metric}
            className="p-2 text-center font-medium text-gray-700"
          >
            {metricLabels[metric as keyof typeof metricLabels]}
          </div>
        ))}

        {/* Matrix */}
        {metrics.map((metric1) => (
          <React.Fragment key={metric1}>
            <div className="p-2 text-right font-medium text-gray-700">
              {metricLabels[metric1 as keyof typeof metricLabels]}
            </div>
            {metrics.map((metric2) => {
              const correlation = calculateCorrelation(metric1, metric2);
              return (
                <div
                  key={`${metric1}-${metric2}`}
                  className="rounded p-2 text-center font-medium text-white"
                  style={{ backgroundColor: getCorrelationColor(correlation) }}
                  title={`Correlação entre ${metricLabels[metric1 as keyof typeof metricLabels]} e ${metricLabels[metric2 as keyof typeof metricLabels]}: ${correlation.toFixed(2)}`}
                >
                  {correlation.toFixed(2)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <p>
          <strong>Interpretação:</strong>
        </p>
        <p>
          Verde: Correlação positiva forte | Vermelho: Correlação negativa forte
        </p>
        <p>Valores próximos de 1 ou -1 indicam correlação forte</p>
      </div>
    </div>
  );
};

export const SymptomDataVisualization: React.FC<
  SymptomDataVisualizationProps
> = ({ entries, patient, dateRange, onDateRangeChange }) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('pain');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'custom'>(
    '30d'
  );

  // Filtrar entradas por período
  const filteredEntries = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'custom':
        if (dateRange) {
          return entries.filter(
            (entry) =>
              entry.date >= dateRange.start && entry.date <= dateRange.end
          );
        }
        break;
    }

    return entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [entries, timeframe, dateRange]);

  // Preparar dados para gráficos
  const chartData = useMemo(() => {
    const sortedEntries = [...filteredEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const painData = sortedEntries.map((entry) => ({
      date: new Date(entry.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      value: entry.overallPainLevel,
      label: `Dor: ${entry.overallPainLevel}/10`,
    }));

    const energyData = sortedEntries.map((entry) => ({
      date: new Date(entry.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      value: entry.energyLevel,
      label: `Energia: ${entry.energyLevel}/5`,
    }));

    const sleepData = sortedEntries.map((entry) => ({
      date: new Date(entry.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      value: entry.sleepQuality,
      label: `Sono: ${entry.sleepQuality}/5`,
    }));

    const moodData = sortedEntries.map((entry) => ({
      date: new Date(entry.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      value: entry.moodLevel,
      label: `Humor: ${entry.moodLevel}/5`,
    }));

    return { painData, energyData, sleepData, moodData };
  }, [filteredEntries]);

  // Dados para heatmap (simulado - por hora do dia)
  const heatmapData = useMemo(() => {
    return filteredEntries.flatMap((entry) => {
      // Simular distribuição da dor ao longo do dia
      const baseHours = [6, 9, 12, 15, 18, 21]; // Horários típicos de registro
      return baseHours.map((hour) => ({
        date: entry.date,
        hour,
        value: entry.overallPainLevel + (Math.random() - 0.5) * 2, // Variação simulada
      }));
    });
  }, [filteredEntries]);

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Seletor de período */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Período
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="custom">Período customizado</option>
            </select>
          </div>

          {/* Seletor de tipo de gráfico */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tipo de Gráfico
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="line">Linha do Tempo</option>
              <option value="heatmap">Mapa de Calor</option>
              <option value="correlation">Correlação</option>
            </select>
          </div>

          {/* Seletor de métrica (apenas para gráfico de linha) */}
          {chartType === 'line' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Métrica
              </label>
              <select
                value={selectedMetric}
                onChange={(e) =>
                  setSelectedMetric(e.target.value as MetricType)
                }
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pain">Nível de Dor</option>
                <option value="energy">Nível de Energia</option>
                <option value="sleep">Qualidade do Sono</option>
                <option value="mood">Humor</option>
                <option value="all">Todas as Métricas</option>
              </select>
            </div>
          )}

          {/* Período customizado */}
          {timeframe === 'custom' && onDateRangeChange && (
            <div className="flex items-center gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  De
                </label>
                <input
                  type="date"
                  value={dateRange?.start || ''}
                  onChange={(e) =>
                    onDateRangeChange({
                      start: e.target.value,
                      end: dateRange?.end || '',
                    })
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Até
                </label>
                <input
                  type="date"
                  value={dateRange?.end || ''}
                  onChange={(e) =>
                    onDateRangeChange({
                      start: dateRange?.start || '',
                      end: e.target.value,
                    })
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas Resumo */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          {
            label: 'Dor Média',
            value:
              filteredEntries.length > 0
                ? (
                    filteredEntries.reduce(
                      (sum, e) => sum + e.overallPainLevel,
                      0
                    ) / filteredEntries.length
                  ).toFixed(1)
                : '0',
            color: 'text-red-600',
            suffix: '/10',
          },
          {
            label: 'Energia Média',
            value:
              filteredEntries.length > 0
                ? (
                    filteredEntries.reduce((sum, e) => sum + e.energyLevel, 0) /
                    filteredEntries.length
                  ).toFixed(1)
                : '0',
            color: 'text-yellow-600',
            suffix: '/5',
          },
          {
            label: 'Sono Médio',
            value:
              filteredEntries.length > 0
                ? (
                    filteredEntries.reduce(
                      (sum, e) => sum + e.sleepQuality,
                      0
                    ) / filteredEntries.length
                  ).toFixed(1)
                : '0',
            color: 'text-blue-600',
            suffix: '/5',
          },
          {
            label: 'Humor Médio',
            value:
              filteredEntries.length > 0
                ? (
                    filteredEntries.reduce((sum, e) => sum + e.moodLevel, 0) /
                    filteredEntries.length
                  ).toFixed(1)
                : '0',
            color: 'text-green-600',
            suffix: '/5',
          },
        ].map((stat, index) => (
          <div
            key={index}
            className="rounded-lg border bg-white p-4 text-center"
          >
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
              {stat.suffix}
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {chartType === 'line' && (
          <>
            {(selectedMetric === 'pain' || selectedMetric === 'all') && (
              <LineChart
                data={chartData.painData}
                title="Evolução da Dor"
                color="#DC2626"
              />
            )}
            {(selectedMetric === 'energy' || selectedMetric === 'all') && (
              <LineChart
                data={chartData.energyData}
                title="Evolução da Energia"
                color="#F59E0B"
              />
            )}
            {(selectedMetric === 'sleep' || selectedMetric === 'all') && (
              <LineChart
                data={chartData.sleepData}
                title="Evolução do Sono"
                color="#3B82F6"
              />
            )}
            {(selectedMetric === 'mood' || selectedMetric === 'all') && (
              <LineChart
                data={chartData.moodData}
                title="Evolução do Humor"
                color="#10B981"
              />
            )}
          </>
        )}

        {chartType === 'heatmap' && (
          <div className="lg:col-span-2">
            <HeatmapChart
              data={heatmapData}
              title="Padrão de Dor por Horário"
            />
          </div>
        )}

        {chartType === 'correlation' && (
          <div className="lg:col-span-2">
            <CorrelationMatrix entries={filteredEntries} />
          </div>
        )}
      </div>

      {/* Mensagem quando não há dados */}
      {filteredEntries.length === 0 && (
        <div className="rounded-lg border bg-white p-8 text-center">
          <div className="mb-4 text-6xl text-gray-400">📊</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Nenhum dado encontrado
          </h3>
          <p className="text-gray-600">
            Não há registros de sintomas para o período selecionado. Ajuste o
            período ou aguarde novos registros.
          </p>
        </div>
      )}
    </div>
  );
};

export default SymptomDataVisualization;
