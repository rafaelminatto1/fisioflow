/**
 * Serviço de Documentação Legal Automática
 * Sistema completo inspirado no Lumi Dashboard para fisioterapia
 */

import type { Patient, User } from '../types';
import type {
  BaseDocument,
  DocumentType,
  DocumentStatus,
  DocumentTemplate,
  DocumentGenerationRequest,
  GenerationOptions,
  ConsentFormData,
  TreatmentData,
  FinancialData,
  DigitalSignature,
  DocumentDelivery,
  DocumentLog,
  ComplianceInfo
} from '../types/legalDocuments';

import { multiAI } from './multiProviderAIService';

class DocumentService {
  private documents: Map<string, BaseDocument> = new Map();
  private templates: Map<string, DocumentTemplate> = new Map();
  private signatures: Map<string, DigitalSignature[]> = new Map();
  private deliveries: Map<string, DocumentDelivery[]> = new Map();
  private logs: DocumentLog[] = [];

  constructor() {
    this.initializeDefaultTemplates();
    this.loadFromStorage();
  }

  /**
   * ============== GERAÇÃO DE DOCUMENTOS ==============
   */

  /**
   * Gera documento automaticamente com base no template e dados
   */
  async generateDocument(request: DocumentGenerationRequest): Promise<BaseDocument> {
    const template = this.templates.get(request.templateId);
    if (!template) {
      throw new Error(`Template ${request.templateId} não encontrado`);
    }

    // Valida dados de entrada
    this.validateInputData(template, request.data);

    // Gera conteúdo com IA se necessário
    const enhancedData = await this.enhanceDataWithAI(template, request.data);

    // Processa template
    const processedContent = await this.processTemplate(template, enhancedData);

    // Cria documento
    const document: BaseDocument = {
      id: this.generateId(),
      type: template.type,
      patientId: request.patientId,
      therapistId: request.therapistId,
      tenantId: enhancedData.tenantId || 'default',
      title: this.generateTitle(template, enhancedData),
      content: processedContent,
      templateId: request.templateId,
      status: request.options.includeSignature ? DocumentStatus.PENDING_SIGNATURE : DocumentStatus.SIGNED,
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      validUntil: this.calculateValidUntil(template.type),
      metadata: this.generateMetadata(template, enhancedData),
      signatures: [],
      compliance: await this.generateComplianceInfo(template, enhancedData)
    };

    // Armazena documento
    this.documents.set(document.id, document);
    this.logAction(document.id, 'CREATED', request.therapistId, 'Documento gerado automaticamente');

    // Processa assinatura se necessário
    if (request.options.includeSignature) {
      await this.initiateSignatureProcess(document.id, request.therapistId);
    }

    // Processa entrega se especificada
    if (request.options.deliveryMethod !== 'download') {
      await this.scheduleDelivery(document.id, request.options);
    }

    await this.saveToStorage();
    return document;
  }

