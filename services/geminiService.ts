import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiCache } from './aiCache';
import type {
  Patient,
  Task,
  Assessment,
  AbandonmentRiskPrediction,
} from '../types';

// This implementation now uses the real Gemini API.
// The API key is expected to be available in the environment variables.
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
      console.log('📋 Retornando análise do cache (economia ~$0.01)');
      return cached;
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log('🤖 Calling Gemini API with note (custo ~$0.01)');

  try {
    const systemInstruction =
      'Você é um fisioterapeuta sênior e mentor. Sua tarefa é analisar a anotação de progresso de um estagiário de fisioterapia. Forneça um feedback construtivo, em português, destacando pontos positivos, áreas para melhoria e sugestões práticas para aprimorar o tratamento e o registro clínico. A resposta deve ser em formato de bullet points concisos e claros.';

    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Analisar a seguinte anotação de progresso: "${progressNote}"`);
    const result = await response.response;
    const text = result.text();
    if (!text) {
      console.warn('Gemini API returned an empty response.');
      return 'A IA retornou uma resposta vazia. Tente reformular sua anotação.';
    }

    // Armazena no cache para economizar nas próximas calls
    aiCache.set(cacheKey, progressNote, text);
    return text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);

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
      console.log('🔍 Retornando busca do cache (economia ~$0.02)');
      return cached;
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log('🤖 Searching knowledge base (custo ~$0.02)', query);
  try {
    const systemInstruction = `Você é um assistente especialista em fisioterapia para a clínica FisioFlow. Sua tarefa é responder perguntas baseando-se **estritamente** no conteúdo da base de conhecimento fornecida. Não invente informações. Se a resposta não estiver na base de conhecimento, diga claramente: "A informação não foi encontrada na base de conhecimento." Formate a resposta de forma clara e use markdown se apropriado.`;

    const content = `Base de Conhecimento:\n---\n${knowledgeBase}\n---\n\nPergunta do Usuário: "${query}"`;

    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(content);
    const result = await response.response;
    const text = result.text();
    if (!text) {
      console.warn(
        'Gemini API returned an empty response for knowledge base search.'
      );
      return 'A IA não conseguiu processar a busca. Tente novamente.';
    }

    // Armazena no cache
    aiCache.set(cacheKey, query, text);
    return text;
  } catch (error) {
    console.error('Error calling Gemini API for knowledge base search:', error);

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
      console.log('📄 Retornando relatório do cache (economia ~$0.03)');
      return cached;
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Generating report (custo ~$0.03): ${patient.name}`);
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
          `- Título: ${t.title}\n  Status: ${TASK_STATUSES[t.status]}\n  Descrição/Nota: ${t.description || 'N/A'}`
      )
      .join('\n');
    const content = `**Histórico Clínico do Paciente:**\n${patient.medicalHistory}\n\n**Tarefas e Evolução:**\n${taskHistory || 'Nenhuma tarefa registrada.'}`;

    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(content);
    const result = await response.response;
    const text = result.text();
    if (!text) {
      console.warn('Gemini API returned an empty response for patient report.');
      return 'A IA não conseguiu gerar o relatório. Tente novamente.';
    }

    // Armazena no cache
    aiCache.set(cacheKey, patient.medicalHistory || '', text);
    return text;
  } catch (error) {
    console.error('Error calling Gemini API for patient report:', error);

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
      console.log('🩺 Retornando plano do cache (economia ~$0.02)');
      return cached;
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Generating treatment plan (custo ~$0.02):`, assessment.id);
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

    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(content);
    const result = await response.response;
    const text = result.text();
    if (!text) {
      console.warn('Gemini API returned an empty response for treatment plan.');
      return 'A IA não conseguiu gerar o plano de tratamento. Tente novamente.';
    }

    // Armazena no cache
    aiCache.set(cacheKey, inputData, text);
    return text;
  } catch (error) {
    console.error('Error calling Gemini API for treatment plan:', error);
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

    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Analise os seguintes dados de pacientes:\n${JSON.stringify(anonymizedPatientData, null, 2)}`);
    const result = await response.response;
    const jsonText = result.text().trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error in predictAbandonmentRisk:', error);
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
    // Schema removed due to API compatibility issues

    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Converta estas anotações: "${notes}"`);
    const result = await response.response;
    const jsonText = result.text().trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error in generateSOAPNote:', error);
    throw new Error('Falha ao gerar nota SOAP.');
  }
}

const TASK_STATUSES = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Revisão',
  done: 'Concluído',
};
