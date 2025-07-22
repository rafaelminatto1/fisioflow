# 🗄️ Supabase Migration - Multi-Tenant FisioFlow

## 🎯 Estratégia de Migração

Transição de localStorage para Supabase PostgreSQL com:
- **Row Level Security (RLS)** para isolamento de dados
- **Multi-tenancy** por clínica
- **Auth integrado** com roles e permissões
- **Storage** para documentos e imagens
- **Real-time** para colaboração

## 🏗️ Arquitetura Database

### Schema Multi-Tenant
```sql
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schema principal
CREATE SCHEMA IF NOT EXISTS fisioflow;

-- Tabela de Tenants (Clínicas)
CREATE TABLE fisioflow.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL friendly
  subscription_plan VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
  subscription_status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired
  max_patients INTEGER DEFAULT 10,
  max_physiotherapists INTEGER DEFAULT 1,
  max_storage_mb INTEGER DEFAULT 100,
  
  -- Configurações
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}', -- cores, logo, etc.
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Tabela de Usuários (extende auth.users)
CREATE TABLE fisioflow.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES fisioflow.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Informações pessoais
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  
  -- Role e permissões
  role VARCHAR(20) NOT NULL DEFAULT 'physiotherapist', -- admin, physiotherapist, intern, patient
  permissions JSONB DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pacientes
CREATE TABLE fisioflow.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES fisioflow.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Informações básicas
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  cpf VARCHAR(14) UNIQUE,
  birth_date DATE,
  gender VARCHAR(10),
  
  -- Endereço
  address JSONB DEFAULT '{}',
  
  -- Informações médicas
  medical_history TEXT,
  allergies TEXT,
  medications TEXT,
  emergency_contact TEXT,
  insurance TEXT,
  referring_physician TEXT,
  diagnosis TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, discharged
  
  -- Relacionamentos
  assigned_physiotherapist_id UUID REFERENCES fisioflow.user_profiles(id),
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES fisioflow.user_profiles(id),
  updated_by UUID REFERENCES fisioflow.user_profiles(id)
);

-- Tabela de Sessões/Consultas
CREATE TABLE fisioflow.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES fisioflow.tenants(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES fisioflow.patients(id) ON DELETE CASCADE NOT NULL,
  physiotherapist_id UUID REFERENCES fisioflow.user_profiles(id) ON DELETE SET NULL,
  
  -- Informações da sessão
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  
  -- Notas e observações
  notes TEXT,
  objectives TEXT,
  exercises_performed JSONB DEFAULT '[]',
  next_session_plan TEXT,
  
  -- SOAP Notes
  soap_subjective TEXT,
  soap_objective TEXT,
  soap_assessment TEXT,
  soap_plan TEXT,
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES fisioflow.user_profiles(id),
  updated_by UUID REFERENCES fisioflow.user_profiles(id)
);

-- Tabela de Exercícios
CREATE TABLE fisioflow.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES fisioflow.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Informações do exercício
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  category VARCHAR(100),
  muscle_groups JSONB DEFAULT '[]',
  equipment_needed JSONB DEFAULT '[]',
  
  -- Mídia
  image_url TEXT,
  video_url TEXT,
  
  -- Dificuldade e parâmetros
  difficulty_level INTEGER DEFAULT 1, -- 1-5
  default_sets INTEGER DEFAULT 3,
  default_reps INTEGER DEFAULT 10,
  default_duration_seconds INTEGER,
  
  -- Status
  is_public BOOLEAN DEFAULT false, -- exercícios compartilhados entre tenants
  is_active BOOLEAN DEFAULT true,
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES fisioflow.user_profiles(id)
);

-- Tabela de Planos de Tratamento
CREATE TABLE fisioflow.treatment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES fisioflow.tenants(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES fisioflow.patients(id) ON DELETE CASCADE NOT NULL,
  
  -- Informações do plano
  name VARCHAR(255) NOT NULL,
  description TEXT,
  goals TEXT,
  duration_weeks INTEGER,
  frequency_per_week INTEGER DEFAULT 2,
  
  -- Exercícios do plano
  exercises JSONB DEFAULT '[]', -- Array com referências e parâmetros
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, completed, paused, cancelled
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Progress tracking
  progress_notes TEXT,
  completion_percentage INTEGER DEFAULT 0,
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES fisioflow.user_profiles(id),
  updated_by UUID REFERENCES fisioflow.user_profiles(id)
);

-- Tabela de Documentos
CREATE TABLE fisioflow.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES fisioflow.tenants(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES fisioflow.patients(id) ON DELETE CASCADE,
  
  -- Informações do documento
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_type VARCHAR(50) NOT NULL,
  file_size_bytes INTEGER,
  
  -- Categorização
  category VARCHAR(100), -- medical_report, xray, prescription, etc.
  tags JSONB DEFAULT '[]',
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  -- Status
  is_confidential BOOLEAN DEFAULT false,
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES fisioflow.user_profiles(id)
);

-- Tabela de Tarefas/Tasks (Kanban)
CREATE TABLE fisioflow.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES fisioflow.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Informações da task
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo', -- todo, doing, done
  priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high, urgent
  
  -- Relacionamentos
  assigned_to UUID REFERENCES fisioflow.user_profiles(id),
  patient_id UUID REFERENCES fisioflow.patients(id), -- opcional
  
  -- Datas
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES fisioflow.user_profiles(id),
  updated_by UUID REFERENCES fisioflow.user_profiles(id)
);

-- Tabela de Transações Financeiras
CREATE TABLE fisioflow.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES fisioflow.tenants(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES fisioflow.patients(id) ON DELETE SET NULL,
  
  -- Informações da transação
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- income, expense
  category VARCHAR(100),
  
  -- Status de pagamento
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, cancelled
  payment_method VARCHAR(50),
  payment_date DATE,
  due_date DATE,
  
  -- Referências
  invoice_number VARCHAR(100),
  session_id UUID REFERENCES fisioflow.sessions(id),
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES fisioflow.user_profiles(id)
);
```

