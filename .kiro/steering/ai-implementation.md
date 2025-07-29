# Implementação Técnica da Estratégia de IA

## Arquitetura do Sistema de IA Econômico

### Estrutura de Serviços

```typescript
// services/aiService.ts - Serviço principal
interface AIService {
  // 1. Busca na base interna primeiro
  searchKnowledgeBase(query: string): Promise<KnowledgeResult[]>
  
  // 2. Se não encontrar, usa conta premium
  queryPremiumAI(query: string, provider: PremiumProvider): Promise<AIResponse>
  
  // 3. Cache para evitar consultas repetidas
  getCachedResponse(query: string): Promise<AIResponse | null>
}

// Provedores premium disponíveis
enum PremiumProvider {
  CHATGPT_PLUS = 'chatgpt-plus',
  GEMINI_PRO = 'gemini-pro', 
  CLAUDE_PRO = 'claude-pro',
  PERPLEXITY_PRO = 'perplexity-pro',
  MARS_AI_PRO = 'mars-ai-pro'
}
```

### Base de Conhecimento Interna

```typescript
// types/knowledge.ts
interface KnowledgeEntry {
  id: string
  type: 'protocol' | 'exercise' | 'case' | 'technique' | 'experience'
  title: string
  content: string
  tags: string[]
  author: string // fisioterapeuta que criou
  confidence: number // 0-1, baseado em validações
  createdAt: string
  updatedAt: string
  tenantId: string
}

// Busca inteligente na base interna
interface KnowledgeSearch {
  searchBySymptoms(symptoms: string[]): Promise<KnowledgeEntry[]>
  searchByDiagnosis(diagnosis: string): Promise<KnowledgeEntry[]>
  searchByTechnique(technique: string): Promise<KnowledgeEntry[]>
  searchSimilarCases(caseData: CaseData): Promise<KnowledgeEntry[]>
}
```

### Sistema de Cache Inteligente

```typescript
// services/aiCache.ts
interface AICacheService {
  // Cache com TTL baseado no tipo de consulta
  set(key: string, response: AIResponse, ttl?: number): Promise<void>
  get(key: string): Promise<AIResponse | null>
  
  // Cache específico por tipo
  cacheProtocolSuggestion(query: string, response: AIResponse): Promise<void>
  cacheDiagnosisHelp(symptoms: string[], response: AIResponse): Promise<void>
  cacheExerciseRecommendation(condition: string, response: AIResponse): Promise<void>
}

// TTL por tipo de consulta
const CACHE_TTL = {
  PROTOCOL_SUGGESTION: 7 * 24 * 60 * 60 * 1000, // 7 dias
  DIAGNOSIS_HELP: 30 * 24 * 60 * 60 * 1000,     // 30 dias
  EXERCISE_RECOMMENDATION: 14 * 24 * 60 * 60 * 1000, // 14 dias
  GENERAL_QUESTION: 24 * 60 * 60 * 1000          // 1 dia
}
```

### Rotação Inteligente de Contas Premium

```typescript
// services/premiumAccountManager.ts
interface PremiumAccountManager {
  // Seleciona a melhor conta disponível
  selectBestProvider(queryType: QueryType): Promise<PremiumProvider>
  
  // Monitora uso das contas
  trackUsage(provider: PremiumProvider, tokensUsed: number): Promise<void>
  
  // Verifica limites
  checkLimits(provider: PremiumProvider): Promise<UsageStatus>
}

interface UsageStatus {
  provider: PremiumProvider
  monthlyLimit: number
  currentUsage: number
  remainingQuota: number
  resetDate: Date
  status: 'available' | 'warning' | 'limit_reached'
}

// Estratégia de seleção
const PROVIDER_STRATEGY = {
  // Para análises técnicas detalhadas
  TECHNICAL_ANALYSIS: [PremiumProvider.CLAUDE_PRO, PremiumProvider.GEMINI_PRO],
  
  // Para sugestões gerais
  GENERAL_SUGGESTIONS: [PremiumProvider.CHATGPT_PLUS, PremiumProvider.MARS_AI_PRO],
  
  // Para pesquisa científica
  RESEARCH: [PremiumProvider.PERPLEXITY_PRO, PremiumProvider.GEMINI_PRO],
  
  // Para processamento de documentos
  DOCUMENT_ANALYSIS: [PremiumProvider.GEMINI_PRO, PremiumProvider.CLAUDE_PRO]
}
```

