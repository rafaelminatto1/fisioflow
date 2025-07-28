import { GoogleGenerativeAI } from '@google/generative-ai';

import type { Patient } from '../types';

import { aiCache } from './aiCache';

const getGeminiInstance = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                process.env.VITE_GEMINI_API_KEY || 
                localStorage.getItem('GEMINI_API_KEY') || '';
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada. Configure a chave da API.');
  }
  
  return new GoogleGenerativeAI(apiKey);
};

export interface TextAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  extractedEntities: MedicalEntity[];
  keyFindings: Finding[];
  consistencyChecks: ConsistencyCheck[];
  completenessScore: number; // 0 to 100
  suggestions: Suggestion[];
  qualityMetrics: QualityMetrics;
}

export interface MedicalEntity {
  type: 'symptom' | 'medication' | 'procedure' | 'anatomy' | 'measurement' | 'timeline';
  text: string;
  confidence: number;
  context: string;
  normalizedValue?: string;
}

export interface Finding {
  category: 'improvement' | 'deterioration' | 'stability' | 'concern' | 'achievement';
  description: string;
  confidence: number;
  evidence: string[];
  recommendations?: string[];
}

export interface ConsistencyCheck {
  type: 'temporal' | 'logical' | 'clinical' | 'terminology';
  status: 'consistent' | 'inconsistent' | 'warning';
  description: string;
  conflictingElements?: string[];
  suggestions?: string[];
}

export interface Suggestion {
  type: 'content' | 'structure' | 'terminology' | 'completeness';
  priority: 'high' | 'medium' | 'low';
  description: string;
  suggestedText?: string;
  rationale: string;
}

export interface QualityMetrics {
  readability: number; // 0-100
  technicalAccuracy: number; // 0-100
  completeness: number; // 0-100
  professionalism: number; // 0-100
  overallScore: number; // 0-100
}

/**
 * Analyzes clinical text for patterns, sentiment, and quality.
 * @param text Clinical text to analyze
 * @param context Type of document and patient context
 * @returns Comprehensive text analysis results
 */
export async function analyzeClinicalText(
  text: string,
  context: {
    documentType: 'progress' | 'assessment' | 'prescription' | 'report';
    patientId?: string;
    previousTexts?: string[];
  },
  userId = 'anonymous'
): Promise<TextAnalysisResult> {
  const cacheKey = `analysis_${context.documentType}_${text.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, text, userId);
    if (cached) {
      console.log('🔬 Retornando análise de texto do cache (economia ~$0.05)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Analyzing clinical text (custo ~$0.05): ${context.documentType}`);
  
  try {
    const systemInstruction = `Você é um especialista em análise de textos clínicos fisioterapêuticos.
    Analise o texto fornecido de forma abrangente, identificando:
    
    1. Sentimento geral (progresso do paciente)
    2. Entidades médicas mencionadas 
    3. Achados clínicos importantes
    4. Inconsistências ou problemas
    5. Qualidade da documentação
    6. Sugestões de melhoria
    
    Forneça uma análise objetiva e clinicamente relevante.`;

    const analysisPrompt = `Analise este texto clínico de ${context.documentType}:

"${text}"

${context.previousTexts ? `\nTextos anteriores para comparação:\n${context.previousTexts.join('\n---\n')}` : ''}

Retorne um JSON completo seguindo a estrutura TextAnalysisResult com:
- Análise de sentimento sobre a evolução do paciente
- Entidades médicas extraídas (sintomas, medicamentos, procedimentos, etc.)
- Principais achados clínicos
- Verificações de consistência
- Métricas de qualidade do texto
- Sugestões específicas de melhoria

Seja preciso e clinicamente relevante em todas as análises.`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(analysisPrompt);
    const result = await response.response;
    const jsonText = result.text().trim();
    
    const analysisResult = JSON.parse(jsonText);
    
    // Valida e complementa o resultado se necessário
    const completeResult: TextAnalysisResult = {
      sentiment: analysisResult.sentiment || 'neutral',
      sentimentScore: analysisResult.sentimentScore || 0,
      extractedEntities: analysisResult.extractedEntities || [],
      keyFindings: analysisResult.keyFindings || [],
      consistencyChecks: analysisResult.consistencyChecks || [],
      completenessScore: analysisResult.completenessScore || 50,
      suggestions: analysisResult.suggestions || [],
      qualityMetrics: analysisResult.qualityMetrics || {
        readability: 70,
        technicalAccuracy: 70,
        completeness: 50,
        professionalism: 70,
        overallScore: 65
      }
    };

    aiCache.set(cacheKey, text, JSON.stringify(completeResult));
    return completeResult;
  } catch (error) {
    console.error('Error analyzing clinical text:', error);
    throw new Error('Falha na análise do texto clínico.');
  }
}

