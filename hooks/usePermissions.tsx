import { useMemo } from 'react';

import { UserRole } from '../types';

import { useAuth } from './useAuth';

export enum Permission {
  // Pacientes
  VIEW_PATIENTS = 'view_patients',
  EDIT_PATIENTS = 'edit_patients',
  CREATE_PATIENTS = 'create_patients',
  DELETE_PATIENTS = 'delete_patients',
  
  // Agendamentos
  VIEW_APPOINTMENTS = 'view_appointments',
  EDIT_APPOINTMENTS = 'edit_appointments',
  CREATE_APPOINTMENTS = 'create_appointments',
  DELETE_APPOINTMENTS = 'delete_appointments',
  
  // Exercícios
  VIEW_EXERCISES = 'view_exercises',
  EDIT_EXERCISES = 'edit_exercises',
  CREATE_EXERCISES = 'create_exercises',
  DELETE_EXERCISES = 'delete_exercises',
  
  // Financeiro
  VIEW_BILLING = 'view_billing',
  EDIT_BILLING = 'edit_billing',
  VIEW_REPORTS = 'view_reports',
  EXPORT_REPORTS = 'export_reports',
  
  // Administração
  MANAGE_USERS = 'manage_users',
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_AUDIT_LOG = 'view_audit_log',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  
  // Mentoria
  VIEW_MENTORSHIP = 'view_mentorship',
  MANAGE_MENTORSHIP = 'manage_mentorship',
  EVALUATE_STUDENTS = 'evaluate_students',
  
  // Área do Paciente
  VIEW_OWN_DATA = 'view_own_data',
  EDIT_OWN_PROFILE = 'edit_own_profile',
  VIEW_EXERCISES_ASSIGNED = 'view_exercises_assigned',
  SUBMIT_FEEDBACK = 'submit_feedback',
  
  // WhatsApp e Comunicação
  SEND_WHATSAPP = 'send_whatsapp',
  VIEW_COMMUNICATIONS = 'view_communications',
  
  // IA Assistant
  USE_AI_ASSISTANT = 'use_ai_assistant',
  CONFIGURE_AI = 'configure_ai',
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Todas as permissões
    Permission.VIEW_PATIENTS,
    Permission.EDIT_PATIENTS,
    Permission.CREATE_PATIENTS,
    Permission.DELETE_PATIENTS,
    Permission.VIEW_APPOINTMENTS,
    Permission.EDIT_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.DELETE_APPOINTMENTS,
    Permission.VIEW_EXERCISES,
    Permission.EDIT_EXERCISES,
    Permission.CREATE_EXERCISES,
    Permission.DELETE_EXERCISES,
    Permission.VIEW_BILLING,
    Permission.EDIT_BILLING,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_AUDIT_LOG,
    Permission.MANAGE_INTEGRATIONS,
    Permission.VIEW_MENTORSHIP,
    Permission.MANAGE_MENTORSHIP,
    Permission.EVALUATE_STUDENTS,
    Permission.SEND_WHATSAPP,
    Permission.VIEW_COMMUNICATIONS,
    Permission.USE_AI_ASSISTANT,
    Permission.CONFIGURE_AI,
  ],
  
  [UserRole.FISIOTERAPEUTA]: [
    // Gerenciamento de pacientes
    Permission.VIEW_PATIENTS,
    Permission.EDIT_PATIENTS,
    Permission.CREATE_PATIENTS,
    
    // Agendamentos
    Permission.VIEW_APPOINTMENTS,
    Permission.EDIT_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.DELETE_APPOINTMENTS,
    
    // Exercícios
    Permission.VIEW_EXERCISES,
    Permission.EDIT_EXERCISES,
    Permission.CREATE_EXERCISES,
    
    // Relatórios básicos
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    
    // Mentoria (se for mentor)
    Permission.VIEW_MENTORSHIP,
    Permission.EVALUATE_STUDENTS,
    
    // Comunicação
    Permission.SEND_WHATSAPP,
    Permission.VIEW_COMMUNICATIONS,
    
    // IA Assistant
    Permission.USE_AI_ASSISTANT,
  ],
  
  [UserRole.ESTAGIARIO]: [
    // Visualização limitada
    Permission.VIEW_PATIENTS,
    Permission.VIEW_APPOINTMENTS,
    Permission.VIEW_EXERCISES,
    
    // Criação supervisionada
    Permission.CREATE_APPOINTMENTS,
    
    // Mentoria como estudante
    Permission.VIEW_MENTORSHIP,
    Permission.SUBMIT_FEEDBACK,
    
    // IA Assistant básico
    Permission.USE_AI_ASSISTANT,
  ],
  
  [UserRole.PACIENTE]: [
    // Apenas seus próprios dados
    Permission.VIEW_OWN_DATA,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_EXERCISES_ASSIGNED,
    Permission.SUBMIT_FEEDBACK,
  ],
};

export interface UsePermissionsReturn {
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  getUserPermissions: () => Permission[];
  canAccessRoute: (route: string) => boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();
  
  const userPermissions = useMemo(() => {
    if (!user) return [];
    return ROLE_PERMISSIONS[user.role] || [];
  }, [user]);
  
  const hasPermission = useMemo(() => 
    (permission: Permission): boolean => {
      return userPermissions.includes(permission);
    }, [userPermissions]
  );
  
  const hasAnyPermission = useMemo(() => 
    (permissions: Permission[]): boolean => {
      return permissions.some(permission => userPermissions.includes(permission));
    }, [userPermissions]
  );
  
  const hasAllPermissions = useMemo(() => 
    (permissions: Permission[]): boolean => {
      return permissions.every(permission => userPermissions.includes(permission));
    }, [userPermissions]
  );
  
  const getUserPermissions = useMemo(() => 
    (): Permission[] => {
      return [...userPermissions];
    }, [userPermissions]
  );
  
  const canAccessRoute = useMemo(() => 
    (route: string): boolean => {
      const routePermissions: Record<string, Permission[]> = {
        '/patients': [Permission.VIEW_PATIENTS],
        '/appointments': [Permission.VIEW_APPOINTMENTS],
        '/exercises': [Permission.VIEW_EXERCISES],
        '/billing': [Permission.VIEW_BILLING],
        '/reports': [Permission.VIEW_REPORTS],
        '/admin': [Permission.MANAGE_USERS, Permission.MANAGE_SETTINGS],
        '/mentorship': [Permission.VIEW_MENTORSHIP],
        '/patient-portal': [Permission.VIEW_OWN_DATA],
        '/settings': [Permission.MANAGE_SETTINGS],
      };
      
      const requiredPermissions = routePermissions[route];
      if (!requiredPermissions) return true; // Rota pública
      
      return hasAnyPermission(requiredPermissions);
    }, [hasAnyPermission]
  );
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    canAccessRoute,
  };
};

// Hook para componentes que precisam verificar permissões específicas
export const useRequirePermission = (permission: Permission): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

// Hook para verificar múltiplas permissões
export const useRequirePermissions = (
  permissions: Permission[], 
  requireAll = false
): boolean => {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();
  return requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
};