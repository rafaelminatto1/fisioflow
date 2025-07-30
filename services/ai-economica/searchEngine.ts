// services/ai-economica/searchEngine.ts
// Motor de busca inteligente para a base de conhecimento

import { KnowledgeEntry, KnowledgeResult } from '../../types/ai-economica.types'
import { aiLogger } from './logger'

interface SearchIndex {
  [term: string]: {
    entries: Array<{
      entryId: string
      frequency: number
      positions: number[]
      fieldWeights: {
        title: number
        content: number
        tags: number
        conditions: number
        techniques: number
      }
    }>
  }
}

interface SymptomIndex {
  [symptom: string]: string[] // entryIds
}

interface DiagnosisIndex {
  [diagnosis: string]: string[] // entryIds
}

export class SearchEngine {
  private textIndex: SearchIndex = {}
  private symptomIndex: SymptomIndex = {}
  private diagnosisIndex: DiagnosisIndex = {}
  private entries: Map<string, KnowledgeEntry> = new Map()
  
  private stopWords = new Set([
    // Português
    'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
    'para', 'por', 'com', 'sem', 'sob', 'sobre', 'entre', 'durante',
    'e', 'ou', 'mas', 'que', 'se', 'quando', 'onde', 'como', 'porque',
    'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
    'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo',
    'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas',
    'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
    'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas',
    'ser', 'estar', 'ter', 'haver', 'fazer', 'ir', 'vir', 'dar',
    'muito', 'mais', 'menos', 'bem', 'mal', 'melhor', 'pior',
    'já', 'ainda', 'só', 'também', 'então', 'assim', 'aqui', 'ali',
    'hoje', 'ontem', 'amanhã', 'agora', 'depois', 'antes', 'sempre', 'nunca'
  ])

  // Pesos para diferentes campos na busca
  private fieldWeights = {
    title: 3.0,
    tags: 2.5,
    conditions: 2.0,
    techniques: 2.0,
    content: 1.0,
    summary: 1.5
  }

  constructor() {
    aiLogger.info('SEARCH_ENGINE', 'Motor de busca inicializado')
  }

  // Indexar uma entrada de conhecimento
  async index(entry: KnowledgeEntry): Promise<void> {
    try {
      this.entries.set(entry.id, entry)
      
      // Indexar texto
      await this.indexText(entry)
      
      // Indexar sintomas/condições
      await this.indexSymptoms(entry)
      
      // Indexar diagnósticos
      await this.indexDiagnosis(entry)
      
      aiLogger.debug('SEARCH_ENGINE', `Entrada indexada: ${entry.id}`, {
        entryId: entry.id,
        title: entry.title,
        type: entry.type
      })
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', `Erro ao indexar entrada ${entry.id}`, { error })
    }
  }

  // Atualizar índice de uma entrada
  async updateIndex(entry: KnowledgeEntry): Promise<void> {
    await this.removeFromIndex(entry.id)
    await this.index(entry)
  }

  // Remover entrada do índice
  async removeFromIndex(entryId: string): Promise<void> {
    try {
      // Remover do índice de texto
      Object.keys(this.textIndex).forEach(term => {
        this.textIndex[term].entries = this.textIndex[term].entries.filter(
          e => e.entryId !== entryId
        )
        if (this.textIndex[term].entries.length === 0) {
          delete this.textIndex[term]
        }
      })

      // Remover do índice de sintomas
      Object.keys(this.symptomIndex).forEach(symptom => {
        this.symptomIndex[symptom] = this.symptomIndex[symptom].filter(
          id => id !== entryId
        )
        if (this.symptomIndex[symptom].length === 0) {
          delete this.symptomIndex[symptom]
        }
      })

      // Remover do índice de diagnósticos
      Object.keys(this.diagnosisIndex).forEach(diagnosis => {
        this.diagnosisIndex[diagnosis] = this.diagnosisIndex[diagnosis].filter(
          id => id !== entryId
        )
        if (this.diagnosisIndex[diagnosis].length === 0) {
          delete this.diagnosisIndex[diagnosis]
        }
      })

      // Remover da coleção de entradas
      this.entries.delete(entryId)

      aiLogger.debug('SEARCH_ENGINE', `Entrada removida do índice: ${entryId}`)
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', `Erro ao remover entrada do índice: ${entryId}`, { error })
    }
  }

