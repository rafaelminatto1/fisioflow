import QRCode from 'qrcode';

import { Prescription, Exercise, Patient } from '../types';

export interface QRCodeData {
  id: string;
  type: 'exercise' | 'prescription' | 'patient_portal' | 'program' | 'payment' | 'appointment' | 'checkin' | 'contact' | 'wifi' | 'location' | 'feedback' | 'emergency';
  exerciseId?: string;
  prescriptionId?: string;
  patientId?: string;
  appointmentId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  contactInfo?: ContactInfo;
  wifiCredentials?: WiFiCredentials;
  locationData?: LocationData;
  emergencyInfo?: EmergencyInfo;
  customData?: Record<string, any>;
  timestamp: string;
  expiresAt?: string;
  tenantId: string;
}

export interface ContactInfo {
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  website?: string;
}

export interface WiFiCredentials {
  ssid: string;
  password: string;
  security: 'WEP' | 'WPA' | 'WPA2' | 'nopass';
  hidden?: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface EmergencyInfo {
  name: string;
  phone: string;
  relationship: string;
  medicalInfo?: string;
  allergies?: string[];
  medications?: string[];
}

export interface QRCodeAnalytics {
  id: string;
  qrCodeId: string;
  accessedAt: string;
  userAgent: string;
  ipAddress?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  success: boolean;
  tenantId: string;
}

class QRCodeService {
  private baseUrl: string;

  constructor() {
    // Em produção, isso seria uma variável de ambiente
    this.baseUrl = window.location.origin;
  }

  /**
   * Gera URL única e segura para acesso via QR Code
   */
  generateSecureUrl(data: QRCodeData): string {
    const params = new URLSearchParams({
      qr: btoa(JSON.stringify(data)),
      t: Date.now().toString()
    });

    switch (data.type) {
      case 'exercise':
        return `${this.baseUrl}/qr/exercise?${params.toString()}`;
      case 'prescription':
        return `${this.baseUrl}/qr/prescription?${params.toString()}`;
      case 'patient_portal':
        return `${this.baseUrl}/qr/patient?${params.toString()}`;
      case 'program':
        return `${this.baseUrl}/qr/program?${params.toString()}`;
      default:
        throw new Error('Tipo de QR Code inválido');
    }
  }

  /**
   * Gera QR Code para exercício específico
   */
  async generateExerciseQR(exercise: Exercise, tenantId: string): Promise<string> {
    const data: QRCodeData = {
      id: `ex-${exercise.id}-${Date.now()}`,
      type: 'exercise',
      exerciseId: exercise.id,
      timestamp: new Date().toISOString(),
      tenantId,
    };

    const url = this.generateSecureUrl(data);
    
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  }

  /**
   * Gera QR Code para prescrição específica
   */
  async generatePrescriptionQR(prescription: Prescription, exercise: Exercise, tenantId: string): Promise<string> {
    const data: QRCodeData = {
      id: `pr-${prescription.id}-${Date.now()}`,
      type: 'prescription',
      prescriptionId: prescription.id,
      exerciseId: prescription.exerciseId,
      timestamp: new Date().toISOString(),
      tenantId,
    };

    const url = this.generateSecureUrl(data);
    
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  }

  /**
   * Gera QR Code para programa completo do paciente
   */
  async generatePatientProgramQR(patientId: string, tenantId: string): Promise<string> {
    const data: QRCodeData = {
      id: `pg-${patientId}-${Date.now()}`,
      type: 'program',
      patientId,
      timestamp: new Date().toISOString(),
      tenantId,
    };

    const url = this.generateSecureUrl(data);
    
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  }

  /**
   * Gera QR Code para portal do paciente
   */
  async generatePatientPortalQR(patientId: string, tenantId: string): Promise<string> {
    const data: QRCodeData = {
      id: `pt-${patientId}-${Date.now()}`,
      type: 'patient_portal',
      patientId,
      timestamp: new Date().toISOString(),
      tenantId,
    };

    const url = this.generateSecureUrl(data);
    
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  }

