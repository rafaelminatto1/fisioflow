import React, { useState } from 'react';
import {
  IconX,
  IconFileText,
  IconDownload,
  IconCalendar,
  IconDatabase,
  IconUsers,
  IconActivity,
  IconDollarSign,
  IconTool,
  IconTrendingUp,
} from './icons/IconComponents';
import { useReportGeneration, ReportGenerationOptions } from '../hooks/useReportGeneration';

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedType?: 'executive' | 'financial' | 'productivity' | 'patients' | 'custom';
}

const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({
  isOpen,
  onClose,
  preselectedType = 'custom',
}) => {
  const [selectedType, setSelectedType] = useState(preselectedType);
  const [format, setFormat] = useState<'pdf' | 'excel' | 'both'>('both');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [customTitle, setCustomTitle] = useState('Relatório Personalizado');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [customData, setCustomData] = useState({
    includePatients: true,
    includeAppointments: true,
    includeTransactions: true,
    includeQuality: false,
    includeProductivity: false,
    includeEquipment: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    generateExecutiveReport,
    generateFinancialReport,
    generateProductivityReport,
    generatePatientReport,
    generateCustomReport,
  } = useReportGeneration();

  if (!isOpen) return null;

  const reportTypes = [
    {
      id: 'executive',
      name: 'Relatório Executivo',
      description: 'Visão geral completa com KPIs e métricas principais',
      icon: <IconTrendingUp className="h-6 w-6 text-blue-500" />,
    },
    {
      id: 'financial',
      name: 'Relatório Financeiro',
      description: 'Análise detalhada de receitas, despesas e transações',
      icon: <IconDollarSign className="h-6 w-6 text-green-500" />,
    },
    {
      id: 'productivity',
      name: 'Relatório de Produtividade',
      description: 'Métricas de performance e eficiência da equipe',
      icon: <IconActivity className="h-6 w-6 text-purple-500" />,
    },
    {
      id: 'patients',
      name: 'Relatório de Pacientes',
      description: 'Dados e estatísticas dos pacientes cadastrados',
      icon: <IconUsers className="h-6 w-6 text-indigo-500" />,
    },
    {
      id: 'custom',
      name: 'Relatório Personalizado',
      description: 'Configure os dados que deseja incluir no relatório',
      icon: <IconDatabase className="h-6 w-6 text-orange-500" />,
    },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    const options: ReportGenerationOptions = {
      format,
      includeCharts,
      includeDetails,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end,
      },
    };

    try {
      switch (selectedType) {
        case 'executive':
          await generateExecutiveReport(options);
          break;
        case 'financial':
          await generateFinancialReport(options);
          break;
        case 'productivity':
          await generateProductivityReport(options);
          break;
        case 'patients':
          await generatePatientReport(options);
          break;
        case 'custom':
          await generateCustomReport(customTitle, customData, options);
          break;
      }
      
      onClose();
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <IconFileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Geração de Relatórios
              </h2>
              <p className="text-sm text-gray-500">
                Configure e gere relatórios personalizados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <IconX className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Report Type Selection */}
          <div className="mb-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Tipo de Relatório
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id as any)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    selectedType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-2 flex items-center space-x-2">
                    {type.icon}
                    <h4 className="font-medium text-gray-900">{type.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Report Configuration */}
          {selectedType === 'custom' && (
            <div className="mb-6 rounded-lg border border-gray-200 p-4">
              <h4 className="mb-4 font-medium text-gray-900">
                Configuração Personalizada
              </h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Título do Relatório
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Digite o título do relatório"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Dados a Incluir
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customData.includePatients}
                      onChange={(e) =>
                        setCustomData({
                          ...customData,
                          includePatients: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Pacientes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customData.includeAppointments}
                      onChange={(e) =>
                        setCustomData({
                          ...customData,
                          includeAppointments: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Consultas</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customData.includeTransactions}
                      onChange={(e) =>
                        setCustomData({
                          ...customData,
                          includeTransactions: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Transações</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customData.includeQuality}
                      onChange={(e) =>
                        setCustomData({
                          ...customData,
                          includeQuality: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Qualidade</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customData.includeProductivity}
                      onChange={(e) =>
                        setCustomData({
                          ...customData,
                          includeProductivity: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Produtividade</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customData.includeEquipment}
                      onChange={(e) =>
                        setCustomData({
                          ...customData,
                          includeEquipment: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Equipamentos</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="mb-6">
            <h4 className="mb-4 font-medium text-gray-900 flex items-center space-x-2">
              <IconCalendar className="h-4 w-4" />
              <span>Período</span>
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Data Final
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Format Options */}
          <div className="mb-6">
            <h4 className="mb-4 font-medium text-gray-900">
              Formato e Configurações
            </h4>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Formato de Saída
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={format === 'pdf'}
                      onChange={(e) => setFormat(e.target.value as any)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">PDF apenas</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={format === 'excel'}
                      onChange={(e) => setFormat(e.target.value as any)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Excel apenas</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="format"
                      value="both"
                      checked={format === 'both'}
                      onChange={(e) => setFormat(e.target.value as any)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">PDF + Excel</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Opções Adicionais
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={includeDetails}
                      onChange={(e) => setIncludeDetails(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Incluir detalhes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Incluir gráficos</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 border-t border-gray-200 pt-6">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconDownload className="h-4 w-4" />
              <span>
                {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerationModal;