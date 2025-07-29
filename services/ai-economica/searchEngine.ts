// services/ai-economica/searchEngine.ts
// Motor de busca inteligente para a base de conhecimento

import { KnowledgeEntry, KnowledgeResult } from '../../types/ai-economica.types';

interface SearchIndex {
  [term: string]: {
    entries: Array<{
      entryId: string;
      frequency: number;
      positions: number[];
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
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'o', 'a', 'os', 'as', 'um', 'uma',
    'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
    'para', 'por', 'com', 'sem', 'sob', 'sobre', 'entre', 'durante',
    'e', 'ou', 'mas', 'que', 'se', 'quando', 'onde', 'como', 'porque'
  ]);

  async index(entry: KnowledgeEntry): Promise<void> {
    // Armazenar entrada
    this.entries.set(entry.id, entry);

    // Indexar texto
    await this.indexText(entry);
    
    // Indexar sintomas
    await this.indexSymptoms(entry);
    
    // Indexar diagnósticos
    await this.indexDiagnoses(entry);
  }

  async updateIndex(entry: KnowledgeEntry): Promise<void> {
    // Remover índices antigos
    await this.removeFromIndex(entry.id);
    
    // Re-indexar
    await this.index(entry);
  }

  async removeFromIndex(entryId: string): Promise<void> {
    // Remover da memória
    this.entries.delete(entryId);
    
    // Remover do índice de texto
    Object.keys(this.textIndex).forEach(term => {
      this.textIndex[term].entries = this.textIndex[term].entries.filter(
        e => e.entryId !== entryId
      );
      
      // Remover termo se não há mais entradas
      if (this.textIndex[term].entries.length === 0) {
        delete this.textIndex[term];
      }
    });
    
    // Remover do índice de sintomas
    Object.keys(this.symptomIndex).forEach(symptom => {
      this.symptomIndex[symptom] = this.symptomIndex[symptom].filter(id => id !== entryId);
      
      if (this.symptomIndex[symptom].length === 0) {
        delete this.symptomIndex[symptom];
      }
    });
    
    // Remover do índice de diagnósticos
    Object.keys(this.diagnosisIndex).forEach(diagnosis => {
      this.diagnosisIndex[diagnosis] = this.diagnosisIndex[diagnosis].filter(id => id !== entryId);
      
      if (this.diagnosisIndex[diagnosis].length === 0) {
        delete this.diagnosisIndex[diagnosis];
      }
    });
  }

  async searchByText(query: string, tenantId?: string): Promise<KnowledgeResult[]> {
    const terms = this.tokenize(query);
    const results = new Map<string, KnowledgeResult>();

    for (const term of terms) {
      const indexEntry = this.textIndex[term];
      if (!indexEntry) continue;

      for (const entryRef of indexEntry.entries) {
        const entry = this.entries.get(entryRef.entryId);
        if (!entry || (tenantId && entry.tenantId !== tenantId)) continue;

        const existingResult = results.get(entry.id);
        const termScore = this.calculateTermScore(term, entryRef, entry);
        
        if (existingResult) {
          existingResult.relevanceScore += termScore;
          existingResult.matchedTerms.push(term);
        } else {
          results.set(entry.id, {
            entry,
            relevanceScore: termScore,
            matchedTerms: [term]
          });
        }
      }
    }

    return Array.from(results.values());
  }

  async searchBySymptoms(symptoms: string[], tenantId?: string): Promise<KnowledgeResult[]> {
    const results = new Map<string, KnowledgeResult>();

    for (const symptom of symptoms) {
      const normalizedSymptom = this.normalizeText(symptom);
      const entryIds = this.symptomIndex[normalizedSymptom] || [];

      for (const entryId of entryIds) {
        const entry = this.entries.get(entryId);
        if (!entry || (tenantId && entry.tenantId !== tenantId)) continue;

        const existingResult = results.get(entry.id);
        const symptomScore = 0.8; // Alto score para correspondência de sintoma
        
        if (existingResult) {
          existingResult.relevanceScore += symptomScore;
          existingResult.matchedTerms.push(symptom);
        } else {
          results.set(entry.id, {
            entry,
            relevanceScore: symptomScore,
            matchedTerms: [symptom]
          });
        }
      }
    }

    return Array.from(results.values());
  }

