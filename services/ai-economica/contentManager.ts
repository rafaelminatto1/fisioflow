// services/ai-economica/contentManager.ts
// Gerenciador de conteúdo para a base de conhecimento

import { KnowledgeEntry } from '../../types/ai-economica.types';

export class ContentManager {
  private storage: Map<string, KnowledgeEntry> = new Map();
  private tenantIndex: Map<string, Set<string>> = new Map(); // tenantId -> entryIds
  private authorIndex: Map<string, Set<string>> = new Map(); // authorId -> entryIds
  private typeIndex: Map<string, Set<string>> = new Map(); // type -> entryIds

  constructor() {
    this.loadFromStorage();
  }

  async save(entry: KnowledgeEntry): Promise<void> {
    // Salvar entrada
    this.storage.set(entry.id, entry);

    // Atualizar índices
    this.updateIndices(entry);

    // Persistir no localStorage
    await this.persistToStorage();
  }

  async update(entry: KnowledgeEntry): Promise<void> {
    if (!this.storage.has(entry.id)) {
      throw new Error(`Entry ${entry.id} not found`);
    }

    await this.save(entry);
  }

  async delete(id: string, tenantId?: string): Promise<void> {
    const entry = this.storage.get(id);
    if (!entry || (tenantId && entry.tenantId !== tenantId)) {
      return;
    }

    // Remover dos índices
    this.removeFromIndices(entry);

    // Remover do storage
    this.storage.delete(id);

    // Persistir mudanças
    await this.persistToStorage();
  }

  async findById(
    id: string,
    tenantId?: string
  ): Promise<KnowledgeEntry | null> {
    const entry = this.storage.get(id);
    if (!entry || (tenantId && entry.tenantId !== tenantId)) {
      return null;
    }
    return entry;
  }

