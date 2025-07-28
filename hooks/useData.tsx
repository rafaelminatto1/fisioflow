import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import {
  INITIAL_TASKS,
  INITIAL_PATIENTS,
  NOTEBOOKS,
  INITIAL_APPOINTMENTS,
  INITIAL_TIMEBLOCKS,
  INITIAL_EXERCISES,
  INITIAL_PRESCRIPTIONS,
  INITIAL_EXERCISE_LOGS,
  INITIAL_ASSESSMENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_TENANTS,
  INITIAL_DOCUMENTS,
  INITIAL_CHATS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_COURSES,
  INITIAL_STUDENT_PROGRESS,
  INITIAL_MENTORSHIP_SESSIONS,
  INITIAL_CLINICAL_CASES,
  INITIAL_CASE_ATTACHMENTS,
  INITIAL_CASE_COMMENTS,
  INITIAL_CASE_VIEWS,
  INITIAL_CASE_RATINGS,
  INITIAL_CASE_FAVORITES,
  INITIAL_CLINICAL_PROTOCOLS,
  INITIAL_PROTOCOL_PHASES,
  INITIAL_PROTOCOL_EXERCISES,
  INITIAL_PROTOCOL_EVIDENCES,
  INITIAL_PATIENT_PROTOCOLS,
  INITIAL_PROTOCOL_CUSTOMIZATIONS,
  INITIAL_PROTOCOL_PROGRESS_NOTES,
  INITIAL_PROTOCOL_OUTCOMES,
  INITIAL_PROTOCOL_ANALYTICS,
  INITIAL_QUALITY_INDICATORS,
  INITIAL_PRODUCTIVITY_METRICS,
  INITIAL_EQUIPMENT,
  INITIAL_OPERATIONAL_ALERTS,
  INITIAL_EXECUTIVE_REPORTS,
  INITIAL_EXERCISE_FAVORITES,
  INITIAL_EXERCISE_RATINGS,
  INITIAL_EXERCISE_VIDEOS,
  INITIAL_EXERCISE_IMAGES,
} from '../constants';
import { dataOptimizer } from '../services/dataOptimizer';
import {
  DataContextType,
  Task,
  Patient,
  Notebook,
  Page,
  Appointment,
  TimeBlock,
  Exercise,
  Prescription,
  ExerciseLog,
  Assessment,
  Transaction,
  User,
  AuditLog,
  LogAction,
  Tenant,
  SubscriptionPlan,
  Document,
  Chat,
  ChatMessage,
  Course,
  StudentProgress,
  MentorshipSession,
  ClinicalCase,
  CaseAttachment,
  CaseComment,
  CaseView,
  CaseRating,
  CaseFavorite,
  ClinicalProtocol,
  ProtocolPhase,
  ProtocolExercise,
  ProtocolEvidence,
  PatientProtocol,
  ProtocolCustomization,
  ProtocolProgressNote,
  ProtocolOutcome,
  ProtocolAnalytics,
  QualityIndicator,
  ProductivityMetric,
  Equipment,
  OperationalAlert,
  ExecutiveReport,
  ExerciseFavorite,
  ExerciseRating,
  ExerciseStatistics,
  ExerciseVideo,
  ExerciseImage,
  ImageCategory,
} from '../types';

import { useAuth } from './useAuth';
import { useNotification, NotificationContext } from './useNotification';


export const DataContext = createContext<any | undefined>(undefined);

