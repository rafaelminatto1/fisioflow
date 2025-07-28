import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Patient,
  Assessment,
  Document,
  ExerciseLog,
  User,
  AuditLog,
  Tenant,
  DataContextType,
} from '../types';
import { secureStorage } from '../services/secureStorage';
import { encryption, EncryptedData, LGPDAuditLog, SecurePatientData } from '../services/encryption';
import { auditLogger, AuditAction, LegalBasis, logPatientAccess } from '../services/auditLogger';
import { useAuth } from './useAuth';

// Contexto para dados seguros
interface SecureDataContextType extends Omit<DataContextType, 'savePatient' | 'deletePatient' | 'saveAssessment' | 'deleteAssessment'> {
  // Métodos seguros para dados sensíveis
  saveSecurePatient: (patient: Patient, actingUser: User, masterKey: string) => Promise<void>;
  deleteSecurePatient: (patientId: string, actingUser: User, reason: string) => Promise<void>;
  getSecurePatient: (patientId: string, masterKey: string) => Promise<Patient | null>;
  getAllSecurePatients: (tenantId: string, masterKey: string) => Promise<Patient[]>;
  
  saveSecureAssessment: (assessment: Assessment, actingUser: User, masterKey: string) => Promise<void>;
  deleteSecureAssessment: (assessmentId: string, actingUser: User, reason: string) => Promise<void>;
  getSecureAssessment: (assessmentId: string, masterKey: string) => Promise<Assessment | null>;
  
  saveSecureDocument: (document: Document, actingUser: User, masterKey: string) => Promise<void>;
  deleteSecureDocument: (documentId: string, actingUser: User, reason: string) => Promise<void>;
  
  saveSecureExerciseLog: (log: Omit<ExerciseLog, 'id' | 'tenantId'>, actingUser: User, masterKey: string) => Promise<void>;
  
  // Auditoria LGPD
  logLGPDAccess: (
    action: LGPDAuditLog['action'],
    entityType: LGPDAuditLog['entityType'],
    entityId: string,
    dataFields: string[],
    purpose: string,
    legalBasis: LGPDAuditLog['legalBasis'],
    actingUser: User
  ) => Promise<void>;
  
  getLGPDAuditLogs: (patientId?: string, startDate?: string, endDate?: string) => Promise<LGPDAuditLog[]>;
  
  // Gestão de consentimento LGPD
  recordConsent: (patientId: string, consentType: string, granted: boolean, actingUser: User) => Promise<void>;
  checkConsent: (patientId: string, consentType: string) => Promise<boolean>;
  
  // Migração de dados
  migrateToSecureStorage: (masterKey: string) => Promise<{ success: boolean; migratedCount: number; errors: string[] }>;
  
  // Informações de storage
  getStorageInfo: () => Promise<{
    totalPatients: number;
    encryptedData: number;
    storageUsage: any;
    lastBackup?: string;
  }>;
}

const SecureDataContext = createContext<SecureDataContextType | undefined>(undefined);