  async findByAuthor(
    authorId: string,
    tenantId?: string
  ): Promise<KnowledgeEntry[]> {
    const entryIds = this.authorIndex.get(authorId) || new Set();
    const entries: KnowledgeEntry[] = [];

    for (const entryId of entryIds) {
      const entry = this.storage.get(entryId);
      if (entry && (!tenantId || entry.tenantId === tenantId)) {
        entries.push(entry);
      }
    }

    return entries.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async findByType(
    type: KnowledgeEntry['type'],
    tenantId?: string
  ): Promise<KnowledgeEntry[]> {
    const entryIds = this.typeIndex.get(type) || new Set();
    const entries: KnowledgeEntry[] = [];

    for (const entryId of entryIds) {
      const entry = this.storage.get(entryId);
      if (entry && (!tenantId || entry.tenantId === tenantId)) {
        entries.push(entry);
      }
    }

    return entries.sort((a, b) => b.confidence - a.confidence);
  }

  async findTopByConfidence(
    limit = 10,
    tenantId?: string
  ): Promise<KnowledgeEntry[]> {
    const entries = await this.findAll(tenantId);
    return entries.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  }

  async findRecent(limit = 10, tenantId?: string): Promise<KnowledgeEntry[]> {
    const entries = await this.findAll(tenantId);
    return entries
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  }

  async findAll(tenantId?: string): Promise<KnowledgeEntry[]> {
    if (tenantId) {
      const entryIds = this.tenantIndex.get(tenantId) || new Set();
      const entries: KnowledgeEntry[] = [];

      for (const entryId of entryIds) {
        const entry = this.storage.get(entryId);
        if (entry) {
          entries.push(entry);
        }
      }

      return entries;
    }

    return Array.from(this.storage.values());
  }

  async findOlderThan(
    date: Date,
    tenantId?: string
  ): Promise<KnowledgeEntry[]> {
    const entries = await this.findAll(tenantId);
    return entries.filter((entry) => new Date(entry.createdAt) < date);
  }

  async findByTags(
    tags: string[],
    tenantId?: string
  ): Promise<KnowledgeEntry[]> {
    const entries = await this.findAll(tenantId);
    return entries.filter((entry) =>
      tags.some((tag) =>
        entry.tags.some((entryTag) =>
          entryTag.toLowerCase().includes(tag.toLowerCase())
        )
      )
    );
  }

  async findByConditions(
    conditions: string[],
    tenantId?: string
  ): Promise<KnowledgeEntry[]> {
    const entries = await this.findAll(tenantId);
    return entries.filter((entry) =>
      conditions.some((condition) =>
        entry.conditions.some((entryCondition) =>
          entryCondition.toLowerCase().includes(condition.toLowerCase())
        )
      )
    );
  }

  async getStatistics(tenantId?: string): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    averageConfidence: number;
    topContributors: Array<{
      authorId: string;
      authorName: string;
      count: number;
    }>;
    recentActivity: number; // entries added in last 7 days
  }> {
    const entries = await this.findAll(tenantId);

    // Contar por tipo
    const entriesByType: Record<string, number> = {};
    entries.forEach((entry) => {
      entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
    });

    // Calcular confiança média
    const averageConfidence =
      entries.length > 0
        ? entries.reduce((sum, entry) => sum + entry.confidence, 0) /
          entries.length
        : 0;

    // Top contribuidores
    const contributorCounts: Record<string, { name: string; count: number }> =
      {};
    entries.forEach((entry) => {
      const authorId = entry.author.id;
      if (!contributorCounts[authorId]) {
        contributorCounts[authorId] = { name: entry.author.name, count: 0 };
      }
      contributorCounts[authorId].count++;
    });

    const topContributors = Object.entries(contributorCounts)
      .map(([authorId, data]) => ({
        authorId,
        authorName: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Atividade recente (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = entries.filter(
      (entry) => new Date(entry.createdAt) >= sevenDaysAgo
    ).length;

    return {
      totalEntries: entries.length,
      entriesByType,
      averageConfidence,
      topContributors,
      recentActivity,
    };
  }

  private updateIndices(entry: KnowledgeEntry): void {
    // Índice por tenant
    if (!this.tenantIndex.has(entry.tenantId)) {
      this.tenantIndex.set(entry.tenantId, new Set());
    }
    this.tenantIndex.get(entry.tenantId)!.add(entry.id);

    // Índice por autor
    if (!this.authorIndex.has(entry.author.id)) {
      this.authorIndex.set(entry.author.id, new Set());
    }
    this.authorIndex.get(entry.author.id)!.add(entry.id);

    // Índice por tipo
    if (!this.typeIndex.has(entry.type)) {
      this.typeIndex.set(entry.type, new Set());
    }
    this.typeIndex.get(entry.type)!.add(entry.id);
  }

  private removeFromIndices(entry: KnowledgeEntry): void {
    // Remover do índice de tenant
    const tenantEntries = this.tenantIndex.get(entry.tenantId);
    if (tenantEntries) {
      tenantEntries.delete(entry.id);
      if (tenantEntries.size === 0) {
        this.tenantIndex.delete(entry.tenantId);
      }
    }

    // Remover do índice de autor
    const authorEntries = this.authorIndex.get(entry.author.id);
    if (authorEntries) {
      authorEntries.delete(entry.id);
      if (authorEntries.size === 0) {
        this.authorIndex.delete(entry.author.id);
      }
    }

    // Remover do índice de tipo
    const typeEntries = this.typeIndex.get(entry.type);
    if (typeEntries) {
      typeEntries.delete(entry.id);
      if (typeEntries.size === 0) {
        this.typeIndex.delete(entry.type);
      }
    }
  }

  private async persistToStorage(): Promise<void> {
    try {
      const data = {
        entries: Array.from(this.storage.entries()),
        tenantIndex: Array.from(this.tenantIndex.entries()).map(
          ([key, value]) => [key, Array.from(value)]
        ),
        authorIndex: Array.from(this.authorIndex.entries()).map(
          ([key, value]) => [key, Array.from(value)]
        ),
        typeIndex: Array.from(this.typeIndex.entries()).map(([key, value]) => [
          key,
          Array.from(value),
        ]),
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('ai_economica_knowledge_base', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist knowledge base to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('ai_economica_knowledge_base');
      if (!stored) return;

      const data = JSON.parse(stored);

      // Restaurar entries
      if (data.entries) {
        this.storage = new Map(data.entries);
      }

      // Restaurar índices
      if (data.tenantIndex) {
        this.tenantIndex = new Map(
          data.tenantIndex.map(([key, value]: [string, string[]]) => [
            key,
            new Set(value),
          ])
        );
      }

      if (data.authorIndex) {
        this.authorIndex = new Map(
          data.authorIndex.map(([key, value]: [string, string[]]) => [
            key,
            new Set(value),
          ])
        );
      }

      if (data.typeIndex) {
        this.typeIndex = new Map(
          data.typeIndex.map(([key, value]: [string, string[]]) => [
            key,
            new Set(value),
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load knowledge base from storage:', error);
      // Continuar com storage vazio em caso de erro
    }
  }

  // Métodos para backup e restauração
  async exportData(): Promise<string> {
    const data = {
      entries: Array.from(this.storage.values()),
      exportDate: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(
    jsonData: string
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(jsonData);

      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error('Invalid data format: entries array not found');
      }

      for (const entry of data.entries) {
        try {
          // Validar estrutura da entrada
          if (!entry.id || !entry.title || !entry.content || !entry.tenantId) {
            errors.push(`Invalid entry structure: ${entry.id || 'unknown'}`);
            continue;
          }

          await this.save(entry);
          imported++;
        } catch (error) {
          errors.push(`Failed to import entry ${entry.id}: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to parse JSON data: ${error}`);
    }

    return { imported, errors };
  }

  // Método para limpeza e manutenção
  async cleanup(): Promise<{
    removedDuplicates: number;
    fixedIndices: number;
    compactedStorage: boolean;
  }> {
    let removedDuplicates = 0;
    let fixedIndices = 0;

    // Remover duplicatas baseadas em conteúdo similar
    const entries = Array.from(this.storage.values());
    const duplicates: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];

        // Verificar se são duplicatas (mesmo título e conteúdo similar)
        if (
          entry1.tenantId === entry2.tenantId &&
          entry1.title === entry2.title &&
          this.calculateSimilarity(entry1.content, entry2.content) > 0.9
        ) {
          // Manter a entrada com maior confiança
          const toRemove =
            entry1.confidence >= entry2.confidence ? entry2.id : entry1.id;
          duplicates.push(toRemove);
        }
      }
    }

    // Remover duplicatas
    for (const duplicateId of duplicates) {
      const entry = this.storage.get(duplicateId);
      if (entry) {
        this.removeFromIndices(entry);
        this.storage.delete(duplicateId);
        removedDuplicates++;
      }
    }

    // Verificar e corrigir índices
    const allEntries = Array.from(this.storage.values());

    // Reconstruir índices
    this.tenantIndex.clear();
    this.authorIndex.clear();
    this.typeIndex.clear();

    allEntries.forEach((entry) => {
      this.updateIndices(entry);
      fixedIndices++;
    });

    // Persistir mudanças
    await this.persistToStorage();

    return {
      removedDuplicates,
      fixedIndices,
      compactedStorage: true,
    };
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Algoritmo simples de similaridade baseado em palavras comuns
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...words1].filter((word) => words2.has(word))
    );
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}
