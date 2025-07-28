import { useCallback } from 'react';

import ReportGenerationService, { ReportData } from '../services/reportGenerationService';
import {
  ExecutiveReport,
  ProductivityMetric,
  QualityIndicator,
} from '../types';

import { useAuth } from './useAuth';
import { useData } from './useData';
import { useNotification } from './useNotification';


export interface ReportGenerationOptions {
  format: 'pdf' | 'excel' | 'both';
  includeCharts?: boolean;
  includeDetails?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export const useReportGeneration = () => {
  const {
    patients,
    appointments,
    transactions,
    qualityIndicators,
    productivityMetrics,
    equipment,
    users,
    executiveReports,
  } = useData();
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const generateReportData = useCallback(
    (dateRange?: { start: string; end: string }): ReportData => {
      let filteredAppointments = appointments;
      let filteredTransactions = transactions;
      let filteredQualityIndicators = qualityIndicators;
      let filteredProductivityMetrics = productivityMetrics;

      // Apply date filtering if provided
      if (dateRange) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);

        filteredAppointments = appointments.filter((apt) => {
          const aptDate = new Date(apt.start);
          return aptDate >= startDate && aptDate <= endDate;
        });

        filteredTransactions = transactions.filter((trans) => {
          const transDate = new Date(trans.dueDate);
          return transDate >= startDate && transDate <= endDate;
        });

        filteredQualityIndicators = qualityIndicators.filter((qi) => {
          const qiDate = new Date(qi.timestamp);
          return qiDate >= startDate && qiDate <= endDate;
        });

        filteredProductivityMetrics = productivityMetrics.filter((pm) => {
          const pmDate = new Date(pm.timestamp);
          return pmDate >= startDate && pmDate <= endDate;
        });
      }

      // Calculate KPIs
      const totalRevenue = filteredTransactions
        .filter((t) => t.status === 'pago')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalPatients = patients.length;
      const totalAppointments = filteredAppointments.length;
      
      const satisfactionIndicators = filteredQualityIndicators.filter(
        (qi) => qi.type === 'satisfaction'
      );
      const averageSatisfaction = satisfactionIndicators.length > 0
        ? satisfactionIndicators.reduce((sum, qi) => sum + qi.value, 0) / satisfactionIndicators.length
        : 0;

      const completedAppointments = filteredAppointments.filter(
        (apt) => new Date(apt.end) < new Date()
      ).length;
      const utilizationRate = totalAppointments > 0 
        ? (completedAppointments / totalAppointments) * 100 
        : 0;

      return {
        patients,
        appointments: filteredAppointments,
        transactions: filteredTransactions,
        qualityIndicators: filteredQualityIndicators,
        productivityMetrics: filteredProductivityMetrics,
        equipment,
        users,
        kpis: {
          totalRevenue,
          totalPatients,
          totalAppointments,
          averageSatisfaction,
          utilizationRate,
        },
        period: dateRange,
      };
    },
    [
      patients,
      appointments,
      transactions,
      qualityIndicators,
      productivityMetrics,
      equipment,
      users,
    ]
  );

  const generateExecutiveReport = useCallback(
    (options: ReportGenerationOptions = { format: 'both' }) => {
      try {
        const reportData = generateReportData(options.dateRange);
        
        // Find the most recent executive report or create a mock one
        const latestReport = executiveReports[0] || {
          id: 'temp-exec-report',
          title: 'Relatório Executivo',
          type: 'custom' as const,
          period: options.dateRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          generatedAt: new Date().toISOString(),
          generatedBy: user?.id || 'system',
          status: 'ready' as const,
          sections: [],
          summary: {
            totalRevenue: reportData.kpis?.totalRevenue || 0,
            totalAppointments: reportData.kpis?.totalAppointments || 0,
            averageSatisfaction: reportData.kpis?.averageSatisfaction || 0,
            utilizationRate: reportData.kpis?.utilizationRate || 0,
            topPerformer: 'N/A',
            mainConcerns: [],
            recommendations: [],
          },
          kpis: [],
          tenantId: user?.tenantId || '',
        };

        if (options.format === 'pdf') {
          ReportGenerationService.generatePDF('relatorio_executivo', reportData, {
            title: latestReport.title,
            includeCharts: options.includeCharts,
            includeDetails: options.includeDetails,
          });
        } else if (options.format === 'excel') {
          ReportGenerationService.generateExcel('relatorio_executivo', reportData, {
            includeCharts: options.includeCharts,
            separateSheets: true,
          });
        } else {
          ReportGenerationService.generateExecutiveReport(latestReport, reportData);
        }

        addNotification({
          type: 'success',
          title: 'Relatório Executivo Gerado',
          message: `O relatório foi gerado com sucesso em formato ${options.format === 'both' ? 'PDF e Excel' : options.format.toUpperCase()}.`,
        });
      } catch (error) {
        console.error('Error generating executive report:', error);
        addNotification({
          type: 'error',
          title: 'Erro na Geração',
          message: 'Não foi possível gerar o relatório executivo. Tente novamente.',
        });
      }
    },
    [generateReportData, executiveReports, user, addNotification]
  );

  const generateFinancialReport = useCallback(
    (options: ReportGenerationOptions = { format: 'both' }) => {
      try {
        const reportData = generateReportData(options.dateRange);

        if (options.format === 'pdf') {
          ReportGenerationService.generatePDF('relatorio_financeiro', reportData, {
            title: 'Relatório Financeiro',
            includeDetails: options.includeDetails,
          });
        } else if (options.format === 'excel') {
          ReportGenerationService.generateExcel('relatorio_financeiro', reportData);
        } else {
          ReportGenerationService.generateFinancialReport(reportData);
        }

        addNotification({
          type: 'success',
          title: 'Relatório Financeiro Gerado',
          message: `O relatório financeiro foi gerado com sucesso.`,
        });
      } catch (error) {
        console.error('Error generating financial report:', error);
        addNotification({
          type: 'error',
          title: 'Erro na Geração',
          message: 'Não foi possível gerar o relatório financeiro.',
        });
      }
    },
    [generateReportData, addNotification]
  );

  const generateProductivityReport = useCallback(
    (options: ReportGenerationOptions = { format: 'both' }) => {
      try {
        const reportData = generateReportData(options.dateRange);

        if (options.format === 'pdf') {
          ReportGenerationService.generatePDF('relatorio_produtividade', reportData, {
            title: 'Relatório de Produtividade',
            includeDetails: options.includeDetails,
          });
        } else if (options.format === 'excel') {
          ReportGenerationService.generateExcel('relatorio_produtividade', reportData);
        } else {
          ReportGenerationService.generateProductivityReport({
            ...reportData,
            productivityMetrics: reportData.productivityMetrics || [],
          });
        }

        addNotification({
          type: 'success',
          title: 'Relatório de Produtividade Gerado',
          message: `O relatório de produtividade foi gerado com sucesso.`,
        });
      } catch (error) {
        console.error('Error generating productivity report:', error);
        addNotification({
          type: 'error',
          title: 'Erro na Geração',
          message: 'Não foi possível gerar o relatório de produtividade.',
        });
      }
    },
    [generateReportData, addNotification]
  );

  const generatePatientReport = useCallback(
    (options: ReportGenerationOptions = { format: 'both' }) => {
      try {
        const reportData = generateReportData(options.dateRange);

        if (options.format === 'pdf') {
          ReportGenerationService.generatePDF('relatorio_pacientes', reportData, {
            title: 'Relatório de Pacientes',
            includeDetails: options.includeDetails,
          });
        } else if (options.format === 'excel') {
          ReportGenerationService.generateExcel('relatorio_pacientes', reportData);
        } else {
          ReportGenerationService.generatePatientReport(reportData);
        }

        addNotification({
          type: 'success',
          title: 'Relatório de Pacientes Gerado',
          message: `O relatório de pacientes foi gerado com sucesso.`,
        });
      } catch (error) {
        console.error('Error generating patient report:', error);
        addNotification({
          type: 'error',
          title: 'Erro na Geração',
          message: 'Não foi possível gerar o relatório de pacientes.',
        });
      }
    },
    [generateReportData, addNotification]
  );

  const generateCustomReport = useCallback(
    (
      title: string,
      selectedData: {
        includePatients?: boolean;
        includeAppointments?: boolean;
        includeTransactions?: boolean;
        includeQuality?: boolean;
        includeProductivity?: boolean;
        includeEquipment?: boolean;
      },
      options: ReportGenerationOptions = { format: 'both' }
    ) => {
      try {
        const fullReportData = generateReportData(options.dateRange);
        
        // Filter data based on selection
        const customReportData: ReportData = {
          kpis: fullReportData.kpis,
          period: fullReportData.period,
        };

        if (selectedData.includePatients) {
          customReportData.patients = fullReportData.patients;
        }
        if (selectedData.includeAppointments) {
          customReportData.appointments = fullReportData.appointments;
        }
        if (selectedData.includeTransactions) {
          customReportData.transactions = fullReportData.transactions;
        }
        if (selectedData.includeQuality) {
          customReportData.qualityIndicators = fullReportData.qualityIndicators;
        }
        if (selectedData.includeProductivity) {
          customReportData.productivityMetrics = fullReportData.productivityMetrics;
        }
        if (selectedData.includeEquipment) {
          customReportData.equipment = fullReportData.equipment;
        }

        if (options.format === 'pdf') {
          ReportGenerationService.generatePDF('relatorio_personalizado', customReportData, {
            title,
            includeDetails: options.includeDetails,
          });
        } else if (options.format === 'excel') {
          ReportGenerationService.generateExcel('relatorio_personalizado', customReportData);
        } else {
          ReportGenerationService.generatePDF('relatorio_personalizado', customReportData, {
            title,
            includeDetails: options.includeDetails,
          });
          setTimeout(() => {
            ReportGenerationService.generateExcel('relatorio_personalizado', customReportData);
          }, 1000);
        }

        addNotification({
          type: 'success',
          title: 'Relatório Personalizado Gerado',
          message: `O relatório "${title}" foi gerado com sucesso.`,
        });
      } catch (error) {
        console.error('Error generating custom report:', error);
        addNotification({
          type: 'error',
          title: 'Erro na Geração',
          message: 'Não foi possível gerar o relatório personalizado.',
        });
      }
    },
    [generateReportData, addNotification]
  );

  return {
    generateExecutiveReport,
    generateFinancialReport,
    generateProductivityReport,
    generatePatientReport,
    generateCustomReport,
    generateReportData,
  };
};

export default useReportGeneration;