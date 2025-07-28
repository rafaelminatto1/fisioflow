import { supabase } from '../../services/supabase';
import { ApiResponse, ApiError } from '../types';

// Cliente API principal baseado no Supabase
export const api = {
  // Métodos de autenticação
  auth: {
    signIn: async (email: string, password: string) => {
      const credentials = { email, password };
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    signUp: async (email: string, password: string, userData?: any) => {
      const credentials = { email, password, options: { data: userData } };
      const { data, error } = await supabase.auth.signUp(credentials);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw new Error(error.message);
      }
    },
    
    getCurrentUser: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return user;
    },
  },
  
  // Métodos para usuários
  users: {
    getProfile: async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    updateProfile: async (userId: string, updates: any) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
  },
  
  // Métodos para pacientes
  patients: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*');
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    getById: async (patientId: string) => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    create: async (patientData: any) => {
      const { data, error } = await supabase
        .from('patients')
        .insert(patientData)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    update: async (patientId: string, updates: any) => {
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    delete: async (patientId: string) => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);
      
      if (error) {
        throw new Error(error.message);
      }
    },
  },
  
  // Métodos para agendamentos
  appointments: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*');
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    getById: async (appointmentId: string) => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    create: async (appointmentData: any) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    update: async (appointmentId: string, updates: any) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    
    delete: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);
      
      if (error) {
        throw new Error(error.message);
      }
    },
  },
};

export default api;