  // Busca por texto
  async searchByText(query: string, tenantId?: string): Promise<KnowledgeResult[]> {
    try {
      const startTime = Date.now()
      const terms = this.tokenize(query)
      const results = new Map<string, number>()
      const matchedTerms = new Map<string, string[]>()

      // Buscar cada termo
      for (const term of terms) {
        const termResults = this.searchTerm(term)
        
        termResults.forEach(({ entryId, score, matchedTerm }) => {
          const currentScore = results.get(entryId) || 0
          results.set(entryId, currentScore + score)
          
          if (!matchedTerms.has(entryId)) {
            matchedTerms.set(entryId, [])
          }
          matchedTerms.get(entryId)!.push(matchedTerm)
        })
      }

      // Converter para KnowledgeResult
      const knowledgeResults: KnowledgeResult[] = []
      
      for (const [entryId, score] of results.entries()) {
        const entry = this.entries.get(entryId)
        if (entry && (!tenantId || entry.tenantId === tenantId)) {
          knowledgeResults.push({
            entry,
            relevanceScore: score,
            matchedTerms: matchedTerms.get(entryId) || []
          })
        }
      }

      // Ordenar por relevância
      knowledgeResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

      const responseTime = Date.now() - startTime
      aiLogger.info('SEARCH_ENGINE', `Busca por texto concluída`, {
        query,
        resultsCount: knowledgeResults.length,
        responseTime,
        tenantId
      })

      return knowledgeResults.slice(0, 50) // Limitar a 50 resultados
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', 'Erro na busca por texto', { query, error })
      return []
    }
  }

  // Busca por sintomas
  async searchBySymptoms(symptoms: string[], tenantId?: string): Promise<KnowledgeResult[]> {
    try {
      const results = new Map<string, number>()
      const matchedTerms = new Map<string, string[]>()

      for (const symptom of symptoms) {
        const normalizedSymptom = this.normalize(symptom)
        const entryIds = this.symptomIndex[normalizedSymptom] || []
        
        entryIds.forEach(entryId => {
          const entry = this.entries.get(entryId)
          if (entry && (!tenantId || entry.tenantId === tenantId)) {
            const currentScore = results.get(entryId) || 0
            results.set(entryId, currentScore + 2.0) // Peso alto para sintomas
            
            if (!matchedTerms.has(entryId)) {
              matchedTerms.set(entryId, [])
            }
            matchedTerms.get(entryId)!.push(symptom)
          }
        })
      }

      const knowledgeResults: KnowledgeResult[] = []
      
      for (const [entryId, score] of results.entries()) {
        const entry = this.entries.get(entryId)
        if (entry) {
          knowledgeResults.push({
            entry,
            relevanceScore: score,
            matchedTerms: matchedTerms.get(entryId) || []
          })
        }
      }

      knowledgeResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

      aiLogger.info('SEARCH_ENGINE', `Busca por sintomas concluída`, {
        symptoms,
        resultsCount: knowledgeResults.length,
        tenantId
      })

      return knowledgeResults
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', 'Erro na busca por sintomas', { symptoms, error })
      return []
    }
  }

  // Busca por diagnóstico
  async searchByDiagnosis(diagnosis: string, tenantId?: string): Promise<KnowledgeResult[]> {
    try {
      const normalizedDiagnosis = this.normalize(diagnosis)
      const entryIds = this.diagnosisIndex[normalizedDiagnosis] || []
      const results: KnowledgeResult[] = []

      entryIds.forEach(entryId => {
        const entry = this.entries.get(entryId)
        if (entry && (!tenantId || entry.tenantId === tenantId)) {
          results.push({
            entry,
            relevanceScore: 3.0, // Peso muito alto para diagnóstico exato
            matchedTerms: [diagnosis]
          })
        }
      })

      results.sort((a, b) => b.relevanceScore - a.relevanceScore)

      aiLogger.info('SEARCH_ENGINE', `Busca por diagnóstico concluída`, {
        diagnosis,
        resultsCount: results.length,
        tenantId
      })

      return results
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', 'Erro na busca por diagnóstico', { diagnosis, error })
      return []
    }
  }

