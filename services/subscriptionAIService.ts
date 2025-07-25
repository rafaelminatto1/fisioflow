/**
 * Serviço de IA com Assinatura Mensal Fixa
 * Controla uso e custos com limites mensais predefinidos
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  features: {
    dailyReports: number;
    monthlyReports: number;
    voiceMinutes: number;
    templateGenerations: number;
    textAnalysis: number;
    smartSuggestions: boolean;
    prioritySupport: boolean;
    customTemplates: boolean;
    exportFormats: string[];
  };
  limits: {
    apiCallsPerDay: number;
    apiCallsPerMonth: number;
    storageGB: number;
  };
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Gratuito',
    monthlyPrice: 0,
    features: {
      dailyReports: 3,
      monthlyReports: 50,
      voiceMinutes: 30,
      templateGenerations: 10,
      textAnalysis: 20,
      smartSuggestions: false,
      prioritySupport: false,
      customTemplates: false,
      exportFormats: ['txt', 'markdown']
    },
    limits: {
      apiCallsPerDay: 10,
      apiCallsPerMonth: 200,
      storageGB: 0.1
    }
  },

  basic: {
    id: 'basic',
    name: 'Básico',
    monthlyPrice: 29.90,
    features: {
      dailyReports: 15,
      monthlyReports: 300,
      voiceMinutes: 120,
      templateGenerations: 100,
      textAnalysis: 200,
      smartSuggestions: true,
      prioritySupport: false,
      customTemplates: true,
      exportFormats: ['txt', 'markdown', 'pdf', 'docx']
    },
    limits: {
      apiCallsPerDay: 100,
      apiCallsPerMonth: 2000,
      storageGB: 1
    }
  },

  professional: {
    id: 'professional',
    name: 'Profissional',
    monthlyPrice: 59.90,
    features: {
      dailyReports: 50,
      monthlyReports: 1000,
      voiceMinutes: 300,
      templateGenerations: 500,
      textAnalysis: 1000,
      smartSuggestions: true,
      prioritySupport: true,
      customTemplates: true,
      exportFormats: ['txt', 'markdown', 'pdf', 'docx', 'html']
    },
    limits: {
      apiCallsPerDay: 300,
      apiCallsPerMonth: 6000,
      storageGB: 5
    }
  },

  enterprise: {
    id: 'enterprise',
    name: 'Empresarial',
    monthlyPrice: 149.90,
    features: {
      dailyReports: -1, // ilimitado
      monthlyReports: -1, // ilimitado
      voiceMinutes: -1, // ilimitado
      templateGenerations: -1, // ilimitado
      textAnalysis: -1, // ilimitado
      smartSuggestions: true,
      prioritySupport: true,
      customTemplates: true,
      exportFormats: ['txt', 'markdown', 'pdf', 'docx', 'html', 'xml']
    },
    limits: {
      apiCallsPerDay: -1, // ilimitado
      apiCallsPerMonth: -1, // ilimitado
      storageGB: 50
    }
  }
};

interface UsageData {
  date: string;
  reports: number;
  voiceMinutes: number;
  templates: number;
  analysis: number;
  apiCalls: number;
}

interface SubscriptionStatus {
  planId: string;
  isActive: boolean;
  expiresAt: string;
  renewsAt: string;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'cancelled';
  trialEndsAt?: string;
}

class SubscriptionAIService {
  private currentPlan: SubscriptionPlan;
  private subscription: SubscriptionStatus;
  private dailyUsage: Map<string, UsageData> = new Map();
  private monthlyUsage: Map<string, UsageData> = new Map();

  constructor() {
    this.loadSubscriptionData();
    this.currentPlan = SUBSCRIPTION_PLANS[this.subscription.planId] || SUBSCRIPTION_PLANS.free;
  }

  /**
   * Verifica se o usuário pode usar uma funcionalidade
   */
  canUseFeature(featureType: keyof SubscriptionPlan['features'], amount: number = 1): {
    allowed: boolean;
    remaining: number;
    upgradeRequired: boolean;
    message: string;
  } {
    if (!this.subscription.isActive) {
      return {
        allowed: false,
        remaining: 0,
        upgradeRequired: true,
        message: 'Assinatura inativa. Renove para continuar usando.'
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const usage = this.getDailyUsage(today);
    const limit = this.currentPlan.features[featureType] as number;

    // Plano ilimitado
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        upgradeRequired: false,
        message: 'Uso ilimitado'
      };
    }

    const used = this.getUsedAmount(usage, featureType);
    const remaining = Math.max(0, limit - used);

    if (remaining >= amount) {
      return {
        allowed: true,
        remaining: remaining - amount,
        upgradeRequired: false,
        message: `${remaining} usos restantes hoje`
      };
    }

    return {
      allowed: false,
      remaining: 0,
      upgradeRequired: true,
      message: `Limite diário atingido (${limit}). Upgrade para usar mais.`
    };
  }

  /**
   * Registra uso de uma funcionalidade
   */
  recordUsage(featureType: keyof SubscriptionPlan['features'], amount: number = 1): void {
    const today = new Date().toISOString().split('T')[0];
    const usage = this.getDailyUsage(today);

    switch (featureType) {
      case 'dailyReports':
        usage.reports += amount;
        break;
      case 'voiceMinutes':
        usage.voiceMinutes += amount;
        break;
      case 'templateGenerations':
        usage.templates += amount;
        break;
      case 'textAnalysis':
        usage.analysis += amount;
        break;
    }

    usage.apiCalls += 1;
    this.saveDailyUsage(today, usage);
    this.updateMonthlyUsage();
  }

  /**
   * Gera relatório com controle de uso
   */
  async generateReport(
    type: 'evolution' | 'insurance' | 'prescription' | 'discharge',
    data: any
  ): Promise<{ content: string; success: boolean; message: string }> {
    const check = this.canUseFeature('dailyReports');
    
    if (!check.allowed) {
      return {
        content: '',
        success: false,
        message: check.message
      };
    }

    try {
      // Aqui você pode escolher entre diferentes provedores baseado no plano
      let content: string;
      
      if (this.currentPlan.id === 'free') {
        // Usa geração local para plano gratuito
        content = await this.generateReportLocal(type, data);
      } else {
        // Usa IA premium para planos pagos
        content = await this.generateReportPremium(type, data);
      }

      this.recordUsage('dailyReports');
      
      return {
        content,
        success: true,
        message: `Relatório gerado. ${check.remaining - 1} usos restantes hoje.`
      };
    } catch (error) {
      return {
        content: '',
        success: false,
        message: 'Erro ao gerar relatório. Tente novamente.'
      };
    }
  }

  /**
   * Processamento de voz com controle de minutos
   */
  async processVoice(
    audioBlob: Blob,
    duration: number
  ): Promise<{ text: string; success: boolean; message: string }> {
    const minutesUsed = Math.ceil(duration / 60);
    const check = this.canUseFeature('voiceMinutes', minutesUsed);
    
    if (!check.allowed) {
      return {
        text: '',
        success: false,
        message: check.message
      };
    }

    try {
      let text: string;
      
      if (this.currentPlan.id === 'free') {
        text = await this.processVoiceLocal(audioBlob);
      } else {
        text = await this.processVoicePremium(audioBlob);
      }

      this.recordUsage('voiceMinutes', minutesUsed);
      
      return {
        text,
        success: true,
        message: `${Math.floor(check.remaining - minutesUsed)} minutos restantes hoje.`
      };
    } catch (error) {
      return {
        text: '',
        success: false,
        message: 'Erro no processamento de voz.'
      };
    }
  }

  /**
   * Templates inteligentes
   */
  async generateTemplate(
    pathology: string,
    type: string
  ): Promise<{ template: any; success: boolean; message: string }> {
    const check = this.canUseFeature('templateGenerations');
    
    if (!check.allowed) {
      return {
        template: null,
        success: false,
        message: check.message
      };
    }

    if (!this.currentPlan.features.customTemplates) {
      return {
        template: this.getBasicTemplate(type),
        success: true,
        message: 'Template básico (upgrade para templates personalizados)'
      };
    }

    try {
      const template = await this.generateCustomTemplate(pathology, type);
      this.recordUsage('templateGenerations');
      
      return {
        template,
        success: true,
        message: `Template gerado. ${check.remaining - 1} usos restantes.`
      };
    } catch (error) {
      return {
        template: this.getBasicTemplate(type),
        success: false,
        message: 'Erro ao gerar template personalizado. Usando template básico.'
      };
    }
  }

  /**
   * Métodos de geração baseados no plano
   */
  private async generateReportLocal(type: string, data: any): Promise<string> {
    // Templates locais simples
    const templates = {
      evolution: `# RELATÓRIO DE EVOLUÇÃO\n\nPaciente apresenta evolução conforme dados fornecidos.\n\n**Data:** ${new Date().toLocaleDateString('pt-BR')}`,
      insurance: `# RELATÓRIO PARA CONVÊNIO\n\nRelatório médico para aprovação de sessões.\n\n**Data:** ${new Date().toLocaleDateString('pt-BR')}`,
      prescription: `# RECEITUÁRIO DE EXERCÍCIOS\n\nExercícios prescritos conforme avaliação.\n\n**Data:** ${new Date().toLocaleDateString('pt-BR')}`,
      discharge: `# CARTA DE ALTA\n\nPaciente apto para alta fisioterapêutica.\n\n**Data:** ${new Date().toLocaleDateString('pt-BR')}`
    };
    
    return templates[type as keyof typeof templates] || templates.evolution;
  }

  private async generateReportPremium(type: string, data: any): Promise<string> {
    // Aqui integraria com API premium (OpenAI, Claude, etc.)
    // Por enquanto simula com conteúdo mais elaborado
    return `# RELATÓRIO PREMIUM ${type.toUpperCase()}\n\nRelatório gerado com IA avançada, incluindo análise detalhada e recomendações personalizadas.\n\n**Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n## Análise Detalhada\nAnálise clínica aprofundada com base nos dados do paciente...\n\n## Recomendações Personalizadas\nRecomendações específicas baseadas em evidências científicas...`;
  }

  private async processVoiceLocal(audioBlob: Blob): Promise<string> {
    // Simulação de processamento local (Web Speech API)
    return "Texto transcrito localmente (funcionalidade básica)";
  }

  private async processVoicePremium(audioBlob: Blob): Promise<string> {
    // Integração com APIs premium de speech-to-text
    return "Texto transcrito com IA premium - alta precisão e correção automática";
  }

  private getBasicTemplate(type: string): any {
    return {
      id: `basic_${type}`,
      name: `Template Básico - ${type}`,
      sections: [
        { id: 'title', title: 'Título', required: true },
        { id: 'content', title: 'Conteúdo', required: true }
      ]
    };
  }

  private async generateCustomTemplate(pathology: string, type: string): Promise<any> {
    // Template personalizado baseado na patologia
    return {
      id: `custom_${pathology}_${type}`,
      name: `Template ${pathology} - ${type}`,
      sections: [
        { id: 'title', title: 'Título', required: true },
        { id: 'assessment', title: 'Avaliação Específica', required: true },
        { id: 'treatment', title: 'Tratamento Direcionado', required: true },
        { id: 'progression', title: 'Progressão', required: false }
      ]
    };
  }

  /**
   * Gestão de dados de uso
   */
  private getDailyUsage(date: string): UsageData {
    if (!this.dailyUsage.has(date)) {
      this.dailyUsage.set(date, {
        date,
        reports: 0,
        voiceMinutes: 0,
        templates: 0,
        analysis: 0,
        apiCalls: 0
      });
    }
    return this.dailyUsage.get(date)!;
  }

  private getUsedAmount(usage: UsageData, feature: keyof SubscriptionPlan['features']): number {
    switch (feature) {
      case 'dailyReports': return usage.reports;
      case 'voiceMinutes': return usage.voiceMinutes;
      case 'templateGenerations': return usage.templates;
      case 'textAnalysis': return usage.analysis;
      default: return 0;
    }
  }

  private saveDailyUsage(date: string, usage: UsageData): void {
    this.dailyUsage.set(date, usage);
    try {
      localStorage.setItem('aiUsageDaily', JSON.stringify(Array.from(this.dailyUsage.entries())));
    } catch (error) {
      console.warn('Erro ao salvar uso diário:', error);
    }
  }

  private updateMonthlyUsage(): void {
    const currentMonth = new Date().toISOString().substr(0, 7); // YYYY-MM
    let monthlyTotal: UsageData = {
      date: currentMonth,
      reports: 0,
      voiceMinutes: 0,
      templates: 0,
      analysis: 0,
      apiCalls: 0
    };

    // Soma todos os dias do mês atual
    for (const [date, usage] of this.dailyUsage) {
      if (date.startsWith(currentMonth)) {
        monthlyTotal.reports += usage.reports;
        monthlyTotal.voiceMinutes += usage.voiceMinutes;
        monthlyTotal.templates += usage.templates;
        monthlyTotal.analysis += usage.analysis;
        monthlyTotal.apiCalls += usage.apiCalls;
      }
    }

    this.monthlyUsage.set(currentMonth, monthlyTotal);
  }

  private loadSubscriptionData(): void {
    try {
      const saved = localStorage.getItem('aiSubscription');
      if (saved) {
        this.subscription = JSON.parse(saved);
      } else {
        // Novo usuário - trial gratuito por 7 dias
        this.subscription = {
          planId: 'free',
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          renewsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          paymentStatus: 'paid',
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        this.saveSubscriptionData();
      }

      // Carrega dados de uso
      const dailyData = localStorage.getItem('aiUsageDaily');
      if (dailyData) {
        this.dailyUsage = new Map(JSON.parse(dailyData));
      }
    } catch (error) {
      console.warn('Erro ao carregar dados de assinatura:', error);
      this.subscription = SUBSCRIPTION_PLANS.free as any;
    }
  }

  private saveSubscriptionData(): void {
    try {
      localStorage.setItem('aiSubscription', JSON.stringify(this.subscription));
    } catch (error) {
      console.warn('Erro ao salvar dados de assinatura:', error);
    }
  }

  /**
   * Métodos públicos para gestão de assinatura
   */
  getCurrentPlan(): SubscriptionPlan {
    return this.currentPlan;
  }

  getSubscriptionStatus(): SubscriptionStatus {
    return this.subscription;
  }

  getDashboardData(): {
    plan: SubscriptionPlan;
    usage: {
      today: UsageData;
      month: UsageData;
    };
    limits: {
      reportsRemaining: number;
      voiceMinutesRemaining: number;
      templatesRemaining: number;
    };
  } {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substr(0, 7);
    
    const todayUsage = this.getDailyUsage(today);
    const monthUsage = this.monthlyUsage.get(currentMonth) || {
      date: currentMonth,
      reports: 0,
      voiceMinutes: 0,
      templates: 0,
      analysis: 0,
      apiCalls: 0
    };

    return {
      plan: this.currentPlan,
      usage: {
        today: todayUsage,
        month: monthUsage
      },
      limits: {
        reportsRemaining: this.currentPlan.features.dailyReports === -1 ? -1 : 
                         Math.max(0, this.currentPlan.features.dailyReports - todayUsage.reports),
        voiceMinutesRemaining: this.currentPlan.features.voiceMinutes === -1 ? -1 :
                              Math.max(0, this.currentPlan.features.voiceMinutes - todayUsage.voiceMinutes),
        templatesRemaining: this.currentPlan.features.templateGenerations === -1 ? -1 :
                           Math.max(0, this.currentPlan.features.templateGenerations - todayUsage.templates)
      }
    };
  }

  upgradePlan(planId: string): { success: boolean; message: string } {
    if (!SUBSCRIPTION_PLANS[planId]) {
      return { success: false, message: 'Plano inválido' };
    }

    // Simulação de upgrade (em produção integraria com gateway de pagamento)
    this.subscription.planId = planId;
    this.subscription.paymentStatus = 'paid';
    this.subscription.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    this.currentPlan = SUBSCRIPTION_PLANS[planId];
    this.saveSubscriptionData();

    return { 
      success: true, 
      message: `Upgrade para ${this.currentPlan.name} realizado com sucesso!` 
    };
  }
}

// Instância singleton
export const subscriptionAI = new SubscriptionAIService();

// Funções de conveniência
export function canUseAI(feature: keyof SubscriptionPlan['features']): boolean {
  return subscriptionAI.canUseFeature(feature).allowed;
}

export function getAIUsageStatus() {
  return subscriptionAI.getDashboardData();
}