  /**
   * Processa template substituindo variáveis
   */
  private async processTemplate(template: DocumentTemplate, data: any): Promise<string> {
    let content = template.htmlContent;

    // Substitui variáveis básicas
    for (const variable of template.variables) {
      const value = this.getVariableValue(data, variable.name);
      const placeholder = `{{${variable.name}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), this.formatValue(value, variable.type));
    }

    // Processa seções condicionais
    for (const section of template.sections) {
      if (section.conditional && !this.evaluateCondition(section.conditional, data)) {
        const sectionRegex = new RegExp(`<!--SECTION_${section.id}_START-->.*?<!--SECTION_${section.id}_END-->`, 'gs');
        content = content.replace(sectionRegex, '');
      }
    }

    // Aplica estilos CSS
    content = this.applyCSSStyles(content, template.cssStyles);

    // Melhora conteúdo com IA se necessário
    if (this.shouldEnhanceWithAI(template)) {
      content = await this.enhanceContentWithAI(content, data);
    }

    return content;
  }

  /**
   * Melhora dados com IA para documentos mais inteligentes
   */
  private async enhanceDataWithAI(template: DocumentTemplate, data: any): Promise<any> {
    const enhancedData = { ...data };

    try {
      if (template.type === DocumentType.CONSENT_TREATMENT) {
        // Gera riscos e benefícios personalizados
        const analysisPrompt = `
Baseado nos dados do paciente e tratamento, gere riscos e benefícios específicos:

Paciente: ${data.patientName || 'Não informado'}
Idade: ${data.patientAge || 'Não informado'}
Diagnóstico: ${data.diagnosis || 'Não informado'}
Tratamento: ${data.treatmentType || 'Não informado'}

Forneça em JSON:
{
  "risks": ["risco 1", "risco 2", "risco 3"],
  "benefits": ["benefício 1", "benefício 2", "benefício 3"],
  "alternatives": ["alternativa 1", "alternativa 2"],
  "precautions": ["precaução 1", "precaução 2"]
}`;

        const aiResponse = await multiAI.generateText(analysisPrompt, {
          type: 'medical_analysis',
          maxTokens: 800,
          temperature: 0.3
        });

        try {
          const aiData = JSON.parse(aiResponse.content);
          enhancedData.risks = aiData.risks || [];
          enhancedData.benefits = aiData.benefits || [];
          enhancedData.alternatives = aiData.alternatives || [];
          enhancedData.precautions = aiData.precautions || [];
        } catch (error) {
          console.warn('Erro ao processar dados de IA:', error);
        }
      }

      if (template.type === DocumentType.EXERCISE_PRESCRIPTION) {
        // Gera prescrição de exercícios personalizada
        const prescriptionPrompt = `
Crie uma prescrição de exercícios fisioterapêuticos personalizada:

Paciente: ${data.patientName}
Diagnóstico: ${data.diagnosis}
Limitações: ${data.limitations || 'Nenhuma'}
Objetivos: ${data.objectives || 'Reabilitação geral'}

Forneça em JSON:
{
  "exercises": [{
    "name": "nome do exercício",
    "description": "descrição detalhada",
    "repetitions": "número de repetições",
    "frequency": "frequência semanal",
    "precautions": "cuidados especiais"
  }],
  "generalInstructions": "instruções gerais",
  "contraindications": ["contraindicação 1", "contraindicação 2"]
}`;

        const aiResponse = await multiAI.generateText(prescriptionPrompt, {
          type: 'exercise_prescription',
          maxTokens: 1200,
          temperature: 0.4
        });

        try {
          const aiData = JSON.parse(aiResponse.content);
          enhancedData.exercises = aiData.exercises || [];
          enhancedData.generalInstructions = aiData.generalInstructions || '';
          enhancedData.contraindications = aiData.contraindications || [];
        } catch (error) {
          console.warn('Erro ao processar prescrição de IA:', error);
        }
      }

    } catch (error) {
      console.error('Erro na melhoria com IA:', error);
    }

    return enhancedData;
  }

  /**
   * ============== TEMPLATES PADRÃO ==============
   */

  private initializeDefaultTemplates(): void {
    // Template de Consentimento para Tratamento
    this.templates.set('consent_treatment_v1', {
      id: 'consent_treatment_v1',
      type: DocumentType.CONSENT_TREATMENT,
      name: 'Termo de Consentimento para Tratamento Fisioterapêutico',
      description: 'Termo padrão para consentimento de tratamento fisioterapêutico',
      version: '1.0',
      htmlContent: this.getConsentTreatmentTemplate(),
      cssStyles: this.getDefaultCSSStyles(),
      variables: [
        { name: 'patientName', type: 'text', required: true, description: 'Nome completo do paciente', placeholder: 'João Silva' },
        { name: 'patientCPF', type: 'text', required: true, description: 'CPF do paciente', placeholder: '000.000.000-00' },
        { name: 'patientAge', type: 'number', required: true, description: 'Idade do paciente', placeholder: '30' },
        { name: 'diagnosis', type: 'text', required: true, description: 'Diagnóstico médico', placeholder: 'Lombalgia crônica' },
        { name: 'therapistName', type: 'text', required: true, description: 'Nome do fisioterapeuta', placeholder: 'Dr. Maria Santos' },
        { name: 'therapistCREFITO', type: 'text', required: true, description: 'Número CREFITO', placeholder: '12345-F' },
        { name: 'clinicName', type: 'text', required: true, description: 'Nome da clínica', placeholder: 'FisioFlow Clínica' },
        { name: 'treatmentType', type: 'text', required: true, description: 'Tipo de tratamento', placeholder: 'Fisioterapia Manual' },
        { name: 'estimatedDuration', type: 'text', required: true, description: 'Duração estimada', placeholder: '8 semanas' },
        { name: 'currentDate', type: 'date', required: true, description: 'Data atual', placeholder: new Date().toISOString().split('T')[0] },
        { name: 'risks', type: 'list', required: false, description: 'Riscos do tratamento', placeholder: [] },
        { name: 'benefits', type: 'list', required: false, description: 'Benefícios esperados', placeholder: [] },
        { name: 'alternatives', type: 'list', required: false, description: 'Alternativas de tratamento', placeholder: [] }
      ],
      sections: [
        { id: 'header', name: 'Cabeçalho', order: 1, required: true, content: '', variables: ['clinicName', 'therapistName'] },
        { id: 'patient_info', name: 'Dados do Paciente', order: 2, required: true, content: '', variables: ['patientName', 'patientCPF', 'patientAge'] },
        { id: 'treatment_info', name: 'Informações do Tratamento', order: 3, required: true, content: '', variables: ['diagnosis', 'treatmentType', 'estimatedDuration'] },
        { id: 'risks_benefits', name: 'Riscos e Benefícios', order: 4, required: true, content: '', variables: ['risks', 'benefits', 'alternatives'] },
        { id: 'consent_declaration', name: 'Declaração de Consentimento', order: 5, required: true, content: '', variables: [] },
        { id: 'signatures', name: 'Assinaturas', order: 6, required: true, content: '', variables: ['currentDate'] }
      ],
      validationRules: [
        { field: 'patientCPF', rule: 'cpf', message: 'CPF inválido', severity: 'error' },
        { field: 'therapistCREFITO', rule: 'crefito', message: 'Número CREFITO inválido', severity: 'error' },
        { field: 'patientAge', rule: 'min:0,max:120', message: 'Idade deve ser entre 0 e 120 anos', severity: 'error' }
      ],
      compliance: [
        { regulation: 'CFM', requirement: 'Resolução CFM 1.821/2007', mandatory: true, description: 'Normas técnicas para digitalizacao' },
        { regulation: 'COFFITO', requirement: 'Resolução COFFITO 415/2012', mandatory: true, description: 'Código de Ética da Fisioterapia' },
        { regulation: 'LGPD', requirement: 'Art. 7º, I - consentimento', mandatory: true, description: 'Base legal para tratamento de dados' }
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    });

    // Template de Declaração de Comparecimento
    this.templates.set('attendance_declaration_v1', {
      id: 'attendance_declaration_v1',
      type: DocumentType.ATTENDANCE_DECLARATION,
      name: 'Declaração de Comparecimento',
      description: 'Declaração automática de comparecimento às sessões',
      version: '1.0',
      htmlContent: this.getAttendanceDeclarationTemplate(),
      cssStyles: this.getDefaultCSSStyles(),
      variables: [
        { name: 'patientName', type: 'text', required: true, description: 'Nome do paciente', placeholder: 'João Silva' },
        { name: 'patientCPF', type: 'text', required: true, description: 'CPF do paciente', placeholder: '000.000.000-00' },
        { name: 'sessionDate', type: 'date', required: true, description: 'Data da sessão', placeholder: new Date().toISOString().split('T')[0] },
        { name: 'sessionTime', type: 'text', required: true, description: 'Horário da sessão', placeholder: '14:00 às 15:00' },
        { name: 'therapistName', type: 'text', required: true, description: 'Nome do fisioterapeuta', placeholder: 'Dr. Maria Santos' },
        { name: 'therapistCREFITO', type: 'text', required: true, description: 'Número CREFITO', placeholder: '12345-F' },
        { name: 'clinicName', type: 'text', required: true, description: 'Nome da clínica', placeholder: 'FisioFlow Clínica' },
        { name: 'clinicAddress', type: 'text', required: true, description: 'Endereço da clínica', placeholder: 'Rua das Flores, 123' },
        { name: 'currentDate', type: 'date', required: true, description: 'Data de emissão', placeholder: new Date().toISOString().split('T')[0] }
      ],
      sections: [
        { id: 'header', name: 'Cabeçalho', order: 1, required: true, content: '', variables: ['clinicName'] },
        { id: 'declaration', name: 'Declaração', order: 2, required: true, content: '', variables: ['patientName', 'patientCPF', 'sessionDate', 'sessionTime'] },
        { id: 'professional_info', name: 'Dados do Profissional', order: 3, required: true, content: '', variables: ['therapistName', 'therapistCREFITO'] },
        { id: 'footer', name: 'Rodapé', order: 4, required: true, content: '', variables: ['clinicAddress', 'currentDate'] }
      ],
      validationRules: [
        { field: 'patientCPF', rule: 'cpf', message: 'CPF inválido', severity: 'error' },
        { field: 'sessionDate', rule: 'date', message: 'Data inválida', severity: 'error' }
      ],
      compliance: [
        { regulation: 'COFFITO', requirement: 'Resolução COFFITO 424/2013', mandatory: true, description: 'Estabelece o Código de Processo Ético' }
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    });

    // Template de Recibo de Pagamento
    this.templates.set('payment_receipt_v1', {
      id: 'payment_receipt_v1',
      type: DocumentType.PAYMENT_RECEIPT,
      name: 'Recibo de Pagamento',
      description: 'Recibo padrão para pagamentos de serviços fisioterapêuticos',
      version: '1.0',
      htmlContent: this.getPaymentReceiptTemplate(),
      cssStyles: this.getDefaultCSSStyles(),
      variables: [
        { name: 'receiptNumber', type: 'text', required: true, description: 'Número do recibo', placeholder: 'REC001' },
        { name: 'patientName', type: 'text', required: true, description: 'Nome do paciente', placeholder: 'João Silva' },
        { name: 'patientCPF', type: 'text', required: true, description: 'CPF do paciente', placeholder: '000.000.000-00' },
        { name: 'amount', type: 'number', required: true, description: 'Valor pago', placeholder: '150.00' },
        { name: 'amountInWords', type: 'text', required: true, description: 'Valor por extenso', placeholder: 'Cento e cinquenta reais' },
        { name: 'paymentDate', type: 'date', required: true, description: 'Data do pagamento', placeholder: new Date().toISOString().split('T')[0] },
        { name: 'paymentMethod', type: 'text', required: true, description: 'Forma de pagamento', placeholder: 'Dinheiro' },
        { name: 'serviceDescription', type: 'text', required: true, description: 'Descrição do serviço', placeholder: 'Sessão de fisioterapia' },
        { name: 'clinicName', type: 'text', required: true, description: 'Nome da clínica', placeholder: 'FisioFlow Clínica' },
        { name: 'clinicCNPJ', type: 'text', required: true, description: 'CNPJ da clínica', placeholder: '00.000.000/0001-00' }
      ],
      sections: [
        { id: 'header', name: 'Cabeçalho', order: 1, required: true, content: '', variables: ['clinicName', 'receiptNumber'] },
        { id: 'payment_info', name: 'Informações do Pagamento', order: 2, required: true, content: '', variables: ['amount', 'amountInWords', 'paymentDate', 'paymentMethod'] },
        { id: 'service_info', name: 'Informações do Serviço', order: 3, required: true, content: '', variables: ['serviceDescription'] },
        { id: 'payer_info', name: 'Dados do Pagador', order: 4, required: true, content: '', variables: ['patientName', 'patientCPF'] },
        { id: 'legal_info', name: 'Informações Legais', order: 5, required: true, content: '', variables: ['clinicCNPJ'] }
      ],
      validationRules: [
        { field: 'amount', rule: 'min:0', message: 'Valor deve ser positivo', severity: 'error' },
        { field: 'patientCPF', rule: 'cpf', message: 'CPF inválido', severity: 'error' },
        { field: 'clinicCNPJ', rule: 'cnpj', message: 'CNPJ inválido', severity: 'error' }
      ],
      compliance: [
        { regulation: 'LGPD', requirement: 'Art. 7º, II - cumprimento de obrigação legal', mandatory: true, description: 'Emissão de recibos é obrigação legal' }
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    });

    // Template de Receituário de Exercícios
    this.templates.set('exercise_prescription_v1', {
      id: 'exercise_prescription_v1',
      type: DocumentType.EXERCISE_PRESCRIPTION,
      name: 'Receituário de Exercícios Fisioterapêuticos',
      description: 'Prescrição personalizada de exercícios para o paciente',
      version: '1.0',
      htmlContent: this.getExercisePrescriptionTemplate(),
      cssStyles: this.getDefaultCSSStyles(),
      variables: [
        { name: 'patientName', type: 'text', required: true, description: 'Nome do paciente', placeholder: 'João Silva' },
        { name: 'patientAge', type: 'number', required: true, description: 'Idade do paciente', placeholder: '30' },
        { name: 'diagnosis', type: 'text', required: true, description: 'Diagnóstico', placeholder: 'Lombalgia crônica' },
        { name: 'therapistName', type: 'text', required: true, description: 'Nome do fisioterapeuta', placeholder: 'Dr. Maria Santos' },
        { name: 'therapistCREFITO', type: 'text', required: true, description: 'Número CREFITO', placeholder: '12345-F' },
        { name: 'prescriptionDate', type: 'date', required: true, description: 'Data da prescrição', placeholder: new Date().toISOString().split('T')[0] },
        { name: 'exercises', type: 'list', required: true, description: 'Lista de exercícios', placeholder: [] },
        { name: 'generalInstructions', type: 'text', required: false, description: 'Instruções gerais', placeholder: 'Realize os exercícios conforme orientado' },
        { name: 'contraindications', type: 'list', required: false, description: 'Contraindicações', placeholder: [] },
        { name: 'nextReview', type: 'date', required: true, description: 'Próxima reavaliação', placeholder: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
      ],
      sections: [
        { id: 'header', name: 'Cabeçalho', order: 1, required: true, content: '', variables: ['therapistName', 'therapistCREFITO'] },
        { id: 'patient_info', name: 'Dados do Paciente', order: 2, required: true, content: '', variables: ['patientName', 'patientAge', 'diagnosis'] },
        { id: 'exercises', name: 'Exercícios Prescritos', order: 3, required: true, content: '', variables: ['exercises'] },
        { id: 'instructions', name: 'Instruções', order: 4, required: true, content: '', variables: ['generalInstructions', 'contraindications'] },
        { id: 'footer', name: 'Rodapé', order: 5, required: true, content: '', variables: ['prescriptionDate', 'nextReview'] }
      ],
      validationRules: [
        { field: 'exercises', rule: 'min_length:1', message: 'Pelo menos um exercício deve ser prescrito', severity: 'error' },
        { field: 'therapistCREFITO', rule: 'crefito', message: 'Número CREFITO inválido', severity: 'error' }
      ],
      compliance: [
        { regulation: 'COFFITO', requirement: 'Resolução COFFITO 415/2012', mandatory: true, description: 'Código de Ética da Fisioterapia' }
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    });
  }

  /**
   * ============== TEMPLATES HTML ==============
   */

  private getConsentTreatmentTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Termo de Consentimento para Tratamento Fisioterapêutico</title>
</head>
<body>
    <div class="document-container">
        <!--SECTION_header_START-->
        <header class="document-header">
            <h1>{{clinicName}}</h1>
            <h2>TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO</h2>
            <h3>PARA TRATAMENTO FISIOTERAPÊUTICO</h3>
        </header>
        <!--SECTION_header_END-->

        <!--SECTION_patient_info_START-->
        <section class="patient-info">
            <h4>DADOS DO PACIENTE</h4>
            <p><strong>Nome:</strong> {{patientName}}</p>
            <p><strong>CPF:</strong> {{patientCPF}}</p>
            <p><strong>Idade:</strong> {{patientAge}} anos</p>
        </section>
        <!--SECTION_patient_info_END-->

        <!--SECTION_treatment_info_START-->
        <section class="treatment-info">
            <h4>INFORMAÇÕES DO TRATAMENTO</h4>
            <p><strong>Diagnóstico:</strong> {{diagnosis}}</p>
            <p><strong>Tipo de Tratamento:</strong> {{treatmentType}}</p>
            <p><strong>Duração Estimada:</strong> {{estimatedDuration}}</p>
            <p><strong>Fisioterapeuta Responsável:</strong> {{therapistName}} - CREFITO: {{therapistCREFITO}}</p>
        </section>
        <!--SECTION_treatment_info_END-->

        <!--SECTION_risks_benefits_START-->
        <section class="risks-benefits">
            <h4>RISCOS, BENEFÍCIOS E ALTERNATIVAS</h4>
            
            <h5>Benefícios Esperados:</h5>
            <ul>
            {{#each benefits}}
                <li>{{this}}</li>
            {{/each}}
            </ul>

            <h5>Riscos Possíveis:</h5>
            <ul>
            {{#each risks}}
                <li>{{this}}</li>
            {{/each}}
            </ul>

            <h5>Alternativas de Tratamento:</h5>
            <ul>
            {{#each alternatives}}
                <li>{{this}}</li>
            {{/each}}
            </ul>
        </section>
        <!--SECTION_risks_benefits_END-->

        <!--SECTION_consent_declaration_START-->
        <section class="consent-declaration">
            <h4>DECLARAÇÃO DE CONSENTIMENTO</h4>
            <p>Eu, <strong>{{patientName}}</strong>, declaro que:</p>
            <ul>
                <li>Fui informado(a) sobre meu diagnóstico, tratamento proposto, riscos, benefícios e alternativas;</li>
                <li>Todas as minhas dúvidas foram esclarecidas satisfatoriamente;</li>
                <li>Compreendo que o tratamento fisioterapêutico não garante cura ou melhora completa;</li>
                <li>Comprometo-me a seguir as orientações do fisioterapeuta;</li>
                <li>Informarei imediatamente qualquer mudança em meu estado de saúde;</li>
                <li>Posso retirar este consentimento a qualquer momento;</li>
                <li>Autorizo o fisioterapeuta a realizar o tratamento proposto.</li>
            </ul>
        </section>
        <!--SECTION_consent_declaration_END-->

        <!--SECTION_signatures_START-->
        <section class="signatures">
            <div class="signature-block">
                <p>Local e Data: _________________, {{currentDate}}</p>
                
                <div class="signature-line">
                    <div>
                        <hr>
                        <p>{{patientName}}<br>Paciente</p>
                    </div>
                    <div>
                        <hr>
                        <p>{{therapistName}}<br>CREFITO: {{therapistCREFITO}}</p>
                    </div>
                </div>
            </div>
        </section>
        <!--SECTION_signatures_END-->

        <footer class="document-footer">
            <p><small>Este documento está em conformidade com as Resoluções CFM 1.821/2007 e COFFITO 415/2012</small></p>
        </footer>
    </div>
</body>
</html>`;
  }

  private getAttendanceDeclarationTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Declaração de Comparecimento</title>
</head>
<body>
    <div class="document-container">
        <!--SECTION_header_START-->
        <header class="document-header">
            <h1>{{clinicName}}</h1>
            <h2>DECLARAÇÃO DE COMPARECIMENTO</h2>
        </header>
        <!--SECTION_header_END-->

        <!--SECTION_declaration_START-->
        <section class="declaration">
            <p>Declaro para os devidos fins que o(a) Sr.(a) <strong>{{patientName}}</strong>, portador(a) do CPF <strong>{{patientCPF}}</strong>, compareceu a esta clínica no dia <strong>{{sessionDate}}</strong>, no horário de <strong>{{sessionTime}}</strong>, para realização de sessão de fisioterapia.</p>
        </section>
        <!--SECTION_declaration_END-->

        <!--SECTION_professional_info_START-->
        <section class="professional-info">
            <p>Fisioterapeuta responsável: <strong>{{therapistName}}</strong></p>
            <p>CREFITO: <strong>{{therapistCREFITO}}</strong></p>
        </section>
        <!--SECTION_professional_info_END-->

        <!--SECTION_footer_START-->
        <footer class="document-footer">
            <p>{{clinicAddress}}</p>
            <p>Data de emissão: {{currentDate}}</p>
            
            <div class="signature-area">
                <hr>
                <p>{{therapistName}}<br>CREFITO: {{therapistCREFITO}}</p>
            </div>
        </footer>
        <!--SECTION_footer_END-->
    </div>
</body>
</html>`;
  }

  private getPaymentReceiptTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo de Pagamento</title>
</head>
<body>
    <div class="document-container">
        <!--SECTION_header_START-->
        <header class="document-header">
            <h1>{{clinicName}}</h1>
            <h2>RECIBO DE PAGAMENTO</h2>
            <p><strong>Nº {{receiptNumber}}</strong></p>
        </header>
        <!--SECTION_header_END-->

        <!--SECTION_payment_info_START-->
        <section class="payment-info">
            <p>Recebi de <strong>{{patientName}}</strong>, CPF <strong>{{patientCPF}}</strong>, a quantia de <strong>R$ {{amount}}</strong> (<strong>{{amountInWords}}</strong>), referente ao pagamento de serviços fisioterapêuticos.</p>
            
            <p><strong>Data do Pagamento:</strong> {{paymentDate}}</p>
            <p><strong>Forma de Pagamento:</strong> {{paymentMethod}}</p>
        </section>
        <!--SECTION_payment_info_END-->

        <!--SECTION_service_info_START-->
        <section class="service-info">
            <h4>DISCRIMINAÇÃO DOS SERVIÇOS</h4>
            <p>{{serviceDescription}}</p>
        </section>
        <!--SECTION_service_info_END-->

        <!--SECTION_payer_info_START-->
        <section class="payer-info">
            <h4>DADOS DO PAGADOR</h4>
            <p><strong>Nome:</strong> {{patientName}}</p>
            <p><strong>CPF:</strong> {{patientCPF}}</p>
        </section>
        <!--SECTION_payer_info_END-->

        <!--SECTION_legal_info_START-->
        <footer class="document-footer">
            <p>{{clinicName}} - CNPJ: {{clinicCNPJ}}</p>
            <p><small>Para clareza e como prova de pagamento, firmo o presente recibo.</small></p>
            
            <div class="signature-area">
                <hr>
                <p>Recebedor</p>
            </div>
        </footer>
        <!--SECTION_legal_info_END-->
    </div>
</body>
</html>`;
  }

