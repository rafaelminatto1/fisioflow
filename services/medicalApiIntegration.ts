/**
 * Integração com APIs Médicas Padrão
 * Suporte para FHIR R4, ePrescription, ICD-10, SNOMED-CT e outras APIs médicas
 */

import { auditLogger, AuditAction, LegalBasis } from './auditLogger';
import { encryption } from './encryption';

// === INTERFACES FHIR R4 ===
interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  identifier?: FHIRIdentifier[];
}

interface FHIRIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary';
  type?: {
    coding: FHIRCoding[];
    text?: string;
  };
  system?: string;
  value: string;
}

interface FHIRCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  active?: boolean;
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: FHIRAddress[];
  contact?: FHIRPatientContact[];
  generalPractitioner?: FHIRReference[];
}

interface FHIRHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
}

interface FHIRAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface FHIRPatientContact {
  relationship?: {
    coding: FHIRCoding[];
  }[];
  name?: FHIRHumanName;
  telecom?: FHIRContactPoint[];
  address?: FHIRAddress;
  gender?: 'male' | 'female' | 'other' | 'unknown';
}

interface FHIRReference {
  reference?: string;
  type?: string;
  identifier?: FHIRIdentifier;
  display?: string;
}

interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: {
    coding: FHIRCoding[];
  }[];
  code: {
    coding: FHIRCoding[];
    text?: string;
  };
  subject: FHIRReference;
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  effectivePeriod?: {
    start?: string;
    end?: string;
  };
  issued?: string;
  performer?: FHIRReference[];
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
  interpretation?: {
    coding: FHIRCoding[];
  }[];
  note?: {
    text: string;
  }[];
}

interface FHIRCondition extends FHIRResource {
  resourceType: 'Condition';
  clinicalStatus?: {
    coding: FHIRCoding[];
  };
  verificationStatus?: {
    coding: FHIRCoding[];
  };
  category?: {
    coding: FHIRCoding[];
  }[];
  severity?: {
    coding: FHIRCoding[];
  };
  code?: {
    coding: FHIRCoding[];
    text?: string;
  };
  subject: FHIRReference;
  encounter?: FHIRReference;
  onsetDateTime?: string;
  recordedDate?: string;
  recorder?: FHIRReference;
  note?: {
    text: string;
  }[];
}

// === INTERFACES ePrescription ===
interface ePrescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  prescriberId: string;
  
  // Dados do prescritor
  prescriber: {
    name: string;
    crm: string;
    specialty: string;
    uf: string;
  };
  
  // Dados do paciente
  patient: {
    name: string;
    cpf: string;
    birthDate: string;
    gender: string;
  };
  
  // Medicamentos
  medications: ePrescriptionMedication[];
  
  // Metadados
  prescriptionDate: string;
  validUntil: string;
  status: 'active' | 'dispensed' | 'cancelled' | 'expired';
  
  // Controle
  controlledSubstance: boolean;
  digitalSignature: string;
  
  // Integração
  cfmNumber?: string; // Conselho Federal de Medicina
  anvísaCode?: string; // ANVISA
  
  createdAt: string;
  updatedAt: string;
}

interface ePrescriptionMedication {
  id: string;
  
  // Identificação
  name: string;
  activeIngredient: string;
  concentration: string;
  pharmaceuticalForm: string;
  
  // Códigos padronizados
  eanCode?: string; // Código de barras
  anvisaCode?: string; // Código ANVISA
  dcbCode?: string; // Denominação Comum Brasileira
  
  // Prescrição
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit: string;
  
  // Instruções
  instructions: string;
  warnings?: string[];
  
  // Status
  dispensed: boolean;
  dispensedDate?: string;
  dispensedQuantity?: number;
  pharmacyId?: string;
}

// === INTERFACES ICD-10 ===
interface ICD10Code {
  code: string;
  description: string;
  category: string;
  subcategory?: string;
  
  // Metadados
  version: string;
  isDeprecated: boolean;
  replacedBy?: string;
  
  // Relacionamentos
  parent?: string;
  children?: string[];
  relatedCodes?: string[];
}

// === INTERFACES SNOMED-CT ===
interface SNOMEDConcept {
  conceptId: string;
  term: string;
  fullySpecifiedName: string;
  
