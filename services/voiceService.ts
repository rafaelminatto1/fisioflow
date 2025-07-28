import { GoogleGenerativeAI } from '@google/generative-ai';

import { aiCache } from './aiCache';
import { processVoiceToText } from './geminiService';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface VoiceTranscriptionResult {
  transcription: string;
  confidence: number;
  processedText: string;
  detectedLanguage: string;
  duration: number;
  segments: TranscriptionSegment[];
  medicalTermsDetected: MedicalTerm[];
}

export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
}

export interface MedicalTerm {
  term: string;
  confidence: number;
  category: 'anatomy' | 'symptom' | 'medication' | 'procedure' | 'measurement';
  normalizedForm: string;
  position: { start: number; end: number };
}

export interface VoiceRecordingSession {
  id: string;
  patientId?: string;
  contextType: 'assessment' | 'progress' | 'prescription' | 'general';
  startTime: string;
  endTime?: string;
  recordings: VoiceRecording[];
  finalTranscription?: string;
  status: 'recording' | 'processing' | 'completed' | 'error';
}

export interface VoiceRecording {
  id: string;
  audioBlob: Blob;
  duration: number;
  timestamp: string;
  transcription?: VoiceTranscriptionResult;
}

/**
 * Simulates voice-to-text conversion with Web Speech API integration.
 * In a real implementation, this would integrate with browser's SpeechRecognition API.
 * @param audioBlob Audio blob to transcribe
 * @param options Transcription options
 * @returns Transcription result
 */
export async function transcribeAudio(
  audioBlob: Blob,
  options: {
    contextType: 'assessment' | 'progress' | 'prescription' | 'general';
    language?: string;
    medicalMode?: boolean;
  },
  userId = 'anonymous'
): Promise<VoiceTranscriptionResult> {
  // Simula a transcrição de áudio para texto
  // Em uma implementação real, isso integraria com APIs de speech-to-text
  console.log(`🎙️ Simulating audio transcription (contextType: ${options.contextType})`);
  
  try {
    // Simulação de transcrição - em produção, usaria uma API real como Google Speech-to-Text
    const simulatedTranscription = await simulateAudioTranscription(audioBlob, options);
    
    // Processa o texto transcrito com IA para melhorar a qualidade
    const processedText = await processVoiceToText(
      simulatedTranscription.transcription,
      options.contextType,
      userId
    );

    const result: VoiceTranscriptionResult = {
      transcription: simulatedTranscription.transcription,
      confidence: simulatedTranscription.confidence,
      processedText: processedText,
      detectedLanguage: options.language || 'pt-BR',
      duration: simulatedTranscription.duration,
      segments: simulatedTranscription.segments,
      medicalTermsDetected: await detectMedicalTerms(simulatedTranscription.transcription, userId)
    };

    return result;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Falha na transcrição do áudio.');
  }
}

/**
 * Starts a voice recording session for clinical documentation.
 * @param contextType Type of clinical context
 * @param patientId Optional patient ID for context
 * @returns Recording session object
 */
export function startVoiceRecordingSession(
  contextType: VoiceRecordingSession['contextType'],
  patientId?: string
): VoiceRecordingSession {
  const session: VoiceRecordingSession = {
    id: `voice_session_${Date.now()}`,
    patientId,
    contextType,
    startTime: new Date().toISOString(),
    recordings: [],
    status: 'recording'
  };

  console.log(`🎙️ Started voice recording session: ${session.id}`);
  return session;
}

/**
 * Adds a voice recording to an existing session.
 * @param sessionId Session ID
 * @param audioBlob Audio data
 * @param session Current session object
 * @returns Updated session
 */
