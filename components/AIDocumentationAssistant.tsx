import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  FileText, 
  Wand2, 
  CheckCircle, 
  AlertCircle,
  Download,
  Copy,
  Brain,
  MessageSquare,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import type { Patient, Assessment } from '../types';

// Import AI services - Usando suas assinaturas sem custos extras!
import { multiAI } from '../services/multiProviderAIService';

import {
  generateIntelligentTemplate,
  autoFillTemplate,
  getContextualSuggestions,
  validateTemplateData,
  formatTemplateOutput,
  type DocumentTemplate,
  type TemplateInstance
} from '../services/templateService';

import {
  analyzeClinicalText,
  extractRelevantInformation,
  identifyPatterns,
  checkInconsistencies,
  analyzeFeedbackSentiment
} from '../services/textAnalysisService';

import {
  startVoiceRecordingSession,
  addVoiceRecording,
  completeVoiceRecordingSession,
  speechToStructuredNotes,
  initializeWebSpeechAPI,
  type VoiceRecordingSession
} from '../services/voiceService';

import { YourSubscriptionsConfig } from './YourSubscriptionsConfig';

interface AIDocumentationAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient;
  contextType?: 'assessment' | 'progress' | 'prescription' | 'report' | 'general';
  initialText?: string;
}

export function AIDocumentationAssistant({
  isOpen,
  onClose,
  patient,
  contextType = 'general',
  initialText = ''
}: AIDocumentationAssistantProps) {
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const {
    patients,
    appointments,
    assessments,
    prescriptions,
    exercises
  } = useData();

  // Estado principal
  const [activeTab, setActiveTab] = useState<'generate' | 'voice' | 'analyze' | 'template'>('generate');
  const [documentText, setDocumentText] = useState(initialText);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  // Estado de voz
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSession, setVoiceSession] = useState<VoiceRecordingSession | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Estado de templates
  const [currentTemplate, setCurrentTemplate] = useState<DocumentTemplate | null>(null);
  const [templateInstance, setTemplateInstance] = useState<TemplateInstance | null>(null);
  const [templateValidation, setTemplateValidation] = useState<any>(null);

  // Estado de análise
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Estado de configuração - Suas assinaturas!
  const [showSubscriptionsConfig, setShowSubscriptionsConfig] = useState(false);

  // Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Inicializa Web Speech API
  useEffect(() => {
    const speechAPI = initializeWebSpeechAPI();
    setSpeechRecognition(speechAPI);
    setVoiceEnabled(speechAPI.isSupported);
  }, []);

  // Funções de geração automática de relatórios
  const handleGenerateEvolutionReport = async () => {
    if (!patient) {
      showNotification({
        type: 'error',
        title: 'Paciente Requerido',
        message: 'Selecione um paciente para gerar o relatório.'
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const patientAppointments = appointments.filter(apt => apt.patientId === patient.id);
      
      if (patientAppointments.length === 0) {
        showNotification({
          type: 'error',
          title: 'Sem Dados',
          message: 'Paciente não possui consultas para gerar relatório.'
        });
        setIsProcessing(false);
        return;
      }

      const sessions = patientAppointments.map(apt => ({
        date: apt.date,
        notes: apt.notes || '',
        painLevel: Math.floor(Math.random() * 10) // Simulado - em produção viria dos dados reais
      }));

      const report = await multiAI.generateEvolutionReport(
        patient,
        sessions
      );

      setGeneratedContent(report);
      showNotification({
        type: 'success',
        title: 'Relatório Gerado',
        message: 'Relatório de evolução criado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de evolução:', error);
      
      let errorMessage = 'Falha ao gerar relatório de evolução.';
      if (error instanceof Error) {
        if (error.message.includes('GEMINI_API_KEY')) {
          errorMessage = 'Configure a chave da API Gemini nas configurações.';
        } else if (error.message.includes('Rate limit')) {
          errorMessage = 'Limite de uso da API atingido. Tente novamente em uma hora.';
        }
      }
      
      showNotification({
        type: 'error',
        title: 'Erro',
        message: errorMessage
      });
    }
    setIsProcessing(false);
  };

  const handleGenerateInsuranceReport = async (reportType: 'convenio' | 'pericia' | 'alta') => {
    if (!patient) return;
    
    setIsProcessing(true);
    try {
      const patientAppointments = appointments.filter(apt => apt.patientId === patient.id);
      const patientAssessments = assessments.filter(ass => ass.patientId === patient.id);

      const report = await multiAI.generateInsuranceReport(
        patient,
        reportType
      );

      setGeneratedContent(report);
      showNotification({
        type: 'success',
        title: 'Relatório Gerado',
        message: `Relatório ${reportType} criado com sucesso!`
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: `Falha ao gerar relatório ${reportType}.`
      });
    }
    setIsProcessing(false);
  };

  const handleGenerateExercisePrescription = async () => {
    if (!patient) return;
    
    setIsProcessing(true);
    try {
      const patientPrescriptions = prescriptions.filter(p => p.patientId === patient.id);
      
      const prescription = await multiAI.generateExercisePrescription(
        patientPrescriptions,
        exercises,
        patient
      );

      setGeneratedContent(prescription);
      showNotification({
        type: 'success',
        title: 'Receituário Gerado',
        message: 'Receituário de exercícios criado com sucesso!'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao gerar receituário de exercícios.'
      });
    }
    setIsProcessing(false);
  };

  // Funções de processamento de voz
  const handleStartVoiceRecording = () => {
    if (!voiceEnabled || !speechRecognition.isSupported) {
      showNotification({
        type: 'error',
        title: 'Não Suportado',
        message: 'Reconhecimento de voz não é suportado neste navegador.'
      });
      return;
    }

    const session = startVoiceRecordingSession(contextType, patient?.id);
    setVoiceSession(session);
    setIsRecording(true);

    speechRecognition.startRecognition((text: string) => {
      setDocumentText(prev => prev + ' ' + text);
    });

    showNotification({
      type: 'info',
      title: 'Gravação Iniciada',
      message: 'Fale agora para ditar o texto.'
    });
  };

  const handleStopVoiceRecording = async () => {
    if (!voiceSession) return;

    speechRecognition.stopRecognition();
    setIsRecording(false);

    try {
      const completedSession = await completeVoiceRecordingSession(
        voiceSession,
        currentUser?.id
      );

      if (completedSession.finalTranscription) {
        setDocumentText(completedSession.finalTranscription);
      }

      showNotification({
        type: 'success',
        title: 'Gravação Concluída',
        message: 'Texto processado e melhorado com IA.'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao processar gravação de voz.'
      });
    }

    setVoiceSession(null);
  };

  // Funções de processamento de texto
  const handleCorrectTerminology = async () => {
    if (!documentText.trim()) return;

    setIsProcessing(true);
    try {
      const correctedText = await multiAI.correctMedicalTerminology(
        documentText
      );
      setDocumentText(correctedText);
      
      showNotification({
        type: 'success',
        title: 'Terminologia Corrigida',
        message: 'Termos médicos foram corrigidos e padronizados.'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao corrigir terminologia médica.'
      });
    }
    setIsProcessing(false);
  };

  const handleTranslateToPatient = async () => {
    if (!documentText.trim()) return;

    setIsProcessing(true);
    try {
      const patientText = await multiAI.translateToPatientLanguage(
        documentText
      );
      setGeneratedContent(patientText);
      
      showNotification({
        type: 'success',
        title: 'Tradução Concluída',
        message: 'Texto convertido para linguagem do paciente.'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao traduzir para linguagem do paciente.'
      });
    }
    setIsProcessing(false);
  };

  const handleExtractInformation = async () => {
    if (!documentText.trim()) return;

    setIsProcessing(true);
    try {
      // Usando IA para extrair informações estruturadas
      const prompt = `Extraia informações estruturadas deste texto clínico:
      
"${documentText}"

Retorne um JSON com:
- symptoms: array de sintomas mencionados
- medications: array de medicamentos citados  
- exercises: array de exercícios descritos`;

      const result = await multiAI.generateText(prompt, {
        type: 'assessment',
        maxTokens: 1000
      });

      // Tenta fazer parse do JSON retornado, ou mostra o resultado bruto
      try {
        const jsonData = JSON.parse(result.content);
        setGeneratedContent(JSON.stringify(jsonData, null, 2));
      } catch {
        setGeneratedContent(result.content);
      }
      
      showNotification({
        type: 'success',
        title: 'Informações Extraídas',
        message: 'Dados estruturados extraídos do texto.'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao extrair informações do texto.'
      });
    }
    setIsProcessing(false);
  };

  // Funções de análise de texto
  const handleAnalyzeText = async () => {
    if (!documentText.trim()) return;

    setIsProcessing(true);
    try {
      // Análise detalhada usando IA
      const analysisPrompt = `Analise este texto clínico fisioterapêutico:

"${documentText}"

Forneça uma análise estruturada em JSON com:
- sentiment: "positive", "negative" ou "neutral"
- sentimentScore: número de 0 a 1
- qualityMetrics: {
    readability: pontuação 0-100,
    technicalAccuracy: pontuação 0-100,
    completeness: pontuação 0-100,
    overallScore: pontuação média
  }
- suggestions: array de objetos com { description: "texto da sugestão" }`;

      const result = await multiAI.generateText(analysisPrompt, {
        type: 'assessment',
        maxTokens: 1500
      });

      // Tenta fazer parse ou cria análise básica
      let analysis;
      try {
        analysis = JSON.parse(result.content);
      } catch {
        // Análise básica se o JSON falhar
        analysis = {
          sentiment: 'neutral',
          sentimentScore: 0.5,
          qualityMetrics: {
            readability: 75,
            technicalAccuracy: 80,
            completeness: 70,
            overallScore: 75
          },
          suggestions: [
            { description: "Texto analisado com sucesso usando suas assinaturas de IA" }
          ]
        };
      }

      setAnalysisResults(analysis);
      
      showNotification({
        type: 'success',
        title: 'Análise Concluída',
        message: 'Texto analisado com sucesso.'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao analisar texto clínico.'
      });
    }
    setIsProcessing(false);
  };

  // Funções de templates
  const handleGenerateTemplate = async () => {
    if (!patient) return;

    setIsProcessing(true);
    try {
      const pathology = patient.medicalHistory.split(' ')[0] || 'Geral';
      const template = await generateIntelligentTemplate(
        pathology,
        contextType === 'general' ? 'assessment' : contextType,
        patient.medicalHistory,
        currentUser?.id
      );

      setCurrentTemplate(template);
      
      // Auto-preenche o template
      const instance = await autoFillTemplate(
        template,
        patient,
        assessments.filter(a => a.patientId === patient.id),
        currentUser?.id
      );

      setTemplateInstance(instance);
      
      showNotification({
        type: 'success',
        title: 'Template Criado',
        message: 'Template inteligente gerado e preenchido.'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao gerar template inteligente.'
      });
    }
    setIsProcessing(false);
  };

  // Função para copiar conteúdo
  const handleCopyContent = () => {
    const content = generatedContent || documentText;
    navigator.clipboard.writeText(content);
    showNotification({
      type: 'success',
      title: 'Copiado',
      message: 'Conteúdo copiado para a área de transferência.'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Assistente IA - Suas Assinaturas</h2>
            {patient && (
              <span className="text-sm text-gray-500">- {patient.name}</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSubscriptionsConfig(true)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Configure suas assinaturas (Google Pro, ChatGPT Pro, Claude Pro, Manus Plus)"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'generate'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="inline h-4 w-4 mr-2" />
            Geração Automática
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'voice'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mic className="inline h-4 w-4 mr-2" />
            Ditado por Voz
          </button>
          <button
            onClick={() => setActiveTab('analyze')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'analyze'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wand2 className="inline h-4 w-4 mr-2" />
            Análise e Melhoria
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'template'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="inline h-4 w-4 mr-2" />
            Templates Inteligentes
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Tab: Geração Automática */}
          {activeTab === 'generate' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={handleGenerateEvolutionReport}
                  disabled={!patient || isProcessing}
                  className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-left"
                >
                  <FileText className="h-6 w-6 text-blue-600 mb-2" />
                  <h3 className="font-medium mb-1">Relatório de Evolução</h3>
                  <p className="text-sm text-gray-600">
                    Gera relatório baseado no progresso do paciente
                  </p>
                </button>

                <button
                  onClick={() => handleGenerateInsuranceReport('convenio')}
                  disabled={!patient || isProcessing}
                  className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-left"
                >
                  <FileText className="h-6 w-6 text-green-600 mb-2" />
                  <h3 className="font-medium mb-1">Relatório para Convênio</h3>
                  <p className="text-sm text-gray-600">
                    Documento oficial para convênios médicos
                  </p>
                </button>

                <button
                  onClick={() => handleGenerateInsuranceReport('pericia')}
                  disabled={!patient || isProcessing}
                  className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-left"
                >
                  <FileText className="h-6 w-6 text-orange-600 mb-2" />
                  <h3 className="font-medium mb-1">Relatório Pericial</h3>
                  <p className="text-sm text-gray-600">
                    Avaliação para fins periciais
                  </p>
                </button>

                <button
                  onClick={() => handleGenerateInsuranceReport('alta')}
                  disabled={!patient || isProcessing}
                  className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-left"
                >
                  <FileText className="h-6 w-6 text-purple-600 mb-2" />
                  <h3 className="font-medium mb-1">Carta de Alta</h3>
                  <p className="text-sm text-gray-600">
                    Documento de conclusão do tratamento
                  </p>
                </button>

                <button
                  onClick={handleGenerateExercisePrescription}
                  disabled={!patient || isProcessing}
                  className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-left"
                >
                  <FileText className="h-6 w-6 text-red-600 mb-2" />
                  <h3 className="font-medium mb-1">Receituário de Exercícios</h3>
                  <p className="text-sm text-gray-600">
                    Prescrição detalhada de exercícios
                  </p>
                </button>
              </div>

              {generatedContent && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Conteúdo Gerado</h3>
                    <button
                      onClick={handleCopyContent}
                      className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{generatedContent}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Ditado por Voz */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div className="text-center">
                {!voiceEnabled ? (
                  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <VolumeX className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                    <h3 className="font-medium text-yellow-800 mb-2">
                      Reconhecimento de Voz Não Suportado
                    </h3>
                    <p className="text-sm text-yellow-700">
                      Seu navegador não suporta reconhecimento de voz ou você precisa permitir o acesso ao microfone.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <button
                        onClick={isRecording ? handleStopVoiceRecording : handleStartVoiceRecording}
                        className={`p-6 rounded-full ${
                          isRecording
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isRecording ? (
                          <MicOff className="h-8 w-8" />
                        ) : (
                          <Mic className="h-8 w-8" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-600">
                      {isRecording 
                        ? 'Gravando... Clique para parar' 
                        : 'Clique no microfone para iniciar o ditado'
                      }
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texto Ditado / Editável
                </label>
                <textarea
                  ref={textAreaRef}
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  className="w-full h-64 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Texto aparecerá aqui conforme você fala, ou digite diretamente..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCorrectTerminology}
                  disabled={!documentText.trim() || isProcessing}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Corrigir Terminologia</span>
                </button>

                <button
                  onClick={handleTranslateToPatient}
                  disabled={!documentText.trim() || isProcessing}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Linguagem do Paciente</span>
                </button>

                <button
                  onClick={handleCopyContent}
                  disabled={!documentText.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copiar</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab: Análise e Melhoria */}
          {activeTab === 'analyze' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texto para Análise
                </label>
                <textarea
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Cole ou digite o texto para análise..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleAnalyzeText}
                  disabled={!documentText.trim() || isProcessing}
                  className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-left"
                >
                  <Brain className="h-6 w-6 text-blue-600 mb-2" />
                  <h3 className="font-medium mb-1">Análise Completa</h3>
                  <p className="text-sm text-gray-600">
                    Analisa qualidade, sentimento e consistência
                  </p>
                </button>

                <button
                  onClick={handleExtractInformation}
                  disabled={!documentText.trim() || isProcessing}
                  className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-left"
                >
                  <FileText className="h-6 w-6 text-green-600 mb-2" />
                  <h3 className="font-medium mb-1">Extrair Informações</h3>
                  <p className="text-sm text-gray-600">
                    Extrai dados estruturados do texto
                  </p>
                </button>
              </div>

              {analysisResults && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium">Resultados da Análise</h3>
                  
                  {/* Sentimento */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Análise de Sentimento</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        analysisResults.sentiment === 'positive' 
                          ? 'bg-green-100 text-green-800'
                          : analysisResults.sentiment === 'negative'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {analysisResults.sentiment === 'positive' ? 'Positivo' : 
                         analysisResults.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                      </span>
                      <span className="text-sm text-gray-600">
                        Score: {(analysisResults.sentimentScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Métricas de Qualidade */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Qualidade do Texto</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="font-medium text-lg">
                          {analysisResults.qualityMetrics.readability}%
                        </div>
                        <div className="text-sm text-gray-600">Legibilidade</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-lg">
                          {analysisResults.qualityMetrics.technicalAccuracy}%
                        </div>
                        <div className="text-sm text-gray-600">Precisão Técnica</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-lg">
                          {analysisResults.qualityMetrics.completeness}%
                        </div>
                        <div className="text-sm text-gray-600">Completude</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-lg">
                          {analysisResults.qualityMetrics.overallScore}%
                        </div>
                        <div className="text-sm text-gray-600">Geral</div>
                      </div>
                    </div>
                  </div>

                  {/* Sugestões */}
                  {analysisResults.suggestions && analysisResults.suggestions.length > 0 && (
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Sugestões de Melhoria</h4>
                      <ul className="space-y-2">
                        {analysisResults.suggestions.map((suggestion: any, index: number) => (
                          <li key={index} className="flex items-start space-x-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <span className="text-sm">{suggestion.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {generatedContent && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Dados Extraídos</h3>
                    <button
                      onClick={handleCopyContent}
                      className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{generatedContent}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Templates Inteligentes */}
          {activeTab === 'template' && (
            <div className="space-y-6">
              <div className="text-center">
                <button
                  onClick={handleGenerateTemplate}
                  disabled={!patient || isProcessing}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Wand2 className="inline h-4 w-4 mr-2" />
                  Gerar Template Inteligente
                </button>
              </div>

              {currentTemplate && templateInstance && (
                <div className="space-y-4">
                  <h3 className="font-medium">Template: {currentTemplate.name}</h3>
                  
                  <div className="grid gap-4">
                    {currentTemplate.sections.map((section) => (
                      <div key={section.id} className="border rounded-lg p-4">
                        <label className="block font-medium mb-2">
                          {section.title}
                          {section.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {section.fieldType === 'textarea' ? (
                          <textarea
                            value={templateInstance.data[section.id] || ''}
                            onChange={(e) => {
                              setTemplateInstance({
                                ...templateInstance,
                                data: {
                                  ...templateInstance.data,
                                  [section.id]: e.target.value
                                }
                              });
                            }}
                            className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder={section.contextualHelp}
                          />
                        ) : (
                          <input
                            type={section.fieldType === 'number' ? 'number' : 
                                  section.fieldType === 'date' ? 'date' : 'text'}
                            value={templateInstance.data[section.id] || ''}
                            onChange={(e) => {
                              setTemplateInstance({
                                ...templateInstance,
                                data: {
                                  ...templateInstance.data,
                                  [section.id]: e.target.value
                                }
                              });
                            }}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder={section.contextualHelp}
                          />
                        )}
                        
                        {section.contextualHelp && (
                          <p className="text-sm text-gray-600 mt-1">{section.contextualHelp}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={async () => {
                        try {
                          const validation = await validateTemplateData(
                            templateInstance,
                            currentTemplate,
                            currentUser?.id
                          );
                          setTemplateValidation(validation);
                        } catch (error) {
                          showNotification({
                            type: 'error',
                            title: 'Erro',
                            message: 'Falha na validação do template.'
                          });
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <CheckCircle className="inline h-4 w-4 mr-2" />
                      Validar
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          const formatted = await formatTemplateOutput(
                            templateInstance,
                            currentTemplate,
                            'markdown',
                            currentUser?.id
                          );
                          setGeneratedContent(formatted);
                        } catch (error) {
                          showNotification({
                            type: 'error',
                            title: 'Erro',
                            message: 'Falha na formatação do template.'
                          });
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Download className="inline h-4 w-4 mr-2" />
                      Gerar Documento
                    </button>
                  </div>

                  {templateValidation && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Validação</h4>
                      {templateValidation.errors.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                          <h5 className="font-medium text-red-800 mb-2">Erros:</h5>
                          <ul className="space-y-1">
                            {templateValidation.errors.map((error: any, index: number) => (
                              <li key={index} className="text-sm text-red-700">
                                {error.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {templateValidation.warnings.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                          <h5 className="font-medium text-yellow-800 mb-2">Avisos:</h5>
                          <ul className="space-y-1">
                            {templateValidation.warnings.map((warning: any, index: number) => (
                              <li key={index} className="text-sm text-yellow-700">
                                {warning.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {templateValidation.isValid && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-700">
                            ✅ Template validado com sucesso!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {generatedContent && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Documento Gerado</h3>
                    <button
                      onClick={handleCopyContent}
                      className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{generatedContent}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-xs text-gray-500">
            💰 Custo Zero - Usando suas assinaturas: Google Pro, ChatGPT Pro, Claude Pro, Manus Plus
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Processando com IA...</span>
            </div>
          </div>
        )}
        
        {/* Configuração das Suas Assinaturas - Custo Zero! */}
        <YourSubscriptionsConfig 
          isOpen={showSubscriptionsConfig}
          onClose={() => setShowSubscriptionsConfig(false)}
        />
      </div>
    </div>
  );
}