// services/ai-economica/index.ts
// Ponto de entrada principal para o sistema de IA econômica

export { AIService } from './aiService';
export { KnowledgeBaseService } from './knowledgeBaseService';
export { CacheService } from './cacheService';
export { PremiumAccountManager } from './premiumAccountManager';
export { AnalyticsService } from './analyticsService';

// Re-export types
export * from './types';
export * from './config';