/**
 * Sistema de Criptografia Client-Side para dados médicos sensíveis
 * Implementa AES-256-GCM para criptografia e SHA-256 para hashing
 * Conforme LGPD e requisitos de segurança médica
 */

// Tipos para dados criptografados
export interface EncryptedData {
  encryptedContent: string;
  iv: string;
  tag: string;
  algorithm: 'AES-256-GCM';
  timestamp: string;
}

export interface HashedData {
  hash: string;
  salt: string;
  algorithm: 'SHA-256';
  iterations: number;
}

export interface EncryptionKeyInfo {
  keyId: string;
  derivedFrom: 'password' | 'tenant-key';
  createdAt: string;
  lastUsed: string;
}

class EncryptionManager {
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12;
  private readonly TAG_LENGTH = 16;
  private readonly SALT_LENGTH = 32;
  private readonly PBKDF2_ITERATIONS = 100000;

  // Cache de chaves derivadas para performance
  private keyCache: Map<string, CryptoKey> = new Map();

  /**
   * Deriva uma chave criptográfica a partir de uma senha/tenantId
   */
  async deriveKey(
    password: string, 
    salt: Uint8Array, 
    iterations = this.PBKDF2_ITERATIONS
  ): Promise<CryptoKey> {
    const cacheKey = `${password}_${Array.from(salt).join('')}_${iterations}`;
    
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    // Cache da chave por 30 minutos
    this.keyCache.set(cacheKey, key);
    setTimeout(() => this.keyCache.delete(cacheKey), 30 * 60 * 1000);

    return key;
  }

  /**
   * Gera uma chave específica para um tenant
   */
  async generateTenantKey(tenantId: string, masterPassword: string): Promise<{
    key: CryptoKey;
    salt: Uint8Array;
    keyInfo: EncryptionKeyInfo;
  }> {
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const keyMaterial = `${masterPassword}_${tenantId}_${Date.now()}`;
    const key = await this.deriveKey(keyMaterial, salt);

    const keyInfo: EncryptionKeyInfo = {
      keyId: `tenant_${tenantId}_${Date.now()}`,
      derivedFrom: 'tenant-key',
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    return { key, salt, keyInfo };
  }

  /**
   * Criptografa dados sensíveis usando AES-256-GCM
   */
  async encryptSensitiveData<T>(
    data: T, 
    encryptionKey: CryptoKey
  ): Promise<EncryptedData> {
    try {
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);
      const dataBuffer = encoder.encode(dataString);

      // Gerar IV aleatório
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Criptografar
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH * 8
        },
        encryptionKey,
        dataBuffer
      );

      // Separar conteúdo criptografado e tag de autenticação
      const encrypted = new Uint8Array(encryptedBuffer);
      const encryptedContent = encrypted.slice(0, -this.TAG_LENGTH);
      const tag = encrypted.slice(-this.TAG_LENGTH);

