// services/ai-economica/searchEngine.ts
// Motor de busca inteligente para a base de conhecimento

import {
  KnowledgeEntry,
  KnowledgeResult,
} from '../../types/ai-economica.types';
import { aiLogger } from './logger';

interface SearchIndex {
  [term: string]: {
    entries: Array<{
      entryId: string;
      frequency: number;
      positions: number[];
      fieldWeights: {
        title: number;
        content: number;
        tags: number;
        conditions: number;
        techniques: number;
      };
    }>;
  };
}

interface SymptomIndex {
  [symptom: string]: string[]; // entryIds
}

interface DiagnosisIndex {
  [diagnosis: string]: string[]; // entryIds
}

export class SearchEngine {
  private textIndex: SearchIndex = {};
  private symptomIndex: SymptomIndex = {};
  private diagnosisIndex: DiagnosisIndex = {};
  private entries: Map<string, KnowledgeEntry> = new Map();

  private stopWords = new Set([
    // Português
    'a',
    'o',
    'os',
    'as',
    'um',
    'uma',
    'uns',
    'umas',
    'de',
    'do',
    'da',
    'dos',
    'das',
    'em',
    'no',
    'na',
    'nos',
    'nas',
    'para',
    'por',
    'com',
    'sem',
    'sob',
    'sobre',
    'entre',
    'durante',
    'e',
    'ou',
    'mas',
    'que',
    'se',
    'quando',
    'onde',
    'como',
    'porque',
    'este',
    'esta',
    'estes',
    'estas',
    'esse',
    'essa',
    'esses',
    'essas',
    'aquele',
    'aquela',
    'aqueles',
    'aquelas',
    'isto',
    'isso',
    'aquilo',
    'eu',
    'tu',
    'ele',
    'ela',
    'nós',
    'vós',
    'eles',
    'elas',
    'meu',
    'minha',
    'meus',
    'minhas',
    'teu',
    'tua',
    'teus',
    'tuas',
    'seu',
    'sua',
    'seus',
    'suas',
    'nosso',
    'nossa',
    'nossos',
    'nossas',
    'ser',
    'estar',
    'ter',
    'haver',
    'fazer',
    'ir',
    'vir',
    'dar',
    'muito',
    'mais',
    'menos',
    'bem',
    'mal',
    'melhor',
    'pior',
    'já',
    'ainda',
    'só',
    'também',
    'mesmo',
    'então',
    'assim',
    'não',
    'sim',
    'talvez',
    'quem',
    'qual',
    'quais',
    'quanto',
    'quantos',
    // Inglês (palavras médicas comuns)
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'that',
    'the',
    'to',
    'was',
    'will',
    'with',
    'she',
    'they',
    'we',
    'you',
    'have',
  ]);

  async index(entry: KnowledgeEntry): Promise<void> {
    try {
      // Armazenar entrada
      this.entries.set(entry.id, entry);

      // Indexar texto
      await this.indexText(entry);

      // Indexar sintomas/condições
      await this.indexSymptoms(entry);

      // Indexar diagnósticos
      await this.indexDiagnoses(entry);

      aiLogger.debug('SEARCH', `Entrada indexada: ${entry.id}`, {
        title: entry.title,
        contentLength: entry.content.length,
        tags: entry.tags.length,
      });
    } catch (error) {
      aiLogger.error('SEARCH', `Erro ao indexar entrada: ${entry.id}`, error);
    }
  }