### Interface para Fisioterapeutas Contribuírem

```typescript
// components/KnowledgeContribution.tsx
interface KnowledgeContributionProps {
  onSubmit: (entry: Partial<KnowledgeEntry>) => Promise<void>
  suggestedTags: string[]
  relatedCases: ClinicalCase[]
}

// Formulário intuitivo para adicionar conhecimento
const KnowledgeForm = {
  // Campos principais
  title: string
  content: string // Rich text editor
  type: KnowledgeType
  tags: string[]
  
  // Validação automática
  confidence: number // Calculado automaticamente
  references: string[] // Links para estudos/fontes
  
  // Contexto clínico
  conditions: string[] // Condições relacionadas
  techniques: string[] // Técnicas envolvidas
  contraindications: string[] // Contraindicações
}
```

### Monitoramento e Analytics

```typescript
// services/aiAnalytics.ts
interface AIAnalytics {
  // Métricas de uso
  trackQuery(query: string, source: 'internal' | 'premium', provider?: string): void
  trackCacheHit(query: string): void
  trackCacheMiss(query: string): void
  
  // Métricas de economia
  calculateMonthlySavings(): Promise<SavingsReport>
  trackPremiumUsage(): Promise<UsageReport>
  
  // Qualidade das respostas
  trackResponseQuality(query: string, rating: number, source: string): void
}

interface SavingsReport {
  month: string
  queriesAnsweredInternally: number
  estimatedAPICostSaved: number
  premiumAccountsUsage: Record<PremiumProvider, number>
  cacheHitRate: number
}
```

### Configuração de Desenvolvimento

```typescript
// config/ai.config.ts
export const AI_CONFIG = {
  // Prioridades de busca
  SEARCH_PRIORITY: ['internal', 'cache', 'premium'],
  
  // Limites de segurança
  MAX_QUERIES_PER_HOUR: 50,
  MAX_QUERIES_PER_DAY: 200,
  
  // Cache settings
  CACHE_ENABLED: true,
  CACHE_SIZE_LIMIT: '100MB',
  
  // Premium accounts (configurar via env vars)
  PREMIUM_ACCOUNTS: {
    CHATGPT_PLUS: {
      enabled: process.env.CHATGPT_ENABLED === 'true',
      monthlyLimit: 1000, // estimativa
    },
    GEMINI_PRO: {
      enabled: process.env.GEMINI_ENABLED === 'true',
      monthlyLimit: 2000,
    },
    // ... outros provedores
  },
  
  // Alertas
  USAGE_ALERTS: {
    WARNING_THRESHOLD: 0.8, // 80% do limite
    CRITICAL_THRESHOLD: 0.95, // 95% do limite
  }
}
```

### Implementação de Fallbacks

```typescript
// services/aiFallback.ts
class AIFallbackService {
  async getResponse(query: string): Promise<AIResponse> {
    try {
      // 1. Tentar base interna
      const internalResult = await this.searchInternal(query)
      if (internalResult.confidence > 0.7) {
        return internalResult
      }
      
      // 2. Tentar cache
      const cachedResult = await this.getFromCache(query)
      if (cachedResult) {
        return cachedResult
      }
      
      // 3. Tentar conta premium disponível
      const premiumResult = await this.queryPremium(query)
      if (premiumResult) {
        await this.cacheResult(query, premiumResult)
        return premiumResult
      }
      
      // 4. Fallback para resposta padrão
      return this.getDefaultResponse(query)
      
    } catch (error) {
      // Log error mas não quebrar a aplicação
      console.error('AI service error:', error)
      return this.getErrorResponse()
    }
  }
}
```

Esta implementação garante **máxima economia**, **alta disponibilidade** e **qualidade das respostas** seguindo exatamente sua estratégia de usar primeiro a base interna e depois as contas premium já pagas.