  async searchByDiagnosis(diagnosis: string, tenantId?: string): Promise<KnowledgeResult[]> {
    const normalizedDiagnosis = this.normalizeText(diagnosis);
    const entryIds = this.diagnosisIndex[normalizedDiagnosis] || [];
    const results: KnowledgeResult[] = [];

    for (const entryId of entryIds) {
      const entry = this.entries.get(entryId);
      if (!entry || (tenantId && entry.tenantId !== tenantId)) continue;

      results.push({
        entry,
        relevanceScore: 0.9, // Muito alto para correspondência exata de diagnóstico
        matchedTerms: [diagnosis]
      });
    }

    return results;
  }

  async searchSimilarCases(caseData: any, tenantId?: string): Promise<KnowledgeResult[]> {
    // Buscar casos similares baseado em sintomas, diagnóstico e tratamentos
    const allResults: KnowledgeResult[] = [];

    // Buscar por sintomas
    if (caseData.symptoms) {
      const symptomResults = await this.searchBySymptoms(caseData.symptoms, tenantId);
      allResults.push(...symptomResults);
    }

    // Buscar por diagnóstico
    if (caseData.diagnosis) {
      const diagnosisResults = await this.searchByDiagnosis(caseData.diagnosis, tenantId);
      allResults.push(...diagnosisResults);
    }

    // Buscar por tratamentos anteriores
    if (caseData.previousTreatments) {
      const treatmentQuery = caseData.previousTreatments.join(' ');
      const treatmentResults = await this.searchByText(treatmentQuery, tenantId);
      allResults.push(...treatmentResults);
    }

    // Filtrar apenas casos clínicos
    return allResults.filter(result => result.entry.type === 'case');
  }

  async rebuildIndex(entries: KnowledgeEntry[]): Promise<void> {
    // Limpar índices
    this.textIndex = {};
    this.symptomIndex = {};
    this.diagnosisIndex = {};
    this.entries.clear();

    // Re-indexar todas as entradas
    for (const entry of entries) {
      await this.index(entry);
    }
  }

  private async indexText(entry: KnowledgeEntry): Promise<void> {
    // Combinar todo o texto pesquisável
    const searchableText = [
      entry.title,
      entry.content,
      entry.summary,
      ...entry.tags,
      ...entry.conditions,
      ...entry.techniques,
      ...entry.contraindications
    ].join(' ');

    const terms = this.tokenize(searchableText);
    
    terms.forEach((term, position) => {
      if (!this.textIndex[term]) {
        this.textIndex[term] = { entries: [] };
      }

      const existingEntry = this.textIndex[term].entries.find(e => e.entryId === entry.id);
      
      if (existingEntry) {
        existingEntry.frequency++;
        existingEntry.positions.push(position);
      } else {
        this.textIndex[term].entries.push({
          entryId: entry.id,
          frequency: 1,
          positions: [position]
        });
      }
    });
  }

  private async indexSymptoms(entry: KnowledgeEntry): Promise<void> {
    // Extrair sintomas do conteúdo
    const symptoms = this.extractSymptoms(entry);
    
    symptoms.forEach(symptom => {
      const normalizedSymptom = this.normalizeText(symptom);
      
      if (!this.symptomIndex[normalizedSymptom]) {
        this.symptomIndex[normalizedSymptom] = [];
      }
      
      if (!this.symptomIndex[normalizedSymptom].includes(entry.id)) {
        this.symptomIndex[normalizedSymptom].push(entry.id);
      }
    });
  }

  private async indexDiagnoses(entry: KnowledgeEntry): Promise<void> {
    // Extrair diagnósticos do conteúdo
    const diagnoses = this.extractDiagnoses(entry);
    
    diagnoses.forEach(diagnosis => {
      const normalizedDiagnosis = this.normalizeText(diagnosis);
      
      if (!this.diagnosisIndex[normalizedDiagnosis]) {
        this.diagnosisIndex[normalizedDiagnosis] = [];
      }
      
      if (!this.diagnosisIndex[normalizedDiagnosis].includes(entry.id)) {
        this.diagnosisIndex[normalizedDiagnosis].push(entry.id);
      }
    });
  }

