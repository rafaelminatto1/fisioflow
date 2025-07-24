

import React from 'react';
import { User, UserRole, Task, Patient, Appointment, Notebook, Page, Exercise, Prescription, ExerciseLog, DailyLog, Assessment, Transaction, ChatMessage, TherapistGoal, PersonalGoal, Achievement, Comment, VideoSubmission, SessionNote, ClinicalProtocol, AssessmentTemplate, AppointmentType, Service, Package, PatientPackage, ClinicSettings, SessionNoteTemplate, RolePermissions, FormTemplate, FormSubmission, Automation, AppointmentLog, ExerciseImage, EducationalCaseStudy, AutomationActionType, AutomationTriggerType, Project, Medication, FisioNotificationSettings, Backup } from '../types';
import { areOnSameDay, isDayBefore, pointsToReachLevel } from '../utils';
import { NOTEBOOKS, ACHIEVEMENTS_LIST } from '../constants';
import { INITIAL_EXERCISES } from '../data/exercises';

// Helper function to safely load and parse from localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    // Ensure storedValue is not null, undefined, or the string "undefined"
    if (storedValue && storedValue !== "undefined") {
      return JSON.parse(storedValue);
    }
  } catch (error) {
    console.error(`Error parsing JSON from localStorage for key "${key}". Falling back to default.`, error);
    // It's good practice to remove the corrupted item
    localStorage.removeItem(key);
  }
  return defaultValue;
};


const defaultNotificationSettings: FisioNotificationSettings = {
    appointmentReminders: { enabled: true, beforeMinutes: [60, 1440], channels: [{channel: 'in_app', enabled: true}] },
    exerciseReminders: { enabled: true, times: ["09:00"], channels: [{channel: 'in_app', enabled: true}] },
    medicationReminders: { enabled: true, channels: [{channel: 'in_app', enabled: true}] },
};

// Minimal initial data to make the app runnable
const INITIAL_USERS: Record<string, User> = {
  '1': { id: '1', name: 'Dr. Alan Grant', role: UserRole.ADMIN, avatarUrl: 'https://i.pravatar.cc/150?u=1' },
  '2': { id: '2', name: 'Dr. Ellie Sattler', role: UserRole.FISIOTERAPEUTA, avatarUrl: 'https://i.pravatar.cc/150?u=2' },
  '3': { id: '3', name: 'Ian Malcolm', role: UserRole.ESTAGIARIO, avatarUrl: 'https://i.pravatar.cc/150?u=3' },
  '4': { id: '4', name: 'John Hammond', role: UserRole.PACIENTE, avatarUrl: 'https://i.pravatar.cc/150?u=4', patientProfileId: 'p1' },
  '5': { id: '5', name: 'Dennis Nedry', role: UserRole.PACIENTE, avatarUrl: 'https://i.pravatar.cc/150?u=5', patientProfileId: 'p2' },
};

const INITIAL_PATIENTS: Patient[] = [
    {
        id: 'p1', name: 'John Hammond', email: 'hammond@jurassic.com', phone: '555-0100', avatarUrl: 'https://i.pravatar.cc/150?u=4',
        medicalHistory: 'Lombalgia crônica com irradiação para membro inferior direito.',
        gamification: { points: 150, level: 2, streak: 5, lastLogDate: new Date(Date.now() - 86400000).toISOString() },
        unlockedAchievements: [{ achievementId: 'first-log', date: new Date().toISOString() }], personalGoals: [], appliedProtocolId: 'cp-1', protocolStartDate: new Date('2023-10-01').toISOString(),
        notificationSettings: defaultNotificationSettings,
    },
    {
        id: 'p2', name: 'Dennis Nedry', email: 'nedry@jurassic.com', phone: '555-0101', avatarUrl: 'https://i.pravatar.cc/150?u=5',
        medicalHistory: 'Pós-operatório de reconstrução de LCA no joelho esquerdo.',
        gamification: { points: 20, level: 1, streak: 1, lastLogDate: new Date(Date.now() - 86400000 * 3).toISOString() },
        unlockedAchievements: [], personalGoals: [],
        notificationSettings: defaultNotificationSettings,
    },
];

const INITIAL_SETTINGS: ClinicSettings = {
  clinicName: 'FisioFlow',
  clinicAddress: '123 Health St, Wellness City',
  clinicPhone: '(11) 98765-4321',
  clinicEmail: 'contato@fisioflow.com',
  clinicLogoUrl: '',
  enableHybridSearch: true,
  aiSmartSummaryEnabled: true,
  aiMentoringEnabled: true,
  aiTreatmentPlanEnabled: true,
  aiExerciseRecEnabled: true,
};

const INITIAL_PERMISSIONS: RolePermissions = {
    [UserRole.ADMIN]: {
        notebooks: { view: true, create: true, edit: true, delete: true },
        patients: { view_all: true, view_assigned: true, edit: true, delete: true },
        backups: { view: true, create: true, edit: false, delete: true },
    },
    [UserRole.FISIOTERAPEUTA]: {
        notebooks: { view: true, create: true, edit: true, delete: false },
        patients: { view_all: true, view_assigned: true, edit: true, delete: false },
        backups: { view: false, create: false, edit: false, delete: false },
    },
    [UserRole.ESTAGIARIO]: {
        notebooks: { view: true, create: false, edit: false, delete: false },
        patients: { view_all: false, view_assigned: true, edit: false, delete: false },
        backups: { view: false, create: false, edit: false, delete: false },
    },
    [UserRole.PACIENTE]: {
        notebooks: { view: false, create: false, edit: false, delete: false },
        patients: { view_all: false, view_assigned: false, edit: false, delete: false },
        backups: { view: false, create: false, edit: false, delete: false },
    }
};

const INITIAL_BACKUPS: Backup[] = [
    { id: 'bk-1', timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'success', version: 'v1.2.0', size: '15.2 MB' },
    { id: 'bk-2', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'success', version: 'v1.1.0', size: '14.8 MB' },
    { id: 'bk-3', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'failed', version: 'v1.0.0', size: '0 MB' },
];


// Simulate network latency
const LATENCY = 200;
const FAIL_RATE = 0; // Set to 0 for stable demo, can be increased to test error handling