  /**
   * Decodifica dados do QR Code
   */
  decodeQRData(encodedData: string): QRCodeData | null {
    try {
      return JSON.parse(atob(encodedData));
    } catch (error) {
      console.error('Erro ao decodificar QR Code:', error);
      return null;
    }
  }

  /**
   * Valida se o QR Code ainda é válido (não expirado)
   */
  isQRCodeValid(data: QRCodeData, maxAgeHours: number = 24): boolean {
    const createdAt = new Date(data.timestamp);
    const now = new Date();
    const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    return ageInHours <= maxAgeHours;
  }

  /**
   * Registra acesso via QR Code para analytics
   */
  trackQRAccess(qrCodeId: string, tenantId: string, success: boolean = true): QRCodeAnalytics {
    const userAgent = navigator.userAgent;
    const deviceType = this.detectDeviceType(userAgent);

    const analytics: QRCodeAnalytics = {
      id: `qa-${crypto.randomUUID()}`,
      qrCodeId,
      accessedAt: new Date().toISOString(),
      userAgent,
      deviceType,
      success,
      tenantId,
    };

    // Em uma implementação real, isso seria enviado para um endpoint de analytics
    this.saveAnalytics(analytics);

    return analytics;
  }

  /**
   * Detecta tipo de dispositivo
   */
  private detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const tabletRegex = /iPad|Android(?=.*Mobile)/i;

    if (tabletRegex.test(userAgent)) {
      return 'tablet';
    } else if (mobileRegex.test(userAgent)) {
      return 'mobile';
    } else {
      return 'desktop';
    }
  }

  /**
   * Salva analytics no localStorage (em produção seria uma API)
   */
  private saveAnalytics(analytics: QRCodeAnalytics): void {
    try {
      const existingAnalytics = JSON.parse(localStorage.getItem('qr-analytics') || '[]');
      existingAnalytics.push(analytics);
      
      // Manter apenas os últimos 1000 registros
      if (existingAnalytics.length > 1000) {
        existingAnalytics.splice(0, existingAnalytics.length - 1000);
      }
      
      localStorage.setItem('qr-analytics', JSON.stringify(existingAnalytics));
    } catch (error) {
      console.error('Erro ao salvar analytics:', error);
    }
  }

  /**
   * Recupera analytics de QR Code
   */
  getAnalytics(tenantId: string, qrCodeId?: string): QRCodeAnalytics[] {
    try {
      const allAnalytics = JSON.parse(localStorage.getItem('qr-analytics') || '[]');
      
      return allAnalytics.filter((item: QRCodeAnalytics) => {
        const matchesTenant = item.tenantId === tenantId;
        const matchesQR = !qrCodeId || item.qrCodeId === qrCodeId;
        return matchesTenant && matchesQR;
      });
    } catch (error) {
      console.error('Erro ao recuperar analytics:', error);
      return [];
    }
  }

