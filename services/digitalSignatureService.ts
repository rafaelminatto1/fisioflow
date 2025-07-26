/**
 * Serviço de Assinatura Digital
 * Sistema compatível com ICP-Brasil e padrões internacionais
 */

import type {
  DigitalSignature,
  SignatureMethod,
  CertificateInfo,
  ValidationResult,
  Geolocation,
  BiometricData
} from '../types/legalDocuments';

interface SignatureRequest {
  documentId: string;
  signerId: string;
  signerName: string;
  signerRole: string;
  signerCPF?: string;
  method: SignatureMethod;
  certificateData?: string;
  biometricData?: BiometricData;
  location?: Geolocation;
}

interface SignatureConfiguration {
  requireCertificate: boolean;
  requireBiometric: boolean;
  requireGeolocation: boolean;
  allowedMethods: SignatureMethod[];
  minimumKeySize: number;
  validityPeriod: number; // em dias
  timestampServer: string;
  ocspServer: string;
}

class DigitalSignatureService {
  private signatures: Map<string, DigitalSignature[]> = new Map();
  private certificates: Map<string, CertificateInfo> = new Map();
  private validationCache: Map<string, ValidationResult> = new Map();

  private config: SignatureConfiguration = {
    requireCertificate: false, // Para desenvolvimento, em produção deve ser true
    requireBiometric: false,
    requireGeolocation: false,
    allowedMethods: [
      SignatureMethod.EMAIL_CONFIRMATION,
      SignatureMethod.SMS_TOKEN,
      SignatureMethod.PIN_CODE,
      SignatureMethod.DIGITAL_CERTIFICATE,
      SignatureMethod.QUALIFIED_SIGNATURE
    ],
    minimumKeySize: 2048,
    validityPeriod: 10 * 365, // 10 anos
    timestampServer: 'http://timestamp.iti.gov.br',
    ocspServer: 'http://ocsp.iti.gov.br'
  };

  constructor() {
    this.loadFromStorage();
  }

  /**
   * ============== ASSINATURA DE DOCUMENTOS ==============
   */

  /**
   * Cria uma assinatura digital para um documento
   */
  async signDocument(request: SignatureRequest): Promise<DigitalSignature> {
    // Valida se o método é permitido
    if (!this.config.allowedMethods.includes(request.method)) {
      throw new Error(`Método de assinatura ${request.method} não permitido`);
    }

    // Valida certificado se necessário
    let certificateInfo: CertificateInfo;
    if (this.config.requireCertificate || request.method === SignatureMethod.DIGITAL_CERTIFICATE) {
      if (!request.certificateData) {
        throw new Error('Certificado digital obrigatório para este método');
      }
      certificateInfo = await this.validateCertificate(request.certificateData);
    } else {
      certificateInfo = this.generateSelfSignedCertificate(request);
    }

    // Coleta dados de contexto
    const timestamp = new Date().toISOString();
    const ipAddress = await this.getClientIP();
    const userAgent = this.getUserAgent();
    const geolocation = request.location || (this.config.requireGeolocation ? await this.getCurrentLocation() : undefined);

    // Cria a assinatura
    const signature: DigitalSignature = {
      id: this.generateSignatureId(),
      signerId: request.signerId,
      signerName: request.signerName,
      signerRole: request.signerRole,
      signerCPF: request.signerCPF,
      signatureMethod: request.method,
      timestamp,
      certificateInfo,
      ipAddress,
      userAgent,
      geolocation,
      biometricData: request.biometricData,
      isValid: true,
      validationResult: await this.performInitialValidation(certificateInfo, request.method)
    };

    // Armazena a assinatura
    const documentSignatures = this.signatures.get(request.documentId) || [];
    documentSignatures.push(signature);
    this.signatures.set(request.documentId, documentSignatures);

    // Salva certificado para referência futura
    this.certificates.set(signature.id, certificateInfo);

    // Log da assinatura
    this.logSignatureEvent(request.documentId, signature, 'SIGNATURE_CREATED');

    await this.saveToStorage();
    return signature;
  }

  /**
   * Valida certificado digital
   */
  private async validateCertificate(certificateData: string): Promise<CertificateInfo> {
    try {
      // Em produção, aqui seria feita validação real do certificado X.509
      // Por ora, simulamos a estrutura de um certificado válido
      
      const cert = this.parseCertificate(certificateData);
      
      // Valida se o certificado não expirou
      const now = new Date();
      const validFrom = new Date(cert.validFrom);
      const validTo = new Date(cert.validTo);
      
      if (now < validFrom || now > validTo) {
        throw new Error('Certificado expirado ou ainda não válido');
      }

      // Valida se é ICP-Brasil (para certificados brasileiros)
      if (cert.icpBrasil) {
        await this.validateICPBrasil(cert);
      }

      // Valida revogação via OCSP
      await this.checkRevocationStatus(cert);

      return cert;
    } catch (error) {
      throw new Error(`Erro na validação do certificado: ${error.message}`);
    }
  }

