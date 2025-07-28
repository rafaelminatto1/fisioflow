/**
 * Contexto para configurações globais da aplicação
 * Gerencia configurações que não precisam estar no React Query
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { useOptimizedState } from '../hooks/useOptimizedComponent';

// === INTERFACES ===
interface AppConfig {
  // UI/UX
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en-US' | 'es-ES';
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  
  // Funcionalidades
  enableNotifications: boolean;
  enableSounds: boolean;
  autoLogout: number; // em minutos
  
  // Performance
  enableAnimations: boolean;
  lazyLoadImages: boolean;
  cacheTimeout: number; // em minutos
  
  // Privacidade
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  
  // Layout
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showTooltips: boolean;
}

interface NotificationSettings {
  appointments: boolean;
  reminders: boolean;
  messages: boolean;
  systemUpdates: boolean;
  
  // Canais
  inApp: boolean;
  email: boolean;
  push: boolean;
  
  // Timing
  reminderTime: number; // horas antes
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string; // HH:mm
}

interface UserPreferences {
  // Dashboard
  dashboardLayout: 'grid' | 'list' | 'cards';
  defaultView: string;
  pinnedWidgets: string[];
  
  // Calendário
  calendarView: 'month' | 'week' | 'day';
  workingHours: {
    start: string;
    end: string;
  };
  
  // Listas
  itemsPerPage: number;
  sortPreferences: Record<string, 'asc' | 'desc'>;
  
  // Formulários
  autoSave: boolean;
  autoComplete: boolean;
  
  // Atalhos
  keyboardShortcuts: boolean;
  customShortcuts: Record<string, string>;
}

interface AppConfigContextType {
  // Estados
  config: AppConfig;
  notifications: NotificationSettings;
  preferences: UserPreferences;
  isLoading: boolean;
  
  // Ações
  updateConfig: (updates: Partial<AppConfig>) => void;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetToDefaults: () => void;
  
  // Utilitários
  exportSettings: () => string;
  importSettings: (settings: string) => boolean;
  
  // Status
  hasUnsavedChanges: boolean;
  saveSettings: () => Promise<void>;
}

// === VALORES PADRÃO ===
const DEFAULT_CONFIG: AppConfig = {
  theme: 'system',
  language: 'pt-BR',
  fontSize: 'medium',
  reducedMotion: false,
  enableNotifications: true,
  enableSounds: true,
  autoLogout: 480, // 8 horas
  enableAnimations: true,
  lazyLoadImages: true,
  cacheTimeout: 30,
  enableAnalytics: false,
  enableCrashReporting: true,
  sidebarCollapsed: false,
  compactMode: false,
  showTooltips: true,
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  appointments: true,
  reminders: true,
  messages: true,
  systemUpdates: false,
  inApp: true,
  email: true,
  push: false,
  reminderTime: 1, // 1 hora antes
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

const DEFAULT_PREFERENCES: UserPreferences = {
  dashboardLayout: 'grid',
  defaultView: 'dashboard',
  pinnedWidgets: ['appointments-today', 'patients-summary'],
  calendarView: 'week',
  workingHours: {
    start: '08:00',
    end: '18:00',
  },
  itemsPerPage: 20,
  sortPreferences: {},
  autoSave: true,
  autoComplete: true,
  keyboardShortcuts: true,
  customShortcuts: {},
};

// === CONTEXTO ===
const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

// === PROVIDER ===
export const AppConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useOptimizedState<AppConfig>(DEFAULT_CONFIG);
  const [notifications, setNotifications] = useOptimizedState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [preferences, setPreferences] = useOptimizedState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // === CARREGAR CONFIGURAÇÕES ===
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        // Carregar do localStorage
        const savedConfig = localStorage.getItem('fisioflow_app_config');
        const savedNotifications = localStorage.getItem('fisioflow_notifications');
        const savedPreferences = localStorage.getItem('fisioflow_preferences');
        
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig(prev => ({ ...prev, ...parsedConfig }));
        }
        
        if (savedNotifications) {
          const parsedNotifications = JSON.parse(savedNotifications);
          setNotifications(prev => ({ ...prev, ...parsedNotifications }));
        }
        
        if (savedPreferences) {
          const parsedPreferences = JSON.parse(savedPreferences);
          setPreferences(prev => ({ ...prev, ...parsedPreferences }));
        }
        
        console.log('✅ Configurações carregadas');
      } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [setConfig, setNotifications, setPreferences]);

  // === APLICAR CONFIGURAÇÕES DE TEMA ===
  useEffect(() => {
    const applyTheme = () => {
      const { theme, fontSize, reducedMotion } = config;
      const root = document.documentElement;
      
      // Tema
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', theme);
      }
      
      // Tamanho da fonte
      root.setAttribute('data-font-size', fontSize);
      
      // Movimento reduzido
      if (reducedMotion) {
        root.style.setProperty('--animation-duration', '0s');
        root.style.setProperty('--transition-duration', '0s');
      } else {
        root.style.removeProperty('--animation-duration');
        root.style.removeProperty('--transition-duration');
      }
    };

    if (!isLoading) {
      applyTheme();
    }
  }, [config, isLoading]);

  // === SALVAR AUTOMATICAMENTE ===
  useEffect(() => {
    if (!isLoading && hasUnsavedChanges) {
      const saveTimeout = setTimeout(() => {
        saveSettings();
      }, 2000); // Auto-save após 2s de inatividade

      return () => clearTimeout(saveTimeout);
    }
  }, [config, notifications, preferences, isLoading, hasUnsavedChanges]);

  // === AÇÕES ===
  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
    
    console.log('🔧 Configuração atualizada:', updates);
  };

  const updateNotifications = (updates: Partial<NotificationSettings>) => {
    setNotifications(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
    
    console.log('🔔 Notificações atualizadas:', updates);
  };

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
    
    console.log('⚙️ Preferências atualizadas:', updates);
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    setNotifications(DEFAULT_NOTIFICATIONS);
    setPreferences(DEFAULT_PREFERENCES);
    setHasUnsavedChanges(true);
    
    console.log('🔄 Settings resetados para padrão');
  };

  const saveSettings = async (): Promise<void> => {
    try {
      localStorage.setItem('fisioflow_app_config', JSON.stringify(config));
      localStorage.setItem('fisioflow_notifications', JSON.stringify(notifications));
      localStorage.setItem('fisioflow_preferences', JSON.stringify(preferences));
      
      setHasUnsavedChanges(false);
      console.log('💾 Configurações salvas');
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      throw error;
    }
  };

  const exportSettings = (): string => {
    const settings = {
      config,
      notifications,
      preferences,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (settingsJson: string): boolean => {
    try {
      const settings = JSON.parse(settingsJson);
      
      if (settings.config) {
        setConfig(prev => ({ ...prev, ...settings.config }));
      }
      
      if (settings.notifications) {
        setNotifications(prev => ({ ...prev, ...settings.notifications }));
      }
      
      if (settings.preferences) {
        setPreferences(prev => ({ ...prev, ...settings.preferences }));
      }
      
      setHasUnsavedChanges(true);
      console.log('📥 Configurações importadas com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao importar configurações:', error);
      return false;
    }
  };

  // === VALOR DO CONTEXTO ===
  const contextValue: AppConfigContextType = {
    config,
    notifications,
    preferences,
    isLoading,
    updateConfig,
    updateNotifications,
    updatePreferences,
    resetToDefaults,
    exportSettings,
    importSettings,
    hasUnsavedChanges,
    saveSettings,
  };

  return (
    <AppConfigContext.Provider value={contextValue}>
      {children}
    </AppConfigContext.Provider>
  );
};

// === HOOK ===
export const useAppConfig = (): AppConfigContextType => {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within AppConfigProvider');
  }
  return context;
};

// === HOOKS ESPECÍFICOS PARA PERFORMANCE ===
export const useTheme = () => {
  const { config, updateConfig } = useAppConfig();
  return {
    theme: config.theme,
    setTheme: (theme: AppConfig['theme']) => updateConfig({ theme }),
    isDark: config.theme === 'dark' || 
            (config.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
  };
};

export const useNotificationSettings = () => {
  const { notifications, updateNotifications } = useAppConfig();
  return {
    settings: notifications,
    updateSettings: updateNotifications,
    isEnabled: (type: keyof NotificationSettings) => notifications[type],
    toggle: (type: keyof NotificationSettings) => 
      updateNotifications({ [type]: !notifications[type] }),
  };
};

export const useUserPreferences = () => {
  const { preferences, updatePreferences } = useAppConfig();
  return {
    preferences,
    updatePreferences,
    getSortOrder: (key: string) => preferences.sortPreferences[key] || 'asc',
    setSortOrder: (key: string, order: 'asc' | 'desc') => 
      updatePreferences({ 
        sortPreferences: { ...preferences.sortPreferences, [key]: order } 
      }),
  };
};

export default AppConfigProvider;