  // Reconstruir índice completo
  async rebuildIndex(entries: KnowledgeEntry[]): Promise<void> {
    try {
      aiLogger.info('SEARCH_ENGINE', 'Iniciando reconstrução do índice')
      
      // Limpar índices existentes
      this.textIndex = {}
      this.symptomIndex = {}
      this.diagnosisIndex = {}
      this.entries.clear()

      // Reindexar todas as entradas
      for (const entry of entries) {
        await this.index(entry)
      }

      aiLogger.info('SEARCH_ENGINE', `Índice reconstruído com ${entries.length} entradas`)
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', 'Erro ao reconstruir índice', { error })
    }
  }

  // Métodos privados

  private async indexText(entry: KnowledgeEntry): Promise<void> {
    const fields = {
      title: entry.title,
      content: entry.content,
      summary: entry.summary,
      tags: entry.tags.join(' '),
      conditions: entry.conditions.join(' '),
      techniques: entry.techniques.join(' ')
    }

    Object.entries(fields).forEach(([fieldName, fieldValue]) => {
      if (fieldValue) {
        const terms = this.tokenize(fieldValue)
        const termFrequency = new Map<string, number>()
        
        // Contar frequência dos termos
        terms.forEach(term => {
          termFrequency.set(term, (termFrequency.get(term) || 0) + 1)
        })

        // Indexar cada termo único
        termFrequency.forEach((frequency, term) => {
          if (!this.textIndex[term]) {
            this.textIndex[term] = { entries: [] }
          }

          // Encontrar posições do termo
          const positions = this.findTermPositions(fieldValue, term)
          
          // Calcular peso do campo
          const fieldWeight = this.fieldWeights[fieldName as keyof typeof this.fieldWeights] || 1.0

          this.textIndex[term].entries.push({
            entryId: entry.id,
            frequency,
            positions,
            fieldWeights: {
              title: fieldName === 'title' ? fieldWeight : 0,
              content: fieldName === 'content' ? fieldWeight : 0,
              tags: fieldName === 'tags' ? fieldWeight : 0,
              conditions: fieldName === 'conditions' ? fieldWeight : 0,
              techniques: fieldName === 'techniques' ? fieldWeight : 0
            }
          })
        })
      }
    })
  }

  private async indexSymptoms(entry: KnowledgeEntry): Promise<void> {
    entry.conditions.forEach(condition => {
      const normalizedCondition = this.normalize(condition)
      if (!this.symptomIndex[normalizedCondition]) {
        this.symptomIndex[normalizedCondition] = []
      }
      if (!this.symptomIndex[normalizedCondition].includes(entry.id)) {
        this.symptomIndex[normalizedCondition].push(entry.id)
      }
    })
  }

  private async indexDiagnosis(entry: KnowledgeEntry): Promise<void> {
    // Indexar condições como possíveis diagnósticos
    entry.conditions.forEach(condition => {
      const normalizedCondition = this.normalize(condition)
      if (!this.diagnosisIndex[normalizedCondition]) {
        this.diagnosisIndex[normalizedCondition] = []
      }
      if (!this.diagnosisIndex[normalizedCondition].includes(entry.id)) {
        this.diagnosisIndex[normalizedCondition].push(entry.id)
      }
    })

    // Também indexar tags que podem ser diagnósticos
    entry.tags.forEach(tag => {
      const normalizedTag = this.normalize(tag)
      if (!this.diagnosisIndex[normalizedTag]) {
        this.diagnosisIndex[normalizedTag] = []
      }
      if (!this.diagnosisIndex[normalizedTag].includes(entry.id)) {
        this.diagnosisIndex[normalizedTag].push(entry.id)
      }
    })
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ') // Manter acentos
      .split(/\s+/)
      .map(term => this.normalize(term))
      .filter(term => term.length > 2 && !this.stopWords.has(term))
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos para normalização
      .trim()
  }

  private findTermPositions(text: string, term: string): number[] {
    const positions: number[] = []
    const normalizedText = this.normalize(text)
    const normalizedTerm = this.normalize(term)
    
    let index = normalizedText.indexOf(normalizedTerm)
    while (index !== -1) {
      positions.push(index)
      index = normalizedText.indexOf(normalizedTerm, index + 1)
    }
    
    return positions
  }

