/**
 * Serviço Multi-Provedores de IA
 * Utiliza suas assinaturas existentes sem custos adicionais
 * Google Pro, ChatGPT Pro, Claude Pro, Manus Plus
 */

interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  costPerToken: number;
  features: {
    textGeneration: boolean;
    codeGeneration: boolean;
    imageAnalysis: boolean;
    voiceProcessing: boolean;
    longContext: boolean;
  };
}

interface ProviderConfig {
  google: {
    apiKey: string;
    model: 'gemini-pro' | 'gemini-pro-vision';
  };
  openai: {
    apiKey: string;
    model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  };
  anthropic: {
    apiKey: string;
    model: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku';
  };
  manus: {
    apiKey: string;
    endpoint: string;
  };
}

class MultiProviderAIService {
  private providers: Map<string, AIProvider> = new Map();
  private config: ProviderConfig;
  private currentProvider: string = 'google';
  private failoverOrder: string[] = ['google', 'openai', 'anthropic', 'manus'];
  private usageTracker: Map<string, { calls: number; tokens: number; date: string }> = new Map();

  constructor() {
    this.loadConfiguration();
    this.initializeProviders();
  }

  /**
   * Carrega configuração das APIs das suas assinaturas
   */
  private loadConfiguration(): void {
    this.config = {
      google: {
        apiKey: localStorage.getItem('GOOGLE_PRO_API_KEY') || '',
        model: 'gemini-pro'
      },
      openai: {
        apiKey: localStorage.getItem('OPENAI_PRO_API_KEY') || '',
        model: 'gpt-4'
      },
      anthropic: {
        apiKey: localStorage.getItem('CLAUDE_PRO_API_KEY') || '',
        model: 'claude-3-sonnet'
      },
      manus: {
        apiKey: localStorage.getItem('MANUS_PLUS_API_KEY') || '',
        endpoint: localStorage.getItem('MANUS_PLUS_ENDPOINT') || ''
      }
    };
  }

  /**
   * Inicializa provedores com suas assinaturas
   */
  private initializeProviders(): void {
    // Google Gemini Pro (sua assinatura)
    if (this.config.google.apiKey) {
      this.providers.set('google', {
        id: 'google',
        name: 'Google Gemini Pro',
        apiKey: this.config.google.apiKey,
        endpoint: 'https://generativelanguage.googleapis.com/v1/models',
        model: this.config.google.model,
        maxTokens: 30720,
        costPerToken: 0, // Já pago na sua assinatura!
        features: {
          textGeneration: true,
          codeGeneration: true,
          imageAnalysis: true,
          voiceProcessing: false,
          longContext: true
        }
      });
    }

    // OpenAI GPT Pro (sua assinatura)
    if (this.config.openai.apiKey) {
      this.providers.set('openai', {
        id: 'openai',
        name: 'OpenAI GPT Pro',
        apiKey: this.config.openai.apiKey,
        endpoint: 'https://api.openai.com/v1',
        model: this.config.openai.model,
        maxTokens: 8192,
        costPerToken: 0, // Já pago na sua assinatura!
        features: {
          textGeneration: true,
          codeGeneration: true,
          imageAnalysis: true,
          voiceProcessing: true,
          longContext: false
        }
      });
    }

    // Claude Pro (sua assinatura)
    if (this.config.anthropic.apiKey) {
      this.providers.set('anthropic', {
        id: 'anthropic',
        name: 'Claude Pro',
        apiKey: this.config.anthropic.apiKey,
        endpoint: 'https://api.anthropic.com/v1',
        model: this.config.anthropic.model,
        maxTokens: 200000,
        costPerToken: 0, // Já pago na sua assinatura!
        features: {
          textGeneration: true,
          codeGeneration: true,
          imageAnalysis: true,
          voiceProcessing: false,
          longContext: true
        }
      });
    }

    // Manus Plus (sua assinatura)
    if (this.config.manus.apiKey) {
      this.providers.set('manus', {
        id: 'manus',
        name: 'Manus Plus',
        apiKey: this.config.manus.apiKey,
        endpoint: this.config.manus.endpoint,
        model: 'manus-plus',
        maxTokens: 4096,
        costPerToken: 0, // Já pago na sua assinatura!
        features: {
          textGeneration: true,
          codeGeneration: false,
          imageAnalysis: false,
          voiceProcessing: false,
          longContext: false
        }
      });
    }
  }