export async function addVoiceRecording(
  sessionId: string,
  audioBlob: Blob,
  session: VoiceRecordingSession,
  userId = 'anonymous'
): Promise<VoiceRecordingSession> {
  console.log(`🎙️ Adding voice recording to session: ${sessionId}`);
  
  try {
    const recording: VoiceRecording = {
      id: `recording_${Date.now()}`,
      audioBlob,
      duration: await getAudioDuration(audioBlob),
      timestamp: new Date().toISOString()
    };

    // Transcreve o áudio automaticamente
    try {
      recording.transcription = await transcribeAudio(
        audioBlob,
        {
          contextType: session.contextType,
          language: 'pt-BR',
          medicalMode: true
        },
        userId
      );
    } catch (transcriptionError) {
      console.warn('Transcription failed for recording:', transcriptionError);
    }

    const updatedSession = {
      ...session,
      recordings: [...session.recordings, recording]
    };

    return updatedSession;
  } catch (error) {
    console.error('Error adding voice recording:', error);
    throw new Error('Falha ao adicionar gravação de voz.');
  }
}

/**
 * Completes a voice recording session and generates final transcription.
 * @param session Recording session to complete
 * @returns Completed session with final transcription
 */
export async function completeVoiceRecordingSession(
  session: VoiceRecordingSession,
  userId = 'anonymous'
): Promise<VoiceRecordingSession> {
  console.log(`🎙️ Completing voice recording session: ${session.id}`);
  
  try {
    session.status = 'processing';
    
    // Combina todas as transcrições em um texto final
    const allTranscriptions = session.recordings
      .map(r => r.transcription?.processedText || r.transcription?.transcription || '')
      .filter(text => text.length > 0)
      .join(' ');

    if (allTranscriptions.length > 0) {
      // Refina o texto final com IA
      const finalTranscription = await refineFinalTranscription(
        allTranscriptions,
        session.contextType,
        userId
      );

      const completedSession: VoiceRecordingSession = {
        ...session,
        endTime: new Date().toISOString(),
        finalTranscription,
        status: 'completed'
      };

      return completedSession;
    } else {
      throw new Error('Nenhuma transcrição válida encontrada.');
    }
  } catch (error) {
    console.error('Error completing voice recording session:', error);
    return {
      ...session,
      status: 'error',
      endTime: new Date().toISOString()
    };
  }
}

/**
 * Refines the final transcription text for clinical documentation.
 * @param combinedText Combined transcription text
 * @param contextType Clinical context
 * @returns Refined transcription
 */
async function refineFinalTranscription(
  combinedText: string,
  contextType: VoiceRecordingSession['contextType'],
  userId: string
): Promise<string> {
  const cacheKey = `refine_transcription_${contextType}_${combinedText.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, combinedText, userId);
    if (cached) {
      console.log('✨ Retornando refinamento de transcrição do cache (economia ~$0.03)');
      return cached;
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Refining final transcription (custo ~$0.03): ${contextType}`);
  
  try {
    const contextInstructions = {
      assessment: 'Organize como uma avaliação fisioterapêutica estruturada, com anamnese, exame físico e impressões clínicas.',
      progress: 'Estruture como uma nota de evolução cronológica, destacando mudanças no quadro clínico.',
      prescription: 'Formate como instruções claras de exercícios e orientações terapêuticas.',
      general: 'Organize e melhore a clareza do texto mantendo todas as informações clínicas relevantes.'
    };

    const systemInstruction = `Você é um especialista em refinamento de transcrições clínicas.
    Melhore o texto transcrito de voz para escrita, realizando:
    
    1. Correção de erros de transcrição
    2. Melhoria da estrutura e fluxo do texto
    3. Padronização da terminologia médica
    4. Organização lógica das informações
    5. Remoção de hesitações e repetições desnecessárias
    
    Contexto específico: ${contextInstructions[contextType]}
    
    Mantenha todo o conteúdo clínico relevante, apenas melhorando a apresentação.`;

    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(`Refine esta transcrição clínica: "${combinedText}"`);
    const result = await response.response;
    const refinedText = result.text();

    if (!refinedText) {
      return combinedText; // Retorna texto original se falhar
    }

    aiCache.set(cacheKey, combinedText, refinedText);
    return refinedText;
  } catch (error) {
    console.error('Error refining final transcription:', error);
    return combinedText; // Retorna texto original em caso de erro
  }
}

/**
 * Detects medical terms in transcribed text.
 * @param text Transcribed text
 * @returns Array of detected medical terms
 */