  async search(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      includeContent?: boolean;
      filterByTags?: string[];
      filterByConditions?: string[];
    } = {}
  ): Promise<KnowledgeResult[]> {
    try {
      const {
        limit = 10,
        threshold = 0.1,
        includeContent = true,
        filterByTags = [],
        filterByConditions = [],
      } = options;

      // Tokenizar query
      const queryTerms = this.tokenizeText(query.toLowerCase());
      const results: Array<{
        entry: KnowledgeEntry;
        score: number;
        matchDetails: any;
      }> = [];

      // Buscar em cada entrada
      for (const [entryId, entry] of this.entries) {
        // Aplicar filtros se especificados
        if (filterByTags.length > 0) {
          const hasMatchingTag = filterByTags.some((tag) =>
            entry.tags.some((entryTag) =>
              entryTag.toLowerCase().includes(tag.toLowerCase())
            )
          );
          if (!hasMatchingTag) continue;
        }

        if (filterByConditions.length > 0) {
          const hasMatchingCondition = filterByConditions.some((condition) =>
            entry.conditions.some((entryCondition) =>
              entryCondition.toLowerCase().includes(condition.toLowerCase())
            )
          );
          if (!hasMatchingCondition) continue;
        }

        // Calcular score de relevância
        const score = this.calculateRelevanceScore(queryTerms, entry);

        if (score >= threshold) {
          results.push({
            entry,
            score,
            matchDetails: this.getMatchDetails(queryTerms, entry),
          });
        }
      }

      // Ordenar por relevância
      results.sort((a, b) => b.score - a.score);

      // Converter para formato de resultado
      return results.slice(0, limit).map((result) => ({
        id: result.entry.id,
        title: result.entry.title,
        content: includeContent ? result.entry.content : '',
        summary: result.entry.summary,
        tags: result.entry.tags,
        conditions: result.entry.conditions,
        techniques: result.entry.techniques,
        evidenceLevel: result.entry.evidenceLevel,
        lastUpdated: result.entry.lastUpdated,
        relevanceScore: result.score,
        matchDetails: result.matchDetails,
      }));
    } catch (error) {
      aiLogger.error('SEARCH', 'Erro na busca', error);
      return [];
    }
  }

  async searchBySymptom(symptom: string): Promise<KnowledgeResult[]> {
    try {
      const symptomKey = symptom.toLowerCase().trim();
      const entryIds = this.symptomIndex[symptomKey] || [];

      const results: KnowledgeResult[] = [];

      for (const entryId of entryIds) {
        const entry = this.entries.get(entryId);
        if (entry) {
          results.push({
            id: entry.id,
            title: entry.title,
            content: entry.content,
            summary: entry.summary,
            tags: entry.tags,
            conditions: entry.conditions,
            techniques: entry.techniques,
            evidenceLevel: entry.evidenceLevel,
            lastUpdated: entry.lastUpdated,
            relevanceScore: 1.0,
            matchDetails: { symptomMatch: symptom },
          });
        }
      }

      return results;
    } catch (error) {
      aiLogger.error('SEARCH', `Erro na busca por sintoma: ${symptom}`, error);
      return [];
    }
  }

  async searchByDiagnosis(diagnosis: string): Promise<KnowledgeResult[]> {
    try {
      const diagnosisKey = diagnosis.toLowerCase().trim();
      const entryIds = this.diagnosisIndex[diagnosisKey] || [];

      const results: KnowledgeResult[] = [];

      for (const entryId of entryIds) {
        const entry = this.entries.get(entryId);
        if (entry) {
          results.push({
            id: entry.id,
            title: entry.title,
            content: entry.content,
            summary: entry.summary,
            tags: entry.tags,
            conditions: entry.conditions,
            techniques: entry.techniques,
            evidenceLevel: entry.evidenceLevel,
            lastUpdated: entry.lastUpdated,
            relevanceScore: 1.0,
            matchDetails: { diagnosisMatch: diagnosis },
          });
        }
      }

      return results;
    } catch (error) {
      aiLogger.error(
        'SEARCH',
        `Erro na busca por diagnóstico: ${diagnosis}`,
        error
      );
      return [];
    }
  }

  async getSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      const partial = partialQuery.toLowerCase().trim();
      if (partial.length < 2) return [];

      const suggestions = new Set<string>();

      // Buscar nos termos indexados
      for (const term of Object.keys(this.textIndex)) {
        if (term.startsWith(partial)) {
          suggestions.add(term);
        }
      }

      // Buscar nos sintomas
      for (const symptom of Object.keys(this.symptomIndex)) {
        if (symptom.includes(partial)) {
          suggestions.add(symptom);
        }
      }

      // Buscar nos diagnósticos
      for (const diagnosis of Object.keys(this.diagnosisIndex)) {
        if (diagnosis.includes(partial)) {
          suggestions.add(diagnosis);
        }
      }

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      aiLogger.error(
        'SEARCH',
        `Erro ao obter sugestões: ${partialQuery}`,
        error
      );
      return [];
    }
  }

  async getPopularTerms(
    limit: number = 10
  ): Promise<Array<{ term: string; frequency: number }>> {
    try {
      const termFrequencies: Array<{ term: string; frequency: number }> = [];

      for (const [term, data] of Object.entries(this.textIndex)) {
        const totalFrequency = data.entries.reduce(
          (sum, entry) => sum + entry.frequency,
          0
        );
        termFrequencies.push({ term, frequency: totalFrequency });
      }

      termFrequencies.sort((a, b) => b.frequency - a.frequency);
      return termFrequencies.slice(0, limit);
    } catch (error) {
      aiLogger.error('SEARCH', 'Erro ao obter termos populares', error);
      return [];
    }
  }

  async getStats(): Promise<{
    totalEntries: number;
    totalTerms: number;
    totalSymptoms: number;
    totalDiagnoses: number;
    avgTermsPerEntry: number;
    topTerms: Array<{ term: string; frequency: number }>;
  }> {
    try {
      const totalEntries = this.entries.size;
      const totalTerms = Object.keys(this.textIndex).length;
      const totalSymptoms = Object.keys(this.symptomIndex).length;
      const totalDiagnoses = Object.keys(this.diagnosisIndex).length;

      let totalTermsCount = 0;
      for (const data of Object.values(this.textIndex)) {
        totalTermsCount += data.entries.reduce(
          (sum, entry) => sum + entry.frequency,
          0
        );
      }

      const topTerms = await this.getPopularTerms(10);

      return {
        totalEntries,
        totalTerms,
        totalSymptoms,
        totalDiagnoses,
        avgTermsPerEntry: totalEntries > 0 ? totalTermsCount / totalEntries : 0,
        topTerms,
      };
    } catch (error) {
      aiLogger.error('SEARCH', 'Erro ao calcular estatísticas', error);
      return {
        totalEntries: 0,
        totalTerms: 0,
        totalSymptoms: 0,
        totalDiagnoses: 0,
        avgTermsPerEntry: 0,
        topTerms: [],
      };
    }
  }

  // Métodos privados
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .split(/\s+/)
      .filter((token) => token.length > 2 && !this.stopWords.has(token));
  }

  private async indexText(entry: KnowledgeEntry): Promise<void> {
    const fields = {
      title: { text: entry.title, weight: 3.0 },
      content: { text: entry.content, weight: 1.0 },
      summary: { text: entry.summary, weight: 2.0 },
      tags: { text: entry.tags.join(' '), weight: 2.5 },
      conditions: { text: entry.conditions.join(' '), weight: 2.0 },
      techniques: { text: entry.techniques.join(' '), weight: 1.5 },
    };

    for (const [fieldName, fieldData] of Object.entries(fields)) {
      const tokens = this.tokenizeText(fieldData.text);

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (!this.textIndex[token]) {
          this.textIndex[token] = { entries: [] };
        }

        let tokenEntry = this.textIndex[token].entries.find(
          (e) => e.entryId === entry.id
        );

        if (!tokenEntry) {
          tokenEntry = {
            entryId: entry.id,
            frequency: 0,
            positions: [],
            fieldWeights: {
              title: 0,
              content: 0,
              tags: 0,
              conditions: 0,
              techniques: 0,
            },
          };
          this.textIndex[token].entries.push(tokenEntry);
        }

        tokenEntry.frequency++;
        tokenEntry.positions.push(i);
        tokenEntry.fieldWeights[
          fieldName as keyof typeof tokenEntry.fieldWeights
        ] += fieldData.weight;
      }
    }
  }

  private async indexSymptoms(entry: KnowledgeEntry): Promise<void> {
    // Extrair sintomas do conteúdo e condições
    const symptoms = [...entry.conditions];

    // Também procurar por sintomas no conteúdo
    const symptomPatterns = [
      /dor\s+(?:na|no|em)\s+(\w+)/gi,
      /rigidez\s+(?:na|no|em)\s+(\w+)/gi,
      /inchaço\s+(?:na|no|em)\s+(\w+)/gi,
      /fraqueza\s+(?:na|no|em)\s+(\w+)/gi,
    ];

    for (const pattern of symptomPatterns) {
      let match;
      while ((match = pattern.exec(entry.content)) !== null) {
        symptoms.push(match[0]);
      }
    }

    for (const symptom of symptoms) {
      const symptomKey = symptom.toLowerCase().trim();
      if (!this.symptomIndex[symptomKey]) {
        this.symptomIndex[symptomKey] = [];
      }
      if (!this.symptomIndex[symptomKey].includes(entry.id)) {
        this.symptomIndex[symptomKey].push(entry.id);
      }
    }
  }

  private async indexDiagnoses(entry: KnowledgeEntry): Promise<void> {
    // Usar tags como diagnósticos principais
    const diagnoses = [...entry.tags];

    // Também procurar por diagnósticos no título e conteúdo
    const diagnosisPatterns = [
      /(?:diagnóstico|síndrome|lesão|patologia|doença)(?::\s*)?([^.]+)/gi,
      /(\w+ite)\b/gi, // Inflamações
      /(\w+ose)\b/gi, // Condições degenerativas
      /(\w+algia)\b/gi, // Dores
    ];

    const textToSearch = `${entry.title} ${entry.content}`;

    for (const pattern of diagnosisPatterns) {
      let match;
      while ((match = pattern.exec(textToSearch)) !== null) {
        diagnoses.push(match[1] || match[0]);
      }
    }

    for (const diagnosis of diagnoses) {
      const diagnosisKey = diagnosis.toLowerCase().trim();
      if (!this.diagnosisIndex[diagnosisKey]) {
        this.diagnosisIndex[diagnosisKey] = [];
      }
      if (!this.diagnosisIndex[diagnosisKey].includes(entry.id)) {
        this.diagnosisIndex[diagnosisKey].push(entry.id);
      }
    }
  }

  private calculateRelevanceScore(
    queryTerms: string[],
    entry: KnowledgeEntry
  ): number {
    let totalScore = 0;
    let matchedTerms = 0;

    for (const term of queryTerms) {
      const termData = this.textIndex[term];
      if (termData) {
        const entryData = termData.entries.find((e) => e.entryId === entry.id);
        if (entryData) {
          matchedTerms++;

          // Score baseado na frequência e pesos dos campos
          const fieldScore = Object.values(entryData.fieldWeights).reduce(
            (sum, weight) => sum + weight,
            0
          );
          const frequencyScore = Math.log(1 + entryData.frequency);

          totalScore += fieldScore * frequencyScore;
        }
      }
    }

    // Normalizar por quantidade de termos da query
    const coverage =
      queryTerms.length > 0 ? matchedTerms / queryTerms.length : 0;
    return totalScore * coverage;
  }

  private getMatchDetails(queryTerms: string[], entry: KnowledgeEntry): any {
    const details: any = {
      matchedTerms: [],
      fieldMatches: {
        title: false,
        content: false,
        tags: false,
        conditions: false,
        techniques: false,
      },
    };

    for (const term of queryTerms) {
      const termData = this.textIndex[term];
      if (termData) {
        const entryData = termData.entries.find((e) => e.entryId === entry.id);
        if (entryData) {
          details.matchedTerms.push({
            term,
            frequency: entryData.frequency,
            positions: entryData.positions.slice(0, 5), // Primeiras 5 posições
          });

          // Marcar campos que tiveram match
          for (const [field, weight] of Object.entries(
            entryData.fieldWeights
          )) {
            if (weight > 0) {
              details.fieldMatches[field] = true;
            }
          }
        }
      }
    }

    return details;
  }

  // Limpeza e manutenção
  async clear(): Promise<void> {
    this.textIndex = {};
    this.symptomIndex = {};
    this.diagnosisIndex = {};
    this.entries.clear();

    aiLogger.info('SEARCH', 'Índices de busca limpos');
  }

  async removeEntry(entryId: string): Promise<boolean> {
    try {
      // Remover da entrada principal
      const entry = this.entries.get(entryId);
      if (!entry) return false;

      this.entries.delete(entryId);

      // Remover do índice de texto
      for (const [term, data] of Object.entries(this.textIndex)) {
        data.entries = data.entries.filter((e) => e.entryId !== entryId);
        if (data.entries.length === 0) {
          delete this.textIndex[term];
        }
      }

      // Remover do índice de sintomas
      for (const [symptom, entryIds] of Object.entries(this.symptomIndex)) {
        const index = entryIds.indexOf(entryId);
        if (index > -1) {
          entryIds.splice(index, 1);
          if (entryIds.length === 0) {
            delete this.symptomIndex[symptom];
          }
        }
      }

      // Remover do índice de diagnósticos
      for (const [diagnosis, entryIds] of Object.entries(this.diagnosisIndex)) {
        const index = entryIds.indexOf(entryId);
        if (index > -1) {
          entryIds.splice(index, 1);
          if (entryIds.length === 0) {
            delete this.diagnosisIndex[diagnosis];
          }
        }
      }

      aiLogger.debug('SEARCH', `Entrada removida dos índices: ${entryId}`);
      return true;
    } catch (error) {
      aiLogger.error('SEARCH', `Erro ao remover entrada: ${entryId}`, error);
      return false;
    }
  }

  async reindex(entries: KnowledgeEntry[]): Promise<void> {
    try {
      await this.clear();

      for (const entry of entries) {
        await this.index(entry);
      }

      aiLogger.info(
        'SEARCH',
        `Reindexação concluída: ${entries.length} entradas`
      );
    } catch (error) {
      aiLogger.error('SEARCH', 'Erro na reindexação', error);
      throw error;
    }
  }

  async optimize(): Promise<{
    removedTerms: number;
    compactedSymptoms: number;
    compactedDiagnoses: number;
  }> {
    try {
      let removedTerms = 0;
      let compactedSymptoms = 0;
      let compactedDiagnoses = 0;

      // Remover termos órfãos (sem entradas)
      for (const [term, data] of Object.entries(this.textIndex)) {
        if (data.entries.length === 0) {
          delete this.textIndex[term];
          removedTerms++;
        }
      }

      // Compactar índice de sintomas
      for (const [symptom, entryIds] of Object.entries(this.symptomIndex)) {
        const validIds = entryIds.filter((id) => this.entries.has(id));
        if (validIds.length !== entryIds.length) {
          if (validIds.length === 0) {
            delete this.symptomIndex[symptom];
          } else {
            this.symptomIndex[symptom] = validIds;
          }
          compactedSymptoms++;
        }
      }

      // Compactar índice de diagnósticos
      for (const [diagnosis, entryIds] of Object.entries(this.diagnosisIndex)) {
        const validIds = entryIds.filter((id) => this.entries.has(id));
        if (validIds.length !== entryIds.length) {
          if (validIds.length === 0) {
            delete this.diagnosisIndex[diagnosis];
          } else {
            this.diagnosisIndex[diagnosis] = validIds;
          }
          compactedDiagnoses++;
        }
      }

      const result = { removedTerms, compactedSymptoms, compactedDiagnoses };
      aiLogger.info('SEARCH', 'Otimização concluída', result);
      return result;
    } catch (error) {
      aiLogger.error('SEARCH', 'Erro na otimização', error);
      throw error;
    }
  }
}

export default SearchEngine;