      return {
        encryptedContent: Array.from(encryptedContent)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        iv: Array.from(iv)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        tag: Array.from(tag)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        algorithm: 'AES-256-GCM',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro na criptografia:', error);
      throw new Error('Falha na criptografia dos dados sensíveis');
    }
  }

  /**
   * Descriptografa dados sensíveis
   */
  async decryptSensitiveData<T>(
    encryptedData: EncryptedData, 
    encryptionKey: CryptoKey
  ): Promise<T> {
    try {
      if (encryptedData.algorithm !== 'AES-256-GCM') {
        throw new Error('Algoritmo de criptografia não suportado');
      }

      // Converter hex strings de volta para Uint8Array
      const encryptedContent = new Uint8Array(
        encryptedData.encryptedContent.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );
      const iv = new Uint8Array(
        encryptedData.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );
      const tag = new Uint8Array(
        encryptedData.tag.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );

      // Combinar conteúdo e tag
      const encryptedBuffer = new Uint8Array(encryptedContent.length + tag.length);
      encryptedBuffer.set(encryptedContent);
      encryptedBuffer.set(tag, encryptedContent.length);

      // Descriptografar
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH * 8
        },
        encryptionKey,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decryptedBuffer);
      return JSON.parse(decryptedString) as T;
    } catch (error) {
      console.error('Erro na descriptografia:', error);
      throw new Error('Falha na descriptografia dos dados');
    }
  }

  /**
   * Cria hash seguro para dados (LGPD compliance)
   */
  async hashSensitiveData(data: string): Promise<HashedData> {
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Combinar dados com salt
    const saltedData = new Uint8Array(dataBuffer.length + salt.length);
    saltedData.set(dataBuffer);
    saltedData.set(salt, dataBuffer.length);

    // Aplicar múltiplas iterações de hash
    let hash = saltedData;
    for (let i = 0; i < this.PBKDF2_ITERATIONS; i++) {
      hash = new Uint8Array(await crypto.subtle.digest('SHA-256', hash));
    }

    return {
      hash: Array.from(hash)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      salt: Array.from(salt)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      algorithm: 'SHA-256',
      iterations: this.PBKDF2_ITERATIONS
    };
  }

  /**
   * Verifica se um dado corresponde ao hash
   */
  async verifyHash(data: string, hashedData: HashedData): Promise<boolean> {
    const salt = new Uint8Array(
      hashedData.salt.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Combinar dados com salt
    const saltedData = new Uint8Array(dataBuffer.length + salt.length);
    saltedData.set(dataBuffer);
    saltedData.set(salt, dataBuffer.length);

    // Aplicar múltiplas iterações de hash
    let hash = saltedData;
    for (let i = 0; i < hashedData.iterations; i++) {
      hash = new Uint8Array(await crypto.subtle.digest('SHA-256', hash));
    }

    const computedHash = Array.from(hash)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedHash === hashedData.hash;
  }

  /**
   * Criptografia específica para dados médicos (pacientes)
   */
  async encryptPatientData(
    patientData: any, 
    tenantId: string, 
    masterKey: string
  ): Promise<{
    publicData: any;
    encryptedData: EncryptedData;
    dataHash: HashedData;
  }> {
    // Separar dados públicos dos sensíveis
    const { 
      name, 
      email, 
      phone, 
      avatarUrl, 
      createdAt, 
      id, 
      tenantId: patientTenantId,
      ...sensitiveData 
    } = patientData;

    const publicData = {
      id,
      name,
      email,
      phone,
      avatarUrl,
      createdAt,
      tenantId: patientTenantId
    };

    // Gerar chave específica para este tenant
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const encryptionKey = await this.deriveKey(`${masterKey}_${tenantId}`, salt);

    // Criptografar dados sensíveis
    const encryptedData = await this.encryptSensitiveData(sensitiveData, encryptionKey);

    // Hash dos dados para auditoria
    const dataHash = await this.hashSensitiveData(
      JSON.stringify({ ...publicData, sensitiveDataHash: encryptedData.encryptedContent })
    );

    return {
      publicData,
      encryptedData,
      dataHash
    };
  }

  /**
   * Descriptografar dados de paciente
   */
  async decryptPatientData(
    publicData: any,
    encryptedData: EncryptedData,
    tenantId: string,
    masterKey: string
  ): Promise<any> {
    // Regenerar a mesma chave usada na criptografia
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const encryptionKey = await this.deriveKey(`${masterKey}_${tenantId}`, salt);

    try {
      const sensitiveData = await this.decryptSensitiveData(encryptedData, encryptionKey);
      
      // Combinar dados públicos e sensíveis
      return {
        ...publicData,
        ...sensitiveData
      };
    } catch (error) {
      console.error('Falha na descriptografia dos dados do paciente:', error);
      throw new Error('Não foi possível descriptografar os dados do paciente');
    }
  }

  /**
   * Limpar cache de chaves (segurança)
   */
  clearKeyCache(): void {
    this.keyCache.clear();
  }

  /**
   * Gerar chave mestra aleatória para tenant
   */
  generateMasterKey(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Verificar se os dados estão íntegros
   */
  async verifyDataIntegrity(
    data: any,
    expectedHash: HashedData
  ): Promise<boolean> {
    const dataString = JSON.stringify(data);
    return await this.verifyHash(dataString, expectedHash);
  }
}

// Interface para dados de paciente seguros
export interface SecurePatientData {
  publicData: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
    createdAt: string;
    tenantId: string;
  };
  encryptedData: EncryptedData;
  dataHash: HashedData;
  lastModified: string;
  encryptionVersion: number;
}

// Interface para logs de auditoria LGPD-compliant
export interface LGPDAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userRole: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'CONSENT';
  entityType: 'PATIENT' | 'ASSESSMENT' | 'DOCUMENT' | 'EXERCISE_LOG';
  entityId: string;
  dataFields: string[]; // Campos acessados
  purpose: string; // Finalidade do acesso
  legalBasis: 'CONSENT' | 'CONTRACT' | 'LEGAL_OBLIGATION' | 'VITAL_INTERESTS' | 'PUBLIC_TASK' | 'LEGITIMATE_INTERESTS';
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
  dataHash: string;
  consentId?: string;
  retentionPeriod?: string;
  anonymized: boolean;
}

// Instância singleton
export const encryption = new EncryptionManager();

export default encryption;