async function detectMedicalTerms(
  text: string,
  userId: string
): Promise<MedicalTerm[]> {
  const cacheKey = `medical_terms_${text.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, text, userId);
    if (cached) {
      console.log('🏥 Retornando termos médicos do cache (economia ~$0.02)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Detecting medical terms (custo ~$0.02)`);
  
  try {
    const systemInstruction = `Você é um especialista em terminologia médica fisioterapêutica.
    Identifique e extraia termos médicos do texto fornecido, classificando-os por categoria.
    
    Categorias:
    - anatomy: partes do corpo, músculos, articulações
    - symptom: sintomas, sinais, queixas
    - medication: medicamentos, drogas
    - procedure: procedimentos, técnicas, testes
    - measurement: medidas, escalas, valores
    
    Forneça a forma normalizada de cada termo.`;

    const prompt = `Identifique termos médicos neste texto:
    
    "${text}"
    
    Retorne JSON:
    {
      "medicalTerms": [
        {
          "term": "termo encontrado",
          "confidence": 90,
          "category": "anatomy|symptom|medication|procedure|measurement",
          "normalizedForm": "forma padronizada do termo",
          "position": {"start": 10, "end": 20}
        }
      ]
    }`;

    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(prompt);
    const result = await response.response;
    const termsData = JSON.parse(result.text().trim());
    
    const medicalTerms = termsData.medicalTerms || [];
    aiCache.set(cacheKey, text, JSON.stringify(medicalTerms));
    return medicalTerms;
  } catch (error) {
    console.error('Error detecting medical terms:', error);
    return [];
  }
}

/**
 * Simulates audio transcription (placeholder for real speech-to-text API).
 * @param audioBlob Audio data
 * @param options Transcription options
 * @returns Simulated transcription result
 */
async function simulateAudioTranscription(
  audioBlob: Blob,
  options: any
): Promise<{
  transcription: string;
  confidence: number;
  duration: number;
  segments: TranscriptionSegment[];
}> {
  // Simulação - em produção, integraria com Google Speech-to-Text, Azure Speech, etc.
  const duration = await getAudioDuration(audioBlob);
  
  // Exemplos de transcrições simuladas baseadas no contexto
  const simulatedTranscriptions = {
    assessment: 'Paciente relata dor no ombro direito há três semanas, iniciada após atividade física. Dor piora com movimento de elevação e abdução. Não há irradiação. Nega trauma ou quedas.',
    progress: 'Paciente apresenta melhora significativa da dor, de oito para quatro na escala visual analógica. Amplitude de movimento aumentou em aproximadamente vinte graus. Continua com exercícios domiciliares.',
    prescription: 'Exercícios de fortalecimento dos músculos rotadores do ombro, três séries de quinze repetições, duas vezes ao dia. Alongamento da cápsula posterior, manter por trinta segundos.',
    general: 'Sessão de fisioterapia realizada com foco em mobilização articular e fortalecimento muscular. Paciente tolerou bem o tratamento sem intercorrências.'
  };

  const transcription = simulatedTranscriptions[options.contextType] || simulatedTranscriptions.general;
  
  return {
    transcription,
    confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
    duration,
    segments: [{
      text: transcription,
      startTime: 0,
      endTime: duration,
      confidence: 0.9
    }]
  };
}

/**
 * Gets duration of audio blob.
 * @param audioBlob Audio data
 * @returns Duration in seconds
 */
async function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration || 0);
    };
    audio.onerror = () => {
      resolve(0); // Fallback duration
    };
    audio.src = URL.createObjectURL(audioBlob);
  });
}

/**
 * Initializes Web Speech API for real-time voice recognition.
 * This is a browser-side function that would be called from the frontend.
 */
export function initializeWebSpeechAPI(): {
  startRecognition: (callback: (text: string) => void) => void;
  stopRecognition: () => void;
  isSupported: boolean;
} {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    return {
      startRecognition: () => console.warn('Speech recognition not supported'),
      stopRecognition: () => {},
      isSupported: false
    };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'pt-BR';

  return {
    startRecognition: (callback: (text: string) => void) => {
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          callback(finalTranscript);
        }
      };
      recognition.start();
    },
    stopRecognition: () => {
      recognition.stop();
    },
    isSupported: true
  };
}

