# 🚀 Implementações Críticas - FisioFlow

## 🔒 1. CORREÇÃO DE SEGURANÇA - Senhas Hardcoded

### Arquivo: `docker-compose.yml` (Corrigido)

```yaml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-fisioflow_db}
      POSTGRES_USER: ${POSTGRES_USER:-fisioflow_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          memory: 512M
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-fisioflow_user}']
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          memory: 256M
    healthcheck:
      test: ['CMD', 'redis-cli', '--raw', 'incr', 'ping']
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-fisioflow_user}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-fisioflow_db}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          memory: 512M

  frontend:
    build: ./frontend
    ports:
      - '3000:3000'
    environment:
      - REACT_APP_API_URL=http://localhost:5000
    depends_on:
      - backend
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          memory: 256M

volumes:
  postgres_data:
```

### Arquivo: `.env.example`

```bash
# Database
POSTGRES_DB=fisioflow_db
POSTGRES_USER=fisioflow_user
POSTGRES_PASSWORD=generate_random_password_here

# Redis
REDIS_PASSWORD=generate_random_redis_password_here

# JWT
JWT_SECRET=generate_random_jwt_secret_here

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Environment
NODE_ENV=production
FLASK_ENV=production
```

---

## 🛡️ 2. VALIDAÇÃO DE DADOS COM ZOD

### Arquivo: `src/schemas/index.ts` (Novo)

```typescript
import { z } from 'zod';

// Schema base para tenant
export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  plan: z.enum(['free', 'premium', 'enterprise']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema para usuário
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nome é obrigatório'),
  role: z.enum(['admin', 'therapist', 'receptionist']),
  tenantId: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema para paciente
export const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  birthDate: z.string().datetime(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  address: z
    .object({
      street: z.string(),
      number: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
    })
    .optional(),
  tenantId: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema para sessão
export const SessionSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  therapistId: z.string().uuid(),
  date: z.string().datetime(),
  duration: z.number().min(15).max(180), // 15 min a 3 horas
  type: z.enum(['consultation', 'therapy', 'evaluation']),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().optional(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema para dados do localStorage
export const LocalStorageDataSchema = z.object({
  version: z.string(),
  timestamp: z.number(),
  data: z.record(z.any()),
  checksum: z.string().optional(),
});

// Tipos TypeScript derivados dos schemas
export type Tenant = z.infer<typeof TenantSchema>;
export type User = z.infer<typeof UserSchema>;
export type Patient = z.infer<typeof PatientSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type LocalStorageData = z.infer<typeof LocalStorageDataSchema>;
```

### Arquivo: `src/utils/dataValidator.ts` (Novo)

```typescript
import { z } from 'zod';
import { LocalStorageDataSchema } from '../schemas';

// Versão atual dos dados
const CURRENT_DATA_VERSION = '2.0';

// Função para validar e migrar dados do localStorage
export const validateAndMigrateLocalStorageData = (rawData: string): any => {
  try {
    const parsed = JSON.parse(rawData);

    // Validar estrutura básica
    const validated = LocalStorageDataSchema.parse(parsed);

    // Verificar versão e migrar se necessário
    if (validated.version !== CURRENT_DATA_VERSION) {
      return migrateData(validated);
    }

    // Verificar integridade dos dados (checksum)
    if (validated.checksum) {
      const calculatedChecksum = calculateChecksum(validated.data);
      if (calculatedChecksum !== validated.checksum) {
        throw new Error('Dados corrompidos - checksum inválido');
      }
    }

    return validated.data;
  } catch (error) {
    console.error('Erro ao validar dados do localStorage:', error);

    // Fallback: retornar dados vazios com estrutura válida
    return {
      patients: [],
      sessions: [],
      users: [],
      settings: {},
    };
  }
};

// Função para salvar dados com validação
export const saveValidatedData = (key: string, data: any): void => {
  try {
    const dataToSave = {
      version: CURRENT_DATA_VERSION,
      timestamp: Date.now(),
      data,
      checksum: calculateChecksum(data),
    };

    // Validar antes de salvar
    LocalStorageDataSchema.parse(dataToSave);

    localStorage.setItem(key, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    throw new Error('Falha ao salvar dados - validação falhou');
  }
};

// Migração de dados entre versões
const migrateData = (oldData: any): any => {
  switch (oldData.version) {
    case '1.0':
      return migrateFromV1ToV2(oldData.data);
    case '1.5':
      return migrateFromV15ToV2(oldData.data);
    default:
      console.warn(
        `Versão desconhecida: ${oldData.version}. Usando dados como estão.`
      );
      return oldData.data;
  }
};

const migrateFromV1ToV2 = (data: any): any => {
  // Exemplo de migração: adicionar campo tenantId se não existir
  return {
    ...data,
    patients:
      data.patients?.map((patient: any) => ({
        ...patient,
        tenantId: patient.tenantId || 'default-tenant-id',
      })) || [],
    sessions:
      data.sessions?.map((session: any) => ({
        ...session,
        tenantId: session.tenantId || 'default-tenant-id',
      })) || [],
  };
};

const migrateFromV15ToV2 = (data: any): any => {
  // Migração menor
  return data;
};

// Função para calcular checksum simples
const calculateChecksum = (data: any): string => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
};

// Validadores específicos para cada entidade
export const validatePatient = (data: unknown) => {
  return PatientSchema.parse(data);
};

export const validateUser = (data: unknown) => {
  return UserSchema.parse(data);
};

export const validateSession = (data: unknown) => {
  return SessionSchema.parse(data);
};
```