// Hook otimizado com índices e compressão
const useOptimizedStorage = <T>(
  key: string,
  initialValue: T,
  searchFields: (keyof T)[] = [],
  tenantField?: keyof T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const data = dataOptimizer.loadOptimized<any>(key);
      return data.length > 0 ? data : initialValue;
    } catch (error) {
      console.error(`Error reading optimized storage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (Array.isArray(storedValue)) {
        dataOptimizer.saveOptimized(
          key,
          storedValue,
          searchFields,
          tenantField
        );
      } else {
        // Fallback para dados não-array
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.error(`Error setting optimized storage key "${key}":`, error);
    }
  }, [key, storedValue, searchFields, tenantField]);

  return [storedValue, setStoredValue];
};

// Hook legado para compatibilidade
const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  validator?: (data: any) => data is T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsedItem = JSON.parse(item);
        return parsedItem;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Gerencia dados otimizados com índices
  const [allUsers, setAllUsers] = useOptimizedStorage<User[]>(
    'fisioflow-all-users',
    Object.values(INITIAL_USERS),
    ['name', 'email', 'role'], // campos de busca
    'tenantId'
  );
  const [allTasks, setAllTasks] = useOptimizedStorage<Task[]>(
    'fisioflow-all-tasks',
    INITIAL_TASKS,
    ['title', 'description', 'status'],
    'tenantId'
  );
  const [allPatients, setAllPatients] = useOptimizedStorage<Patient[]>(
    'fisioflow-all-patients',
    INITIAL_PATIENTS,
    ['name', 'email', 'phone', 'medicalHistory'], // busca otimizada
    'tenantId'
  );
  const [allNotebooks, setAllNotebooks] = useLocalStorage<Notebook[]>(
    'fisioflow-all-notebooks',
    NOTEBOOKS
  );
  const [allAppointments, setAllAppointments] = useLocalStorage<Appointment[]>(
    'fisioflow-all-appointments',
    INITIAL_APPOINTMENTS
  );
  const [allTimeBlocks, setAllTimeBlocks] = useLocalStorage<TimeBlock[]>(
    'fisioflow-all-timeblocks',
    INITIAL_TIMEBLOCKS
  );
  const [allPrescriptions, setAllPrescriptions] = useLocalStorage<
    Prescription[]
  >('fisioflow-all-prescriptions', INITIAL_PRESCRIPTIONS);
  const [allExerciseLogs, setAllExerciseLogs] = useLocalStorage<ExerciseLog[]>(
    'fisioflow-all-exercise-logs',
    INITIAL_EXERCISE_LOGS
  );
  const [allAssessments, setAllAssessments] = useLocalStorage<Assessment[]>(
    'fisioflow-all-assessments',
    INITIAL_ASSESSMENTS
  );
  const [allTransactions, setAllTransactions] = useLocalStorage<Transaction[]>(
    'fisioflow-all-transactions',
    INITIAL_TRANSACTIONS
  );
  const [allAuditLogs, setAllAuditLogs] = useLocalStorage<AuditLog[]>(
    'fisioflow-all-audit-logs',
    INITIAL_AUDIT_LOGS
  );
  const [tenants, setTenants] = useLocalStorage<Tenant[]>(
    'fisioflow-tenants',
    INITIAL_TENANTS
  );
  const [exercises, setExercises] = useLocalStorage<Exercise[]>(
    'fisioflow-exercises',
    INITIAL_EXERCISES
  );
  const [allDocuments, setAllDocuments] = useLocalStorage<Document[]>(
    'fisioflow-all-documents',
    INITIAL_DOCUMENTS
  );
  const [allChats, setAllChats] = useLocalStorage<Chat[]>(
    'fisioflow-all-chats',
    INITIAL_CHATS
  );
  const [allChatMessages, setAllChatMessages] = useLocalStorage<ChatMessage[]>(
    'fisioflow-all-chat-messages',
    INITIAL_CHAT_MESSAGES
  );
  const [allCourses, setAllCourses] = useLocalStorage<Course[]>(
    'fisioflow-all-courses',
    INITIAL_COURSES
  );
  const [allStudentProgress, setAllStudentProgress] = useLocalStorage<
    StudentProgress[]
  >('fisioflow-all-student-progress', INITIAL_STUDENT_PROGRESS);
  const [allMentorshipSessions, setAllMentorshipSessions] = useLocalStorage<
    MentorshipSession[]
  >('fisioflow-all-mentorship-sessions', INITIAL_MENTORSHIP_SESSIONS);
  const [allClinicalCases, setAllClinicalCases] = useLocalStorage<
    ClinicalCase[]
  >('fisioflow-all-clinical-cases', INITIAL_CLINICAL_CASES);
  const [allCaseAttachments, setAllCaseAttachments] = useLocalStorage<
    CaseAttachment[]
  >('fisioflow-all-case-attachments', INITIAL_CASE_ATTACHMENTS);
  const [allCaseComments, setAllCaseComments] = useLocalStorage<CaseComment[]>(
    'fisioflow-all-case-comments',
    INITIAL_CASE_COMMENTS
  );
  const [allCaseViews, setAllCaseViews] = useLocalStorage<CaseView[]>(
    'fisioflow-all-case-views',
    INITIAL_CASE_VIEWS
  );
  const [allCaseRatings, setAllCaseRatings] = useLocalStorage<CaseRating[]>(
    'fisioflow-all-case-ratings',
    INITIAL_CASE_RATINGS
  );
  const [allCaseFavorites, setAllCaseFavorites] = useLocalStorage<
    CaseFavorite[]
  >('fisioflow-all-case-favorites', INITIAL_CASE_FAVORITES);
  const [allClinicalProtocols, setAllClinicalProtocols] = useLocalStorage<
    ClinicalProtocol[]
  >('fisioflow-all-clinical-protocols', INITIAL_CLINICAL_PROTOCOLS);
  const [allProtocolPhases, setAllProtocolPhases] = useLocalStorage<
    ProtocolPhase[]
  >('fisioflow-all-protocol-phases', INITIAL_PROTOCOL_PHASES);
  const [allProtocolExercises, setAllProtocolExercises] = useLocalStorage<
    ProtocolExercise[]
  >('fisioflow-all-protocol-exercises', INITIAL_PROTOCOL_EXERCISES);
  const [allProtocolEvidences, setAllProtocolEvidences] = useLocalStorage<
    ProtocolEvidence[]
  >('fisioflow-all-protocol-evidences', INITIAL_PROTOCOL_EVIDENCES);
  const [allPatientProtocols, setAllPatientProtocols] = useLocalStorage<
    PatientProtocol[]
  >('fisioflow-all-patient-protocols', INITIAL_PATIENT_PROTOCOLS);
  const [allProtocolCustomizations, setAllProtocolCustomizations] =
    useLocalStorage<ProtocolCustomization[]>(
      'fisioflow-all-protocol-customizations',
      INITIAL_PROTOCOL_CUSTOMIZATIONS
    );
  const [allProtocolProgressNotes, setAllProtocolProgressNotes] =
    useLocalStorage<ProtocolProgressNote[]>(
      'fisioflow-all-protocol-progress-notes',
      INITIAL_PROTOCOL_PROGRESS_NOTES
    );
  const [allProtocolOutcomes, setAllProtocolOutcomes] = useLocalStorage<
    ProtocolOutcome[]
  >('fisioflow-all-protocol-outcomes', INITIAL_PROTOCOL_OUTCOMES);
  const [allProtocolAnalytics, setAllProtocolAnalytics] = useLocalStorage<
    ProtocolAnalytics[]
  >('fisioflow-all-protocol-analytics', INITIAL_PROTOCOL_ANALYTICS);

  // Operational Management data
  const [allQualityIndicators, setAllQualityIndicators] = useLocalStorage<
    QualityIndicator[]
  >('fisioflow-all-quality-indicators', INITIAL_QUALITY_INDICATORS);
  const [allProductivityMetrics, setAllProductivityMetrics] = useLocalStorage<
    ProductivityMetric[]
  >('fisioflow-all-productivity-metrics', INITIAL_PRODUCTIVITY_METRICS);
  const [allEquipment, setAllEquipment] = useLocalStorage<Equipment[]>(
    'fisioflow-all-equipment',
    INITIAL_EQUIPMENT
  );
  const [allOperationalAlerts, setAllOperationalAlerts] = useLocalStorage<
    OperationalAlert[]
  >('fisioflow-all-operational-alerts', INITIAL_OPERATIONAL_ALERTS);
  const [allExecutiveReports, setAllExecutiveReports] = useLocalStorage<
    ExecutiveReport[]
  >('fisioflow-all-executive-reports', INITIAL_EXECUTIVE_REPORTS);

  // === SISTEMA DE FAVORITOS E AVALIAÇÕES ===
  const [allExerciseFavorites, setAllExerciseFavorites] = useLocalStorage<
    ExerciseFavorite[]
  >('fisioflow-all-exercise-favorites', INITIAL_EXERCISE_FAVORITES);
  const [allExerciseRatings, setAllExerciseRatings] = useLocalStorage<
    ExerciseRating[]
  >('fisioflow-all-exercise-ratings', INITIAL_EXERCISE_RATINGS);

  // === SISTEMA DE VÍDEOS E IMAGENS ===
  const [allExerciseVideos, setAllExerciseVideos] = useLocalStorage<
    ExerciseVideo[]
  >('fisioflow-all-exercise-videos', INITIAL_EXERCISE_VIDEOS);
  const [allExerciseImages, setAllExerciseImages] = useLocalStorage<
    ExerciseImage[]
  >('fisioflow-all-exercise-images', INITIAL_EXERCISE_IMAGES);

  // === SISTEMA DE DIÁRIO DE SINTOMAS ===
  const [allSymptomDiaryEntries, setAllSymptomDiaryEntries] = useLocalStorage<
    any[]
  >('fisioflow-all-symptom-diary-entries', []);

  // Hook de notificações - com verificação de contexto
  const notificationContext = useContext(NotificationContext);
  const addNotification = notificationContext?.addNotification || (() => {});

  // All setter functions remain here. They get 'actingUser' passed in, so they are independent.
  const logAction = (
    actingUser: User,
    action: LogAction,
    targetCollection: string,
    targetId: string,
    targetName?: string,
    details?: any
  ) => {
    if (!actingUser.tenantId) return;
    const newLog: AuditLog = {
      id: `log-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      userId: actingUser.id,
      userName: actingUser.name,
      action,
      targetCollection,
      targetId,
      targetName,
      details,
      tenantId: actingUser.tenantId,
    };
    setAllAuditLogs((prev) => [newLog, ...prev]);
  };

  // Função saveAuditLog para compatibilidade com outros hooks
  const saveAuditLog = (logEntry: Partial<AuditLog>) => {
    const newLog: AuditLog = {
      id: `log-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      userId: logEntry.userId || 'system',
      userName: logEntry.userName || 'Sistema',
      action: logEntry.action || LogAction.OTHER,
      targetCollection: logEntry.targetCollection || 'system',
      targetId: logEntry.targetId || '',
      targetName: logEntry.targetName,
      details: logEntry.details,
      tenantId: logEntry.tenantId || 't1',
    };
    setAllAuditLogs((prev) => [newLog, ...prev]);
  };

  const saveTenant = (tenantToSave: Partial<Tenant>, actingUser: User) => {
    let finalTenant = { ...tenantToSave };
    const isNew =
      !('id' in finalTenant) || !tenants.some((t) => t.id === finalTenant.id);
    if (isNew) {
      finalTenant = {
        ...finalTenant,
        id: `t-${crypto.randomUUID()}`,
      } as Tenant;
    }
    setTenants((prev) =>
      isNew
        ? [...prev, finalTenant as Tenant]
        : prev.map((t) =>
            t.id === finalTenant.id ? (finalTenant as Tenant) : t
          )
    );

    if (isNew) {
      setAllUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === actingUser.id ? { ...u, tenantId: finalTenant.id } : u
        )
      );
    }

    addNotification({
      type: 'success',
      title: 'Plano Salvo',
      message: `A clínica "${finalTenant.name}" foi atualizada.`,
    });
  };

  const saveUser = (userToSave: User, actingUser: User) => {
    let finalUser = { ...userToSave };
    const isNew =
      !('id' in finalUser) || !allUsers.some((u) => u.id === finalUser.id);
    if (isNew) {
      finalUser = {
        ...finalUser,
        id: `user-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId,
      };
    }

    setAllUsers((prev) =>
      isNew
        ? [...prev, finalUser]
        : prev.map((u) => (u.id === finalUser.id ? finalUser : u))
    );
    logAction(
      actingUser,
      isNew ? LogAction.CREATE_USER : LogAction.UPDATE_USER,
      'users',
      finalUser.id,
      finalUser.name,
      { data: finalUser }
    );
    addNotification({
      type: 'success',
      title: 'Usuário Salvo',
      message: `O usuário "${finalUser.name}" foi salvo.`,
    });
  };

  const deleteUser = (userId: string, actingUser: User) => {
    const userToDelete = allUsers.find((u) => u.id === userId);
    if (!userToDelete) return;

    setAllUsers((prevUsers) => prevUsers.filter((u) => u.id !== userId));
    setAllTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.assigneeId === userId ? { ...task, assigneeId: undefined } : task
      )
    );

    logAction(
      actingUser,
      LogAction.DELETE_USER,
      'users',
      userId,
      userToDelete.name,
      { deletedData: userToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Usuário Excluído',
      message: `"${userToDelete.name}" foi excluído.`,
    });
  };

  const saveTask = (taskToSave: Task, actingUser: User) => {
    let finalTask = { ...taskToSave };
    const isNew =
      !('id' in finalTask) || !allTasks.some((t) => t.id === finalTask.id);
    if (isNew) {
      finalTask = {
        ...finalTask,
        id: `task-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }

    setAllTasks((prev) =>
      isNew
        ? [...prev, finalTask]
        : prev.map((t) => (t.id === finalTask.id ? finalTask : t))
    );
    logAction(
      actingUser,
      isNew ? LogAction.CREATE_TASK : LogAction.UPDATE_TASK,
      'tasks',
      finalTask.id,
      finalTask.title,
      { data: finalTask }
    );
    addNotification({
      type: 'success',
      title: 'Tarefa Salva',
      message: `A tarefa "${finalTask.title}" foi salva.`,
    });
  };

  const deleteTask = (taskId: string, actingUser: User) => {
    const taskToDelete = allTasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    setAllTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
    logAction(
      actingUser,
      LogAction.DELETE_TASK,
      'tasks',
      taskId,
      taskToDelete.title,
      { deletedData: taskToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Tarefa Excluída',
      message: `"${taskToDelete.title}" foi excluída.`,
    });
  };

  const savePatient = (patientToSave: Patient, actingUser: User) => {
    let finalPatient = { ...patientToSave };
    const isNew =
      !('id' in finalPatient) ||
      !allPatients.some((p) => p.id === finalPatient.id);
    const oldPatient = isNew
      ? null
      : allPatients.find((p) => p.id === finalPatient.id);

    if (isNew) {
      finalPatient = {
        ...finalPatient,
        id: `patient-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    } else if (
      oldPatient &&
      !oldPatient.consent.given &&
      finalPatient.consent.given
    ) {
      finalPatient.consent.timestamp = new Date().toISOString();
      logAction(
        actingUser,
        LogAction.GIVE_CONSENT,
        'patients',
        finalPatient.id,
        finalPatient.name
      );
    }

    setAllPatients((prev) =>
      isNew
        ? [...prev, finalPatient]
        : prev.map((p) => (p.id === finalPatient.id ? finalPatient : p))
    );
    logAction(
      actingUser,
      isNew ? LogAction.CREATE_PATIENT : LogAction.UPDATE_PATIENT,
      'patients',
      finalPatient.id,
      finalPatient.name,
      { data: finalPatient }
    );
    addNotification({
      type: 'success',
      title: 'Paciente Salvo',
      message: `Os dados de "${finalPatient.name}" foram salvos.`,
    });
  };

  const deletePatient = (patientId: string, actingUser: User) => {
    const patientToDelete = allPatients.find((p) => p.id === patientId);
    if (!patientToDelete) return;

    setAllTasks((prev) => prev.filter((t) => t.patientId !== patientId));
    setAllAppointments((prev) => prev.filter((a) => a.patientId !== patientId));
    setAllPrescriptions((prev) =>
      prev.filter((p) => p.patientId !== patientId)
    );
    setAllExerciseLogs((prev) => prev.filter((l) => l.patientId !== patientId));
    setAllAssessments((prev) => prev.filter((a) => a.patientId !== patientId));
    setAllTransactions((prev) => prev.filter((t) => t.patientId !== patientId));

    setAllPatients((prevPatients) =>
      prevPatients.filter((p) => p.id !== patientId)
    );
    logAction(
      actingUser,
      LogAction.DELETE_PATIENT,
      'patients',
      patientId,
      patientToDelete.name,
      { deletedData: patientToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Paciente Excluído',
      message: `"${patientToDelete.name}" e seus dados foram removidos.`,
    });
  };

  const saveAppointment = (
    appointmentToSave: Appointment,
    actingUser: User
  ) => {
    let finalAppointment = { ...appointmentToSave };
    const isNew =
      !('id' in finalAppointment) ||
      !allAppointments.some((a) => a.id === finalAppointment.id);
    if (isNew) {
      finalAppointment = {
        ...finalAppointment,
        id: `appt-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllAppointments((prev) =>
      isNew
        ? [...prev, finalAppointment]
        : prev.map((a) => (a.id === finalAppointment.id ? finalAppointment : a))
    );
    const patientName =
      allPatients.find((p) => p.id === finalAppointment.patientId)?.name || '';
    logAction(
      actingUser,
      isNew ? LogAction.CREATE_APPOINTMENT : LogAction.UPDATE_APPOINTMENT,
      'appointments',
      finalAppointment.id,
      `${finalAppointment.title} (${patientName})`,
      { data: finalAppointment }
    );
    addNotification({
      type: 'success',
      title: 'Agendamento Salvo',
      message: `Agendamento "${finalAppointment.title}" salvo.`,
    });
  };

  const deleteAppointment = (appointmentId: string, actingUser: User) => {
    const apptToDelete = allAppointments.find((a) => a.id === appointmentId);
    if (!apptToDelete) return;
    setAllAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
    const patientName =
      allPatients.find((p) => p.id === apptToDelete.patientId)?.name || '';
    logAction(
      actingUser,
      LogAction.DELETE_APPOINTMENT,
      'appointments',
      appointmentId,
      `${apptToDelete.title} (${patientName})`,
      { deletedData: apptToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Agendamento Excluído',
      message: `"${apptToDelete.title}" foi excluído.`,
    });
  };

  const saveTimeBlock = (timeBlockToSave: TimeBlock, actingUser: User) => {
    let finalTimeBlock = { ...timeBlockToSave };
    const isNew =
      !('id' in finalTimeBlock) ||
      !allTimeBlocks.some((tb) => tb.id === finalTimeBlock.id);
    if (isNew) {
      finalTimeBlock = {
        ...finalTimeBlock,
        id: `tb-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllTimeBlocks((prev) =>
      isNew
        ? [...prev, finalTimeBlock]
        : prev.map((tb) => (tb.id === finalTimeBlock.id ? finalTimeBlock : tb))
    );
    logAction(
      actingUser,
      isNew ? LogAction.CREATE_APPOINTMENT : LogAction.UPDATE_APPOINTMENT,
      'timeblocks',
      finalTimeBlock.id,
      finalTimeBlock.title,
      { data: finalTimeBlock }
    );
    addNotification({
      type: 'success',
      title: 'Bloqueio Salvo',
      message: `Bloqueio "${finalTimeBlock.title}" salvo.`,
    });
  };

  const deleteTimeBlock = (timeBlockId: string, actingUser: User) => {
    const tbToDelete = allTimeBlocks.find((tb) => tb.id === timeBlockId);
    if (!tbToDelete) return;
    setAllTimeBlocks((prev) => prev.filter((tb) => tb.id !== timeBlockId));
    logAction(
      actingUser,
      LogAction.DELETE_APPOINTMENT,
      'timeblocks',
      timeBlockId,
      tbToDelete.title,
      { deletedData: tbToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Bloqueio Excluído',
      message: `"${tbToDelete.title}" foi excluído.`,
    });
  };

  const savePage = (pageId: string, content: string, actingUser: User) => {
    let pageTitle = '';
    setAllNotebooks((prevNotebooks) => {
      return prevNotebooks.map((notebook) => ({
        ...notebook,
        pages: notebook.pages.map((page) => {
          if (page.id === pageId) {
            pageTitle = page.title;
            return { ...page, content };
          }
          return page;
        }),
      }));
    });
    logAction(
      actingUser,
      LogAction.UPDATE_PAGE,
      'notebooks',
      pageId,
      pageTitle,
      { content }
    );
    addNotification({
      type: 'success',
      title: 'Página Salva',
      message: 'O conteúdo da página foi salvo.',
    });
  };

  const saveExercise = (exerciseToSave: Exercise, actingUser: User) => {
    let finalExercise = { ...exerciseToSave };
    const isNew =
      !('id' in finalExercise) ||
      !exercises.some((e) => e.id === finalExercise.id);
    if (isNew) {
      finalExercise = { ...finalExercise, id: `ex-${crypto.randomUUID()}` };
    }
    setExercises((prev) =>
      isNew
        ? [...prev, finalExercise]
        : prev.map((e) => (e.id === finalExercise.id ? finalExercise : e))
    );
    logAction(
      actingUser,
      isNew ? LogAction.CREATE_EXERCISE : LogAction.UPDATE_EXERCISE,
      'exercises',
      finalExercise.id,
      finalExercise.name,
      { data: finalExercise }
    );
    addNotification({
      type: 'success',
      title: 'Exercício Salvo',
      message: `O exercício "${finalExercise.name}" foi salvo.`,
    });
  };

  const deleteExercise = (exerciseId: string, actingUser: User) => {
    const exerciseToDelete = exercises.find((e) => e.id === exerciseId);
    if (!exerciseToDelete) return;
    setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
    logAction(
      actingUser,
      LogAction.DELETE_EXERCISE,
      'exercises',
      exerciseId,
      exerciseToDelete.name,
      { deletedData: exerciseToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Exercício Excluído',
      message: `"${exerciseToDelete.name}" foi excluído.`,
    });
  };

  const savePrescription = (
    prescriptionToSave: Prescription,
    actingUser: User
  ) => {
    let finalPrescription = { ...prescriptionToSave };
    const isNew =
      !('id' in finalPrescription) ||
      !allPrescriptions.some((p) => p.id === finalPrescription.id);
    if (isNew) {
      finalPrescription = {
        ...finalPrescription,
        id: `presc-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllPrescriptions((prev) =>
      isNew
        ? [...prev, finalPrescription]
        : prev.map((p) =>
            p.id === finalPrescription.id ? finalPrescription : p
          )
    );
    const exerciseName =
      exercises.find((e) => e.id === finalPrescription.exerciseId)?.name || '';
    logAction(
      actingUser,
      isNew ? LogAction.CREATE_PRESCRIPTION : LogAction.UPDATE_PRESCRIPTION,
      'prescriptions',
      finalPrescription.id,
      `Prescrição para ${allPatients.find((p) => p.id === finalPrescription.patientId)?.name} - ${exerciseName}`,
      { data: finalPrescription }
    );
    addNotification({
      type: 'success',
      title: 'Prescrição Salva',
      message: 'O exercício foi prescrito.',
    });
  };

  const deletePrescription = (prescriptionId: string, actingUser: User) => {
    const prescriptionToDelete = allPrescriptions.find(
      (p) => p.id === prescriptionId
    );
    if (!prescriptionToDelete) return;
    setAllPrescriptions((prev) => prev.filter((p) => p.id !== prescriptionId));
    const exerciseName =
      exercises.find((e) => e.id === prescriptionToDelete.exerciseId)?.name ||
      '';
    logAction(
      actingUser,
      LogAction.DELETE_PRESCRIPTION,
      'prescriptions',
      prescriptionId,
      `Prescrição para ${allPatients.find((p) => p.id === prescriptionToDelete.patientId)?.name} - ${exerciseName}`,
      { deletedData: prescriptionToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Prescrição Removida',
      message: 'A prescrição foi removida.',
    });
  };

  const saveAssessment = (assessmentToSave: Assessment, actingUser: User) => {
    let finalAssessment = { ...assessmentToSave };
    const isNew =
      !('id' in finalAssessment) ||
      !allAssessments.some((a) => a.id === finalAssessment.id);
    if (isNew) {
      finalAssessment = {
        ...finalAssessment,
        id: `assess-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllAssessments((prev) =>
      isNew
        ? [...prev, finalAssessment]
        : prev.map((a) => (a.id === finalAssessment.id ? finalAssessment : a))
    );
    logAction(
      actingUser,
      isNew ? LogAction.CREATE_ASSESSMENT : LogAction.UPDATE_ASSESSMENT,
      'assessments',
      finalAssessment.id,
      `Avaliação de ${allPatients.find((p) => p.id === finalAssessment.patientId)?.name}`,
      { data: finalAssessment }
    );
    addNotification({
      type: 'success',
      title: 'Avaliação Salva',
      message: 'A avaliação foi salva.',
    });
  };

  const deleteAssessment = (assessmentId: string, actingUser: User) => {
    const assessmentToDelete = allAssessments.find(
      (a) => a.id === assessmentId
    );
    if (!assessmentToDelete) return;
    setAllAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
    logAction(
      actingUser,
      LogAction.DELETE_ASSESSMENT,
      'assessments',
      assessmentId,
      `Avaliação de ${allPatients.find((p) => p.id === assessmentToDelete.patientId)?.name}`,
      { deletedData: assessmentToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Avaliação Excluída',
      message: 'A avaliação foi excluída.',
    });
  };

  const saveTransaction = (
    transactionToSave: Transaction,
    actingUser: User
  ) => {
    let finalTransaction = { ...transactionToSave };
    const isNew =
      !('id' in finalTransaction) ||
      !allTransactions.some((t) => t.id === finalTransaction.id);
    if (isNew) {
      finalTransaction = {
        ...finalTransaction,
        id: `trans-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllTransactions((prev) =>
      isNew
        ? [...prev, finalTransaction]
        : prev.map((t) => (t.id === finalTransaction.id ? finalTransaction : t))
    );
    logAction(
      actingUser,
      isNew ? LogAction.CREATE_TRANSACTION : LogAction.UPDATE_TRANSACTION,
      'transactions',
      finalTransaction.id,
      finalTransaction.description,
      { data: finalTransaction }
    );
    addNotification({
      type: 'success',
      title: 'Transação Salva',
      message: `A transação "${finalTransaction.description}" foi salva.`,
    });
  };

  const deleteTransaction = (transactionId: string, actingUser: User) => {
    const transactionToDelete = allTransactions.find(
      (t) => t.id === transactionId
    );
    if (!transactionToDelete) return;
    setAllTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    logAction(
      actingUser,
      LogAction.DELETE_TRANSACTION,
      'transactions',
      transactionId,
      transactionToDelete.description,
      { deletedData: transactionToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Transação Excluída',
      message: `A transação "${transactionToDelete.description}" foi excluída.`,
    });
  };

  const saveExerciseLog = (
    logToSave: Omit<ExerciseLog, 'id' | 'tenantId'>,
    actingUser: User
  ) => {
    if (!actingUser || !actingUser.tenantId) return;
    setAllExerciseLogs((prevLogs) => {
      const newLog: ExerciseLog = {
        ...logToSave,
        id: `log-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
      return [...prevLogs, newLog];
    });
    addNotification({
      type: 'success',
      title: 'Progresso Registrado',
      message: 'Seu feedback foi salvo.',
    });
  };

  const addTaskFeedback = (taskId: string, feedback: string) => {
    setAllTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          const newFeedback = `\n\n[Feedback do Paciente - ${new Date().toLocaleString('pt-BR')}]:\n${feedback}`;
          return {
            ...task,
            description: (task.description || '') + newFeedback,
          };
        }
        return task;
      })
    );
    addNotification({
      type: 'success',
      title: 'Feedback Enviado',
      message: 'Seu feedback sobre a tarefa foi enviado.',
    });
  };

  const saveDocument = (documentToSave: Document, actingUser: User) => {
    setAllDocuments((prev) => [...prev, documentToSave]);
    logAction(
      actingUser,
      LogAction.CREATE_DOCUMENT,
      'documents',
      documentToSave.id,
      documentToSave.fileName,
      { data: documentToSave }
    );
    addNotification({
      type: 'success',
      title: 'Documento Salvo',
      message: `O arquivo "${documentToSave.fileName}" foi salvo.`,
    });
  };

  const deleteDocument = (documentId: string, actingUser: User) => {
    const docToDelete = allDocuments.find((d) => d.id === documentId);
    if (!docToDelete) return;
    setAllDocuments((prev) => prev.filter((d) => d.id !== documentId));
    logAction(
      actingUser,
      LogAction.DELETE_DOCUMENT,
      'documents',
      documentId,
      docToDelete.fileName,
      { deletedData: docToDelete }
    );
    addNotification({
      type: 'info',
      title: 'Documento Excluído',
      message: `O arquivo "${docToDelete.fileName}" foi excluído.`,
    });
  };

  const sendChatMessage = (
    message: Omit<ChatMessage, 'id' | 'timestamp'>,
    actingUser: User
  ) => {
    const now = new Date().toISOString();
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${crypto.randomUUID()}`,
      timestamp: now,
    };
    setAllChatMessages((prev) => [...prev, newMessage]);

    setAllChats((prev) => {
      const chatExists = prev.some((c) => c.id === message.chatId);
      if (chatExists) {
        return prev.map((c) =>
          c.id === message.chatId ? { ...c, lastMessageTimestamp: now } : c
        );
      } else {
        const otherUserId = message.chatId
          .split('-')
          .find((id) => id !== actingUser.id);
        if (!otherUserId) return prev; // Should not happen
        const newChat: Chat = {
          id: message.chatId,
          participants: [actingUser.id, otherUserId],
          lastMessageTimestamp: now,
          tenantId: actingUser.tenantId!,
        };
        return [...prev, newChat];
      }
    });
    // Not logging chat messages to avoid clutter, can be enabled if needed
    // logAction(actingUser, LogAction.CREATE_CHAT_MESSAGE, 'chatMessages', newMessage.id);
  };

  const saveCourse = (courseToSave: Course, actingUser: User) => {
    let finalCourse = { ...courseToSave };
    const isNew =
      !('id' in finalCourse) ||
      !allCourses.some((c) => c.id === finalCourse.id);
    if (isNew) {
      finalCourse = {
        ...finalCourse,
        id: `course-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllCourses((prev) =>
      isNew
        ? [...prev, finalCourse]
        : prev.map((c) => (c.id === finalCourse.id ? finalCourse : c))
    );
    addNotification({
      type: 'success',
      title: 'Curso Salvo',
      message: `O curso "${finalCourse.title}" foi salvo.`,
    });
  };

  const deleteCourse = (courseId: string, actingUser: User) => {
    const courseToDelete = allCourses.find((c) => c.id === courseId);
    if (!courseToDelete) return;
    setAllCourses((prev) => prev.filter((c) => c.id !== courseId));
    setAllStudentProgress((prev) =>
      prev.filter((p) => p.courseId !== courseId)
    );
    addNotification({
      type: 'info',
      title: 'Curso Excluído',
      message: `"${courseToDelete.title}" foi excluído.`,
    });
  };

  const saveStudentProgress = (
    progressToSave: StudentProgress,
    actingUser: User
  ) => {
    let finalProgress = { ...progressToSave };
    const isNew =
      !('id' in finalProgress) ||
      !allStudentProgress.some((p) => p.id === finalProgress.id);
    if (isNew) {
      finalProgress = {
        ...finalProgress,
        id: `progress-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllStudentProgress((prev) =>
      isNew
        ? [...prev, finalProgress]
        : prev.map((p) => (p.id === finalProgress.id ? finalProgress : p))
    );
    addNotification({
      type: 'success',
      title: 'Progresso Salvo',
      message: 'Progresso do estudante foi atualizado.',
    });
  };

  const saveMentorshipSession = (
    sessionToSave: MentorshipSession,
    actingUser: User
  ) => {
    let finalSession = { ...sessionToSave };
    const isNew =
      !('id' in finalSession) ||
      !allMentorshipSessions.some((s) => s.id === finalSession.id);
    if (isNew) {
      finalSession = {
        ...finalSession,
        id: `session-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllMentorshipSessions((prev) =>
      isNew
        ? [...prev, finalSession]
        : prev.map((s) => (s.id === finalSession.id ? finalSession : s))
    );
    addNotification({
      type: 'success',
      title: 'Sessão Salva',
      message: `A sessão "${finalSession.title}" foi salva.`,
    });
  };

  const deleteMentorshipSession = (sessionId: string, actingUser: User) => {
    const sessionToDelete = allMentorshipSessions.find(
      (s) => s.id === sessionId
    );
    if (!sessionToDelete) return;
    setAllMentorshipSessions((prev) => prev.filter((s) => s.id !== sessionId));
    addNotification({
      type: 'info',
      title: 'Sessão Excluída',
      message: `"${sessionToDelete.title}" foi excluída.`,
    });
  };

  // Clinical Cases functions
  const saveClinicalCase = (caseToSave: ClinicalCase, actingUser: User) => {
    let finalCase = { ...caseToSave };
    const isNew =
      !('id' in finalCase) ||
      !allClinicalCases.some((c) => c.id === finalCase.id);
    if (isNew) {
      finalCase = {
        ...finalCase,
        id: `case-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllClinicalCases((prev) =>
      isNew
        ? [...prev, finalCase]
        : prev.map((c) => (c.id === finalCase.id ? finalCase : c))
    );
    addNotification({
      type: 'success',
      title: 'Caso Salvo',
      message: `O caso "${finalCase.title}" foi salvo.`,
    });
  };

  const deleteClinicalCase = (caseId: string, actingUser: User) => {
    const caseToDelete = allClinicalCases.find((c) => c.id === caseId);
    if (!caseToDelete) return;

    // Delete related data
    setAllCaseComments((prev) =>
      prev.filter((comment) => comment.caseId !== caseId)
    );
    setAllCaseViews((prev) => prev.filter((view) => view.caseId !== caseId));
    setAllCaseRatings((prev) =>
      prev.filter((rating) => rating.caseId !== caseId)
    );
    setAllCaseFavorites((prev) => prev.filter((fav) => fav.caseId !== caseId));
    setAllCaseAttachments((prev) =>
      prev.filter((att) => att.caseId !== caseId)
    );

    setAllClinicalCases((prev) => prev.filter((c) => c.id !== caseId));
    addNotification({
      type: 'info',
      title: 'Caso Excluído',
      message: `"${caseToDelete.title}" foi excluído.`,
    });
  };

  const saveCaseAttachment = (attachment: CaseAttachment, actingUser: User) => {
    setAllCaseAttachments((prev) => [...prev, attachment]);
    addNotification({
      type: 'success',
      title: 'Arquivo Anexado',
      message: `O arquivo "${attachment.fileName}" foi anexado ao caso.`,
    });
  };

  const deleteCaseAttachment = (attachmentId: string, actingUser: User) => {
    const attachmentToDelete = allCaseAttachments.find(
      (att) => att.id === attachmentId
    );
    if (!attachmentToDelete) return;
    setAllCaseAttachments((prev) =>
      prev.filter((att) => att.id !== attachmentId)
    );
    addNotification({
      type: 'info',
      title: 'Anexo Removido',
      message: `O arquivo "${attachmentToDelete.fileName}" foi removido.`,
    });
  };

  const saveCaseComment = (
    comment: Omit<CaseComment, 'id' | 'createdAt'>,
    actingUser: User
  ) => {
    const newComment: CaseComment = {
      ...comment,
      id: `comment-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    setAllCaseComments((prev) => [...prev, newComment]);
    addNotification({
      type: 'success',
      title: 'Comentário Adicionado',
      message: 'Seu comentário foi publicado.',
    });
  };

  const deleteCaseComment = (commentId: string, actingUser: User) => {
    const commentToDelete = allCaseComments.find(
      (comment) => comment.id === commentId
    );
    if (!commentToDelete) return;

    // Also delete replies to this comment
    setAllCaseComments((prev) =>
      prev.filter(
        (comment) =>
          comment.id !== commentId && comment.parentCommentId !== commentId
      )
    );
    addNotification({
      type: 'info',
      title: 'Comentário Excluído',
      message: 'O comentário foi removido.',
    });
  };

  const likeCaseComment = (commentId: string, actingUser: User) => {
    setAllCaseComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          const userLiked = comment.likedBy.includes(actingUser.id);
          return {
            ...comment,
            likes: userLiked ? comment.likes - 1 : comment.likes + 1,
            likedBy: userLiked
              ? comment.likedBy.filter((id) => id !== actingUser.id)
              : [...comment.likedBy, actingUser.id],
          };
        }
        return comment;
      })
    );
  };

  const recordCaseView = (
    caseId: string,
    duration: number,
    completed: boolean,
    actingUser: User
  ) => {
    // Check if user already viewed this case today
    const today = new Date().toDateString();
    const existingView = allCaseViews.find(
      (view) =>
        view.caseId === caseId &&
        view.userId === actingUser.id &&
        new Date(view.viewedAt).toDateString() === today
    );

    if (!existingView) {
      const newView: CaseView = {
        id: `view-${crypto.randomUUID()}`,
        caseId,
        userId: actingUser.id,
        viewedAt: new Date().toISOString(),
        duration,
        completed,
        tenantId: actingUser.tenantId!,
      };
      setAllCaseViews((prev) => [...prev, newView]);

      // Update case view count
      setAllClinicalCases((prev) =>
        prev.map((clinicalCase) =>
          clinicalCase.id === caseId
            ? { ...clinicalCase, viewCount: clinicalCase.viewCount + 1 }
            : clinicalCase
        )
      );
    }
  };

  const saveCaseRating = (
    rating: Omit<CaseRating, 'id' | 'createdAt'>,
    actingUser: User
  ) => {
    const existingRating = allCaseRatings.find(
      (r) => r.caseId === rating.caseId && r.userId === actingUser.id
    );

    if (existingRating) {
      // Update existing rating
      setAllCaseRatings((prev) =>
        prev.map((r) =>
          r.id === existingRating.id
            ? { ...r, ...rating, updatedAt: new Date().toISOString() }
            : r
        )
      );
    } else {
      // Create new rating
      const newRating: CaseRating = {
        ...rating,
        id: `rating-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
      };
      setAllCaseRatings((prev) => [...prev, newRating]);
    }

    // Update case rating statistics
    setTimeout(() => {
      const caseRatings = allCaseRatings.filter(
        (r) => r.caseId === rating.caseId
      );
      const avgRating =
        caseRatings.reduce((sum, r) => sum + r.rating, 0) / caseRatings.length;

      setAllClinicalCases((prev) =>
        prev.map((clinicalCase) =>
          clinicalCase.id === rating.caseId
            ? {
                ...clinicalCase,
                rating: Number(avgRating.toFixed(1)),
                ratingCount: caseRatings.length,
              }
            : clinicalCase
        )
      );
    }, 100);

    addNotification({
      type: 'success',
      title: existingRating ? 'Avaliação Atualizada' : 'Caso Avaliado',
      message: 'Sua avaliação foi salva.',
    });
  };

  const toggleCaseFavorite = (caseId: string, actingUser: User) => {
    const existingFavorite = allCaseFavorites.find(
      (fav) => fav.caseId === caseId && fav.userId === actingUser.id
    );

    if (existingFavorite) {
      setAllCaseFavorites((prev) =>
        prev.filter((fav) => fav.id !== existingFavorite.id)
      );
      addNotification({
        type: 'info',
        title: 'Favorito Removido',
        message: 'O caso foi removido dos seus favoritos.',
      });
    } else {
      const newFavorite: CaseFavorite = {
        id: `fav-${crypto.randomUUID()}`,
        caseId,
        userId: actingUser.id,
        createdAt: new Date().toISOString(),
        tenantId: actingUser.tenantId!,
      };
      setAllCaseFavorites((prev) => [...prev, newFavorite]);
      addNotification({
        type: 'success',
        title: 'Favorito Adicionado',
        message: 'O caso foi adicionado aos seus favoritos.',
      });
    }
  };

  // Clinical Protocols functions
  const saveClinicalProtocol = (
    protocolToSave: ClinicalProtocol,
    actingUser: User
  ) => {
    let finalProtocol = { ...protocolToSave };
    const isNew =
      !('id' in finalProtocol) ||
      !allClinicalProtocols.some((p) => p.id === finalProtocol.id);
    if (isNew) {
      finalProtocol = {
        ...finalProtocol,
        id: `protocol-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
    }
    setAllClinicalProtocols((prev) =>
      isNew
        ? [...prev, finalProtocol]
        : prev.map((p) => (p.id === finalProtocol.id ? finalProtocol : p))
    );
    addNotification({
      type: 'success',
      title: 'Protocolo Salvo',
      message: `O protocolo "${finalProtocol.name}" foi salvo.`,
    });
  };

  const deleteClinicalProtocol = (protocolId: string, actingUser: User) => {
    const protocolToDelete = allClinicalProtocols.find(
      (p) => p.id === protocolId
    );
    if (!protocolToDelete) return;

    // Delete related data
    setAllProtocolPhases((prev) =>
      prev.filter((phase) => phase.protocolId !== protocolId)
    );
    setAllProtocolExercises((prev) => {
      const phasesToDelete = allProtocolPhases
        .filter((phase) => phase.protocolId === protocolId)
        .map((p) => p.id);
      return prev.filter(
        (exercise) => !phasesToDelete.includes(exercise.phaseId)
      );
    });
    setAllProtocolEvidences((prev) =>
      prev.filter((evidence) => evidence.protocolId !== protocolId)
    );
    setAllPatientProtocols((prev) =>
      prev.filter((pp) => pp.protocolId !== protocolId)
    );
    setAllProtocolAnalytics((prev) =>
      prev.filter((analytics) => analytics.protocolId !== protocolId)
    );

    setAllClinicalProtocols((prev) => prev.filter((p) => p.id !== protocolId));
    addNotification({
      type: 'info',
      title: 'Protocolo Excluído',
      message: `"${protocolToDelete.name}" foi excluído.`,
    });
  };

  const prescribeProtocol = (
    patientId: string,
    protocolId: string,
    customizations: ProtocolCustomization[],
    actingUser: User
  ) => {
    const protocol = allClinicalProtocols.find((p) => p.id === protocolId);
    if (!protocol) return;

    const firstPhase = allProtocolPhases.find(
      (phase) => phase.protocolId === protocolId && phase.order === 1
    );
    if (!firstPhase) return;

    const newPatientProtocol: PatientProtocol = {
      id: `patient-protocol-${crypto.randomUUID()}`,
      patientId,
      protocolId,
      prescribedById: actingUser.id,
      startDate: new Date().toISOString(),
      expectedEndDate: new Date(
        Date.now() + 84 * 24 * 60 * 60 * 1000
      ).toISOString(), // 12 weeks default
      currentPhaseId: firstPhase.id,
      status: 'Ativo',
      adherenceRate: 0,
      customizations,
      progressNotes: [],
      outcomes: [],
      tenantId: actingUser.tenantId!,
    };

    setAllPatientProtocols((prev) => [...prev, newPatientProtocol]);

    // Save customizations
    customizations.forEach((customization) => {
      const newCustomization: ProtocolCustomization = {
        ...customization,
        id: `customization-${crypto.randomUUID()}`,
        patientProtocolId: newPatientProtocol.id,
        tenantId: actingUser.tenantId!,
      };
      setAllProtocolCustomizations((prev) => [...prev, newCustomization]);
    });

    const patientName = allPatients.find((p) => p.id === patientId)?.name || '';
    addNotification({
      type: 'success',
      title: 'Protocolo Prescrito',
      message: `O protocolo "${protocol.name}" foi prescrito para ${patientName}.`,
    });
  };

  const updatePatientProtocolStatus = (
    patientProtocolId: string,
    status: PatientProtocol['status'],
    actingUser: User
  ) => {
    setAllPatientProtocols((prev) =>
      prev.map((pp) => (pp.id === patientProtocolId ? { ...pp, status } : pp))
    );
    addNotification({
      type: 'success',
      title: 'Status Atualizado',
      message: 'O status do protocolo foi atualizado.',
    });
  };

  const addProtocolProgressNote = (
    note: Omit<ProtocolProgressNote, 'id'>,
    actingUser: User
  ) => {
    const newNote: ProtocolProgressNote = {
      ...note,
      id: `progress-note-${crypto.randomUUID()}`,
      tenantId: actingUser.tenantId!,
    };
    setAllProtocolProgressNotes((prev) => [...prev, newNote]);
    addNotification({
      type: 'success',
      title: 'Progresso Registrado',
      message: 'A nota de progresso foi adicionada.',
    });
  };

  const updateProtocolOutcome = (
    outcome: Omit<ProtocolOutcome, 'id'>,
    actingUser: User
  ) => {
    const existingOutcome = allProtocolOutcomes.find(
      (o) =>
        o.patientProtocolId === outcome.patientProtocolId &&
        o.metric === outcome.metric
    );

    if (existingOutcome) {
      setAllProtocolOutcomes((prev) =>
        prev.map((o) =>
          o.id === existingOutcome.id ? { ...o, ...outcome } : o
        )
      );
    } else {
      const newOutcome: ProtocolOutcome = {
        ...outcome,
        id: `outcome-${crypto.randomUUID()}`,
        tenantId: actingUser.tenantId!,
      };
      setAllProtocolOutcomes((prev) => [...prev, newOutcome]);
    }
    addNotification({
      type: 'success',
      title: 'Resultado Atualizado',
      message: 'O resultado foi registrado.',
    });
  };

  const advanceProtocolPhase = (
    patientProtocolId: string,
    newPhaseId: string,
    actingUser: User
  ) => {
    setAllPatientProtocols((prev) =>
      prev.map((pp) =>
        pp.id === patientProtocolId ? { ...pp, currentPhaseId: newPhaseId } : pp
      )
    );
    addNotification({
      type: 'success',
      title: 'Fase Avançada',
      message: 'O paciente foi promovido para a próxima fase do protocolo.',
    });
  };

  const customizeProtocolExercise = (
    customization: Omit<ProtocolCustomization, 'id'>,
    actingUser: User
  ) => {
    const newCustomization: ProtocolCustomization = {
      ...customization,
      id: `customization-${crypto.randomUUID()}`,
      tenantId: actingUser.tenantId!,
    };
    setAllProtocolCustomizations((prev) => [...prev, newCustomization]);
    addNotification({
      type: 'success',
      title: 'Exercício Customizado',
      message: 'O exercício foi personalizado para o paciente.',
    });
  };

  const contextValue = {
    allUsers,
    allTasks,
    allPatients,
    allNotebooks,
    allAppointments,
    allTimeBlocks,
    exercises,
    allPrescriptions,
    allExerciseLogs,
    allAssessments,
    allTransactions,
    allAuditLogs,
    tenants,
    allDocuments,
    allChats,
    allChatMessages,
    allCourses,
    allStudentProgress,
    allMentorshipSessions,
    allClinicalCases,
    allCaseAttachments,
    allCaseComments,
    allCaseViews,
    allCaseRatings,
    allCaseFavorites,
    allClinicalProtocols,
    allProtocolPhases,
    allProtocolExercises,
    allProtocolEvidences,
    allPatientProtocols,
    allProtocolCustomizations,
    allProtocolProgressNotes,
    allProtocolOutcomes,
    allProtocolAnalytics,
    allQualityIndicators,
    allProductivityMetrics,
    allEquipment,
    allOperationalAlerts,
    allExecutiveReports,
    allExerciseFavorites,
    allExerciseRatings,
    allExerciseVideos,
    allExerciseImages,
    saveTenant,
    saveUser,
    deleteUser,
    saveTask,
    deleteTask,
    savePatient,
    deletePatient,
    savePage,
    addTaskFeedback,
    saveAppointment,
    deleteAppointment,
    saveTimeBlock,
    deleteTimeBlock,
    saveExercise,
    deleteExercise,
    savePrescription,
    deletePrescription,
    saveExerciseLog,
    saveAssessment,
    deleteAssessment,
    saveTransaction,
    deleteTransaction,
    saveDocument,
    deleteDocument,
    sendChatMessage,
    saveCourse,
    deleteCourse,
    saveStudentProgress,
    saveMentorshipSession,
    deleteMentorshipSession,
    saveClinicalCase,
    deleteClinicalCase,
    saveCaseAttachment,
    deleteCaseAttachment,
    saveCaseComment,
    deleteCaseComment,
    likeCaseComment,
    recordCaseView,
    saveCaseRating,
    toggleCaseFavorite,
    saveClinicalProtocol,
    deleteClinicalProtocol,
    prescribeProtocol,
    updatePatientProtocolStatus,
    addProtocolProgressNote,
    updateProtocolOutcome,
    advanceProtocolPhase,
    customizeProtocolExercise,
    setAllOperationalAlerts,
    setAllEquipment,
    setAllExecutiveReports,
    setAllExerciseFavorites,
    setAllExerciseRatings,
  };

  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }

  const { user: actingUser } = useAuth();

  const {
    allUsers,
    allTasks,
    allPatients,
    allNotebooks,
    allAppointments,
    allTimeBlocks,
    exercises,
    allPrescriptions,
    allExerciseLogs,
    allAssessments,
    allTransactions,
    allAuditLogs,
    tenants,
    allDocuments,
    allChats,
    allChatMessages,
    allCourses,
    allStudentProgress,
    allMentorshipSessions,
    allClinicalCases,
    allCaseAttachments,
    allCaseComments,
    allCaseViews,
    allCaseRatings,
    allCaseFavorites,
    allClinicalProtocols,
    allProtocolPhases,
    allProtocolExercises,
    allProtocolEvidences,
    allPatientProtocols,
    allProtocolCustomizations,
    allProtocolProgressNotes,
    allProtocolOutcomes,
    allProtocolAnalytics,
    allQualityIndicators,
    allProductivityMetrics,
    allEquipment,
    allOperationalAlerts,
    allExecutiveReports,
    allExerciseFavorites,
    allExerciseRatings,
    allExerciseVideos,
    allExerciseImages,
    setAllOperationalAlerts,
    setAllEquipment,
    setAllExecutiveReports,
    setAllExerciseFavorites,
    setAllExerciseRatings,
    setAllExerciseVideos,
    setAllExerciseImages,
    allSymptomDiaryEntries,
    setAllSymptomDiaryEntries,
    currentUser,
    saveAuditLog,
    addNotification,
    ...rest
  } = context;

  const tenantId = useMemo(() => actingUser?.tenantId, [actingUser]);

  const users = useMemo(
    () => {
      if (!allUsers || !Array.isArray(allUsers)) {
        return actingUser ? [actingUser] : [];
      }
      return tenantId
        ? allUsers.filter((u: User) => u.tenantId === tenantId || !u.tenantId)
        : actingUser
          ? [actingUser]
          : [];
    },
    [allUsers, actingUser, tenantId]
  );
  const tasks = useMemo(
    () => {
      if (!allTasks || !Array.isArray(allTasks)) {
        return [];
      }
      return tenantId ? allTasks.filter((t: Task) => t.tenantId === tenantId) : [];
    },
    [allTasks, tenantId]
  );
  const patients = useMemo(
    () => {
      if (!allPatients || !Array.isArray(allPatients)) {
        return [];
      }
      return tenantId
        ? allPatients.filter((p: Patient) => p.tenantId === tenantId)
        : [];
    },
    [allPatients, tenantId]
  );
  const notebooks = useMemo(
    () =>
      tenantId
        ? allNotebooks.filter((n: Notebook) => n.tenantId === tenantId)
        : [],
    [allNotebooks, tenantId]
  );
  const appointments = useMemo(
    () =>
      tenantId
        ? allAppointments.filter((a: Appointment) => a.tenantId === tenantId)
        : [],
    [allAppointments, tenantId]
  );
  const timeBlocks = useMemo(
    () =>
      tenantId
        ? allTimeBlocks.filter((tb: TimeBlock) => tb.tenantId === tenantId)
        : [],
    [allTimeBlocks, tenantId]
  );
  const prescriptions = useMemo(
    () =>
      tenantId
        ? allPrescriptions.filter((p: Prescription) => p.tenantId === tenantId)
        : [],
    [allPrescriptions, tenantId]
  );
  const exerciseLogs = useMemo(
    () =>
      tenantId
        ? allExerciseLogs.filter((el: ExerciseLog) => el.tenantId === tenantId)
        : [],
    [allExerciseLogs, tenantId]
  );
  const assessments = useMemo(
    () =>
      tenantId
        ? allAssessments.filter((a: Assessment) => a.tenantId === tenantId)
        : [],
    [allAssessments, tenantId]
  );
  const transactions = useMemo(
    () =>
      tenantId
        ? allTransactions.filter((t: Transaction) => t.tenantId === tenantId)
        : [],
    [allTransactions, tenantId]
  );
  const auditLogs = useMemo(
    () =>
      tenantId
        ? allAuditLogs.filter((al: AuditLog) => al.tenantId === tenantId)
        : [],
    [allAuditLogs, tenantId]
  );
  const documents = useMemo(
    () =>
      tenantId
        ? allDocuments.filter((d: Document) => d.tenantId === tenantId)
        : [],
    [allDocuments, tenantId]
  );
  const chats = useMemo(
    () =>
      tenantId ? allChats.filter((c: Chat) => c.tenantId === tenantId) : [],
    [allChats, tenantId]
  );
  const chatMessages = useMemo(
    () =>
      tenantId
        ? allChatMessages.filter((m: ChatMessage) => m.tenantId === tenantId)
        : [],
    [allChatMessages, tenantId]
  );
  const courses = useMemo(
    () =>
      tenantId ? allCourses.filter((c: Course) => c.tenantId === tenantId) : [],
    [allCourses, tenantId]
  );
  const studentProgress = useMemo(
    () =>
      tenantId
        ? allStudentProgress.filter(
            (sp: StudentProgress) => sp.tenantId === tenantId
          )
        : [],
    [allStudentProgress, tenantId]
  );
  const mentorshipSessions = useMemo(
    () =>
      tenantId
        ? allMentorshipSessions.filter(
            (ms: MentorshipSession) => ms.tenantId === tenantId
          )
        : [],
    [allMentorshipSessions, tenantId]
  );
  const clinicalCases = useMemo(
    () =>
      tenantId
        ? allClinicalCases.filter(
            (cc: ClinicalCase) => cc.tenantId === tenantId
          )
        : [],
    [allClinicalCases, tenantId]
  );
  const caseAttachments = useMemo(
    () =>
      tenantId
        ? allCaseAttachments.filter(
            (ca: CaseAttachment) => ca.tenantId === tenantId
          )
        : [],
    [allCaseAttachments, tenantId]
  );
  const caseComments = useMemo(
    () =>
      tenantId
        ? allCaseComments.filter((cc: CaseComment) => cc.tenantId === tenantId)
        : [],
    [allCaseComments, tenantId]
  );
  const caseViews = useMemo(
    () =>
      tenantId
        ? allCaseViews.filter((cv: CaseView) => cv.tenantId === tenantId)
        : [],
    [allCaseViews, tenantId]
  );
  const caseRatings = useMemo(
    () =>
      tenantId
        ? allCaseRatings.filter((cr: CaseRating) => cr.tenantId === tenantId)
        : [],
    [allCaseRatings, tenantId]
  );
  const caseFavorites = useMemo(
    () =>
      tenantId
        ? allCaseFavorites.filter(
            (cf: CaseFavorite) => cf.tenantId === tenantId
          )
        : [],
    [allCaseFavorites, tenantId]
  );
  const clinicalProtocols = useMemo(
    () =>
      tenantId
        ? allClinicalProtocols.filter(
            (cp: ClinicalProtocol) => cp.tenantId === tenantId
          )
        : [],
    [allClinicalProtocols, tenantId]
  );
  const protocolPhases = useMemo(
    () =>
      tenantId
        ? allProtocolPhases.filter(
            (pp: ProtocolPhase) => pp.tenantId === tenantId
          )
        : [],
    [allProtocolPhases, tenantId]
  );
  const protocolExercises = useMemo(
    () =>
      tenantId
        ? allProtocolExercises.filter(
            (pe: ProtocolExercise) => pe.tenantId === tenantId
          )
        : [],
    [allProtocolExercises, tenantId]
  );
  const protocolEvidences = useMemo(
    () =>
      tenantId
        ? allProtocolEvidences.filter(
            (pe: ProtocolEvidence) => pe.tenantId === tenantId
          )
        : [],
    [allProtocolEvidences, tenantId]
  );
  const patientProtocols = useMemo(
    () =>
      tenantId
        ? allPatientProtocols.filter(
            (pp: PatientProtocol) => pp.tenantId === tenantId
          )
        : [],
    [allPatientProtocols, tenantId]
  );
  const protocolCustomizations = useMemo(
    () =>
      tenantId
        ? allProtocolCustomizations.filter(
            (pc: ProtocolCustomization) => pc.tenantId === tenantId
          )
        : [],
    [allProtocolCustomizations, tenantId]
  );
  const protocolProgressNotes = useMemo(
    () =>
      tenantId
        ? allProtocolProgressNotes.filter(
            (ppn: ProtocolProgressNote) => ppn.tenantId === tenantId
          )
        : [],
    [allProtocolProgressNotes, tenantId]
  );
  const protocolOutcomes = useMemo(
    () =>
      tenantId
        ? allProtocolOutcomes.filter(
            (po: ProtocolOutcome) => po.tenantId === tenantId
          )
        : [],
    [allProtocolOutcomes, tenantId]
  );
  const protocolAnalytics = useMemo(
    () =>
      tenantId
        ? allProtocolAnalytics.filter(
            (pa: ProtocolAnalytics) => pa.tenantId === tenantId
          )
        : [],
    [allProtocolAnalytics, tenantId]
  );

  // Operational Management filtered data
  const qualityIndicators = useMemo(
    () =>
      tenantId
        ? allQualityIndicators.filter(
            (qi: QualityIndicator) => qi.tenantId === tenantId
          )
        : [],
    [allQualityIndicators, tenantId]
  );
  const productivityMetrics = useMemo(
    () =>
      tenantId
        ? allProductivityMetrics.filter(
            (pm: ProductivityMetric) => pm.tenantId === tenantId
          )
        : [],
    [allProductivityMetrics, tenantId]
  );
  const equipment = useMemo(
    () =>
      tenantId
        ? allEquipment.filter((eq: Equipment) => eq.tenantId === tenantId)
        : [],
    [allEquipment, tenantId]
  );
  const operationalAlerts = useMemo(
    () =>
      tenantId
        ? allOperationalAlerts.filter(
            (oa: OperationalAlert) => oa.tenantId === tenantId
          )
        : [],
    [allOperationalAlerts, tenantId]
  );
  const executiveReports = useMemo(
    () =>
      tenantId
        ? allExecutiveReports.filter(
            (er: ExecutiveReport) => er.tenantId === tenantId
          )
        : [],
    [allExecutiveReports, tenantId]
  );

  // === SISTEMA DE FAVORITOS E AVALIAÇÕES - FILTERED ARRAYS ===
  const exerciseFavorites = useMemo(
    () => {
      if (!allExerciseFavorites || !Array.isArray(allExerciseFavorites)) {
        return [];
      }
      return tenantId
        ? allExerciseFavorites.filter(
            (ef: ExerciseFavorite) => ef.tenantId === tenantId
          )
        : [];
    },
    [allExerciseFavorites, tenantId]
  );

  const exerciseRatings = useMemo(
    () =>
      tenantId
        ? allExerciseRatings.filter(
            (er: ExerciseRating) => er.tenantId === tenantId
          )
        : [],
    [allExerciseRatings, tenantId]
  );

  // === SISTEMA DE VÍDEOS E IMAGENS - FILTERED ARRAYS ===
  const exerciseVideos = useMemo(
    () =>
      tenantId
        ? allExerciseVideos.filter(
            (ev: ExerciseVideo) => ev.tenantId === tenantId
          )
        : [],
    [allExerciseVideos, tenantId]
  );
  const exerciseImages = useMemo(
    () => {
      if (!tenantId || !allExerciseImages || !Array.isArray(allExerciseImages)) {
        return [];
      }
      return allExerciseImages.filter(
        (ei: ExerciseImage) => ei.tenantId === tenantId
      );
    },
    [allExerciseImages, tenantId]
  );

  // === SISTEMA DE FAVORITOS E AVALIAÇÕES - FUNCTIONS ===
  const toggleExerciseFavorite = useCallback(
    (exerciseId: string, actingUser: User) => {
      if (!tenantId || !allExerciseFavorites || !Array.isArray(allExerciseFavorites)) return;

      const existingFavorite = allExerciseFavorites.find(
        (f) => f.userId === actingUser.id && f.exerciseId === exerciseId
      );

      if (existingFavorite) {
        // Remove favorite
        setAllExerciseFavorites(
          allExerciseFavorites.filter((f) => f.id !== existingFavorite.id)
        );
        addNotification({
          type: 'info',
          title: 'Favorito removido',
          message: 'Exercício removido dos favoritos',
        });
      } else {
        // Add favorite
        const newFavorite: ExerciseFavorite = {
          id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: actingUser.id,
          exerciseId,
          createdAt: new Date().toISOString(),
          tenantId,
        };
        setAllExerciseFavorites([...(allExerciseFavorites || []), newFavorite]);
        addNotification({
          type: 'success',
          title: 'Favorito adicionado',
          message: 'Exercício adicionado aos favoritos',
        });
      }
    },
    [allExerciseFavorites, setAllExerciseFavorites, tenantId, addNotification]
  );

  const saveExerciseRating = useCallback(
    (rating: Omit<ExerciseRating, 'id'>, actingUser: User) => {
      if (!rating.tenantId) {
        rating.tenantId = tenantId || '';
      }

      const newRating: ExerciseRating = {
        ...rating,
        id: `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      setAllExerciseRatings([...(allExerciseRatings || []), newRating]);
      addNotification({
        type: 'success',
        title: 'Avaliação salva',
        message: 'Sua avaliação do exercício foi registrada',
      });
    },
    [allExerciseRatings, setAllExerciseRatings, tenantId, addNotification]
  );

  const getExerciseFavorites = useCallback(
    (userId: string) => {
      return exerciseFavorites.filter((f) => f.userId === userId);
    },
    [exerciseFavorites]
  );

  const getExerciseRatings = useCallback(
    (exerciseId: string) => {
      return exerciseRatings.filter((r) => r.exerciseId === exerciseId);
    },
    [exerciseRatings]
  );

  const getExerciseStatistics = useCallback(
    (exerciseId: string): ExerciseStatistics | null => {
      const exercise = exercises.find((e) => e.id === exerciseId);
      if (!exercise) return null;

      const ratings = getExerciseRatings(exerciseId);
      const favorites = exerciseFavorites.filter(
        (f) => f.exerciseId === exerciseId
      );

      const ratingDistribution = {
        easy: ratings.filter((r) => r.rating === '😊').length,
        medium: ratings.filter((r) => r.rating === '😐').length,
        difficult: ratings.filter((r) => r.rating === '😰').length,
      };

      const averagePainLevel =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.painLevel, 0) / ratings.length
          : 0;

      return {
        exerciseId,
        exerciseName: exercise.name,
        totalRatings: ratings.length,
        averagePainLevel,
        ratingDistribution,
        favoriteCount: favorites.length,
        usageCount: ratings.length, // Using ratings as usage proxy
        lastUsed:
          ratings.length > 0
            ? ratings.sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )[0].date
            : new Date().toISOString(),
      };
    },
    [exercises, exerciseRatings, exerciseFavorites, getExerciseRatings]
  );

  const getMostUsedExercises = useCallback(
    (userId?: string): ExerciseStatistics[] => {
      const stats: ExerciseStatistics[] = [];

      exercises.forEach((exercise) => {
        const exerciseStats = getExerciseStatistics(exercise.id);
        if (exerciseStats && exerciseStats.totalRatings > 0) {
          stats.push(exerciseStats);
        }
      });

      return stats.sort((a, b) => b.usageCount - a.usageCount).slice(0, 10);
    },
    [exercises, getExerciseStatistics]
  );

  // === SISTEMA DE VÍDEOS ===

  const saveExerciseVideo = useCallback(
    (video: Omit<ExerciseVideo, 'id'>, actingUser: User) => {
      const newVideo: ExerciseVideo = {
        ...video,
        id: `video-${crypto.randomUUID()}`,
        uploadedAt: new Date().toISOString(),
        viewCount: 0,
        isActive: true,
      };

      setAllExerciseVideos([...(allExerciseVideos || []), newVideo]);

      addNotification({
        type: 'success',
        title: 'Vídeo adicionado',
        message: `O vídeo "${video.title}" foi adicionado ao exercício.`,
      });
    },
    [allExerciseVideos, setAllExerciseVideos]
  );

  const deleteExerciseVideo = useCallback(
    (videoId: string, actingUser: User) => {
      if (!allExerciseVideos || !Array.isArray(allExerciseVideos)) return;
      
      const videoToDelete = allExerciseVideos.find((v) => v.id === videoId);
      if (!videoToDelete) return;

      setAllExerciseVideos(allExerciseVideos.filter((v) => v.id !== videoId));

      addNotification({
        type: 'info',
        title: 'Vídeo removido',
        message: `O vídeo "${videoToDelete.title}" foi removido.`,
      });
    },
    [allExerciseVideos, setAllExerciseVideos, addNotification]
  );

  const getExerciseVideos = useCallback(
    (exerciseId: string): ExerciseVideo[] => {
      if (!allExerciseVideos || !Array.isArray(allExerciseVideos)) {
        return [];
      }
      
      return allExerciseVideos
        .filter(
          (v) =>
            v.exerciseId === exerciseId && v.isActive && v.tenantId === tenantId
        )
        .sort((a, b) => a.order - b.order);
    },
    [allExerciseVideos, tenantId]
  );

  const incrementVideoView = useCallback(
    (videoId: string, actingUser: User) => {
      setAllExerciseVideos((videos) =>
        videos.map((v) =>
          v.id === videoId
            ? {
                ...v,
                viewCount: v.viewCount + 1,
                lastViewed: new Date().toISOString(),
              }
            : v
        )
      );
    },
    [setAllExerciseVideos]
  );

  // === SISTEMA DE IMAGENS ===

  const saveExerciseImage = useCallback(
    (image: Omit<ExerciseImage, 'id'>, actingUser: User) => {
      const newImage: ExerciseImage = {
        ...image,
        id: `image-${crypto.randomUUID()}`,
        uploadedAt: new Date().toISOString(),
        isActive: true,
      };

      setAllExerciseImages([...(allExerciseImages || []), newImage]);

      addNotification({
        type: 'success',
        title: 'Imagem adicionada',
        message: `A imagem "${image.title}" foi adicionada ao exercício.`,
      });
    },
    [allExerciseImages, setAllExerciseImages]
  );

  const updateExerciseImage = useCallback(
    (imageId: string, updates: Partial<ExerciseImage>, actingUser: User) => {
      const updatedImages = (allExerciseImages || []).map((img) =>
        img.id === imageId ? { ...img, ...updates } : img
      );

      setAllExerciseImages(updatedImages);

      addNotification({
        type: 'success',
        title: 'Imagem atualizada',
        message: 'As anotações da imagem foram atualizadas com sucesso.',
      });
    },
    [allExerciseImages, setAllExerciseImages]
  );

  const deleteExerciseImage = useCallback(
    (imageId: string, actingUser: User) => {
      const imageToDelete = (allExerciseImages || []).find((img) => img.id === imageId);
      if (!imageToDelete) return;

      setAllExerciseImages(
        (allExerciseImages || []).filter((img) => img.id !== imageId)
      );

      addNotification({
        type: 'info',
        title: 'Imagem removida',
        message: `A imagem "${imageToDelete.title}" foi removida.`,
      });
    },
    [allExerciseImages, setAllExerciseImages]
  );

  const getExerciseImages = useCallback(
    (exerciseId: string): ExerciseImage[] => {
      if (!allExerciseImages || !Array.isArray(allExerciseImages)) {
        return [];
      }
      return allExerciseImages
        .filter(
          (img) =>
            img.exerciseId === exerciseId &&
            img.isActive &&
            img.tenantId === tenantId
        )
        .sort((a, b) => a.order - b.order);
    },
    [allExerciseImages, tenantId]
  );

  const getExerciseImagesByCategory = useCallback(
    (exerciseId: string, category: ImageCategory): ExerciseImage[] => {
      if (!allExerciseImages || !Array.isArray(allExerciseImages)) {
        return [];
      }
      return allExerciseImages
        .filter(
          (img) =>
            img.exerciseId === exerciseId &&
            img.category === category &&
            img.isActive &&
            img.tenantId === tenantId
        )
        .sort((a, b) => a.order - b.order);
    },
    [allExerciseImages, tenantId]
  );

  const saveExerciseLog = useCallback(
    (log: Omit<ExerciseLog, 'id' | 'tenantId'>) => {
      if (actingUser) {
        context.saveExerciseLog(log, actingUser);
      }
    },
    [actingUser, context]
  );

  const sendChatMessage = useCallback(
    (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
      if (actingUser) {
        context.sendChatMessage(message, actingUser);
      }
    },
    [actingUser, context]
  );

  const saveDocument = useCallback(
    (document: Document) => {
      if (actingUser) context.saveDocument(document, actingUser);
    },
    [actingUser, context]
  );

  const deleteDocument = useCallback(
    (documentId: string) => {
      if (actingUser) context.deleteDocument(documentId, actingUser);
    },
    [actingUser, context]
  );

  const saveCourse = useCallback(
    (course: Course) => {
      if (actingUser) context.saveCourse(course, actingUser);
    },
    [actingUser, context]
  );

  const deleteCourse = useCallback(
    (courseId: string) => {
      if (actingUser) context.deleteCourse(courseId, actingUser);
    },
    [actingUser, context]
  );

  const saveStudentProgress = useCallback(
    (progress: StudentProgress) => {
      if (actingUser) context.saveStudentProgress(progress, actingUser);
    },
    [actingUser, context]
  );

  const saveMentorshipSession = useCallback(
    (session: MentorshipSession) => {
      if (actingUser) context.saveMentorshipSession(session, actingUser);
    },
    [actingUser, context]
  );

  const deleteMentorshipSession = useCallback(
    (sessionId: string) => {
      if (actingUser) context.deleteMentorshipSession(sessionId, actingUser);
    },
    [actingUser, context]
  );

  // Clinical Cases callbacks
  const saveClinicalCase = useCallback(
    (clinicalCase: ClinicalCase) => {
      if (actingUser) context.saveClinicalCase(clinicalCase, actingUser);
    },
    [actingUser, context]
  );

  const deleteClinicalCase = useCallback(
    (caseId: string) => {
      if (actingUser) context.deleteClinicalCase(caseId, actingUser);
    },
    [actingUser, context]
  );

  const saveCaseAttachment = useCallback(
    (attachment: CaseAttachment) => {
      if (actingUser) context.saveCaseAttachment(attachment, actingUser);
    },
    [actingUser, context]
  );

  const deleteCaseAttachment = useCallback(
    (attachmentId: string) => {
      if (actingUser) context.deleteCaseAttachment(attachmentId, actingUser);
    },
    [actingUser, context]
  );

  const saveCaseComment = useCallback(
    (comment: Omit<CaseComment, 'id' | 'createdAt'>) => {
      if (actingUser) context.saveCaseComment(comment, actingUser);
    },
    [actingUser, context]
  );

  const deleteCaseComment = useCallback(
    (commentId: string) => {
      if (actingUser) context.deleteCaseComment(commentId, actingUser);
    },
    [actingUser, context]
  );

  const likeCaseComment = useCallback(
    (commentId: string) => {
      if (actingUser) context.likeCaseComment(commentId, actingUser);
    },
    [actingUser, context]
  );

  const recordCaseView = useCallback(
    (caseId: string, duration: number, completed: boolean) => {
      if (actingUser)
        context.recordCaseView(caseId, duration, completed, actingUser);
    },
    [actingUser, context]
  );

  const saveCaseRating = useCallback(
    (rating: Omit<CaseRating, 'id' | 'createdAt'>) => {
      if (actingUser) context.saveCaseRating(rating, actingUser);
    },
    [actingUser, context]
  );

  const toggleCaseFavorite = useCallback(
    (caseId: string) => {
      if (actingUser) context.toggleCaseFavorite(caseId, actingUser);
    },
    [actingUser, context]
  );

  // Clinical Protocols callbacks
  const saveClinicalProtocol = useCallback(
    (protocol: ClinicalProtocol) => {
      if (actingUser) context.saveClinicalProtocol(protocol, actingUser);
    },
    [actingUser, context]
  );

  const deleteClinicalProtocol = useCallback(
    (protocolId: string) => {
      if (actingUser) context.deleteClinicalProtocol(protocolId, actingUser);
    },
    [actingUser, context]
  );

  const prescribeProtocol = useCallback(
    (
      patientId: string,
      protocolId: string,
      customizations: ProtocolCustomization[]
    ) => {
      if (actingUser)
        context.prescribeProtocol(
          patientId,
          protocolId,
          customizations,
          actingUser
        );
    },
    [actingUser, context]
  );

  const updatePatientProtocolStatus = useCallback(
    (patientProtocolId: string, status: PatientProtocol['status']) => {
      if (actingUser)
        context.updatePatientProtocolStatus(
          patientProtocolId,
          status,
          actingUser
        );
    },
    [actingUser, context]
  );

  const addProtocolProgressNote = useCallback(
    (note: Omit<ProtocolProgressNote, 'id'>) => {
      if (actingUser) context.addProtocolProgressNote(note, actingUser);
    },
    [actingUser, context]
  );

  const updateProtocolOutcome = useCallback(
    (outcome: Omit<ProtocolOutcome, 'id'>) => {
      if (actingUser) context.updateProtocolOutcome(outcome, actingUser);
    },
    [actingUser, context]
  );

  const advanceProtocolPhase = useCallback(
    (patientProtocolId: string, newPhaseId: string) => {
      if (actingUser)
        context.advanceProtocolPhase(patientProtocolId, newPhaseId, actingUser);
    },
    [actingUser, context]
  );

  const customizeProtocolExercise = useCallback(
    (customization: Omit<ProtocolCustomization, 'id'>) => {
      if (actingUser)
        context.customizeProtocolExercise(customization, actingUser);
    },
    [actingUser, context]
  );

  const saveTimeBlock = useCallback(
    (timeBlock: TimeBlock) => {
      if (actingUser) context.saveTimeBlock(timeBlock, actingUser);
    },
    [actingUser, context]
  );

  const deleteTimeBlock = useCallback(
    (timeBlockId: string) => {
      if (actingUser) context.deleteTimeBlock(timeBlockId, actingUser);
    },
    [actingUser, context]
  );

  // Patient-related data filtering functions
  const getTasksForPatient = useCallback(
    (patientId: string): Task[] => {
      return tasks.filter((task) => task.patientId === patientId);
    },
    [tasks]
  );

  const getAppointmentsForPatient = useCallback(
    (patientId: string): Appointment[] => {
      return appointments.filter((appt) => appt.patientId === patientId);
    },
    [appointments]
  );

  const getPrescriptionsForPatient = useCallback(
    (patientId: string): Prescription[] => {
      return prescriptions.filter((presc) => presc.patientId === patientId);
    },
    [prescriptions]
  );

  const getExerciseLogsForPatient = useCallback(
    (patientId: string): ExerciseLog[] => {
      return exerciseLogs.filter((log) => log.patientId === patientId);
    },
    [exerciseLogs]
  );

  const getAssessmentsForPatient = useCallback(
    (patientId: string): Assessment[] => {
      return assessments.filter((a) => a.patientId === patientId);
    },
    [assessments]
  );

  const getTransactionsForPatient = useCallback(
    (patientId: string): Transaction[] => {
      return transactions.filter((t) => t.patientId === patientId);
    },
    [transactions]
  );

  const getDocumentsForPatient = useCallback(
    (patientId: string): Document[] => {
      return documents.filter((doc) => doc.patientId === patientId);
    },
    [documents]
  );

  // Alert Management Functions
  const acknowledgeAlert = useCallback(
    (alertId: string, actingUser: User) => {
      if (!actingUser.tenantId) return;

      setAllOperationalAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                acknowledgedAt: new Date().toISOString(),
                acknowledgedBy: actingUser.id,
              }
            : alert
        )
      );

      saveAuditLog({
        action: LogAction.UPDATE_TASK, // Using existing action, could add new ones
        targetCollection: 'operationalAlerts',
        targetId: alertId,
        targetName: 'Alert Acknowledged',
        details: { acknowledgedBy: actingUser.name },
        userId: actingUser.id,
        userName: actingUser.name,
        tenantId: actingUser.tenantId,
      });
    },
    [saveAuditLog]
  );

  const resolveAlert = useCallback(
    (alertId: string, actingUser: User) => {
      if (!actingUser.tenantId) return;

      setAllOperationalAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                isActive: false,
                resolvedAt: new Date().toISOString(),
                resolvedBy: actingUser.id,
              }
            : alert
        )
      );

      saveAuditLog({
        action: LogAction.UPDATE_TASK,
        targetCollection: 'operationalAlerts',
        targetId: alertId,
        targetName: 'Alert Resolved',
        details: { resolvedBy: actingUser.name },
        userId: actingUser.id,
        userName: actingUser.name,
        tenantId: actingUser.tenantId,
      });
    },
    [saveAuditLog]
  );

  // Equipment Management Functions
  const saveEquipment = useCallback(
    (equipment: Equipment, actingUser: User) => {
      if (!actingUser.tenantId) return;

      const equipmentWithTenant = {
        ...equipment,
        tenantId: actingUser.tenantId,
      };

      if (equipment.id) {
        // Update existing equipment
        setAllEquipment((prev) =>
          prev.map((eq) => (eq.id === equipment.id ? equipmentWithTenant : eq))
        );
        saveAuditLog({
          action: LogAction.UPDATE_TASK,
          targetCollection: 'equipment',
          targetId: equipment.id,
          targetName: equipment.name,
          userId: actingUser.id,
          userName: actingUser.name,
          tenantId: actingUser.tenantId,
        });
      } else {
        // Create new equipment
        const newEquipment = {
          ...equipmentWithTenant,
          id: crypto.randomUUID(),
        };
        setAllEquipment((prev) => [...prev, newEquipment]);
        saveAuditLog({
          action: LogAction.CREATE_TASK,
          targetCollection: 'equipment',
          targetId: newEquipment.id,
          targetName: newEquipment.name,
          userId: actingUser.id,
          userName: actingUser.name,
          tenantId: actingUser.tenantId,
        });
      }
    },
    [saveAuditLog]
  );

  const deleteEquipment = useCallback(
    (equipmentId: string, actingUser: User) => {
      if (!actingUser.tenantId) return;

      const equipment = allEquipment.find((eq) => eq.id === equipmentId);
      if (!equipment) return;

      setAllEquipment((prev) => prev.filter((eq) => eq.id !== equipmentId));

      saveAuditLog({
        action: LogAction.DELETE_TASK,
        targetCollection: 'equipment',
        targetId: equipmentId,
        targetName: equipment.name,
        userId: actingUser.id,
        userName: actingUser.name,
        tenantId: actingUser.tenantId,
      });
    },
    [allEquipment, saveAuditLog]
  );

  // Executive Report Generation
  const generateExecutiveReport = useCallback(
    (
      type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom',
      period: { start: string; end: string },
      actingUser: User
    ) => {
      if (!actingUser.tenantId) return;

      const reportId = crypto.randomUUID();

      // Calculate KPIs for the period
      const periodStart = new Date(period.start);
      const periodEnd = new Date(period.end);

      const periodAppointments = appointments.filter(
        (a) =>
          new Date(a.start) >= periodStart && new Date(a.start) <= periodEnd
      );
      const periodTransactions = transactions.filter(
        (t) =>
          new Date(t.dueDate) >= periodStart && new Date(t.dueDate) <= periodEnd
      );

      const totalRevenue = periodTransactions
        .filter((t) => t.status === 'pago')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalAppointments = periodAppointments.length;
      const avgSatisfaction =
        qualityIndicators
          .filter((qi) => qi.type === 'satisfaction')
          .reduce((sum, qi, _, arr) => sum + qi.value / arr.length, 0) || 0;

      const utilizationRate =
        totalAppointments > 0
          ? (periodAppointments.filter((a) => new Date(a.end) < new Date())
              .length /
              totalAppointments) *
            100
          : 0;

      const newReport: ExecutiveReport = {
        id: reportId,
        title: `Relatório Executivo - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type,
        period,
        generatedAt: new Date().toISOString(),
        generatedBy: actingUser.id,
        status: 'ready',
        sections: [
          {
            id: crypto.randomUUID(),
            title: 'KPIs Principais',
            type: 'kpi',
            data: {
              revenue: totalRevenue,
              appointments: totalAppointments,
              satisfaction: avgSatisfaction,
              utilization: utilizationRate,
            },
          },
          {
            id: crypto.randomUUID(),
            title: 'Produtividade por Fisioterapeuta',
            type: 'chart',
            data: productivityMetrics,
          },
          {
            id: crypto.randomUUID(),
            title: 'Status dos Equipamentos',
            type: 'table',
            data: equipment,
          },
        ],
        summary: {
          totalRevenue,
          totalAppointments,
          averageSatisfaction: avgSatisfaction,
          utilizationRate,
          topPerformer: users.find((u) => u.role === 'fisio')?.name || 'N/A',
          mainConcerns: operationalAlerts
            .filter((a) => a.isActive && a.severity === 'high')
            .map((a) => a.title)
            .slice(0, 3),
          recommendations: [
            utilizationRate < 80 ? 'Melhorar taxa de utilização' : null,
            avgSatisfaction < 4.0 ? 'Focar na satisfação do cliente' : null,
            'Manter monitoramento contínuo',
          ].filter(Boolean) as string[],
        },
        kpis: [
          {
            id: 'revenue',
            name: 'Receita Total',
            value: totalRevenue,
            target: 50000,
            unit: 'R$',
            trend: 'up' as const,
            change: 12.5,
            category: 'financial',
            isGood: true,
          },
        ],
        tenantId: actingUser.tenantId,
      };

      setAllExecutiveReports((prev) => [...prev, newReport]);

      saveAuditLog({
        action: LogAction.CREATE_TASK,
        targetCollection: 'executiveReports',
        targetId: reportId,
        targetName: newReport.title,
        userId: actingUser.id,
        userName: actingUser.name,
        tenantId: actingUser.tenantId,
      });

      return newReport;
    },
    [
      appointments,
      transactions,
      qualityIndicators,
      productivityMetrics,
      equipment,
      operationalAlerts,
      users,
      saveAuditLog,
    ]
  );

  // === FUNÇÕES DO DIÁRIO DE SINTOMAS ===
  const symptomDiaryEntries = useMemo(
    () => {
      if (!allSymptomDiaryEntries || !Array.isArray(allSymptomDiaryEntries)) {
        return [];
      }
      return allSymptomDiaryEntries.filter(
        (entry) => entry.tenantId === currentUser?.tenantId
      );
    },
    [allSymptomDiaryEntries, currentUser?.tenantId]
  );

  const addSymptomDiaryEntry = (entryData: any) => {
    if (!currentUser?.tenantId) return;

    const newEntry = {
      ...entryData,
      id: `symptom-entry-${crypto.randomUUID()}`,
      tenantId: currentUser.tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllSymptomDiaryEntries((prev) => [...prev, newEntry]);

    if (currentUser) {
      logAction(
        currentUser,
        LogAction.CREATE,
        'symptom_diary_entries',
        newEntry.id,
        `Registro de sintomas - ${newEntry.date}`,
        { data: newEntry }
      );
    }
  };

  const updateSymptomDiaryEntry = (entryId: string, updates: any) => {
    if (!currentUser?.tenantId) return;

    setAllSymptomDiaryEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId && entry.tenantId === currentUser.tenantId
          ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
          : entry
      )
    );

    if (currentUser) {
      logAction(
        currentUser,
        LogAction.UPDATE,
        'symptom_diary_entries',
        entryId,
        `Registro de sintomas - ${updates.date || 'sem data'}`,
        { updates }
      );
    }
  };

  const deleteSymptomDiaryEntry = (entryId: string) => {
    if (!currentUser?.tenantId) return;

    const entryToDelete = allSymptomDiaryEntries.find(
      (entry) => entry.id === entryId && entry.tenantId === currentUser.tenantId
    );

    if (entryToDelete) {
      setAllSymptomDiaryEntries((prev) =>
        prev.filter((entry) => entry.id !== entryId)
      );

      if (currentUser) {
        logAction(
          currentUser,
          LogAction.DELETE,
          'symptom_diary_entries',
          entryId,
          `Registro de sintomas - ${entryToDelete.date}`,
          { deletedEntry: entryToDelete }
        );
      }
    }
  };

  const getSymptomDiaryEntriesForPatient = (patientId: string) => {
    return symptomDiaryEntries.filter((entry) => entry.patientId === patientId);
  };

  const getAllData = useCallback(() => {
    return {
      users: rest.allUsers,
      tasks: rest.allTasks,
      patients: rest.allPatients,
      appointments: rest.allAppointments,
      transactions: rest.allTransactions,
      symptomDiaryEntries: rest.allSymptomDiaryEntries,
      // Add other data as needed
    };
  }, [rest]);

  return {
    ...rest,
    users,
    tasks,
    patients,
    notebooks,
    appointments,
    timeBlocks,
    exercises,
    prescriptions,
    exerciseLogs,
    assessments,
    transactions,
    auditLogs,
    tenants,
    documents,
    chats,
    chatMessages,
    courses,
    studentProgress,
    mentorshipSessions,
    clinicalCases,
    caseAttachments,
    caseComments,
    caseViews,
    caseRatings,
    caseFavorites,
    clinicalProtocols,
    protocolPhases,
    protocolExercises,
    protocolEvidences,
    patientProtocols,
    protocolCustomizations,
    protocolProgressNotes,
    protocolOutcomes,
    protocolAnalytics,
    qualityIndicators,
    productivityMetrics,
    equipment,
    operationalAlerts,
    executiveReports,
    exerciseFavorites,
    exerciseRatings,
    exerciseVideos,
    exerciseImages,
    saveExerciseLog,
    sendChatMessage,
    saveDocument,
    deleteDocument,
    saveCourse,
    deleteCourse,
    saveStudentProgress,
    saveMentorshipSession,
    deleteMentorshipSession,
    saveClinicalCase,
    deleteClinicalCase,
    saveCaseAttachment,
    deleteCaseAttachment,
    saveCaseComment,
    deleteCaseComment,
    likeCaseComment,
    recordCaseView,
    saveCaseRating,
    toggleCaseFavorite,
    saveClinicalProtocol,
    deleteClinicalProtocol,
    prescribeProtocol,
    updatePatientProtocolStatus,
    addProtocolProgressNote,
    updateProtocolOutcome,
    advanceProtocolPhase,
    customizeProtocolExercise,
    saveTimeBlock,
    deleteTimeBlock,
    getTasksForPatient,
    getAppointmentsForPatient,
    getPrescriptionsForPatient,
    getExerciseLogsForPatient,
    getAssessmentsForPatient,
    getTransactionsForPatient,
    getDocumentsForPatient,
    acknowledgeAlert,
    resolveAlert,
    saveEquipment,
    deleteEquipment,
    generateExecutiveReport,
    getAllData,
    saveAuditLog,
    // Sistema de Favoritos e Avaliações
    toggleExerciseFavorite,
    saveExerciseRating,
    getExerciseFavorites,
    getExerciseRatings,
    getExerciseStatistics,
    getMostUsedExercises,
    // Sistema de Vídeos e Imagens
    saveExerciseVideo,
    deleteExerciseVideo,
    getExerciseVideos,
    incrementVideoView,
    saveExerciseImage,
    updateExerciseImage,
    deleteExerciseImage,
    getExerciseImages,
    getExerciseImagesByCategory,
    // Sistema de Diário de Sintomas
    symptomDiaryEntries,
    addSymptomDiaryEntry,
    updateSymptomDiaryEntry,
    deleteSymptomDiaryEntry,
    getSymptomDiaryEntriesForPatient,
    // Notificações
    addNotification,
  } as DataContextType;
};
