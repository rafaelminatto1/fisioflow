/**
 * Componente de Gráfico Interativo Avançado
 * Suporte para múltiplos tipos de gráficos com interatividade
 */

import { TrendingUp, TrendingDown, Minus, BarChart3, PieChart, LineChart } from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  category?: string;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface InteractiveChartProps {
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  height?: number;
  showTrend?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  interactive?: boolean;
  colors?: string[];
}

export function InteractiveChart({ 
  data, 
  type, 
  title, 
  height = 300, 
  showTrend = true,
  showTooltip = true,
  showLegend = true,
  interactive = true,
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
}: InteractiveChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Processamento dos dados
  const processedData = useMemo(() => {
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    
    return data.map((point, index) => ({
      ...point,
      normalizedValue: maxValue > 0 ? (point.value / maxValue) : 0,
      color: point.color || colors[index % colors.length],
      percentage: maxValue > 0 ? ((point.value / maxValue) * 100) : 0
    }));
  }, [data, colors]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const values = data.map(d => d.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = values.length > 0 ? total / values.length : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (values.length > 1) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.05) trend = 'up';
      else if (secondAvg < firstAvg * 0.95) trend = 'down';
    }

    return { total, average, trend };
  }, [data]);

  const renderLineChart = () => {
    const width = 100;
    const points = processedData.map((point, index) => {
      const x = (index / (processedData.length - 1)) * width;
      const y = (1 - point.normalizedValue) * 80 + 10;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${width} 100`} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Area fill */}
          {type === 'area' && (
            <polygon
              points={`0,90 ${points} ${width},90`}
              fill={`${colors[0]}20`}
              className="transition-all duration-300"
            />
          )}
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={colors[0]}
            strokeWidth="2"
            className="transition-all duration-300"
          />
          
          {/* Data points */}
          {processedData.map((point, index) => {
            const x = (index / (processedData.length - 1)) * width;
            const y = (1 - point.normalizedValue) * 80 + 10;
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={hoveredIndex === index ? "4" : "3"}
                fill={point.color}
                stroke="white"
                strokeWidth="2"
                className={`transition-all duration-200 ${interactive ? 'cursor-pointer hover:r-4' : ''}`}
                onMouseEnter={() => {
                  if (interactive) {
                    setHoveredIndex(index);
                    setSelectedPoint(point);
                  }
                }}
                onMouseLeave={() => {
                  if (interactive) {
                    setHoveredIndex(null);
                    setSelectedPoint(null);
                  }
                }}
              />
            );
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {processedData.map((point, index) => (
            <span key={index} className="text-center">
              {point.label.length > 8 ? point.label.substring(0, 8) + '...' : point.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    return (
      <div className="space-y-3">
        {processedData.map((point, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{point.label}</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">{point.value.toLocaleString()}</span>
                {point.trend && (
                  <span className={`flex items-center ${
                    point.trend === 'up' ? 'text-green-600' :
                    point.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {point.trend === 'up' ? <TrendingUp className="h-3 w-3" /> :
                     point.trend === 'down' ? <TrendingDown className="h-3 w-3" /> :
                     <Minus className="h-3 w-3" />}
                  </span>
                )}
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    interactive && hoveredIndex === index ? 'opacity-80' : ''
                  }`}
                  style={{
                    width: `${point.percentage}%`,
                    backgroundColor: point.color
                  }}
                  onMouseEnter={() => {
                    if (interactive) {
                      setHoveredIndex(index);
                      setSelectedPoint(point);
                    }
                  }}
                  onMouseLeave={() => {
                    if (interactive) {
                      setHoveredIndex(null);
                      setSelectedPoint(null);
                    }
                  }}
                />
              </div>
              
              {/* Valor sobre a barra */}
              <div
                className="absolute top-0 text-xs font-medium text-white px-2"
                style={{ left: `${Math.min(point.percentage - 10, 80)}%` }}
              >
                {point.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPieChart = () => {
    const total = processedData.reduce((sum, point) => sum + point.value, 0);
    let cumulativePercentage = 0;

    return (
      <div className="flex items-center space-x-8">
        {/* Gráfico de pizza */}
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
            {processedData.map((point, index) => {
              const percentage = total > 0 ? (point.value / total) * 100 : 0;
              const strokeDasharray = `${percentage * 2.827} 282.7`; // 2.827 é aproximadamente 90*π/100
              const strokeDashoffset = -cumulativePercentage * 2.827;
              
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r="45"
                  fill="transparent"
                  stroke={point.color}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={`transition-all duration-500 ${
                    interactive ? 'hover:stroke-width-25 cursor-pointer' : ''
                  }`}
                  onMouseEnter={() => {
                    if (interactive) {
                      setHoveredIndex(index);
                      setSelectedPoint(point);
                    }
                  }}
                  onMouseLeave={() => {
                    if (interactive) {
                      setHoveredIndex(null);
                      setSelectedPoint(null);
                    }
                  }}
                />
              );
            })}
          </svg>

          {/* Centro do gráfico com valor total */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </div>

        {/* Legenda */}
        {showLegend && (
          <div className="space-y-2">
            {processedData.map((point, index) => {
              const percentage = total > 0 ? (point.value / total) * 100 : 0;
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                    hoveredIndex === index ? 'bg-gray-100' : ''
                  }`}
                  onMouseEnter={() => {
                    if (interactive) {
                      setHoveredIndex(index);
                      setSelectedPoint(point);
                    }
                  }}
                  onMouseLeave={() => {
                    if (interactive) {
                      setHoveredIndex(null);
                      setSelectedPoint(null);
                    }
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: point.color }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{point.label}</div>
                    <div className="text-xs text-gray-500">
                      {point.value.toLocaleString()} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            {type === 'line' || type === 'area' ? <LineChart className="h-5 w-5 text-blue-600" /> :
             type === 'bar' ? <BarChart3 className="h-5 w-5 text-blue-600" /> :
             <PieChart className="h-5 w-5 text-blue-600" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              {processedData.length} pontos de dados
            </p>
          </div>
        </div>

        {/* Estatísticas de tendência */}
        {showTrend && (
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {stats.average.toLocaleString()}
              </div>
              <div className="text-gray-500">Média</div>
            </div>
            
            <div className={`flex items-center space-x-1 ${
              stats.trend === 'up' ? 'text-green-600' :
              stats.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {stats.trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
               stats.trend === 'down' ? <TrendingDown className="h-4 w-4" /> :
               <Minus className="h-4 w-4" />}
              <span className="font-medium">
                {stats.trend === 'up' ? 'Crescendo' :
                 stats.trend === 'down' ? 'Declinando' : 'Estável'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <div className="relative">
        {type === 'line' || type === 'area' ? renderLineChart() :
         type === 'bar' ? renderBarChart() :
         renderPieChart()}

        {/* Tooltip */}
        {showTooltip && selectedPoint && (
          <div className="absolute top-4 right-4 bg-gray-900 text-white p-3 rounded-lg shadow-lg z-10">
            <div className="font-semibold">{selectedPoint.label}</div>
            <div className="text-sm">
              Valor: {selectedPoint.value.toLocaleString()}
            </div>
            {selectedPoint.date && (
              <div className="text-xs text-gray-300">
                {selectedPoint.date}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer com resumo */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        Total: {stats.total.toLocaleString()} • 
        Média: {stats.average.toLocaleString()} • 
        Pontos: {processedData.length}
      </div>
    </div>
  );
}