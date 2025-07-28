import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

import { INITIAL_PATIENTS, INITIAL_TASKS, INITIAL_USERS } from '../constants';

// Versão mínima do useData para deploy
const DataContext = createContext<any>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState(() => {
    try {
      const saved = localStorage.getItem('patients');
      return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
    } catch {
      return INITIAL_PATIENTS;
    }
  });

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('tasks');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [users] = useState(Object.values(INITIAL_USERS));

  // Função saveAuditLog simples que não faz nada (para evitar erros)
  const saveAuditLog = () => {};

  // Save functions
  const savePatient = (patient: any) => {
    const newPatients = patient.id 
      ? patients.map((p: any) => p.id === patient.id ? patient : p)
      : [...patients, { ...patient, id: `pat-${Date.now()}`, created_at: new Date().toISOString() }];
    
    setPatients(newPatients);
    localStorage.setItem('patients', JSON.stringify(newPatients));
  };

  const deletePatient = (id: string) => {
    const newPatients = patients.filter((p: any) => p.id !== id);
    setPatients(newPatients);
    localStorage.setItem('patients', JSON.stringify(newPatients));
  };

  const saveTask = (task: any) => {
    const newTasks = task.id
      ? tasks.map((t: any) => t.id === task.id ? task : t)
      : [...tasks, { ...task, id: `task-${Date.now()}`, created_at: new Date().toISOString() }];
    
    setTasks(newTasks);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
  };

  const deleteTask = (id: string) => {
    const newTasks = tasks.filter((t: any) => t.id !== id);
    setTasks(newTasks);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
  };

  const value = {
    // Data
    patients,
    tasks,
    users,
    
    // Mock data para compatibilidade
    notebooks: [],
    appointments: [],
    timeBlocks: [],
    exercises: [],
    prescriptions: [],
    exerciseLogs: [],
    assessments: [],
    transactions: [],
    auditLogs: [],
    tenants: [{ id: 't1', name: 'Demo Clinic' }],
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

    // Functions
    savePatient,
    deletePatient,
    saveTask,
    deleteTask,
    saveAuditLog,

    // Mock functions para compatibilidade
    saveUser: () => {},
    deleteUser: () => {},
    saveNotebook: () => {},
    deleteNotebook: () => {},
    saveAppointment: () => {},
    deleteAppointment: () => {},
    saveTenant: () => {},
    deleteTenant: () => {},
    saveExerciseLog: () => {},
    sendChatMessage: () => {},
    saveDocument: () => {},
    deleteDocument: () => {},
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
    saveTimeBlock: () => {},
    deleteTimeBlock: () => {},
    getTasksForPatient: () => [],
    getAppointmentsForPatient: () => [],
    getPrescriptionsForPatient: () => [],
    getExerciseLogsForPatient: () => [],
    getAssessmentsForPatient: () => [],
    getTransactionsForPatient: () => [],
    getDocumentsForPatient: () => [],
    acknowledgeAlert: () => {},
    resolveAlert: () => {},
    saveEquipment: () => {},
    deleteEquipment: () => {},
    generateExecutiveReport: () => {},
    getAllData: () => ({}),
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};