/**
 * Configurações específicas para iOS
 * 
 * Este arquivo contém todas as configurações e otimizações
 * específicas para dispositivos iOS, incluindo performance,
 * cache, sincronização offline e notificações push.
 */

export interface iOSConfig {
  // Configurações de Performance
  performance: {
    enableVirtualization: boolean;
    chunkSize: number;
    debounceMs: number;
    maxConcurrentRequests: number;
    imageOptimization: boolean;
    lazyLoadingThreshold: number;
  };
  
  // Configurações de Cache
  cache: {
    maxSizeMB: number;
    expiryHours: number;
    compressionEnabled: boolean;
    strategies: {
      cases: 'memory' | 'localStorage' | 'indexedDB';
      resources: 'memory' | 'localStorage' | 'indexedDB';
      media: 'memory' | 'localStorage' | 'indexedDB';
      analytics: 'memory' | 'localStorage' | 'indexedDB';
    };
  };
  
  // Configurações de Sincronização Offline
  offline: {
    enabled: boolean;
    syncIntervalMs: number;
    maxRetries: number;
    retryDelayMs: number;
    conflictResolution: 'client' | 'server' | 'manual';
    prioritySync: string[];
  };
  
  // Configurações de Notificações Push
  notifications: {
    enabled: boolean;
    categories: string[];
    soundEnabled: boolean;
    badgeEnabled: boolean;
    alertEnabled: boolean;
    criticalAlertsEnabled: boolean;
  };
  
  // Configurações de Rede
  network: {
    timeoutMs: number;
    retryAttempts: number;
    adaptiveLoading: boolean;
    compressionEnabled: boolean;
    prefetchEnabled: boolean;
  };
  
  // Configurações de UI/UX
  ui: {
    hapticFeedback: boolean;
    darkModeSupport: boolean;
    dynamicTypeSupport: boolean;
    accessibilityEnhanced: boolean;
    gestureOptimization: boolean;
  };
}

export interface TierSpecificConfig {
  free: Partial<iOSConfig>;
  premium: Partial<iOSConfig>;
  enterprise: Partial<iOSConfig>;
}

// Configuração base para iOS
export const baseiOSConfig: iOSConfig = {
  performance: {
    enableVirtualization: true,
    chunkSize: 50,
    debounceMs: 300,
    maxConcurrentRequests: 3,
    imageOptimization: true,
    lazyLoadingThreshold: 200,
  },
  
  cache: {
    maxSizeMB: 100,
    expiryHours: 24,
    compressionEnabled: true,
    strategies: {
      cases: 'indexedDB',
      resources: 'indexedDB',
      media: 'indexedDB',
      analytics: 'localStorage',
    },
  },
  
  offline: {
    enabled: true,
    syncIntervalMs: 30000, // 30 segundos
    maxRetries: 3,
    retryDelayMs: 5000,
    conflictResolution: 'server',
    prioritySync: ['cases', 'competencies', 'sessions'],
  },
  
  notifications: {
    enabled: true,
    categories: [
      'case_assignment',
      'session_reminder',
      'competency_milestone',
      'mentor_message',
      'system_update'
    ],
    soundEnabled: true,
    badgeEnabled: true,
    alertEnabled: true,
    criticalAlertsEnabled: false,
  },
  
  network: {
    timeoutMs: 10000,
    retryAttempts: 2,
    adaptiveLoading: true,
    compressionEnabled: true,
    prefetchEnabled: true,
  },
  
  ui: {
    hapticFeedback: true,
    darkModeSupport: true,
    dynamicTypeSupport: true,
    accessibilityEnhanced: true,
    gestureOptimization: true,
  },
};

// Configurações específicas por tier
export const tierSpecificConfigs: TierSpecificConfig = {
  free: {
    cache: {
      maxSizeMB: 50,
      expiryHours: 12,
    },
    offline: {
      syncIntervalMs: 60000, // 1 minuto
      maxRetries: 2,
    },
    performance: {
      maxConcurrentRequests: 2,
      chunkSize: 25,
    },
    notifications: {
      criticalAlertsEnabled: false,
    },
  },
  
  premium: {
    cache: {
      maxSizeMB: 200,
      expiryHours: 48,
    },
    offline: {
      syncIntervalMs: 15000, // 15 segundos
      maxRetries: 5,
    },
    performance: {
      maxConcurrentRequests: 5,
      chunkSize: 100,
    },
    notifications: {
      criticalAlertsEnabled: true,
    },
  },
  
  enterprise: {
    cache: {
      maxSizeMB: 500,
      expiryHours: 168, // 1 semana
    },
    offline: {
      syncIntervalMs: 10000, // 10 segundos
      maxRetries: 10,
      conflictResolution: 'manual',
    },
    performance: {
      maxConcurrentRequests: 10,
      chunkSize: 200,
      enableVirtualization: true,
    },
    notifications: {
      criticalAlertsEnabled: true,
      categories: [
        'case_assignment',
        'session_reminder',
        'competency_milestone',
        'mentor_message',
        'system_update',
        'priority_alert',
        'compliance_reminder'
      ],
    },
  },
};