/**
 * Extracts relevant information from clinical reports and documents.
 * @param documentText Text from external reports or documents
 * @param extractionTargets Specific information to extract
 * @returns Structured extracted information
 */
export async function extractRelevantInformation(
  documentText: string,
  extractionTargets: string[],
  userId = 'anonymous'
): Promise<{
  extractedData: Record<string, any>;
  confidence: number;
  missingInformation: string[];
}> {
  const cacheKey = `extract_info_${extractionTargets.join('_')}_${documentText.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, documentText, userId);
    if (cached) {
      console.log('📊 Retornando extração de informações do cache (economia ~$0.04)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Extracting relevant information (custo ~$0.04)`);
  
  try {
    const systemInstruction = `Você é um especialista em extração de informações de documentos médicos.
    Extraia informações específicas e relevantes do texto fornecido.
    
    Seja preciso e extraia apenas informações explicitamente mencionadas.
    Quando uma informação não estiver disponível, marque como "não informado".
    Avalie sua confiança na extração de cada informação.`;

    const extractionPrompt = `Extraia as seguintes informações do documento:

Informações desejadas:
${extractionTargets.map(target => `- ${target}`).join('\n')}

Documento para análise:
"${documentText}"

Retorne JSON com:
{
  "extractedData": {
    "informação_1": "valor extraído ou 'não informado'",
    "informação_2": "valor extraído ou 'não informado'"
  },
  "confidence": 85,
  "missingInformation": ["informações que não foram encontradas"],
  "extractionDetails": {
    "informação_1": {
      "value": "valor",
      "confidence": 90,
      "sourceText": "trecho do texto onde foi encontrado"
    }
  }
}`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(extractionPrompt);
    const result = await response.response;
    const extractionResult = JSON.parse(result.text().trim());

    aiCache.set(cacheKey, documentText, JSON.stringify(extractionResult));
    return extractionResult;
  } catch (error) {
    console.error('Error extracting relevant information:', error);
    throw new Error('Falha na extração de informações relevantes.');
  }
}

/**
 * Identifies patterns and trends across multiple patient documents.
 * @param documents Array of patient documents/texts
 * @param patientContext Patient information
 * @returns Pattern analysis results
 */