  // Hierarquia
  semanticTag: string;
  parents: string[];
  children: string[];
  
  // Status
  active: boolean;
  definitionStatus: 'primitive' | 'fully_defined';
  
  // Relacionamentos
  relationships: SNOMEDRelationship[];
  
  // Sinônimos
  synonyms: string[];
}

interface SNOMEDRelationship {
  relationshipId: string;
  sourceId: string;
  destinationId: string;
  typeId: string;
  characteristicType: 'stated' | 'inferred';
  active: boolean;
}

// === CONFIGURAÇÃO DE APIS ===
interface MedicalAPIConfig {
  fhir: {
    baseUrl: string;
    version: string;
    authentication: {
      type: 'oauth2' | 'basic' | 'apikey';
      credentials: Record<string, string>;
    };
    timeout: number;
  };
  
  ePrescription: {
    environment: 'sandbox' | 'production';
    certificatePath?: string;
    providerId: string;
    apiKey: string;
  };
  
  terminology: {
    icd10: {
      baseUrl: string;
      version: string;
      language: 'pt-BR' | 'en-US';
    };
    snomed: {
      baseUrl: string;
      edition: string;
      version: string;
    };
  };
}

// === CLASSE PRINCIPAL ===
class MedicalAPIIntegration {
  private config: MedicalAPIConfig;
  private authTokens: Map<string, { token: string; expiresAt: number }> = new Map();
  
  constructor(config: MedicalAPIConfig) {
    this.config = config;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🏥 Medical API Integration inicializado');
  }

  // === FHIR OPERATIONS ===