## 🔐 Row Level Security (RLS)

### Políticas de Segurança
```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE fisioflow.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisioflow.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisioflow.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisioflow.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisioflow.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisioflow.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisioflow.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisioflow.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisioflow.transactions ENABLE ROW LEVEL SECURITY;

-- Função para obter tenant_id do usuário atual
CREATE OR REPLACE FUNCTION fisioflow.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM fisioflow.user_profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para user_profiles
CREATE POLICY "Users can view own tenant profiles" ON fisioflow.user_profiles
  FOR SELECT USING (tenant_id = fisioflow.get_current_tenant_id());

CREATE POLICY "Users can update own profile" ON fisioflow.user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Políticas para patients
CREATE POLICY "Users can view own tenant patients" ON fisioflow.patients
  FOR SELECT USING (tenant_id = fisioflow.get_current_tenant_id());

CREATE POLICY "Users can insert patients in own tenant" ON fisioflow.patients
  FOR INSERT WITH CHECK (tenant_id = fisioflow.get_current_tenant_id());

CREATE POLICY "Users can update patients in own tenant" ON fisioflow.patients
  FOR UPDATE USING (tenant_id = fisioflow.get_current_tenant_id());

CREATE POLICY "Admins can delete patients in own tenant" ON fisioflow.patients
  FOR DELETE USING (
    tenant_id = fisioflow.get_current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM fisioflow.user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'physiotherapist')
    )
  );

-- Políticas similares para outras tabelas...
```

## ⚡ Service de Migração de Dados

### Supabase Client Setup
```typescript
// services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Configuração do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persiste auth no AsyncStorage (mobile) ou localStorage (web)
    storage: Platform.OS === 'web' ? localStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  
  // Real-time configurações
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Tipos do database
export type Database = {
  fisioflow: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          subscription_plan: 'free' | 'pro' | 'enterprise';
          subscription_status: string;
          max_patients: number;
          max_physiotherapists: number;
          settings: any;
          branding: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['fisioflow']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['fisioflow']['Tables']['tenants']['Insert']>;
      };
      // ... outros tipos
    };
  };
};
```

