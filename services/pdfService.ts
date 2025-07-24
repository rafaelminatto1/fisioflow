import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';
import { Exercise, ExerciseVideo, ExerciseImage, Prescription, Patient } from '../types';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
  }
}

interface PDFExerciseData {
  exercise: Exercise;
  videos: ExerciseVideo[];
  images: ExerciseImage[];
  qrCodeUrl?: string;
  prescription?: Prescription;
  patient?: Patient;
}

class PDFService {
  private readonly pageWidth = 210; // A4 width in mm
  private readonly pageHeight = 297; // A4 height in mm
  private readonly margin = 20;

  /**
   * Gera PDF completo do exercício com QR Code
   */
  async generateExercisePDF(data: PDFExerciseData): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Header
    this.addHeader(pdf, 'Exercício Fisioterapêutico');
    
    let yPosition = 40;

    // QR Code (se fornecido)
    if (data.qrCodeUrl) {
      yPosition = await this.addQRCode(pdf, data.qrCodeUrl, yPosition);
      yPosition += 10;
    }

    // Exercise Info
    yPosition = this.addExerciseInfo(pdf, data.exercise, yPosition);
    
    // Patient Info (se fornecido)
    if (data.patient) {
      yPosition = this.addPatientInfo(pdf, data.patient, yPosition);
    }

    // Prescription Info (se fornecido)
    if (data.prescription) {
      yPosition = this.addPrescriptionInfo(pdf, data.prescription, yPosition);
    }

    // Videos section
    if (data.videos.length > 0) {
      yPosition = this.addVideosSection(pdf, data.videos, yPosition);
    }

    // Images section
    if (data.images.length > 0) {
      yPosition = await this.addImagesSection(pdf, data.images, yPosition);
    }

    // Instructions
    yPosition = this.addInstructions(pdf, yPosition);

    // Footer
    this.addFooter(pdf);

