import { GoogleGenerativeAI } from '@google/generative-ai';

import type { Patient, Assessment } from '../types';

import { aiCache } from './aiCache';

const getGeminiInstance = () => {
  // Only use environment variables for security
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada. Configure a chave da API no ambiente.');
  }
  
  return new GoogleGenerativeAI(apiKey);
};

export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'assessment' | 'progress' | 'insurance' | 'prescription' | 'discharge';
  pathology?: string;
  sections: TemplateSection[];
  autoFillRules: AutoFillRule[];
  validationRules: ValidationRule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  content: string;
  isRequired: boolean;
  autoFill: boolean;
  fieldType: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'textarea';
  options?: string[];
  validation?: string;
  contextualHelp?: string;
}

export interface AutoFillRule {
  fieldId: string;
  source: 'patient_history' | 'previous_assessment' | 'ai_suggestion';
  condition?: string;
  value?: string;
  aiPrompt?: string;
}

export interface ValidationRule {
  fieldId: string;
  type: 'required' | 'format' | 'range' | 'consistency';
  rule: string;
  errorMessage: string;
}

export interface TemplateInstance {
  id: string;
  templateId: string;
  patientId: string;
  data: Record<string, any>;
  completionStatus: 'draft' | 'complete' | 'validated';
  createdAt: string;
  updatedAt: string;
}

/**
 * Generates an intelligent template based on pathology and context.
 * @param pathology Patient's main pathology
 * @param documentType Type of document to generate
 * @param patientContext Additional patient context
 * @returns Generated template structure
 */
