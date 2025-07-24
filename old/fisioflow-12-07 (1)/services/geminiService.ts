
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { Patient, Task, Assessment, Exercise, SmartSummaryData, TeamInsight, TherapistGoal, ExerciseLog, SessionNote, AppointmentType, ClinicSettings, DropoutRiskPrediction, BodyChartMarking } from '/types.js';
import { TASK_STATUSES } from '/constants.js';

// This implementation now uses the real Gemini API.
// The API key is expected to be available in the environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * A wrapper function to handle API calls with retry logic for rate limiting.
 * @param apiCall The async function to call.
 * @param retries The number of retries left.
 * @param delay The delay in ms before the next retry.
 * @returns The result of the API call.
 */
const withRetry = async <T,>(apiCall: () => Promise<T>, retries = 2, delay = 2000): Promise<T> => {
    try {
        return await apiCall();
    } catch (error: any) {
        // Check for 429 error and if retries are left
        if (error.message && error.message.includes('429') && retries > 0) {
            // Wait for the specified delay
            await new Promise(res => setTimeout(res, delay));
            // Retry the call with one less retry and doubled delay (exponential backoff)
            return withRetry(apiCall, retries - 1, delay * 2);
        }
        // For other errors or when retries are exhausted, re-throw the error
        throw error;
    }
};


/**
 * Handles Gemini API errors and returns a user-friendly message.
 * @param error The error caught from the API call.
 * @returns A string with a user-friendly error message.
 */
function handleGeminiError(error: unknown): string {
    if (error instanceof Error) {
        if (error.message.includes('API key')) {
            return "Erro de configuração: A chave da API do Google Gemini não foi encontrada ou é inválida. Verifique as variáveis de ambiente do seu projeto.";
        }
        if (error.message.toLowerCase().includes('fetch failed') || error.message.toLowerCase().includes('network')) {
            return "Erro de rede: Não foi possível conectar à API do Google Gemini. Verifique sua conexão com a internet.";
        }
        if (error.message.includes('429')) {
             return "A IA está com alta demanda no momento. Por favor, aguarde um pouco e tente novamente.";
        }
        if (error.message.includes('400')) {
             return "Erro de requisição: A sua pergunta não pôde ser processada pela IA. Tente reformulá-la.";
        }
         if (error.message.includes('500')) {
             return "Erro no servidor da IA: O serviço do Google Gemini está enfrentando problemas. Tente novamente mais tarde.";
        }
         if (error.message.includes("candidate.text")) {
            return "A IA não retornou uma resposta de texto válida. Tente novamente."
         }
    }
    return "Ocorreu um erro inesperado ao se comunicar com a IA. Tente novamente.";
}

/**
 * Generates a summary and feedback for a physiotherapist's progress note.
 * @param progressNote The progress note written by an intern or physiotherapist.
 * @returns A string containing AI-generated feedback.
 * @throws {Error} If the API call fails.
 */