    return pdf.output('blob');
  }

  /**
   * Gera PDF de prescrição com múltiplos exercícios
   */
  async generatePrescriptionPDF(
    exercises: PDFExerciseData[],
    patient: Patient,
    therapistName: string
  ): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Header
    this.addHeader(pdf, 'Prescrição de Exercícios');
    
    let yPosition = 40;

    // Patient Info
    yPosition = this.addPatientInfo(pdf, patient, yPosition);
    yPosition += 10;

    // Therapist Info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Fisioterapeuta:', this.margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(therapistName, this.margin + 35, yPosition);
    yPosition += 15;

    // Date
    pdf.setFont('helvetica', 'bold');
    pdf.text('Data:', this.margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Date().toLocaleDateString('pt-BR'), this.margin + 20, yPosition);
    yPosition += 20;

    // Exercises summary table
    const tableData = exercises.map((exerciseData, index) => [
      (index + 1).toString(),
      exerciseData.exercise.name,
      exerciseData.exercise.category,
      exerciseData.exercise.bodyPart,
      exerciseData.prescription ? `${exerciseData.prescription.sets}x${exerciseData.prescription.repetitions}` : 'N/A'
    ]);

    pdf.autoTable({
      head: [['#', 'Exercício', 'Categoria', 'Região', 'Séries/Rep.']],
      body: tableData,
      startY: yPosition,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: this.margin, right: this.margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 20;

    // Individual exercise pages
    for (let i = 0; i < exercises.length; i++) {
      pdf.addPage();
      
      this.addHeader(pdf, `Exercício ${i + 1}: ${exercises[i].exercise.name}`);
      
      let pageY = 40;
      
      // QR Code
      if (exercises[i].qrCodeUrl) {
        pageY = await this.addQRCode(pdf, exercises[i].qrCodeUrl, pageY);
        pageY += 10;
      }

      // Exercise details
      pageY = this.addExerciseInfo(pdf, exercises[i].exercise, pageY);
      
      if (exercises[i].prescription) {
        pageY = this.addPrescriptionInfo(pdf, exercises[i].prescription, pageY);
      }

      // Instructions
      this.addInstructions(pdf, pageY);
    }

    this.addFooter(pdf);

    return pdf.output('blob');
  }

  /**
   * Gera PDF apenas com QR Code para impressão
   */
  async generateQRCodePDF(
    qrCodeUrl: string,
    title: string,
    description: string,
    instructions?: string[]
  ): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Center the content
    const centerX = this.pageWidth / 2;
    let yPosition = 60;

    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, centerX - titleWidth / 2, yPosition);
    yPosition += 20;

    // QR Code (centered and larger)
    const qrSize = 80;
    const qrX = centerX - qrSize / 2;
    
    try {
      pdf.addImage(qrCodeUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
      yPosition += qrSize + 20;
    } catch (error) {
      console.error('Erro ao adicionar QR Code:', error);
      // Fallback: draw a placeholder
      pdf.rect(qrX, yPosition, qrSize, qrSize);
      pdf.text('QR Code', centerX - 15, yPosition + qrSize / 2);
      yPosition += qrSize + 20;
    }

    // Description
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const descLines = pdf.splitTextToSize(description, this.pageWidth - 2 * this.margin);
    descLines.forEach((line: string) => {
      pdf.text(line, this.margin, yPosition);
      yPosition += 7;
    });
    yPosition += 10;

    // Instructions
    if (instructions && instructions.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Como usar:', this.margin, yPosition);
      yPosition += 10;

      pdf.setFont('helvetica', 'normal');
      instructions.forEach((instruction, index) => {
        pdf.text(`${index + 1}. ${instruction}`, this.margin + 5, yPosition);
        yPosition += 7;
      });
    }

    // Add border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(10, 10, this.pageWidth - 20, this.pageHeight - 20);

    this.addFooter(pdf);

    return pdf.output('blob');
  }

  /**
   * Adiciona header ao PDF
   */
  private addHeader(pdf: jsPDF, title: string): void {
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(title, this.margin, 25);
    
    // Line under header
    pdf.setDrawColor(41, 128, 185);
    pdf.setLineWidth(0.5);
    pdf.line(this.margin, 30, this.pageWidth - this.margin, 30);
    
    pdf.setTextColor(0, 0, 0);
  }

  /**
   * Adiciona QR Code ao PDF
   */
  private async addQRCode(pdf: jsPDF, qrCodeUrl: string, yPosition: number): Promise<number> {
    const qrSize = 40;
    const qrX = this.pageWidth - this.margin - qrSize;

    try {
      pdf.addImage(qrCodeUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
      
      // QR Code label
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Escaneie para', qrX + 5, yPosition + qrSize + 5);
      pdf.text('acesso mobile', qrX + 5, yPosition + qrSize + 10);
      
      return yPosition + qrSize + 15;
    } catch (error) {
      console.error('Erro ao adicionar QR Code:', error);
      return yPosition;
    }
  }

  /**
   * Adiciona informações do exercício
   */
  private addExerciseInfo(pdf: jsPDF, exercise: Exercise, yPosition: number): number {
    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(exercise.name, this.margin, yPosition);
    yPosition += 12;

    // Categories
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFillColor(59, 130, 246);
    pdf.setTextColor(255, 255, 255);
    pdf.roundedRect(this.margin, yPosition - 3, 30, 6, 1, 1, 'F');
    pdf.text(exercise.category, this.margin + 2, yPosition + 1);

    pdf.setFillColor(16, 185, 129);
    pdf.roundedRect(this.margin + 35, yPosition - 3, 30, 6, 1, 1, 'F');
    pdf.text(exercise.bodyPart, this.margin + 37, yPosition + 1);
    
    pdf.setTextColor(0, 0, 0);
    yPosition += 15;

    // Description
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Descrição:', this.margin, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    const descLines = pdf.splitTextToSize(exercise.description, this.pageWidth - 2 * this.margin - 50);
    descLines.forEach((line: string) => {
      pdf.text(line, this.margin, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    return yPosition;
  }

  /**
   * Adiciona informações do paciente
   */
  private addPatientInfo(pdf: jsPDF, patient: Patient, yPosition: number): number {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Informações do Paciente', this.margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${patient.name}`, this.margin, yPosition);
    yPosition += 6;
    pdf.text(`CPF: ${patient.cpf}`, this.margin, yPosition);
    yPosition += 6;
    pdf.text(`Telefone: ${patient.phone}`, this.margin, yPosition);
    yPosition += 15;

    return yPosition;
  }

  /**
   * Adiciona informações da prescrição
   */
  private addPrescriptionInfo(pdf: jsPDF, prescription: Prescription, yPosition: number): number {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Prescrição', this.margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Séries: ${prescription.sets}`, this.margin, yPosition);
    pdf.text(`Repetições: ${prescription.repetitions}`, this.margin + 40, yPosition);
    pdf.text(`Descanso: ${prescription.restTime || 'N/A'}`, this.margin + 90, yPosition);
    yPosition += 8;

    if (prescription.notes) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Observações:', this.margin, yPosition);
      yPosition += 6;
      pdf.setFont('helvetica', 'normal');
      const notesLines = pdf.splitTextToSize(prescription.notes, this.pageWidth - 2 * this.margin);
      notesLines.forEach((line: string) => {
        pdf.text(line, this.margin, yPosition);
        yPosition += 6;
      });
    }
    yPosition += 10;

    return yPosition;
  }

  /**
   * Adiciona seção de vídeos
   */
  private addVideosSection(pdf: jsPDF, videos: ExerciseVideo[], yPosition: number): number {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Vídeos Demonstrativos (${videos.length})`, this.margin, yPosition);
    yPosition += 10;

    videos.forEach((video, index) => {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${video.title}`, this.margin + 5, yPosition);
      yPosition += 6;

      if (video.description) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const descLines = pdf.splitTextToSize(video.description, this.pageWidth - 2 * this.margin - 10);
        descLines.forEach((line: string) => {
          pdf.text(line, this.margin + 8, yPosition);
          yPosition += 5;
        });
      }

      if (video.duration > 0) {
        pdf.text(`Duração: ${this.formatDuration(video.duration)}`, this.margin + 8, yPosition);
        yPosition += 6;
      }

      yPosition += 3;
    });

    return yPosition + 10;
  }

  /**
   * Adiciona seção de imagens
   */
  private async addImagesSection(pdf: jsPDF, images: ExerciseImage[], yPosition: number): Promise<number> {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Imagens Explicativas (${images.length})`, this.margin, yPosition);
    yPosition += 10;

    for (let i = 0; i < Math.min(images.length, 4); i++) {
      const image = images[i];
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${i + 1}. ${image.title}`, this.margin + 5, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Categoria: ${this.getCategoryLabel(image.category)}`, this.margin + 8, yPosition);
      yPosition += 5;

      if (image.caption) {
        const captionLines = pdf.splitTextToSize(image.caption, this.pageWidth - 2 * this.margin - 10);
        captionLines.forEach((line: string) => {
          pdf.text(line, this.margin + 8, yPosition);
          yPosition += 5;
        });
      }

      yPosition += 8;
    }

    if (images.length > 4) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`... e mais ${images.length - 4} imagens disponíveis via QR Code`, this.margin + 5, yPosition);
      yPosition += 10;
    }

    return yPosition + 10;
  }

  /**
   * Adiciona instruções gerais
   */
  private addInstructions(pdf: jsPDF, yPosition: number): number {
    // Check if we need a new page
    if (yPosition > this.pageHeight - 80) {
      pdf.addPage();
      yPosition = this.margin;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Instruções Importantes', this.margin, yPosition);
    yPosition += 10;

    const instructions = [
      'Execute os movimentos de forma lenta e controlada',
      'Respeite os limites do seu corpo e pare em caso de dor',
      'Mantenha a respiração adequada durante o exercício',
      'Siga as repetições e séries prescritas',
      'Em caso de dúvidas, consulte seu fisioterapeuta',
      'Use o QR Code para acessar vídeos demonstrativos'
    ];

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    instructions.forEach((instruction, index) => {
      pdf.text(`• ${instruction}`, this.margin + 5, yPosition);
      yPosition += 7;
    });

    return yPosition + 15;
  }

  /**
   * Adiciona footer ao PDF
   */
  private addFooter(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Footer line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(this.margin, this.pageHeight - 20, this.pageWidth - this.margin, this.pageHeight - 20);
      
      // Footer text
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      
      pdf.text('FisioFlow - Sistema de Gestão Fisioterapêutica', this.margin, this.pageHeight - 12);
      pdf.text(`Página ${i} de ${pageCount}`, this.pageWidth - this.margin - 20, this.pageHeight - 12);
      pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, this.margin, this.pageHeight - 6);
    }
  }

  /**
   * Formata duração em minutos:segundos
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Obtém label da categoria de imagem
   */
  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'initial_position': 'Posição Inicial',
      'execution': 'Execução',
      'final_position': 'Posição Final',
      'anatomy': 'Anatomia',
      'equipment': 'Equipamentos',
      'variation': 'Variação'
    };
    return labels[category] || 'Imagem';
  }

  /**
   * Salva PDF como arquivo
   */
  async savePDF(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Abre PDF em nova aba
   */
  async openPDF(blob: Blob): Promise<void> {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}

export const pdfService = new PDFService();