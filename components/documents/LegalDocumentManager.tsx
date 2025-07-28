import { 
  FileText, 
  Download, 
  Eye, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Calendar,
  Workflow,
  Bell,
  Settings,
  PenTool
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useData } from '../../hooks/useData';
import type { ComplianceValidationResult } from '../../services/complianceService';
import { documentNotificationService } from '../../services/documentNotificationService';
import { documentWorkflowService } from '../../services/documentWorkflowService';
import { 
  BaseDocument, 
  DocumentType, 
  DocumentStatus,
  DocumentGenerationRequest
} from '../../types/legalDocuments';

import { AdvancedTemplateEditor } from './AdvancedTemplateEditor';

interface LegalDocumentManagerProps {
  patientId?: string;
}

type ViewType = 'documents' | 'workflows' | 'notifications' | 'templates';

export function LegalDocumentManager({ patientId }: LegalDocumentManagerProps) {
  const { documents, patients } = useData();
  const [selectedDocument, setSelectedDocument] = useState<BaseDocument | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [activeView, setActiveView] = useState<ViewType>('documents');
  const [complianceData, setComplianceData] = useState<Record<string, ComplianceValidationResult>>({});
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    if (patientId && doc.patientId !== patientId) return false;
    if (searchTerm && !doc.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    if (typeFilter !== 'all' && doc.type !== typeFilter) return false;
    return true;
  });

  const handleCreateDocument = (request: Partial<DocumentGenerationRequest>) => {
    console.log('Criando documento:', request);
    setShowCreateModal(false);
  };

  const handleDownload = (document: BaseDocument) => {
    console.log('Download do documento:', document.id);
  };

  const handleSign = (document: BaseDocument) => {
    console.log('Assinando documento:', document.id);
  };

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.DRAFT:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case DocumentStatus.PENDING_SIGNATURE:
        return <PenTool className="h-4 w-4 text-blue-500" />;
      case DocumentStatus.SIGNED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case DocumentStatus.EXPIRED:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.DRAFT:
        return 'Rascunho';
      case DocumentStatus.PENDING_SIGNATURE:
        return 'Pendente Assinatura';
      case DocumentStatus.SIGNED:
        return 'Assinado';
      case DocumentStatus.EXPIRED:
        return 'Expirado';
      default:
        return 'Desconhecido';
    }
  };

  const getTypeText = (type: DocumentType) => {
    switch (type) {
      case DocumentType.CONSENT_TREATMENT:
        return 'Termo de Consentimento';
      case DocumentType.ATTENDANCE_DECLARATION:
        return 'Declaração de Comparecimento';
      case DocumentType.EXERCISE_PRESCRIPTION:
        return 'Prescrição de Exercícios';
      case DocumentType.PAYMENT_RECEIPT:
        return 'Recibo de Pagamento';
      default:
        return 'Documento';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {patientId ? 'Documentos do Paciente' : 'Gerenciamento de Documentos Legais'}
          </h2>
          <p className="text-gray-600">
            Gerencie documentos legais, termos de consentimento e declarações
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Documento</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'documents', label: 'Documentos', icon: FileText },
            { id: 'workflows', label: 'Workflows', icon: Workflow },
            { id: 'notifications', label: 'Notificações', icon: Bell },
            { id: 'templates', label: 'Templates', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as ViewType)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Documents View */}
      {activeView === 'documents' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos os Status</option>
                <option value={DocumentStatus.DRAFT}>Rascunho</option>
                <option value={DocumentStatus.PENDING_SIGNATURE}>Pendente Assinatura</option>
                <option value={DocumentStatus.SIGNED}>Assinado</option>
                <option value={DocumentStatus.EXPIRED}>Expirado</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos os Tipos</option>
                <option value={DocumentType.CONSENT_TREATMENT}>Termo de Consentimento</option>
                <option value={DocumentType.ATTENDANCE_DECLARATION}>Declaração de Comparecimento</option>
                <option value={DocumentType.EXERCISE_PRESCRIPTION}>Prescrição de Exercícios</option>
                <option value={DocumentType.PAYMENT_RECEIPT}>Recibo de Pagamento</option>
              </select>
              
              <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="h-4 w-4" />
                <span>Filtros Avançados</span>
              </button>
            </div>
          </div>

          {/* Documents List */}
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-lg">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum documento encontrado</h3>
              <p className="text-gray-600 mb-4">Não há documentos que correspondam aos filtros selecionados.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Criar Primeiro Documento
              </button>
            </div>
          ) : (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {filteredDocuments.map(document => {
                  const patient = patients.find(p => p.id === document.patientId);
                  const compliance = complianceData[document.id];
                  
                  return (
                    <div key={document.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{document.title}</h3>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(document.status)}
                              <span className="text-sm text-gray-600">{getStatusText(document.status)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            {patient && (
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span>{patient.name}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(document.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                              {getTypeText(document.type)}
                            </span>
                          </div>
                          
                          {compliance && (
                            <div className="mt-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">Compliance:</span>
                                <div className={`px-2 py-1 rounded-full text-xs ${
                                  compliance.score >= 90 ? 'bg-green-100 text-green-800' :
                                  compliance.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {compliance.score.toFixed(0)}%
                                </div>
                              </div>
                              {compliance.violations.length > 0 && (
                                <div className="mt-1">
                                  <span className="text-xs text-red-600">
                                    {compliance.violations.length} violação(ões) encontrada(s)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {document.signatures && document.signatures.length > 0 && (
                            <div className="mt-2">
                              <span className="text-sm text-gray-600">
                                Assinaturas: {document.signatures.length}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedDocument(document)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(document)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {document.status === DocumentStatus.PENDING_SIGNATURE && (
                            <button
                              onClick={() => handleSign(document)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                              Assinar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
interface DocumentViewModalProps {
  document: BaseDocument;
  compliance?: ComplianceValidationResult;
  onClose: () => void;
}

function DocumentViewModal({ 
  document, 
  compliance, 
  onClose 
}: DocumentViewModalProps) {
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
interface CreateDocumentModalProps {
  patientId?: string;
  onClose: () => void;
  onCreate: (request: Partial<DocumentGenerationRequest>) => void;
}

function CreateDocumentModal({
  patientId,
  onClose,
  onCreate
}: CreateDocumentModalProps) {
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