// In-memory store to simulate a database
let users: Record<string, User> = loadFromStorage('fisioflow-users', INITIAL_USERS);
let patients: Patient[] = loadFromStorage('fisioflow-patients', INITIAL_PATIENTS);
let tasks: Task[] = loadFromStorage('fisioflow-tasks', []);
let appointments: Appointment[] = loadFromStorage('fisioflow-appointments', []);
let appointmentLogs: AppointmentLog[] = loadFromStorage('fisioflow-appointment-logs', []);
let notebooks: Notebook[] = loadFromStorage('fisioflow-notebooks', NOTEBOOKS);
let exerciseImages: ExerciseImage[] = loadFromStorage('fisioflow-exercise-images', []);
let prescriptions: Prescription[] = loadFromStorage('fisioflow-prescriptions', []);
let exerciseLogs: ExerciseLog[] = loadFromStorage('fisioflow-exercise-logs', []);
let dailyLogs: DailyLog[] = loadFromStorage('fisioflow-daily-logs', []);
let assessments: Assessment[] = loadFromStorage('fisioflow-assessments', []);
let transactions: Transaction[] = loadFromStorage('fisioflow-transactions', []);
let chatMessages: ChatMessage[] = loadFromStorage('fisioflow-chat-messages', []);
let therapistGoals: TherapistGoal[] = loadFromStorage('fisioflow-therapist-goals', []);
let comments: Comment[] = loadFromStorage('fisioflow-comments', []);
let videoSubmissions: VideoSubmission[] = loadFromStorage('fisioflow-video-submissions', []);
let sessionNotes: SessionNote[] = loadFromStorage('fisioflow-session-notes', []);
let clinicalProtocols: ClinicalProtocol[] = loadFromStorage('fisioflow-clinical-protocols', []);
let assessmentTemplates: AssessmentTemplate[] = loadFromStorage('fisioflow-assessment-templates', []);
let sessionNoteTemplates: SessionNoteTemplate[] = loadFromStorage('fisioflow-session-note-templates', []);
let services: Service[] = loadFromStorage('fisioflow-services', []);
let packages: Package[] = loadFromStorage('fisioflow-packages', []);
let patientPackages: PatientPackage[] = loadFromStorage('fisioflow-patient-packages', []);
let clinicSettings: ClinicSettings = loadFromStorage('fisioflow-clinic-settings', INITIAL_SETTINGS);
let permissions: RolePermissions = loadFromStorage('fisioflow-permissions', INITIAL_PERMISSIONS);
let formTemplates: FormTemplate[] = loadFromStorage('fisioflow-form-templates', []);
let formSubmissions: FormSubmission[] = loadFromStorage('fisioflow-form-submissions', []);
let automations: Automation[] = loadFromStorage('fisioflow-automations', []);
let caseStudies: EducationalCaseStudy[] = loadFromStorage('fisioflow-case-studies', []);
let projects: Project[] = loadFromStorage('fisioflow-projects', [{id: 'proj-1', name: 'Tarefas Gerais', description: 'Tarefas administrativas e clínicas gerais', ownerId: '1', memberIds:['1','2','3'], status: 'active', startDate: new Date().toISOString()}]);
let medications: Medication[] = loadFromStorage('fisioflow-medications', []);
let backups: Backup[] = loadFromStorage('fisioflow-backups', INITIAL_BACKUPS);

// Initialize exercises with a more robust check to populate the library
let exercises: Exercise[];
const storedExercises = loadFromStorage<Exercise[]>('fisioflow-exercises', []);
if (storedExercises && storedExercises.length > 10) { // Check if it's not the old small list
    exercises = storedExercises;
} else {
    exercises = INITIAL_EXERCISES;
    localStorage.setItem('fisioflow-exercises', JSON.stringify(exercises));
}


const auditLogs: any[] = [];

const simulateRequest = <T,>(data: T): Promise<T> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() < FAIL_RATE) {
                reject(new Error('Falha de rede simulada. Por favor, tente novamente.'));
            } else {
                resolve(JSON.parse(JSON.stringify(data))); // Deep copy
            }
        }, LATENCY);
    });
};

const createAuditLog = (entityType: string, entityId: string, userId: string, action: string, details: string) => {
    const user = users[userId];
    if (!user) return; // Should not happen if called from a hook with an authenticated user
    const newLog = {
        id: `audit-${crypto.randomUUID()}`,
        entityType,
        entityId,
        userId,
        userName: user.name,
        timestamp: new Date().toISOString(),
        action,
        details,
    };
    auditLogs.push(newLog);
    // In a real app, this would be sent to a persistent logging service.
    console.log("AUDIT LOG:", newLog);
};

const createAppointmentLog = (appointmentId: string, userId: string, action: 'criado' | 'atualizado' | 'excluído', details: string) => {
    const user = users[userId];
    if (!user) return;

    const newLog: AppointmentLog = {
        id: `log-${crypto.randomUUID()}`,
        appointmentId,
        userId,
        userName: user.name,
        timestamp: new Date().toISOString(),
        action,
        details,
    };
    appointmentLogs.push(newLog);
    localStorage.setItem('fisioflow-appointment-logs', JSON.stringify(appointmentLogs));
};

// --- API Functions ---

// Backups
export const getBackups = () => simulateRequest(backups);

