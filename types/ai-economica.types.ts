// types/ai-economica.types.ts
// Tipos e interfaces para o sistema de IA econômica

export enum PremiumProvider {
  CHATGPT_PLUS = 'chatgpt-plus',
  GEMINI_PRO = 'gemini-pro',
  CLAUDE_PRO = 'claude-pro',
  PERPLEXITY_PRO = 'perplexity-pro',
  MARS_AI_PRO = 'mars-ai-pro'
}

export enum QueryType {
  GENERAL_QUESTION = 'general_question',
  PROTOCOL_SUGGESTION = 'protocol_suggestion',
  DIAGNOSIS_HELP = 'diagnosis_help',
  EXERCISE_RECOMMENDATION = 'exercise_recommendation',
  CASE_ANALYSIS = 'case_analysis',
  RESEARCH_QUERY = 'research_query',
  DOCUMENT_ANALYSIS = 'document_analysis'
}

export enum ResponseSource {
  INTERNAL = 'internal',
  CACHE = 'cache',
  PREMIUM = 'premium'
}

export interface KnowledgeEntry {
  id: string
  tenantId: string
  type: 'protocol' | 'exercise' | 'case' | 'technique' | 'experience'
  title: string
  content: string
  summary: string // Resumo automático para busca
  tags: string[]
  author: {
    id: string
    name: string
    role: string
    experience: number // anos de experiência
  }
  confidence: number // 0-1
  usageCount: number
  successRate: number // baseado em feedback
  references: string[] // URLs ou citações
  conditions: string[] // condições médicas relacionadas
  techniques: string[] // técnicas envolvidas
  contraindications: string[]
  createdAt: string
  updatedAt: string
  lastUsed: string
  metadata: {
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    evidenceLevel: 'low' | 'moderate' | 'high'
    specialty: string[]
  }
}

export interface AIQuery {
  id: string
  text: string
  type: QueryType
  context: {
    patientId?: string
    symptoms?: string[]
    diagnosis?: string
    previousTreatments?: string[]
    userRole: string
    specialty?: string
  }
  priority: 'low' | 'normal' | 'high'
  maxResponseTime: number // ms
  hash: string // para cache
  createdAt: string
}

export interface AIResponse {
  id: string
  queryId: string
  content: string
  confidence: number // 0-1
  source: ResponseSource
  provider?: PremiumProvider
  references: Reference[]
  suggestions: string[]
  followUpQuestions: string[]
  tokensUsed?: number
  responseTime: number // ms
  createdAt: string
  metadata: {
    evidenceLevel?: 'low' | 'moderate' | 'high'
    reliability: number
    relevance: number
  }
}

export interface Reference {
  id: string
  title: string
  url?: string
  type: 'internal' | 'external' | 'study' | 'guideline'
  confidence: number
}

export interface KnowledgeResult {
  entry: KnowledgeEntry
  relevanceScore: number
  matchedTerms: string[]
}

export interface SearchParams {
  text: string
  type?: QueryType
  symptoms?: string[]
  diagnosis?: string
  specialty?: string
  context?: any
}

export interface CacheEntry {
  key: string
  response: AIResponse
  createdAt: number
  expiresAt: number
  accessCount: number
  lastAccessed: number
}

export interface UsageStatus {
  provider: PremiumProvider
  monthlyLimit: number
  currentUsage: number
  remainingQuota: number
  resetDate: Date
  status: 'available' | 'warning' | 'limit_reached'
}

export interface ProviderConfig {
  enabled: boolean
  endpoint?: string
  apiKey?: string
  monthlyLimit: number
  currentUsage: number
  resetDate: Date
}

export interface SavingsReport {
  month: string
  queriesAnsweredInternally: number
  estimatedAPICostSaved: number
  premiumAccountsUsage: Record<PremiumProvider, number>
  cacheHitRate: number
}

export interface AIError {
  type: 'KNOWLEDGE_BASE_UNAVAILABLE' | 'PREMIUM_LIMIT_REACHED' | 'NETWORK_ERROR' | 'INVALID_QUERY'
  message: string
  context?: any
}

export interface ErrorContext {
  query: AIQuery
  attemptedSources: ResponseSource[]
  lastError?: Error
}