  /**
   * Buscar paciente no servidor FHIR
   */
  async getFHIRPatient(patientId: string, tenantId: string, userId: string): Promise<FHIRPatient | null> {
    try {
      const response = await this.makeFHIRRequest(
        `Patient/${patientId}`,
        'GET',
        null,
        tenantId,
        userId
      );

      if (response.resourceType === 'Patient') {
        await this.logFHIRAccess('Patient', patientId, 'read', tenantId, userId);
        return response as FHIRPatient;
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar paciente FHIR:', error);
      throw error;
    }
  }

  /**
   * Criar/atualizar paciente no servidor FHIR
   */
  async upsertFHIRPatient(patient: FHIRPatient, tenantId: string, userId: string): Promise<FHIRPatient> {
    try {
      const method = patient.id ? 'PUT' : 'POST';
      const endpoint = patient.id ? `Patient/${patient.id}` : 'Patient';

      const response = await this.makeFHIRRequest(
        endpoint,
        method,
        patient,
        tenantId,
        userId
      );

      await this.logFHIRAccess(
        'Patient',
        response.id,
        patient.id ? 'update' : 'create',
        tenantId,
        userId
      );

      return response as FHIRPatient;
    } catch (error) {
      console.error('❌ Erro ao criar/atualizar paciente FHIR:', error);
      throw error;
    }
  }

  /**
   * Buscar observações de um paciente
   */
  async getFHIRObservations(
    patientId: string,
    filters: {
      category?: string;
      code?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    } = {},
    tenantId: string,
    userId: string
  ): Promise<FHIRObservation[]> {
    try {
      const params = new URLSearchParams({
        subject: `Patient/${patientId}`,
        _sort: '-date',
        _count: (filters.limit || 50).toString(),
      });

      if (filters.category) params.append('category', filters.category);
      if (filters.code) params.append('code', filters.code);
      if (filters.dateFrom) params.append('date', `ge${filters.dateFrom}`);
      if (filters.dateTo) params.append('date', `le${filters.dateTo}`);

      const response = await this.makeFHIRRequest(
        `Observation?${params.toString()}`,
        'GET',
        null,
        tenantId,
        userId
      );

      await this.logFHIRAccess('Observation', patientId, 'search', tenantId, userId);

      return response.entry?.map((entry: any) => entry.resource) || [];
    } catch (error) {
      console.error('❌ Erro ao buscar observações FHIR:', error);
      throw error;
    }
  }

  /**
   * Criar observação FHIR
   */
  async createFHIRObservation(
    observation: Omit<FHIRObservation, 'id'>,
    tenantId: string,
    userId: string
  ): Promise<FHIRObservation> {
    try {
      const response = await this.makeFHIRRequest(
        'Observation',
        'POST',
        observation,
        tenantId,
        userId
      );

      await this.logFHIRAccess('Observation', response.id, 'create', tenantId, userId);

      return response as FHIRObservation;
    } catch (error) {
      console.error('❌ Erro ao criar observação FHIR:', error);
      throw error;
    }
  }

  // === ePrescription OPERATIONS ===

  /**
   * Criar prescrição eletrônica
   */
  async createePrescription(
    prescription: Omit<ePrescription, 'id' | 'prescriptionNumber' | 'digitalSignature' | 'createdAt' | 'updatedAt'>,
    tenantId: string,
    userId: string
  ): Promise<ePrescription> {
    try {
      // Gerar número da prescrição
      const prescriptionNumber = await this.generatePrescriptionNumber(tenantId);
      
      // Criar assinatura digital
      const digitalSignature = await this.createDigitalSignature(prescription, userId);

      const fullPrescription: ePrescription = {
        ...prescription,
        id: this.generateId(),
        prescriptionNumber,
        digitalSignature,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Enviar para serviço de ePrescription
      const response = await this.makeePrescriptionRequest(
        'prescriptions',
        'POST',
        fullPrescription,
        tenantId,
        userId
      );

      await this.logePrescriptionAccess(
        fullPrescription.id,
        'create',
        tenantId,
        userId
      );

      return response as ePrescription;
    } catch (error) {
      console.error('❌ Erro ao criar ePrescription:', error);
      throw error;
    }
  }

  /**
   * Validar prescrição eletrônica
   */
  async validateePrescription(
    prescriptionId: string,
    tenantId: string,
    userId: string
  ): Promise<{ isValid: boolean; errors?: string[]; warnings?: string[] }> {
    try {
      const response = await this.makeePrescriptionRequest(
        `prescriptions/${prescriptionId}/validate`,
        'POST',
        null,
        tenantId,
        userId
      );

      await this.logePrescriptionAccess(prescriptionId, 'validate', tenantId, userId);

      return response;
    } catch (error) {
      console.error('❌ Erro ao validar ePrescription:', error);
      throw error;
    }
  }

  /**
   * Dispensar medicamento
   */
  async dispenseMedication(
    prescriptionId: string,
    medicationId: string,
    dispensingData: {
      quantity: number;
      pharmacyId: string;
      pharmacistId: string;
      batchNumber?: string;
      expirationDate?: string;
    },
    tenantId: string,
    userId: string
  ): Promise<void> {
    try {
      await this.makeePrescriptionRequest(
        `prescriptions/${prescriptionId}/medications/${medicationId}/dispense`,
        'POST',
        dispensingData,
        tenantId,
        userId
      );

      await this.logePrescriptionAccess(
        prescriptionId,
        'dispense',
        tenantId,
        userId,
        { medicationId, ...dispensingData }
      );

      console.log(`💊 Medicamento dispensado: ${medicationId}`);
    } catch (error) {
      console.error('❌ Erro ao dispensar medicamento:', error);
      throw error;
    }
  }

  // === TERMINOLOGY SERVICES ===

  /**
   * Buscar código ICD-10
   */
  async searchICD10(
    query: string,
    options: {
      limit?: number;
      category?: string;
      exactMatch?: boolean;
    } = {}
  ): Promise<ICD10Code[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: (options.limit || 20).toString(),
        version: this.config.terminology.icd10.version,
        lang: this.config.terminology.icd10.language,
      });

      if (options.category) params.append('category', options.category);
      if (options.exactMatch) params.append('exact', 'true');

      const response = await fetch(
        `${this.config.terminology.icd10.baseUrl}/search?${params.toString()}`,
        {
          headers: this.getTerminologyHeaders(),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`ICD-10 API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('❌ Erro na busca ICD-10:', error);
      throw error;
    }
  }

  /**
   * Buscar conceito SNOMED-CT
   */
  async searchSNOMED(
    query: string,
    options: {
      limit?: number;
      semanticTag?: string;
      activeOnly?: boolean;
    } = {}
  ): Promise<SNOMEDConcept[]> {
    try {
      const params = new URLSearchParams({
        term: query,
        limit: (options.limit || 20).toString(),
        edition: this.config.terminology.snomed.edition,
        version: this.config.terminology.snomed.version,
      });

      if (options.semanticTag) params.append('semantictag', options.semanticTag);
      if (options.activeOnly !== false) params.append('activeFilter', 'true');

      const response = await fetch(
        `${this.config.terminology.snomed.baseUrl}/concepts?${params.toString()}`,
        {
          headers: this.getTerminologyHeaders(),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`SNOMED API error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('❌ Erro na busca SNOMED:', error);
      throw error;
    }
  }

  // === CONVERSION HELPERS ===

  /**
   * Converter paciente interno para FHIR
   */
  convertToFHIRPatient(patient: any): FHIRPatient {
    return {
      resourceType: 'Patient',
      id: patient.id,
      active: true,
      identifier: [
        {
          use: 'official',
          system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
          value: patient.cpf,
        },
      ],
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: [patient.firstName],
        },
      ],
      telecom: [
        {
          system: 'phone',
          value: patient.phone,
          use: 'mobile',
        },
        {
          system: 'email',
          value: patient.email,
          use: 'home',
        },
      ],
      gender: patient.gender as any,
      birthDate: patient.birthDate,
      address: [
        {
          use: 'home',
          type: 'physical',
          line: [patient.address?.street],
          city: patient.address?.city,
          state: patient.address?.state,
          postalCode: patient.address?.zipCode,
          country: 'BR',
        },
      ],
    };
  }

  /**
   * Converter paciente FHIR para formato interno
   */
  convertFromFHIRPatient(fhirPatient: FHIRPatient): any {
    const name = fhirPatient.name?.[0];
    const address = fhirPatient.address?.[0];
    const phone = fhirPatient.telecom?.find(t => t.system === 'phone');
    const email = fhirPatient.telecom?.find(t => t.system === 'email');
    const cpf = fhirPatient.identifier?.find(
      i => i.system?.includes('cpf')
    );

    return {
      id: fhirPatient.id,
      firstName: name?.given?.[0],
      lastName: name?.family,
      cpf: cpf?.value,
      phone: phone?.value,
      email: email?.value,
      gender: fhirPatient.gender,
      birthDate: fhirPatient.birthDate,
      address: {
        street: address?.line?.[0],
        city: address?.city,
        state: address?.state,
        zipCode: address?.postalCode,
        country: address?.country,
      },
      active: fhirPatient.active,
    };
  }

  // === MÉTODOS PRIVADOS ===

  private async makeFHIRRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data: any,
    tenantId: string,
    userId: string
  ): Promise<any> {
    const token = await this.getFHIRAuthToken();
    
    const response = await fetch(`${this.config.fhir.baseUrl}/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'X-User-ID': userId,
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.config.fhir.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FHIR API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  private async makeePrescriptionRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data: any,
    tenantId: string,
    userId: string
  ): Promise<any> {
    const response = await fetch(
      `https://api.eprescription.gov.br/v1/${endpoint}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.ePrescription.apiKey}`,
          'X-Provider-ID': this.config.ePrescription.providerId,
          'X-Environment': this.config.ePrescription.environment,
          'X-Tenant-ID': tenantId,
          'X-User-ID': userId,
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ePrescription API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  private async getFHIRAuthToken(): Promise<string> {
    const cached = this.authTokens.get('fhir');
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    // Implementar autenticação OAuth2 ou outro método
    const token = await this.authenticateFHIR();
    
    this.authTokens.set('fhir', {
      token,
      expiresAt: Date.now() + (3600 * 1000), // 1 hora
    });

    return token;
  }

  private async authenticateFHIR(): Promise<string> {
    // Simular autenticação
    // Em produção, implementaria OAuth2 flow completo
    return 'mock_fhir_token_' + Date.now();
  }

  private getTerminologyHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'FisioFlow/1.0',
    };
  }

  private async generatePrescriptionNumber(tenantId: string): Promise<string> {
    // Gerar número único de prescrição
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${tenantId.substr(0, 3).toUpperCase()}${timestamp}${random}`.toUpperCase();
  }

  private async createDigitalSignature(
    prescription: any,
    userId: string
  ): Promise<string> {
    // Criar assinatura digital da prescrição
    const dataToSign = JSON.stringify({
      ...prescription,
      userId,
      timestamp: Date.now(),
    });

    // Em produção, usaria certificado digital A3
    const hash = await encryption.hashSensitiveData(dataToSign);
    return hash.hash;
  }

  private async logFHIRAccess(
    resourceType: string,
    resourceId: string,
    operation: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await auditLogger.logAction(
      tenantId,
      userId,
      'USER',
      operation === 'read' ? AuditAction.READ :
      operation === 'create' ? AuditAction.CREATE :
      operation === 'update' ? AuditAction.UPDATE :
      AuditAction.READ,
      'fhir_resource',
      resourceId,
      {
        entityName: `${resourceType}/${resourceId}`,
        legalBasis: LegalBasis.MEDICAL_CARE,
        dataAccessed: ['medical_data', 'patient_info'],
        metadata: {
          resourceType,
          operation,
          standard: 'FHIR R4',
        },
      }
    );
  }

  private async logePrescriptionAccess(
    prescriptionId: string,
    operation: string,
    tenantId: string,
    userId: string,
    metadata?: any
  ): Promise<void> {
    await auditLogger.logAction(
      tenantId,
      userId,
      'USER',
      operation === 'create' ? AuditAction.CREATE :
      operation === 'validate' ? AuditAction.READ :
      operation === 'dispense' ? AuditAction.UPDATE :
      AuditAction.READ,
      'eprescription',
      prescriptionId,
      {
        entityName: `ePrescription/${prescriptionId}`,
        legalBasis: LegalBasis.MEDICAL_CARE,
        dataAccessed: ['prescription_data', 'medication_info'],
        metadata: {
          operation,
          standard: 'ePrescription',
          ...metadata,
        },
      }
    );
  }

  private generateId(): string {
    return `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === CONFIGURAÇÃO DEFAULT ===
const defaultConfig: MedicalAPIConfig = {
  fhir: {
    baseUrl: 'https://fhir.saude.gov.br/r4',
    version: 'R4',
    authentication: {
      type: 'oauth2',
      credentials: {
        clientId: process.env.FHIR_CLIENT_ID || '',
        clientSecret: process.env.FHIR_CLIENT_SECRET || '',
      },
    },
    timeout: 30000,
  },
  ePrescription: {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    providerId: process.env.EPRESCRIPTION_PROVIDER_ID || '',
    apiKey: process.env.EPRESCRIPTION_API_KEY || '',
  },
  terminology: {
    icd10: {
      baseUrl: 'https://id.who.int/icd/api',
      version: '2019-04',
      language: 'pt-BR',
    },
    snomed: {
      baseUrl: 'https://snowstorm.ihtsdotools.org',
      edition: 'MAIN/SNOMEDCT-BR',
      version: 'LATEST',
    },
  },
};

// === INSTÂNCIA SINGLETON ===
export const medicalApiIntegration = new MedicalAPIIntegration(defaultConfig);

// === HOOKS REACT ===
export const useFHIRPatient = (patientId: string, tenantId: string, userId: string) => {
  const [patient, setPatient] = React.useState<FHIRPatient | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPatient = React.useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);
      const fhirPatient = await medicalApiIntegration.getFHIRPatient(
        patientId,
        tenantId,
        userId
      );
      setPatient(fhirPatient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [patientId, tenantId, userId]);

  React.useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  return { patient, loading, error, refetch: fetchPatient };
};

export const useICD10Search = () => {
  const [results, setResults] = React.useState<ICD10Code[]>([]);
  const [loading, setLoading] = React.useState(false);

  const search = React.useCallback(async (query: string, options?: any) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const codes = await medicalApiIntegration.searchICD10(query, options);
      setResults(codes);
    } catch (error) {
      console.error('Erro na busca ICD-10:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, search };
};

export const useSNOMEDSearch = () => {
  const [results, setResults] = React.useState<SNOMEDConcept[]>([]);
  const [loading, setLoading] = React.useState(false);

  const search = React.useCallback(async (query: string, options?: any) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const concepts = await medicalApiIntegration.searchSNOMED(query, options);
      setResults(concepts);
    } catch (error) {
      console.error('Erro na busca SNOMED:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, search };
};

export default medicalApiIntegration;

// Adicionar import do React
import React from 'react';