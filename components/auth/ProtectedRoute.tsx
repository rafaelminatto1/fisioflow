import { Lock, Warning } from '@mui/icons-material';
import { Card, CardContent, Typography, Box, Alert } from '@mui/material';
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { usePermissions, Permission } from '../../hooks/usePermissions';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: Permission[];
  requiredRoles?: UserRole[];
  requireAll?: boolean; // Se true, requer TODAS as permissões. Se false, requer QUALQUER uma
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAll = false,
  fallbackPath = '/login',
  showAccessDenied = true,
}) => {
  const { user } = useAuth();
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  // Não está logado
  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Verificar papéis específicos
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    if (!showAccessDenied) {
      return <Navigate to="/dashboard" replace />;
    }
    
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="50vh"
        p={3}
      >
        <Card sx={{ maxWidth: 500, textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <Lock sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="error">
              Acesso Negado
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={2}>
              Você não tem permissão para acessar esta página.
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Papel atual:</strong> {getRoleLabel(user.role)}
              <br />
              <strong>Papéis necessários:</strong> {requiredRoles.map(getRoleLabel).join(', ')}
            </Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Verificar permissões específicas
  if (requiredPermissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      if (!showAccessDenied) {
        return <Navigate to="/dashboard" replace />;
      }
      
      return (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="50vh"
          p={3}
        >
          <Card sx={{ maxWidth: 500, textAlign: 'center' }}>
            <CardContent sx={{ p: 4 }}>
              <Warning sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="warning.main">
                Permissão Insuficiente
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={2}>
                Você não possui as permissões necessárias para acessar esta funcionalidade.
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Papel atual:</strong> {getRoleLabel(user.role)}
                <br />
                <strong>Permissões necessárias:</strong> {requiredPermissions.map(getPermissionLabel).join(', ')}
              </Alert>
            </CardContent>
          </Card>
        </Box>
      );
    }
  }

  return <>{children}</>;
};

// Hook para usar em componentes
export const useProtectedAction = (
  requiredPermissions: Permission[] = [],
  requiredRoles: UserRole[] = [],
  requireAll = false
) => {
  const { user } = useAuth();
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  const canExecute = () => {
    if (!user) return false;
    
    // Verificar papéis
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      return false;
    }
    
    // Verificar permissões
    if (requiredPermissions.length > 0) {
      return requireAll 
        ? hasAllPermissions(requiredPermissions)
        : hasAnyPermission(requiredPermissions);
    }
    
    return true;
  };

  return { canExecute: canExecute() };
};

// Componente para botões condicionais
interface ConditionalRenderProps {
  children: ReactNode;
  requiredPermissions?: Permission[];
  requiredRoles?: UserRole[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAll = false,
  fallback = null,
}) => {
  const { canExecute } = useProtectedAction(requiredPermissions, requiredRoles, requireAll);
  
  return canExecute ? <>{children}</> : <>{fallback}</>;
};

// Utilitários
const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Administrador',
    [UserRole.FISIOTERAPEUTA]: 'Fisioterapeuta',
    [UserRole.ESTAGIARIO]: 'Estagiário',
    [UserRole.PACIENTE]: 'Paciente',
  };
  return labels[role] || role;
};

const getPermissionLabel = (permission: Permission): string => {
  // Mapeamento de permissões para labels legíveis
  const labels: Record<Permission, string> = {
    [Permission.VIEW_PATIENTS]: 'Ver Pacientes',
    [Permission.EDIT_PATIENTS]: 'Editar Pacientes',
    [Permission.CREATE_PATIENTS]: 'Criar Pacientes',
    [Permission.DELETE_PATIENTS]: 'Excluir Pacientes',
    [Permission.VIEW_APPOINTMENTS]: 'Ver Agendamentos',
    [Permission.EDIT_APPOINTMENTS]: 'Editar Agendamentos',
    [Permission.CREATE_APPOINTMENTS]: 'Criar Agendamentos',
    [Permission.DELETE_APPOINTMENTS]: 'Excluir Agendamentos',
    [Permission.VIEW_EXERCISES]: 'Ver Exercícios',
    [Permission.EDIT_EXERCISES]: 'Editar Exercícios',
    [Permission.CREATE_EXERCISES]: 'Criar Exercícios',
    [Permission.DELETE_EXERCISES]: 'Excluir Exercícios',
    [Permission.VIEW_BILLING]: 'Ver Faturamento',
    [Permission.EDIT_BILLING]: 'Editar Faturamento',
    [Permission.VIEW_REPORTS]: 'Ver Relatórios',
    [Permission.EXPORT_REPORTS]: 'Exportar Relatórios',
    [Permission.MANAGE_USERS]: 'Gerenciar Usuários',
    [Permission.MANAGE_SETTINGS]: 'Gerenciar Configurações',
    [Permission.VIEW_AUDIT_LOG]: 'Ver Log de Auditoria',
    [Permission.MANAGE_INTEGRATIONS]: 'Gerenciar Integrações',
    [Permission.VIEW_MENTORSHIP]: 'Ver Mentoria',
    [Permission.MANAGE_MENTORSHIP]: 'Gerenciar Mentoria',
    [Permission.EVALUATE_STUDENTS]: 'Avaliar Estudantes',
    [Permission.VIEW_OWN_DATA]: 'Ver Próprios Dados',
    [Permission.EDIT_OWN_PROFILE]: 'Editar Próprio Perfil',
    [Permission.VIEW_EXERCISES_ASSIGNED]: 'Ver Exercícios Atribuídos',
    [Permission.SUBMIT_FEEDBACK]: 'Enviar Feedback',
    [Permission.SEND_WHATSAPP]: 'Enviar WhatsApp',
    [Permission.VIEW_COMMUNICATIONS]: 'Ver Comunicações',
    [Permission.USE_AI_ASSISTANT]: 'Usar Assistente IA',
    [Permission.CONFIGURE_AI]: 'Configurar IA',
  };
  
  return labels[permission] || permission;
};