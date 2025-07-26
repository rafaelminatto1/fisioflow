/**
 * Gerenciador de Documentos Legais
 * Interface principal para criação, assinatura e gestão de documentos
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Users,
  Shield,
  Eye,
  Edit3,
  Archive,
  BarChart3,
  Settings,
  Workflow,
  Bell,
  Share,
  History,
  Zap
} from 'lucide-react';

import type { 
  BaseDocument, 
  DocumentType, 
  DocumentStatus,
  DocumentGenerationRequest,
  ComplianceValidationResult 
} from '../../types/legalDocuments';

import { documentService } from '../../services/documentService';
import { digitalSignatureService } from '../../services/digitalSignatureService';
import { complianceService } from '../../services/complianceService';
import { documentWorkflowService, startDocumentWorkflow } from '../../services/documentWorkflowService';
import { documentNotificationService, notifyDocumentCreated } from '../../services/documentNotificationService';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

import DocumentAnalyticsDashboard from './DocumentAnalyticsDashboard';
import AdvancedTemplateEditor from './AdvancedTemplateEditor';

interface LegalDocumentManagerProps {
  patientId?: string;
  onDocumentCreated?: (document: BaseDocument) => void;
}

export function LegalDocumentManager({ patientId, onDocumentCreated }: LegalDocumentManagerProps) {
  const { currentUser, currentTenant } = useAuth();
  const { patients, therapists } = useData();
  const { showNotification } = useNotification();

  const [documents, setDocuments] = useState<BaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [selectedDocument, setSelectedDocument] = useState<BaseDocument | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [complianceData, setComplianceData] = useState<Record<string, ComplianceValidationResult>>({});
  const [activeView, setActiveView] = useState<'documents' | 'analytics' | 'templates' | 'workflows' | 'notifications'>('documents');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, [patientId, currentTenant]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Em produção, seria uma chamada à API
      const savedDocs = localStorage.getItem('fisioflow_legal_documents');
      let docs: BaseDocument[] = savedDocs ? JSON.parse(savedDocs) : [];
      
      // Filtrar por tenant
      docs = docs.filter(doc => doc.tenantId === currentTenant?.id);
      
      // Filtrar por paciente se especificado
      if (patientId) {
        docs = docs.filter(doc => doc.patientId === patientId);
      }

      setDocuments(docs);

      // Carregar dados de compliance para cada documento
      const compliancePromises = docs.map(async (doc) => ({
        id: doc.id,
        compliance: await complianceService.validateDocumentCompliance(doc)
      }));

      const complianceResults = await Promise.all(compliancePromises);
      const complianceMap = {};
      complianceResults.forEach(result => {
        complianceMap[result.id] = result.compliance;
      });
      setComplianceData(complianceMap);

    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      showNotification('Erro ao carregar documentos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.SIGNED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case DocumentStatus.PENDING_SIGNATURE:
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case DocumentStatus.EXPIRED:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case DocumentStatus.DRAFT:
        return <Edit3 className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.SIGNED:
        return 'bg-green-100 text-green-800';
      case DocumentStatus.PENDING_SIGNATURE:
        return 'bg-yellow-100 text-yellow-800';
      case DocumentStatus.EXPIRED:
        return 'bg-red-100 text-red-800';
      case DocumentStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case DocumentStatus.ARCHIVED:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleCreateDocument = async (request: Partial<DocumentGenerationRequest>) => {
    try {
      const document = await documentService.generateDocument({
        templateId: request.templateId!,
        patientId: request.patientId || patientId!,
        therapistId: currentUser!.id,
        data: request.data || {},
        options: {
          format: 'html',
          includeSignature: true,
          deliveryMethod: 'download',
          recipients: [],
          customization: {}
        }
      });

      // Salvar documento
      const updatedDocs = [...documents, document];
      setDocuments(updatedDocs);
      localStorage.setItem('fisioflow_legal_documents', JSON.stringify(updatedDocs));

      // Iniciar workflow se aplicável
      try {
        await startDocumentWorkflow(document);
      } catch (error) {
        console.warn('Erro ao iniciar workflow:', error);
      }

      // Enviar notificações
      try {
        await notifyDocumentCreated(document);
      } catch (error) {
        console.warn('Erro ao enviar notificações:', error);
      }

      showNotification('Documento criado com sucesso', 'success');
      setShowCreateModal(false);
      
      if (onDocumentCreated) {
        onDocumentCreated(document);
      }

      // Recarregar compliance
      loadDocuments();

    } catch (error) {
      console.error('Erro ao criar documento:', error);
      showNotification('Erro ao criar documento', 'error');
    }
  };

  const handleSignDocument = async (documentId: string) => {
    try {
      const signature = await digitalSignatureService.signByEmail(
        documentId,
        currentUser!.id,
        currentUser!.email
      );

      // Atualizar status do documento
      const updatedDocs = documents.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              status: DocumentStatus.SIGNED,
              signatures: [...doc.signatures, signature]
            }
          : doc
      );

      setDocuments(updatedDocs);
      localStorage.setItem('fisioflow_legal_documents', JSON.stringify(updatedDocs));

      showNotification('Documento assinado com sucesso', 'success');
      loadDocuments();

    } catch (error) {
      console.error('Erro ao assinar documento:', error);
      showNotification('Erro ao assinar documento', 'error');
    }
  };

  const handleDownloadDocument = (document: BaseDocument) => {
    // Simular download
    const blob = new Blob([document.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Download iniciado', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Documentação Legal Avançada
            </h2>
            <p className="text-sm text-gray-600">
              Sistema completo de gestão documental com IA e compliance
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTemplateEditor(true)}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Edit3 className="h-4 w-4" />
            <span>Templates</span>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Documento</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'documents', label: 'Documentos', icon: <FileText className="h-4 w-4" />, count: documents.length },
            { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
            { id: 'workflows', label: 'Workflows', icon: <Workflow className="h-4 w-4" /> },
            { id: 'notifications', label: 'Notificações', icon: <Bell className="h-4 w-4" /> },
            { id: 'templates', label: 'Templates', icon: <Settings className="h-4 w-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeView === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active view */}
      {activeView === 'analytics' && <DocumentAnalyticsDashboard />}
      
      {activeView === 'documents' && (
        <>
          {/* Filtros */}
          <div className="bg-white border rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Status</option>
            <option value={DocumentStatus.DRAFT}>Rascunho</option>
            <option value={DocumentStatus.PENDING_SIGNATURE}>Pendente Assinatura</option>
            <option value={DocumentStatus.SIGNED}>Assinado</option>
            <option value={DocumentStatus.EXPIRED}>Expirado</option>
            <option value={DocumentStatus.ARCHIVED}>Arquivado</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'all')}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Tipos</option>
            <option value={DocumentType.CONSENT_TREATMENT}>Termo de Consentimento</option>
            <option value={DocumentType.ATTENDANCE_DECLARATION}>Declaração de Comparecimento</option>
            <option value={DocumentType.PAYMENT_RECEIPT}>Recibo de Pagamento</option>
            <option value={DocumentType.EXERCISE_PRESCRIPTION}>Prescrição de Exercícios</option>
          </select>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum documento encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              {documents.length === 0 
                ? "Comece criando seu primeiro documento legal"
                : "Tente ajustar os filtros de busca"
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Criar Documento
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredDocuments.map((document) => {
              const compliance = complianceData[document.id];
              const patient = patients.find(p => p.id === document.patientId);
              const therapist = therapists.find(t => t.id === document.therapistId);

              return (
                <div key={document.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FileText className="h-5 w-5 text-gray-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {document.title}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                            {getStatusIcon(document.status)}
                            <span className="ml-1 capitalize">
                              {document.status.replace('_', ' ')}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{patient?.name || 'Paciente não encontrado'}</span>
                          </div>
                          <div>
                            Criado em {new Date(document.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                          {compliance && (
                            <div className={`flex items-center space-x-1 ${getComplianceColor(compliance.score)}`}>
                              <Shield className="h-4 w-4" />
                              <span>Compliance: {compliance.score.toFixed(0)}%</span>
                            </div>
                          )}
                        </div>

                        {document.signatures.length > 0 && (
                          <div className="mt-2 text-xs text-green-600">
                            Assinado por {document.signatures.length} pessoa(s)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedDocument(document)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDownloadDocument(document)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      {document.status === DocumentStatus.PENDING_SIGNATURE && (
                        <button
                          onClick={() => handleSignDocument(document.id)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                          title="Assinar"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {compliance && compliance.violations.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800">
                          {compliance.violations.length} questão(s) de compliance detectada(s)
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-yellow-700">
                        {compliance.violations.slice(0, 2).map(v => v.description).join(', ')}
                        {compliance.violations.length > 2 && '...'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>
      )}

      {/* Other Views */}
      {activeView === 'workflows' && (
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center py-12">
            <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Workflows de Aprovação
            </h3>
            <p className="text-gray-600 mb-4">
              Gerencie fluxos de aprovação multi-níveis para documentos críticos
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {documentWorkflowService.getWorkflowStats().approved}
                </div>
                <div className="text-sm text-green-700">Aprovados</div>
              </div>
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {documentWorkflowService.getWorkflowStats().inProgress}
                </div>
                <div className="text-sm text-yellow-700">Em Andamento</div>
              </div>
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {documentWorkflowService.getWorkflowStats().total}
                </div>
                <div className="text-sm text-blue-700">Total</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'notifications' && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bell className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Central de Notificações</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {(() => {
              const stats = documentNotificationService.getNotificationStats();
              return [
                { label: 'Total Enviadas', value: stats.sent, color: 'blue' },
                { label: 'Entregues', value: stats.delivered, color: 'green' },
                { label: 'Pendentes', value: stats.pending, color: 'yellow' },
                { label: 'Falhas', value: stats.failed, color: 'red' }
              ].map((stat, index) => (
                <div key={index} className={`p-4 border border-${stat.color}-200 bg-${stat.color}-50 rounded-lg`}>
                  <div className={`text-2xl font-bold text-${stat.color}-600 mb-1`}>
                    {stat.value}
                  </div>
                  <div className={`text-sm text-${stat.color}-700`}>{stat.label}</div>
                </div>
              ));
            })()}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Notificações por Canal</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(documentNotificationService.getNotificationStats().byChannel).map(([channel, count]) => (
                <div key={channel} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600 capitalize">{channel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeView === 'templates' && (
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Editor de Templates Avançado
            </h3>
            <p className="text-gray-600 mb-4">
              Crie e personalize templates com editor visual WYSIWYG
            </p>
            <button
              onClick={() => setShowTemplateEditor(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Abrir Editor de Templates
            </button>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {selectedDocument && (
        <DocumentViewModal
          document={selectedDocument}
          compliance={complianceData[selectedDocument.id]}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Modal de Criação */}
      {showCreateModal && (
        <CreateDocumentModal
          patientId={patientId}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateDocument}
        />
      )}

      {/* Editor de Templates */}
      {showTemplateEditor && (
        <AdvancedTemplateEditor
          template={editingTemplate}
          onSave={(template) => {
            console.log('Template salvo:', template);
            setShowTemplateEditor(false);
            setEditingTemplate(null);
          }}
          onClose={() => {
            setShowTemplateEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// Modal de Visualização (simplificado)
function DocumentViewModal({ 
  document, 
  compliance, 
  onClose 
}: { 
  document: BaseDocument;
  compliance?: ComplianceValidationResult;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{document.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ×
          </button>
        </div>
        
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <div dangerouslySetInnerHTML={{ __html: document.content }} />
          
          {compliance && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Status de Compliance</h3>
              <div className="space-y-2">
                <div>Score: {compliance.score.toFixed(0)}%</div>
                {compliance.violations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600">Violações:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {compliance.violations.map((v, i) => (
                        <li key={i}>{v.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal de Criação (simplificado)
function CreateDocumentModal({
  patientId,
  onClose,
  onCreate
}: {
  patientId?: string;
  onClose: () => void;
  onCreate: (request: Partial<DocumentGenerationRequest>) => void;
}) {
  const [templateId, setTemplateId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');
  
  const { patients } = useData();

  const templates = [
    { id: 'consent_treatment', name: 'Termo de Consentimento para Tratamento', type: DocumentType.CONSENT_TREATMENT },
    { id: 'attendance_declaration', name: 'Declaração de Comparecimento', type: DocumentType.ATTENDANCE_DECLARATION },
    { id: 'exercise_prescription', name: 'Prescrição de Exercícios', type: DocumentType.EXERCISE_PRESCRIPTION },
    { id: 'payment_receipt', name: 'Recibo de Pagamento', type: DocumentType.PAYMENT_RECEIPT }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId || !selectedPatientId) return;

    onCreate({
      templateId,
      patientId: selectedPatientId,
      data: {}
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Criar Novo Documento</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tipo de Documento
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {!patientId && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Paciente
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione um paciente</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Criar Documento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LegalDocumentManager;