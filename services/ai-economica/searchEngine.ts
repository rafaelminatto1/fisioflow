import { 
  KnowledgeEntry, 
  SearchQuery, 
  SearchResult, 
  SearchFilters,
  SearchRankingFactors,
  FuzzySearchOptions 
} from '../../types/ai-economica.types';
import { logger } from './logger';

/**
 * Motor de busca inteligente para a base de conhecimento interna
 * Implementa busca fuzzy, ranking por relevância e filtros avançados
 */
export class SearchEngine {
  private indexedEntries: Map<string, KnowledgeEntry> = new Map();
  private textIndex: Map<string, Set<string>> = new Map(); // palavra -> IDs das entradas
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> IDs das entradas
  private authorIndex: Map<string, Set<string>> = new Map(); // autor -> IDs das entradas
  
  constructor() {
    this.initializeIndexes();
  }

  /**
   * Inicializa os índices de busca
   */
  private initializeIndexes(): void {
    logger.info('Inicializando índices de busca', { component: 'SearchEngine' });
    
    // Os índices serão populados quando as entradas forem adicionadas
    this.indexedEntries.clear();
    this.textIndex.clear();
    this.tagIndex.clear();
    this.authorIndex.clear();
  }

  /**
   * Adiciona uma entrada ao índice de busca
   */
  public indexEntry(entry: KnowledgeEntry): void {
    try {
      this.indexedEntries.set(entry.id, entry);
      
      // Indexar texto (título + conteúdo)
      const text = `${entry.title} ${entry.content}`.toLowerCase();
      const words = this.extractWords(text);
      
      words.forEach(word => {
        if (!this.textIndex.has(word)) {
          this.textIndex.set(word, new Set());
        }
        this.textIndex.get(word)!.add(entry.id);
      });

      // Indexar tags
      entry.tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase();
        if (!this.tagIndex.has(normalizedTag)) {
          this.tagIndex.set(normalizedTag, new Set());
        }
        this.tagIndex.get(normalizedTag)!.add(entry.id);
      });

      // Indexar autor
      const normalizedAuthor = entry.author.toLowerCase();
      if (!this.authorIndex.has(normalizedAuthor)) {
        this.authorIndex.set(normalizedAuthor, new Set());
      }
      this.authorIndex.get(normalizedAuthor)!.add(entry.id);