### Migration Service
```typescript
// services/migrationService.ts
import { supabase } from './supabase';
import { Patient, Task, Transaction } from '../types';

class MigrationService {
  private migrationInProgress = false;
  
  async migrateFromLocalStorage(): Promise<{
    success: boolean;
    migrated: {
      patients: number;
      tasks: number;
      transactions: number;
    };
    errors: string[];
  }> {
    if (this.migrationInProgress) {
      throw new Error('Migração já em andamento');
    }
    
    this.migrationInProgress = true;
    const errors: string[] = [];
    const migrated = { patients: 0, tasks: 0, transactions: 0 };
    
    try {
      console.log('🔄 Iniciando migração de dados locais...');
      
      // 1. Obter dados do localStorage/AsyncStorage
      const localData = await this.getLocalData();
      
      // 2. Obter tenant atual
      const tenantId = await this.getCurrentTenantId();
      if (!tenantId) {
        throw new Error('Tenant não encontrado');
      }
      
      // 3. Migrar pacientes
      if (localData.patients?.length > 0) {
        try {
          migrated.patients = await this.migratePatients(localData.patients, tenantId);
          console.log(`✅ ${migrated.patients} pacientes migrados`);
        } catch (error) {
          errors.push(`Erro ao migrar pacientes: ${error}`);
        }
      }
      
      // 4. Migrar tasks
      if (localData.tasks?.length > 0) {
        try {
          migrated.tasks = await this.migrateTasks(localData.tasks, tenantId);
          console.log(`✅ ${migrated.tasks} tasks migrados`);
        } catch (error) {
          errors.push(`Erro ao migrar tasks: ${error}`);
        }
      }
      
      // 5. Migrar transações
      if (localData.transactions?.length > 0) {
        try {
          migrated.transactions = await this.migrateTransactions(localData.transactions, tenantId);
          console.log(`✅ ${migrated.transactions} transações migradas`);
        } catch (error) {
          errors.push(`Erro ao migrar transações: ${error}`);
        }
      }
      
      // 6. Limpar localStorage após migração bem-sucedida
      if (errors.length === 0) {
        await this.clearLocalData();
        console.log('🗑️ Dados locais limpos após migração');
      }
      
      return {
        success: errors.length === 0,
        migrated,
        errors,
      };
      
    } catch (error) {
      console.error('❌ Erro na migração:', error);
      errors.push(`Erro geral: ${error}`);
      
      return {
        success: false,
        migrated,
        errors,
      };
    } finally {
      this.migrationInProgress = false;
    }
  }
  
  private async getLocalData(): Promise<{
    patients?: Patient[];
    tasks?: Task[];
    transactions?: Transaction[];
  }> {
    const storageAdapter = await import('./storageAdapter');
    
    const [patients, tasks, transactions] = await Promise.all([
      storageAdapter.getItem('patients').then(data => data ? JSON.parse(data) : []),
      storageAdapter.getItem('tasks').then(data => data ? JSON.parse(data) : []),
      storageAdapter.getItem('transactions').then(data => data ? JSON.parse(data) : []),
    ]);
    
    return { patients, tasks, transactions };
  }
  
  private async getCurrentTenantId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    return profile?.tenant_id || null;
  }
  
  private async migratePatients(patients: Patient[], tenantId: string): Promise<number> {
    const patientsToInsert = patients.map(patient => ({
      ...patient,
      tenant_id: tenantId,
      // Mapear campos conforme necessário
    }));
    
    const { data, error } = await supabase
      .from('patients')
      .upsert(patientsToInsert, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) throw error;
    return patientsToInsert.length;
  }
  
  private async migrateTasks(tasks: Task[], tenantId: string): Promise<number> {
    const tasksToInsert = tasks.map(task => ({
      ...task,
      tenant_id: tenantId,
    }));
    
    const { data, error } = await supabase
      .from('tasks')
      .upsert(tasksToInsert, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) throw error;
    return tasksToInsert.length;
  }
  
  private async migrateTransactions(transactions: Transaction[], tenantId: string): Promise<number> {
    const transactionsToInsert = transactions.map(transaction => ({
      ...transaction,
      tenant_id: tenantId,
    }));
    
    const { data, error } = await supabase
      .from('transactions')
      .upsert(transactionsToInsert, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) throw error;
    return transactionsToInsert.length;
  }
  
  private async clearLocalData(): Promise<void> {
    const storageAdapter = await import('./storageAdapter');
    
    await Promise.all([
      storageAdapter.removeItem('patients'),
      storageAdapter.removeItem('tasks'),
      storageAdapter.removeItem('transactions'),
    ]);
  }
}

export const migrationService = new MigrationService();
```

## 🎣 Hooks Supabase