  /**
   * Gera estatísticas de uso
   */
  getUsageStats(tenantId: string, days: number = 30): {
    totalAccesses: number;
    uniqueQRCodes: number;
    deviceBreakdown: Record<string, number>;
    dailyAccesses: Record<string, number>;
    successRate: number;
  } {
    const analytics = this.getAnalytics(tenantId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentAnalytics = analytics.filter(
      item => new Date(item.accessedAt) >= cutoffDate
    );

    const uniqueQRCodes = new Set(recentAnalytics.map(item => item.qrCodeId)).size;
    const deviceBreakdown = recentAnalytics.reduce((acc, item) => {
      acc[item.deviceType] = (acc[item.deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dailyAccesses = recentAnalytics.reduce((acc, item) => {
      const date = new Date(item.accessedAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const successfulAccesses = recentAnalytics.filter(item => item.success).length;
    const successRate = recentAnalytics.length > 0 
      ? (successfulAccesses / recentAnalytics.length) * 100 
      : 0;

    return {
      totalAccesses: recentAnalytics.length,
      uniqueQRCodes,
      deviceBreakdown,
      dailyAccesses,
      successRate,
    };
  }

  // =====================================
  // ENHANCED QR CODE FEATURES
  // =====================================

  /**
   * Gera QR Code para pagamento PIX/Cartão
   */
  async generatePaymentQR(
    paymentId: string,
    amount: number,
    currency: string = 'BRL',
    tenantId: string,
    expirationHours: number = 24,
    customOptions?: Partial<QRCode.QRCodeToDataURLOptions>
  ): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const data: QRCodeData = {
      id: `pay-${paymentId}-${Date.now()}`,
      type: 'payment',
      paymentId,
      amount,
      currency,
      timestamp: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      tenantId,
    };

    const url = this.generateSecureUrl(data);
    
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#00875F', // Green for payment
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H', // High correction for payment
      ...customOptions
    });
  }

  /**
   * Gera QR Code para check-in de consulta
   */
  async generateAppointmentCheckInQR(
    appointmentId: string,
    patientId: string,
    tenantId: string,
    customOptions?: Partial<QRCode.QRCodeToDataURLOptions>
  ): Promise<string> {
    const data: QRCodeData = {
      id: `checkin-${appointmentId}-${Date.now()}`,
      type: 'checkin',
      appointmentId,
      patientId,
      timestamp: new Date().toISOString(),
      tenantId,
    };

    const url = this.generateSecureUrl(data);
    
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1E40AF', // Blue for appointments
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M',
      ...customOptions
    });
  }

  /**
   * Gera QR Code para informações de contato (vCard)
   */
  async generateContactQR(
    contactInfo: ContactInfo,
    tenantId: string,
    customOptions?: Partial<QRCode.QRCodeToDataURLOptions>
  ): Promise<string> {
    // Generate vCard format
    let vCard = 'BEGIN:VCARD\nVERSION:3.0\n';
    vCard += `FN:${contactInfo.name}\n`;
    
    if (contactInfo.phone) {
      vCard += `TEL:${contactInfo.phone}\n`;
    }
    
    if (contactInfo.email) {
      vCard += `EMAIL:${contactInfo.email}\n`;
    }
    
    if (contactInfo.organization) {
      vCard += `ORG:${contactInfo.organization}\n`;
    }
    
    if (contactInfo.website) {
      vCard += `URL:${contactInfo.website}\n`;
    }
    
    vCard += 'END:VCARD';

    return await QRCode.toDataURL(vCard, {
      width: 300,
      margin: 2,
      color: {
        dark: '#7C3AED', // Purple for contact
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M',
      ...customOptions
    });
  }

  /**
   * Gera QR Code para conexão WiFi
   */
  async generateWiFiQR(
    wifiCredentials: WiFiCredentials,
    tenantId: string,
    customOptions?: Partial<QRCode.QRCodeToDataURLOptions>
  ): Promise<string> {
    // Generate WiFi connection string
    let wifiString = `WIFI:T:${wifiCredentials.security};S:${wifiCredentials.ssid};P:${wifiCredentials.password}`;
    
    if (wifiCredentials.hidden) {
      wifiString += ';H:true';
    }
    
    wifiString += ';;';

    return await QRCode.toDataURL(wifiString, {
      width: 300,
      margin: 2,
      color: {
        dark: '#059669', // Teal for WiFi
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M',
      ...customOptions
    });
  }

  /**
   * Gera QR Code para localização (Google Maps)
   */
  async generateLocationQR(
    locationData: LocationData,
    tenantId: string,
    customOptions?: Partial<QRCode.QRCodeToDataURLOptions>
  ): Promise<string> {
    // Generate Google Maps URL
    let locationUrl = `https://maps.google.com/maps?q=${locationData.latitude},${locationData.longitude}`;
    
    if (locationData.name) {
      locationUrl += `&query_place_id=${encodeURIComponent(locationData.name)}`;
    }

    return await QRCode.toDataURL(locationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#DC2626', // Red for location
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M',
      ...customOptions
    });
  }

  /**
   * Gera QR Code para informações de emergência
   */
  async generateEmergencyQR(
    emergencyInfo: EmergencyInfo,
    patientId: string,
    tenantId: string,
    customOptions?: Partial<QRCode.QRCodeToDataURLOptions>
  ): Promise<string> {
    const data: QRCodeData = {
      id: `emergency-${patientId}-${Date.now()}`,
      type: 'emergency',
      patientId,
      emergencyInfo,
      timestamp: new Date().toISOString(),
      tenantId,
    };

    const url = this.generateSecureUrl(data);
    
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#DC2626', // Red for emergency
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H', // High correction for emergency
      ...customOptions
    });
  }

  /**
   * Gera QR Code para formulário de feedback
   */
  async generateFeedbackQR(
    patientId: string,
    appointmentId: string,
    tenantId: string,
    customOptions?: Partial<QRCode.QRCodeToDataURLOptions>
  ): Promise<string> {
    const data: QRCodeData = {
      id: `feedback-${appointmentId}-${Date.now()}`,
      type: 'feedback',
      patientId,
      appointmentId,
      timestamp: new Date().toISOString(),
      tenantId,
    };

    const url = this.generateSecureUrl(data);
    
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#EA580C', // Orange for feedback
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M',
      ...customOptions
    });
  }