export const createManualBackup = (userId: string): Promise<Backup> => {
    const inProgressBackup: Backup = {
        id: `bk-${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        status: 'in_progress',
        version: 'v' + (Math.random() * 2).toFixed(2), // dummy version
    };
    
    // Add to the start of the list to show immediately in UI
    backups.unshift(inProgressBackup);
    localStorage.setItem('fisioflow-backups', JSON.stringify(backups));

    // Simulate backup process
    return new Promise((resolve) => {
        setTimeout(() => {
            const finishedBackup: Backup = {
                ...inProgressBackup,
                status: 'success',
                size: `${(Math.random() * 5 + 15).toFixed(1)} MB`,
            };
            backups = backups.map(b => b.id === finishedBackup.id ? finishedBackup : b);
            localStorage.setItem('fisioflow-backups', JSON.stringify(backups));
            createAuditLog('backup', finishedBackup.id, userId, 'criado', `Backup manual "${finishedBackup.id}" criado.`);
            resolve(finishedBackup);
        }, 3000 + Math.random() * 2000); // Simulate 3-5 second backup time
    });
};

export const restoreFromBackup = (backupId: string, userId: string): Promise<{success: boolean}> => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup || backup.status !== 'success') {
        return Promise.reject(new Error("Backup inválido ou corrompido."));
    }
    
    createAuditLog('backup', backupId, userId, 'restaurado', `Sistema restaurado a partir do backup "${backup.version}" de ${new Date(backup.timestamp).toLocaleString()}.`);
    // In a real app, this would trigger a complex backend process.
    // For the demo, we just log and return success.
    return simulateRequest({ success: true });
};

export const deleteBackup = (backupId: string, userId: string): Promise<{ success: boolean }> => {
    const backupToDelete = backups.find(b => b.id === backupId);
    if (!backupToDelete) {
        return Promise.reject(new Error("Backup não encontrado."));
    }
    createAuditLog('backup', backupId, userId, 'excluído', `Backup "${backupToDelete.version}" de ${new Date(backupToDelete.timestamp).toLocaleString()} foi excluído.`);
    backups = backups.filter(b => b.id !== backupId);
    localStorage.setItem('fisioflow-backups', JSON.stringify(backups));
    return simulateRequest({ success: true });
};


// Users
export const getUsers = () => simulateRequest(Object.values(users));
export const saveUser = (user: User, userId: string) => {
    const isNew = !user.id || !users[user.id];
    const id = isNew ? `user-${crypto.randomUUID()}` : user.id;
    const newUser = { ...user, id };
    users[id] = newUser;
    createAuditLog('user', id, userId, isNew ? 'criado' : 'atualizado', `Usuário "${newUser.name}" (${newUser.role}) foi ${isNew ? 'criado' : 'atualizado'}.`);
    localStorage.setItem('fisioflow-users', JSON.stringify(users));
    return simulateRequest(newUser);
};
export const deleteUser = (userId: string, currentUserId: string) => {
    const userToDelete = users[userId];
    if (!userToDelete) return simulateRequest({ success: false });
    
    createAuditLog('user', userId, currentUserId, 'excluído', `Usuário "${userToDelete.name}" (${userToDelete.role}) foi excluído.`);
    
    delete users[userId];
    localStorage.setItem('fisioflow-users', JSON.stringify(users));
    return simulateRequest({ success: true });
};
export const toggleFavoriteExercise = (userId: string, exerciseId: string): Promise<User> => {
    const user = users[userId];
    if (!user) {
        return Promise.reject(new Error("User not found"));
    }
    const favorites = user.favoriteExerciseIds || [];
    if (favorites.includes(exerciseId)) {
        user.favoriteExerciseIds = favorites.filter(id => id !== exerciseId);
    } else {
        user.favoriteExerciseIds = [...favorites, exerciseId];
    }
    localStorage.setItem('fisioflow-users', JSON.stringify(users));
    return simulateRequest(user);
};


// Patients
export const getPatients = (requestingUser?: User) => {
    // This is a simple simulation of backend permission logic.
    if (requestingUser) {
        const userPermissions = permissions[requestingUser.role]?.patients;
        if (userPermissions && !userPermissions.view_all && userPermissions.view_assigned) {
            const assignedPatientIds = new Set(tasks.filter(t => t.assigneeId === requestingUser.id).map(t => t.patientId));
            const userPatients = patients.filter(p => assignedPatientIds.has(p.id));
            return simulateRequest(userPatients);
        }
    }
    return simulateRequest(patients);
};

export const savePatient = (patient: Patient, userId: string) => {
    const isNew = !patient.id;
    let savedPatient: Patient;
    if (isNew) {
        savedPatient = { ...patient, id: `patient-${crypto.randomUUID()}`, notificationSettings: patient.notificationSettings || defaultNotificationSettings };
        patients.push(savedPatient);
    } else {
        savedPatient = patient;
        patients = patients.map(p => p.id === patient.id ? patient : p);
    }
    
    createAuditLog('patient', savedPatient.id, userId, isNew ? 'criado' : 'atualizado', `Paciente "${savedPatient.name}" foi ${isNew ? 'criado' : 'atualizado'}.`);
    localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
    return simulateRequest(savedPatient);
};
export const deletePatient = (patientId: string, userId: string) => {
    const patientToDelete = patients.find(p => p.id === patientId);
    if (patientToDelete) {
        createAuditLog('patient', patientId, userId, 'excluído', `Paciente "${patientToDelete.name}" foi excluído.`);
    }

    patients = patients.filter(p => p.id !== patientId);
    tasks = tasks.filter(t => t.patientId !== patientId);
    appointments = appointments.filter(a => a.patientId !== patientId);
    prescriptions = prescriptions.filter(p => p.patientId !== patientId);
    exerciseLogs = exerciseLogs.filter(l => l.patientId !== patientId);
    dailyLogs = dailyLogs.filter(l => l.patientId !== patientId);
    assessments = assessments.filter(a => a.patientId !== patientId);
    transactions = transactions.filter(t => t.patientId !== patientId);
    chatMessages = chatMessages.filter(m => m.patientId !== patientId);
    therapistGoals = therapistGoals.filter(g => g.patientId !== patientId);
    videoSubmissions = videoSubmissions.filter(s => s.patientId !== patientId);
    sessionNotes = sessionNotes.filter(sn => sn.patientId !== patientId);
    localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
    localStorage.setItem('fisioflow-tasks', JSON.stringify(tasks));
    localStorage.setItem('fisioflow-appointments', JSON.stringify(appointments));
    localStorage.setItem('fisioflow-prescriptions', JSON.stringify(prescriptions));
    localStorage.setItem('fisioflow-exercise-logs', JSON.stringify(exerciseLogs));
    localStorage.setItem('fisioflow-daily-logs', JSON.stringify(dailyLogs));
    localStorage.setItem('fisioflow-assessments', JSON.stringify(assessments));
    localStorage.setItem('fisioflow-transactions', JSON.stringify(transactions));
    localStorage.setItem('fisioflow-chat-messages', JSON.stringify(chatMessages));
    localStorage.setItem('fisioflow-therapist-goals', JSON.stringify(therapistGoals));
    localStorage.setItem('fisioflow-video-submissions', JSON.stringify(videoSubmissions));
    localStorage.setItem('fisioflow-session-notes', JSON.stringify(sessionNotes));
    
    return simulateRequest({ success: true });
};

export const addPersonalGoal = ({ patientId, text }: { patientId: string, text: string }): Promise<PersonalGoal> => {
  const patientIndex = patients.findIndex(p => p.id === patientId);
  if (patientIndex === -1) return Promise.reject(new Error("Patient not found"));
  
  const newGoal: PersonalGoal = { id: `pgoal-${crypto.randomUUID()}`, text, completed: false, dateCompleted: null };
  patients[patientIndex].personalGoals.push(newGoal);
  localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
  return simulateRequest(newGoal);
};

export const updatePersonalGoal = ({ patientId, goalId, completed }: { patientId: string, goalId: string, completed: boolean }): Promise<PersonalGoal> => {
  const patientIndex = patients.findIndex(p => p.id === patientId);
  if (patientIndex === -1) return Promise.reject(new Error("Patient not found"));
  const goalIndex = patients[patientIndex].personalGoals.findIndex(g => g.id === goalId);
  if (goalIndex === -1) return Promise.reject(new Error("Goal not found"));
  
  patients[patientIndex].personalGoals[goalIndex].completed = completed;
  patients[patientIndex].personalGoals[goalIndex].dateCompleted = completed ? new Date().toISOString() : null;

  if (completed) {
      patients[patientIndex].gamification.points += 50; // Award points for completing a goal
      const achievementId = 'goal-achieved';
      if (!patients[patientIndex].unlockedAchievements.some(a => a.achievementId === achievementId)) {
        patients[patientIndex].unlockedAchievements.push({ achievementId, date: new Date().toISOString() });
      }
  }

  localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
  return simulateRequest(patients[patientIndex].personalGoals[goalIndex]);
};

export const deletePersonalGoal = ({ patientId, goalId }: { patientId: string, goalId: string }): Promise<{success: boolean}> => {
    const patientIndex = patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) return Promise.reject(new Error("Patient not found"));
    patients[patientIndex].personalGoals = patients[patientIndex].personalGoals.filter(g => g.id !== goalId);
    localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
    return simulateRequest({ success: true });
};

export const applyProtocolToPatient = ({ patientId, protocolId }: { patientId: string, protocolId: string }): Promise<Patient> => {
    const patientIndex = patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) return Promise.reject(new Error("Patient not found"));
    const protocol = clinicalProtocols.find(p => p.id === protocolId);
    if (!protocol) return Promise.reject(new Error("Protocol not found"));

    // Remove existing prescriptions
    prescriptions = prescriptions.filter(p => p.patientId !== patientId);
    // Add new prescriptions from the protocol
    const newPrescriptions = protocol.exerciseIds.map(exId => ({
        id: `pres-${crypto.randomUUID()}`,
        patientId,
        exerciseId: exId,
        sets: 3, // Default values
        reps: 12,
        frequency: '3x por semana',
    }));
    prescriptions.push(...newPrescriptions);
    
    patients[patientIndex].appliedProtocolId = protocolId;
    patients[patientIndex].protocolStartDate = new Date().toISOString();

    localStorage.setItem('fisioflow-prescriptions', JSON.stringify(prescriptions));
    localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
    
    return simulateRequest(patients[patientIndex]);
};

// Tasks
export const getTasks = () => simulateRequest(tasks);

export const saveTask = (task: Task, userId: string): Promise<Task> => {
  const isNew = !task.id;
  const savedTask: Task = isNew
    ? { ...task, id: `task-${crypto.randomUUID()}` }
    : (task as Task);

    createAuditLog('task', savedTask.id, userId, isNew ? 'criado' : 'atualizado', `Tarefa "${savedTask.title}" foi ${isNew ? 'criada' : 'atualizada'}.`);

  if (isNew) {
    tasks.push(savedTask);
  } else {
    tasks = tasks.map(t => (t.id === savedTask.id ? savedTask : t));
  }
  localStorage.setItem('fisioflow-tasks', JSON.stringify(tasks));
  return simulateRequest(savedTask);
};

export const deleteTask = (taskId: string, userId: string): Promise<{ success: boolean }> => {
  const taskToDelete = tasks.find(t => t.id === taskId);
  if (!taskToDelete) return Promise.reject(new Error("Task not found"));
  createAuditLog('task', taskId, userId, 'excluído', `Tarefa "${taskToDelete.title}" foi excluída.`);
  tasks = tasks.filter(t => t.id !== taskId);
  comments = comments.filter(c => c.taskId !== taskId); // Cascade delete comments
  localStorage.setItem('fisioflow-tasks', JSON.stringify(tasks));
  localStorage.setItem('fisioflow-comments', JSON.stringify(comments));
  return simulateRequest({ success: true });
};

export const addTaskFeedback = ({ taskId, feedback }: { taskId: string, feedback: string }): Promise<Task> => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return Promise.reject(new Error("Task not found"));
    const task = tasks[taskIndex];
    const newDescription = `${task.description || ''}\n\n[Feedback do Paciente]: ${feedback}`;
    const updatedTask = { ...task, description: newDescription, status: 'review' as const };
    tasks[taskIndex] = updatedTask;
    localStorage.setItem('fisioflow-tasks', JSON.stringify(tasks));
    return simulateRequest(updatedTask);
};

// Appointments
export const getAppointments = () => simulateRequest(appointments);

export const saveAppointment = (appointment: Partial<Appointment>, userId: string): Promise<Appointment> => {
  const isNew = !appointment.id;
  
  let savedAppt: Appointment;
  let logAction: 'criado' | 'atualizado' = isNew ? 'criado' : 'atualizado';
  let logDetails = '';

  if (isNew) {
    savedAppt = { ...appointment, id: `appt-${crypto.randomUUID()}` } as Appointment;
    appointments.push(savedAppt);
    logDetails = `Agendamento para ${patients.find(p => p.id === savedAppt.patientId)?.name || 'Bloqueio'} em ${new Date(savedAppt.start).toLocaleString('pt-BR')}.`;
  } else {
    savedAppt = appointment as Appointment;
    appointments = appointments.map(a => a.id === savedAppt.id ? savedAppt : a);
    logDetails = `Agendamento ID ${savedAppt.id} atualizado.`;
  }
  
  // Create a transaction if it's a new paid service/protocol
  if (isNew && savedAppt.status !== 'cancelado' && savedAppt.type !== AppointmentType.BLOQUEIO && (savedAppt.serviceId || savedAppt.protocolId)) {
      const service = services.find(s => s.id === savedAppt.serviceId);
      const protocol = clinicalProtocols.find(p => p.id === savedAppt.protocolId);
      const item = service || protocol;
      const price = service?.price ?? protocol?.defaultPrice;

      if (item && price && price > 0) {
          const newTransaction: Transaction = {
              id: `trans-${crypto.randomUUID()}`,
              patientId: savedAppt.patientId,
              description: `Referente a: ${item.name}`,
              amount: price,
              status: 'pendente',
              dueDate: savedAppt.start,
              appointmentId: savedAppt.id
          };
          transactions.push(newTransaction);
          localStorage.setItem('fisioflow-transactions', JSON.stringify(transactions));
      }
  }

  createAppointmentLog(savedAppt.id, userId, logAction, logDetails);
  localStorage.setItem('fisioflow-appointments', JSON.stringify(appointments));
  return simulateRequest(savedAppt);
};

export const deleteAppointment = (appointmentId: string, userId: string): Promise<{ success: boolean }> => {
    const appt = appointments.find(a => a.id === appointmentId);
    if (!appt) return Promise.reject(new Error("Appointment not found"));
    createAppointmentLog(appointmentId, userId, 'excluído', `Agendamento de ${new Date(appt.start).toLocaleString('pt-BR')} foi excluído.`);
    appointments = appointments.filter(a => a.id !== appointmentId);
    localStorage.setItem('fisioflow-appointments', JSON.stringify(appointments));
    return simulateRequest({ success: true });
};

export const deleteAppointmentSeries = (appointmentId: string, userId: string): Promise<{ success: boolean }> => {
    const appt = appointments.find(a => a.id === appointmentId);
    if (!appt || !appt.recurringId) return Promise.reject(new Error("Appointment not part of a series"));
    
    const seriesId = appt.recurringId;
    const seriesStartDate = new Date(appt.start);

    createAppointmentLog(appointmentId, userId, 'excluído', `Série de agendamentos recorrentes (ID: ${seriesId}) foi excluída a partir de ${seriesStartDate.toLocaleString('pt-BR')}.`);

    appointments = appointments.filter(a => {
        if (a.recurringId !== seriesId) return true; // Keep if not in series
        if (new Date(a.start) < seriesStartDate) return true; // Keep if before the deleted one
        return false; // Delete if in series and on or after the start date
    });
    
    localStorage.setItem('fisioflow-appointments', JSON.stringify(appointments));
    return simulateRequest({ success: true });
};

export const getAppointmentLogs = (appointmentId: string): Promise<AppointmentLog[]> => {
    return simulateRequest(appointmentLogs.filter(log => log.appointmentId === appointmentId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
};

// Notebooks
export const getNotebooks = () => simulateRequest(notebooks);
export const savePage = ({ pageId, content }: { pageId: string, content: string }): Promise<Page> => {
    let foundPage: Page | undefined;
    notebooks = notebooks.map(nb => ({
        ...nb,
        pages: nb.pages.map(p => {
            if (p.id === pageId) {
                foundPage = { ...p, content };
                return foundPage;
            }
            return p;
        })
    }));
    if (!foundPage) return Promise.reject(new Error("Page not found"));
    localStorage.setItem('fisioflow-notebooks', JSON.stringify(notebooks));
    return simulateRequest(foundPage);
};

// Exercises
export const getExercises = () => simulateRequest(exercises);
export const saveExercise = (exercise: Exercise): Promise<Exercise> => {
    const isNew = !exercise.id;
    const savedExercise = isNew ? { ...exercise, id: `ex-${crypto.randomUUID()}` } : exercise;
    if (isNew) {
        exercises.push(savedExercise);
    } else {
        exercises = exercises.map(ex => ex.id === savedExercise.id ? savedExercise : ex);
    }
    localStorage.setItem('fisioflow-exercises', JSON.stringify(exercises));
    return simulateRequest(savedExercise);
};
export const deleteExercise = (exerciseId: string): Promise<{ success: boolean }> => {
    exercises = exercises.filter(ex => ex.id !== exerciseId);
    const presToDelete = prescriptions.filter(p => p.exerciseId === exerciseId).map(p => p.id);
    prescriptions = prescriptions.filter(p => p.exerciseId !== exerciseId);
    exerciseLogs = exerciseLogs.filter(l => !presToDelete.includes(l.prescriptionId));
    localStorage.setItem('fisioflow-exercises', JSON.stringify(exercises));
    localStorage.setItem('fisioflow-prescriptions', JSON.stringify(prescriptions));
    localStorage.setItem('fisioflow-exercise-logs', JSON.stringify(exerciseLogs));
    return simulateRequest({ success: true });
};

// Prescriptions
export const getPrescriptions = () => simulateRequest(prescriptions);
export const savePrescription = (prescription: Prescription): Promise<Prescription> => {
    const isNew = !prescription.id;
    const savedPrescription = isNew ? { ...prescription, id: `pres-${crypto.randomUUID()}` } : prescription;
    if (isNew) {
        prescriptions.push(savedPrescription);
    } else {
        prescriptions = prescriptions.map(p => p.id === savedPrescription.id ? savedPrescription : p);
    }
    localStorage.setItem('fisioflow-prescriptions', JSON.stringify(prescriptions));
    return simulateRequest(savedPrescription);
};
export const deletePrescription = (prescriptionId: string): Promise<{ success: boolean }> => {
    prescriptions = prescriptions.filter(p => p.id !== prescriptionId);
    exerciseLogs = exerciseLogs.filter(l => l.prescriptionId !== prescriptionId);
    localStorage.setItem('fisioflow-prescriptions', JSON.stringify(prescriptions));
    localStorage.setItem('fisioflow-exercise-logs', JSON.stringify(exerciseLogs));
    return simulateRequest({ success: true });
};

// ExerciseLogs
export const getExerciseLogs = () => simulateRequest(exerciseLogs);
export const saveExerciseLog = (log: Omit<ExerciseLog, 'id'>): Promise<{ newLog: ExerciseLog; updatedPatient: Patient | null }> => {
    const newLog = { ...log, id: `log-${crypto.randomUUID()}` };
    exerciseLogs.push(newLog);
    
    // Update patient gamification
    const patientIndex = patients.findIndex(p => p.id === newLog.patientId);
    let updatedPatient: Patient | null = null;
    if (patientIndex !== -1) {
        const patient = patients[patientIndex];
        patient.gamification.points += 10;
        
        const today = new Date();
        const lastLogDate = patient.gamification.lastLogDate ? new Date(patient.gamification.lastLogDate) : null;
        
        if (lastLogDate && isDayBefore(lastLogDate, today)) {
            patient.gamification.streak += 1;
        } else if (!lastLogDate || !areOnSameDay(lastLogDate, today)) {
            patient.gamification.streak = 1;
        }
        
        patient.gamification.lastLogDate = today.toISOString();
        
        const nextLevelPoints = pointsToReachLevel(patient.gamification.level + 1);
        if (patient.gamification.points >= nextLevelPoints) {
            patient.gamification.level += 1;
        }

        // Achievements
        const unlockedAchievements = new Set(patient.unlockedAchievements.map(a => a.achievementId));
        if(!unlockedAchievements.has('first-log')) {
            patient.unlockedAchievements.push({achievementId: 'first-log', date: today.toISOString()});
        }
        if(patient.gamification.streak >= 3 && !unlockedAchievements.has('streak-3')) {
            patient.unlockedAchievements.push({achievementId: 'streak-3', date: today.toISOString()});
        }
        if(patient.gamification.streak >= 7 && !unlockedAchievements.has('streak-7')) {
            patient.unlockedAchievements.push({achievementId: 'streak-7', date: today.toISOString()});
        }
        if(patient.gamification.level >= 2 && !unlockedAchievements.has('level-2')) {
            patient.unlockedAchievements.push({achievementId: 'level-2', date: today.toISOString()});
        }
        if(patient.gamification.level >= 5 && !unlockedAchievements.has('level-5')) {
            patient.unlockedAchievements.push({achievementId: 'level-5', date: today.toISOString()});
        }

        patients[patientIndex] = patient;
        updatedPatient = patient;
        localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
    }

    localStorage.setItem('fisioflow-exercise-logs', JSON.stringify(exerciseLogs));
    
    if (newLog.painLevel >= 8) {
        saveTask({
            title: `Verificar dor alta do paciente ${patients.find(p=>p.id === newLog.patientId)?.name}`,
            priority: 'high',
            patientId: newLog.patientId,
            description: `Paciente reportou dor nível ${newLog.painLevel}/10 ao realizar exercícios.`,
            status: 'todo',
            projectId: 'proj-1'
        } as Task, 'system-auto');
    }

    return simulateRequest({ newLog, updatedPatient });
};

// DailyLogs
export const getDailyLogs = () => simulateRequest(dailyLogs);
export const saveDailyLog = (log: Omit<DailyLog, 'id'>): Promise<DailyLog> => {
    const today = new Date().toISOString().split('T')[0];
    // Check if there is already a log for today
    const existingLogIndex = dailyLogs.findIndex(d => d.patientId === log.patientId && d.date.startsWith(today));

    let savedLog: DailyLog;
    if (existingLogIndex !== -1) {
        savedLog = { ...dailyLogs[existingLogIndex], ...log };
        dailyLogs[existingLogIndex] = savedLog;
    } else {
        savedLog = { ...log, id: `dlog-${crypto.randomUUID()}` };
        dailyLogs.push(savedLog);
    }
    localStorage.setItem('fisioflow-daily-logs', JSON.stringify(dailyLogs));
    return simulateRequest(savedLog);
};

// Assessments
export const getAssessments = () => simulateRequest(assessments);
export const saveAssessment = (assessment: Assessment, userId: string): Promise<Assessment> => {
    const isNew = !assessment.id;
    const savedAssessment = isNew ? { ...assessment, id: `assess-${crypto.randomUUID()}` } : assessment;
    if (isNew) {
        assessments.push(savedAssessment);
    } else {
        assessments = assessments.map(a => a.id === savedAssessment.id ? savedAssessment : a);
    }
    
    // Achievement check
     const patientIndex = patients.findIndex(p => p.id === savedAssessment.patientId);
     if (patientIndex !== -1) {
         const patient = patients[patientIndex];
         const achievementId = 'first-assessment';
         if (!patient.unlockedAchievements.some(a => a.achievementId === achievementId)) {
            patient.unlockedAchievements.push({ achievementId, date: new Date().toISOString() });
            localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
         }
     }

    createAuditLog('assessment', savedAssessment.id, userId, isNew ? 'criado' : 'atualizado', `Avaliação para ${patients.find(p=>p.id === savedAssessment.patientId)?.name} foi ${isNew ? 'criada' : 'atualizada'}.`);
    localStorage.setItem('fisioflow-assessments', JSON.stringify(assessments));
    return simulateRequest(savedAssessment);
};
export const deleteAssessment = (assessmentId: string, userId: string): Promise<{ success: boolean }> => {
    const assessmentToDelete = assessments.find(a => a.id === assessmentId);
    if(assessmentToDelete) {
         createAuditLog('assessment', assessmentId, userId, 'excluído', `Avaliação de ${new Date(assessmentToDelete.date).toLocaleDateString()} para ${patients.find(p=>p.id === assessmentToDelete.patientId)?.name} foi excluída.`);
    }
    assessments = assessments.filter(a => a.id !== assessmentId);
    localStorage.setItem('fisioflow-assessments', JSON.stringify(assessments));
    return simulateRequest({ success: true });
};

// Transactions
export const getTransactions = () => simulateRequest(transactions);
export const saveTransaction = (transaction: Transaction, userId: string): Promise<Transaction> => {
    const isNew = !transaction.id;
    const savedTransaction = isNew ? { ...transaction, id: `trans-${crypto.randomUUID()}` } : transaction;
    if (isNew) {
        transactions.push(savedTransaction);
    } else {
        transactions = transactions.map(t => t.id === savedTransaction.id ? savedTransaction : t);
    }
    createAuditLog('transaction', savedTransaction.id, userId, isNew ? 'criado' : 'atualizado', `Transação de R$ ${savedTransaction.amount} para ${patients.find(p=>p.id === savedTransaction.patientId)?.name} foi ${isNew ? 'criada' : 'atualizada'}.`);
    localStorage.setItem('fisioflow-transactions', JSON.stringify(transactions));
    return simulateRequest(savedTransaction);
};
export const deleteTransaction = (transactionId: string, userId: string): Promise<{ success: boolean }> => {
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if(transactionToDelete){
         createAuditLog('transaction', transactionId, userId, 'excluído', `Transação ID ${transactionId} foi excluída.`);
    }
    transactions = transactions.filter(t => t.id !== transactionId);
    localStorage.setItem('fisioflow-transactions', JSON.stringify(transactions));
    return simulateRequest({ success: true });
};

// Chat
export const getChatMessages = () => simulateRequest(chatMessages);
export const sendMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> => {
    const newMessage = { ...message, id: `msg-${crypto.randomUUID()}`, timestamp: new Date().toISOString() };
    chatMessages.push(newMessage);

     const patientIndex = patients.findIndex(p => p.id === newMessage.patientId);
     if (patientIndex !== -1) {
         const patient = patients[patientIndex];
         const achievementId = 'first-feedback';
         if (newMessage.senderId === patient.id && !patient.unlockedAchievements.some(a => a.achievementId === achievementId)) {
            patient.unlockedAchievements.push({ achievementId, date: new Date().toISOString() });
            localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
         }
     }

    localStorage.setItem('fisioflow-chat-messages', JSON.stringify(chatMessages));
    return simulateRequest(newMessage);
};

// Therapist Goals
export const getTherapistGoals = () => simulateRequest(therapistGoals);
export const saveTherapistGoal = (goal: TherapistGoal): Promise<TherapistGoal> => {
    const isNew = !goal.id;
    const savedGoal = isNew ? { ...goal, id: `tgoal-${crypto.randomUUID()}` } : goal;
    if (isNew) {
        therapistGoals.push(savedGoal);
    } else {
        therapistGoals = therapistGoals.map(g => g.id === savedGoal.id ? savedGoal : g);
    }
    localStorage.setItem('fisioflow-therapist-goals', JSON.stringify(therapistGoals));
    return simulateRequest(savedGoal);
};
export const deleteTherapistGoal = (goalId: string): Promise<{ success: boolean }> => {
    therapistGoals = therapistGoals.filter(g => g.id !== goalId);
    localStorage.setItem('fisioflow-therapist-goals', JSON.stringify(therapistGoals));
    return simulateRequest({ success: true });
};

// Comments
export const getComments = () => simulateRequest(comments);
export const saveComment = (comment: Omit<Comment, 'id'|'timestamp'>): Promise<Comment> => {
    const newComment: Comment = { ...comment, id: `comment-${crypto.randomUUID()}`, timestamp: new Date().toISOString() };
    comments.push(newComment);
    localStorage.setItem('fisioflow-comments', JSON.stringify(comments));
    return simulateRequest(newComment);
};
export const deleteComment = (commentId: string): Promise<{ success: boolean }> => {
    comments = comments.filter(c => c.id !== commentId);
    localStorage.setItem('fisioflow-comments', JSON.stringify(comments));
    return simulateRequest({ success: true });
};

// Video Submissions
export const getVideoSubmissions = () => simulateRequest(videoSubmissions);
export const saveVideoSubmission = (submission: Omit<VideoSubmission, 'id'|'timestamp'|'status'>): Promise<VideoSubmission> => {
    const newSubmission: VideoSubmission = { 
        ...submission, 
        id: `vidsub-${crypto.randomUUID()}`, 
        timestamp: new Date().toISOString(),
        status: 'pending_review' 
    };
    videoSubmissions.push(newSubmission);
    localStorage.setItem('fisioflow-video-submissions', JSON.stringify(videoSubmissions));
    return simulateRequest(newSubmission);
};
export const updateVideoSubmission = ({ submissionId, status, therapistNotes }: { submissionId: string, status: VideoSubmission['status'], therapistNotes?: string }): Promise<VideoSubmission> => {
    const submissionIndex = videoSubmissions.findIndex(s => s.id === submissionId);
    if(submissionIndex === -1) return Promise.reject(new Error("Submission not found"));
    videoSubmissions[submissionIndex] = {
        ...videoSubmissions[submissionIndex],
        status,
        therapistNotes
    };
    localStorage.setItem('fisioflow-video-submissions', JSON.stringify(videoSubmissions));
    return simulateRequest(videoSubmissions[submissionIndex]);
};

// Session Notes
export const getSessionNotes = () => simulateRequest(sessionNotes);
export const saveSessionNote = (note: SessionNote, userId: string): Promise<SessionNote> => {
    const isNew = !note.id;
    const savedNote = isNew ? { ...note, id: `note-${crypto.randomUUID()}` } : note;
    if (isNew) {
        sessionNotes.push(savedNote);
    } else {
        sessionNotes = sessionNotes.map(n => n.id === savedNote.id ? savedNote : n);
    }

    // Link note to appointment
    const appointmentIndex = appointments.findIndex(a => a.id === savedNote.appointmentId);
    if (appointmentIndex !== -1) {
        appointments[appointmentIndex].sessionNoteId = savedNote.id;
        localStorage.setItem('fisioflow-appointments', JSON.stringify(appointments));
    }

    createAuditLog('sessionNote', savedNote.id, userId, isNew ? 'criado' : 'atualizado', `Nota de sessão para ${patients.find(p=>p.id === savedNote.patientId)?.name} foi ${isNew ? 'criada' : 'atualizada'}.`);
    localStorage.setItem('fisioflow-session-notes', JSON.stringify(sessionNotes));
    return simulateRequest(savedNote);
};

export const deleteSessionNote = (noteId: string, userId: string): Promise<{ success: boolean }> => {
    const noteToDelete = sessionNotes.find(n => n.id === noteId);
    if(!noteToDelete) return Promise.reject(new Error("Note not found"));

     // Unlink note from appointment
    const appointmentIndex = appointments.findIndex(a => a.sessionNoteId === noteId);
    if (appointmentIndex !== -1) {
        appointments[appointmentIndex].sessionNoteId = undefined;
        localStorage.setItem('fisioflow-appointments', JSON.stringify(appointments));
    }

    createAuditLog('sessionNote', noteId, userId, 'excluído', `Nota de sessão ID ${noteId} foi excluída.`);
    sessionNotes = sessionNotes.filter(n => n.id !== noteId);
    localStorage.setItem('fisioflow-session-notes', JSON.stringify(sessionNotes));
    return simulateRequest({ success: true });
};

// Clinical Protocols
export const getClinicalProtocols = () => simulateRequest(clinicalProtocols);
export const saveClinicalProtocol = (protocol: ClinicalProtocol): Promise<ClinicalProtocol> => {
    const isNew = !protocol.id;
    const savedProtocol = isNew ? { ...protocol, id: `cp-${crypto.randomUUID()}` } : protocol;
    if (isNew) {
        clinicalProtocols.push(savedProtocol);
    } else {
        clinicalProtocols = clinicalProtocols.map(p => p.id === savedProtocol.id ? savedProtocol : p);
    }
    localStorage.setItem('fisioflow-clinical-protocols', JSON.stringify(clinicalProtocols));
    return simulateRequest(savedProtocol);
};
export const deleteClinicalProtocol = (protocolId: string): Promise<{ success: boolean }> => {
    clinicalProtocols = clinicalProtocols.filter(p => p.id !== protocolId);
    localStorage.setItem('fisioflow-clinical-protocols', JSON.stringify(clinicalProtocols));
    return simulateRequest({ success: true });
};

// Assessment Templates
export const getAssessmentTemplates = () => simulateRequest(assessmentTemplates);
export const saveAssessmentTemplate = (template: AssessmentTemplate): Promise<AssessmentTemplate> => {
    const isNew = !template.id;
    const savedTemplate = isNew ? { ...template, id: `at-${crypto.randomUUID()}` } : template;
    if (isNew) {
        assessmentTemplates.push(savedTemplate);
    } else {
        assessmentTemplates = assessmentTemplates.map(t => t.id === savedTemplate.id ? savedTemplate : t);
    }
    localStorage.setItem('fisioflow-assessment-templates', JSON.stringify(assessmentTemplates));
    return simulateRequest(savedTemplate);
};
export const deleteAssessmentTemplate = (templateId: string): Promise<{ success: boolean }> => {
    assessmentTemplates = assessmentTemplates.filter(t => t.id !== templateId);
    localStorage.setItem('fisioflow-assessment-templates', JSON.stringify(assessmentTemplates));
    return simulateRequest({ success: true });
};

// Session Note Templates
export const getSessionNoteTemplates = () => simulateRequest(sessionNoteTemplates);
export const saveSessionNoteTemplate = (template: SessionNoteTemplate): Promise<SessionNoteTemplate> => {
    const isNew = !template.id;
    const savedTemplate = isNew ? { ...template, id: `snt-${crypto.randomUUID()}` } : template;
    if (isNew) {
        sessionNoteTemplates.push(savedTemplate);
    } else {
        sessionNoteTemplates = sessionNoteTemplates.map(t => t.id === savedTemplate.id ? savedTemplate : t);
    }
    localStorage.setItem('fisioflow-session-note-templates', JSON.stringify(sessionNoteTemplates));
    return simulateRequest(savedTemplate);
};
export const deleteSessionNoteTemplate = (templateId: string): Promise<{ success: boolean }> => {
    sessionNoteTemplates = sessionNoteTemplates.filter(t => t.id !== templateId);
    localStorage.setItem('fisioflow-session-note-templates', JSON.stringify(sessionNoteTemplates));
    return simulateRequest({ success: true });
};

// Services and Packages
export const getServices = () => simulateRequest(services);
export const saveService = (service: Service): Promise<Service> => {
    const isNew = !service.id;
    const savedService = isNew ? { ...service, id: `serv-${crypto.randomUUID()}` } : service;
    if (isNew) {
        services.push(savedService);
    } else {
        services = services.map(s => s.id === savedService.id ? savedService : s);
    }
    localStorage.setItem('fisioflow-services', JSON.stringify(services));
    return simulateRequest(savedService);
};
export const deleteService = (serviceId: string): Promise<{ success: boolean }> => {
    if (packages.some(p => p.serviceId === serviceId)) {
        return Promise.reject(new Error("Não é possível excluir. Serviço está sendo usado em pacotes."));
    }
    services = services.filter(s => s.id !== serviceId);
    localStorage.setItem('fisioflow-services', JSON.stringify(services));
    return simulateRequest({ success: true });
};

export const getPackages = () => simulateRequest(packages);
export const savePackage = (pkg: Package): Promise<Package> => {
    const isNew = !pkg.id;
    const savedPackage = isNew ? { ...pkg, id: `pkg-${crypto.randomUUID()}` } : pkg;
    if (isNew) {
        packages.push(savedPackage);
    } else {
        packages = packages.map(p => p.id === savedPackage.id ? savedPackage : p);
    }
    localStorage.setItem('fisioflow-packages', JSON.stringify(packages));
    return simulateRequest(savedPackage);
};
export const deletePackage = (packageId: string): Promise<{ success: boolean }> => {
    if (patientPackages.some(p => p.packageId === packageId)) {
        return Promise.reject(new Error("Não é possível excluir. Pacote já foi vendido a pacientes."));
    }
    packages = packages.filter(p => p.id !== packageId);
    localStorage.setItem('fisioflow-packages', JSON.stringify(packages));
    return simulateRequest({ success: true });
};

export const getPatientPackages = () => simulateRequest(patientPackages);
export const assignPackageToPatient = ({ patientId, packageId }: { patientId: string, packageId: string }): Promise<PatientPackage> => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return Promise.reject(new Error("Package not found."));

    const newPatientPackage: PatientPackage = {
        id: `ppkg-${crypto.randomUUID()}`,
        patientId,
        packageId,
        purchaseDate: new Date().toISOString(),
        sessionsRemaining: pkg.sessionCount,
    };
    patientPackages.push(newPatientPackage);
    
    // Create a transaction for the package sale
    const newTransaction: Transaction = {
        id: `trans-${crypto.randomUUID()}`,
        patientId: patientId,
        description: `Compra do pacote: ${pkg.name}`,
        amount: pkg.price,
        status: 'pendente',
        dueDate: new Date().toISOString(),
        patientPackageId: newPatientPackage.id
    };
    transactions.push(newTransaction);

    localStorage.setItem('fisioflow-patient-packages', JSON.stringify(patientPackages));
    localStorage.setItem('fisioflow-transactions', JSON.stringify(transactions));
    
    return simulateRequest(newPatientPackage);
};


// Settings, Permissions, Automations
export const getSettings = () => simulateRequest(clinicSettings);
export const saveSettings = (settingsToSave: ClinicSettings): Promise<ClinicSettings> => {
    clinicSettings = settingsToSave;
    localStorage.setItem('fisioflow-clinic-settings', JSON.stringify(clinicSettings));
    return simulateRequest(clinicSettings);
};

export const getPermissions = () => simulateRequest(permissions);
export const savePermissions = (permissionsToSave: RolePermissions): Promise<RolePermissions> => {
    permissions = permissionsToSave;
    localStorage.setItem('fisioflow-permissions', JSON.stringify(permissions));
    return simulateRequest(permissions);
};

export const getAutomations = () => simulateRequest(automations);
export const saveAutomation = (automation: Automation): Promise<Automation> => {
    const isNew = !automation.id;
    const savedAutomation = isNew ? { ...automation, id: `auto-${crypto.randomUUID()}` } : automation;
    if (isNew) {
        automations.push(savedAutomation);
    } else {
        automations = automations.map(a => a.id === savedAutomation.id ? savedAutomation : a);
    }
    localStorage.setItem('fisioflow-automations', JSON.stringify(automations));
    return simulateRequest(savedAutomation);
};
export const deleteAutomation = (automationId: string): Promise<{ success: boolean }> => {
    automations = automations.filter(a => a.id !== automationId);
    localStorage.setItem('fisioflow-automations', JSON.stringify(automations));
    return simulateRequest({ success: true });
};

// Forms
export const getFormTemplates = () => simulateRequest(formTemplates);
export const saveFormTemplate = (template: FormTemplate): Promise<FormTemplate> => {
    const isNew = !template.id;
    const savedTemplate = isNew ? { ...template, id: `formt-${crypto.randomUUID()}` } : template;
    if (isNew) {
        formTemplates.push(savedTemplate);
    } else {
        formTemplates = formTemplates.map(t => t.id === savedTemplate.id ? savedTemplate : t);
    }
    localStorage.setItem('fisioflow-form-templates', JSON.stringify(formTemplates));
    return simulateRequest(savedTemplate);
};
export const deleteFormTemplate = (templateId: string): Promise<{ success: boolean }> => {
    formTemplates = formTemplates.filter(t => t.id !== templateId);
    localStorage.setItem('fisioflow-form-templates', JSON.stringify(formTemplates));
    return simulateRequest({ success: true });
};

export const getFormSubmissions = () => simulateRequest(formSubmissions);
export const saveFormSubmission = (submission: FormSubmission): Promise<FormSubmission> => {
    const isNew = !submission.id;
    const savedSubmission = isNew ? { ...submission, id: `subm-${crypto.randomUUID()}` } : submission;
    if (isNew) {
        formSubmissions.push(savedSubmission);
    } else {
        formSubmissions = formSubmissions.map(s => s.id === savedSubmission.id ? savedSubmission : s);
    }
    localStorage.setItem('fisioflow-form-submissions', JSON.stringify(formSubmissions));
    return simulateRequest(savedSubmission);
};


// Exercise Images
export const getExerciseImages = () => simulateRequest(exerciseImages);
export const saveExerciseImage = (image: ExerciseImage): Promise<ExerciseImage> => {
    const isNew = !image.id;
    const savedImage = isNew ? { ...image, id: `img-${crypto.randomUUID()}` } : image;
    if (isNew) {
        exerciseImages.push(savedImage);
    } else {
        exerciseImages = exerciseImages.map(i => i.id === savedImage.id ? savedImage : i);
    }
    localStorage.setItem('fisioflow-exercise-images', JSON.stringify(exerciseImages));
    return simulateRequest(savedImage);
};
export const deleteExerciseImage = (imageId: string): Promise<{ success: boolean }> => {
    exerciseImages = exerciseImages.filter(i => i.id !== imageId);
    localStorage.setItem('fisioflow-exercise-images', JSON.stringify(exerciseImages));
    return simulateRequest({ success: true });
};

// Educational Case Studies
export const getEducationalCaseStudies = () => simulateRequest(caseStudies);
export const saveEducationalCaseStudy = (study: EducationalCaseStudy): Promise<EducationalCaseStudy> => {
    const isNew = !study.id;
    const savedStudy = isNew ? { ...study, id: `cs-${crypto.randomUUID()}` } : study;
    if (isNew) {
        caseStudies.push(savedStudy);
    } else {
        caseStudies = caseStudies.map(cs => cs.id === savedStudy.id ? savedStudy : cs);
    }
    localStorage.setItem('fisioflow-case-studies', JSON.stringify(caseStudies));
    return simulateRequest(savedStudy);
};
export const deleteEducationalCaseStudy = (studyId: string): Promise<{ success: boolean }> => {
    caseStudies = caseStudies.filter(cs => cs.id !== studyId);
    localStorage.setItem('fisioflow-case-studies', JSON.stringify(caseStudies));
    return simulateRequest({ success: true });
};

// Projects
export const getProjects = () => simulateRequest(projects);
export const saveProject = (project: Project): Promise<Project> => {
    const isNew = !project.id;
    const savedProject = isNew ? { ...project, id: `proj-${crypto.randomUUID()}` } : project;
    if(isNew) {
        projects.push(savedProject);
    } else {
        projects = projects.map(p => p.id === savedProject.id ? savedProject : p);
    }
    localStorage.setItem('fisioflow-projects', JSON.stringify(projects));
    return simulateRequest(savedProject);
};

// Medications
export const getMedications = (patientId: string): Promise<Medication[]> => {
    return simulateRequest(medications.filter(m => m.patientId === patientId));
};
export const saveMedication = (med: Medication): Promise<Medication> => {
    const isNew = !med.id;
    const savedMed = isNew ? { ...med, id: `med-${crypto.randomUUID()}` } : med;
    if(isNew) {
        medications.push(savedMed);
    } else {
        medications = medications.map(m => m.id === savedMed.id ? savedMed : m);
    }
    localStorage.setItem('fisioflow-medications', JSON.stringify(medications));
    return simulateRequest(savedMed);
};
export const deleteMedication = (medicationId: string): Promise<{ success: boolean }> => {
    medications = medications.filter(m => m.id !== medicationId);
    localStorage.setItem('fisioflow-medications', JSON.stringify(medications));
    return simulateRequest({ success: true });
};