export async function identifyPatterns(
  documents: Array<{
    text: string;
    date: string;
    type: string;
  }>,
  patientContext: Patient,
  userId = 'anonymous'
): Promise<{
  trends: Trend[];
  patterns: Pattern[];
  anomalies: Anomaly[];
  insights: PatternInsight[];
}> {
  const cacheKey = `patterns_${patientContext.id}_${documents.length}`;
  
  try {
    const cached = aiCache.get(cacheKey, JSON.stringify(documents), userId);
    if (cached) {
      console.log('📈 Retornando análise de padrões do cache (economia ~$0.06)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Identifying patterns (custo ~$0.06): ${patientContext.name}`);
  
  try {
    const systemInstruction = `Você é um especialista em análise de padrões clínicos longitudinais.
    Analise uma série de documentos do paciente ao longo do tempo para identificar:
    
    1. Tendências de melhora ou piora
    2. Padrões recorrentes de sintomas
    3. Anomalias ou eventos incomuns
    4. Insights clínicos relevantes
    
    Considere a cronologia e evolução temporal dos dados.`;

    const documentsData = documents
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(doc => `[${doc.date}] ${doc.type}: ${doc.text}`)
      .join('\n\n---\n\n');

    const patternPrompt = `Analise os seguintes documentos do paciente em ordem cronológica:

Paciente: ${patientContext.name}
Histórico: ${patientContext.medicalHistory}

Documentos:
${documentsData}

Retorne JSON com:
{
  "trends": [
    {
      "type": "improvement|deterioration|stability",
      "description": "descrição da tendência",
      "timeframe": "período observado",
      "confidence": 85,
      "evidence": ["evidência 1", "evidência 2"]
    }
  ],
  "patterns": [
    {
      "type": "symptom|treatment|response",
      "description": "descrição do padrão",
      "frequency": "frequência de ocorrência",
      "triggers": ["gatilhos identificados"],
      "impact": "alto|médio|baixo"
    }
  ],
  "anomalies": [
    {
      "description": "descrição da anomalia",
      "date": "data aproximada",
      "severity": "alto|médio|baixo",
      "possibleCauses": ["causa possível 1", "causa possível 2"]
    }
  ],
  "insights": [
    {
      "category": "treatment|prognosis|risk|opportunity",
      "description": "insight identificado",
      "recommendation": "recomendação baseada no insight",
      "priority": "alta|média|baixa"
    }
  ]
}`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(patternPrompt);
    const result = await response.response;
    const patternResult = JSON.parse(result.text().trim());

    aiCache.set(cacheKey, JSON.stringify(documents), JSON.stringify(patternResult));
    return patternResult;
  } catch (error) {
    console.error('Error identifying patterns:', error);
    throw new Error('Falha na identificação de padrões.');
  }
}

/**
 * Checks for inconsistencies in patient feedback and clinical observations.
 * @param clinicalNotes Clinical observations
 * @param patientFeedback Patient-reported information
 * @returns Inconsistency analysis
 */
export async function checkInconsistencies(
  clinicalNotes: string,
  patientFeedback: string,
  userId = 'anonymous'
): Promise<{
  inconsistencies: Inconsistency[];
  concordances: Concordance[];
  recommendations: string[];
}> {
  const cacheKey = `inconsistency_${clinicalNotes.slice(0, 30)}_${patientFeedback.slice(0, 30)}`;
  
  try {
    const cached = aiCache.get(cacheKey, clinicalNotes + patientFeedback, userId);
    if (cached) {
      console.log('⚖️ Retornando verificação de inconsistências do cache (economia ~$0.03)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Checking inconsistencies (custo ~$0.03)`);
  
  try {
    const systemInstruction = `Você é um especialista em análise de concordância entre observações clínicas e relatos de pacientes.
    Compare as observações do profissional com o feedback do paciente, identificando:
    
    1. Inconsistências importantes
    2. Concordâncias que reforçam os achados
    3. Áreas que necessitam esclarecimento
    
    Seja objetivo e considere que discrepâncias podem ter explicações válidas.`;

    const consistencyPrompt = `Compare as seguintes informações:

OBSERVAÇÕES CLÍNICAS:
"${clinicalNotes}"

FEEDBACK DO PACIENTE:
"${patientFeedback}"

Retorne JSON com:
{
  "inconsistencies": [
    {
      "area": "área da inconsistência",
      "clinicalObservation": "o que o clínico observou",
      "patientReport": "o que o paciente relatou",
      "severity": "alta|média|baixa",
      "possibleExplanations": ["explicação possível 1", "explicação possível 2"],
      "requiresClarification": true
    }
  ],
  "concordances": [
    {
      "area": "área de concordância",
      "description": "descrição da concordância",
      "strengthens": "o que esta concordância reforça"
    }
  ],
  "recommendations": [
    "recomendação para esclarecer inconsistências",
    "sugestão de avaliação adicional"
  ]
}`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(consistencyPrompt);
    const result = await response.response;
    const consistencyResult = JSON.parse(result.text().trim());

    aiCache.set(cacheKey, clinicalNotes + patientFeedback, JSON.stringify(consistencyResult));
    return consistencyResult;
  } catch (error) {
    console.error('Error checking inconsistencies:', error);
    throw new Error('Falha na verificação de inconsistências.');
  }
}

/**
 * Analyzes patient feedback sentiment and satisfaction patterns.
 * @param feedbackTexts Array of patient feedback texts
 * @returns Sentiment analysis results
 */
export async function analyzeFeedbackSentiment(
  feedbackTexts: Array<{
    text: string;
    date: string;
    context?: string;
  }>,
  userId = 'anonymous'
): Promise<{
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentTrend: 'improving' | 'stable' | 'declining';
  keyThemes: Theme[];
  concerns: Concern[];
  satisfactionIndicators: SatisfactionIndicator[];
}> {
  const cacheKey = `sentiment_${feedbackTexts.length}_${feedbackTexts[0]?.text.slice(0, 30)}`;
  
  try {
    const cached = aiCache.get(cacheKey, JSON.stringify(feedbackTexts), userId);
    if (cached) {
      console.log('😊 Retornando análise de sentimento do cache (economia ~$0.04)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Analyzing feedback sentiment (custo ~$0.04)`);
  
  try {
    const systemInstruction = `Você é um especialista em análise de sentimento de feedback de pacientes.
    Analise os feedbacks para identificar:
    
    1. Sentimento geral e tendências
    2. Temas recorrentes (positivos e negativos)
    3. Preocupações específicas
    4. Indicadores de satisfação
    
    Seja sensível ao contexto clínico e emocional dos pacientes.`;

    const feedbackData = feedbackTexts
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(f => `[${f.date}] ${f.context ? `(${f.context})` : ''}: ${f.text}`)
      .join('\n\n');

    const sentimentPrompt = `Analise os seguintes feedbacks do paciente em ordem cronológica:

${feedbackData}

Retorne JSON com:
{
  "overallSentiment": "positive|neutral|negative",
  "sentimentTrend": "improving|stable|declining",
  "keyThemes": [
    {
      "theme": "tema identificado",
      "sentiment": "positive|neutral|negative",
      "frequency": 5,
      "examples": ["exemplo 1", "exemplo 2"]
    }
  ],
  "concerns": [
    {
      "concern": "preocupação específica",
      "severity": "alta|média|baixa",
      "firstMentioned": "data aproximada",
      "frequency": 3,
      "suggestedAction": "ação sugerida"
    }
  ],
  "satisfactionIndicators": [
    {
      "indicator": "indicador de satisfação",
      "type": "positive|negative",
      "strength": "forte|moderado|fraco",
      "relatedTo": "aspecto do tratamento relacionado"
    }
  ]
}`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(sentimentPrompt);
    const result = await response.response;
    const sentimentResult = JSON.parse(result.text().trim());

    aiCache.set(cacheKey, JSON.stringify(feedbackTexts), JSON.stringify(sentimentResult));
    return sentimentResult;
  } catch (error) {
    console.error('Error analyzing feedback sentiment:', error);
    throw new Error('Falha na análise de sentimento do feedback.');
  }
}

// Interfaces para os tipos de resultado
export interface Trend {
  type: 'improvement' | 'deterioration' | 'stability';
  description: string;
  timeframe: string;
  confidence: number;
  evidence: string[];
}

export interface Pattern {
  type: 'symptom' | 'treatment' | 'response';
  description: string;
  frequency: string;
  triggers: string[];
  impact: 'high' | 'medium' | 'low';
}

export interface Anomaly {
  description: string;
  date: string;
  severity: 'high' | 'medium' | 'low';
  possibleCauses: string[];
}

export interface PatternInsight {
  category: 'treatment' | 'prognosis' | 'risk' | 'opportunity';
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Inconsistency {
  area: string;
  clinicalObservation: string;
  patientReport: string;
  severity: 'high' | 'medium' | 'low';
  possibleExplanations: string[];
  requiresClarification: boolean;
}

export interface Concordance {
  area: string;
  description: string;
  strengthens: string;
}

export interface Theme {
  theme: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  frequency: number;
  examples: string[];
}

export interface Concern {
  concern: string;
  severity: 'high' | 'medium' | 'low';
  firstMentioned: string;
  frequency: number;
  suggestedAction: string;
}

export interface SatisfactionIndicator {
  indicator: string;
  type: 'positive' | 'negative';
  strength: 'strong' | 'moderate' | 'weak';
  relatedTo: string;
}