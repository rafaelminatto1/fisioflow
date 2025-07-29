// services/ai-economica/knowledgeBaseService.ts
// Serviço principal da base de conhecimento interna

import { KnowledgeEntry, KnowledgeResult, SearchParams } from '../../types/ai-economica.types';
import { aiEconomicaLogger } from './logger';
import { SearchEngine } from './searchEngine';
import { ContentManager } from './contentManager';

export class KnowledgeBaseService {
  private searchEngine: SearchEngine;
  private contentManager: ContentManager;

  constructor() {
    this.searchEngine = new SearchEngine();
    this.contentManager = new ContentManager();
  }

  async addKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'confidence' | 'usageCount' | 'successRate' | 'createdAt' | 'updatedAt' | 'lastUsed'>): Promise<KnowledgeEntry> {
    // Validar entrada
    this.validateEntry(entry);
    
    // Criar entrada completa
    const fullEntry: KnowledgeEntry = {
      ...entry,
      id: this.generateEntryId(),
      confidence: this.calculateInitialConfidence(entry),
      usageCount: 0,
      successRate: 0.5, // Neutro inicial
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
    
    // Indexar para busca
    await this.searchEngine.index(fullEntry);
    
    // Salvar no armazenamento
    await this.contentManager.save(fullEntry);
    
    // Log da contribuição
    aiEconomicaLogger.logKnowledgeContribution(fullEntry.id, fullEntry.author.id, fullEntry.tenantId);
    
    return fullEntry;
  }

  async search(params: SearchParams): Promise<KnowledgeResult[]> {
    try {
      // Busca por texto
      const textResults = await this.searchEngine.searchByText(params.text, params.context?.tenantId);
      
      // Busca por sintomas (se aplicável)
      const symptomResults = params.symptoms 
        ? await this.searchEngine.searchBySymptoms(params.symptoms, params.context?.tenantId)
        : [];
      
      // Busca por diagnóstico (se aplicável)
      const diagnosisResults = params.diagnosis
        ? await this.searchEngine.searchByDiagnosis(params.diagnosis, params.context?.tenantId)
        : [];
      
      // Combinar e ranquear resultados
      const allResults = [...textResults, ...symptomResults, ...diagnosisResults];
      const rankedResults = this.rankResults(allResults, params);
      
      // Log da busca
      aiEconomicaLogger.logKnowledgeUsage(
        rankedResults[0]?.entry.id || 'none',
        rankedResults[0]?.entry.confidence || 0,
        params.context?.userId,
        params.context?.tenantId
      );
      
      return rankedResults;
      
    } catch (error) {
      aiEconomicaLogger.logQueryError('knowledge_search', error as Error);
      return [];
    }
  }

  async getEntry(id: string, tenantId?: string): Promise<KnowledgeEntry | null> {
    return await this.contentManager.findById(id, tenantId);
  }

  async updateEntry(id: string, updates: Partial<KnowledgeEntry>, tenantId?: string): Promise<KnowledgeEntry | null> {
    const entry = await this.contentManager.findById(id, tenantId);
    if (!entry) return null;

    const updatedEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Re-indexar se o conteúdo mudou
    if (updates.content || updates.title || updates.tags) {
      await this.searchEngine.updateIndex(updatedEntry);
    }

    await this.contentManager.update(updatedEntry);
    return updatedEntry;
  }

  async deleteEntry(id: string, tenantId?: string): Promise<boolean> {
    const entry = await this.contentManager.findById(id, tenantId);
    if (!entry) return false;

    await this.searchEngine.removeFromIndex(id);
    await this.contentManager.delete(id, tenantId);
    
    return true;
  }

  async updateConfidence(entryId: string, feedback: 'positive' | 'negative', tenantId?: string): Promise<void> {
    const entry = await this.contentManager.findById(entryId, tenantId);
    if (!entry) return;

    const adjustment = feedback === 'positive' ? 0.05 : -0.05;
    const newConfidence = Math.max(0.1, Math.min(1.0, entry.confidence + adjustment));
    
    // Atualizar taxa de sucesso baseada no feedback
    const totalFeedbacks = entry.usageCount || 1;
    const currentSuccessRate = entry.successRate || 0.5;
    const newSuccessRate = feedback === 'positive' 
      ? (currentSuccessRate * totalFeedbacks + 1) / (totalFeedbacks + 1)
      : (currentSuccessRate * totalFeedbacks) / (totalFeedbacks + 1);

    await this.updateEntry(entryId, {
      confidence: newConfidence,
      successRate: newSuccessRate,
      usageCount: (entry.usageCount || 0) + 1,
      lastUsed: new Date().toISOString(),
    }, tenantId);

    aiEconomicaLogger.logKnowledgeUsage(entryId, newConfidence, undefined, tenantId);
  }

  async getEntriesByAuthor(authorId: string, tenantId?: string): Promise<KnowledgeEntry[]> {
    return await this.contentManager.findByAuthor(authorId, tenantId);
  }

  async getEntriesByType(type: KnowledgeEntry['type'], tenantId?: string): Promise<KnowledgeEntry[]> {
    return await this.contentManager.findByType(type, tenantId);
  }

  async getTopEntries(limit = 10, tenantId?: string): Promise<KnowledgeEntry[]> {
    return await this.contentManager.findTopByConfidence(limit, tenantId);
  }

  async getRecentEntries(limit = 10, tenantId?: string): Promise<KnowledgeEntry[]> {
    return await this.contentManager.findRecent(limit, tenantId);
  }

  async getStatistics(tenantId?: string): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    averageConfidence: number;
    topContributors: Array<{ authorId: string; authorName: string; count: number }>;
    recentActivity: number; // entries added in last 7 days
  }> {
    return await this.contentManager.getStatistics(tenantId);
  }

  private validateEntry(entry: any): void {
    if (!entry.title || entry.title.trim().length === 0) {
      throw new Error('Título é obrigatório');
    }
    
    if (!entry.content || entry.content.trim().length < 50) {
      throw new Error('Conteúdo deve ter pelo menos 50 caracteres');
    }
    
    if (!entry.type || !['protocol', 'exercise', 'case', 'technique', 'experience'].includes(entry.type)) {
      throw new Error('Tipo inválido');
    }
    
    if (!entry.author || !entry.author.id) {
      throw new Error('Autor é obrigatório');
    }
    
    if (!entry.tenantId) {
      throw new Error('TenantId é obrigatório');
    }
    
    if (!entry.tags || !Array.isArray(entry.tags) || entry.tags.length === 0) {
      throw new Error('Pelo menos uma tag é obrigatória');
    }
  }

  private calculateInitialConfidence(entry: any): number {
    let confidence = 0.5; // Base

    // Bonus por autor experiente
    if (entry.author.experience > 5) confidence += 0.2;
    if (entry.author.experience > 10) confidence += 0.1;
    
    // Bonus por referências
    if (entry.references && entry.references.length > 0) confidence += 0.1;
    if (entry.references && entry.references.length > 2) confidence += 0.05;
    
    // Bonus por detalhamento
    if (entry.content.length > 500) confidence += 0.1;
    if (entry.content.length > 1000) confidence += 0.05;
    
    // Bonus por tags relevantes
    if (entry.tags.length >= 3) confidence += 0.1;
    if (entry.tags.length >= 5) confidence += 0.05;
    
    // Bonus por contraindicações (mostra cuidado)
    if (entry.contraindications && entry.contraindications.length > 0) confidence += 0.05;
    
    // Bonus por nível de evidência
    if (entry.metadata?.evidenceLevel === 'high') confidence += 0.15;
    else if (entry.metadata?.evidenceLevel === 'moderate') confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private rankResults(results: KnowledgeResult[], params: SearchParams): KnowledgeResult[] {
    // Remover duplicatas
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.entry.id === result.entry.id)
    );

    // Ordenar por relevância combinada
    return uniqueResults.sort((a, b) => {
      // Score base da relevância
      let scoreA = a.relevanceScore * a.entry.confidence;
      let scoreB = b.relevanceScore * b.entry.confidence;
      
      // Bonus por uso recente
      const daysSinceUsedA = (Date.now() - new Date(a.entry.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      const daysSinceUsedB = (Date.now() - new Date(b.entry.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUsedA < 7) scoreA += 0.1;
      if (daysSinceUsedB < 7) scoreB += 0.1;
      
      // Bonus por taxa de sucesso
      scoreA += a.entry.successRate * 0.2;
      scoreB += b.entry.successRate * 0.2;
      
      // Bonus por especialidade correspondente
      if (params.context?.specialty && a.entry.metadata.specialty.includes(params.context.specialty)) {
        scoreA += 0.15;
      }
      if (params.context?.specialty && b.entry.metadata.specialty.includes(params.context.specialty)) {
        scoreB += 0.15;
      }
      
      return scoreB - scoreA;
    }).slice(0, 20); // Limitar a 20 resultados mais relevantes
  }

  private generateEntryId(): string {
    return `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Métodos para manutenção
  async rebuildIndex(tenantId?: string): Promise<void> {
    const entries = await this.contentManager.findAll(tenantId);
    await this.searchEngine.rebuildIndex(entries);
    
    aiEconomicaLogger.log('INFO', 'KNOWLEDGE_BASE', `Index rebuilt for ${entries.length} entries`, { tenantId });
  }

  async cleanupOldEntries(daysOld = 365, tenantId?: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const oldEntries = await this.contentManager.findOlderThan(cutoffDate, tenantId);
    let removedCount = 0;
    
    for (const entry of oldEntries) {
      // Só remover se não foi usado recentemente e tem baixa confiança
      if (entry.confidence < 0.3 && entry.usageCount < 5) {
        await this.deleteEntry(entry.id, tenantId);
        removedCount++;
      }
    }
    
    aiEconomicaLogger.log('INFO', 'KNOWLEDGE_BASE', `Cleaned up ${removedCount} old entries`, { tenantId });
    return removedCount;
  }
}