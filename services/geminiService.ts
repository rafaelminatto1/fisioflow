import { GoogleGenerativeAI } from '@google/generative-ai';

import { TASK_STATUS_LABELS } from '../constants';
import type {
  Patient,
  Task,
  Assessment,
  AbandonmentRiskPrediction,
} from '../types';

import { aiCache } from './aiCache';

// This implementation now uses the real Gemini API.
// The API key should be configured in the environment or passed from backend
const getGeminiInstance = () => {
  // Only use environment variables for security
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada. Configure a chave da API no ambiente.');
  }
  
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Generates a summary and feedback for a physiotherapist's progress note.
 * @param progressNote The progress note written by an intern or physiotherapist.
 * @returns A string containing AI-generated feedback.
 */
export async function getTaskSummary(progressNote: string, userId = 'anonymous'): Promise<string> {
  const cacheKey = `task_summary_${progressNote.slice(0, 50)}`;
  
  // Verifica cache primeiro
  try {
    const cached = aiCache.get(cacheKey, progressNote, userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }

  try {
    const systemInstruction =
      'Você é um fisioterapeuta sênior e mentor. Sua tarefa é analisar a anotação de progresso de um estagiário de fisioterapia. Forneça um feedback construtivo, em português, destacando pontos positivos, áreas para melhoria e sugestões práticas para aprimorar o tratamento e o registro clínico. A resposta deve ser em formato de bullet points concisos e claros.';

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Analisar a seguinte anotação de progresso: "${progressNote}"`);
    const result = await response.response;
    const text = result.text();
    if (!text) {
      return 'A IA retornou uma resposta vazia. Tente reformular sua anotação.';
    }

    // Armazena no cache para economizar nas próximas calls
    aiCache.set(cacheKey, progressNote, text);
    return text;
  } catch (error) {

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return 'Erro: A chave da API não foi configurada corretamente. Verifique as variáveis de ambiente.';
      }
      if (error.message.includes('fetch')) {
        return 'Erro de rede: Não foi possível conectar à API. Verifique sua conexão com a internet.';
      }
    }
    return 'Não foi possível obter a análise da IA neste momento. Ocorreu um erro inesperado. Tente novamente mais tarde.';
  }
}

/**
 * Searches for an answer to a query within a provided knowledge base using the Gemini API.
 * @param query The user's question.
 * @param knowledgeBase A string containing all the content from the notebooks.
 * @returns A string with the AI-generated answer.
 */
export async function searchKnowledgeBase(
  query: string,
  knowledgeBase: string,
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `knowledge_${query.slice(0, 50)}`;
  
  // Verifica cache primeiro
  try {
    const cached = aiCache.get(cacheKey, query, userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }
  try {
    const systemInstruction = `Você é um assistente especialista em fisioterapia para a clínica FisioFlow. Sua tarefa é responder perguntas baseando-se **estritamente** no conteúdo da base de conhecimento fornecida. Não invente informações. Se a resposta não estiver na base de conhecimento, diga claramente: "A informação não foi encontrada na base de conhecimento." Formate a resposta de forma clara e use markdown se apropriado.`;

    const content = `Base de Conhecimento:\n---\n${knowledgeBase}\n---\n\nPergunta do Usuário: "${query}"`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(content);
    const result = await response.response;
    const text = result.text();
    if (!text) {
      return 'A IA não conseguiu processar a busca. Tente novamente.';
    }

    // Armazena no cache
    aiCache.set(cacheKey, query, text);
    return text;
  } catch (error) {

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return 'Erro: A chave da API não foi configurada corretamente.';
      }
      if (error.message.includes('fetch')) {
        return 'Erro de rede: Não foi possível conectar à API. Verifique sua conexão.';
      }
    }
    return 'Não foi possível realizar a busca neste momento. Ocorreu um erro inesperado.';
  }
}

/**
 * Generates a progress report for a patient based on their clinical history and tasks.
 * @param patient The patient object.
 * @param tasks A list of tasks associated with the patient.
 * @returns A string containing the AI-generated report in Markdown format.
 */
export async function generatePatientReport(
  patient: Patient,
  tasks: Task[],
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `report_${patient.id}_${tasks.length}_${patient.medicalHistory?.slice(0, 30)}`;
  
  // Verifica cache primeiro
  try {
    const cached = aiCache.get(cacheKey, patient.medicalHistory || '', userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }
  try {
    const systemInstruction = `Você é um fisioterapeuta experiente e está redigindo um relatório de progresso para um paciente. Com base no histórico clínico e na lista de tarefas (plano de tratamento), gere um relatório conciso e profissional. O relatório deve ser estruturado com:
1.  **Sumário do Paciente:** Breve descrição baseada no histórico clínico.
2.  **Plano de Tratamento e Execução:** Resumo das principais tarefas realizadas e seu status.
3.  **Análise de Progresso:** Uma avaliação geral da evolução do paciente com base nas tarefas.
4.  **Recomendações:** Sugestões para os próximos passos.

A resposta deve ser em formato Markdown, pronta para ser copiada. Use um tom formal e clínico.`;

    const taskHistory = tasks
      .map(
        (t) =>
          `- Título: ${t.title}\n  Status: ${TASK_STATUS_LABELS[t.status]}\n  Descrição/Nota: ${t.description || 'N/A'}`
      )
      .join('\n');
    const content = `**Histórico Clínico do Paciente:**\n${patient.medicalHistory}\n\n**Tarefas e Evolução:**\n${taskHistory || 'Nenhuma tarefa registrada.'}`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(content);
    const result = await response.response;
    const text = result.text();
    if (!text) {
      return 'A IA não conseguiu gerar o relatório. Tente novamente.';
    }

    // Armazena no cache
    aiCache.set(cacheKey, patient.medicalHistory || '', text);
    return text;
  } catch (error) {

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return 'Erro: A chave da API não foi configurada corretamente.';
      }
      if (error.message.includes('fetch')) {
        return 'Erro de rede: Não foi possível conectar à API. Verifique sua conexão.';
      }
    }
    return 'Não foi possível gerar o relatório neste momento. Ocorreu um erro inesperado.';
  }
}

/**
 * Generates a structured treatment plan based on patient assessment data.
 * @param assessment The assessment object containing patient data.
 * @returns A string with the AI-generated treatment plan in Markdown format.
 */
export async function generateTreatmentPlan(
  assessment: Partial<Assessment>,
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `treatment_${assessment.id}_${assessment.mainComplaint?.slice(0, 30)}`;
  const inputData = `${assessment.mainComplaint} ${assessment.history} ${assessment.diagnosticHypothesis}`;
  
  // Verifica cache primeiro
  try {
    const cached = aiCache.get(cacheKey, inputData, userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }
  try {
    const systemInstruction = `Você é um fisioterapeuta sênior especialista em reabilitação. Sua tarefa é criar um plano de tratamento estruturado com base nas informações da avaliação do paciente. O plano deve ser conciso e prático. Organize a resposta em:
1.  **Objetivos de Curto Prazo:** (Ex: Redução da dor, melhora da ADM).
2.  **Objetivos de Longo Prazo:** (Ex: Retorno às atividades diárias sem dor, fortalecimento muscular).
3.  **Condutas Sugeridas:** (Ex: Cinesioterapia, terapia manual, eletroterapia, educação do paciente).

A resposta deve ser em formato Markdown e em português.`;

    const content = `**Dados da Avaliação:**
- **Queixa Principal:** ${assessment.mainComplaint || 'Não informada.'}
- **Histórico:** ${assessment.history || 'Não informado.'}
- **Hipótese Diagnóstica:** ${assessment.diagnosticHypothesis || 'Não informada.'}

Com base nesses dados, gere o plano de tratamento.`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(content);
    const result = await response.response;
    const text = result.text();
    if (!text) {
      return 'A IA não conseguiu gerar o plano de tratamento. Tente novamente.';
    }

    // Armazena no cache
    aiCache.set(cacheKey, inputData, text);
    return text;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return 'Erro: A chave da API não foi configurada corretamente.';
      }
      if (error.message.includes('fetch')) {
        return 'Erro de rede: Não foi possível conectar à API.';
      }
    }
    return 'Não foi possível gerar o plano de tratamento neste momento. Ocorreu um erro inesperado.';
  }
}

/**
 * Analyzes anonymized patient data to predict abandonment risk.
 * @param anonymizedPatientData An array of patient metrics.
 * @returns A promise that resolves to an array of risk predictions.
 */
export async function predictAbandonmentRisk(
  anonymizedPatientData: any[]
): Promise<AbandonmentRiskPrediction[]> {
  try {
    const systemInstruction =
      "Você é um analista de dados para uma clínica de fisioterapia. Analise a lista de métricas de pacientes anonimizados para identificar indivíduos com alto risco de abandonar o tratamento. Retorne um array JSON de objetos, cada um com 'patientId', 'riskLevel' ('Alto', 'Médio', 'Baixo') e um 'reason' conciso. Foque em padrões como longos intervalos entre consultas, baixa adesão a exercícios e pagamentos pendentes.";
    // Schema removed due to API compatibility issues

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Analise os seguintes dados de pacientes:\n${JSON.stringify(anonymizedPatientData, null, 2)}`);
    const result = await response.response;
    const jsonText = result.text().trim();
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error('Falha ao analisar o risco de abandono.');
  }
}