  /**
   * Parse básico de certificado (simulado)
   */
  private parseCertificate(certificateData: string): CertificateInfo {
    // Em produção, usar biblioteca como node-forge ou similar
    const mockCert: CertificateInfo = {
      serialNumber: this.generateSerialNumber(),
      issuer: 'AC FisioFlow Teste',
      subject: `CN=Usuario Teste`,
      validFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      algorithm: 'RSA-SHA256',
      fingerprint: this.generateFingerprint(),
      keyUsage: ['digitalSignature', 'nonRepudiation'],
      icpBrasil: certificateData.includes('ICP-Brasil')
    };

    return mockCert;
  }

  /**
   * Valida certificado ICP-Brasil
   */
  private async validateICPBrasil(cert: CertificateInfo): Promise<void> {
    // Validações específicas para ICP-Brasil
    if (!cert.issuer.includes('ICP-Brasil')) {
      throw new Error('Certificado não é da cadeia ICP-Brasil');
    }

    // Verifica se a autoridade certificadora é confiável
    const trustedCAs = [
      'AC Raiz',
      'AC Secretaria da Receita Federal do Brasil',
      'AC SERASA',
      'AC CERTISIGN',
      'AC Imprensa Oficial SP'
    ];

    const isTrusted = trustedCAs.some(ca => cert.issuer.includes(ca));
    if (!isTrusted) {
      console.warn('Autoridade certificadora não reconhecida');
    }
  }

  /**
   * Verifica status de revogação via OCSP
   */
  private async checkRevocationStatus(cert: CertificateInfo): Promise<void> {
    try {
      // Em produção, fazer requisição real para servidor OCSP
      const mockResponse = {
        status: 'good',
        thisUpdate: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      if (mockResponse.status === 'revoked') {
        throw new Error('Certificado foi revogado');
      }
    } catch (error) {
      console.warn('Não foi possível verificar status de revogação:', error);
      // Em ambiente de produção, decidir se bloqueia ou permite com aviso
    }
  }

  /**
   * Gera certificado auto-assinado para métodos simples
   */
  private generateSelfSignedCertificate(request: SignatureRequest): CertificateInfo {
    const now = new Date();
    const validTo = new Date(now.getTime() + this.config.validityPeriod * 24 * 60 * 60 * 1000);

    return {
      serialNumber: this.generateSerialNumber(),
      issuer: 'FisioFlow Self-Signed',
      subject: `CN=${request.signerName}`,
      validFrom: now.toISOString(),
      validTo: validTo.toISOString(),
      algorithm: 'SHA256',
      fingerprint: this.generateFingerprint(),
      keyUsage: ['digitalSignature'],
      icpBrasil: false
    };
  }

  /**
   * Validação inicial da assinatura
   */
  private async performInitialValidation(cert: CertificateInfo, method: SignatureMethod): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Valida método vs certificado
    if (method === SignatureMethod.QUALIFIED_SIGNATURE && !cert.icpBrasil) {
      warnings.push('Assinatura qualificada requer certificado ICP-Brasil');
    }

    // Valida período de validade
    const now = new Date();
    if (new Date(cert.validTo) < now) {
      errors.push('Certificado expirado');
    }

    // Valida algoritmo
    if (!cert.algorithm.includes('SHA256') && !cert.algorithm.includes('SHA512')) {
      warnings.push('Algoritmo de hash pode ser inseguro');
    }

    let trustLevel: 'low' | 'medium' | 'high' = 'medium';
    
    if (errors.length > 0) {
      trustLevel = 'low';
    } else if (cert.icpBrasil && method === SignatureMethod.QUALIFIED_SIGNATURE) {
      trustLevel = 'high';
    }

    return {
      isValid: errors.length === 0,
      timestamp: new Date().toISOString(),
      validator: 'FisioFlow Digital Signature Service v1.0',
      errors,
      warnings,
      trustLevel
    };
  }

  /**
   * ============== VALIDAÇÃO E VERIFICAÇÃO ==============
   */

  /**
   * Valida todas as assinaturas de um documento
   */
  async validateDocumentSignatures(documentId: string): Promise<ValidationResult[]> {
    const signatures = this.signatures.get(documentId) || [];
    const results: ValidationResult[] = [];

    for (const signature of signatures) {
      const cachedResult = this.validationCache.get(signature.id);
      if (cachedResult && this.isValidationRecent(cachedResult)) {
        results.push(cachedResult);
        continue;
      }

      const result = await this.validateSignature(signature);
      this.validationCache.set(signature.id, result);
      results.push(result);
    }

    return results;
  }