export async function getTaskSummary(progressNote: string): Promise<string> {
    try {
        const systemInstruction = "Você é um fisioterapeuta sênior e mentor. Sua tarefa é analisar a anotação de progresso de um estagiário de fisioterapia. Forneça um feedback construtivo, em português, destacando pontos positivos, áreas para melhoria e sugestões práticas para aprimorar o tratamento e o registro clínico. A resposta deve ser em formato de bullet points concisos e claros.";
        
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analisar a seguinte anotação de progresso: "${progressNote}"`,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            },
        });
        
        const response: GenerateContentResponse = await withRetry(apiCall);
        
        const text = response.text;
        if (!text) {
             throw new Error("A IA retornou uma resposta vazia. Tente reformular sua anotação.");
        }
        
        return text;
    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Creates an anonymized educational case study from patient data.
 * @param patient The patient to base the case study on.
 * @param assessments The patient's assessments.
 * @returns A promise that resolves to an object containing the case study.
 * @throws {Error} If the API call fails or parsing fails.
 */
export async function anonymizeAndCreateCaseStudy(
  patient: Patient,
  assessments: Assessment[]
): Promise<{ title: string; summary: string; objectives: string[]; questions: string[] }> {
  const systemInstruction = `Você é um educador clínico sênior. Sua tarefa é criar um caso de estudo educacional a partir de dados reais de um paciente, garantindo o total anonimato. A resposta DEVE ser um objeto JSON com a seguinte estrutura:
{
  "title": "string",
  "summary": "string",
  "objectives": ["string"],
  "questions": ["string"]
}
- Em 'title', crie um título clínico e descritivo para o caso.
- Em 'summary', crie um resumo anonimizado do caso, incluindo histórico, queixa principal e achados da avaliação. NÃO inclua nome, idade, ou qualquer dado que possa identificar o paciente.
- Em 'objectives', crie um array de 2-3 objetivos de aprendizagem claros para quem estuda o caso.
- Em 'questions', crie um array de 2-3 perguntas para discussão que incentivem o raciocínio clínico.
NUNCA retorne nada além do objeto JSON.`;

  const latestAssessment = assessments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const assessmentContext = latestAssessment ? `
  - Queixa Principal: ${latestAssessment.mainComplaint}
  - Histórico: ${latestAssessment.history}
  - Hipótese Diagnóstica: ${latestAssessment.diagnosticHypothesis}` : 'Nenhuma avaliação disponível.';

  const content = `**Dados do Paciente (para anonimizar e resumir):**
- Histórico Clínico Geral: ${patient.medicalHistory}
- Última Avaliação: ${assessmentContext}

**Tarefa:** Crie o caso de estudo no formato JSON especificado.`;
  
  try {
    const apiCall = () => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });
    
    const response: GenerateContentResponse = await withRetry(apiCall);

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);

    if (parsedData && parsedData.title && parsedData.summary && Array.isArray(parsedData.objectives) && Array.isArray(parsedData.questions)) {
        return parsedData;
    } else {
        throw new Error("A resposta da IA não está no formato JSON esperado.");
    }
  } catch (error) {
    throw new Error(handleGeminiError(error));
  }
}

/**
 * Searches for an answer to a query within a provided knowledge base using the Gemini API.
 * @param query The user's question.
 * @param knowledgeBase A string containing all the content from the notebooks.
 * @returns A string with the AI-generated answer.
 * @throws {Error} If the API call fails.
 */
export async function searchKnowledgeBase(query: string, knowledgeBase: string): Promise<GenerateContentResponse> {
    try {
        const systemInstruction = `Você é um assistente especialista em fisioterapia para a clínica FisioFlow. Sua tarefa é responder perguntas baseando-se **estritamente** no conteúdo da base de conhecimento fornecida. Se a resposta não estiver na base de conhecimento, diga **exatamente** a frase: "Não encontrei a resposta na base de conhecimento local." e nada mais. Se encontrar a resposta, forneça-a de forma clara, em português, usando markdown se apropriado.`;

        const content = `Base de Conhecimento:\n---\n${knowledgeBase}\n---\n\nPergunta do Usuário: "${query}"`;

        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.1, // Be very precise
            },
        });
        
        const response: GenerateContentResponse = await withRetry(apiCall);
        
        return response;

    } catch (error) {
       throw new Error(handleGeminiError(error));
    }
}

/**
 * Generates a progress report for a patient based on their clinical history and tasks.
 * @param patient The patient object.
 * @param tasks A list of tasks associated with the patient.
 * @returns A string containing the AI-generated report in Markdown format.
 * @throws {Error} If the API call fails.
 */
export async function generatePatientReport(patient: Patient, tasks: Task[]): Promise<string> {
    try {
        const systemInstruction = `Você é um fisioterapeuta experiente e está redigindo um relatório de progresso para um paciente. Com base no histórico clínico e na lista de tarefas (plano de tratamento), gere um relatório conciso e profissional. O relatório deve ser estruturado com:
1.  **Sumário do Paciente:** Breve descrição baseada no histórico clínico.
2.  **Plano de Tratamento e Execução:** Resumo das principais tarefas realizadas e seu status.
3.  **Análise de Progresso:** Uma avaliação geral da evolução do paciente com base nas tarefas.
4.  **Recomendações:** Sugestões para os próximos passos.

A resposta deve ser em formato Markdown, pronta para ser copiada. Use um tom formal e clínico.`;

        const taskHistory = tasks.map(t => `- Título: ${t.title}\n  Status: ${TASK_STATUSES[t.status]}\n  Descrição/Nota: ${t.description || 'N/A'}`).join('\n');
        const content = `**Histórico Clínico do Paciente:**\n${patient.medicalHistory}\n\n**Tarefas e Evolução:**\n${taskHistory || 'Nenhuma tarefa registrada.'}`;

        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.5,
            },
        });
        
        const response: GenerateContentResponse = await withRetry(apiCall);
        
        const text = response.text;
        if (!text) {
            throw new Error("A IA não conseguiu gerar o relatório. Tente novamente.");
        }
        
        return text;

    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Generates a structured treatment plan based on patient assessment data.
 * @param assessment The assessment object containing patient data.
 * @returns A string with the AI-generated treatment plan in Markdown format.
 * @throws {Error} If the API call fails.
 */
export async function generateTreatmentPlan(assessment: Partial<Assessment>): Promise<string> {
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

        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.6,
            },
        });

        const response: GenerateContentResponse = await withRetry(apiCall);

        const text = response.text;
        if (!text) {
            throw new Error("A IA não conseguiu gerar o plano de tratamento. Tente novamente.");
        }

        return text;

    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Generates exercise recommendations based on a patient assessment and available exercises.
 * @param assessment The patient's assessment data.
 * @param allExercises The library of available exercises.
 * @returns A promise that resolves to an array of recommended exercises with reasons.
 * @throws {Error} If the API call fails or parsing fails.
 */
export async function recommendExercises(
  assessment: Partial<Assessment>,
  allExercises: Exercise[]
): Promise<{ id: string; name: string; reason: string }[]> {
  const systemInstruction = `Você é um fisioterapeuta sênior. Baseado na avaliação do paciente e na lista de exercícios disponíveis, recomende até 5 exercícios. Para cada um, forneça o ID do exercício, o nome e uma breve justificativa clínica para a escolha. Retorne a resposta como um array JSON de objetos, onde cada objeto tem as chaves "id", "name", e "reason". Apenas retorne o array JSON.

  Exemplo de formato de resposta:
  [
    { "id": "ex-1", "name": "Agachamento", "reason": "Fortalecimento do quadríceps para estabilização do joelho." },
    { "id": "ex-4", "name": "Gato-Camelo", "reason": "Melhora da mobilidade da coluna lombar." }
  ]`;
  
  const exerciseList = allExercises.map(e => `- ID: ${e.id}, Nome: ${e.name}, Categoria: ${e.category}, Parte do Corpo: ${e.bodyPart}, Descrição: ${e.description.substring(0, 100)}...`).join('\n');

  const content = `**Avaliação do Paciente:**
- Queixa Principal: ${assessment.mainComplaint || 'N/A'}
- Histórico: ${assessment.history || 'N/A'}
- Hipótese Diagnóstica: ${assessment.diagnosticHypothesis || 'N/A'}
- Nível de Dor: ${assessment.painLevel || 'N/A'}

**Biblioteca de Exercícios Disponíveis:**
${exerciseList}

Retorne sua recomendação como um array JSON com as chaves "id", "name" e "reason".`;

  try {
    const apiCall = () => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });
    
    const response: GenerateContentResponse = await withRetry(apiCall);

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);
    
    if (Array.isArray(parsedData) && parsedData.every(item => 'id' in item && 'name' in item && 'reason' in item)) {
        return parsedData;
    } else {
        console.error("Parsed data does not match expected structure.");
        throw new Error("A resposta da IA não está no formato JSON esperado.");
    }

  } catch (error) {
    throw new Error(handleGeminiError(error));
  }
}

/**
 * Gets a streaming response from the AI assistant, potentially using hybrid search.
 * @param query The user's question.
 * @param context A string containing relevant data from the application.
 * @param enableHybridSearch A boolean to enable external search.
 * @returns An async iterable stream of the AI-generated answer chunks.
 * @throws {Error} If the API call fails.
 */
export async function getAIAssistantResponseStream(
    query: string,
    context: string,
    enableHybridSearch: boolean
): Promise<AsyncIterable<GenerateContentResponse>> {
    const systemInstruction = `You are FisioFlow AI, an intelligent assistant for a physiotherapy clinic. Your role is to help physiotherapists and staff by answering questions based on the provided clinic data and your general knowledge. Be concise, professional, and format your answers clearly using Markdown.
- When asked about specific clinic data (patients, tasks, etc.), use **only** the provided context. If the information is not in the context, state that you cannot find it in the clinic's data.
- For general physiotherapy questions not related to the clinic's data, you can use your own knowledge.
- Always answer in Portuguese.`;
    
    const content = `CONTEXTO DA CLÍNICA:\n---\n${context}\n---\n\nPERGUNTA DO USUÁRIO: "${query}"`;
    
    try {
        const response = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: content,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.5,
                ...(enableHybridSearch && { tools: [{ googleSearch: {} }] }) // Conditionally add Google Search tool
            },
        });
        
        return response;
    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}


/**
 * Generates a daily briefing for the user based on their schedule and tasks.
 * @param userName The name of the user requesting the briefing.
 * @param context A string containing relevant data for the day (appointments, tasks, patient activity).
 * @returns A promise that resolves to a structured data object for the smart summary.
 * @throws {Error} If the API call fails or parsing fails.
 */
export async function generateDailyBriefing(userName: string, context: string): Promise<SmartSummaryData> {
    const systemInstruction = `Você é um assistente de produtividade para um(a) fisioterapeuta chamado(a) ${userName}. Sua tarefa é analisar os dados do dia e criar um "resumo inteligente" em formato JSON.

A resposta DEVE ser um objeto JSON válido com a seguinte estrutura:
{
  "greeting": "string", // Saudação amigável e apropriada para a hora do dia.
  "motivationalQuote": "string", // Uma citação curta e motivacional sobre saúde ou perseverança.
  "criticalAlerts": [ // Array de 0 a 3 alertas críticos. Foque no que é mais importante.
    {
      "type": "'high_pain' | 'overdue_task' | 'first_appointment' | 'pending_payment' | 'unread_message' | 'low_adherence'",
      "priority": "'high' | 'medium'",
      "description": "string" // Descrição clara e concisa do alerta.
    }
  ],
  "dailyFocus": [ // Array de 2 a 4 itens de foco para o dia.
    {
      "type": "'task' | 'appointment'",
      "priority": "'high' | 'medium' | 'low'",
      "description": "string" // Descrição clara da tarefa ou agendamento.
    }
  ]
}

- Em 'criticalAlerts', priorize pacientes com dor alta (>= 7), tarefas urgentes atrasadas e primeiras consultas.
- Identifique tendências negativas: gere um alerta 'high_pain' se o nível de dor relatado pelo paciente estiver aumentando consistentemente. Gere um alerta 'low_adherence' se um paciente não registrar exercícios por 4 dias ou mais.
- Em 'dailyFocus', liste os agendamentos do dia e as tarefas de maior prioridade.
- Seja sucinto e direto nas descrições.
- Se não houver alertas críticos ou itens de foco, retorne um array vazio [].
- Se o contexto estiver vazio, retorne um JSON com uma saudação e arrays vazios.
- NUNCA retorne nada além do objeto JSON.`;

    const content = `DADOS DO DIA PARA ${userName}:\n---\n${context}\n---\n\nPor favor, gere o resumo inteligente do dia no formato JSON especificado.`;
    
    try {
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                temperature: 0.6,
            },
        });
        
        const response: GenerateContentResponse = await withRetry(apiCall);
        
        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim();
        }

        const parsedData = JSON.parse(jsonStr);

        if (parsedData && typeof parsedData === 'object' && 'greeting' in parsedData && 'criticalAlerts' in parsedData && 'dailyFocus' in parsedData) {
            return parsedData as SmartSummaryData;
        } else {
            console.error("Parsed data for daily briefing does not match expected structure.");
            throw new Error("A resposta da IA não está no formato JSON esperado.");
        }
    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Suggests clinical goals for a patient based on their diagnostic hypothesis.
 * @param assessment The patient's assessment, containing the diagnostic hypothesis.
 * @returns A promise that resolves to an array of suggested goals.
 * @throws {Error} If the API call fails or parsing fails.
 */
export async function suggestTherapistGoals(
  assessment: Partial<Assessment>
): Promise<{ description: string; targetValue: number; unit: string }[]> {
  const systemInstruction = `Você é um fisioterapeuta experiente. Baseado na hipótese diagnóstica de um paciente, sugira 2-3 metas clínicas mensuráveis e realistas. Para cada meta, forneça uma descrição, um valor alvo (targetValue), e a unidade de medida (unit). Retorne a resposta como um array JSON de objetos, onde cada objeto tem as chaves "description", "targetValue", e "unit". Apenas retorne o array JSON.

  Exemplos de unidades: 'graus', 'cm', '%', 'nível (0-5)', 'segundos'.

  Exemplo de formato de resposta:
  [
    { "description": "Aumentar ADM de flexão do joelho", "targetValue": 120, "unit": "graus" },
    { "description": "Aumentar força do quadríceps", "targetValue": 4, "unit": "nível (0-5)" },
    { "description": "Reduzir edema da panturrilha", "targetValue": 2, "unit": "cm" }
  ]`;
  
  const content = `**Hipótese Diagnóstica:** ${assessment.diagnosticHypothesis || 'Não informada.'}`;

  try {
    const apiCall = () => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });
    
    const response: GenerateContentResponse = await withRetry(apiCall);

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);
    
    if (Array.isArray(parsedData) && parsedData.every(item => 'description' in item && 'targetValue' in item && 'unit' in item)) {
        return parsedData;
    } else {
        console.error("Parsed data for goals does not match expected structure.");
        throw new Error("A resposta da IA não está no formato JSON esperado.");
    }
  } catch (error) {
    throw new Error(handleGeminiError(error));
  }
}

/**
 * Analyzes team data to generate productivity insights.
 * @param context A string containing summarized data about tasks and users.
 * @returns A promise that resolves to an array of TeamInsight objects.
 * @throws {Error} If the API call fails or parsing fails.
 */
export async function generateTeamInsights(context: string): Promise<TeamInsight[] | null> {
    const systemInstruction = `Você é um analista de dados especialista em gestão de clínicas. Analise os dados de produtividade da equipe de fisioterapeutas e gere 2 a 3 insights acionáveis. A resposta DEVE ser um array de objetos JSON com a seguinte estrutura:
[
  {
    "id": "string", // ID único para o insight
    "title": "string", // Título curto e direto para o insight.
    "insight": "string", // Descrição detalhada e acionável do insight.
    "priority": "'high' | 'medium' | 'low'", // Prioridade do insight.
    "icon": "'performance' | 'workload' | 'bottleneck' | 'opportunity'" // Um ícone que representa a categoria do insight.
  }
]
- Analise a distribuição de tarefas, tarefas em revisão, e produtividade geral.
- Identifique possíveis gargalos (ex: muitas tarefas em 'review' para um estagiário).
- Destaque o bom desempenho.
- Sugira ações claras (ex: "Considere uma sessão de feedback", "Verifique a carga de trabalho").
- NUNCA retorne nada além do array JSON.`;

    const content = `DADOS DA EQUIPE:\n---\n${context}\n---\n\nPor favor, gere os insights da equipe no formato JSON especificado.`;
    
    try {
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                temperature: 0.8,
            },
        });
        
        const response: GenerateContentResponse = await withRetry(apiCall);
        
        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

        const parsedData = JSON.parse(jsonStr);

        if (Array.isArray(parsedData) && parsedData.every(item => 'id' in item && 'title' in item && 'insight' in item)) {
            return parsedData as TeamInsight[];
        } else {
            console.error("Parsed data for team insights does not match expected structure.");
            return null; // Return null instead of throwing error for a non-critical feature
        }
    } catch (error) {
        console.error("Error generating team insights:", error);
        // Don't throw a fatal error for this, just return null.
        return null;
    }
}

/**
 * Generates a SOAP note based on patient context.
 * @param context A string containing patient data.
 * @returns A string with the AI-generated SOAP note.
 * @throws {Error} If the API call fails.
 */
export async function generateSoapNote(context: string): Promise<string> {
    const systemInstruction = `Você é um fisioterapeuta especialista. Baseado no contexto clínico fornecido, gere uma nota de evolução concisa no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano).
- S (Subjetivo): Use relatos do paciente, como níveis de dor e dificuldade dos logs de exercícios.
- O (Objetivo): Use dados mensuráveis como ADM, força, e progresso de metas.
- A (Avaliação): Forneça uma breve análise do progresso do paciente.
- P (Plano): Sugira os próximos passos para o tratamento.
Seja direto e profissional. A resposta deve ser apenas a nota em formato Markdown.`;

    try {
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: context,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.6,
            },
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const text = response.text;
        if (!text) {
            throw new Error("A IA retornou uma resposta vazia.");
        }
        return text;
    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Generates suggestions for a SOAP note based on context.
 * @param context A string containing patient data, previous notes, etc.
 * @returns A promise that resolves to a partial SessionNote object.
 * @throws {Error} If the API call fails or parsing fails.
 */
export async function generateSessionNoteSuggestion(context: string): Promise<Partial<Omit<SessionNote, 'id'>>> {
  const systemInstruction = `Você é um fisioterapeuta experiente preenchendo uma nota de evolução SOAP. Baseado no contexto fornecido (avaliação, nota anterior, logs de exercícios), gere sugestões para cada campo (Subjetivo, Objetivo, Avaliação, Plano). Retorne a resposta como um único objeto JSON com as chaves "subjective", "objective", "assessment", e "plan". As sugestões devem ser concisas e clínicas.

  Exemplo de formato de resposta:
  {
    "subjective": "Paciente refere melhora da dor em 80%. Conseguiu realizar todas as atividades diárias.",
    "objective": "ADM de flexão do ombro aumentada para 160 graus. Força muscular grau 5.",
    "assessment": "Evolução positiva, atingindo os objetivos de curto prazo. Boa adesão ao plano de casa.",
    "plan": "Progredir para exercícios com carga. Iniciar treino de propriocepção. Reavaliar em 2 sessões."
  }`;

  const content = `**Contexto Clínico:**\n${context}\n\n**Tarefa:** Gere as sugestões para a nota SOAP no formato JSON especificado.`;
  
  try {
    const apiCall = () => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const response: GenerateContentResponse = await withRetry(apiCall);

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);
    
    if (parsedData && 'subjective' in parsedData && 'objective' in parsedData && 'assessment' in parsedData && 'plan' in parsedData) {
        return parsedData;
    } else {
        console.error("Parsed data for SOAP note does not match expected structure.");
        throw new Error("A resposta da IA não está no formato JSON esperado.");
    }

  } catch (error) {
    throw new Error(handleGeminiError(error));
  }
}

/**
 * Generates a clinical summary of a patient's history.
 * @param context A string containing patient data (assessments, notes, goals).
 * @returns A promise that resolves to a markdown string with the clinical summary.
 * @throws {Error} If the API call fails.
 */
export async function generateClinicalSummary(context: string): Promise<string> {
    const systemInstruction = `Você é um fisioterapeuta sênior. Sua tarefa é analisar o histórico completo de um paciente e gerar um resumo clínico conciso e bem estruturado. A resposta deve ser em formato Markdown, ideal para revisões rápidas ou encaminhamentos.
    Estruture a resposta da seguinte forma:
    - **Diagnóstico Principal:** Com base na última avaliação.
    - **Histórico da Condição:** Um breve resumo da história da moléstia atual.
    - **Evolução do Tratamento:** Destaque os principais marcos do tratamento, melhoras em ADM, força e dor.
    - **Status Atual:** Como o paciente se encontra agora, com base nas últimas notas e logs.
    - **Principais Metas Ativas:** Liste as metas clínicas e pessoais mais importantes.
    - **Recomendações/Pontos de Atenção:** Sugestões para os próximos passos ou áreas que precisam de atenção.`;

    try {
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Por favor, resuma o seguinte contexto clínico:\n\n${context}`,
            config: {
                systemInstruction,
                temperature: 0.6,
            },
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const text = response.text;
        if (!text) {
            throw new Error("A IA retornou uma resposta vazia.");
        }
        return text;
    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Suggests the next appointment date and type for a patient.
 * @param context A string with the patient's context (last note, protocol, etc.).
 * @returns A promise that resolves to an object with the suggested appointment details.
 */
export async function suggestNextAppointment(
  context: string
): Promise<{ date: string; type: AppointmentType; reason: string }> {
  const systemInstruction = `Você é um assistente de agendamento para uma clínica de fisioterapia. Baseado no contexto fornecido, sugira a data e o tipo da próxima consulta.
- Retorne a resposta como um único objeto JSON com as chaves "date" (no formato YYYY-MM-DD), "type" (com valor 'avaliacao', 'sessao', ou 'retorno'), e "reason" (uma breve justificativa).
- Se a nota indica boa evolução, sugira 'sessao' em 5-7 dias.
- Se indica reavaliação, sugira 'retorno' em 7-10 dias.
- Se o protocolo está terminando, sugira 'avaliacao' para a próxima fase.
- Seja conservador com as datas. A data base é hoje.

Exemplo de formato de resposta:
{ "date": "2024-08-10", "type": "sessao", "reason": "Continuidade do tratamento conforme plano." }`;

  const content = `Hoje é ${new Date().toLocaleDateString(
    'en-CA'
  )}. Contexto Clínico:\n${context}\n\n**Tarefa:** Gere a sugestão para a próxima consulta no formato JSON especificado.`;

  try {
    const apiCall = () => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: content,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.5,
      },
    });

    const response: GenerateContentResponse = await withRetry(apiCall);

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);

    if (parsedData && 'date' in parsedData && 'type' in parsedData && 'reason' in parsedData) {
      return parsedData;
    } else {
      throw new Error('A resposta da IA não está no formato JSON esperado.');
    }
  } catch (error) {
    throw new Error(handleGeminiError(error));
  }
}


