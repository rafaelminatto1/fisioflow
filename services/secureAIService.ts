/**
 * Serviço de IA Seguro - Remove API keys do frontend
 * Implementa proxy seguro para chamadas de IA
 */

import type {
  Patient,
  Task,
  Assessment,
  AbandonmentRiskPrediction,
} from '../types';

import { aiCache } from './aiCache';

// Interface para configuração do serviço
interface AIServiceConfig {
  baseUrl: string; // URL do backend/proxy
  timeout: number;
  retryAttempts: number;
  enableCache: boolean;
}

// Interface para resposta da API
interface AIResponse<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    tokens: number;
    cost: number;
  };
  cached?: boolean;
}

// Interface para requisição de IA
interface AIRequest {
  type: 'task_summary' | 'knowledge_search' | 'patient_report' | 'treatment_plan' | 'abandonment_risk' | 'soap_note';
  data: any;
  userId: string;
  tenantId: string;
  context?: any;
}

class SecureAIService {
  private config: AIServiceConfig;
  private readonly CACHE_PREFIX = 'ai_secure_';
  private requestQueue: Map<string, Promise<AIResponse>> = new Map();

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = {
      baseUrl: '/api/ai', // Backend endpoint
      timeout: 30000, // 30 segundos
      retryAttempts: 3,
      enableCache: true,
      ...config
    };
  }

  /**
   * Configurar endpoint do backend
   */
  setBackendUrl(url: string): void {
    this.config.baseUrl = url;
  }

  /**
   * Fazer chamada segura para IA via backend
   */
  private async makeSecureAICall<T = string>(request: AIRequest): Promise<AIResponse<T>> {
    const cacheKey = this.generateCacheKey(request);
    
    // Verificar cache primeiro
    if (this.config.enableCache) {
      const cached = this.getCachedResponse<T>(cacheKey);
      if (cached) {
        console.log(`📋 Cache hit para ${request.type} (economia ~$0.01)`);
        return {
          success: true,
          data: cached,
          cached: true
        };
      }
    }

    // Verificar se já existe uma requisição em andamento
    if (this.requestQueue.has(cacheKey)) {
      console.log(`⏳ Aguardando requisição em andamento: ${request.type}`);
      return await this.requestQueue.get(cacheKey) as AIResponse<T>;
    }

    // Criar nova requisição
    const requestPromise = this.executeSecureRequest<T>(request);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;
      
      // Cache da resposta se bem-sucedida
      if (response.success && response.data && this.config.enableCache) {
        this.setCachedResponse(cacheKey, response.data);
      }

      return response;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * Executar requisição segura
   */
  private async executeSecureRequest<T>(request: AIRequest): Promise<AIResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`🔒 Chamada segura IA (tentativa ${attempt}): ${request.type}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.baseUrl}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getSessionToken()}`, // Token de sessão
          },
          body: JSON.stringify(request),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Erro desconhecido na IA');
        }

        console.log(`✅ IA processada com sucesso: ${request.type}`);
        return data as AIResponse<T>;

      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Tentativa ${attempt} falhou:`, error);

        // Se não é a última tentativa, aguardar antes de tentar novamente
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // Se todas as tentativas falharam
    console.error(`❌ Falha completa na IA após ${this.config.retryAttempts} tentativas:`, lastError);
    
    return {
      success: false,
      error: this.getUserFriendlyError(lastError)
    };
  }

  /**
   * Obter token de sessão (implementar integração com auth)
   */
  private getSessionToken(): string {
    // TODO: Integrar com sistema de autenticação
    return localStorage.getItem('authToken') || 'anonymous_session';
  }

  /**
   * Gerar chave de cache
   */
  private generateCacheKey(request: AIRequest): string {
    const dataHash = this.simpleHash(JSON.stringify(request.data));
    return `${this.CACHE_PREFIX}${request.type}_${request.userId}_${dataHash}`;
  }

  /**
   * Hash simples para cache
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Obter resposta do cache
   */
  private getCachedResponse<T>(cacheKey: string): T | null {
    try {
      const cached = aiCache.get(cacheKey);
      return cached ? cached as T : null;
    } catch {
      return null;
    }
  }

  /**
   * Salvar resposta no cache
   */
  private setCachedResponse<T>(cacheKey: string, data: T): void {
    try {
      aiCache.set(cacheKey, '', data);
    } catch (error) {
      console.warn('Erro ao salvar no cache:', error);
    }
  }

  /**
   * Converter erro técnico em mensagem amigável
   */
  private getUserFriendlyError(error: Error | null): string {
    if (!error) return 'Erro desconhecido';

    if (error.message.includes('fetch')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    
    if (error.message.includes('timeout') || error.message.includes('aborted')) {
      return 'Tempo limite excedido. O serviço pode estar sobrecarregado.';
    }
    
    if (error.message.includes('401') || error.message.includes('403')) {
      return 'Acesso não autorizado. Faça login novamente.';
    }
    
    if (error.message.includes('429')) {
      return 'Muitas solicitações. Aguarde alguns minutos antes de tentar novamente.';
    }
    
    if (error.message.includes('500')) {
      return 'Erro interno do servidor. Nossa equipe foi notificada.';
    }

    return 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
  }

  // === MÉTODOS PÚBLICOS DE IA ===

  /**
   * Análise de notas de progresso (substituição segura)
   */
  async getTaskSummary(progressNote: string, userId: string, tenantId: string): Promise<string> {
    const request: AIRequest = {
      type: 'task_summary',
      data: { progressNote },
      userId,
      tenantId
    };

    const response = await this.makeSecureAICall<string>(request);
    
    if (!response.success) {
      return `❌ ${response.error}`;
    }

    return response.data || 'Análise não disponível';
  }

  /**
   * Busca na base de conhecimento (substituição segura)
   */
  async searchKnowledgeBase(
    query: string, 
    knowledgeBase: string, 
    userId: string, 
    tenantId: string
  ): Promise<string> {
    const request: AIRequest = {
      type: 'knowledge_search',
      data: { query, knowledgeBase },
      userId,
      tenantId
    };

    const response = await this.makeSecureAICall<string>(request);
    
    if (!response.success) {
      return `❌ ${response.error}`;
    }

    return response.data || 'Resposta não encontrada';
  }

  /**
   * Gerar relatório de paciente
   */
  async generatePatientReport(
    patient: Patient,
    assessments: Assessment[],
    userId: string,
    tenantId: string
  ): Promise<string> {
    const request: AIRequest = {
      type: 'patient_report',
      data: { 
        patient: this.sanitizePatientData(patient), 
        assessments: this.sanitizeAssessments(assessments)
      },
      userId,
      tenantId
    };

    const response = await this.makeSecureAICall<string>(request);
    
    if (!response.success) {
      return `❌ ${response.error}`;
    }

    return response.data || 'Relatório não pôde ser gerado';
  }

  /**
   * Gerar plano de tratamento
   */
  async generateTreatmentPlan(
    patient: Patient,
    assessment: Assessment,
    userId: string,
    tenantId: string
  ): Promise<string> {
    const request: AIRequest = {
      type: 'treatment_plan',
      data: { 
        patient: this.sanitizePatientData(patient), 
        assessment: this.sanitizeAssessment(assessment)
      },
      userId,
      tenantId
    };

    const response = await this.makeSecureAICall<string>(request);
    
    if (!response.success) {
      return `❌ ${response.error}`;
    }

    return response.data || 'Plano de tratamento não pôde ser gerado';
  }

  /**
   * Predição de risco de abandono
   */
  async predictAbandonmentRisk(
    patients: Patient[],
    userId: string,
    tenantId: string
  ): Promise<AbandonmentRiskPrediction[]> {
    const request: AIRequest = {
      type: 'abandonment_risk',
      data: { 
        patients: patients.map(p => this.sanitizePatientData(p))
      },
      userId,
      tenantId
    };

    const response = await this.makeSecureAICall<AbandonmentRiskPrediction[]>(request);
    
    if (!response.success) {
      console.error('Erro na predição de abandono:', response.error);
      return [];
    }

    return response.data || [];
  }

  /**
   * Gerar nota SOAP
   */
  async generateSOAPNote(
    assessment: Assessment,
    userId: string,
    tenantId: string
  ): Promise<string> {
    const request: AIRequest = {
      type: 'soap_note',
      data: { 
        assessment: this.sanitizeAssessment(assessment)
      },
      userId,
      tenantId
    };

    const response = await this.makeSecureAICall<string>(request);
    
    if (!response.success) {
      return `❌ ${response.error}`;
    }

    return response.data || 'Nota SOAP não pôde ser gerada';
  }

  // === MÉTODOS DE SANITIZAÇÃO DE DADOS ===

  /**
   * Sanitizar dados do paciente antes de enviar
   */
  private sanitizePatientData(patient: Patient): Partial<Patient> {
    return {
      id: patient.id,
      name: patient.name.substring(0, 2) + '***', // Ofuscar nome
      medicalHistory: patient.medicalHistory,
      createdAt: patient.createdAt,
      // Remover dados pessoais sensíveis
    };
  }

  /**
   * Sanitizar dados de avaliação
   */
  private sanitizeAssessment(assessment: Assessment): Partial<Assessment> {
    return {
      id: assessment.id,
      date: assessment.date,
      mainComplaint: assessment.mainComplaint,
      history: assessment.history,
      painLevel: assessment.painLevel,
      diagnosticHypothesis: assessment.diagnosticHypothesis,
      treatmentPlan: assessment.treatmentPlan,
      // Remover dados que possam identificar o paciente
    };
  }

  /**
   * Sanitizar múltiplas avaliações
   */
  private sanitizeAssessments(assessments: Assessment[]): Partial<Assessment>[] {
    return assessments.map(a => this.sanitizeAssessment(a));
  }

  /**
   * Verificar status do serviço
   */
  async healthCheck(): Promise<{ status: 'online' | 'offline'; latency?: number }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getSessionToken()}`
        }
      });

      if (response.ok) {
        return {
          status: 'online',
          latency: Date.now() - startTime
        };
      } else {
        return { status: 'offline' };
      }
    } catch {
      return { status: 'offline' };
    }
  }

  /**
   * Obter estatísticas de uso
   */
  async getUsageStats(userId: string, tenantId: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    estimatedCost: number;
    cacheHitRate: number;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getSessionToken()}`
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Erro ao obter estatísticas:', error);
    }

    return {
      totalRequests: 0,
      totalTokens: 0,
      estimatedCost: 0,
      cacheHitRate: 0
    };
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    aiCache.clear();
    console.log('🧹 Cache de IA limpo');
  }
}

// Instância singleton
export const secureAI = new SecureAIService();

// Para compatibilidade com código existente, manter exports das funções originais
// mas redirecionando para o serviço seguro

export async function getTaskSummary(progressNote: string, userId = 'anonymous'): Promise<string> {
  console.warn('⚠️ Função getTaskSummary está deprecated. Use secureAI.getTaskSummary()');
  return await secureAI.getTaskSummary(progressNote, userId, 'default');
}

export async function searchKnowledgeBase(
  query: string,
  knowledgeBase: string,
  userId = 'anonymous'
): Promise<string> {
  console.warn('⚠️ Função searchKnowledgeBase está deprecated. Use secureAI.searchKnowledgeBase()');
  return await secureAI.searchKnowledgeBase(query, knowledgeBase, userId, 'default');
}

export default secureAI;