// config/ai-economica.config.ts
// Configuração centralizada para o sistema de IA econômica

import { PremiumProvider } from '../types/ai-economica.types';

export const AI_ECONOMICA_CONFIG = {
  // Prioridades de busca (sempre nesta ordem)
  SEARCH_PRIORITY: ['internal', 'cache', 'premium'] as const,
  
  // Limites de segurança para evitar spam
  RATE_LIMITS: {
    MAX_QUERIES_PER_HOUR: 50,
    MAX_QUERIES_PER_DAY: 200,
    MAX_QUERIES_PER_USER_HOUR: 20,
  },
  
  // Configurações de cache
  CACHE: {
    ENABLED: true,
    SIZE_LIMIT: '100MB',
    CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hora
  },
  
  // TTL por tipo de consulta (em milissegundos)
  CACHE_TTL: {
    PROTOCOL_SUGGESTION: 7 * 24 * 60 * 60 * 1000, // 7 dias
    DIAGNOSIS_HELP: 30 * 24 * 60 * 60 * 1000,     // 30 dias
    EXERCISE_RECOMMENDATION: 14 * 24 * 60 * 60 * 1000, // 14 dias
    GENERAL_QUESTION: 24 * 60 * 60 * 1000,        // 1 dia
    CASE_ANALYSIS: 7 * 24 * 60 * 60 * 1000,       // 7 dias
    RESEARCH_QUERY: 30 * 24 * 60 * 60 * 1000,     // 30 dias
    DOCUMENT_ANALYSIS: 14 * 24 * 60 * 60 * 1000,  // 14 dias
  },
  
  // Configuração das contas premium (via env vars)
  PREMIUM_ACCOUNTS: {
    [PremiumProvider.CHATGPT_PLUS]: {
      enabled: process.env.CHATGPT_ENABLED === 'true',
      monthlyLimit: 1000, // estimativa conservadora
      endpoint: process.env.CHATGPT_ENDPOINT || '',
    },
    [PremiumProvider.GEMINI_PRO]: {
      enabled: process.env.GEMINI_ENABLED === 'true',
      monthlyLimit: 2000, // limite mais alto
      endpoint: process.env.GEMINI_ENDPOINT || '',
    },
    [PremiumProvider.CLAUDE_PRO]: {
      enabled: process.env.CLAUDE_ENABLED === 'true',
      monthlyLimit: 1500,
      endpoint: process.env.CLAUDE_ENDPOINT || '',
    },
    [PremiumProvider.PERPLEXITY_PRO]: {
      enabled: process.env.PERPLEXITY_ENABLED === 'true',
      monthlyLimit: 1200,
      endpoint: process.env.PERPLEXITY_ENDPOINT || '',
    },
    [PremiumProvider.MARS_AI_PRO]: {
      enabled: process.env.MARS_AI_ENABLED === 'true',
      monthlyLimit: 800,
      endpoint: process.env.MARS_AI_ENDPOINT || '',
    },
  },
  
  // Estratégia de seleção de provedor por tipo de consulta
  PROVIDER_STRATEGY: {
    // Para análises técnicas detalhadas
    TECHNICAL_ANALYSIS: [PremiumProvider.CLAUDE_PRO, PremiumProvider.GEMINI_PRO],
    
    // Para sugestões gerais
    GENERAL_SUGGESTIONS: [PremiumProvider.CHATGPT_PLUS, PremiumProvider.MARS_AI_PRO],
    
    // Para pesquisa científica
    RESEARCH: [PremiumProvider.PERPLEXITY_PRO, PremiumProvider.GEMINI_PRO],
    
    // Para processamento de documentos
    DOCUMENT_ANALYSIS: [PremiumProvider.GEMINI_PRO, PremiumProvider.CLAUDE_PRO],
    
    // Para análise de casos clínicos
    CASE_ANALYSIS: [PremiumProvider.CLAUDE_PRO, PremiumProvider.PERPLEXITY_PRO],
    
    // Para recomendações de exercícios
    EXERCISE_RECOMMENDATION: [PremiumProvider.CHATGPT_PLUS, PremiumProvider.GEMINI_PRO],
    
    // Para ajuda com diagnóstico
    DIAGNOSIS_HELP: [PremiumProvider.PERPLEXITY_PRO, PremiumProvider.CLAUDE_PRO],
    
    // Para sugestões de protocolo
    PROTOCOL_SUGGESTION: [PremiumProvider.CLAUDE_PRO, PremiumProvider.CHATGPT_PLUS],
  },
  
  // Configurações de alertas
  USAGE_ALERTS: {
    WARNING_THRESHOLD: 0.8,  // 80% do limite
    CRITICAL_THRESHOLD: 0.95, // 95% do limite
    NOTIFICATION_CHANNELS: ['email', 'dashboard', 'webhook'],
  },
  
  // Configurações de confiança
  CONFIDENCE_THRESHOLDS: {
    MIN_INTERNAL_CONFIDENCE: 0.7, // Mínimo para usar resposta interna
    MIN_CACHE_CONFIDENCE: 0.6,    // Mínimo para usar cache
    MIN_RESPONSE_CONFIDENCE: 0.5, // Mínimo para qualquer resposta
  },
  
  // Configurações de logging
  LOGGING: {
    ENABLED: true,
    LEVEL: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    RETENTION_DAYS: 30,
    INCLUDE_QUERY_CONTENT: process.env.NODE_ENV !== 'production',
  },
  
  // Configurações de segurança
  SECURITY: {
    ANONYMIZE_EXTERNAL_QUERIES: true,
    ENCRYPT_CACHE: true,
    AUDIT_ALL_QUERIES: true,
    MAX_QUERY_LENGTH: 10000, // caracteres
  },
  
  // Configurações de performance
  PERFORMANCE: {
    MAX_RESPONSE_TIME: 30000, // 30 segundos
    CONCURRENT_QUERIES_LIMIT: 10,
    BATCH_SIZE: 5,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 segundo
  },
};

// Função para validar configuração
export function validateConfig(): boolean {
  const enabledProviders = Object.entries(AI_ECONOMICA_CONFIG.PREMIUM_ACCOUNTS)
    .filter(([_, config]) => config.enabled)
    .length;
    
  if (enabledProviders === 0) {
    console.warn('⚠️  Nenhuma conta premium configurada. Sistema funcionará apenas com base interna.');
  }
  
  return true;
}

// Função para obter configuração de provedor
export function getProviderConfig(provider: PremiumProvider) {
  return AI_ECONOMICA_CONFIG.PREMIUM_ACCOUNTS[provider];
}

// Função para obter estratégia de provedor
export function getProviderStrategy(queryType: string): PremiumProvider[] {
  return AI_ECONOMICA_CONFIG.PROVIDER_STRATEGY[queryType as keyof typeof AI_ECONOMICA_CONFIG.PROVIDER_STRATEGY] || [];
}