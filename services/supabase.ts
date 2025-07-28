import { createClient } from '@supabase/supabase-js';

import { User, Patient, Appointment, Exercise, Task } from '../types';

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos específicos do Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: string;
          avatar_url?: string;
          tenant_id?: string;
          specialization?: string;
          phone?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      patients: {
        Row: {
          id: string;
          name: string;
          email?: string;
          phone?: string;
          date_of_birth?: string;
          gender?: string;
          address?: string;
          medical_history?: string;
          current_condition?: string;
          status: string;
          tenant_id: string;
          assigned_therapist_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          therapist_id: string;
          date: string;
          time: string;
          duration: number;
          type: string;
          status: string;
          notes?: string;
          tenant_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          description: string;
          instructions: string;
          category: string;
          difficulty_level: string;
          duration?: number;
          repetitions?: number;
          sets?: number;
          image_url?: string;
          video_url?: string;
          tenant_id: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exercises']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['exercises']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description?: string;
          status: string;
          priority: string;
          assigned_to?: string;
          patient_id?: string;
          due_date?: string;
          tenant_id: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
    };
  };
}

// Serviços de autenticação
export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { user: data.user, session: data.session, error };
  },

  async signUp(email: string, password: string, userData: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { user: data.user, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  },
};

// Serviços de usuários
export const userService = {
  async getUsers(tenantId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId);
    return { data, error };
  },

  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createUser(user: Database['public']['Tables']['users']['Insert']) {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();
    return { data, error };
  },

  async updateUser(id: string, updates: Database['public']['Tables']['users']['Update']) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteUser(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// Serviços de pacientes
export const patientService = {
  async getPatients(tenantId: string) {
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        assigned_therapist:users(id, name, email)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getPatientById(id: string) {
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        assigned_therapist:users(id, name, email)
      `)
      .eq('id', id)
      .single();
    return { data, error };
  },

  async createPatient(patient: Database['public']['Tables']['patients']['Insert']) {
    const { data, error } = await supabase
      .from('patients')
      .insert(patient)
      .select()
      .single();
    return { data, error };
  },

  async updatePatient(id: string, updates: Database['public']['Tables']['patients']['Update']) {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deletePatient(id: string) {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
    return { error };
  },

  async searchPatients(tenantId: string, query: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,current_condition.ilike.%${query}%`);
    return { data, error };
  },
};

// Serviços de agendamentos
export const appointmentService = {
  async getAppointments(tenantId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name, email, phone),
        therapist:users(id, name, email)
      `)
      .eq('tenant_id', tenantId);

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query.order('date', { ascending: true });
    return { data, error };
  },

  async createAppointment(appointment: Database['public']['Tables']['appointments']['Insert']) {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();
    return { data, error };
  },

  async updateAppointment(id: string, updates: Database['public']['Tables']['appointments']['Update']) {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteAppointment(id: string) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    return { error };
  },

  async getPatientAppointments(patientId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        therapist:users(id, name, email)
      `)
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    return { data, error };
  },
};

// Serviços de exercícios
export const exerciseService = {
  async getExercises(tenantId: string, category?: string) {
    let query = supabase
      .from('exercises')
      .select(`
        *,
        created_by_user:users(id, name)
      `)
      .eq('tenant_id', tenantId);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  async createExercise(exercise: Database['public']['Tables']['exercises']['Insert']) {
    const { data, error } = await supabase
      .from('exercises')
      .insert(exercise)
      .select()
      .single();
    return { data, error };
  },

  async updateExercise(id: string, updates: Database['public']['Tables']['exercises']['Update']) {
    const { data, error } = await supabase
      .from('exercises')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteExercise(id: string) {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id);
    return { error };
  },

  async searchExercises(tenantId: string, query: string) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);
    return { data, error };
  },
};

// Serviços de tarefas/kanban
export const taskService = {
  async getTasks(tenantId: string, patientId?: string) {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users(id, name),
        patient:patients(id, name)
      `)
      .eq('tenant_id', tenantId);

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  async createTask(task: Database['public']['Tables']['tasks']['Insert']) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();
    return { data, error };
  },

  async updateTask(id: string, updates: Database['public']['Tables']['tasks']['Update']) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteTask(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// Utilitários
export const storageService = {
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    return { data, error };
  },

  async getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    return { error };
  },
};

// Subscriptions em tempo real
export const realtimeService = {
  subscribeToPatients(tenantId: string, callback: (payload: any) => void) {
    return supabase
      .channel('patients')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'patients',
          filter: `tenant_id=eq.${tenantId}`
        }, 
        callback
      )
      .subscribe();
  },

  subscribeToAppointments(tenantId: string, callback: (payload: any) => void) {
    return supabase
      .channel('appointments')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments',
          filter: `tenant_id=eq.${tenantId}`
        }, 
        callback
      )
      .subscribe();
  },

  subscribeToTasks(tenantId: string, callback: (payload: any) => void) {
    return supabase
      .channel('tasks')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `tenant_id=eq.${tenantId}`
        }, 
        callback
      )
      .subscribe();
  },
};