import React, { useState, useEffect } from 'react';

import { useData } from '../hooks/useData';
import { useNotification } from '../hooks/useNotification';
import { Patient } from '../types';

import { SymptomDataVisualization } from './SymptomDataVisualization';
import { SymptomDiaryEntryModal } from './SymptomDiaryEntry';
import { SymptomInsightsPanel } from './SymptomInsightsPanel';
import { SymptomReports } from './SymptomReports';

interface SymptomDiaryProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
}

type ActiveTab =
  | 'overview'
  | 'entry'
  | 'visualization'
  | 'insights'
  | 'reports';

export const SymptomDiary: React.FC<SymptomDiaryProps> = ({
  patient,
  isOpen,
  onClose,
}) => {
  const {
    symptomDiaryEntries,
    addSymptomDiaryEntry,
    updateSymptomDiaryEntry,
    deleteSymptomDiaryEntry,
  } = useData();
  const { addNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: new Date().toISOString().split('T')[0],
  });
  const [quickMode, setQuickMode] = useState(false);

  // Filtrar entradas do paciente atual
  const patientEntries = symptomDiaryEntries.filter(
    (entry) => entry.patientId === patient.id
  );

  // Configurar data inicial padrão (30 dias atrás)
  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setDateRange((prev) => ({
      ...prev,
      start: thirtyDaysAgo.toISOString().split('T')[0],
    }));
  }, []);

  const handleSaveEntry = (entryData: any) => {
    try {
      if (editingEntry) {
        updateSymptomDiaryEntry(editingEntry.id, entryData);
        addNotification({
          type: 'success',
          title: 'Entrada Atualizada',
          message: 'Registro de sintomas atualizado com sucesso!',
        });
      } else {
        addSymptomDiaryEntry(entryData);
        addNotification({
          type: 'success',
          title: 'Entrada Salva',
          message: 'Novo registro de sintomas salvo com sucesso!',
        });
      }

      setShowNewEntryModal(false);
      setEditingEntry(null);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao salvar registro de sintomas',
      });
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      try {
        deleteSymptomDiaryEntry(entryId);
        addNotification({
          type: 'success',
          title: 'Entrada Excluída',
          message: 'Registro de sintomas excluído com sucesso!',
        });
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Erro',
          message: 'Erro ao excluir registro de sintomas',
        });
      }
    }
  };

  const handleExportReport = (report: any, format: 'pdf' | 'excel' | 'csv') => {
    // Simular exportação
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-sintomas-${patient.name}-${report.type}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addNotification({
      type: 'success',
      title: 'Relatório Exportado',
      message: `Relatório exportado em formato ${format.toUpperCase()}`,
    });
  };

  const getTabBadge = (tab: ActiveTab): number => {
    switch (tab) {
      case 'entry':
        return patientEntries.length;
      case 'insights':
        // Simular alertas pendentes
        return patientEntries.length > 0
          ? Math.floor(patientEntries.length / 10)
          : 0;
      default:
        return 0;
    }
  };

  const hasDataForToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return patientEntries.some((entry) => entry.date === today);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[95vh] w-full max-w-7xl overflow-hidden rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              📊 Diário de Sintomas e Evolução
            </h1>
            <p className="text-sm text-gray-600">
              Paciente: {patient.name} • {patientEntries.length} registros
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!hasDataForToday() && (
              <div className="flex items-center space-x-2 rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                <span className="text-sm font-medium">
                  📝 Registro de hoje pendente
                </span>
              </div>
            )}
            <button
              onClick={() => {
                setEditingEntry(null);
                setQuickMode(true);
                setShowNewEntryModal(true);
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              ⚡ Registro Rápido
            </button>
            <button
              onClick={() => {
                setEditingEntry(null);
                setQuickMode(false);
                setShowNewEntryModal(true);
              }}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              ➕ Novo Registro
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Visão Geral', icon: '📋' },
              { id: 'entry', label: 'Registros', icon: '📝' },
              { id: 'visualization', label: 'Gráficos', icon: '📊' },
              { id: 'insights', label: 'Insights', icon: '🤖' },
              { id: 'reports', label: 'Relatórios', icon: '📄' },
            ].map((tab) => {
              const badge = getTabBadge(tab.id as ActiveTab);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`relative border-b-2 px-1 py-4 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                  {badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="max-h-[calc(95vh-200px)] overflow-y-auto p-6">
          {/* Aba Visão Geral */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {patientEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-4 text-6xl text-gray-400">📊</div>
                  <h3 className="mb-2 text-xl font-medium text-gray-900">
                    Bem-vindo ao Diário de Sintomas
                  </h3>
                  <p className="mx-auto mb-6 max-w-2xl text-gray-600">
                    Registre seus sintomas diariamente para acompanhar sua
                    evolução. O sistema irá gerar insights automáticos e
                    relatórios detalhados para auxiliar no seu tratamento.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => {
                        setEditingEntry(null);
                        setQuickMode(true);
                        setShowNewEntryModal(true);
                      }}
                      className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
                    >
                      ⚡ Primeiro Registro Rápido
                    </button>
                    <button
                      onClick={() => {
                        setEditingEntry(null);
                        setQuickMode(false);
                        setShowNewEntryModal(true);
                      }}
                      className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
                    >
                      📝 Registro Completo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Estatísticas Rápidas */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:col-span-3">
                    {[
                      {
                        label: 'Total de Registros',
                        value: patientEntries.length,
                        icon: '📝',
                        color: 'text-blue-600',
                      },
                      {
                        label: 'Dor Média (7 dias)',
                        value:
                          patientEntries.slice(-7).length > 0
                            ? (
                                patientEntries
                                  .slice(-7)
                                  .reduce(
                                    (sum, e) => sum + e.overallPainLevel,
                                    0
                                  ) / patientEntries.slice(-7).length
                              ).toFixed(1)
                            : '0',
                        icon: '😰',
                        color: 'text-red-600',
                      },
                      {
                        label: 'Energia Média (7 dias)',
                        value:
                          patientEntries.slice(-7).length > 0
                            ? (
                                patientEntries
                                  .slice(-7)
                                  .reduce((sum, e) => sum + e.energyLevel, 0) /
                                patientEntries.slice(-7).length
                              ).toFixed(1)
                            : '0',
                        icon: '⚡',
                        color: 'text-yellow-600',
                      },
                      {
                        label: 'Último Registro',
                        value:
                          patientEntries.length > 0
                            ? new Date(
                                patientEntries[patientEntries.length - 1].date
                              ).toLocaleDateString('pt-BR')
                            : 'Nunca',
                        icon: '📅',
                        color: 'text-green-600',
                      },
                    ].map((stat, index) => (
                      <div
                        key={index}
                        className="rounded-lg border bg-white p-4 text-center"
                      >
                        <div className={`text-3xl ${stat.color} mb-2`}>
                          {stat.icon}
                        </div>
                        <div className={`text-2xl font-bold ${stat.color}`}>
                          {stat.value}
                        </div>
                        <div className="text-sm text-gray-600">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Registros Recentes */}
                  <div className="lg:col-span-2">
                    <h3 className="mb-4 text-lg font-medium text-gray-900">
                      Registros Recentes
                    </h3>
                    <div className="max-h-64 space-y-3 overflow-y-auto">
                      {patientEntries
                        .slice(-5)
                        .reverse()
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-lg bg-gray-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="font-medium text-gray-900">
                                {new Date(entry.date).toLocaleDateString(
                                  'pt-BR',
                                  {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: '2-digit',
                                  }
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingEntry(entry);
                                    setQuickMode(false);
                                    setShowNewEntryModal(true);
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-sm text-red-600 hover:text-red-800"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Dor:</span>
                                <span className="ml-1 font-medium text-red-600">
                                  {entry.overallPainLevel}/10
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Energia:</span>
                                <span className="ml-1 font-medium text-yellow-600">
                                  {entry.energyLevel}/5
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Sono:</span>
                                <span className="ml-1 font-medium text-blue-600">
                                  {entry.sleepQuality}/5
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Humor:</span>
                                <span className="ml-1 font-medium text-green-600">
                                  {entry.moodLevel}/5
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Dicas de Uso */}
                  <div className="lg:col-span-1">
                    <h3 className="mb-4 text-lg font-medium text-gray-900">
                      Dicas de Uso
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="rounded-lg bg-blue-50 p-3">
                        <div className="mb-1 font-medium text-blue-900">
                          ⚡ Registro Rápido
                        </div>
                        <div className="text-blue-800">
                          Para registros diários rápidos (menos de 2 minutos)
                        </div>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3">
                        <div className="mb-1 font-medium text-green-900">
                          📝 Registro Completo
                        </div>
                        <div className="text-green-800">
                          Para análise detalhada com localização da dor e
                          exercícios
                        </div>
                      </div>
                      <div className="rounded-lg bg-purple-50 p-3">
                        <div className="mb-1 font-medium text-purple-900">
                          🤖 Insights Automáticos
                        </div>
                        <div className="text-purple-800">
                          O sistema gera análises após alguns registros
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba Registros */}
          {activeTab === 'entry' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Registros de Sintomas ({patientEntries.length})
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingEntry(null);
                      setQuickMode(true);
                      setShowNewEntryModal(true);
                    }}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    ⚡ Rápido
                  </button>
                  <button
                    onClick={() => {
                      setEditingEntry(null);
                      setQuickMode(false);
                      setShowNewEntryModal(true);
                    }}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                  >
                    ➕ Completo
                  </button>
                </div>
              </div>

              {patientEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-4 text-6xl text-gray-400">📝</div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    Nenhum registro encontrado
                  </h3>
                  <p className="text-gray-600">
                    Comece criando seu primeiro registro de sintomas
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Data
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Dor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Energia
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Sono
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Humor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {patientEntries
                          .slice()
                          .reverse()
                          .map((entry) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                {new Date(entry.date).toLocaleDateString(
                                  'pt-BR',
                                  {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                  }
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <div className="flex items-center">
                                  <div
                                    className={`mr-2 h-3 w-3 rounded-full ${
                                      entry.overallPainLevel <= 3
                                        ? 'bg-green-500'
                                        : entry.overallPainLevel <= 6
                                          ? 'bg-yellow-500'
                                          : 'bg-red-500'
                                    }`}
                                  ></div>
                                  <span className="text-sm font-medium">
                                    {entry.overallPainLevel}/10
                                  </span>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                {entry.energyLevel}/5
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                {entry.sleepQuality}/5
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                {entry.moodLevel}/5
                              </td>
                              <td className="space-x-2 whitespace-nowrap px-6 py-4 text-sm font-medium">
                                <button
                                  onClick={() => {
                                    setEditingEntry(entry);
                                    setQuickMode(false);
                                    setShowNewEntryModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba Visualização */}
          {activeTab === 'visualization' && (
            <SymptomDataVisualization
              entries={patientEntries}
              patient={patient}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          )}

          {/* Aba Insights */}
          {activeTab === 'insights' && (
            <SymptomInsightsPanel entries={patientEntries} patient={patient} />
          )}

          {/* Aba Relatórios */}
          {activeTab === 'reports' && (
            <SymptomReports
              entries={patientEntries}
              patient={patient}
              onExportReport={handleExportReport}
            />
          )}
        </div>
      </div>

      {/* Modal de Entrada */}
      {showNewEntryModal && (
        <SymptomDiaryEntryModal
          isOpen={showNewEntryModal}
          onClose={() => {
            setShowNewEntryModal(false);
            setEditingEntry(null);
          }}
          onSave={handleSaveEntry}
          patient={patient}
          existingEntry={editingEntry}
          quickMode={quickMode}
        />
      )}
    </div>
  );
};

export default SymptomDiary;