  /**
   * Gera QR Code customizado com dados livres
   */
  async generateCustomQR(
    content: string,
    type: QRCodeData['type'] = 'program',
    tenantId: string,
    customData?: Record<string, any>,
    customOptions?: Partial<QRCode.QRCodeToDataURLOptions>
  ): Promise<string> {
    // Check if content is already a URL or needs to be processed as data
    let qrContent: string;
    
    if (content.startsWith('http://') || content.startsWith('https://')) {
      qrContent = content;
    } else {
      const data: QRCodeData = {
        id: `custom-${Date.now()}`,
        type,
        customData: { content, ...customData },
        timestamp: new Date().toISOString(),
        tenantId,
      };
      qrContent = this.generateSecureUrl(data);
    }
    
    return await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: {
        dark: '#374151', // Gray for custom
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M',
      ...customOptions
    });
  }

  /**
   * Gera múltiplos QR Codes em lote
   */
  async generateBulkQRCodes(
    requests: Array<{
      id: string;
      type: QRCodeData['type'];
      data: Partial<QRCodeData>;
      options?: Partial<QRCode.QRCodeToDataURLOptions>;
    }>,
    tenantId: string
  ): Promise<Array<{ id: string; qrCode: string; url: string }>> {
    const results = [];

    for (const request of requests) {
      try {
        const qrData: QRCodeData = {
          id: request.id,
          type: request.type,
          timestamp: new Date().toISOString(),
          tenantId,
          ...request.data
        };

        const url = this.generateSecureUrl(qrData);
        const qrCode = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'M',
          ...request.options
        });

        results.push({
          id: request.id,
          qrCode,
          url
        });
      } catch (error) {
        console.error(`Error generating QR code for ${request.id}:`, error);
        results.push({
          id: request.id,
          qrCode: '',
          url: ''
        });
      }
    }

    return results;
  }

  /**
   * Gera QR Code com logo/marca personalizada
   */
  async generateBrandedQR(
    data: QRCodeData,
    logoUrl: string,
    customOptions?: Partial<QRCode.QRCodeToDataURLOptions>
  ): Promise<string> {
    const url = this.generateSecureUrl(data);
    
    // Generate base QR code
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H', // High correction for logo overlay
      ...customOptions
    });

    // In a real implementation, you would overlay the logo using canvas
    // For now, we'll return the base QR code with enhanced error correction
    return qrDataUrl;
  }

  /**
   * Gera QR Code para impressão com informações adicionais
   */
  async generatePrintableQR(
    data: QRCodeData,
    options: {
      title?: string;
      subtitle?: string;
      instructions?: string;
      includeUrl?: boolean;
      size?: number;
    } = {}
  ): Promise<{
    qrCode: string;
    metadata: {
      title: string;
      subtitle: string;
      instructions: string;
      url: string;
      generatedAt: string;
    };
  }> {
    const url = this.generateSecureUrl(data);
    
    const qrCode = await QRCode.toDataURL(url, {
      width: options.size || 300,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const metadata = {
      title: options.title || this.getDefaultTitle(data.type),
      subtitle: options.subtitle || `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} QR Code`,
      instructions: options.instructions || this.getDefaultInstructions(data.type),
      url: options.includeUrl ? url : '',
      generatedAt: new Date().toLocaleString('pt-BR')
    };

    return { qrCode, metadata };
  }

  /**
   * Valida QR Code e retorna informações detalhadas
   */
  validateQRCode(encodedData: string): {
    isValid: boolean;
    data?: QRCodeData;
    error?: string;
    isExpired?: boolean;
    timeRemaining?: number;
  } {
    try {
      const data = this.decodeQRData(encodedData);
      
      if (!data) {
        return { isValid: false, error: 'Invalid QR code data' };
      }

      // Check if expired
      let isExpired = false;
      let timeRemaining = 0;

      if (data.expiresAt) {
        const expirationTime = new Date(data.expiresAt).getTime();
        const currentTime = new Date().getTime();
        isExpired = currentTime > expirationTime;
        timeRemaining = Math.max(0, expirationTime - currentTime);
      }

      return {
        isValid: !isExpired,
        data,
        isExpired,
        timeRemaining
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Gera relatório de uso de QR Codes
   */
  generateUsageReport(tenantId: string, dateRange?: { start: string; end: string }): {
    summary: {
      totalGenerated: number;
      totalScanned: number;
      mostUsedType: string;
      successRate: number;
    };
    byType: Record<string, {
      generated: number;
      scanned: number;
      successRate: number;
    }>;
    byDevice: Record<string, number>;
    timeline: Array<{
      date: string;
      scans: number;
      success: number;
    }>;
  } {
    const analytics = this.getAnalytics(tenantId);
    
    // Filter by date range if provided
    const filteredAnalytics = dateRange ? analytics.filter(item => {
      const itemDate = new Date(item.accessedAt);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    }) : analytics;

    // Get generated QR codes from localStorage (in a real app, this would be from database)
    const generatedQRs = this.getGeneratedQRCodes(tenantId, dateRange);

    // Calculate summary
    const totalScanned = filteredAnalytics.length;
    const successfulScans = filteredAnalytics.filter(item => item.success).length;
    const successRate = totalScanned > 0 ? (successfulScans / totalScanned) * 100 : 0;

    // Group by type
    const typeStats = generatedQRs.reduce((acc, qr) => {
      const type = qr.type;
      if (!acc[type]) {
        acc[type] = { generated: 0, scanned: 0, successRate: 0 };
      }
      acc[type].generated++;
      return acc;
    }, {} as Record<string, any>);

    // Add scan data to type stats
    filteredAnalytics.forEach(item => {
      const qrData = generatedQRs.find(qr => qr.id === item.qrCodeId);
      if (qrData) {
        typeStats[qrData.type].scanned++;
        if (item.success) {
          typeStats[qrData.type].successRate++;
        }
      }
    });

    // Calculate success rates
    Object.keys(typeStats).forEach(type => {
      const stats = typeStats[type];
      stats.successRate = stats.scanned > 0 ? (stats.successRate / stats.scanned) * 100 : 0;
    });

    // Find most used type
    const mostUsedType = Object.keys(typeStats).reduce((max, type) => 
      typeStats[type].scanned > (typeStats[max]?.scanned || 0) ? type : max, '');

    // Group by device
    const byDevice = filteredAnalytics.reduce((acc, item) => {
      acc[item.deviceType] = (acc[item.deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate timeline
    const timeline = this.generateTimeline(filteredAnalytics);

    return {
      summary: {
        totalGenerated: generatedQRs.length,
        totalScanned,
        mostUsedType,
        successRate
      },
      byType: typeStats,
      byDevice,
      timeline
    };
  }

  private getDefaultTitle(type: QRCodeData['type']): string {
    const titles: Record<QRCodeData['type'], string> = {
      exercise: 'Exercício de Fisioterapia',
      prescription: 'Prescrição Médica',
      patient_portal: 'Portal do Paciente',
      program: 'Programa de Tratamento',
      payment: 'Pagamento Online',
      appointment: 'Consulta Médica',
      checkin: 'Check-in da Consulta',
      contact: 'Informações de Contato',
      wifi: 'Conexão WiFi',
      location: 'Localização',
      feedback: 'Avaliação de Atendimento',
      emergency: 'Informações de Emergência'
    };
    return titles[type] || 'QR Code';
  }

  private getDefaultInstructions(type: QRCodeData['type']): string {
    const instructions: Record<QRCodeData['type'], string> = {
      exercise: 'Escaneie para acessar as instruções do exercício',
      prescription: 'Escaneie para visualizar a prescrição completa',
      patient_portal: 'Escaneie para acessar o portal do paciente',
      program: 'Escaneie para ver seu programa de tratamento',
      payment: 'Escaneie para realizar o pagamento',
      appointment: 'Escaneie para confirmar sua consulta',
      checkin: 'Escaneie para fazer check-in na consulta',
      contact: 'Escaneie para adicionar aos contatos',
      wifi: 'Escaneie para conectar à rede WiFi',
      location: 'Escaneie para abrir no Google Maps',
      feedback: 'Escaneie para avaliar o atendimento',
      emergency: 'Escaneie para acessar informações de emergência'
    };
    return instructions[type] || 'Escaneie este código QR com seu celular';
  }

  private getGeneratedQRCodes(tenantId: string, dateRange?: { start: string; end: string }): QRCodeData[] {
    // In a real implementation, this would query the database
    // For now, we'll return a mock array or load from localStorage
    try {
      const stored = localStorage.getItem(`qr-codes-${tenantId}`) || '[]';
      let qrCodes = JSON.parse(stored);

      if (dateRange) {
        qrCodes = qrCodes.filter((qr: QRCodeData) => {
          const qrDate = new Date(qr.timestamp);
          return qrDate >= new Date(dateRange.start) && qrDate <= new Date(dateRange.end);
        });
      }

      return qrCodes;
    } catch (error) {
      console.error('Error loading generated QR codes:', error);
      return [];
    }
  }

  private generateTimeline(analytics: QRCodeAnalytics[]): Array<{
    date: string;
    scans: number;
    success: number;
  }> {
    const timeline = analytics.reduce((acc, item) => {
      const date = new Date(item.accessedAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { scans: 0, success: 0 };
      }
      acc[date].scans++;
      if (item.success) {
        acc[date].success++;
      }
      return acc;
    }, {} as Record<string, { scans: number; success: number }>);

    return Object.keys(timeline)
      .sort()
      .map(date => ({
        date,
        scans: timeline[date].scans,
        success: timeline[date].success
      }));
  }

  /**
   * Salva QR Code gerado para tracking
   */
  private saveGeneratedQRCode(data: QRCodeData): void {
    try {
      const storageKey = `qr-codes-${data.tenantId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(data);
      
      // Keep only last 10000 records
      if (existing.length > 10000) {
        existing.splice(0, existing.length - 10000);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (error) {
      console.error('Error saving generated QR code:', error);
    }
  }

  private generateSignature(data: QRCodeData): string {
    // Simple signature generation (in production, use proper cryptographic signing)
    const payload = `${data.id}-${data.type}-${data.timestamp}-${data.tenantId}`;
    return btoa(payload).slice(0, 16);
  }
}

export const qrCodeService = new QRCodeService();