      logger.debug('Entrada indexada com sucesso', { 
        component: 'SearchEngine',
        entryId: entry.id,
        wordsIndexed: words.length,
        tagsIndexed: entry.tags.length
      });

    } catch (error) {
      logger.error('Erro ao indexar entrada', { 
        component: 'SearchEngine',
        entryId: entry.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Remove uma entrada do índice
   */
  public removeFromIndex(entryId: string): void {
    try {
      const entry = this.indexedEntries.get(entryId);
      if (!entry) return;

      // Remover dos índices de texto
      const text = `${entry.title} ${entry.content}`.toLowerCase();
      const words = this.extractWords(text);
      
      words.forEach(word => {
        const wordSet = this.textIndex.get(word);
        if (wordSet) {
          wordSet.delete(entryId);
          if (wordSet.size === 0) {
            this.textIndex.delete(word);
          }
        }
      });

      // Remover dos índices de tags
      entry.tags.forEach(tag => {
        const tagSet = this.tagIndex.get(tag.toLowerCase());
        if (tagSet) {
          tagSet.delete(entryId);
          if (tagSet.size === 0) {
            this.tagIndex.delete(tag.toLowerCase());
          }
        }
      });

      // Remover do índice de autor
      const authorSet = this.authorIndex.get(entry.author.toLowerCase());
      if (authorSet) {
        authorSet.delete(entryId);
        if (authorSet.size === 0) {
          this.authorIndex.delete(entry.author.toLowerCase());
        }
      }

      // Remover da entrada principal
      this.indexedEntries.delete(entryId);

      logger.debug('Entrada removida do índice', { 
        component: 'SearchEngine',
        entryId
      });

    } catch (error) {
      logger.error('Erro ao remover entrada do índice', { 
        component: 'SearchEngine',
        entryId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca principal - combina múltiplas estratégias
   */
  public async search(query: SearchQuery, filters?: SearchFilters): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    try {
      logger.info('Iniciando busca', { 
        component: 'SearchEngine',
        query: query.text,
        filters
      });

      // 1. Busca por texto exato
      const exactMatches = this.searchExactText(query.text);
      
      // 2. Busca fuzzy
      const fuzzyMatches = this.searchFuzzyText(query.text, {
        threshold: 0.6,
        maxDistance: 2
      });
      
      // 3. Busca por tags
      const tagMatches = this.searchByTags(query.tags || []);
      
      // 4. Busca por sintomas (se especificado)
      const symptomMatches = query.symptoms ? 
        this.searchBySymptoms(query.symptoms) : new Set<string>();
      
      // 5. Busca por diagnóstico (se especificado)
      const diagnosisMatches = query.diagnosis ? 
        this.searchByDiagnosis(query.diagnosis) : new Set<string>();

      // Combinar resultados
      const allMatches = new Map<string, number>(); // ID -> score

      // Pontuar matches exatos (maior peso)
      exactMatches.forEach(id => {
        allMatches.set(id, (allMatches.get(id) || 0) + 10);
      });

      // Pontuar matches fuzzy
      fuzzyMatches.forEach(({ id, score }) => {
        allMatches.set(id, (allMatches.get(id) || 0) + score * 5);
      });

      // Pontuar matches de tags
      tagMatches.forEach(id => {
        allMatches.set(id, (allMatches.get(id) || 0) + 7);
      });

      // Pontuar matches de sintomas
      symptomMatches.forEach(id => {
        allMatches.set(id, (allMatches.get(id) || 0) + 8);
      });

      // Pontuar matches de diagnóstico
      diagnosisMatches.forEach(id => {
        allMatches.set(id, (allMatches.get(id) || 0) + 9);
      });

      // Converter para resultados e aplicar filtros
      let results = Array.from(allMatches.entries())
        .map(([id, score]) => {
          const entry = this.indexedEntries.get(id)!;
          return {
            entry,
            score,
            matchType: this.determineMatchType(id, exactMatches, fuzzyMatches, tagMatches, symptomMatches, diagnosisMatches),
            relevanceFactors: this.calculateRelevanceFactors(entry, query)
          };
        })
        .filter(result => this.applyFilters(result, filters));

      // Aplicar ranking final
      results = this.rankResults(results, query);

      // Limitar resultados
      const maxResults = filters?.maxResults || 20;
      results = results.slice(0, maxResults);

      const duration = Date.now() - startTime;
      
      logger.info('Busca concluída', { 
        component: 'SearchEngine',
        query: query.text,
        resultsCount: results.length,
        duration
      });

      return results;

    } catch (error) {
      logger.error('Erro durante busca', { 
        component: 'SearchEngine',
        query: query.text,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return [];
    }
  }

  /**
   * Busca por texto exato
   */
  private searchExactText(text: string): Set<string> {
    const matches = new Set<string>();
    const words = this.extractWords(text.toLowerCase());
    
    words.forEach(word => {
      const wordMatches = this.textIndex.get(word);
      if (wordMatches) {
        wordMatches.forEach(id => matches.add(id));
      }
    });

    return matches;
  }

  /**
   * Busca fuzzy para termos similares
   */
  private searchFuzzyText(text: string, options: FuzzySearchOptions): Array<{id: string, score: number}> {
    const results: Array<{id: string, score: number}> = [];
    const queryWords = this.extractWords(text.toLowerCase());
    
    // Para cada palavra no índice, calcular similaridade
    this.textIndex.forEach((entryIds, indexedWord) => {
      queryWords.forEach(queryWord => {
        const similarity = this.calculateStringSimilarity(queryWord, indexedWord);
        
        if (similarity >= options.threshold) {
          entryIds.forEach(id => {
            const existingResult = results.find(r => r.id === id);
            if (existingResult) {
              existingResult.score = Math.max(existingResult.score, similarity);
            } else {
              results.push({ id, score: similarity });
            }
          });
        }
      });
    });

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Busca por tags
   */
  private searchByTags(tags: string[]): Set<string> {
    const matches = new Set<string>();
    
    tags.forEach(tag => {
      const tagMatches = this.tagIndex.get(tag.toLowerCase());
      if (tagMatches) {
        tagMatches.forEach(id => matches.add(id));
      }
    });

    return matches;
  }

  /**
   * Busca por sintomas
   */
  private searchBySymptoms(symptoms: string[]): Set<string> {
    const matches = new Set<string>();
    
    // Buscar sintomas no conteúdo das entradas
    symptoms.forEach(symptom => {
      const symptomWords = this.extractWords(symptom.toLowerCase());
      symptomWords.forEach(word => {
        const wordMatches = this.textIndex.get(word);
        if (wordMatches) {
          wordMatches.forEach(id => {
            const entry = this.indexedEntries.get(id);
            if (entry && this.containsSymptom(entry, symptom)) {
              matches.add(id);
            }
          });
        }
      });
    });

    return matches;
  }

  /**
   * Busca por diagnóstico
   */
  private searchByDiagnosis(diagnosis: string): Set<string> {
    const matches = new Set<string>();
    const diagnosisWords = this.extractWords(diagnosis.toLowerCase());
    
    diagnosisWords.forEach(word => {
      const wordMatches = this.textIndex.get(word);
      if (wordMatches) {
        wordMatches.forEach(id => {
          const entry = this.indexedEntries.get(id);
          if (entry && this.containsDiagnosis(entry, diagnosis)) {
            matches.add(id);
          }
        });
      }
    });

    return matches;
  }

  /**
   * Extrai palavras relevantes do texto
   */
  private extractWords(text: string): string[] {
    // Remove pontuação e divide em palavras
    const words = text
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // Remove palavras muito curtas
      .filter(word => !this.isStopWord(word)); // Remove stop words

    return [...new Set(words)]; // Remove duplicatas
  }

  /**
   * Verifica se é uma stop word (palavra muito comum)
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
      'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
      'para', 'por', 'com', 'sem', 'sob', 'sobre', 'entre',
      'e', 'ou', 'mas', 'que', 'se', 'quando', 'onde', 'como',
      'é', 'são', 'foi', 'foram', 'ser', 'estar', 'ter', 'haver',
      'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
      'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Calcula similaridade entre duas strings usando Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Calcula distância de Levenshtein entre duas strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Verifica se a entrada contém o sintoma especificado
   */
  private containsSymptom(entry: KnowledgeEntry, symptom: string): boolean {
    const content = `${entry.title} ${entry.content}`.toLowerCase();
    const symptomLower = symptom.toLowerCase();
    
    // Busca exata
    if (content.includes(symptomLower)) return true;
    
    // Busca por palavras-chave relacionadas a sintomas
    const symptomKeywords = ['sintoma', 'sinal', 'queixa', 'dor', 'desconforto'];
    return symptomKeywords.some(keyword => 
      content.includes(keyword) && content.includes(symptomLower)
    );
  }

  /**
   * Verifica se a entrada contém o diagnóstico especificado
   */
  private containsDiagnosis(entry: KnowledgeEntry, diagnosis: string): boolean {
    const content = `${entry.title} ${entry.content}`.toLowerCase();
    const diagnosisLower = diagnosis.toLowerCase();
    
    // Busca exata
    if (content.includes(diagnosisLower)) return true;
    
    // Busca por palavras-chave relacionadas a diagnóstico
    const diagnosisKeywords = ['diagnóstico', 'condição', 'patologia', 'síndrome', 'lesão'];
    return diagnosisKeywords.some(keyword => 
      content.includes(keyword) && content.includes(diagnosisLower)
    );
  }

  /**
   * Determina o tipo de match encontrado
   */
  private determineMatchType(
    id: string,
    exactMatches: Set<string>,
    fuzzyMatches: Array<{id: string, score: number}>,
    tagMatches: Set<string>,
    symptomMatches: Set<string>,
    diagnosisMatches: Set<string>
  ): string[] {
    const types: string[] = [];
    
    if (exactMatches.has(id)) types.push('exact');
    if (fuzzyMatches.some(m => m.id === id)) types.push('fuzzy');
    if (tagMatches.has(id)) types.push('tag');
    if (symptomMatches.has(id)) types.push('symptom');
    if (diagnosisMatches.has(id)) types.push('diagnosis');
    
    return types;
  }

  /**
   * Calcula fatores de relevância para ranking
   */
  private calculateRelevanceFactors(entry: KnowledgeEntry, query: SearchQuery): SearchRankingFactors {
    return {
      confidence: entry.confidence,
      recency: this.calculateRecencyScore(entry.updatedAt),
      authorRelevance: this.calculateAuthorRelevance(entry.author),
      contentLength: this.calculateContentLengthScore(entry.content),
      tagRelevance: this.calculateTagRelevance(entry.tags, query.tags || [])
    };
  }

  /**
   * Calcula score baseado na recência da entrada
   */
  private calculateRecencyScore(updatedAt: string): number {
    const now = new Date();
    const updated = new Date(updatedAt);
    const daysDiff = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
    
    // Score decresce com o tempo, mas não vai abaixo de 0.1
    return Math.max(0.1, 1 - (daysDiff / 365));
  }

  /**
   * Calcula relevância do autor (pode ser baseado em expertise, etc.)
   */
  private calculateAuthorRelevance(author: string): number {
    // Por enquanto, todos os autores têm relevância igual
    // Futuramente pode ser baseado em expertise, avaliações, etc.
    return 1.0;
  }

  /**
   * Calcula score baseado no tamanho do conteúdo
   */
  private calculateContentLengthScore(content: string): number {
    const length = content.length;
    
    // Conteúdo muito curto ou muito longo tem score menor
    if (length < 100) return 0.5;
    if (length > 5000) return 0.7;
    
    // Tamanho ideal entre 100-2000 caracteres
    if (length <= 2000) return 1.0;
    
    return 0.8;
  }

  /**
   * Calcula relevância das tags
   */
  private calculateTagRelevance(entryTags: string[], queryTags: string[]): number {
    if (queryTags.length === 0) return 1.0;
    
    const matchingTags = entryTags.filter(tag => 
      queryTags.some(queryTag => 
        tag.toLowerCase().includes(queryTag.toLowerCase()) ||
        queryTag.toLowerCase().includes(tag.toLowerCase())
      )
    );
    
    return matchingTags.length / queryTags.length;
  }

  /**
   * Aplica filtros aos resultados
   */
  private applyFilters(result: SearchResult, filters?: SearchFilters): boolean {
    if (!filters) return true;
    
    const { entry } = result;
    
    // Filtro por tipo
    if (filters.type && entry.type !== filters.type) return false;
    
    // Filtro por autor
    if (filters.author && entry.author.toLowerCase() !== filters.author.toLowerCase()) return false;
    
    // Filtro por confiança mínima
    if (filters.minConfidence && entry.confidence < filters.minConfidence) return false;
    
    // Filtro por data
    if (filters.dateRange) {
      const entryDate = new Date(entry.updatedAt);
      if (filters.dateRange.start && entryDate < filters.dateRange.start) return false;
      if (filters.dateRange.end && entryDate > filters.dateRange.end) return false;
    }
    
    // Filtro por tags
    if (filters.requiredTags && filters.requiredTags.length > 0) {
      const hasAllTags = filters.requiredTags.every(requiredTag =>
        entry.tags.some(entryTag => 
          entryTag.toLowerCase().includes(requiredTag.toLowerCase())
        )
      );
      if (!hasAllTags) return false;
    }
    
    return true;
  }

  /**
   * Aplica ranking final aos resultados
   */
  private rankResults(results: SearchResult[], query: SearchQuery): SearchResult[] {
    return results.sort((a, b) => {
      // Score base
      let scoreA = a.score;
      let scoreB = b.score;
      
      // Aplicar fatores de relevância
      scoreA *= a.relevanceFactors.confidence;
      scoreA *= a.relevanceFactors.recency;
      scoreA *= a.relevanceFactors.authorRelevance;
      scoreA *= a.relevanceFactors.contentLength;
      scoreA *= a.relevanceFactors.tagRelevance;
      
      scoreB *= b.relevanceFactors.confidence;
      scoreB *= b.relevanceFactors.recency;
      scoreB *= b.relevanceFactors.authorRelevance;
      scoreB *= b.relevanceFactors.contentLength;
      scoreB *= b.relevanceFactors.tagRelevance;
      
      return scoreB - scoreA;
    });
  }

  /**
   * Obtém estatísticas do índice
   */
  public getIndexStats(): {
    totalEntries: number;
    totalWords: number;
    totalTags: number;
    totalAuthors: number;
  } {
    return {
      totalEntries: this.indexedEntries.size,
      totalWords: this.textIndex.size,
      totalTags: this.tagIndex.size,
      totalAuthors: this.authorIndex.size
    };
  }

  /**
   * Limpa todos os índices
   */
  public clearIndex(): void {
    this.indexedEntries.clear();
    this.textIndex.clear();
    this.tagIndex.clear();
    this.authorIndex.clear();
    
    logger.info('Índices de busca limpos', { component: 'SearchEngine' });
  }
}

// Instância singleton
export const searchEngine = new SearchEngine();