export const SecureDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, currentTenant } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [encryptionReady, setEncryptionReady] = useState(false);

  // Estados para dados não sensíveis (mantidos como antes)
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  // Cache local para dados descriptografados (limpar periodicamente)
  const [decryptedCache, setDecryptedCache] = useState<Map<string, any>>(new Map());

  // Inicialização do sistema seguro
  useEffect(() => {
    const initializeSecureSystem = async () => {
      try {
        await secureStorage.initialize();
        setEncryptionReady(true);
        setIsInitialized(true);
        console.log('✅ Sistema de dados seguros inicializado');
      } catch (error) {
        console.error('❌ Falha na inicialização do sistema seguro:', error);
      }
    };

    initializeSecureSystem();
  }, []);

  // Limpeza periódica do cache (segurança)
  useEffect(() => {
    const clearCacheInterval = setInterval(() => {
      setDecryptedCache(new Map());
      encryption.clearKeyCache();
      console.log('🔄 Cache de dados descriptografados limpo por segurança');
    }, 15 * 60 * 1000); // A cada 15 minutos

    return () => clearInterval(clearCacheInterval);
  }, []);

  // Função para gerar ID único
  const generateId = useCallback(() => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Log de auditoria LGPD usando o novo sistema
  const logLGPDAccess = useCallback(async (
    action: LGPDAuditLog['action'],
    entityType: LGPDAuditLog['entityType'],
    entityId: string,
    dataFields: string[],
    purpose: string,
    legalBasis: LGPDAuditLog['legalBasis'],
    actingUser: User
  ) => {
    if (!currentTenant || !encryptionReady) return;

    try {
      // Mapear para o novo sistema de auditoria
      const auditAction = action as unknown as AuditAction;
      const auditLegalBasis = legalBasis as unknown as LegalBasis;
      
      await auditLogger.logAction(
        currentTenant.id,
        actingUser.id,
        actingUser.role,
        auditAction,
        entityType.toLowerCase(),
        entityId,
        {
          dataAccessed: dataFields,
          legalBasis: auditLegalBasis,
          sessionId: sessionStorage.getItem('sessionId') || 'unknown_session'
        }
      );
    } catch (error) {
      console.error('Erro ao salvar log de auditoria:', error);
    }
  }, [currentTenant, encryptionReady]);

  // Salvar paciente com criptografia
  const saveSecurePatient = useCallback(async (
    patient: Patient, 
    actingUser: User, 
    masterKey: string
  ) => {
    if (!currentTenant || !encryptionReady) {
      throw new Error('Sistema não inicializado ou tenant não definido');
    }

    try {
      // Criptografar dados do paciente
      const { publicData, encryptedData, dataHash } = await encryption.encryptPatientData(
        patient,
        currentTenant.id,
        masterKey
      );

      const securePatientData: SecurePatientData = {
        publicData,
        encryptedData,
        dataHash,
        lastModified: new Date().toISOString(),
        encryptionVersion: 1
      };

      // Salvar no IndexedDB
      await secureStorage.save('patients', patient.id, securePatientData, currentTenant.id, true);

      // Log de auditoria LGPD usando função de conveniência
      await logPatientAccess(
        currentTenant.id,
        actingUser.id,
        actingUser.role,
        patient.id,
        patient.name
      );

      // Invalidar cache
      setDecryptedCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(`patient_${patient.id}`);
        return newCache;
      });

      console.log('✅ Paciente salvo com criptografia');
    } catch (error) {
      console.error('❌ Erro ao salvar paciente seguro:', error);
      throw error;
    }
  }, [currentTenant, encryptionReady, logLGPDAccess]);

  // Recuperar paciente descriptografado
  const getSecurePatient = useCallback(async (
    patientId: string, 
    masterKey: string,
    accessingUser?: User
  ): Promise<Patient | null> => {
    if (!currentTenant || !encryptionReady) return null;

    // Verificar cache primeiro
    const cacheKey = `patient_${patientId}`;
    if (decryptedCache.has(cacheKey)) {
      // Log de acesso mesmo para dados em cache
      if (accessingUser) {
        await auditLogger.logAction(
          currentTenant.id,
          accessingUser.id,
          accessingUser.role,
          AuditAction.VIEW_PATIENT,
          'patients',
          patientId,
          {
            dataAccessed: ['cached_patient_data'],
            legalBasis: LegalBasis.HEALTH_PROTECTION
          }
        );
      }
      return decryptedCache.get(cacheKey);
    }

    try {
      const secureData = await secureStorage.get<SecurePatientData>('patients', patientId, currentTenant.id);
      
      if (!secureData) return null;

      // Descriptografar dados sensíveis
      const patientData = await encryption.decryptPatientData(
        secureData.publicData,
        secureData.encryptedData,
        currentTenant.id,
        masterKey
      );

      // Verificar integridade dos dados
      const isValid = await encryption.verifyDataIntegrity(
        { ...secureData.publicData, encryptedDataHash: secureData.encryptedData.encryptedContent },
        secureData.dataHash
      );

      if (!isValid) {
        console.warn('⚠️ Integridade dos dados comprometida para paciente:', patientId);
        throw new Error('Dados corrompidos detectados');
      }

      // Log de acesso aos dados descriptografados
      if (accessingUser) {
        await auditLogger.logAction(
          currentTenant.id,
          accessingUser.id,
          accessingUser.role,
          AuditAction.VIEW_PATIENT,
          'patients',
          patientId,
          {
            entityName: patientData.name,
            dataAccessed: ['name', 'medicalHistory', 'personalData'],
            legalBasis: LegalBasis.HEALTH_PROTECTION
          }
        );
      }

      // Adicionar ao cache temporário
      setDecryptedCache(prev => new Map(prev.set(cacheKey, patientData)));

      return patientData as Patient;
    } catch (error) {
      console.error('❌ Erro ao recuperar paciente:', error);
      
      // Log de erro de acesso
      if (accessingUser) {
        await auditLogger.logAction(
          currentTenant.id,
          accessingUser.id,
          accessingUser.role,
          AuditAction.VIEW_PATIENT,
          'patients',
          patientId,
          {
            result: 'FAILED',
            errorMessage: error.toString(),
            legalBasis: LegalBasis.HEALTH_PROTECTION
          }
        );
      }
      
      return null;
    }
  }, [currentTenant, encryptionReady, decryptedCache]);

  // Recuperar todos os pacientes
  const getAllSecurePatients = useCallback(async (
    tenantId: string, 
    masterKey: string
  ): Promise<Patient[]> => {
    if (!encryptionReady) return [];

    try {
      const securePatients = await secureStorage.getAll<SecurePatientData>('patients', tenantId);
      const patients: Patient[] = [];

      for (const secureData of securePatients) {
        try {
          const patientData = await encryption.decryptPatientData(
            secureData.publicData,
            secureData.encryptedData,
            tenantId,
            masterKey
          );
          patients.push(patientData as Patient);
        } catch (error) {
          console.warn('Falha ao descriptografar paciente:', secureData.publicData.id, error);
        }
      }

      return patients;
    } catch (error) {
      console.error('❌ Erro ao recuperar todos os pacientes:', error);
      return [];
    }
  }, [encryptionReady]);

  // Deletar paciente (LGPD compliant)
  const deleteSecurePatient = useCallback(async (
    patientId: string, 
    actingUser: User, 
    reason: string
  ) => {
    if (!currentTenant || !encryptionReady) return;

    try {
      // Log da exclusão para auditoria LGPD
      await auditLogger.logAction(
        currentTenant.id,
        actingUser.id,
        actingUser.role,
        AuditAction.DELETE,
        'patients',
        patientId,
        {
          dataAccessed: ['all_patient_data'],
          legalBasis: reason.includes('solicitação') ? LegalBasis.CONSENT : LegalBasis.LEGAL_OBLIGATION
        }
      );

      // Remover do storage
      await secureStorage.delete('patients', patientId, currentTenant.id);

      // Limpar cache
      setDecryptedCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(`patient_${patientId}`);
        return newCache;
      });

      console.log('✅ Paciente removido com conformidade LGPD');
    } catch (error) {
      console.error('❌ Erro ao deletar paciente:', error);
      
      // Log de erro na exclusão
      await auditLogger.logAction(
        currentTenant.id,
        actingUser.id,
        actingUser.role,
        AuditAction.DELETE,
        'patients',
        patientId,
        {
          result: 'FAILED',
          errorMessage: error.toString(),
          legalBasis: LegalBasis.LEGAL_OBLIGATION
        }
      );
      
      throw error;
    }
  }, [currentTenant, encryptionReady]);

  // Salvar avaliação com criptografia
  const saveSecureAssessment = useCallback(async (
    assessment: Assessment, 
    actingUser: User, 
    masterKey: string
  ) => {
    if (!currentTenant || !encryptionReady) return;

    try {
      // Separar dados públicos dos sensíveis
      const { id, patientId, therapistId, date, tenantId, ...sensitiveData } = assessment;
      
      const publicData = { id, patientId, therapistId, date, tenantId };
      const encryptedData = await encryption.encryptSensitiveData(sensitiveData, 
        await encryption.deriveKey(`${masterKey}_${currentTenant.id}`, new Uint8Array(32))
      );

      const secureAssessment = {
        publicData,
        encryptedData,
        lastModified: new Date().toISOString(),
        encryptionVersion: 1
      };

      await secureStorage.save('assessments', assessment.id, secureAssessment, currentTenant.id, true);

      await auditLogger.logAction(
        currentTenant.id,
        actingUser.id,
        actingUser.role,
        AuditAction.CREATE,
        'assessments',
        assessment.id,
        {
          dataAccessed: ['mainComplaint', 'history', 'treatmentPlan'],
          legalBasis: LegalBasis.HEALTH_PROTECTION
        }
      );

      console.log('✅ Avaliação salva com criptografia');
    } catch (error) {
      console.error('❌ Erro ao salvar avaliação:', error);
      throw error;
    }
  }, [currentTenant, encryptionReady, logLGPDAccess]);

  // Recuperar avaliação descriptografada
  const getSecureAssessment = useCallback(async (
    assessmentId: string, 
    masterKey: string
  ): Promise<Assessment | null> => {
    if (!currentTenant || !encryptionReady) return null;

    try {
      const secureData = await secureStorage.get('assessments', assessmentId, currentTenant.id);
      if (!secureData) return null;

      const encryptionKey = await encryption.deriveKey(`${masterKey}_${currentTenant.id}`, new Uint8Array(32));
      const sensitiveData = await encryption.decryptSensitiveData(secureData.encryptedData, encryptionKey);

      return {
        ...secureData.publicData,
        ...sensitiveData
      } as Assessment;
    } catch (error) {
      console.error('❌ Erro ao recuperar avaliação:', error);
      return null;
    }
  }, [currentTenant, encryptionReady]);

  // Implementações placeholder para outros métodos necessários
  const saveSecureDocument = useCallback(async (document: Document, actingUser: User, masterKey: string) => {
    // Implementação similar aos pacientes
    console.log('🔄 saveSecureDocument implementação pendente');
  }, []);

  const deleteSecureDocument = useCallback(async (documentId: string, actingUser: User, reason: string) => {
    console.log('🔄 deleteSecureDocument implementação pendente');
  }, []);

  const deleteSecureAssessment = useCallback(async (assessmentId: string, actingUser: User, reason: string) => {
    console.log('🔄 deleteSecureAssessment implementação pendente');
  }, []);

  const saveSecureExerciseLog = useCallback(async (log: Omit<ExerciseLog, 'id' | 'tenantId'>, actingUser: User, masterKey: string) => {
    console.log('🔄 saveSecureExerciseLog implementação pendente');
  }, []);

  // Migração de dados existentes
  const migrateToSecureStorage = useCallback(async (masterKey: string) => {
    if (!currentTenant) {
      return { success: false, migratedCount: 0, errors: ['Tenant não definido'] };
    }

    const errors: string[] = [];
    let migratedCount = 0;

    try {
      // Migrar pacientes do localStorage para IndexedDB criptografado
      const existingPatients = JSON.parse(localStorage.getItem(`fisioflow_patients_${currentTenant.id}`) || '[]');
      
      for (const patient of existingPatients) {
        try {
          await saveSecurePatient(patient, user!, masterKey);
          migratedCount++;
        } catch (error) {
          errors.push(`Erro ao migrar paciente ${patient.id}: ${error}`);
        }
      }

      console.log(`✅ Migração concluída: ${migratedCount} pacientes migrados`);
      return { success: true, migratedCount, errors };
    } catch (error) {
      console.error('❌ Erro na migração:', error);
      return { success: false, migratedCount, errors: [error.toString()] };
    }
  }, [currentTenant, user, saveSecurePatient]);

  // Informações de armazenamento
  const getStorageInfo = useCallback(async () => {
    const storageUsage = await secureStorage.getStorageInfo();
    const totalPatients = currentTenant ? 
      (await secureStorage.getAll('patients', currentTenant.id)).length : 0;

    return {
      totalPatients,
      encryptedData: totalPatients, // Todos os pacientes estão criptografados
      storageUsage,
      lastBackup: localStorage.getItem('lastBackup') || undefined
    };
  }, [currentTenant]);

  // Logs de auditoria LGPD usando o novo sistema
  const getLGPDAuditLogs = useCallback(async (
    patientId?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<LGPDAuditLog[]> => {
    if (!currentTenant || !user) return [];

    try {
      const filters = {
        tenantId: currentTenant.id,
        entityId: patientId,
        dateFrom: startDate,
        dateTo: endDate
      };
      
      const auditEntries = await auditLogger.queryLogs(
        currentTenant.id,
        filters,
        user.id,
        user.role
      );
      
      // Converter para o formato antigo para compatibilidade
      return auditEntries.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        userId: entry.userId,
        userRole: entry.userRole,
        action: entry.action as any,
        entityType: entry.entityType.toUpperCase() as any,
        entityId: entry.entityId,
        dataFields: entry.dataAccessed,
        purpose: 'Acesso a dados médicos',
        legalBasis: entry.legalBasis as any,
        tenantId: entry.tenantId,
        dataHash: '',
        anonymized: false
      }));
    } catch (error) {
      console.error('Erro ao recuperar logs de auditoria:', error);
      return [];
    }
  }, [currentTenant, user]);

  // Gestão de consentimento (placeholder)
  const recordConsent = useCallback(async (
    patientId: string, 
    consentType: string, 
    granted: boolean, 
    actingUser: User
  ) => {
    console.log('🔄 recordConsent implementação pendente');
  }, []);

  const checkConsent = useCallback(async (patientId: string, consentType: string): Promise<boolean> => {
    console.log('🔄 checkConsent implementação pendente');
    return true; // Placeholder
  }, []);

  // Métodos herdados do contexto original (implementação placeholder)
  const contextValue: SecureDataContextType = {
    // Dados não sensíveis
    users,
    tenants,
    
    // Novos métodos seguros
    saveSecurePatient,
    deleteSecurePatient,
    getSecurePatient,
    getAllSecurePatients,
    saveSecureAssessment,
    deleteSecureAssessment,
    getSecureAssessment,
    saveSecureDocument,
    deleteSecureDocument,
    saveSecureExerciseLog,
    logLGPDAccess,
    getLGPDAuditLogs,
    recordConsent,
    checkConsent,
    migrateToSecureStorage,
    getStorageInfo,

    // Métodos placeholder para compatibilidade (implementar conforme necessário)
    tasks: [],
    patients: [],
    notebooks: [],
    appointments: [],
    timeBlocks: [],
    exercises: [],
    prescriptions: [],
    exerciseLogs: [],
    assessments: [],
    transactions: [],
    auditLogs: [],
    documents: [],
    chats: [],
    chatMessages: [],
    courses: [],
    studentProgress: [],
    mentorshipSessions: [],
    clinicalCases: [],
    caseAttachments: [],
    caseComments: [],
    caseViews: [],
    caseRatings: [],
    caseFavorites: [],
    clinicalProtocols: [],
    protocolPhases: [],
    protocolExercises: [],
    protocolEvidences: [],
    patientProtocols: [],
    protocolCustomizations: [],
    protocolProgressNotes: [],
    protocolOutcomes: [],
    protocolAnalytics: [],
    qualityIndicators: [],
    productivityMetrics: [],
    equipment: [],
    operationalAlerts: [],
    executiveReports: [],
    exerciseFavorites: [],
    exerciseRatings: [],
    exerciseVideos: [],
    exerciseImages: [],
    reminderRules: [],
    scheduledReminders: [],
    reminderSettings: [],
    notificationDeliveryLogs: [],
    reminderAnalytics: [],
    smartReminderInsights: [],
    symptomDiaryEntries: [],
    symptomDiaryTemplates: [],
    symptomAnalyses: [],
    symptomInsights: [],
    symptomAlerts: [],
    symptomReports: [],
    symptomDiarySettings: [],

    // Métodos placeholder
    saveTenant: () => {},
    saveUser: () => {},
    deleteUser: () => {},
    saveTask: () => {},
    deleteTask: () => {},
    savePatient: () => {},
    deletePatient: () => {},
    savePage: () => {},
    addTaskFeedback: () => {},
    saveAppointment: () => {},
    deleteAppointment: () => {},
    saveTimeBlock: () => {},
    deleteTimeBlock: () => {},
    saveExercise: () => {},
    deleteExercise: () => {},
    savePrescription: () => {},
    deletePrescription: () => {},
    saveExerciseLog: () => {},
    saveAssessment: () => {},
    deleteAssessment: () => {},
    saveTransaction: () => {},
    deleteTransaction: () => {},
    saveDocument: () => {},
    deleteDocument: () => {},
    sendChatMessage: () => {},
    saveCourse: () => {},
    deleteCourse: () => {},
    saveStudentProgress: () => {},
    saveMentorshipSession: () => {},
    deleteMentorshipSession: () => {},
    saveClinicalCase: () => {},
    deleteClinicalCase: () => {},
    saveCaseAttachment: () => {},
    deleteCaseAttachment: () => {},
    saveCaseComment: () => {},
    deleteCaseComment: () => {},
    likeCaseComment: () => {},
    recordCaseView: () => {},
    saveCaseRating: () => {},
    toggleCaseFavorite: () => {},
    saveClinicalProtocol: () => {},
    deleteClinicalProtocol: () => {},
    prescribeProtocol: () => {},
    updatePatientProtocolStatus: () => {},
    addProtocolProgressNote: () => {},
    updateProtocolOutcome: () => {},
    advanceProtocolPhase: () => {},
    customizeProtocolExercise: () => {},
    acknowledgeAlert: () => {},
    resolveAlert: () => {},
    saveEquipment: () => {},
    deleteEquipment: () => {},
    generateExecutiveReport: () => undefined,
    saveAuditLog: () => {},
    getTasksForPatient: () => [],
    getAppointmentsForPatient: () => [],
    getPrescriptionsForPatient: () => [],
    getExerciseLogsForPatient: () => [],
    getAssessmentsForPatient: () => [],
    getTransactionsForPatient: () => [],
    getDocumentsForPatient: () => [],
    getAllData: () => ({}),
    toggleExerciseFavorite: () => {},
    saveExerciseRating: () => {},
    getExerciseFavorites: () => [],
    getExerciseRatings: () => [],
    getExerciseStatistics: () => null,
    getMostUsedExercises: () => [],
    saveExerciseVideo: () => {},
    deleteExerciseVideo: () => {},
    getExerciseVideos: () => [],
    incrementVideoView: () => {},
    saveExerciseImage: () => {},
    deleteExerciseImage: () => {},
    getExerciseImages: () => [],
    getExerciseImagesByCategory: () => [],
    saveReminderRule: () => {},
    updateReminderRule: () => {},
    deleteReminderRule: () => {},
    scheduleReminder: () => {},
    cancelScheduledReminder: () => {},
    markReminderAsSent: () => {},
    markReminderAsRead: () => {},
    saveReminderSettings: () => {},
    updateReminderSettings: () => {},
    logNotificationDelivery: () => {},
    generateReminderAnalytics: () => ({} as any),
    generateSmartInsights: () => [],
    getReminderRulesForPatient: () => [],
    getScheduledRemindersForPatient: () => [],
    getReminderSettingsForPatient: () => null,
    processScheduledReminders: async () => {},
    saveSymptomDiaryEntry: () => {},
    updateSymptomDiaryEntry: () => {},
    deleteSymptomDiaryEntry: () => {},
    getSymptomDiaryEntries: () => [],
    getTodaysSymptomEntry: () => null,
    createSymptomDiaryTemplate: () => {},
    updateSymptomDiaryTemplate: () => {},
    deleteSymptomDiaryTemplate: () => {},
    generateSymptomAnalysis: () => ({} as any),
    generateSymptomInsights: () => [],
    createSymptomAlert: () => {},
    acknowledgeSymptomAlert: () => {},
    resolveSymptomAlert: () => {},
    generateSymptomReport: () => ({} as any),
    getSymptomDiarySettings: () => null,
    updateSymptomDiarySettings: () => {},
    analyzeSymptomTrends: () => ({ trend: 'stable' as const, rate: 0 }),
    findSymptomCorrelations: () => [],
    getSymptomPatterns: () => ({ dailyPatterns: {}, weeklyPatterns: {}, cyclicPatterns: {} }),
    checkSymptomAlerts: () => [],
    exportSymptomData: () => ''
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Inicializando sistema seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <SecureDataContext.Provider value={contextValue}>
      {children}
    </SecureDataContext.Provider>
  );
};

export const useSecureData = (): SecureDataContextType => {
  const context = useContext(SecureDataContext);
  if (context === undefined) {
    throw new Error('useSecureData must be used within a SecureDataProvider');
  }
  return context;
};