/**
 * Generates dropout risk predictions for patients.
 * @param context A string containing summarized data about patients.
 * @returns A promise that resolves to an array of DropoutRiskPrediction objects.
 * @throws {Error} If the API call fails or parsing fails.
 */
export async function generateDropoutRiskPredictions(context: string): Promise<DropoutRiskPrediction[]> {
    const systemInstruction = `You are a data analyst for a physiotherapy clinic. Your task is to identify patients who are at risk of dropping out of their treatment. Based on the provided patient data, predict a risk level ('Alto', 'Médio', 'Baixo') and provide a concise, scannable reason for your prediction. A high risk could be due to missed appointments, low engagement with home exercises, consistently high pain levels, or long gaps in communication/sessions. Return the data as a JSON array of objects. Only return patients with 'Alto' or 'Médio' risk. Do not include patients with 'Baixo' risk. Sort the results by score in descending order.`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                patientId: { type: Type.STRING },
                riskLevel: { type: Type.STRING, enum: ['Alto', 'Médio', 'Baixo'] },
                reason: { type: Type.STRING },
                score: { type: Type.NUMBER }
            },
            required: ['patientId', 'riskLevel', 'reason', 'score']
        }
    };
    
    const content = `DADOS DOS PACIENTES:\n---\n${context}\n---\n\nPor favor, gere a predição de risco de evasão no formato JSON especificado.`;
    
    try {
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        
        const response: GenerateContentResponse = await withRetry(apiCall);
        
        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

        const parsedData = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedData) && (parsedData.length === 0 || parsedData.every(item => 'id' in item && 'riskLevel' in item && 'reason' in item && 'score' in item))) {
            return parsedData as DropoutRiskPrediction[];
        } else {
            console.error("Parsed data for dropout risk does not match expected structure.");
            throw new Error("A resposta da IA não está no formato JSON esperado.");
        }
    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Generates general tips for a home exercise plan.
 * @param exercises The list of prescribed exercises.
 * @returns A string with AI-generated tips in Markdown format.
 * @throws {Error} If the API call fails.
 */
