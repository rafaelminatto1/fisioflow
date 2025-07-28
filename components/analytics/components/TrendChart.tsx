/**
 * Componente de Gráfico de Tendências
 * Visualização simples usando SVG
 */

import React from 'react';

import type { TrendData } from '../../../types/analytics';

interface TrendChartProps {
  data: TrendData[];
  height?: number;
}

export function TrendChart({ data, height = 200 }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Dados não disponíveis
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const width = 400;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Gera pontos para a linha
  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
    return { x, y, value: point.value, date: point.date };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaData = `${pathData} L ${points[points.length - 1].x} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Área preenchida */}
        <path
          d={areaData}
          fill="url(#gradient)"
          opacity="0.3"
        />

        {/* Gradiente */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Linha principal */}
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
              className="hover:r-6 transition-all cursor-pointer"
            />
          </g>
        ))}

        {/* Labels do eixo Y */}
        <g className="text-xs fill-gray-600">
          <text x={padding - 10} y={padding + 5} textAnchor="end">
            {maxValue.toFixed(0)}
          </text>
          <text x={padding - 10} y={padding + chartHeight / 2 + 5} textAnchor="end">
            {((maxValue + minValue) / 2).toFixed(0)}
          </text>
          <text x={padding - 10} y={padding + chartHeight + 5} textAnchor="end">
            {minValue.toFixed(0)}
          </text>
        </g>

        {/* Labels do eixo X */}
        <g className="text-xs fill-gray-600">
          {points.map((point, index) => {
            if (index % Math.ceil(points.length / 4) === 0) {
              const date = new Date(point.date);
              return (
                <text
                  key={index}
                  x={point.x}
                  y={padding + chartHeight + 20}
                  textAnchor="middle"
                >
                  {date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                </text>
              );
            }
            return null;
          })}
        </g>
      </svg>

      {/* Tooltip */}
      <div className="absolute top-2 right-2 bg-white border rounded-lg p-2 shadow-sm">
        <div className="text-xs text-gray-600">
          Tendência: {data[data.length - 1].value > data[0].value ? '📈 Crescimento' : '📉 Declínio'}
        </div>
        <div className="text-xs font-medium">
          Variação: {((data[data.length - 1].value - data[0].value) / data[0].value * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}