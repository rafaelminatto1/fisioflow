// Exportações das abas de detalhes do paciente
export { PatientOverviewTab } from './PatientOverviewTab';
export { PatientDiaryTab } from './PatientDiaryTab';
export { PatientFlowsheetTab } from './PatientFlowsheetTab';
export { PatientExercisesTab } from './PatientExercisesTab';
export { PatientMedicationsTab } from './PatientMedicationsTab';
export { PatientMessagesTab } from './PatientMessagesTab';
export { PatientSettingsTab } from './PatientSettingsTab';

// Tipos e interfaces relacionadas
export type {
  PatientOverviewTabProps,
  PatientDiaryTabProps,
  PatientFlowsheetTabProps,
  PatientExercisesTabProps,
  PatientMedicationsTabProps,
  PatientMessagesTabProps,
  PatientSettingsTabProps
} from './types';

// Constantes úteis
export const PATIENT_TAB_KEYS = {
  OVERVIEW: 'overview',
  DIARY: 'diary',
  FLOWSHEET: 'flowsheet',
  EXERCISES: 'exercises',
  MEDICATIONS: 'medications',
  MESSAGES: 'messages',
  SETTINGS: 'settings'
} as const;

export const PATIENT_TAB_LABELS = {
  [PATIENT_TAB_KEYS.OVERVIEW]: 'Visão Geral',
  [PATIENT_TAB_KEYS.DIARY]: 'Diário',
  [PATIENT_TAB_KEYS.FLOWSHEET]: 'Evolução',
  [PATIENT_TAB_KEYS.EXERCISES]: 'Exercícios',
  [PATIENT_TAB_KEYS.MEDICATIONS]: 'Medicações',
  [PATIENT_TAB_KEYS.MESSAGES]: 'Mensagens',
  [PATIENT_TAB_KEYS.SETTINGS]: 'Configurações'
} as const;

export type PatientTabKey = typeof PATIENT_TAB_KEYS[keyof typeof PATIENT_TAB_KEYS];