  private searchTerm(term: string): Array<{ entryId: string; score: number; matchedTerm: string }> {
    const results: Array<{ entryId: string; score: number; matchedTerm: string }> = []
    const normalizedTerm = this.normalize(term)

    // Busca exata
    if (this.textIndex[normalizedTerm]) {
      this.textIndex[normalizedTerm].entries.forEach(entry => {
        const score = this.calculateTermScore(entry)
        results.push({
          entryId: entry.entryId,
          score,
          matchedTerm: term
        })
      })
    }

    // Busca fuzzy (termos similares)
    const fuzzyMatches = this.findFuzzyMatches(normalizedTerm)
    fuzzyMatches.forEach(({ term: fuzzyTerm, similarity }) => {
      if (this.textIndex[fuzzyTerm]) {
        this.textIndex[fuzzyTerm].entries.forEach(entry => {
          const baseScore = this.calculateTermScore(entry)
          const fuzzyScore = baseScore * similarity * 0.7 // Penalizar busca fuzzy
          
          // Evitar duplicatas
          const existingResult = results.find(r => r.entryId === entry.entryId)
          if (!existingResult) {
            results.push({
              entryId: entry.entryId,
              score: fuzzyScore,
              matchedTerm: fuzzyTerm
            })
          }
        })
      }
    })

    return results
  }

  private calculateTermScore(entry: {
    frequency: number
    fieldWeights: {
      title: number
      content: number
      tags: number
      conditions: number
      techniques: number
    }
  }): number {
    const { frequency, fieldWeights } = entry
    
    // TF (Term Frequency) com log scaling
    const tf = 1 + Math.log(frequency)
    
    // Peso dos campos
    const fieldWeight = Math.max(
      fieldWeights.title,
      fieldWeights.content,
      fieldWeights.tags,
      fieldWeights.conditions,
      fieldWeights.techniques
    )
    
    return tf * fieldWeight
  }