  private tokenize(text: string): string[] {
    return this.normalizeText(text)
      .split(/\s+/)
      .filter(term => term.length > 2 && !this.stopWords.has(term));
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractSymptoms(entry: KnowledgeEntry): string[] {
    const symptoms: string[] = [];
    
    // Padrões comuns de sintomas em português
    const symptomPatterns = [
      /dor\s+(?:em|no|na|nos|nas)\s+[\w\s]+/gi,
      /(?:sente|sinto|relata)\s+[\w\s]+/gi,
      /(?:rigidez|tensão|fraqueza|dormência)\s+(?:em|no|na|nos|nas)?\s*[\w\s]*/gi,
      /(?:limitação|redução)\s+(?:de|do|da)\s+[\w\s]+/gi,
      /(?:inchaço|edema|inflamação)\s+(?:em|no|na|nos|nas)?\s*[\w\s]*/gi
    ];

    const text = `${entry.content} ${entry.title}`;
    
    symptomPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        symptoms.push(...matches.map(match => match.trim()));
      }
    });

    // Adicionar condições como sintomas potenciais
    symptoms.push(...entry.conditions);

    return [...new Set(symptoms)]; // Remove duplicatas
  }

  private extractDiagnoses(entry: KnowledgeEntry): string[] {
    const diagnoses: string[] = [];
    
    // Padrões comuns de diagnósticos
    const diagnosisPatterns = [
      /(?:diagnóstico|diagnose|dx):\s*([^.]+)/gi,
      /(?:síndrome|lesão|patologia)\s+(?:de|do|da)?\s*[\w\s]+/gi,
      /(?:tendinite|bursite|artrite|artrose|hérnia|protrusão|ruptura)\s+[\w\s]*/gi
    ];

    const text = `${entry.content} ${entry.title}`;
    
    diagnosisPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        diagnoses.push(...matches.map(match => match.trim()));
      }
    });

    // Adicionar condições como diagnósticos potenciais
    diagnoses.push(...entry.conditions);

    return [...new Set(diagnoses)]; // Remove duplicatas
  }

  private calculateTermScore(term: string, entryRef: any, entry: KnowledgeEntry): number {
    let score = 0;

    // Score base pela frequência do termo
    score += Math.log(entryRef.frequency + 1) * 0.1;

    // Bonus se o termo aparece no título
    if (this.normalizeText(entry.title).includes(term)) {
      score += 0.3;
    }

    // Bonus se o termo aparece nas tags
    if (entry.tags.some(tag => this.normalizeText(tag).includes(term))) {
      score += 0.2;
    }

    // Bonus se o termo aparece no resumo
    if (this.normalizeText(entry.summary).includes(term)) {
      score += 0.15;
    }

    // Bonus pela posição (termos no início são mais importantes)
    const avgPosition = entryRef.positions.reduce((sum: number, pos: number) => sum + pos, 0) / entryRef.positions.length;
    const positionBonus = Math.max(0, 0.1 - (avgPosition / 1000));
    score += positionBonus;

    return score;
  }

  // Métodos para estatísticas
  getIndexStats(): {
    totalTerms: number;
    totalEntries: number;
    avgTermsPerEntry: number;
    topTerms: Array<{ term: string; frequency: number }>;
  } {
    const totalTerms = Object.keys(this.textIndex).length;
    const totalEntries = this.entries.size;
    
    // Calcular frequência total de cada termo
    const termFrequencies = Object.entries(this.textIndex).map(([term, data]) => ({
      term,
      frequency: data.entries.reduce((sum, entry) => sum + entry.frequency, 0)
    }));

    const topTerms = termFrequencies
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    return {
      totalTerms,
      totalEntries,
      avgTermsPerEntry: totalEntries > 0 ? totalTerms / totalEntries : 0,
      topTerms
    };
  }
}