  /**
   * Valida uma assinatura específica
   */
  private async validateSignature(signature: DigitalSignature): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Valida certificado
      const cert = signature.certificateInfo;
      const now = new Date();

      if (new Date(cert.validTo) < now) {
        errors.push('Certificado expirado no momento da validação');
      }

      if (new Date(cert.validFrom) > new Date(signature.timestamp)) {
        errors.push('Certificado não era válido no momento da assinatura');
      }

      // Valida integridade temporal
      const signatureTime = new Date(signature.timestamp);
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
      if (now.getTime() - signatureTime.getTime() > maxAge) {
        warnings.push('Assinatura antiga, recomenda-se revalidação');
      }

      // Valida contexto de segurança
      if (!signature.ipAddress) {
        warnings.push('Endereço IP não registrado');
      }

      if (!signature.geolocation && this.config.requireGeolocation) {
        warnings.push('Localização geográfica não registrada');
      }

      // Valida método vs contexto
      if (signature.signatureMethod === SignatureMethod.QUALIFIED_SIGNATURE && !cert.icpBrasil) {
        errors.push('Assinatura qualificada requer certificado ICP-Brasil');
      }

    } catch (error) {
      errors.push(`Erro na validação: ${error.message}`);
    }

    const trustLevel: 'low' | 'medium' | 'high' = 
      errors.length > 0 ? 'low' :
      signature.certificateInfo.icpBrasil && signature.signatureMethod === SignatureMethod.QUALIFIED_SIGNATURE ? 'high' :
      'medium';

    return {
      isValid: errors.length === 0,
      timestamp: new Date().toISOString(),
      validator: 'FisioFlow Digital Signature Service v1.0',
      errors,
      warnings,
      trustLevel
    };
  }

  /**
   * ============== MÉTODOS DE ASSINATURA ESPECÍFICOS ==============
   */

  /**
   * Assinatura por email (confirmação via link)
   */
  async signByEmail(documentId: string, signerId: string, email: string): Promise<DigitalSignature> {
    // Gera token de confirmação
    const confirmationToken = this.generateConfirmationToken();
    
    // Em produção, enviaria email com link de confirmação
    console.log(`Email enviado para ${email} com token: ${confirmationToken}`);

    // Simula confirmação imediata para desenvolvimento
    return await this.signDocument({
      documentId,
      signerId,
      signerName: `Usuário ${signerId}`,
      signerRole: 'patient',
      method: SignatureMethod.EMAIL_CONFIRMATION
    });
  }

  /**
   * Assinatura por SMS (token)
   */
  async signBySMS(documentId: string, signerId: string, phone: string, token: string): Promise<DigitalSignature> {
    // Valida token SMS
    if (!this.validateSMSToken(phone, token)) {
      throw new Error('Token SMS inválido ou expirado');
    }

    return await this.signDocument({
      documentId,
      signerId,
      signerName: `Usuário ${signerId}`,
      signerRole: 'patient',
      method: SignatureMethod.SMS_TOKEN
    });
  }

  /**
   * Assinatura por PIN
   */
  async signByPIN(documentId: string, signerId: string, pin: string): Promise<DigitalSignature> {
    // Valida PIN
    if (!this.validatePIN(signerId, pin)) {
      throw new Error('PIN inválido');
    }

    return await this.signDocument({
      documentId,
      signerId,
      signerName: `Usuário ${signerId}`,
      signerRole: 'patient',
      method: SignatureMethod.PIN_CODE
    });
  }

  /**
   * Assinatura biométrica
   */
  async signByBiometric(documentId: string, signerId: string, biometricData: BiometricData): Promise<DigitalSignature> {
    // Valida dados biométricos
    if (!this.validateBiometric(signerId, biometricData)) {
      throw new Error('Dados biométricos não conferem');
    }

    return await this.signDocument({
      documentId,
      signerId,
      signerName: `Usuário ${signerId}`,
      signerRole: 'patient',
      method: SignatureMethod.BIOMETRIC,
      biometricData
    });
  }

  /**
   * ============== UTILITÁRIOS ==============
   */

  private validateSMSToken(phone: string, token: string): boolean {
    // Em produção, validaria token real
    return token.length === 6 && /^\d{6}$/.test(token);
  }

  private validatePIN(userId: string, pin: string): boolean {
    // Em produção, validaria contra PIN armazenado de forma segura
    return pin.length >= 4 && /^\d+$/.test(pin);
  }

  private validateBiometric(userId: string, biometric: BiometricData): boolean {
    // Em produção, faria comparação com template biométrico armazenado
    return biometric.confidence > 0.8;
  }

  private isValidationRecent(result: ValidationResult): boolean {
    const validationTime = new Date(result.timestamp);
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    return now.getTime() - validationTime.getTime() < maxAge;
  }

  private generateSignatureId(): string {
    return 'sig_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateSerialNumber(): string {
    return Math.random().toString(16).substr(2, 16).toUpperCase();
  }

  private generateFingerprint(): string {
    return Array.from({length: 20}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase();
  }

  private generateConfirmationToken(): string {
    return Math.random().toString(36).substr(2, 32).toUpperCase();
  }

  private async getClientIP(): Promise<string> {
    // Em produção, obteria IP real do cliente
    return '127.0.0.1';
  }

  private getUserAgent(): string {
    // Em produção, obteria user agent real
    return 'FisioFlow/1.0 (Digital Signature Service)';
  }

  private async getCurrentLocation(): Promise<Geolocation | undefined> {
    // Em produção, usaria API de geolocalização
    return {
      latitude: -23.5505,
      longitude: -46.6333,
      accuracy: 10,
      timestamp: new Date().toISOString(),
      address: 'São Paulo, SP, Brasil'
    };
  }

  private logSignatureEvent(documentId: string, signature: DigitalSignature, event: string): void {
    console.log(`[SIGNATURE_LOG] ${event}: Document ${documentId}, Signature ${signature.id}, Method ${signature.signatureMethod}`);
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = localStorage.getItem('fisioflow_signatures');
      if (saved) {
        const data = JSON.parse(saved);
        this.signatures = new Map(data.signatures || []);
        this.certificates = new Map(data.certificates || []);
        this.validationCache = new Map(data.validationCache || []);
      }
    } catch (error) {
      console.warn('Erro ao carregar assinaturas:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        signatures: Array.from(this.signatures.entries()),
        certificates: Array.from(this.certificates.entries()),
        validationCache: Array.from(this.validationCache.entries())
      };
      localStorage.setItem('fisioflow_signatures', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar assinaturas:', error);
    }
  }

  /**
   * ============== API PÚBLICA ==============
   */

  /**
   * Obtém assinaturas de um documento
   */
  getDocumentSignatures(documentId: string): DigitalSignature[] {
    return this.signatures.get(documentId) || [];
  }

  /**
   * Verifica se documento está assinado
   */
  isDocumentSigned(documentId: string): boolean {
    const signatures = this.signatures.get(documentId) || [];
    return signatures.some(sig => sig.isValid);
  }

  /**
   * Obtém estatísticas de assinaturas
   */
  getSignatureStats(): {
    totalSignatures: number;
    byMethod: Record<SignatureMethod, number>;
    validSignatures: number;
    invalidSignatures: number;
    averageValidationTime: number;
  } {
    const allSignatures = Array.from(this.signatures.values()).flat();
    
    const byMethod = {} as Record<SignatureMethod, number>;
    Object.values(SignatureMethod).forEach(method => {
      byMethod[method] = allSignatures.filter(sig => sig.signatureMethod === method).length;
    });

    return {
      totalSignatures: allSignatures.length,
      byMethod,
      validSignatures: allSignatures.filter(sig => sig.isValid).length,
      invalidSignatures: allSignatures.filter(sig => !sig.isValid).length,
      averageValidationTime: 0 // Placeholder
    };
  }

  /**
   * Remove assinaturas inválidas
   */
  async cleanupInvalidSignatures(): Promise<number> {
    let removedCount = 0;

    for (const [documentId, signatures] of this.signatures.entries()) {
      const validSignatures = signatures.filter(sig => sig.isValid);
      if (validSignatures.length !== signatures.length) {
        this.signatures.set(documentId, validSignatures);
        removedCount += signatures.length - validSignatures.length;
      }
    }

    if (removedCount > 0) {
      await this.saveToStorage();
    }

    return removedCount;
  }
}

// Instância singleton
export const digitalSignatureService = new DigitalSignatureService();

// Funções de conveniência
export async function signDocumentByEmail(documentId: string, signerId: string, email: string): Promise<DigitalSignature> {
  return await digitalSignatureService.signByEmail(documentId, signerId, email);
}

export async function signDocumentBySMS(documentId: string, signerId: string, phone: string, token: string): Promise<DigitalSignature> {
  return await digitalSignatureService.signBySMS(documentId, signerId, phone, token);
}

export async function signDocumentByPIN(documentId: string, signerId: string, pin: string): Promise<DigitalSignature> {
  return await digitalSignatureService.signByPIN(documentId, signerId, pin);
}

export async function validateAllSignatures(documentId: string): Promise<ValidationResult[]> {
  return await digitalSignatureService.validateDocumentSignatures(documentId);
}

export function getDocumentSignatures(documentId: string): DigitalSignature[] {
  return digitalSignatureService.getDocumentSignatures(documentId);
}

export function isDocumentSigned(documentId: string): boolean {
  return digitalSignatureService.isDocumentSigned(documentId);
}

export default digitalSignatureService;