export async function generateIntelligentTemplate(
  pathology: string,
  documentType: DocumentTemplate['type'],
  patientContext: string,
  userId = 'anonymous'
): Promise<DocumentTemplate> {
  const cacheKey = `template_${pathology}_${documentType}`;
  
  try {
    const cached = aiCache.get(cacheKey, patientContext, userId);
    if (cached) {
      console.log('📋 Retornando template do cache (economia ~$0.04)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Generating intelligent template (custo ~$0.04): ${pathology} - ${documentType}`);
  
  try {
    const templatePrompts = {
      assessment: `Crie um template de avaliação fisioterapêutica específico para ${pathology}.
        Inclua seções relevantes para anamnese, exame físico, testes específicos e hipótese diagnóstica.`,
      progress: `Crie um template de evolução/progresso para acompanhamento de ${pathology}.
        Foque em métricas de melhora, observações funcionais e ajustes de tratamento.`,
      insurance: `Crie um template de relatório para convênio/seguro saúde para ${pathology}.
        Inclua justificativas técnicas, CID, evolução objetiva e necessidade de continuidade.`,
      prescription: `Crie um template de prescrição de exercícios específico para ${pathology}.
        Inclua exercícios apropriados, progressões, contraindicações e orientações.`,
      discharge: `Crie um template de alta fisioterapêutica para ${pathology}.
        Inclua resumo do tratamento, resultados obtidos, orientações de manutenção.`
    };

    const systemInstruction = `Você é um especialista em documentação clínica fisioterapêutica.
    Crie um template inteligente e estruturado que se adapte especificamente à patologia informada.
    
    O template deve incluir:
    1. Seções relevantes para o tipo de documento
    2. Campos com auto-preenchimento inteligente
    3. Validações de consistência
    4. Sugestões contextuais
    
    Retorne um JSON seguindo a estrutura DocumentTemplate.`;

    const prompt = `${templatePrompts[documentType]}

**Patologia:** ${pathology}
**Contexto do Paciente:** ${patientContext}

Retorne um JSON com a estrutura completa do template, incluindo:
- Seções específicas para a patologia
- Regras de auto-preenchimento
- Validações apropriadas
- Ajuda contextual para cada campo`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(prompt);
    const result = await response.response;
    const jsonText = result.text().trim();
    
    const template = JSON.parse(jsonText);
    
    // Adiciona metadados padrão se não estiverem presentes
    const completeTemplate: DocumentTemplate = {
      id: `template_${Date.now()}`,
      name: `${pathology} - ${documentType}`,
      type: documentType,
      pathology,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...template
    };

    aiCache.set(cacheKey, patientContext, JSON.stringify(completeTemplate));
    return completeTemplate;
  } catch (error) {
    console.error('Error generating intelligent template:', error);
    throw new Error('Falha ao gerar template inteligente.');
  }
}

/**
 * Auto-fills template fields based on patient data and AI suggestions.
 * @param template Template to fill
 * @param patient Patient data
 * @param previousData Previous assessments or documents
 * @returns Template instance with auto-filled data
 */
export async function autoFillTemplate(
  template: DocumentTemplate,
  patient: Patient,
  previousData?: any[],
  userId = 'anonymous'
): Promise<TemplateInstance> {
  const cacheKey = `autofill_${template.id}_${patient.id}`;
  
  try {
    const cached = aiCache.get(cacheKey, JSON.stringify(previousData), userId);
    if (cached) {
      console.log('🔄 Retornando auto-preenchimento do cache (economia ~$0.03)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Auto-filling template (custo ~$0.03): ${template.name}`);
  
  try {
    const autoFilledData: Record<string, any> = {};

    // Processa regras de auto-preenchimento
    for (const rule of template.autoFillRules) {
      let value = '';

      switch (rule.source) {
        case 'patient_history':
          if (rule.fieldId.includes('nome') || rule.fieldId.includes('name')) {
            value = patient.name;
          } else if (rule.fieldId.includes('historico') || rule.fieldId.includes('history')) {
            value = patient.medicalHistory;
          } else if (rule.fieldId.includes('email')) {
            value = patient.email;
          } else if (rule.fieldId.includes('telefone') || rule.fieldId.includes('phone')) {
            value = patient.phone;
          }
          break;

        case 'previous_assessment':
          if (previousData && previousData.length > 0) {
            const lastAssessment = previousData[previousData.length - 1];
            if (rule.fieldId.includes('dor') || rule.fieldId.includes('pain')) {
              value = lastAssessment.painLevel?.toString() || '';
            } else if (rule.fieldId.includes('diagnostico') || rule.fieldId.includes('diagnosis')) {
              value = lastAssessment.diagnosticHypothesis || '';
            }
          }
          break;

        case 'ai_suggestion':
          if (rule.aiPrompt) {
            try {
              const systemInstruction = `Você é um assistente de preenchimento inteligente.
                Baseado nos dados do paciente e contexto clínico, gere uma sugestão apropriada para o campo solicitado.
                Seja conciso e clinicamente relevante.`;

              const model = ai.getGenerativeModel({ 
                model: "gemini-pro",
                systemInstruction: systemInstruction
              });

              const context = `
                Paciente: ${patient.name}
                Histórico: ${patient.medicalHistory}
                Dados Anteriores: ${JSON.stringify(previousData?.slice(-2) || [])}
              `;

              const response = await model.generateContent(`${rule.aiPrompt}\n\nContexto: ${context}`);
              const result = await response.response;
              value = result.text().trim();
            } catch (aiError) {
              console.warn('Error in AI suggestion:', aiError);
              value = rule.value || '';
            }
          }
          break;
      }

      autoFilledData[rule.fieldId] = value;
    }

    const templateInstance: TemplateInstance = {
      id: `instance_${Date.now()}`,
      templateId: template.id,
      patientId: patient.id,
      data: autoFilledData,
      completionStatus: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    aiCache.set(cacheKey, JSON.stringify(previousData), JSON.stringify(templateInstance));
    return templateInstance;
  } catch (error) {
    console.error('Error auto-filling template:', error);
    throw new Error('Falha ao preencher template automaticamente.');
  }
}

/**
 * Provides contextual suggestions while user is typing.
 * @param fieldId Field being edited
 * @param currentValue Current field value
 * @param context Template and patient context
 * @returns Array of suggestions
 */
export async function getContextualSuggestions(
  fieldId: string,
  currentValue: string,
  context: {
    template: DocumentTemplate;
    patient: Patient;
    relatedData?: any[];
  },
  userId = 'anonymous'
): Promise<string[]> {
  const cacheKey = `suggestions_${fieldId}_${currentValue.slice(0, 30)}`;
  
  try {
    const cached = aiCache.get(cacheKey, JSON.stringify(context), userId);
    if (cached) {
      console.log('💡 Retornando sugestões do cache (economia ~$0.01)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Generating contextual suggestions (custo ~$0.01): ${fieldId}`);
  
  try {
    const systemInstruction = `Você é um assistente de documentação clínica inteligente.
    Forneça sugestões contextuais relevantes baseadas no campo sendo preenchido e no contexto do paciente.
    
    Retorne até 5 sugestões curtas e práticas que complementem ou melhorem o texto atual.
    Foque em:
    - Terminologia técnica apropriada
    - Observações clínicas relevantes
    - Detalhes que podem ter sido esquecidos
    - Padronização da linguagem`;

    const prompt = `Campo: ${fieldId}
    Valor atual: "${currentValue}"
    Paciente: ${context.patient.name}
    Histórico: ${context.patient.medicalHistory}
    Template: ${context.template.name}
    Patologia: ${context.template.pathology || 'Não especificada'}
    
    Dados relacionados: ${JSON.stringify(context.relatedData?.slice(-2) || [])}
    
    Forneça sugestões em formato JSON:
    {
      "suggestions": ["sugestão 1", "sugestão 2", "sugestão 3"]
    }`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(prompt);
    const result = await response.response;
    const jsonText = result.text().trim();
    
    const suggestionsData = JSON.parse(jsonText);
    const suggestions = suggestionsData.suggestions || [];

    aiCache.set(cacheKey, JSON.stringify(context), JSON.stringify(suggestions));
    return suggestions;
  } catch (error) {
    console.error('Error generating contextual suggestions:', error);
    return [];
  }
}

/**
 * Validates template data for consistency and completeness.
 * @param templateInstance Template instance to validate
 * @param template Original template with validation rules
 * @returns Validation results
 */
export async function validateTemplateData(
  templateInstance: TemplateInstance,
  template: DocumentTemplate,
  userId = 'anonymous'
): Promise<{
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}> {
  const cacheKey = `validation_${templateInstance.id}`;
  
  try {
    const cached = aiCache.get(cacheKey, JSON.stringify(templateInstance.data), userId);
    if (cached) {
      console.log('✅ Retornando validação do cache (economia ~$0.02)');
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Validating template data (custo ~$0.02): ${template.name}`);
  
  try {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Validações básicas baseadas nas regras
    for (const rule of template.validationRules) {
      const fieldValue = templateInstance.data[rule.fieldId];

      switch (rule.type) {
        case 'required':
          if (!fieldValue || fieldValue.toString().trim() === '') {
            errors.push({
              fieldId: rule.fieldId,
              type: 'required',
              message: rule.errorMessage
            });
          }
          break;

        case 'format':
          if (fieldValue && !new RegExp(rule.rule).test(fieldValue.toString())) {
            errors.push({
              fieldId: rule.fieldId,
              type: 'format',
              message: rule.errorMessage
            });
          }
          break;

        case 'range':
          const numValue = parseFloat(fieldValue);
          const [min, max] = rule.rule.split(',').map(Number);
          if (!isNaN(numValue) && (numValue < min || numValue > max)) {
            errors.push({
              fieldId: rule.fieldId,
              type: 'range',
              message: rule.errorMessage
            });
          }
          break;
      }
    }

    // Validação de consistência com IA
    if (template.validationRules.some(r => r.type === 'consistency')) {
      try {
        const systemInstruction = `Você é um especialista em validação de documentos clínicos.
        Analise os dados preenchidos em busca de inconsistências clínicas ou lógicas.
        
        Identifique:
        - Contradições entre campos
        - Valores clinicamente improváveis
        - Informações que não fazem sentido no contexto
        - Campos que poderiam estar melhor detalhados`;

        const prompt = `Template: ${template.name}
        Patologia: ${template.pathology || 'Não especificada'}
        
        Dados preenchidos:
        ${JSON.stringify(templateInstance.data, null, 2)}
        
        Retorne JSON com:
        {
          "consistencyErrors": [
            {
              "fieldId": "campo_problema",
              "message": "descrição do problema",
              "severity": "error|warning"
            }
          ],
          "suggestions": [
            "sugestão de melhoria 1",
            "sugestão de melhoria 2"
          ]
        }`;

        const model = ai.getGenerativeModel({ 
          model: "gemini-pro",
          systemInstruction: systemInstruction
        });

        const response = await model.generateContent(prompt);
        const result = await response.response;
        const validationResult = JSON.parse(result.text().trim());

        // Adiciona erros e avisos de consistência
        for (const error of validationResult.consistencyErrors || []) {
          if (error.severity === 'error') {
            errors.push({
              fieldId: error.fieldId,
              type: 'consistency',
              message: error.message
            });
          } else {
            warnings.push({
              fieldId: error.fieldId,
              type: 'consistency',
              message: error.message
            });
          }
        }

        suggestions.push(...(validationResult.suggestions || []));

      } catch (aiError) {
        console.warn('Error in AI consistency validation:', aiError);
      }
    }

    const validationResults = {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };

    aiCache.set(cacheKey, JSON.stringify(templateInstance.data), JSON.stringify(validationResults));
    return validationResults;
  } catch (error) {
    console.error('Error validating template data:', error);
    return {
      isValid: false,
      errors: [{ fieldId: 'general', type: 'system', message: 'Erro na validação dos dados.' }],
      warnings: [],
      suggestions: []
    };
  }
}

/**
 * Formats template data for different output purposes.
 * @param templateInstance Template instance to format
 * @param template Original template
 * @param format Output format
 * @returns Formatted document
 */
export async function formatTemplateOutput(
  templateInstance: TemplateInstance,
  template: DocumentTemplate,
  format: 'pdf' | 'docx' | 'html' | 'markdown',
  userId = 'anonymous'
): Promise<string> {
  const cacheKey = `format_${templateInstance.id}_${format}`;
  
  try {
    const cached = aiCache.get(cacheKey, JSON.stringify(templateInstance.data), userId);
    if (cached) {
      console.log('📄 Retornando formatação do cache (economia ~$0.02)');
      return cached;
    }
  } catch (error) {
    console.warn('Cache error:', error);
  }

  console.log(`🤖 Formatting template output (custo ~$0.02): ${format}`);
  
  try {
    const formatInstructions = {
      pdf: 'Formate como documento profissional pronto para impressão, com cabeçalhos, espaçamento adequado e estrutura clara.',
      docx: 'Formate como documento Word com títulos, parágrafos e formatação apropriada para edição.',
      html: 'Formate como HTML com CSS inline, pronto para visualização web ou email.',
      markdown: 'Formate como Markdown com títulos, listas e formatação adequada para documentação.'
    };

    const systemInstruction = `Você é um especialista em formatação de documentos clínicos.
    Transforme os dados estruturados do template em um documento bem formatado.
    
    ${formatInstructions[format]}
    
    Mantenha a estrutura profissional e a hierarquia das informações.
    Use formatação apropriada para destacar seções importantes.`;

    const sectionsData = template.sections.map(section => ({
      title: section.title,
      content: templateInstance.data[section.id] || '',
      isRequired: section.isRequired
    }));

    const prompt = `Template: ${template.name}
    Tipo: ${template.type}
    Formato de saída: ${format}
    
    Seções e dados:
    ${JSON.stringify(sectionsData, null, 2)}
    
    Formate o documento completo seguindo as melhores práticas para ${format}.`;

    const ai = getGeminiInstance();
    const model = ai.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemInstruction
    });

    const response = await model.generateContent(prompt);
    const result = await response.response;
    const formattedOutput = result.text();

    aiCache.set(cacheKey, JSON.stringify(templateInstance.data), formattedOutput);
    return formattedOutput;
  } catch (error) {
    console.error('Error formatting template output:', error);
    throw new Error('Falha ao formatar documento.');
  }
}

export interface ValidationError {
  fieldId: string;
  type: 'required' | 'format' | 'range' | 'consistency' | 'system';
  message: string;
}

export interface ValidationWarning {
  fieldId: string;
  type: 'consistency' | 'suggestion' | 'formatting';
  message: string;
}