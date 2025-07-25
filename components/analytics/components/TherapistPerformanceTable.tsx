/**
 * Tabela de Performance dos Fisioterapeutas
 */

import React, { useState } from 'react';
import { Star, TrendingUp, Users, Clock } from 'lucide-react';
import type { TherapistMetrics } from '../../../types/analytics';

interface TherapistPerformanceTableProps {
  therapists: TherapistMetrics[];
}

export function TherapistPerformanceTable({ therapists }: TherapistPerformanceTableProps) {
  const [sortBy, setSortBy] = useState<keyof TherapistMetrics>('successRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  if (!therapists || therapists.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Dados dos fisioterapeutas não disponíveis
      </div>
    );
  }

  const sortedTherapists = [...therapists].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    }
    
    return sortOrder === 'desc' 
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal));
  });

  const handleSort = (column: keyof TherapistMetrics) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getPerformanceColor = (score: number, type: 'rate' | 'satisfaction' | 'productivity') => {
    const thresholds = {
      rate: { good: 0.8, average: 0.6 },
      satisfaction: { good: 4.0, average: 3.5 },
      productivity: { good: 8, average: 5 }
    };

    const threshold = thresholds[type] || thresholds.rate;
    
    if (score >= threshold.good) return 'text-green-600 bg-green-50';
    if (score >= threshold.average) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const renderSortIcon = (column: keyof TherapistMetrics) => {
    if (sortBy !== column) return null;
    return sortOrder === 'desc' ? '↓' : '↑';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('therapistName')}
            >
              <div className="flex items-center space-x-1">
                <span>Fisioterapeuta</span>
                <span>{renderSortIcon('therapistName')}</span>
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('totalPatients')}
            >
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>Pacientes</span>
                <span>{renderSortIcon('totalPatients')}</span>
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('successRate')}
            >
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>Taxa de Sucesso</span>
                <span>{renderSortIcon('successRate')}</span>
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('patientSatisfactionScore')}
            >
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4" />
                <span>Satisfação</span>
                <span>{renderSortIcon('patientSatisfactionScore')}</span>
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('productivityScore')}
            >
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Produtividade</span>
                <span>{renderSortIcon('productivityScore')}</span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Especializações
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Performance Geral
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedTherapists.map((therapist, index) => {
            const overallScore = (
              therapist.successRate + 
              (therapist.patientSatisfactionScore / 5) + 
              Math.min(therapist.productivityScore / 10, 1)
            ) / 3;

            return (
              <tr key={therapist.therapistId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {therapist.therapistName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {therapist.therapistName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {therapist.averageSessionDuration}min/sessão
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {therapist.totalPatients}
                  </div>
                  <div className="text-sm text-gray-500">
                    pacientes ativos
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(therapist.successRate, 'rate')}`}>
                    {Math.round(therapist.successRate * 100)}%
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(therapist.patientSatisfactionScore, 'satisfaction')}`}>
                      {therapist.patientSatisfactionScore.toFixed(1)}
                    </div>
                    <div className="ml-2 flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.floor(therapist.patientSatisfactionScore)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(therapist.productivityScore, 'productivity')}`}>
                    {therapist.productivityScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    sessões/dia
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {therapist.specializations.map((spec, i) => (
                      <span
                        key={i}
                        className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            overallScore >= 0.8 ? 'bg-green-500' :
                            overallScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${overallScore * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-3 text-sm font-medium text-gray-900">
                      {Math.round(overallScore * 100)}%
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Resumo estatístico */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Resumo da Equipe</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Taxa de Sucesso Média:</span>
            <span className="ml-1 font-medium">
              {Math.round((therapists.reduce((sum, t) => sum + t.successRate, 0) / therapists.length) * 100)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Satisfação Média:</span>
            <span className="ml-1 font-medium">
              {(therapists.reduce((sum, t) => sum + t.patientSatisfactionScore, 0) / therapists.length).toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Total de Pacientes:</span>
            <span className="ml-1 font-medium">
              {therapists.reduce((sum, t) => sum + t.totalPatients, 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Produtividade Média:</span>
            <span className="ml-1 font-medium">
              {(therapists.reduce((sum, t) => sum + t.productivityScore, 0) / therapists.length).toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}