  /**
   * Gera texto usando o melhor provedor disponível
   */
  async generateText(
    prompt: string,
    context: {
      type: 'assessment' | 'progress' | 'prescription' | 'report';
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<{
    content: string;
    provider: string;
    tokensUsed: number;
    cost: number;
  }> {
    const errors: string[] = [];

    for (const providerId of this.failoverOrder) {
      const provider = this.providers.get(providerId);
      if (!provider) continue;

      try {
        console.log(`🤖 Tentando ${provider.name}...`);
        const result = await this.callProvider(provider, prompt, context);
        
        this.trackUsage(providerId, result.tokensUsed);
        
        return {
          ...result,
          provider: provider.name,
          cost: 0 // Sempre R$ 0 pois você já paga as assinaturas!
        };
      } catch (error) {
        console.warn(`❌ ${provider.name} falhou:`, error);
        errors.push(`${provider.name}: ${error}`);
        continue;
      }
    }

    throw new Error(`Todos os provedores falharam: ${errors.join(', ')}`);
  }

  /**
   * Chama um provedor específico
   */
  private async callProvider(
    provider: AIProvider,
    prompt: string,
    context: any
  ): Promise<{ content: string; tokensUsed: number }> {
    switch (provider.id) {
      case 'google':
        return await this.callGoogleGemini(provider, prompt, context);
      case 'openai':
        return await this.callOpenAI(provider, prompt, context);
      case 'anthropic':
        return await this.callClaude(provider, prompt, context);
      case 'manus':
        return await this.callManus(provider, prompt, context);
      default:
        throw new Error(`Provedor ${provider.id} não implementado`);
    }
  }

  /**
   * Google Gemini Pro (sua assinatura)
   */
  private async callGoogleGemini(
    provider: AIProvider,
    prompt: string,
    context: any
  ): Promise<{ content: string; tokensUsed: number }> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(provider.apiKey);
    const model = genAI.getGenerativeModel({ 
      model: provider.model,
      systemInstruction: context.systemPrompt || this.getSystemPrompt(context.type)
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      content: text,
      tokensUsed: this.estimateTokens(prompt + text)
    };
  }

  /**
   * OpenAI GPT Pro (sua assinatura)
   */
  private async callOpenAI(
    provider: AIProvider,
    prompt: string,
    context: any
  ): Promise<{ content: string; tokensUsed: number }> {
    const response = await fetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: context.systemPrompt || this.getSystemPrompt(context.type)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: context.maxTokens || 2000,
        temperature: context.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens
    };
  }

  /**
   * Claude Pro (sua assinatura)
   */
  private async callClaude(
    provider: AIProvider,
    prompt: string,
    context: any
  ): Promise<{ content: string; tokensUsed: number }> {
    const response = await fetch(`${provider.endpoint}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: context.maxTokens || 2000,
        system: context.systemPrompt || this.getSystemPrompt(context.type),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: context.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0].text,
      tokensUsed: data.usage.input_tokens + data.usage.output_tokens
    };
  }

  /**
   * Manus Plus (sua assinatura)
   */
  private async callManus(
    provider: AIProvider,
    prompt: string,
    context: any
  ): Promise<{ content: string; tokensUsed: number }> {
    // Implementação específica para Manus Plus
    // Ajuste conforme a API do Manus
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        system: context.systemPrompt || this.getSystemPrompt(context.type),
        max_tokens: context.maxTokens || 2000,
        temperature: context.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Manus API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.text || data.content || data.response,
      tokensUsed: this.estimateTokens(prompt + (data.text || data.content || data.response))
    };
  }

  /**
   * Prompts do sistema por tipo de documento
   */
  private getSystemPrompt(type: string): string {
    const prompts = {
      assessment: 'Você é um fisioterapeuta experiente criando uma avaliação clínica detalhada. Use linguagem técnica precisa e estruture o conteúdo de forma profissional.',
      progress: 'Você é um fisioterapeuta documentando a evolução de um paciente. Foque na comparação entre estados anteriores e atuais, destacando melhorias e ajustes necessários.',
      prescription: 'Você é um fisioterapeuta prescrevendo exercícios terapêuticos. Forneça instruções claras, progressões adequadas e cuidados específicos.',
      report: 'Você é um fisioterapeuta elaborando um relatório oficial. Use formatação adequada para documentação médica formal e linguagem técnica apropriada.'
    };
    
    return prompts[type as keyof typeof prompts] || prompts.assessment;
  }

  /**
   * Estimativa simples de tokens
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // Aproximação: 1 token ≈ 4 caracteres
  }

  /**
   * Rastreia uso por provedor
   */
  private trackUsage(providerId: string, tokens: number): void {
    const today = new Date().toISOString().split('T')[0];
    const key = `${providerId}_${today}`;
    
    const current = this.usageTracker.get(key) || { calls: 0, tokens: 0, date: today };
    current.calls++;
    current.tokens += tokens;
    
    this.usageTracker.set(key, current);
    
    // Salva no localStorage
    try {
      localStorage.setItem('aiProviderUsage', JSON.stringify(Array.from(this.usageTracker.entries())));
    } catch (error) {
      console.warn('Erro ao salvar uso dos provedores:', error);
    }
  }

  /**
   * Métodos específicos para cada tipo de documento
   */
  async generateEvolutionReport(patient: any, sessions: any[]): Promise<string> {
    const prompt = `
Gere um relatório de evolução fisioterapêutica para:

**Paciente:** ${patient.name}
**Histórico:** ${patient.medicalHistory}

**Sessões:**
${sessions.map(s => `- ${s.date}: ${s.notes || 'Sessão realizada'} (Dor: ${s.painLevel}/10)`).join('\n')}

Estruture o relatório com: Resumo do caso, Evolução observada, Métricas objetivas, Recomendações.
    `;

    const result = await this.generateText(prompt, { type: 'progress' });
    return result.content;
  }

  async generateInsuranceReport(patient: any, type: 'convenio' | 'pericia' | 'alta'): Promise<string> {
    const prompts = {
      convenio: 'Gere um relatório médico para convênio justificando a necessidade de continuidade do tratamento fisioterapêutico.',
      pericia: 'Gere um relatório pericial fisioterapêutico objetivo avaliando capacidade funcional e limitações.',
      alta: 'Gere uma carta de alta fisioterapêutica documentando resultados obtidos e orientações de manutenção.'
    };

    const prompt = `
${prompts[type]}

**Paciente:** ${patient.name}
**Histórico Clínico:** ${patient.medicalHistory}

Use formatação oficial e linguagem técnica apropriada para documentação médica.
    `;

    const result = await this.generateText(prompt, { type: 'report' });
    return result.content;
  }

  async generateExercisePrescription(prescriptions: any[], exercises: any[], patient: any): Promise<string> {
    const exerciseDetails = prescriptions.map(p => {
      const exercise = exercises.find(e => e.id === p.exerciseId);
      return `${exercise?.name || 'Exercício'}: ${p.sets} séries, ${p.reps} repetições, ${p.frequency}`;
    }).join('\n');

    const prompt = `
Gere um receituário de exercícios fisioterapêuticos para:

**Paciente:** ${patient.name}
**Condição:** ${patient.medicalHistory}

**Exercícios Prescritos:**
${exerciseDetails}

Inclua: instruções detalhadas, cuidados, progressões e orientações gerais.
    `;

    const result = await this.generateText(prompt, { type: 'prescription' });
    return result.content;
  }

  async processVoiceToText(text: string, contextType: string): Promise<string> {
    const prompt = `
Melhore e estruture este texto ditado por voz no contexto de ${contextType} fisioterapêutico:

"${text}"

Corrija erros de transcrição, melhore a estrutura e padronize terminologia médica.
    `;

    const result = await this.generateText(prompt, { type: contextType as any });
    return result.content;
  }

  async correctMedicalTerminology(text: string): Promise<string> {
    const prompt = `
Corrija a terminologia médica e fisioterapêutica neste texto:

"${text}"

Mantenha o conteúdo original, apenas corrigindo termos técnicos e padronizando a linguagem clínica.
    `;

    const result = await this.generateText(prompt, { type: 'assessment' });
    return result.content;
  }

  async translateToPatientLanguage(text: string): Promise<string> {
    const prompt = `
Traduza este texto técnico para linguagem acessível ao paciente:

"${text}"

Use termos simples, explicações claras e evite jargões médicos mantendo a precisão das informações.
    `;

    const result = await this.generateText(prompt, { type: 'assessment' });
    return result.content;
  }

  /**
   * Dashboard de uso
   */
  getUsageDashboard(): {
    providers: { name: string; available: boolean; todayUsage: number }[];
    totalCost: number;
    bestProvider: string;
    recommendations: string[];
  } {
    const today = new Date().toISOString().split('T')[0];
    const providers = Array.from(this.providers.values()).map(provider => {
      const usage = this.usageTracker.get(`${provider.id}_${today}`);
      return {
        name: provider.name,
        available: !!provider.apiKey,
        todayUsage: usage?.calls || 0
      };
    });

    return {
      providers,
      totalCost: 0, // Sempre R$ 0,00 pois você já paga as assinaturas!
      bestProvider: this.getBestProvider(),
      recommendations: this.getRecommendations()
    };
  }

  private getBestProvider(): string {
    // Lógica para determinar o melhor provedor baseado em performance
    const available = Array.from(this.providers.values()).filter(p => p.apiKey);
    if (available.length === 0) return 'Nenhum configurado';
    
    // Prioriza Claude para textos longos, GPT para versatilidade, Gemini para análise
    if (this.providers.has('anthropic')) return 'Claude Pro';
    if (this.providers.has('openai')) return 'GPT Pro';
    if (this.providers.has('google')) return 'Gemini Pro';
    return available[0].name;
  }

  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.providers.has('google')) {
      recommendations.push('Configure sua API do Google Gemini Pro para análise de documentos');
    }
    if (!this.providers.has('openai')) {
      recommendations.push('Adicione sua API do ChatGPT Pro para versatilidade máxima');
    }
    if (!this.providers.has('anthropic')) {
      recommendations.push('Configure Claude Pro para textos longos e análise detalhada');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Todas as suas assinaturas estão configuradas! Custo total: R$ 0,00 💚');
    }
    
    return recommendations;
  }

  /**
   * Configuração das APIs
   */
  setProviderConfig(providerId: keyof ProviderConfig, config: any): void {
    switch (providerId) {
      case 'google':
        localStorage.setItem('GOOGLE_PRO_API_KEY', config.apiKey);
        this.config.google = config;
        break;
      case 'openai':
        localStorage.setItem('OPENAI_PRO_API_KEY', config.apiKey);
        this.config.openai = config;
        break;
      case 'anthropic':
        localStorage.setItem('CLAUDE_PRO_API_KEY', config.apiKey);
        this.config.anthropic = config;
        break;
      case 'manus':
        localStorage.setItem('MANUS_PLUS_API_KEY', config.apiKey);
        localStorage.setItem('MANUS_PLUS_ENDPOINT', config.endpoint);
        this.config.manus = config;
        break;
    }
    
    this.initializeProviders(); // Re-inicializa com nova config
  }

  getConfiguredProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Instância singleton
export const multiAI = new MultiProviderAIService();

// Função de conveniência
export async function generateWithYourSubscriptions(
  prompt: string,
  type: 'assessment' | 'progress' | 'prescription' | 'report'
): Promise<string> {
  const result = await multiAI.generateText(prompt, { type });
  return result.content;
}