---

## 🚨 3. ERROR BOUNDARY MELHORADO

### Arquivo: `src/components/ErrorBoundary.tsx` (Atualizado)

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  eventId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log para Sentry
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });

    this.setState({
      error,
      errorInfo,
      eventId
    });

    // Callback customizado
    this.props.onError?.(error, errorInfo);

    // Log local para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught an Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReportFeedback = () => {
    if (this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback customizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI padrão de erro
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-500">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Oops! Algo deu errado
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Recarregar Página
              </button>

              {this.state.eventId && (
                <button
                  onClick={this.handleReportFeedback}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reportar Problema
                </button>
              )}

              <button
                onClick={() => window.history.back()}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC para capturar erros de hooks e componentes funcionais
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Hook para capturar erros em componentes funcionais
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: any) => {
    Sentry.captureException(error, {
      extra: errorInfo
    });

    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by useErrorHandler:', error, errorInfo);
    }
  };
};

export default ErrorBoundary;
```

---

## 🔧 4. HOOK useData REFATORADO

### Arquivo: `src/hooks/usePatients.ts` (Novo)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { Patient, PatientSchema } from '../schemas';
import {
  validateAndMigrateLocalStorageData,
  saveValidatedData,
} from '../utils/dataValidator';
import { useAuth } from './useAuth';
import { useErrorHandler } from '../components/ErrorBoundary';

const STORAGE_KEY = 'fisioflow_patients';

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const handleError = useErrorHandler();

  // Carregar pacientes do localStorage
  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rawData = localStorage.getItem(STORAGE_KEY);
      if (!rawData) {
        setPatients([]);
        return;
      }

      const data = validateAndMigrateLocalStorageData(rawData);

      // Filtrar por tenant se usuário logado
      const filteredPatients = user?.tenantId
        ? data.filter((p: any) => p.tenantId === user.tenantId)
        : data;

      // Validar cada paciente
      const validatedPatients = filteredPatients
        .map((p: any) => {
          try {
            return PatientSchema.parse(p);
          } catch (validationError) {
            console.warn('Paciente inválido ignorado:', p, validationError);
            return null;
          }
        })
        .filter(Boolean) as Patient[];

      setPatients(validatedPatients);
    } catch (err) {
      const errorMessage = 'Erro ao carregar pacientes';
      setError(errorMessage);
      handleError(err as Error, { context: 'loadPatients' });
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, handleError]);

  // Salvar pacientes
  const savePatients = useCallback(
    async (newPatients: Patient[]) => {
      try {
        // Validar todos os pacientes antes de salvar
        const validatedPatients = newPatients.map((p) =>
          PatientSchema.parse(p)
        );

        saveValidatedData(STORAGE_KEY, validatedPatients);
        setPatients(validatedPatients);
      } catch (err) {
        const errorMessage = 'Erro ao salvar pacientes';
        setError(errorMessage);
        handleError(err as Error, { context: 'savePatients' });
        throw err;
      }
    },
    [handleError]
  );

  // Adicionar paciente
  const addPatient = useCallback(
    async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newPatient: Patient = {
          ...patientData,
          id: crypto.randomUUID(),
          tenantId: user?.tenantId || 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedPatients = [...patients, newPatient];
        await savePatients(updatedPatients);

        return newPatient;
      } catch (err) {
        handleError(err as Error, { context: 'addPatient', patientData });
        throw err;
      }
    },
    [patients, user?.tenantId, savePatients, handleError]
  );

  // Atualizar paciente
  const updatePatient = useCallback(
    async (id: string, updates: Partial<Patient>) => {
      try {
        const updatedPatients = patients.map((p) =>
          p.id === id
            ? { ...p, ...updates, updatedAt: new Date().toISOString() }
            : p
        );

        await savePatients(updatedPatients);
      } catch (err) {
        handleError(err as Error, { context: 'updatePatient', id, updates });
        throw err;
      }
    },
    [patients, savePatients, handleError]
  );

  // Remover paciente
  const removePatient = useCallback(
    async (id: string) => {
      try {
        const updatedPatients = patients.filter((p) => p.id !== id);
        await savePatients(updatedPatients);
      } catch (err) {
        handleError(err as Error, { context: 'removePatient', id });
        throw err;
      }
    },
    [patients, savePatients, handleError]
  );

  // Buscar pacientes
  const searchPatients = useCallback(
    (query: string) => {
      if (!query.trim()) return patients;

      const lowercaseQuery = query.toLowerCase();
      return patients.filter(
        (p) =>
          p.name.toLowerCase().includes(lowercaseQuery) ||
          p.email?.toLowerCase().includes(lowercaseQuery) ||
          p.phone.includes(query) ||
          p.cpf.includes(query)
      );
    },
    [patients]
  );

  // Carregar dados na inicialização
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  return {
    patients,
    loading,
    error,
    addPatient,
    updatePatient,
    removePatient,
    searchPatients,
    refreshPatients: loadPatients,
  };
};
```

