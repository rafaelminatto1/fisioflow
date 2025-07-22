import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Patient,
  Appointment,
  Transaction,
  QualityIndicator,
  ProductivityMetric,
  Equipment,
  ExecutiveReport,
  User,
} from '../types';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ReportData {
  patients?: Patient[];
  appointments?: Appointment[];
  transactions?: Transaction[];
  qualityIndicators?: QualityIndicator[];
  productivityMetrics?: ProductivityMetric[];
  equipment?: Equipment[];
  users?: User[];
  kpis?: {
    totalRevenue: number;
    totalPatients: number;
    totalAppointments: number;
    averageSatisfaction: number;
    utilizationRate: number;
  };
  period?: {
    start: string;
    end: string;
  };
}

export class ReportGenerationService {
  /**
   * Gera relatório em PDF
   */
  static generatePDF(
    reportType: string,
    data: ReportData,
    options: {
      title?: string;
      includeCharts?: boolean;
      includeDetails?: boolean;
    } = {}
  ): void {
    const doc = new jsPDF();
    const { title = 'Relatório FisioFlow', includeDetails = true } = options;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55); // slate-800
    doc.text(title, 20, 25);

    // Date
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 35);

    if (data.period) {
      doc.text(
        `Período: ${new Date(data.period.start).toLocaleDateString('pt-BR')} - ${new Date(data.period.end).toLocaleDateString('pt-BR')}`,
        20,
        42
      );
    }

    let yPosition = 55;

    // KPIs Summary
    if (data.kpis) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text('KPIs Principais', 20, yPosition);
      yPosition += 10;

      const kpiData = [
        ['KPI', 'Valor'],
        ['Receita Total', `R$ ${data.kpis.totalRevenue.toLocaleString('pt-BR')}`],
        ['Total de Pacientes', data.kpis.totalPatients.toString()],
        ['Total de Consultas', data.kpis.totalAppointments.toString()],
        ['Satisfação Média', `${data.kpis.averageSatisfaction.toFixed(1)}/5`],
        ['Taxa de Utilização', `${data.kpis.utilizationRate.toFixed(1)}%`],
      ];

      doc.autoTable({
        startY: yPosition,
        head: [kpiData[0]],
        body: kpiData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // blue-500
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detailed sections if requested
    if (includeDetails) {
      // Patients Table
      if (data.patients && data.patients.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 25;
        }

        doc.setFontSize(14);
        doc.text('Pacientes', 20, yPosition);
        yPosition += 10;

        const patientData = data.patients.slice(0, 20).map((patient) => [
          patient.name,
          patient.email,
          patient.phone || 'N/A',
          patient.consent.given ? 'Sim' : 'Não',
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Nome', 'Email', 'Telefone', 'Consentimento']],
          body: patientData,
          theme: 'striped',
          styles: { fontSize: 9 },
          margin: { left: 20, right: 20 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Appointments Table
      if (data.appointments && data.appointments.length > 0) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 25;
        }

        doc.setFontSize(14);
        doc.text('Consultas Recentes', 20, yPosition);
        yPosition += 10;

        const appointmentData = data.appointments.slice(0, 15).map((apt) => [
          apt.title,
          new Date(apt.start).toLocaleDateString('pt-BR'),
          new Date(apt.start).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          apt.status || 'Agendado',
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Título', 'Data', 'Hora', 'Status']],
          body: appointmentData,
          theme: 'striped',
          styles: { fontSize: 9 },
          margin: { left: 20, right: 20 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Financial Summary
      if (data.transactions && data.transactions.length > 0) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 25;
        }

        doc.setFontSize(14);
        doc.text('Resumo Financeiro', 20, yPosition);
        yPosition += 10;

        const paidTransactions = data.transactions.filter(t => t.status === 'pago');
        const pendingTransactions = data.transactions.filter(t => t.status === 'pendente');
        const totalPaid = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

        const financialData = [
          ['Métrica', 'Valor'],
          ['Total Recebido', `R$ ${totalPaid.toLocaleString('pt-BR')}`],
          ['Total Pendente', `R$ ${totalPending.toLocaleString('pt-BR')}`],
          ['Transações Pagas', paidTransactions.length.toString()],
          ['Transações Pendentes', pendingTransactions.length.toString()],
        ];

        doc.autoTable({
          startY: yPosition,
          head: [financialData[0]],
          body: financialData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] }, // emerald-500
          styles: { fontSize: 10 },
          margin: { left: 20, right: 20 },
        });
      }
    }

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Página ${i} de ${totalPages} - FisioFlow`,
        doc.internal.pageSize.width - 50,
        doc.internal.pageSize.height - 10
      );
    }

    // Save
    const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  /**
   * Gera relatório em Excel
   */
  static generateExcel(
    reportType: string,
    data: ReportData,
    options: {
      includeCharts?: boolean;
      separateSheets?: boolean;
    } = {}
  ): void {
    const { separateSheets = true } = options;
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    if (data.kpis) {
      const summaryData = [
        ['KPI', 'Valor'],
        ['Receita Total', data.kpis.totalRevenue],
        ['Total de Pacientes', data.kpis.totalPatients],
        ['Total de Consultas', data.kpis.totalAppointments],
        ['Satisfação Média', data.kpis.averageSatisfaction],
        ['Taxa de Utilização (%)', data.kpis.utilizationRate],
        [],
        ['Relatório gerado em:', new Date().toLocaleDateString('pt-BR')],
      ];

      if (data.period) {
        summaryData.push([
          'Período:',
          `${new Date(data.period.start).toLocaleDateString('pt-BR')} - ${new Date(data.period.end).toLocaleDateString('pt-BR')}`,
        ]);
      }

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWS, 'Resumo');
    }

    // Patients Sheet
    if (data.patients && data.patients.length > 0) {
      const patientData = [
        ['Nome', 'Email', 'Telefone', 'Consentimento', 'Data de Cadastro'],
        ...data.patients.map((patient) => [
          patient.name,
          patient.email,
          patient.phone || '',
          patient.consent.given ? 'Sim' : 'Não',
          patient.consent.timestamp ? new Date(patient.consent.timestamp).toLocaleDateString('pt-BR') : '',
        ]),
      ];

      const patientsWS = XLSX.utils.aoa_to_sheet(patientData);
      XLSX.utils.book_append_sheet(workbook, patientsWS, 'Pacientes');
    }

    // Appointments Sheet
    if (data.appointments && data.appointments.length > 0) {
      const appointmentData = [
        ['Título', 'Data', 'Hora Início', 'Hora Fim', 'Status', 'Observações'],
        ...data.appointments.map((apt) => [
          apt.title,
          new Date(apt.start).toLocaleDateString('pt-BR'),
          new Date(apt.start).toLocaleTimeString('pt-BR'),
          new Date(apt.end).toLocaleTimeString('pt-BR'),
          apt.status || 'Agendado',
          apt.notes || '',
        ]),
      ];

      const appointmentsWS = XLSX.utils.aoa_to_sheet(appointmentData);
      XLSX.utils.book_append_sheet(workbook, appointmentsWS, 'Consultas');
    }

    // Transactions Sheet
    if (data.transactions && data.transactions.length > 0) {
      const transactionData = [
        ['Descrição', 'Valor', 'Status', 'Data Vencimento', 'Tipo', 'Método'],
        ...data.transactions.map((trans) => [
          trans.description,
          trans.amount,
          trans.status,
          new Date(trans.dueDate).toLocaleDateString('pt-BR'),
          trans.type,
          trans.paymentMethod || '',
        ]),
      ];

      const transactionsWS = XLSX.utils.aoa_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(workbook, transactionsWS, 'Transações');
    }

    // Quality Indicators Sheet
    if (data.qualityIndicators && data.qualityIndicators.length > 0) {
      const qualityData = [
        ['Tipo', 'Valor', 'Unidade', 'Data', 'Meta'],
        ...data.qualityIndicators.map((qi) => [
          qi.type,
          qi.value,
          qi.unit,
          new Date(qi.timestamp).toLocaleDateString('pt-BR'),
          qi.target || '',
        ]),
      ];

      const qualityWS = XLSX.utils.aoa_to_sheet(qualityData);
      XLSX.utils.book_append_sheet(workbook, qualityWS, 'Qualidade');
    }

    // Equipment Sheet
    if (data.equipment && data.equipment.length > 0) {
      const equipmentData = [
        ['Nome', 'Tipo', 'Status', 'Localização', 'Última Manutenção', 'Próxima Manutenção'],
        ...data.equipment.map((eq) => [
          eq.name,
          eq.type,
          eq.status,
          eq.location,
          eq.lastMaintenance ? new Date(eq.lastMaintenance).toLocaleDateString('pt-BR') : '',
          eq.nextMaintenance ? new Date(eq.nextMaintenance).toLocaleDateString('pt-BR') : '',
        ]),
      ];

      const equipmentWS = XLSX.utils.aoa_to_sheet(equipmentData);
      XLSX.utils.book_append_sheet(workbook, equipmentWS, 'Equipamentos');
    }

    // Save
    const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([wbout], { type: 'application/octet-stream' }),
      filename
    );
  }

  /**
   * Gera relatório executivo completo (PDF + Excel)
   */
  static generateExecutiveReport(
    executiveReport: ExecutiveReport,
    data: ReportData
  ): void {
    // Generate PDF
    this.generatePDF('relatorio_executivo', data, {
      title: executiveReport.title,
      includeCharts: true,
      includeDetails: true,
    });

    // Generate Excel after a small delay to avoid file conflicts
    setTimeout(() => {
      this.generateExcel('relatorio_executivo', data, {
        includeCharts: true,
        separateSheets: true,
      });
    }, 1000);
  }

  /**
   * Gera relatório de produtividade
   */
  static generateProductivityReport(
    data: ReportData & { productivityMetrics: ProductivityMetric[] }
  ): void {
    const reportData: ReportData = {
      ...data,
      kpis: {
        totalRevenue: data.kpis?.totalRevenue || 0,
        totalPatients: data.kpis?.totalPatients || 0,
        totalAppointments: data.kpis?.totalAppointments || 0,
        averageSatisfaction: data.kpis?.averageSatisfaction || 0,
        utilizationRate: data.kpis?.utilizationRate || 0,
      },
    };

    this.generatePDF('relatorio_produtividade', reportData, {
      title: 'Relatório de Produtividade',
      includeDetails: true,
    });

    setTimeout(() => {
      this.generateExcel('relatorio_produtividade', reportData, {
        separateSheets: true,
      });
    }, 1000);
  }

  /**
   * Gera relatório financeiro
   */
  static generateFinancialReport(data: ReportData): void {
    this.generatePDF('relatorio_financeiro', data, {
      title: 'Relatório Financeiro',
      includeDetails: true,
    });

    setTimeout(() => {
      this.generateExcel('relatorio_financeiro', data, {
        separateSheets: true,
      });
    }, 1000);
  }

  /**
   * Gera relatório de pacientes
   */
  static generatePatientReport(data: ReportData): void {
    this.generatePDF('relatorio_pacientes', data, {
      title: 'Relatório de Pacientes',
      includeDetails: true,
    });

    setTimeout(() => {
      this.generateExcel('relatorio_pacientes', data, {
        separateSheets: false,
      });
    }, 1000);
  }
}

export default ReportGenerationService;