/**
 * Converts speech to structured clinical notes with AI enhancement.
 * @param audioStream Audio stream or file
 * @param contextType Type of clinical documentation
 * @returns Enhanced clinical notes
 */
export async function speechToStructuredNotes(
  audioStream: MediaStream | Blob,
  contextType: 'assessment' | 'progress' | 'prescription' | 'general',
  userId = 'anonymous'
): Promise<{
  originalTranscription: string;
  structuredNotes: string;
  extractedData: Record<string, any>;
  confidence: number;
}> {
  console.log(`🎙️ Converting speech to structured notes: ${contextType}`);
  
  try {
    let audioBlob: Blob;
    
    if (audioStream instanceof MediaStream) {
      // Convert MediaStream to Blob (simplified - would need MediaRecorder in real implementation)
      audioBlob = new Blob([], { type: 'audio/wav' });
    } else {
      audioBlob = audioStream;
    }

    // Transcreve o áudio
    const transcriptionResult = await transcribeAudio(
      audioBlob,
      {
        contextType,
        language: 'pt-BR',
        medicalMode: true
      },
      userId
    );

    // Extrai dados estruturados usando IA
    const extractedData = await extractStructuredDataFromSpeech(
      transcriptionResult.processedText,
      contextType,
      userId
    );

    return {
      originalTranscription: transcriptionResult.transcription,
      structuredNotes: transcriptionResult.processedText,
      extractedData,
      confidence: transcriptionResult.confidence
    };
  } catch (error) {
    console.error('Error converting speech to structured notes:', error);
    throw new Error('Falha na conversão de voz para notas estruturadas.');
  }
}

/**
 * Extracts structured data from processed speech text.
 * @param processedText Enhanced transcription text
 * @param contextType Clinical context
 * @returns Structured data object
 */
async function extractStructuredDataFromSpeech(
  processedText: string,
  contextType: string,
  userId: string
): Promise<Record<string, any>> {
  const cacheKey = `extract_speech_data_${contextType}_${processedText.slice(0, 50)}`;
  
  try {
    const cached = aiCache.get(cacheKey, processedText, userId);
    if (cached) {
      console.log('📊 Retornando extração de dados de fala do cache (economia ~$0.03)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Extracting structured data from speech (custo ~$0.03): ${contextType}`);
  
  try {
    const extractionSchemas = {
      assessment: {
        queixaPrincipal: 'string',
        historico: 'string',
        nivelDor: 'number',
        localizacaoDor: 'string',
        fatoresAliviantes: 'array',
        fatoresAgravantes: 'array',
        limitacoesFuncionais: 'array'
      },
      progress: {
        nivelDorAtual: 'number',
        nivelDorAnterior: 'number',
        melhorasObservadas: 'array',
        dificuldadesRelatadas: 'array',
        aderenciaExercicios: 'string',
        observacoes: 'string'
      },
      prescription: {
        exerciciosPrescritos: 'array',
        frequencia: 'string',
        duracao: 'string',
        precaucoes: 'array',
        orientacoes: 'string'
      },
      general: {
        pontosPrincipais: 'array',
        observacoes: 'string',
        proximosPassos: 'array'
      }
    };

    const schema = extractionSchemas[contextType as keyof typeof extractionSchemas] || extractionSchemas.general;

    const systemInstruction = `Você é um especialista em extração de dados clínicos estruturados.
    Extraia informações específicas do texto de transcrição de voz e organize conforme o esquema fornecido.
    
    Seja preciso e extraia apenas informações explicitamente mencionadas no texto.
    Para informações numéricas (como nível de dor), extraia valores específicos quando mencionados.`;

    const prompt = `Extraia dados estruturados deste texto de transcrição:

"${processedText}"

Esquema de dados desejado:
${JSON.stringify(schema, null, 2)}

Retorne JSON seguindo exatamente o esquema, com valores extraídos do texto ou null quando não mencionado.`;

    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(prompt);
    const result = await response.response;
    const extractedData = JSON.parse(result.text().trim());

    aiCache.set(cacheKey, processedText, JSON.stringify(extractedData));
    return extractedData;
  } catch (error) {
    console.error('Error extracting structured data from speech:', error);
    return {};
  }
}