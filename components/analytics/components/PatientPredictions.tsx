/**
 * Componente de Predições de Pacientes usando IA
 */

import { Brain, AlertTriangle, Clock, TrendingUp, Eye } from 'lucide-react';
import React, { useState } from 'react';

import type { Patient } from '../../../types';
import type { TreatmentPrediction } from '../../../types/analytics';

interface PatientPredictionsProps {
  predictions: TreatmentPrediction[];
  patients: Patient[];
}

export function PatientPredictions({ predictions, patients }: PatientPredictionsProps) {
  const [selectedPrediction, setSelectedPrediction] = useState<TreatmentPrediction | null>(null);

  if (!predictions || predictions.length === 0) {
    return (
      <div className="text-center py-8">
        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Nenhuma predição disponível</p>
        <p className="text-sm text-gray-400">As predições serão geradas automaticamente</p>
      </div>
    );
  }

  const getPatientName = (patientId: string): string => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.name || `Paciente ${patientId}`;
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSuccessColor = (probability: number): string => {
    if (probability >= 0.8) return 'text-green-600';
    if (probability >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatConfidence = (confidence: number): string => {
    const percentage = Math.round(confidence * 100);
    if (percentage >= 80) return `${percentage}% (Alta)`;
    if (percentage >= 60) return `${percentage}% (Média)`;
    return `${percentage}% (Baixa)`;
  };

  const sortedPredictions = [...predictions].sort((a, b) => {
    // Prioriza risco alto de abandono e baixa probabilidade de sucesso
    const aScore = (a.abandonmentRisk === 'HIGH' ? 3 : a.abandonmentRisk === 'MEDIUM' ? 2 : 1) - a.successProbability;
    const bScore = (b.abandonmentRisk === 'HIGH' ? 3 : b.abandonmentRisk === 'MEDIUM' ? 2 : 1) - b.successProbability;
    return bScore - aScore;
  });

  return (
    <div className="space-y-4">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-sm text-red-600 font-medium">Alto Risco</div>
          <div className="text-xl font-bold text-red-700">
            {predictions.filter(p => p.abandonmentRisk === 'HIGH').length}
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-sm text-yellow-600 font-medium">Risco Médio</div>
          <div className="text-xl font-bold text-yellow-700">
            {predictions.filter(p => p.abandonmentRisk === 'MEDIUM').length}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm text-green-600 font-medium">Baixo Risco</div>
          <div className="text-xl font-bold text-green-700">
            {predictions.filter(p => p.abandonmentRisk === 'LOW').length}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-600 font-medium">Média de Sucesso</div>
          <div className="text-xl font-bold text-blue-700">
            {Math.round((predictions.reduce((sum, p) => sum + p.successProbability, 0) / predictions.length) * 100)}%
          </div>
        </div>
      </div>

      {/* Lista de predições */}
      <div className="space-y-3">
        {sortedPredictions.map((prediction, index) => (
          <div
            key={prediction.patientId}
            className={`border rounded-lg p-4 transition-all hover:shadow-md ${
              prediction.abandonmentRisk === 'HIGH' ? 'border-red-200 bg-red-50' :
              prediction.abandonmentRisk === 'MEDIUM' ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {getPatientName(prediction.patientId).charAt(0)}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {getPatientName(prediction.patientId)}
                  </h4>
                  <p className="text-sm text-gray-600 capitalize">
                    {prediction.pathology}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedPrediction(prediction)}
                  className="p-1 hover:bg-white rounded-full transition-colors"
                  title="Ver detalhes"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Métricas principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Duração Estimada</div>
                <div className="flex items-center justify-center space-x-1">
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span className="text-sm font-medium">{prediction.estimatedTreatmentDays}d</span>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Sucesso</div>
                <div className={`text-sm font-medium ${getSuccessColor(prediction.successProbability)}`}>
                  {Math.round(prediction.successProbability * 100)}%
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Risco Abandono</div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskColor(prediction.abandonmentRisk)}`}>
                  {prediction.abandonmentRisk}
                </span>
              </div>

              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Confiança</div>
                <div className="text-sm font-medium">
                  {formatConfidence(prediction.confidence)}
                </div>
              </div>
            </div>

            {/* Alertas especiais */}
            <div className="flex flex-wrap gap-2">
              {prediction.reassessmentNeeded && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Reavaliação Necessária
                </span>
              )}
              {prediction.complicationRisk > 0.5 && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Risco de Complicações
                </span>
              )}
              {prediction.successProbability > 0.8 && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Alta Probabilidade
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de detalhes */}
      {selectedPrediction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Detalhes da Predição - {getPatientName(selectedPrediction.patientId)}
                </h3>
                <button
                  onClick={() => setSelectedPrediction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Fatores que influenciam */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Fatores Influenciadores</h4>
                <div className="space-y-2">
                  {selectedPrediction.factors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{factor.name}</div>
                        <div className="text-sm text-gray-600">{factor.description}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        factor.impact > 0 ? 'bg-green-100 text-green-800' : 
                        factor.impact < 0 ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recomendações */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">🎯 Recomendações</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  {selectedPrediction.abandonmentRisk === 'HIGH' && (
                    <li>• Agendar conversa sobre motivação e objetivos</li>
                  )}
                  {selectedPrediction.complicationRisk > 0.5 && (
                    <li>• Monitor atentamente sinais de complicações</li>
                  )}
                  {selectedPrediction.reassessmentNeeded && (
                    <li>• Reagendar avaliação completa em 1-2 semanas</li>
                  )}
                  <li>• Ajustar plano conforme evolução do paciente</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}