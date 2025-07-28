/**
 * Gráfico de Taxa de Sucesso por Patologia
 * Barra horizontal com cores indicativas
 */

import React from 'react';

import type { PathologySuccessRate } from '../../../types/analytics';

interface SuccessRateChartProps {
  data: PathologySuccessRate[];
}

export function SuccessRateChart({ data }: SuccessRateChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Dados não disponíveis
      </div>
    );
  }

  const maxPatients = Math.max(...data.map(d => d.patientCount));

  const getSuccessColor = (rate: number) => {
    if (rate >= 0.8) return 'bg-green-500';
    if (rate >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return '↗️';
      case 'DOWN': return '↘️';
      default: return '➡️';
    }
  };

  return (
    <div className="space-y-4">
      {data.map((pathology, index) => (
        <div key={index} className="space-y-2">
          {/* Header da patologia */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900 capitalize">
                {pathology.pathology}
              </h4>
              <span className="text-xs text-gray-500">
                ({pathology.patientCount} pacientes)
              </span>
              <span className="text-sm">
                {getTrendIcon(pathology.trendDirection)}
              </span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {Math.round(pathology.successRate * 100)}%
              </div>
              <div className="text-xs text-gray-500">
                {pathology.averageDuration}d médio
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="relative">
            {/* Barra de fundo */}
            <div className="w-full bg-gray-200 rounded-full h-4">
              {/* Barra de sucesso */}
              <div
                className={`h-4 rounded-full ${getSuccessColor(pathology.successRate)} transition-all duration-500 ease-out`}
                style={{ width: `${pathology.successRate * 100}%` }}
              />
            </div>

            {/* Indicador de volume de pacientes */}
            <div className="absolute -top-1 right-0 h-6 bg-blue-100 rounded-full flex items-center justify-center px-2">
              <div
                className="w-2 h-2 bg-blue-500 rounded-full"
                style={{ 
                  transform: `scale(${Math.max(0.5, pathology.patientCount / maxPatients)})`
                }}
              />
            </div>
          </div>

          {/* Estatísticas adicionais */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Min: {Math.round((pathology.successRate - 0.1) * 100)}%
            </span>
            <span>
              Máx: {Math.round((pathology.successRate + 0.1) * 100)}%
            </span>
          </div>
        </div>
      ))}

      {/* Legenda */}
      <div className="mt-6 pt-4 border-t">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Legenda:</h5>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>≥80% sucesso</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>60-79% sucesso</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>&lt;60% sucesso</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Volume de pacientes</span>
          </div>
        </div>
      </div>
    </div>
  );
}