### useSupabaseData Hook
```typescript
// hooks/useSupabaseData.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useSupabaseData = <T>(
  table: string,
  options: {
    select?: string;
    filter?: (query: any) => any;
    realtime?: boolean;
    orderBy?: { column: string; ascending?: boolean };
  } = {}
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const {
    select = '*',
    filter,
    realtime = false,
    orderBy,
  } = options;
  
  // Load initial data
  const loadData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from(table)
        .select(select);
      
      // Apply custom filter if provided
      if (filter) {
        query = filter(query);
      }
      
      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setData(data || []);
      
    } catch (error: any) {
      console.error(`Erro ao carregar ${table}:`, error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user, table, select, filter, orderBy]);
  
  // Setup realtime subscription
  useEffect(() => {
    if (!realtime || !user) return;
    
    const channel: RealtimeChannel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'fisioflow',
          table: table,
        },
        (payload) => {
          console.log(`📡 ${table} change:`, payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setData(prev => [...prev, payload.new as T]);
              break;
              
            case 'UPDATE':
              setData(prev => 
                prev.map(item => 
                  (item as any).id === (payload.new as any).id 
                    ? { ...item, ...payload.new }
                    : item
                )
              );
              break;
              
            case 'DELETE':
              setData(prev => 
                prev.filter(item => (item as any).id !== (payload.old as any).id)
              );
              break;
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtime, user, table]);
  
  // Load data on mount and user change
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // CRUD operations
  const insert = useCallback(async (newItem: Omit<T, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert([newItem])
        .select()
        .single();
      
      if (error) throw error;
      
      if (!realtime) {
        setData(prev => [...prev, data]);
      }
      
      return data;
    } catch (error: any) {
      console.error(`Erro ao inserir em ${table}:`, error);
      throw error;
    }
  }, [table, realtime]);
  
  const update = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      if (!realtime) {
        setData(prev => 
          prev.map(item => 
            (item as any).id === id 
              ? { ...item, ...data }
              : item
          )
        );
      }
      
      return data;
    } catch (error: any) {
      console.error(`Erro ao atualizar ${table}:`, error);
      throw error;
    }
  }, [table, realtime]);
  
  const remove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      if (!realtime) {
        setData(prev => prev.filter(item => (item as any).id !== id));
      }
      
    } catch (error: any) {
      console.error(`Erro ao deletar de ${table}:`, error);
      throw error;
    }
  }, [table, realtime]);
  
  return {
    data,
    loading,
    error,
    refresh: loadData,
    insert,
    update,
    remove,
  };
};
```

### usePatients com Supabase
```typescript
// hooks/usePatients.ts (versão Supabase)
import { Patient } from '../types';
import { useSupabaseData } from './useSupabaseData';

export const usePatients = () => {
  const {
    data: patients,
    loading,
    error,
    refresh,
    insert,
    update,
    remove,
  } = useSupabaseData<Patient>('patients', {
    realtime: true,
    orderBy: { column: 'name', ascending: true },
  });
  
  const addPatient = async (patientData: Omit<Patient, 'id'>) => {
    return await insert(patientData);
  };
  
  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    return await update(id, updates);
  };
  
  const deletePatient = async (id: string) => {
    await remove(id);
  };
  
  const getPatientById = (id: string): Patient | undefined => {
    return patients.find(patient => patient.id === id);
  };
  
  const searchPatients = (query: string): Patient[] => {
    if (!query) return patients;
    
    return patients.filter(patient =>
      patient.name.toLowerCase().includes(query.toLowerCase()) ||
      patient.email?.toLowerCase().includes(query.toLowerCase()) ||
      patient.cpf?.includes(query)
    );
  };
  
  return {
    patients,
    loading,
    error,
    refresh,
    addPatient,
    updatePatient,
    deletePatient,
    getPatientById,
    searchPatients,
  };
};
```

## 🔐 Auth Integration

### useAuth com Supabase
```typescript
// hooks/useAuth.ts (versão Supabase)
import { useState, useEffect, createContext, useContext } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface UserProfile {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'physiotherapist' | 'intern' | 'patient';
  avatar_url?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  };
  
  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    
    if (error) throw error;
    
    // Create user profile
    if (data.user) {
      await supabase.from('user_profiles').insert([{
        id: data.user.id,
        tenant_id: userData.tenant_id,
        full_name: userData.full_name,
        email,
        role: userData.role || 'physiotherapist',
      }]);
    }
  };
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('Usuário não autenticado');
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    setProfile(data);
  };
  
  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
```

## 📊 Migration Timeline

### Fase 1: Setup Database (1-2 semanas)
- [ ] Configurar projeto Supabase
- [ ] Criar schema multi-tenant
- [ ] Implementar RLS policies
- [ ] Setup Supabase Storage
- [ ] Configurar auth providers

### Fase 2: Migration Service (1 semana)
- [ ] Implementar migration service
- [ ] Testes de migração com dados de exemplo
- [ ] Validação de integridade dos dados
- [ ] Rollback procedures

### Fase 3: Hooks Migration (1-2 semanas)
- [ ] Refatorar usePatients para Supabase
- [ ] Refatorar useAuth para Supabase Auth
- [ ] Implementar real-time subscriptions
- [ ] Otimizar performance com cache

### Fase 4: Testing & Production (1 semana)
- [ ] Testes end-to-end
- [ ] Performance benchmarks
- [ ] Deploy para staging
- [ ] Migration em produção

---

**Total estimado**: 4-6 semanas para migração completa
**Benefícios**: Escalabilidade, multi-tenancy, real-time, segurança enterprise