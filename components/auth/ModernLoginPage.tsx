import {
  Visibility,
  VisibilityOff,
  Security,
  Person,
  Email,
  Lock,
  AdminPanelSettings,
  LocalHospital,
  School,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Chip,
  Stack,
} from '@mui/material';
import React, { useState } from 'react';

import { useAuth } from '../../hooks/useAuthImproved';
import { UserRole } from '../../types';

interface LoginFormData {
  email: string;
  password: string;
  twoFactorCode: string;
}

export const ModernLoginPage: React.FC = () => {
  const { login, loginWithRole, isLoading, requires2FA } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    twoFactorCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [loginMode, setLoginMode] = useState<'form' | 'demo'>('form');

  const handleInputChange = (field: keyof LoginFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (requires2FA && !formData.twoFactorCode) {
      setError('Código de verificação em duas etapas é obrigatório');
      return;
    }

    const result = await login({
      email: formData.email,
      password: formData.password,
      twoFactorCode: formData.twoFactorCode || undefined,
    });

    if (!result.success) {
      if (result.requires2FA) {
        // 2FA necessário, formulário já será atualizado pelo estado requires2FA
        return;
      }
      setError(result.error || 'Erro no login');
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    setError('');
    loginWithRole(role);
  };

  const demoAccounts = [
    {
      role: UserRole.ADMIN,
      label: 'Administrador',
      icon: <AdminPanelSettings />,
      description: 'Acesso completo ao sistema',
      color: 'error' as const,
    },
    {
      role: UserRole.FISIOTERAPEUTA,
      label: 'Fisioterapeuta',
      icon: <LocalHospital />,
      description: 'Gerenciar pacientes e consultas',
      color: 'primary' as const,
    },
    {
      role: UserRole.ESTAGIARIO,
      label: 'Estagiário',
      icon: <School />,
      description: 'Acesso supervisionado',
      color: 'secondary' as const,
    },
    {
      role: UserRole.PACIENTE,
      label: 'Paciente',
      icon: <Person />,
      description: 'Portal do paciente',
      color: 'success' as const,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
              FisioFlow
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema de Gestão para Fisioterapia
            </Typography>
          </Box>

          {/* Modo de Login Tabs */}
          <Stack direction="row" spacing={1} mb={3}>
            <Button
              variant={loginMode === 'form' ? 'contained' : 'outlined'}
              onClick={() => setLoginMode('form')}
              fullWidth
              size="small"
            >
              Login Seguro
            </Button>
            <Button
              variant={loginMode === 'demo' ? 'contained' : 'outlined'}
              onClick={() => setLoginMode('demo')}
              fullWidth
              size="small"
            >
              Demo Rápida
            </Button>
          </Stack>

          {loginMode === 'form' ? (
            /* Formulário de Login */
            <Box component="form" onSubmit={handleSubmit}>
              {requires2FA && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Security fontSize="small" />
                    <Typography variant="body2">
                      Verificação em duas etapas necessária
                    </Typography>
                  </Stack>
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                disabled={isLoading || requires2FA}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={isLoading || requires2FA}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {requires2FA && (
                <TextField
                  fullWidth
                  label="Código de Verificação (6 dígitos)"
                  value={formData.twoFactorCode}
                  onChange={handleInputChange('twoFactorCode')}
                  disabled={isLoading}
                  sx={{ mb: 2 }}
                  inputProps={{ maxLength: 6 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Security />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Digite o código do seu aplicativo autenticador"
                />
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ mb: 2, py: 1.5 }}
              >
                {isLoading ? (
                  <CircularProgress size={24} />
                ) : requires2FA ? (
                  'Verificar Código'
                ) : (
                  'Entrar'
                )}
              </Button>

              {/* Credenciais de Exemplo */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Credenciais de exemplo:
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  • admin@fisioflow.com / admin123 (requer 2FA: 123456)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  • dr.silva@clinic.com / senha123
                </Typography>
              </Box>
            </Box>
          ) : (
            /* Login Demo */
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary" textAlign="center" mb={1}>
                Acesso rápido para demonstração:
              </Typography>
              
              {demoAccounts.map(({ role, label, icon, description, color }) => (
                <Button
                  key={role}
                  variant="outlined"
                  size="large"
                  onClick={() => handleDemoLogin(role)}
                  disabled={isLoading}
                  sx={{
                    justifyContent: 'flex-start',
                    p: 2,
                    textAlign: 'left',
                  }}
                >
                  <Box sx={{ mr: 2, color: `${color}.main` }}>
                    {icon}
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" component="div">
                      {label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {description}
                    </Typography>
                  </Box>
                  <Chip
                    label="Demo"
                    size="small"
                    color={color}
                    variant="outlined"
                  />
                </Button>
              ))}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Stack>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Footer */}
          <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
            FisioFlow © 2024 - Sistema completo de gestão para fisioterapia
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};