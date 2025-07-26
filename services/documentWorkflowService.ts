/**
 * Serviço de Workflow de Aprovação de Documentos
 * Sistema multi-níveis com aprovação sequencial e paralela
 */

import type {
  BaseDocument,
  DocumentStatus,
  AuditEntry
} from '../types/legalDocuments';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  approverRole: string[];
  approverIds?: string[];
  isRequired: boolean;
  isParallel: boolean; // Se true, todos os aprovadores devem aprovar
  autoApprove?: boolean;
  conditions?: WorkflowCondition[];
  timeoutHours: number;
  escalationRules?: EscalationRule[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface EscalationRule {
  afterHours: number;
  action: 'notify' | 'auto_approve' | 'reassign';
  targetRole?: string;
  targetIds?: string[];
  notificationMessage?: string;
}

export interface WorkflowInstance {
  id: string;
  documentId: string;
  workflowId: string;
  status: WorkflowStatus;
  currentStepIndex: number;
  steps: WorkflowStepInstance[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  completedAt?: string;
}

export interface WorkflowStepInstance {
  stepId: string;
  status: StepStatus;
  assignedTo: string[];
  approvals: Approval[];
  startedAt: string;
  completedAt?: string;
  timeoutAt: string;
  escalatedAt?: string;
  comments?: string;
}

export interface Approval {
  approverId: string;
  approverName: string;
  decision: 'approved' | 'rejected' | 'revision_requested';
  timestamp: string;
  comments?: string;
  conditions?: string[];
  digitalSignature?: string;
}

export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REVISION_REQUIRED = 'revision_required',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  SKIPPED = 'skipped'
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  documentTypes: string[];
  steps: WorkflowStep[];
  isActive: boolean;
  priority: number;
  autoStart: boolean;
  conditions: WorkflowCondition[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface NotificationRule {
  trigger: 'step_assigned' | 'step_approved' | 'step_rejected' | 'workflow_completed' | 'escalation';
  recipients: string[];
  template: string;
  channels: ('email' | 'sms' | 'whatsapp' | 'in_app')[];
}

class DocumentWorkflowService {
  private workflows: Map<string, WorkflowInstance> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private auditTrail: Map<string, AuditEntry[]> = new Map();
  private notificationRules: NotificationRule[] = [];

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultTemplates();
    this.startPeriodicTasks();
  }

  /**
   * ============== GESTÃO DE TEMPLATES ==============
   */

  private initializeDefaultTemplates(): void {
    // Template para documentos de consentimento
    const consentWorkflow: WorkflowTemplate = {
      id: 'consent_approval',
      name: 'Aprovação de Termos de Consentimento',
      description: 'Workflow para aprovação de documentos de consentimento',
      documentTypes: ['consent_treatment', 'consent_image_use', 'consent_telemedicine'],
      steps: [
        {
          id: 'legal_review',
          name: 'Revisão Legal',
          description: 'Verificação de conformidade legal e compliance',
          approverRole: ['ADMIN', 'LEGAL'],
          isRequired: true,
          isParallel: false,
          timeoutHours: 24,
          escalationRules: [
            {
              afterHours: 24,
              action: 'notify',
              targetRole: 'ADMIN',
              notificationMessage: 'Documento pendente de revisão legal há mais de 24h'
            }
          ]
        },
        {
          id: 'clinical_review',
          name: 'Revisão Clínica',
          description: 'Validação técnica do conteúdo clínico',
          approverRole: ['FISIOTERAPEUTA'],
          isRequired: true,
          isParallel: false,
          timeoutHours: 48,
          escalationRules: [
            {
              afterHours: 48,
              action: 'auto_approve',
              notificationMessage: 'Auto-aprovação após timeout'
            }
          ]
        }
      ],
      isActive: true,
      priority: 1,
      autoStart: true,
      conditions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    };

    // Template para documentos críticos
    const criticalWorkflow: WorkflowTemplate = {
      id: 'critical_approval',
      name: 'Aprovação de Documentos Críticos',
      description: 'Workflow rigoroso para documentos de alta criticidade',
      documentTypes: ['medical_report', 'treatment_plan', 'physical_capacity_certificate'],
      steps: [
        {
          id: 'compliance_check',
          name: 'Verificação de Compliance',
          description: 'Auditoria automática de compliance',
          approverRole: ['SYSTEM'],
          isRequired: true,
          isParallel: false,
          autoApprove: true,
          timeoutHours: 1,
          conditions: [
            {
              field: 'complianceScore',
              operator: 'greater_than',
              value: 90
            }
          ]
        },
        {
          id: 'dual_approval',
          name: 'Aprovação Dupla',
          description: 'Requer aprovação de dois profissionais',
          approverRole: ['FISIOTERAPEUTA', 'ADMIN'],
          isRequired: true,
          isParallel: true,
          timeoutHours: 72,
          escalationRules: [
            {
              afterHours: 72,
              action: 'notify',
              targetRole: 'ADMIN'
            }
          ]
        },
        {
          id: 'final_validation',
          name: 'Validação Final',
          description: 'Aprovação final do responsável técnico',
          approverRole: ['ADMIN'],
          isRequired: true,
          isParallel: false,
          timeoutHours: 24
        }
      ],
      isActive: true,
      priority: 2,
      autoStart: true,
      conditions: [
        {
          field: 'criticality',
          operator: 'equals',
          value: 'high'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    };

    this.templates.set(consentWorkflow.id, consentWorkflow);
    this.templates.set(criticalWorkflow.id, criticalWorkflow);
  }

  /**
   * ============== INICIALIZAÇÃO DE WORKFLOW ==============
   */

  async startWorkflow(document: BaseDocument): Promise<WorkflowInstance | null> {
    try {
      // Encontrar template apropriado
      const template = this.findApplicableTemplate(document);
      if (!template) {
        console.log('Nenhum workflow aplicável encontrado para o documento');
        return null;
      }

      // Criar instância do workflow
      const workflowInstance: WorkflowInstance = {
        id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentId: document.id,
        workflowId: template.id,
        status: WorkflowStatus.PENDING,
        currentStepIndex: 0,
        steps: template.steps.map(step => this.createStepInstance(step, document)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: document.therapistId
      };

      // Salvar workflow
      this.workflows.set(workflowInstance.id, workflowInstance);
      
      // Iniciar primeiro passo
      await this.startNextStep(workflowInstance);

      // Log de auditoria
      this.logAuditEvent(document.id, 'WORKFLOW_STARTED', 
        `Workflow ${template.name} iniciado`, workflowInstance.id);

      await this.saveToStorage();
      return workflowInstance;

    } catch (error) {
      console.error('Erro ao iniciar workflow:', error);
      throw error;
    }
  }

  private findApplicableTemplate(document: BaseDocument): WorkflowTemplate | null {
    const applicableTemplates = Array.from(this.templates.values())
      .filter(template => 
        template.isActive && 
        template.documentTypes.includes(document.type) &&
        this.evaluateConditions(template.conditions, document)
      )
      .sort((a, b) => b.priority - a.priority);

    return applicableTemplates[0] || null;
  }

  private evaluateConditions(conditions: WorkflowCondition[], document: BaseDocument): boolean {
    return conditions.every(condition => {
      const value = this.getDocumentFieldValue(document, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        default:
          return true;
      }
    });
  }

  private getDocumentFieldValue(document: BaseDocument, field: string): any {
    const fields = field.split('.');
    let value: any = document;
    
    for (const f of fields) {
      if (value && typeof value === 'object') {
        value = value[f];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private createStepInstance(step: WorkflowStep, document: BaseDocument): WorkflowStepInstance {
    const now = new Date();
    const timeout = new Date(now.getTime() + step.timeoutHours * 60 * 60 * 1000);

    return {
      stepId: step.id,
      status: StepStatus.PENDING,
      assignedTo: this.getStepAssignees(step, document),
      approvals: [],
      startedAt: now.toISOString(),
      timeoutAt: timeout.toISOString(),
      comments: ''
    };
  }

  private getStepAssignees(step: WorkflowStep, document: BaseDocument): string[] {
    // Se IDs específicos foram definidos, usar eles
    if (step.approverIds && step.approverIds.length > 0) {
      return step.approverIds;
    }

    // Caso contrário, buscar usuários pelo role
    // Em produção, seria uma consulta real ao banco de dados
    const assignees: string[] = [];
    
    if (step.approverRole.includes('SYSTEM')) {
      assignees.push('system');
    }
    
    // Adicionar o terapeuta responsável se necessário
    if (step.approverRole.includes('FISIOTERAPEUTA')) {
      assignees.push(document.therapistId);
    }
    
    // Adicionar admin se necessário
    if (step.approverRole.includes('ADMIN')) {
      assignees.push('admin_default'); // Em produção, buscar admin ativo
    }

    return assignees;
  }

  /**
   * ============== EXECUÇÃO DE WORKFLOW ==============
   */

  private async startNextStep(workflow: WorkflowInstance): Promise<void> {
    if (workflow.currentStepIndex >= workflow.steps.length) {
      await this.completeWorkflow(workflow);
      return;
    }

    const currentStep = workflow.steps[workflow.currentStepIndex];
    const template = this.templates.get(workflow.workflowId);
    const stepDefinition = template?.steps.find(s => s.id === currentStep.stepId);

    if (!stepDefinition) {
      throw new Error(`Definição do passo ${currentStep.stepId} não encontrada`);
    }

    // Verificar auto-aprovação
    if (stepDefinition.autoApprove) {
      const conditions = stepDefinition.conditions || [];
      const document = await this.getDocument(workflow.documentId);
      
      if (document && this.evaluateConditions(conditions, document)) {
        await this.autoApproveStep(workflow, currentStep);
        return;
      }
    }

    // Atualizar status
    currentStep.status = StepStatus.IN_PROGRESS;
    workflow.status = WorkflowStatus.IN_PROGRESS;
    workflow.updatedAt = new Date().toISOString();

    // Notificar aprovadores
    await this.notifyApprovers(workflow, currentStep, stepDefinition);

    // Agendar escalation se necessário
    if (stepDefinition.escalationRules) {
      this.scheduleEscalation(workflow, currentStep, stepDefinition.escalationRules);
    }

    await this.saveToStorage();
  }

  async approveStep(
    workflowId: string, 
    stepId: string, 
    approverId: string, 
    decision: 'approved' | 'rejected' | 'revision_requested',
    comments?: string
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow não encontrado');
    }

    const currentStep = workflow.steps[workflow.currentStepIndex];
    if (currentStep.stepId !== stepId) {
      throw new Error('Passo não está ativo para aprovação');
    }

    if (!currentStep.assignedTo.includes(approverId)) {
      throw new Error('Usuário não autorizado para aprovar este passo');
    }

    // Adicionar aprovação
    const approval: Approval = {
      approverId,
      approverName: await this.getUserName(approverId),
      decision,
      timestamp: new Date().toISOString(),
      comments
    };

    currentStep.approvals.push(approval);

    // Verificar se passo foi rejeitado
    if (decision === 'rejected') {
      currentStep.status = StepStatus.REJECTED;
      currentStep.completedAt = new Date().toISOString();
      workflow.status = WorkflowStatus.REJECTED;
      workflow.updatedAt = new Date().toISOString();
      
      this.logAuditEvent(workflow.documentId, 'WORKFLOW_REJECTED', 
        `Passo ${stepId} rejeitado por ${approverId}: ${comments}`, workflowId);
      
      await this.saveToStorage();
      return;
    }

    // Verificar se solicitou revisão
    if (decision === 'revision_requested') {
      workflow.status = WorkflowStatus.REVISION_REQUIRED;
      workflow.updatedAt = new Date().toISOString();
      
      this.logAuditEvent(workflow.documentId, 'WORKFLOW_REVISION_REQUESTED', 
        `Revisão solicitada no passo ${stepId} por ${approverId}: ${comments}`, workflowId);
      
      await this.saveToStorage();
      return;
    }

    // Verificar se passo foi completamente aprovado
    const template = this.templates.get(workflow.workflowId);
    const stepDefinition = template?.steps.find(s => s.id === stepId);
    
    if (stepDefinition && this.isStepCompletelyApproved(currentStep, stepDefinition)) {
      currentStep.status = StepStatus.APPROVED;
      currentStep.completedAt = new Date().toISOString();
      workflow.currentStepIndex++;
      
      this.logAuditEvent(workflow.documentId, 'WORKFLOW_STEP_APPROVED', 
        `Passo ${stepId} aprovado`, workflowId);
      
      // Iniciar próximo passo
      await this.startNextStep(workflow);
    }

    await this.saveToStorage();
  }

  private isStepCompletelyApproved(step: WorkflowStepInstance, definition: WorkflowStep): boolean {
    const approvals = step.approvals.filter(a => a.decision === 'approved');
    
    if (definition.isParallel) {
      // Todos os aprovadores devem aprovar
      return step.assignedTo.every(assignee => 
        approvals.some(approval => approval.approverId === assignee)
      );
    } else {
      // Apenas um aprovador precisa aprovar
      return approvals.length > 0;
    }
  }

  private async autoApproveStep(workflow: WorkflowInstance, step: WorkflowStepInstance): Promise<void> {
    const approval: Approval = {
      approverId: 'system',
      approverName: 'Sistema',
      decision: 'approved',
      timestamp: new Date().toISOString(),
      comments: 'Aprovação automática baseada em condições'
    };

    step.approvals.push(approval);
    step.status = StepStatus.APPROVED;
    step.completedAt = new Date().toISOString();
    workflow.currentStepIndex++;

    this.logAuditEvent(workflow.documentId, 'WORKFLOW_AUTO_APPROVED', 
      `Passo ${step.stepId} aprovado automaticamente`, workflow.id);

    await this.startNextStep(workflow);
  }

  private async completeWorkflow(workflow: WorkflowInstance): Promise<void> {
    workflow.status = WorkflowStatus.APPROVED;
    workflow.completedAt = new Date().toISOString();
    workflow.updatedAt = new Date().toISOString();

    // Atualizar status do documento
    const document = await this.getDocument(workflow.documentId);
    if (document) {
      document.status = DocumentStatus.SIGNED; // Ou outro status apropriado
      // Salvar documento atualizado
    }

    this.logAuditEvent(workflow.documentId, 'WORKFLOW_COMPLETED', 
      'Workflow concluído com sucesso', workflow.id);

    // Notificar conclusão
    await this.notifyWorkflowCompletion(workflow);

    await this.saveToStorage();
  }

  /**
   * ============== NOTIFICAÇÕES E ESCALATION ==============
   */

  private async notifyApprovers(
    workflow: WorkflowInstance, 
    step: WorkflowStepInstance, 
    definition: WorkflowStep
  ): Promise<void> {
    const message = `Documento pendente de aprovação: ${definition.name}`;
    
    for (const approverId of step.assignedTo) {
      console.log(`[NOTIFICATION] Para ${approverId}: ${message}`);
      // Em produção, enviar notificação real (email, SMS, etc.)
    }
  }

  private scheduleEscalation(
    workflow: WorkflowInstance, 
    step: WorkflowStepInstance, 
    rules: EscalationRule[]
  ): void {
    rules.forEach(rule => {
      const escalationTime = new Date(Date.now() + rule.afterHours * 60 * 60 * 1000);
      
      setTimeout(() => {
        this.executeEscalation(workflow.id, step.stepId, rule);
      }, rule.afterHours * 60 * 60 * 1000);
    });
  }

  private async executeEscalation(workflowId: string, stepId: string, rule: EscalationRule): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== WorkflowStatus.IN_PROGRESS) {
      return; // Workflow já foi concluído
    }

    const step = workflow.steps.find(s => s.stepId === stepId);
    if (!step || step.status !== StepStatus.IN_PROGRESS) {
      return; // Passo já foi processado
    }

    step.escalatedAt = new Date().toISOString();

    switch (rule.action) {
      case 'notify':
        console.log(`[ESCALATION] Notificação: ${rule.notificationMessage}`);
        break;
        
      case 'auto_approve':
        await this.autoApproveStep(workflow, step);
        break;
        
      case 'reassign':
        if (rule.targetIds) {
          step.assignedTo = rule.targetIds;
          await this.notifyApprovers(workflow, step, { name: 'Reassigned Step' } as WorkflowStep);
        }
        break;
    }

    this.logAuditEvent(workflow.documentId, 'WORKFLOW_ESCALATED', 
      `Escalation executada: ${rule.action}`, workflowId);

    await this.saveToStorage();
  }

  private async notifyWorkflowCompletion(workflow: WorkflowInstance): Promise<void> {
    console.log(`[NOTIFICATION] Workflow ${workflow.workflowId} concluído para documento ${workflow.documentId}`);
    // Em produção, enviar notificação real
  }

  /**
   * ============== UTILITÁRIOS ==============
   */

  private async getDocument(documentId: string): Promise<BaseDocument | null> {
    // Em produção, buscar do banco de dados
    const saved = localStorage.getItem('fisioflow_legal_documents');
    if (saved) {
      const docs: BaseDocument[] = JSON.parse(saved);
      return docs.find(d => d.id === documentId) || null;
    }
    return null;
  }

  private async getUserName(userId: string): Promise<string> {
    if (userId === 'system') return 'Sistema';
    // Em produção, buscar do banco de dados
    return `Usuário ${userId}`;
  }

  private startPeriodicTasks(): void {
    // Verificar timeouts a cada hora
    setInterval(() => {
      this.checkTimeouts();
    }, 60 * 60 * 1000);
  }

  private async checkTimeouts(): Promise<void> {
    const now = new Date();
    
    for (const workflow of this.workflows.values()) {
      if (workflow.status !== WorkflowStatus.IN_PROGRESS) continue;
      
      const currentStep = workflow.steps[workflow.currentStepIndex];
      if (currentStep && currentStep.status === StepStatus.IN_PROGRESS) {
        const timeoutDate = new Date(currentStep.timeoutAt);
        
        if (now > timeoutDate) {
          currentStep.status = StepStatus.EXPIRED;
          workflow.status = WorkflowStatus.EXPIRED;
          workflow.updatedAt = now.toISOString();
          
          this.logAuditEvent(workflow.documentId, 'WORKFLOW_TIMEOUT', 
            `Passo ${currentStep.stepId} expirou por timeout`, workflow.id);
        }
      }
    }
    
    await this.saveToStorage();
  }

  private logAuditEvent(documentId: string, action: string, details: string, workflowId?: string): void {
    const auditEntry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: 'system',
      action,
      details: workflowId ? `${details} (Workflow: ${workflowId})` : details,
      ipAddress: '127.0.0.1',
      result: 'success'
    };

    const documentAudit = this.auditTrail.get(documentId) || [];
    documentAudit.push(auditEntry);
    this.auditTrail.set(documentId, documentAudit);
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = localStorage.getItem('fisioflow_workflows');
      if (saved) {
        const data = JSON.parse(saved);
        this.workflows = new Map(data.workflows || []);
        this.templates = new Map(data.templates || []);
        this.auditTrail = new Map(data.auditTrail || []);
      }
    } catch (error) {
      console.warn('Erro ao carregar dados de workflow:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        workflows: Array.from(this.workflows.entries()),
        templates: Array.from(this.templates.entries()),
        auditTrail: Array.from(this.auditTrail.entries())
      };
      localStorage.setItem('fisioflow_workflows', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar dados de workflow:', error);
    }
  }

  /**
   * ============== API PÚBLICA ==============
   */

  getWorkflowsByDocument(documentId: string): WorkflowInstance[] {
    return Array.from(this.workflows.values())
      .filter(w => w.documentId === documentId);
  }

  getWorkflowById(workflowId: string): WorkflowInstance | null {
    return this.workflows.get(workflowId) || null;
  }

  getPendingApprovals(approverId: string): Array<{
    workflow: WorkflowInstance;
    step: WorkflowStepInstance;
    document?: BaseDocument;
  }> {
    const pending = [];
    
    for (const workflow of this.workflows.values()) {
      if (workflow.status === WorkflowStatus.IN_PROGRESS) {
        const currentStep = workflow.steps[workflow.currentStepIndex];
        
        if (currentStep && 
            currentStep.status === StepStatus.IN_PROGRESS && 
            currentStep.assignedTo.includes(approverId) &&
            !currentStep.approvals.some(a => a.approverId === approverId)) {
          
          pending.push({
            workflow,
            step: currentStep
          });
        }
      }
    }
    
    return pending;
  }

  getWorkflowStats(): {
    total: number;
    pending: number;
    inProgress: number;
    approved: number;
    rejected: number;
    expired: number;
    averageCompletionTime: number;
  } {
    const workflows = Array.from(this.workflows.values());
    
    const stats = {
      total: workflows.length,
      pending: workflows.filter(w => w.status === WorkflowStatus.PENDING).length,
      inProgress: workflows.filter(w => w.status === WorkflowStatus.IN_PROGRESS).length,
      approved: workflows.filter(w => w.status === WorkflowStatus.APPROVED).length,
      rejected: workflows.filter(w => w.status === WorkflowStatus.REJECTED).length,
      expired: workflows.filter(w => w.status === WorkflowStatus.EXPIRED).length,
      averageCompletionTime: 0
    };

    // Calcular tempo médio de conclusão
    const completed = workflows.filter(w => w.completedAt);
    if (completed.length > 0) {
      const totalTime = completed.reduce((sum, w) => {
        const start = new Date(w.createdAt).getTime();
        const end = new Date(w.completedAt!).getTime();
        return sum + (end - start);
      }, 0);
      
      stats.averageCompletionTime = totalTime / completed.length / (1000 * 60 * 60); // em horas
    }

    return stats;
  }

  async cancelWorkflow(workflowId: string, reason: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow não encontrado');
    }

    workflow.status = WorkflowStatus.CANCELLED;
    workflow.updatedAt = new Date().toISOString();

    this.logAuditEvent(workflow.documentId, 'WORKFLOW_CANCELLED', 
      `Workflow cancelado: ${reason}`, workflowId);

    await this.saveToStorage();
  }
}

// Instância singleton
export const documentWorkflowService = new DocumentWorkflowService();

// Funções de conveniência
export async function startDocumentWorkflow(document: BaseDocument): Promise<WorkflowInstance | null> {
  return await documentWorkflowService.startWorkflow(document);
}

export async function approveWorkflowStep(
  workflowId: string, 
  stepId: string, 
  approverId: string, 
  decision: 'approved' | 'rejected' | 'revision_requested',
  comments?: string
): Promise<void> {
  return await documentWorkflowService.approveStep(workflowId, stepId, approverId, decision, comments);
}

export function getPendingApprovals(approverId: string) {
  return documentWorkflowService.getPendingApprovals(approverId);
}

export function getWorkflowStats() {
  return documentWorkflowService.getWorkflowStats();
}

export default documentWorkflowService;