---

## 💰 5. SISTEMA FREEMIUM COM ENFORCEMENT

### Arquivo: `src/hooks/useSubscription.ts` (Novo)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

type SubscriptionTier = 'free' | 'premium' | 'enterprise';

interface SubscriptionLimits {
  maxPatients: number;
  maxSessions: number;
  maxUsers: number;
  aiReportsPerMonth: number;
  hasAdvancedAnalytics: boolean;
  hasCustomReports: boolean;
  hasPrioritySupport: boolean;
  hasApiAccess: boolean;
}

const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxPatients: 10,
    maxSessions: 50,
    maxUsers: 1,
    aiReportsPerMonth: 5,
    hasAdvancedAnalytics: false,
    hasCustomReports: false,
    hasPrioritySupport: false,
    hasApiAccess: false
  },
  premium: {
    maxPatients: 100,
    maxSessions: 1000,
    maxUsers: 5,
    aiReportsPerMonth: 100,
    hasAdvancedAnalytics: true,
    hasCustomReports: true,
    hasPrioritySupport: true,
    hasApiAccess: false
  },
  enterprise: {
    maxPatients: -1, // Ilimitado
    maxSessions: -1,
    maxUsers: -1,
    aiReportsPerMonth: -1,
    hasAdvancedAnalytics: true,
    hasCustomReports: true,
    hasPrioritySupport: true,
    hasApiAccess: true
  }
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [currentUsage, setCurrentUsage] = useState({
    patients: 0,
    sessions: 0,
    users: 0,
    aiReportsThisMonth: 0
  });

  const tier: SubscriptionTier = user?.tenant?.plan || 'free';
  const limits = SUBSCRIPTION_LIMITS[tier];

  // Verificar se uma feature está disponível
  const hasFeature = useCallback((feature: keyof SubscriptionLimits) => {
    return limits[feature] === true;
  }, [limits]);

  // Verificar se um limite foi atingido
  const isLimitReached = useCallback((resource: keyof typeof currentUsage) => {
    const limit = limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof SubscriptionLimits] as number;
    if (limit === -1) return false; // Ilimitado
    return currentUsage[resource] >= limit;
  }, [limits, currentUsage]);

  // Verificar se pode adicionar mais recursos
  const canAdd = useCallback((resource: keyof typeof currentUsage, quantity = 1) => {
    const limit = limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof SubscriptionLimits] as number;
    if (limit === -1) return true; // Ilimitado
    return (currentUsage[resource] + quantity) <= limit;
  }, [limits, currentUsage]);

  // Obter porcentagem de uso
  const getUsagePercentage = useCallback((resource: keyof typeof currentUsage) => {
    const limit = limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof SubscriptionLimits] as number;
    if (limit === -1) return 0; // Ilimitado
    return Math.min((currentUsage[resource] / limit) * 100, 100);
  }, [limits, currentUsage]);

  // Atualizar uso atual
  const updateUsage = useCallback(() => {
    // Aqui você buscaria os dados reais do localStorage ou API
    const patients = JSON.parse(localStorage.getItem('fisioflow_patients') || '[]');
    const sessions = JSON.parse(localStorage.getItem('fisioflow_sessions') || '[]');
    const users = JSON.parse(localStorage.getItem('fisioflow_users') || '[]');

    // Contar relatórios AI do mês atual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const aiReports = JSON.parse(localStorage.getItem('fisioflow_ai_reports') || '[]');
    const aiReportsThisMonth = aiReports.filter((report: any) => {
      const reportDate = new Date(report.createdAt);
      return reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear;
    }).length;

    setCurrentUsage({
      patients: patients.filter((p: any) => p.tenantId === user?.tenantId).length,
      sessions: sessions.filter((s: any) => s.tenantId === user?.tenantId).length,
      users: users.filter((u: any) => u.tenantId === user?.tenantId).length,
      aiReportsThisMonth
    });
  }, [user?.tenantId]);

  // Componente de upgrade
  const UpgradePrompt = ({ feature, children }: { feature: string; children: React.ReactNode }) => {
    if (tier !== 'free') return <>{children}</>;

    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
          <div className="text-center p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Feature Premium
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {feature} está disponível apenas no plano Premium
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Fazer Upgrade
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    updateUsage();
  }, [updateUsage]);

  return {
    tier,
    limits,
    currentUsage,
    hasFeature,
    isLimitReached,
    canAdd,
    getUsagePercentage,
    updateUsage,
    UpgradePrompt
  };
};
```

---

## 📱 6. PWA OTIMIZADA PARA iOS

### Arquivo: `public/manifest.json` (Atualizado)

```json
{
  "name": "FisioFlow - Gestão de Fisioterapia",
  "short_name": "FisioFlow",
  "description": "Sistema completo de gestão para clínicas de fisioterapia",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1e40af",
  "background_color": "#ffffff",
  "scope": "/",
  "lang": "pt-BR",
  "categories": ["medical", "productivity", "business"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "Novo Paciente",
      "short_name": "Paciente",
      "description": "Cadastrar novo paciente",
      "url": "/patients/new",
      "icons": [{ "src": "/icons/shortcut-patient.png", "sizes": "96x96" }]
    },
    {
      "name": "Agenda",
      "short_name": "Agenda",
      "description": "Ver agenda do dia",
      "url": "/schedule",
      "icons": [{ "src": "/icons/shortcut-schedule.png", "sizes": "96x96" }]
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop-1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "375x667",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

### Arquivo: `src/serviceWorker.ts` (Novo)

```typescript
// Service Worker para cache offline e push notifications

const CACHE_NAME = 'fisioflow-v2.0';
const STATIC_CACHE = 'fisioflow-static-v2.0';
const DYNAMIC_CACHE = 'fisioflow-dynamic-v2.0';

// Arquivos para cache estático
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Instalar service worker
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        return (self as any).skipWaiting();
      })
  );
});

// Ativar service worker
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Removing old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return (self as any).clients.claim();
      })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event: any) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estratégia Cache First para arquivos estáticos
  if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Estratégia Network First para API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback para cache se offline
          return caches.match(request).then((response) => {
            if (response) {
              return response;
            }
            // Retornar resposta offline padrão
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: 'Você está offline',
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // Estratégia Stale While Revalidate para outras requisições
  event.respondWith(
    caches.match(request).then((response) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, networkResponse.clone());
        });
        return networkResponse;
      });

      return response || fetchPromise;
    })
  );
});

// Push notifications
self.addEventListener('push', (event: any) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do FisioFlow',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir App',
        icon: '/icons/checkmark.png',
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/xmark.png',
      },
    ],
  };

  event.waitUntil(
    (self as any).registration.showNotification('FisioFlow', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil((self as any).clients.openWindow('/'));
  }
});

// Background sync
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

const doBackgroundSync = async () => {
  // Sincronizar dados pendentes quando voltar online
  const pendingData = await getPendingData();

  for (const data of pendingData) {
    try {
      await syncDataToServer(data);
      await removePendingData(data.id);
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    }
  }
};

const getPendingData = async () => {
  // Implementar lógica para obter dados pendentes
  return [];
};

const syncDataToServer = async (data: any) => {
  // Implementar lógica para enviar dados para o servidor
};

const removePendingData = async (id: string) => {
  // Implementar lógica para remover dados pendentes
};
```

---

## 🚀 PRÓXIMOS PASSOS

1. **Implementar as correções críticas** (Sprint 1)
2. **Configurar Sentry** para monitoramento de erros
3. **Adicionar testes unitários** para os novos hooks
4. **Configurar CI/CD** para deploy automático
5. **Implementar sistema de billing** para o freemium

**Estimativa:** 2-3 semanas para implementação completa das correções críticas.