  private findFuzzyMatches(term: string, maxDistance = 2): Array<{ term: string; similarity: number }> {
    const matches: Array<{ term: string; similarity: number }> = []
    
    Object.keys(this.textIndex).forEach(indexedTerm => {
      if (indexedTerm !== term) {
        const distance = this.levenshteinDistance(term, indexedTerm)
        const maxLength = Math.max(term.length, indexedTerm.length)
        const similarity = 1 - (distance / maxLength)
        
        if (distance <= maxDistance && similarity > 0.6) {
          matches.push({ term: indexedTerm, similarity })
        }
      }
    })
    
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5)
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // Métodos de estatísticas e debug
  getIndexStats(): {
    totalTerms: number
    totalEntries: number
    avgTermsPerEntry: number
    topTerms: Array<{ term: string; frequency: number }>
  } {
    const totalTerms = Object.keys(this.textIndex).length
    const totalEntries = this.entries.size
    
    const termFrequencies = Object.entries(this.textIndex).map(([term, data]) => ({
      term,
      frequency: data.entries.reduce((sum, entry) => sum + entry.frequency, 0)
    }))
    
    const topTerms = termFrequencies
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
    
    return {
      totalTerms,
      totalEntries,
      avgTermsPerEntry: totalEntries > 0 ? totalTerms / totalEntries : 0,
      topTerms
    }
  }
}
    // Inglês
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'she', 'they', 'we', 'you', 'have'
  ])

  async index(entry: KnowledgeEntry): Promise<void> {
    try {
      // Armazenar entrada
      this.entries.set(entry.id, entry)

      // Indexar texto
      await this.indexText(entry)
      
      // Indexar sintomas/condições
      await this.indexSymptoms(entry)
      
      // Indexar diagnósticos
      await this.indexDiagnoses(entry)

      aiLogger.debug('SEARCH_ENGINE', `Entrada indexada: ${entry.id}`, {
        entryId: entry.id,
        title: entry.title,
        type: entry.type
      })
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', `Erro ao indexar entrada ${entry.id}`, error)
      throw error
    }
  }

  private async indexText(entry: KnowledgeEntry): Promise<void> {
    // Campos para indexar com pesos diferentes
    const fields = {
      title: { text: entry.title, weight: 3.0 },
      content: { text: entry.content, weight: 1.0 },
      tags: { text: entry.tags.join(' '), weight: 2.0 },
      conditions: { text: entry.conditions.join(' '), weight: 1.5 },
      techniques: { text: entry.techniques.join(' '), weight: 1.5 }
    }

    for (const [fieldName, fieldData] of Object.entries(fields)) {
      const terms = this.tokenize(fieldData.text)
      
      terms.forEach((term, position) => {
        if (!this.textIndex[term]) {
          this.textIndex[term] = { entries: [] }
        }

        let entryIndex = this.textIndex[term].entries.find(e => e.entryId === entry.id)
        
        if (!entryIndex) {
          entryIndex = {
            entryId: entry.id,
            frequency: 0,
            positions: [],
            fieldWeights: {
              title: 0,
              content: 0,
              tags: 0,
              conditions: 0,
              techniques: 0
            }
          }
          this.textIndex[term].entries.push(entryIndex)
        }

        entryIndex.frequency++
        entryIndex.positions.push(position)
        entryIndex.fieldWeights[fieldName as keyof typeof entryIndex.fieldWeights] += fieldData.weight
      })
    }
  }

  private async indexSymptoms(entry: KnowledgeEntry): Promise<void> {
    // Indexar condições como sintomas
    entry.conditions.forEach(condition => {
      const normalizedCondition = this.normalizeText(condition)
      if (!this.symptomIndex[normalizedCondition]) {
        this.symptomIndex[normalizedCondition] = []
      }
      if (!this.symptomIndex[normalizedCondition].includes(entry.id)) {
        this.symptomIndex[normalizedCondition].push(entry.id)
      }
    })

    // Extrair possíveis sintomas do conteúdo
    const symptomKeywords = [
      'dor', 'pain', 'rigidez', 'stiffness', 'inflamação', 'inflammation',
      'edema', 'swelling', 'fraqueza', 'weakness', 'dormência', 'numbness',
      'formigamento', 'tingling', 'espasmo', 'spasm', 'contratura', 'contracture',
      'limitação', 'limitation', 'instabilidade', 'instability'
    ]

    const contentWords = this.tokenize(entry.content.toLowerCase())
    symptomKeywords.forEach(keyword => {
      if (contentWords.includes(keyword)) {
        if (!this.symptomIndex[keyword]) {
          this.symptomIndex[keyword] = []
        }
        if (!this.symptomIndex[keyword].includes(entry.id)) {
          this.symptomIndex[keyword].push(entry.id)
        }
      }
    })
  }

  private async indexDiagnoses(entry: KnowledgeEntry): Promise<void> {
    // Indexar condições como diagnósticos
    entry.conditions.forEach(condition => {
      const normalizedCondition = this.normalizeText(condition)
      if (!this.diagnosisIndex[normalizedCondition]) {
        this.diagnosisIndex[normalizedCondition] = []
      }
      if (!this.diagnosisIndex[normalizedCondition].includes(entry.id)) {
        this.diagnosisIndex[normalizedCondition].push(entry.id)
      }
    })

    // Extrair diagnósticos do título e conteúdo
    const diagnosisKeywords = [
      'lombalgia', 'cervicalgia', 'dorsalgia', 'ciática', 'hérnia',
      'artrose', 'artrite', 'tendinite', 'bursite', 'fascite',
      'fibromialgia', 'escoliose', 'cifose', 'lordose', 'espondilose',
      'avc', 'parkinson', 'alzheimer', 'esclerose', 'paralisia'
    ]

    const allText = (entry.title + ' ' + entry.content).toLowerCase()
    const words = this.tokenize(allText)
    
    diagnosisKeywords.forEach(diagnosis => {
      if (words.includes(diagnosis)) {
        if (!this.diagnosisIndex[diagnosis]) {
          this.diagnosisIndex[diagnosis] = []
        }
        if (!this.diagnosisIndex[diagnosis].includes(entry.id)) {
          this.diagnosisIndex[diagnosis].push(entry.id)
        }
      }
    })
  }

  async searchByText(query: string, tenantId?: string): Promise<KnowledgeResult[]> {
    try {
      const terms = this.tokenize(query)
      if (terms.length === 0) return []

      const results = new Map<string, {
        entry: KnowledgeEntry
        score: number
        matchedTerms: string[]
      }>()

      // Buscar cada termo
      terms.forEach(term => {
        const indexEntry = this.textIndex[term]
        if (!indexEntry) return

        indexEntry.entries.forEach(entryData => {
          const entry = this.entries.get(entryData.entryId)
          if (!entry || (tenantId && entry.tenantId !== tenantId)) return

          const termScore = this.calculateTermScore(entryData, terms.length)
          
          if (!results.has(entry.id)) {
            results.set(entry.id, {
              entry,
              score: 0,
              matchedTerms: []
            })
          }

          const result = results.get(entry.id)!
          result.score += termScore
          if (!result.matchedTerms.includes(term)) {
            result.matchedTerms.push(term)
          }
        })
      })

      // Converter para array e ordenar por relevância
      const sortedResults = Array.from(results.values())
        .map(result => ({
          entry: result.entry,
          relevanceScore: this.normalizeScore(result.score, result.matchedTerms.length, terms.length),
          matchedTerms: result.matchedTerms
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 50) // Limitar a 50 resultados

      aiLogger.debug('SEARCH_ENGINE', `Busca por texto: "${query}"`, {
        query,
        termsCount: terms.length,
        resultsCount: sortedResults.length,
        topScore: sortedResults[0]?.relevanceScore || 0
      })

      return sortedResults
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', `Erro na busca por texto: "${query}"`, error)
      return []
    }
  }

  async searchBySymptoms(symptoms: string[], tenantId?: string): Promise<KnowledgeResult[]> {
    try {
      const results = new Map<string, {
        entry: KnowledgeEntry
        matchCount: number
        matchedTerms: string[]
      }>()

      symptoms.forEach(symptom => {
        const normalizedSymptom = this.normalizeText(symptom)
        const entryIds = this.symptomIndex[normalizedSymptom] || []

        entryIds.forEach(entryId => {
          const entry = this.entries.get(entryId)
          if (!entry || (tenantId && entry.tenantId !== tenantId)) return

          if (!results.has(entryId)) {
            results.set(entryId, {
              entry,
              matchCount: 0,
              matchedTerms: []
            })
          }

          const result = results.get(entryId)!
          result.matchCount++
          result.matchedTerms.push(symptom)
        })
      })

      const sortedResults = Array.from(results.values())
        .map(result => ({
          entry: result.entry,
          relevanceScore: result.matchCount / symptoms.length, // Porcentagem de sintomas encontrados
          matchedTerms: result.matchedTerms
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 30)

      aiLogger.debug('SEARCH_ENGINE', `Busca por sintomas: ${symptoms.join(', ')}`, {
        symptoms,
        resultsCount: sortedResults.length
      })

      return sortedResults
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', `Erro na busca por sintomas: ${symptoms.join(', ')}`, error)
      return []
    }
  }

  async searchByDiagnosis(diagnosis: string, tenantId?: string): Promise<KnowledgeResult[]> {
    try {
      const normalizedDiagnosis = this.normalizeText(diagnosis)
      const entryIds = this.diagnosisIndex[normalizedDiagnosis] || []

      const results = entryIds
        .map(entryId => this.entries.get(entryId))
        .filter(entry => entry && (!tenantId || entry.tenantId === tenantId))
        .map(entry => ({
          entry: entry!,
          relevanceScore: 1.0, // Score máximo para match exato de diagnóstico
          matchedTerms: [diagnosis]
        }))
        .sort((a, b) => b.entry.confidence - a.entry.confidence) // Ordenar por confiança
        .slice(0, 20)

      aiLogger.debug('SEARCH_ENGINE', `Busca por diagnóstico: "${diagnosis}"`, {
        diagnosis,
        resultsCount: results.length
      })

      return results
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', `Erro na busca por diagnóstico: "${diagnosis}"`, error)
      return []
    }
  }

  async updateIndex(entry: KnowledgeEntry): Promise<void> {
    // Remover entrada antiga do índice
    await this.removeFromIndex(entry.id)
    
    // Reindexar entrada atualizada
    await this.index(entry)
  }

  async removeFromIndex(entryId: string): Promise<void> {
    try {
      // Remover da coleção de entradas
      this.entries.delete(entryId)

      // Remover do índice de texto
      Object.keys(this.textIndex).forEach(term => {
        this.textIndex[term].entries = this.textIndex[term].entries.filter(
          entry => entry.entryId !== entryId
        )
        
        // Remover termo se não há mais entradas
        if (this.textIndex[term].entries.length === 0) {
          delete this.textIndex[term]
        }
      })

      // Remover do índice de sintomas
      Object.keys(this.symptomIndex).forEach(symptom => {
        this.symptomIndex[symptom] = this.symptomIndex[symptom].filter(
          id => id !== entryId
        )
        
        if (this.symptomIndex[symptom].length === 0) {
          delete this.symptomIndex[symptom]
        }
      })

      // Remover do índice de diagnósticos
      Object.keys(this.diagnosisIndex).forEach(diagnosis => {
        this.diagnosisIndex[diagnosis] = this.diagnosisIndex[diagnosis].filter(
          id => id !== entryId
        )
        
        if (this.diagnosisIndex[diagnosis].length === 0) {
          delete this.diagnosisIndex[diagnosis]
        }
      })

      aiLogger.debug('SEARCH_ENGINE', `Entrada removida do índice: ${entryId}`)
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', `Erro ao remover entrada do índice: ${entryId}`, error)
      throw error
    }
  }

  async rebuildIndex(entries: KnowledgeEntry[]): Promise<void> {
    try {
      // Limpar índices
      this.textIndex = {}
      this.symptomIndex = {}
      this.diagnosisIndex = {}
      this.entries.clear()

      // Reindexar todas as entradas
      for (const entry of entries) {
        await this.index(entry)
      }

      aiLogger.info('SEARCH_ENGINE', `Índice reconstruído com ${entries.length} entradas`)
    } catch (error) {
      aiLogger.error('SEARCH_ENGINE', 'Erro ao reconstruir índice', error)
      throw error
    }
  }

  // Métodos utilitários
  private tokenize(text: string): string[] {
    return this.normalizeText(text)
      .split(/\s+/)
      .filter(term => term.length > 2 && !this.stopWords.has(term))
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
  }

  private calculateTermScore(entryData: any, totalTerms: number): number {
    // TF-IDF simplificado
    const tf = entryData.frequency / 100 // Normalizar frequência
    const idf = Math.log(this.entries.size / (this.textIndex[Object.keys(this.textIndex)[0]]?.entries.length || 1))
    
    // Peso dos campos
    const fieldWeight = Object.values(entryData.fieldWeights).reduce((sum: number, weight: number) => sum + weight, 0)
    
    return tf * idf * fieldWeight
  }

  private normalizeScore(score: number, matchedTerms: number, totalTerms: number): number {
    // Normalizar score considerando cobertura de termos
    const coverage = matchedTerms / totalTerms
    return score * coverage
  }

  // Métodos para estatísticas
  getIndexStats(): {
    totalEntries: number
    totalTerms: number
    totalSymptoms: number
    totalDiagnoses: number
    averageTermsPerEntry: number
  } {
    const totalTerms = Object.keys(this.textIndex).length
    const totalSymptoms = Object.keys(this.symptomIndex).length
    const totalDiagnoses = Object.keys(this.diagnosisIndex).length
    const totalEntries = this.entries.size

    return {
      totalEntries,
      totalTerms,
      totalSymptoms,
      totalDiagnoses,
      averageTermsPerEntry: totalEntries > 0 ? totalTerms / totalEntries : 0
    }
  }

  // Busca fuzzy para termos similares
  findSimilarTerms(term: string, maxDistance: number = 2): string[] {
    const normalizedTerm = this.normalizeText(term)
    const similarTerms: string[] = []

    Object.keys(this.textIndex).forEach(indexTerm => {
      if (this.levenshteinDistance(normalizedTerm, indexTerm) <= maxDistance) {
        similarTerms.push(indexTerm)
      }
    })

    return similarTerms.slice(0, 10) // Limitar a 10 termos similares
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }
}

export default SearchEngine