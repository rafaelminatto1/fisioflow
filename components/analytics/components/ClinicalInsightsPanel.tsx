/**
 * Panel de Insights Clínicos
 */

import { Lightbulb, TrendingUp, Users, Activity, Eye, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

import type { ClinicalInsight } from '../../../types/analytics';

interface ClinicalInsightsPanelProps {
  insights: ClinicalInsight[];
}

const insightIcons = {
  EXERCISE_EFFECTIVENESS: Activity,
  AGE_PATTERNS: Users,
  SYMPTOM_CORRELATION: TrendingUp,
  RISK_FACTORS: Lightbulb,
  BENCHMARK: ChevronRight
};

const insightColors = {
  EXERCISE_EFFECTIVENESS: 'text-green-600 bg-green-100',
  AGE_PATTERNS: 'text-blue-600 bg-blue-100',
  SYMPTOM_CORRELATION: 'text-purple-600 bg-purple-100',
  RISK_FACTORS: 'text-orange-600 bg-orange-100',
  BENCHMARK: 'text-gray-600 bg-gray-100'
};

export function ClinicalInsightsPanel({ insights }: ClinicalInsightsPanelProps) {
  const [selectedInsight, setSelectedInsight] = useState<ClinicalInsight | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  if (!insights || insights.length === 0) {
    return (
      <div className="text-center py-8">
        <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Nenhum insight disponível</p>
        <p className="text-sm text-gray-400">Os insights serão gerados com base nos dados clínicos</p>
      </div>
    );
  }

  const filteredInsights = activeTab === 'all' 
    ? insights 
    : insights.filter(insight => insight.type === activeTab);

  const actionableInsights = insights.filter(insight => insight.actionable).length;
  const averageConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length;

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  const renderInsightData = (insight: ClinicalInsight) => {
    switch (insight.type) {
      case 'EXERCISE_EFFECTIVENESS':
        const exerciseData = insight.data;
        return (
          <div className="space-y-2">
            {exerciseData.slice(0, 3).map((exercise: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">{exercise.exerciseName}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{exercise.patientsCount} pacientes</span>
                  <span className={`text-sm font-medium ${
                    exercise.effectivenessScore > 0.8 ? 'text-green-600' : 
                    exercise.effectivenessScore > 0.6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(exercise.effectivenessScore * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'AGE_PATTERNS':
        const ageData = insight.data;
        return (
          <div className="space-y-2">
            {ageData.slice(0, 3).map((pattern: any, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{pattern.ageGroup} anos</span>
                  <span className="text-sm text-green-600 font-medium">
                    {Math.round(pattern.successRate * 100)}% sucesso
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Tempo médio: {Math.round(pattern.averageRecoveryTime)} dias
                </div>
              </div>
            ))}
          </div>
        );

      case 'SYMPTOM_CORRELATION':
        const correlationData = insight.data;
        return (
          <div className="space-y-2">
            {correlationData.slice(0, 3).map((correlation: any, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                <div className="text-sm font-medium">
                  {correlation.symptom1} ↔ {correlation.symptom2}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-600">
                    {correlation.pathologies.join(', ')}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    correlation.clinicalSignificance === 'HIGH' ? 'bg-red-100 text-red-800' :
                    correlation.clinicalSignificance === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {correlation.clinicalSignificance}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-600">
            Dados detalhados disponíveis na visualização completa
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Total de Insights</div>
          <div className="text-xl font-bold text-blue-700">{insights.length}</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Acionáveis</div>
          <div className="text-xl font-bold text-green-700">{actionableInsights}</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">Confiança Média</div>
          <div className="text-xl font-bold text-purple-700">
            {formatConfidence(averageConfidence)}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todos ({insights.length})
        </button>
        {Object.keys(insightIcons).map(type => {
          const count = insights.filter(i => i.type === type).length;
          if (count === 0) return null;
          
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeTab === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.replace('_', ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista de insights */}
      <div className="space-y-3">
        {filteredInsights.map((insight, index) => {
          const IconComponent = insightIcons[insight.type];
          const colorClass = insightColors[insight.type];

          return (
            <div
              key={insight.id}
              className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedInsight(insight)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {insight.actionable && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Acionável
                    </span>
                  )}
                  <div className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                    {formatConfidence(insight.confidence)}
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded-full">
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Preview dos dados */}
              <div className="mt-3">
                {renderInsightData(insight)}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Gerado em {new Date(insight.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de detalhes */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-full ${insightColors[selectedInsight.type]}`}>
                    {React.createElement(insightIcons[selectedInsight.type], { className: "h-6 w-6" })}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedInsight.title}</h3>
                    <p className="text-gray-600">{selectedInsight.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Métricas do insight */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Confiança</div>
                  <div className={`text-lg font-bold ${getConfidenceColor(selectedInsight.confidence)}`}>
                    {formatConfidence(selectedInsight.confidence)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Acionável</div>
                  <div className="text-lg font-bold">
                    {selectedInsight.actionable ? '✅ Sim' : '❌ Não'}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Tipo</div>
                  <div className="text-lg font-bold">
                    {selectedInsight.type.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Dados completos */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Dados Detalhados</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-sm text-gray-700">
                    {JSON.stringify(selectedInsight.data, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Ações recomendadas */}
              {selectedInsight.actionable && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Ações Recomendadas</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    {selectedInsight.type === 'EXERCISE_EFFECTIVENESS' && (
                      <>
                        <li>• Priorizar exercícios com maior efetividade</li>
                        <li>• Revisar protocolos de exercícios menos efetivos</li>
                        <li>• Treinar equipe sobre melhores práticas</li>
                      </>
                    )}
                    {selectedInsight.type === 'AGE_PATTERNS' && (
                      <>
                        <li>• Ajustar expectativas por faixa etária</li>
                        <li>• Personalizar abordagem terapêutica</li>
                        <li>• Considerar fatores específicos da idade</li>
                      </>
                    )}
                    {selectedInsight.type === 'SYMPTOM_CORRELATION' && (
                      <>
                        <li>• Investigar sintomas correlacionados</li>
                        <li>• Ajustar anamnese para capturar padrões</li>
                        <li>• Desenvolver protocolos específicos</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}