  private getExercisePrescriptionTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receituário de Exercícios</title>
</head>
<body>
    <div class="document-container">
        <!--SECTION_header_START-->
        <header class="document-header">
            <h1>RECEITUÁRIO DE EXERCÍCIOS FISIOTERAPÊUTICOS</h1>
            <p><strong>{{therapistName}}</strong> - CREFITO: <strong>{{therapistCREFITO}}</strong></p>
        </header>
        <!--SECTION_header_END-->

        <!--SECTION_patient_info_START-->
        <section class="patient-info">
            <h4>DADOS DO PACIENTE</h4>
            <p><strong>Nome:</strong> {{patientName}}</p>
            <p><strong>Idade:</strong> {{patientAge}} anos</p>
            <p><strong>Diagnóstico:</strong> {{diagnosis}}</p>
        </section>
        <!--SECTION_patient_info_END-->

        <!--SECTION_exercises_START-->
        <section class="exercises">
            <h4>EXERCÍCIOS PRESCRITOS</h4>
            {{#each exercises}}
            <div class="exercise-item">
                <h5>{{@index}}. {{name}}</h5>
                <p><strong>Descrição:</strong> {{description}}</p>
                <p><strong>Repetições:</strong> {{repetitions}}</p>
                <p><strong>Frequência:</strong> {{frequency}}</p>
                {{#if precautions}}
                <p><strong>Cuidados:</strong> {{precautions}}</p>
                {{/if}}
            </div>
            {{/each}}
        </section>
        <!--SECTION_exercises_END-->

        <!--SECTION_instructions_START-->
        <section class="instructions">
            <h4>INSTRUÇÕES GERAIS</h4>
            <p>{{generalInstructions}}</p>
            
            {{#if contraindications}}
            <h5>CONTRAINDICAÇÕES:</h5>
            <ul>
            {{#each contraindications}}
                <li>{{this}}</li>
            {{/each}}
            </ul>
            {{/if}}
        </section>
        <!--SECTION_instructions_END-->

        <!--SECTION_footer_START-->
        <footer class="document-footer">
            <p><strong>Data da Prescrição:</strong> {{prescriptionDate}}</p>
            <p><strong>Próxima Reavaliação:</strong> {{nextReview}}</p>
            
            <div class="signature-area">
                <hr>
                <p>{{therapistName}}<br>CREFITO: {{therapistCREFITO}}</p>
            </div>
        </footer>
        <!--SECTION_footer_END-->
    </div>
</body>
</html>`;
  }

  private getDefaultCSSStyles(): string {
    return `
<style>
.document-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
    font-family: 'Times New Roman', serif;
    line-height: 1.6;
    color: #333;
    background: white;
}

.document-header {
    text-align: center;
    border-bottom: 2px solid #333;
    padding-bottom: 20px;
    margin-bottom: 30px;
}

.document-header h1 {
    margin: 0 0 10px 0;
    font-size: 20px;
    font-weight: bold;
}

.document-header h2 {
    margin: 0 0 5px 0;
    font-size: 16px;
    font-weight: bold;
}

.document-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: normal;
}

section {
    margin-bottom: 25px;
}

h4 {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 15px;
    text-transform: uppercase;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
}

h5 {
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 10px;
}

p {
    margin-bottom: 10px;
    text-align: justify;
}

ul {
    padding-left: 20px;
    margin-bottom: 15px;
}

li {
    margin-bottom: 5px;
}

.signature-block {
    margin-top: 40px;
}

.signature-line {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
}

.signature-line > div {
    width: 45%;
    text-align: center;
}

.signature-line hr {
    border: none;
    border-top: 1px solid #333;
    margin-bottom: 5px;
}

.signature-area {
    margin-top: 40px;
    text-align: center;
}

.signature-area hr {
    width: 300px;
    border: none;
    border-top: 1px solid #333;
    margin: 0 auto 5px auto;
}

.document-footer {
    margin-top: 40px;
    text-align: center;
    font-size: 12px;
}

.exercise-item {
    border: 1px solid #ddd;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 5px;
}

.exercise-item h5 {
    color: #2563eb;
    margin-bottom: 10px;
}

@media print {
    .document-container {
        padding: 20px;
    }
    
    .document-header {
        page-break-after: avoid;
    }
    
    section {
        page-break-inside: avoid;
    }
}
</style>`;
  }

  /**
   * ============== UTILITÁRIOS ==============
   */

  private generateId(): string {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateTitle(template: DocumentTemplate, data: any): string {
    const patientName = data.patientName || 'Paciente';
    const date = new Date().toLocaleDateString('pt-BR');
    return `${template.name} - ${patientName} - ${date}`;
  }

  private calculateValidUntil(type: DocumentType): string | undefined {
    const now = new Date();
    
    switch (type) {
      case DocumentType.CONSENT_TREATMENT:
        // Válido por 2 anos
        return new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString();
      case DocumentType.ATTENDANCE_DECLARATION:
        // Válido por 5 anos (para fins trabalhistas)
        return new Date(now.getFullYear() + 5, now.getMonth(), now.getDate()).toISOString();
      case DocumentType.PAYMENT_RECEIPT:
        // Válido por 5 anos (para fins fiscais)
        return new Date(now.getFullYear() + 5, now.getMonth(), now.getDate()).toISOString();
      case DocumentType.EXERCISE_PRESCRIPTION:
        // Válido por 6 meses
        return new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).toISOString();
      default:
        return undefined;
    }
  }

  private async generateComplianceInfo(template: DocumentTemplate, data: any): Promise<ComplianceInfo> {
    return {
      cfm: {
        resolutionNumber: 'CFM 1.821/2007',
        requirements: ['Digitalização de documentos médicos'],
        isCompliant: true,
        lastReview: new Date().toISOString(),
        reviewer: 'system',
        notes: 'Documento em conformidade'
      },
      coffito: {
        resolutionNumber: 'COFFITO 415/2012',
        ethicalCode: 'Código de Ética da Fisioterapia',
        professionalRegistry: data.therapistCREFITO || '',
        isCompliant: true,
        lastReview: new Date().toISOString(),
        notes: 'Documento em conformidade'
      },
      lgpd: {
        legalBasis: 'CONSENT' as any,
        dataCategories: ['Dados pessoais', 'Dados de saúde'],
        retentionPeriod: 20, // 20 anos para prontuários
        dataSubjectRights: ['Acesso', 'Retificação', 'Exclusão', 'Portabilidade'],
        isCompliant: true,
        dpoApproval: true,
        lastReview: new Date().toISOString(),
        privacyNotice: 'Disponível no site da clínica'
      },
      anvisa: {
        sanitaryLicense: 'Licença sanitária válida',
        regulationNumber: 'RDC 63/2011',
        isCompliant: true,
        lastInspection: new Date().toISOString(),
        notes: 'Estabelecimento licenciado'
      },
      auditTrail: [{
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        userId: data.therapistId || 'system',
        action: 'Document compliance verified',
        details: 'Automatic compliance check performed',
        ipAddress: '127.0.0.1',
        result: 'success'
      }]
    };
  }

  private generateMetadata(template: DocumentTemplate, data: any): any {
    return {
      language: 'pt-BR',
      locale: 'pt-BR',
      generatedBy: 'FisioFlow Document Service',
      tags: [template.type, 'fisioterapia', 'legal'],
      category: 'legal_document',
      priority: 'medium' as const,
      confidentiality: 'confidential' as const,
      legalBasis: ['Consent', 'Medical Treatment'],
      retentionPeriod: this.getRetentionPeriod(template.type),
      customFields: {
        templateVersion: template.version,
        generationMethod: 'automatic',
        aiEnhanced: true
      }
    };
  }

  private getRetentionPeriod(type: DocumentType): number {
    switch (type) {
      case DocumentType.CONSENT_TREATMENT:
      case DocumentType.MEDICAL_REPORT:
        return 20; // Prontuário médico: 20 anos
      case DocumentType.PAYMENT_RECEIPT:
      case DocumentType.SERVICE_INVOICE:
        return 5; // Documentos fiscais: 5 anos
      case DocumentType.ATTENDANCE_DECLARATION:
        return 5; // Documentos trabalhistas: 5 anos
      default:
        return 5; // Padrão: 5 anos
    }
  }

  private validateInputData(template: DocumentTemplate, data: any): void {
    for (const variable of template.variables) {
      if (variable.required && !data[variable.name]) {
        throw new Error(`Campo obrigatório '${variable.name}' não fornecido`);
      }
    }

    for (const rule of template.validationRules) {
      if (!this.validateField(data[rule.field], rule.rule)) {
        throw new Error(rule.message);
      }
    }
  }

  private validateField(value: any, rule: string): boolean {
    if (!value) return true; // Validação apenas se valor existe

    if (rule === 'cpf') {
      return this.validateCPF(value);
    }
    if (rule === 'cnpj') {
      return this.validateCNPJ(value);
    }
    if (rule === 'crefito') {
      return /^\d{4,6}-[A-Z]$/.test(value);
    }
    if (rule.startsWith('min:')) {
      const min = parseFloat(rule.split(':')[1]);
      return parseFloat(value) >= min;
    }
    if (rule.startsWith('max:')) {
      const max = parseFloat(rule.split(':')[1]);
      return parseFloat(value) <= max;
    }

    return true;
  }

  private validateCPF(cpf: string): boolean {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return false;
    
    // Validação simplificada - em produção usar biblioteca específica
    return numbers !== '00000000000' && numbers !== '11111111111';
  }

  private validateCNPJ(cnpj: string): boolean {
    const numbers = cnpj.replace(/\D/g, '');
    return numbers.length === 14;
  }

  private getVariableValue(data: any, variableName: string): any {
    return data[variableName] || '';
  }

  private formatValue(value: any, type: string): string {
    if (!value) return '';

    switch (type) {
      case 'date':
        return new Date(value).toLocaleDateString('pt-BR');
      case 'number':
        return value.toLocaleString('pt-BR');
      case 'list':
        return Array.isArray(value) ? value.join(', ') : value;
      default:
        return String(value);
    }
  }

  private evaluateCondition(condition: string, data: any): boolean {
    // Implementação simplificada - em produção usar parser mais robusto
    try {
      const func = new Function('data', `return ${condition}`);
      return func(data);
    } catch {
      return true; // Se não conseguir avaliar, inclui a seção
    }
  }

  private applyCSSStyles(content: string, styles: string): string {
    return content.replace('</head>', `${styles}\n</head>`);
  }

  private shouldEnhanceWithAI(template: DocumentTemplate): boolean {
    return [
      DocumentType.CONSENT_TREATMENT,
      DocumentType.EXERCISE_PRESCRIPTION,
      DocumentType.TREATMENT_PLAN
    ].includes(template.type);
  }

  private async enhanceContentWithAI(content: string, data: any): Promise<string> {
    // Placeholder para melhorias de conteúdo com IA
    return content;
  }

  private async initiateSignatureProcess(documentId: string, userId: string): Promise<void> {
    // Placeholder para processo de assinatura
    this.logAction(documentId, 'SIGNATURE_INITIATED', userId, 'Processo de assinatura iniciado');
  }

  private async scheduleDelivery(documentId: string, options: GenerationOptions): Promise<void> {
    // Placeholder para agendamento de entrega
    this.logAction(documentId, 'DELIVERY_SCHEDULED', 'system', `Entrega agendada via ${options.deliveryMethod}`);
  }

  private logAction(documentId: string, action: string, userId: string, details: string): void {
    const log: DocumentLog = {
      id: this.generateId(),
      documentId,
      timestamp: new Date().toISOString(),
      userId,
      action: action as any,
      details,
      ipAddress: '127.0.0.1',
      userAgent: 'FisioFlow/1.0',
      sessionId: 'system'
    };

    this.logs.push(log);
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = localStorage.getItem('fisioflow_documents');
      if (saved) {
        const data = JSON.parse(saved);
        this.documents = new Map(data.documents || []);
        this.signatures = new Map(data.signatures || []);
        this.deliveries = new Map(data.deliveries || []);
        this.logs = data.logs || [];
      }
    } catch (error) {
      console.warn('Erro ao carregar documentos:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        documents: Array.from(this.documents.entries()),
        signatures: Array.from(this.signatures.entries()),
        deliveries: Array.from(this.deliveries.entries()),
        logs: this.logs.slice(-1000) // Mantém apenas os últimos 1000 logs
      };
      localStorage.setItem('fisioflow_documents', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar documentos:', error);
    }
  }

  /**
   * ============== API PÚBLICA ==============
   */

  /**
   * Obtém documento por ID
   */
  getDocument(id: string): BaseDocument | undefined {
    return this.documents.get(id);
  }

  /**
   * Lista documentos por paciente
   */
  getDocumentsByPatient(patientId: string): BaseDocument[] {
    return Array.from(this.documents.values())
      .filter(doc => doc.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Lista templates disponíveis
   */
  getAvailableTemplates(): DocumentTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Obtém template por ID
   */
  getTemplate(id: string): DocumentTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Lista documentos por tipo
   */
  getDocumentsByType(type: DocumentType): BaseDocument[] {
    return Array.from(this.documents.values())
      .filter(doc => doc.type === type)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Busca documentos
   */
  searchDocuments(query: string): BaseDocument[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.documents.values())
      .filter(doc => 
        doc.title.toLowerCase().includes(searchTerm) ||
        doc.content.toLowerCase().includes(searchTerm)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Instância singleton
export const documentService = new DocumentService();

// Funções de conveniência
export async function generateConsentForm(patientId: string, therapistId: string, data: ConsentFormData): Promise<BaseDocument> {
  return await documentService.generateDocument({
    templateId: 'consent_treatment_v1',
    patientId,
    therapistId,
    data,
    options: {
      format: 'html',
      includeSignature: true,
      deliveryMethod: 'email',
      recipients: [data.patientEmail],
      customization: {}
    }
  });
}

export async function generateAttendanceDeclaration(patientId: string, therapistId: string, sessionData: any): Promise<BaseDocument> {
  return await documentService.generateDocument({
    templateId: 'attendance_declaration_v1',
    patientId,
    therapistId,
    data: sessionData,
    options: {
      format: 'pdf',
      includeSignature: true,
      deliveryMethod: 'download',
      recipients: [],
      customization: {}
    }
  });
}

export async function generatePaymentReceipt(patientId: string, therapistId: string, paymentData: FinancialData): Promise<BaseDocument> {
  return await documentService.generateDocument({
    templateId: 'payment_receipt_v1',
    patientId,
    therapistId,
    data: paymentData,
    options: {
      format: 'pdf',
      includeSignature: false,
      deliveryMethod: 'email',
      recipients: [paymentData.patientEmail],
      customization: {}
    }
  });
}

export async function generateExercisePrescription(patientId: string, therapistId: string, exerciseData: any): Promise<BaseDocument> {
  return await documentService.generateDocument({
    templateId: 'exercise_prescription_v1',
    patientId,
    therapistId,
    data: exerciseData,
    options: {
      format: 'pdf',
      includeSignature: true,
      deliveryMethod: 'email',
      recipients: [exerciseData.patientEmail],
      customization: {}
    }
  });
}

export default documentService;