import QRCode from 'qrcode';
import { Prescription, Exercise, Patient } from '../types';

export interface QRCodeData {
  id: string;
  type: 'exercise' | 'prescription' | 'patient_portal' | 'program';
  exerciseId?: string;
  prescriptionId?: string;
  patientId?: string;
  timestamp: string;
  tenantId: string;
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
}

export const qrCodeService = new QRCodeService();