// Configurações de recursos offline por tier
export const offlineResourceLimits = {
  free: {
    cases: 10,
    resources: 20,
    videos: 5,
    totalSizeMB: 100,
  },
  premium: {
    cases: 100,
    resources: 200,
    videos: 50,
    totalSizeMB: 500,
  },
  enterprise: {
    cases: -1, // Ilimitado
    resources: -1, // Ilimitado
    videos: -1, // Ilimitado
    totalSizeMB: 2000,
  },
};

// Configurações de qualidade de mídia por tier
export const mediaQualitySettings = {
  free: {
    imageQuality: 0.7,
    videoQuality: '480p',
    audioBitrate: 64,
    compressionLevel: 'high',
  },
  premium: {
    imageQuality: 0.85,
    videoQuality: '720p',
    audioBitrate: 128,
    compressionLevel: 'medium',
  },
  enterprise: {
    imageQuality: 0.95,
    videoQuality: '1080p',
    audioBitrate: 256,
    compressionLevel: 'low',
  },
};

// Configurações de analytics e telemetria
export const analyticsConfig = {
  enabled: true,
  batchSize: 50,
  flushIntervalMs: 30000,
  retentionDays: 30,
  anonymizeData: true,
  trackingEvents: [
    'app_launch',
    'case_view',
    'resource_access',
    'session_start',
    'competency_progress',
    'offline_sync',
    'error_occurred',
    'performance_metric'
  ],
};

// Configurações de segurança específicas para iOS
export const securityConfig = {
  biometricAuth: {
    enabled: true,
    fallbackToPasscode: true,
    promptMessage: 'Use sua biometria para acessar o FisioFlow',
  },
  dataEncryption: {
    enabled: true,
    algorithm: 'AES-256',
    keyRotationDays: 90,
  },
  sessionManagement: {
    timeoutMinutes: 30,
    extendOnActivity: true,
    maxConcurrentSessions: 1,
  },
  certificatePinning: {
    enabled: true,
    backupPins: 2,
    reportFailures: true,
  },
};

// Função para obter configuração baseada no tier do usuário
export function getiOSConfigForTier(tier: 'free' | 'premium' | 'enterprise'): iOSConfig {
  const baseConfig = { ...baseiOSConfig };
  const tierConfig = tierSpecificConfigs[tier];
  
  // Merge deep das configurações
  return mergeDeep(baseConfig, tierConfig) as iOSConfig;
}

// Função para verificar se o dispositivo suporta uma funcionalidade
export function checkiOSCapability(capability: string): boolean {
  const capabilities = {
    'push-notifications': 'Notification' in window,
    'service-worker': 'serviceWorker' in navigator,
    'indexeddb': 'indexedDB' in window,
    'websockets': 'WebSocket' in window,
    'geolocation': 'geolocation' in navigator,
    'camera': 'mediaDevices' in navigator,
    'biometric': 'credentials' in navigator,
    'haptic': 'vibrate' in navigator,
  };
  
  return capabilities[capability] || false;
}

// Função para detectar se está rodando em iOS
export function isiOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Função para detectar versão do iOS
export function getiOSVersion(): string | null {
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}`;
  }
  return null;
}

// Função para verificar se está rodando como PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Função para merge profundo de objetos
function mergeDeep(target: any, source: any): any {
  const output = Object.assign({}, target);
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Configurações de desenvolvimento
export const developmentConfig = {
  enableDebugLogs: process.env.NODE_ENV === 'development',
  mockOfflineMode: false,
  simulateSlowNetwork: false,
  bypassCache: false,
  enablePerformanceMonitoring: true,
};

// Export da configuração final
export default {
  baseiOSConfig,
  tierSpecificConfigs,
  offlineResourceLimits,
  mediaQualitySettings,
  analyticsConfig,
  securityConfig,
  getiOSConfigForTier,
  checkiOSCapability,
  isiOSDevice,
  getiOSVersion,
  isPWA,
  developmentConfig,
};