export async function generateExercisePlanTips(exercises: Exercise[]): Promise<string> {
    if (exercises.length === 0) {
        return "Nenhum exercício fornecido para gerar dicas.";
    }

    const systemInstruction = `Você é um fisioterapeuta experiente e motivador. Sua tarefa é analisar uma lista de exercícios de casa e fornecer dicas gerais e encorajamento para o paciente. As dicas devem ser curtas, práticas e fáceis de entender. Organize a resposta em formato Markdown com bullet points. Foque em segurança, consistência e escuta do corpo.`;

    const exerciseList = exercises.map(e => `- ${e.name} (${e.category})`).join('\n');
    
    const content = `**Plano de Exercícios:**\n${exerciseList}\n\n**Tarefa:** Gere dicas gerais e motivacionais para este plano de exercícios.`;

    try {
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
            config: {
                systemInstruction,
                temperature: 0.7,
            },
        });
        
        const response: GenerateContentResponse = await withRetry(apiCall);
        
        const text = response.text;
        if (!text) {
            throw new Error("A IA não conseguiu gerar as dicas. Tente novamente.");
        }
        
        return text;

    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Generates financial insights based on transaction data.
 * @param context A string containing transaction data.
 * @returns A promise that resolves to a markdown string with insights.
 */
export async function generateFinancialInsights(context: string): Promise<string> {
    const systemInstruction = `Você é um consultor financeiro para uma clínica de fisioterapia. Analise os dados de transações e forneça 2-3 insights e recomendações em formato Markdown. Foque em tendências de faturamento, pacotes/serviços mais rentáveis, e sugestões para otimização de receita. Seja conciso e direto.`;
    try {
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: context,
            config: { systemInstruction, temperature: 0.7 }
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const text = response.text;
        if (!text) throw new Error("A IA retornou uma resposta vazia.");
        return text;
    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Projects a patient's likely evolution based on their clinical history.
 * @param context A string containing patient data.
 * @returns A promise that resolves to a markdown string with the projection.
 */
export async function projectPatientEvolution(context: string): Promise<string> {
    const systemInstruction = `Você é um fisioterapeuta experiente. Com base no histórico clínico, avaliações e logs de exercícios de um paciente, projete a evolução provável nas próximas 2-4 semanas. Mencione marcos esperados, possíveis desafios e o prognóstico geral de forma realista e baseada em evidências. A resposta deve ser em formato Markdown, com tom profissional e encorajador.`;
    try {
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Por favor, projete a evolução do paciente com base no seguinte contexto:\n\n${context}`,
            config: { systemInstruction, temperature: 0.6 }
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const text = response.text;
        if (!text) throw new Error("A IA retornou uma resposta vazia.");
        return text;
    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}

/**
 * Analyzes body chart markings to provide a clinical interpretation.
 * @param chartData An array of body chart markings.
 * @returns A string with the AI-generated analysis in Markdown format.
 * @throws {Error} If the API call fails.
 */
export async function analyzeBodyChart(chartData: BodyChartMarking[]): Promise<string> {
    if (chartData.length === 0) {
        return "Nenhum ponto de dor foi marcado para análise.";
    }

    const systemInstruction = `Você é um fisioterapeuta experiente analisando um mapa corporal de dor. Com base nos pontos de dor marcados, descreva os padrões de dor, sugira possíveis estruturas anatômicas afetadas (músculos, nervos, articulações), e liste possíveis condições associadas em ordem de probabilidade. Seja clínico e conciso. A resposta deve ser em formato Markdown.

    **Exemplo de Análise:**
    ### Análise do Padrão de Dor
    O paciente relata dor aguda na região do ombro direito anterior e formigamento que se irradia pelo braço.

    ### Estruturas Possivelmente Afetadas
    - **Muscular:** Músculos do manguito rotador (supraespinhal), cabeça longa do bíceps.
    - **Nervoso:** Raízes nervosas de C5-C6, nervo supraescapular.
    - **Articular:** Articulação glenoumeral, articulação acromioclavicular.

    ### Hipóteses Diagnósticas
    1.  **Síndrome do Impacto do Ombro:** Com base na localização da dor.
    2.  **Tendinopatia do Manguito Rotador:** Padrão comum de dor no ombro.
    3.  **Cervicobraquialgia:** Devido ao formigamento irradiado.`;

    const painTypeLabels: Record<BodyChartMarking['painType'], string> = {
        sharp: 'Aguda/Pontada',
        dull: 'Incômodo/Surda',
        tingling: 'Formigamento',
        burning: 'Queimação',
        numbness: 'Dormência'
    };
    
    const markingsDescription = chartData.map(m => 
        `- Dor do tipo "${painTypeLabels[m.painType]}" na vista ${m.view === 'front' ? 'frontal' : 'posterior'} nas coordenadas (x: ${m.x.toFixed(1)}%, y: ${m.y.toFixed(1)}%).`
    ).join('\n');

    const content = `**Marcações no Mapa Corporal:**\n${markingsDescription}\n\n**Tarefa:** Forneça a análise clínica no formato Markdown especificado.`;

    try {
        const apiCall = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content,
            config: {
                systemInstruction,
                temperature: 0.6,
            },
        });
        const response: GenerateContentResponse = await withRetry(apiCall);
        const text = response.text;
        if (!text) {
            throw new Error("A IA retornou uma resposta vazia.");
        }
        return text;
    } catch (error) {
        throw new Error(handleGeminiError(error));
    }
}