/**
 * Generates a structured SOAP note from unstructured text.
 * @param notes Unstructured notes from a session.
 * @returns A promise that resolves to a structured SOAP note object.
 */
export async function generateSOAPNote(notes: string): Promise<{
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}> {
  try {
    const systemInstruction =
      'Você é um escriba médico especializado em fisioterapia. Converta as seguintes anotações de consulta não estruturadas em uma nota SOAP estruturada (Subjetivo, Objetivo, Avaliação, Plano). Garanta que a saída seja um objeto JSON. Seja conciso e use linguagem clínica.';
    
    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Converta estas anotações: "${notes}"`);
    const result = await response.response;
    const jsonText = result.text().trim();
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error('Falha ao gerar nota SOAP.');
  }
}

/**
 * Generates evolution reports based on patient progress data.
 * @param patient Patient information
 * @param sessions Array of session data
 * @param timeframe Time period for the report
 * @returns Evolution report in markdown format
 */
export async function generateEvolutionReport(
  patient: Patient,
  sessions: any[],
  timeframe: string,
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `evolution_${patient.id}_${timeframe}_${sessions.length}`;
  
  try {
    const cached = aiCache.get(cacheKey, JSON.stringify(sessions), userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }
  
  try {
    const systemInstruction = `Você é um fisioterapeuta experiente gerando um relatório de evolução clínica. 
    Com base nos dados das sessões, crie um relatório estruturado em markdown com:
    1. **Resumo Executivo** - Breve overview da evolução
    2. **Análise de Progresso** - Detalhamento das melhoras observadas
    3. **Métricas Quantitativas** - Dados numéricos quando disponíveis
    4. **Observações Clínicas** - Aspectos qualitativos relevantes
    5. **Recomendações** - Ajustes sugeridos para o tratamento
    Use linguagem técnica mas clara, com foco na evolução funcional do paciente.`;

    const sessionData = sessions.map(s => 
      `Data: ${s.date}, Dor: ${s.painLevel}/10, Observações: ${s.notes || 'N/A'}`
    ).join('\n');

    const content = `**Paciente:** ${patient.name}
**Período:** ${timeframe}
**Histórico:** ${patient.medicalHistory}

**Dados das Sessões:**
${sessionData}`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(content);
    const result = await response.response;
    const text = result.text();
    
    if (!text) {
      return 'Não foi possível gerar o relatório de evolução. Tente novamente.';
    }

    aiCache.set(cacheKey, JSON.stringify(sessions), text);
    return text;
  } catch (error) {
    return 'Erro ao gerar relatório de evolução. Verifique os dados e tente novamente.';
  }
}

/**
 * Generates insurance/audit reports with specific formatting.
 * @param patient Patient data
 * @param appointments Appointment history
 * @param assessments Assessment data
 * @param reportType Type of report (convenio, pericia, alta)
 * @returns Formatted report for external use
 */
export async function generateInsuranceReport(
  patient: Patient,
  appointments: any[],
  assessments: any[],
  reportType: 'convenio' | 'pericia' | 'alta',
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `insurance_${patient.id}_${reportType}_${appointments.length}`;
  
  try {
    const cached = aiCache.get(cacheKey, patient.medicalHistory || '', userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }
  
  try {
    const reportConfig = {
      convenio: {
        title: 'RELATÓRIO MÉDICO PARA CONVÊNIO',
        focus: 'Justificar a necessidade do tratamento fisioterapêutico e documentar o progresso para aprovação de sessões adicionais.',
        sections: ['Identificação', 'Diagnóstico', 'Histórico Clínico', 'Tratamento Realizado', 'Evolução', 'Prognóstico', 'Necessidade de Continuidade']
      },
      pericia: {
        title: 'RELATÓRIO PERICIAL FISIOTERAPÊUTICO',
        focus: 'Avaliar objetivamente a capacidade funcional e limitações do paciente para fins periciais.',
        sections: ['Identificação', 'Anamnese', 'Exame Físico', 'Avaliação Funcional', 'Limitações Identificadas', 'Capacidade Laboral', 'Conclusão Pericial']
      },
      alta: {
        title: 'RELATÓRIO DE ALTA FISIOTERAPÊUTICA',
        focus: 'Documentar os resultados obtidos e orientações para manutenção dos ganhos funcionais.',
        sections: ['Identificação', 'Resumo do Tratamento', 'Objetivos Alcançados', 'Estado Funcional Atual', 'Orientações de Manutenção', 'Prognóstico a Longo Prazo']
      }
    };

    const config = reportConfig[reportType];
    const systemInstruction = `Você é um fisioterapeuta especialista em documentação clínica oficial. 
    Gere um ${config.title} profissional e técnico.
    Foco: ${config.focus}
    Estruture o relatório com as seções: ${config.sections.join(', ')}.
    Use linguagem formal, técnica e objetiva, apropriada para documentação oficial.
    Inclua dados quantitativos quando disponíveis e evite linguagem subjetiva.`;

    const appointmentSummary = appointments.map(apt => 
      `${apt.date}: ${apt.notes || 'Sessão realizada'}`
    ).join('\n');

    const assessmentSummary = assessments.map(ass => 
      `${ass.date}: Dor ${ass.painLevel}/10, Diagnóstico: ${ass.diagnosticHypothesis}`
    ).join('\n');

    const content = `**DADOS DO PACIENTE:**
Nome: ${patient.name}
Histórico: ${patient.medicalHistory}

**SESSÕES REALIZADAS:**
${appointmentSummary || 'Nenhuma sessão registrada'}

**AVALIAÇÕES:**
${assessmentSummary || 'Nenhuma avaliação registrada'}`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(content);
    const result = await response.response;
    const text = result.text();
    
    if (!text) {
      return 'Não foi possível gerar o relatório. Tente novamente.';
    }

    aiCache.set(cacheKey, patient.medicalHistory || '', text);
    return text;
  } catch (error) {
    return 'Erro ao gerar relatório. Verifique os dados e tente novamente.';
  }
}

/**
 * Generates exercise prescription documents with detailed instructions.
 * @param prescriptions Array of exercise prescriptions
 * @param exercises Array of exercise details
 * @param patient Patient information
 * @returns Formatted exercise prescription document
 */
export async function generateExercisePrescription(
  prescriptions: any[],
  exercises: any[],
  patient: Patient,
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `prescription_${patient.id}_${prescriptions.length}`;
  
  try {
    const cached = aiCache.get(cacheKey, JSON.stringify(prescriptions), userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }
  
  try {
    const systemInstruction = `Você é um fisioterapeuta criando um receituário de exercícios profissional.
    Gere um documento estruturado em markdown com:
    1. **Cabeçalho** - Título e dados do paciente
    2. **Prescrição de Exercícios** - Lista detalhada com instruções claras
    3. **Orientações Gerais** - Cuidados e precauções
    4. **Progresso e Reavaliação** - Critérios para evolução
    5. **Contato** - Informações para dúvidas
    Use linguagem clara para o paciente, mas tecnicamente precisa.`;

    const exerciseDetails = prescriptions.map(p => {
      const exercise = exercises.find(e => e.id === p.exerciseId);
      return {
        name: exercise?.name || 'Exercício não encontrado',
        description: exercise?.description || '',
        sets: p.sets,
        reps: p.reps,
        frequency: p.frequency,
        notes: p.notes || ''
      };
    });

    const content = `**PACIENTE:** ${patient.name}
**CONDIÇÃO CLÍNICA:** ${patient.medicalHistory}

**EXERCÍCIOS PRESCRITOS:**
${exerciseDetails.map(ex => 
  `- **${ex.name}**: ${ex.description}
  - Séries: ${ex.sets}, Repetições: ${ex.reps}
  - Frequência: ${ex.frequency}
  - Observações: ${ex.notes}`
).join('\n\n')}`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(content);
    const result = await response.response;
    const text = result.text();
    
    if (!text) {
      return 'Não foi possível gerar o receituário. Tente novamente.';
    }

    aiCache.set(cacheKey, JSON.stringify(prescriptions), text);
    return text;
  } catch (error) {
    return 'Erro ao gerar receituário de exercícios. Verifique os dados e tente novamente.';
  }
}

/**
 * Converts voice notes to structured text with medical terminology.
 * @param voiceText Raw voice-to-text output
 * @param contextType Type of clinical context (assessment, progress, etc.)
 * @returns Structured and corrected text
 */
export async function processVoiceToText(
  voiceText: string,
  contextType: 'assessment' | 'progress' | 'prescription' | 'general',
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `voice_${contextType}_${voiceText.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, voiceText, userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }
  
  try {
    const contextInstructions = {
      assessment: 'Estruture as informações como dados de avaliação fisioterapêutica, corrigindo terminologia médica e organizando em tópicos relevantes.',
      progress: 'Organize as informações como nota de evolução, com estrutura temporal e observações clínicas claras.',
      prescription: 'Formate as informações como prescrição de exercícios, com instruções claras sobre execução, frequência e cuidados.',
      general: 'Corrija a terminologia médica e estruture o texto de forma clara e profissional.'
    };

    const systemInstruction = `Você é um assistente especializado em documentação clínica fisioterapêutica.
    Sua tarefa é processar texto convertido de voz para escrita, realizando:
    1. Correção de terminologia médica e anatômica
    2. Estruturação do conteúdo de forma organizada
    3. Melhoria da clareza e precisão técnica
    4. Padronização do formato conforme o contexto clínico
    
    Contexto específico: ${contextInstructions[contextType]}
    Mantenha o conteúdo original, apenas melhorando a estrutura e precisão terminológica.`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Processe este texto de voz: "${voiceText}"`);
    const result = await response.response;
    const text = result.text();
    
    if (!text) {
      return voiceText; // Retorna texto original se falhar
    }

    aiCache.set(cacheKey, voiceText, text);
    return text;
  } catch (error) {
    return voiceText; // Retorna texto original em caso de erro
  }
}

/**
 * Extracts structured information from free-form clinical text.
 * @param freeText Unstructured clinical notes
 * @param extractionType Type of information to extract
 * @returns Structured data object
 */
export async function extractClinicalInformation(
  freeText: string,
  extractionType: 'symptoms' | 'medications' | 'exercises' | 'measurements',
  userId = 'anonymous'
): Promise<any> {
  const cacheKey = `extract_${extractionType}_${freeText.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, freeText, userId);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    // Silently handle cache errors
  }
  
  try {
    const extractionPrompts = {
      symptoms: `Extraia sintomas mencionados no texto, retornando um JSON com:
        {
          "symptoms": [
            {
              "name": "nome do sintoma",
              "intensity": "intensidade (0-10 se mencionada)",
              "location": "localização anatômica",
              "duration": "duração se mencionada",
              "quality": "qualidade da dor/sintoma"
            }
          ]
        }`,
      medications: `Extraia medicamentos mencionados no texto, retornando um JSON com:
        {
          "medications": [
            {
              "name": "nome do medicamento",
              "dosage": "dosagem se mencionada",
              "frequency": "frequência se mencionada",
              "notes": "observações relevantes"
            }
          ]
        }`,
      exercises: `Extraia exercícios mencionados no texto, retornando um JSON com:
        {
          "exercises": [
            {
              "name": "nome do exercício",
              "sets": "número de séries se mencionado",
              "reps": "repetições se mencionadas",
              "frequency": "frequência se mencionada",
              "notes": "observações sobre execução"
            }
          ]
        }`,
      measurements: `Extraia medidas e avaliações mencionadas no texto, retornando um JSON com:
        {
          "measurements": [
            {
              "type": "tipo de medida (ADM, força, etc.)",
              "value": "valor medido",
              "unit": "unidade de medida",
              "location": "local anatômico",
              "method": "método de avaliação se mencionado"
            }
          ]
        }`
    };

    const systemInstruction = `Você é um especialista em extração de informações clínicas de fisioterapia.
    Analise o texto fornecido e extraia as informações relevantes conforme solicitado.
    Seja preciso e extraia apenas informações explicitamente mencionadas no texto.
    Retorne sempre um JSON válido seguindo exatamente a estrutura solicitada.`;

    const prompt = `${extractionPrompts[extractionType]}

Texto para análise: "${freeText}"`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(prompt);
    const result = await response.response;
    const jsonText = result.text().trim();
    
    const extractedData = JSON.parse(jsonText);
    aiCache.set(cacheKey, freeText, jsonText);
    return extractedData;
  } catch (error) {
    return { [extractionType]: [] }; // Retorna estrutura vazia em caso de erro
  }
}

/**
 * Generates SMART goals from general treatment objectives.
 * @param generalObjectives Unstructured treatment goals
 * @param patientContext Patient information for context
 * @returns Structured SMART goals
 */
export async function generateSMARTGoals(
  generalObjectives: string,
  patientContext: string,
  userId = 'anonymous'
): Promise<any[]> {
  const cacheKey = `smart_goals_${generalObjectives.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, generalObjectives + patientContext, userId);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    // Silently handle cache errors
  }
  
  try {
    const systemInstruction = `Você é um especialista em definição de objetivos terapêuticos SMART (Específicos, Mensuráveis, Atingíveis, Relevantes, Temporais).
    Transforme objetivos gerais de tratamento em objetivos SMART estruturados.
    
    Para cada objetivo, defina:
    - Specific: Descrição específica e clara
    - Measurable: Como será medido (escalas, testes, etc.)
    - Achievable: Por que é realizável
    - Relevant: Relevância para o paciente
    - Time-bound: Prazo para atingir o objetivo
    
    Retorne um JSON com array de objetivos SMART.`;

    const prompt = `Com base no contexto do paciente e objetivos gerais, crie objetivos SMART:

**Contexto do Paciente:** ${patientContext}

**Objetivos Gerais:** ${generalObjectives}

Retorne JSON com estrutura:
{
  "smartGoals": [
    {
      "id": "objetivo_1",
      "title": "Título do objetivo",
      "specific": "Descrição específica",
      "measurable": "Como será medido",
      "achievable": "Por que é atingível",
      "relevant": "Relevância para o paciente",
      "timeBound": "Prazo definido",
      "priority": "alta/média/baixa",
      "category": "dor/funcionalidade/força/mobilidade"
    }
  ]
}`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(prompt);
    const result = await response.response;
    const jsonText = result.text().trim();
    
    const smartGoals = JSON.parse(jsonText);
    aiCache.set(cacheKey, generalObjectives + patientContext, jsonText);
    return smartGoals.smartGoals || [];
  } catch (error) {
    return [];
  }
}

/**
 * Corrects medical terminology in clinical text.
 * @param clinicalText Text with potential terminology errors
 * @returns Text with corrected medical terminology
 */
export async function correctMedicalTerminology(
  clinicalText: string,
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `terminology_${clinicalText.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, clinicalText, userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }
  
  try {
    const systemInstruction = `Você é um especialista em terminologia médica e fisioterapêutica.
    Corrija erros de terminologia anatômica, patológica e técnica no texto fornecido.
    Mantenha o conteúdo e estrutura originais, corrigindo apenas:
    - Nomes anatômicos incorretos
    - Terminologia médica imprecisa
    - Grafias incorretas de termos técnicos
    - Uso inadequado de termos clínicos
    
    Preserve o contexto e significado original do texto.`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Corrija a terminologia médica neste texto: "${clinicalText}"`);
    const result = await response.response;
    const correctedText = result.text();
    
    if (!correctedText) {
      return clinicalText; // Retorna texto original se falhar
    }

    aiCache.set(cacheKey, clinicalText, correctedText);
    return correctedText;
  } catch (error) {
    return clinicalText; // Retorna texto original em caso de erro
  }
}

/**
 * Translates technical terms to patient-friendly language.
 * @param technicalText Technical clinical text
 * @returns Patient-friendly explanation
 */
export async function translateToPatientLanguage(
  technicalText: string,
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `patient_lang_${technicalText.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, technicalText, userId);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Silently handle cache errors
  }
  
  try {
    const systemInstruction = `Você é um especialista em comunicação médico-paciente.
    Traduza termos técnicos e jargões médicos para linguagem acessível ao paciente.
    
    Diretrizes:
    - Use palavras simples e compreensíveis
    - Mantenha a precisão médica
    - Adicione explicações quando necessário
    - Use analogias quando apropriado
    - Mantenha tom respeitoso e empático
    - Evite causar ansiedade desnecessária`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Traduza este texto técnico para linguagem do paciente: "${technicalText}"`);
    const result = await response.response;
    const patientText = result.text();
    
    if (!patientText) {
      return technicalText; // Retorna texto original se falhar
    }

    aiCache.set(cacheKey, technicalText, patientText);
    return patientText;
  } catch (error) {
    return technicalText; // Retorna texto original em caso de erro
  }
}
