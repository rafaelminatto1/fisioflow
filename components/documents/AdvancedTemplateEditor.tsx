/**
 * Editor Avançado de Templates de Documentos Legais
 * Editor visual WYSIWYG com validação em tempo real e preview
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Save,
  Eye,
  Code,
  Type,
  Image,
  Table,
  List,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
  Settings,
  CheckCircle,
  AlertTriangle,
  Palette,
  Layout,
  FileText,
  Wand2,
  Copy,
  Download,
  Upload,
  Undo,
  Redo,
  Search,
  Replace
} from 'lucide-react';

import type {
  DocumentTemplate,
  DocumentType,
  TemplateVariable,
  TemplateSection,
  ValidationRule,
  ComplianceRequirement
} from '../../types/legalDocuments';

import { complianceService } from '../../services/complianceService';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

interface TemplateEditorProps {
  template?: DocumentTemplate;
  onSave: (template: DocumentTemplate) => void;
  onClose: () => void;
}

interface EditorCommand {
  name: string;
  icon: React.ReactNode;
  action: () => void;
  isActive?: boolean;
  shortcut?: string;
}

export function AdvancedTemplateEditor({ template, onSave, onClose }: TemplateEditorProps) {
  const { currentUser, currentTenant } = useAuth();
  const { showNotification } = useNotification();

  const [currentTemplate, setCurrentTemplate] = useState<DocumentTemplate>(() => 
    template || {
      id: `template_${Date.now()}`,
      type: DocumentType.CONSENT_TREATMENT,
      name: 'Novo Template',
      description: '',
      version: '1.0.0',
      htmlContent: '<div class="document"><h1>{{title}}</h1><p>{{content}}</p></div>',
      cssStyles: `
        .document {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          color: #333;
        }
        h1 { color: #2563eb; margin-bottom: 20px; }
        p { margin-bottom: 16px; }
      `,
      variables: [
        { name: 'title', type: 'text', required: true, description: 'Título do documento', placeholder: 'Digite o título' },
        { name: 'content', type: 'text', required: true, description: 'Conteúdo principal', placeholder: 'Digite o conteúdo' }
      ],
      sections: [],
      validationRules: [],
      compliance: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.id || 'system'
    }
  );

  const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'preview'>('visual');
  const [activeTab, setActiveTab] = useState<'content' | 'variables' | 'styles' | 'validation' | 'compliance'>('content');
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<TemplateVariable | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});

  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  // Comandos do editor
  const editorCommands: EditorCommand[] = [
    {
      name: 'Bold',
      icon: <Bold className="h-4 w-4" />,
      action: () => document.execCommand('bold'),
      shortcut: 'Ctrl+B'
    },
    {
      name: 'Italic',
      icon: <Italic className="h-4 w-4" />,
      action: () => document.execCommand('italic'),
      shortcut: 'Ctrl+I'
    },
    {
      name: 'Underline',
      icon: <Underline className="h-4 w-4" />,
      action: () => document.execCommand('underline'),
      shortcut: 'Ctrl+U'
    },
    {
      name: 'Align Left',
      icon: <AlignLeft className="h-4 w-4" />,
      action: () => document.execCommand('justifyLeft')
    },
    {
      name: 'Align Center',
      icon: <AlignCenter className="h-4 w-4" />,
      action: () => document.execCommand('justifyCenter')
    },
    {
      name: 'Align Right',
      icon: <AlignRight className="h-4 w-4" />,
      action: () => document.execCommand('justifyRight')
    }
  ];

  useEffect(() => {
    // Inicializar dados de preview com valores padrão
    const defaultPreviewData = {};
    currentTemplate.variables.forEach(variable => {
      defaultPreviewData[variable.name] = variable.placeholder || `[${variable.name}]`;
    });
    setPreviewData(defaultPreviewData);
  }, [currentTemplate.variables]);

  useEffect(() => {
    validateTemplate();
  }, [currentTemplate]);

  const validateTemplate = async () => {
    setIsValidating(true);
    const errors: string[] = [];

    try {
      // Validação básica
      if (!currentTemplate.name.trim()) {
        errors.push('Nome do template é obrigatório');
      }

      if (!currentTemplate.htmlContent.trim()) {
        errors.push('Conteúdo HTML é obrigatório');
      }

      // Validação de variáveis
      const variableNames = currentTemplate.variables.map(v => v.name);
      const htmlVariables = currentTemplate.htmlContent.match(/\{\{(\w+)\}\}/g) || [];
      const usedVariables = htmlVariables.map(v => v.replace(/\{\{|\}\}/g, ''));

      // Verificar variáveis não definidas
      const undefinedVars = usedVariables.filter(v => !variableNames.includes(v));
      if (undefinedVars.length > 0) {
        errors.push(`Variáveis não definidas: ${undefinedVars.join(', ')}`);
      }

      // Verificar variáveis não utilizadas
      const unusedVars = variableNames.filter(v => !usedVariables.includes(v));
      if (unusedVars.length > 0) {
        errors.push(`Variáveis definidas mas não utilizadas: ${unusedVars.join(', ')}`);
      }

      // Validação CSS
      if (currentTemplate.cssStyles && !isValidCSS(currentTemplate.cssStyles)) {
        errors.push('CSS contém erros de sintaxe');
      }

      // Validação de compliance
      if (currentTemplate.compliance.length === 0) {
        errors.push('Template deve ter pelo menos um requisito de compliance');
      }

      setValidationErrors(errors);

    } catch (error) {
      console.error('Erro na validação:', error);
      errors.push('Erro interno na validação');
    } finally {
      setIsValidating(false);
    }
  };

  const isValidCSS = (css: string): boolean => {
    try {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      const isValid = style.sheet?.cssRules.length !== undefined;
      document.head.removeChild(style);
      return isValid;
    } catch {
      return false;
    }
  };

  const handleContentChange = (content: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      htmlContent: content,
      updatedAt: new Date().toISOString()
    }));
  };

  const handleVariableAdd = (variable: TemplateVariable) => {
    setCurrentTemplate(prev => ({
      ...prev,
      variables: [...prev.variables, variable],
      updatedAt: new Date().toISOString()
    }));
    setShowVariableModal(false);
    setEditingVariable(null);
  };

  const handleVariableEdit = (index: number, variable: TemplateVariable) => {
    setCurrentTemplate(prev => ({
      ...prev,
      variables: prev.variables.map((v, i) => i === index ? variable : v),
      updatedAt: new Date().toISOString()
    }));
    setShowVariableModal(false);
    setEditingVariable(null);
  };

  const handleVariableDelete = (index: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
      updatedAt: new Date().toISOString()
    }));
  };

  const insertVariable = (variableName: string) => {
    const placeholder = `{{${variableName}}}`;
    
    if (editorMode === 'visual' && contentRef.current) {
      // Inserir no editor visual
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.insertNode(document.createTextNode(placeholder));
        range.collapse(false);
      }
    } else {
      // Inserir no modo código
      const textarea = document.querySelector('textarea[name="htmlContent"]') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + placeholder + text.substring(end);
        handleContentChange(newText);
        
        // Reposicionar cursor
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
          textarea.focus();
        }, 0);
      }
    }
  };

  const generatePreview = (): string => {
    let preview = currentTemplate.htmlContent;
    
    // Substituir variáveis
    currentTemplate.variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      const value = previewData[variable.name] || variable.placeholder || `[${variable.name}]`;
      preview = preview.replace(regex, value);
    });

    return `
      <html>
        <head>
          <style>
            ${currentTemplate.cssStyles}
          </style>
        </head>
        <body>
          ${preview}
        </body>
      </html>
    `;
  };

  const handleSave = async () => {
    if (validationErrors.length > 0) {
      showNotification('Corrija os erros de validação antes de salvar', 'error');
      return;
    }

    try {
      await onSave(currentTemplate);
      showNotification('Template salvo com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      showNotification('Erro ao salvar template', 'error');
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(currentTemplate, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTemplate.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTemplate = JSON.parse(e.target?.result as string);
        setCurrentTemplate({
          ...importedTemplate,
          id: `template_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: currentUser?.id || 'system'
        });
        showNotification('Template importado com sucesso', 'success');
      } catch (error) {
        showNotification('Erro ao importar template: arquivo inválido', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl h-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Editor de Template</h2>
              <p className="text-sm text-gray-600">{currentTemplate.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Validation Status */}
            <div className="flex items-center space-x-2">
              {isValidating ? (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Validando...</span>
                </div>
              ) : validationErrors.length === 0 ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Válido</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{validationErrors.length} erro(s)</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleExport}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Exportar Template"
            >
              <Download className="h-4 w-4" />
            </button>

            <label className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer" title="Importar Template">
              <Upload className="h-4 w-4" />
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>

            <button
              onClick={handleSave}
              disabled={validationErrors.length > 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>Salvar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            {/* Mode Toggle */}
            <div className="flex items-center bg-white border rounded-lg">
              <button
                onClick={() => setEditorMode('visual')}
                className={`px-3 py-1 text-sm rounded-l-lg ${
                  editorMode === 'visual' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Eye className="h-4 w-4 inline mr-1" />
                Visual
              </button>
              <button
                onClick={() => setEditorMode('code')}
                className={`px-3 py-1 text-sm ${
                  editorMode === 'code' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Code className="h-4 w-4 inline mr-1" />
                Código
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                className={`px-3 py-1 text-sm rounded-r-lg ${
                  editorMode === 'preview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Eye className="h-4 w-4 inline mr-1" />
                Preview
              </button>
            </div>

            {/* Editor Commands (only in visual mode) */}
            {editorMode === 'visual' && (
              <div className="flex items-center space-x-1 border-l pl-4">
                {editorCommands.map((command, index) => (
                  <button
                    key={index}
                    onClick={command.action}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                    title={`${command.name}${command.shortcut ? ` (${command.shortcut})` : ''}`}
                  >
                    {command.icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={currentTemplate.name}
              onChange={(e) => setCurrentTemplate(prev => ({ ...prev, name: e.target.value, updatedAt: new Date().toISOString() }))}
              className="px-3 py-1 border rounded text-sm max-w-xs"
              placeholder="Nome do template"
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r bg-gray-50 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b">
              {[
                { id: 'content', label: 'Conteúdo', icon: <Type className="h-4 w-4" /> },
                { id: 'variables', label: 'Variáveis', icon: <Settings className="h-4 w-4" /> },
                { id: 'styles', label: 'Estilos', icon: <Palette className="h-4 w-4" /> },
                { id: 'validation', label: 'Validação', icon: <CheckCircle className="h-4 w-4" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-1 px-2 py-3 text-xs font-medium ${
                    activeTab === tab.id ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'variables' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Variáveis do Template</h3>
                    <button
                      onClick={() => {
                        setEditingVariable(null);
                        setShowVariableModal(true);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentTemplate.variables.map((variable, index) => (
                      <div key={index} className="p-3 bg-white border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">{{variable.name}}</div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => insertVariable(variable.name)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Inserir variável"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingVariable(variable);
                                setShowVariableModal(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Editar"
                            >
                              <Settings className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleVariableDelete(index)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Excluir"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">{variable.description}</div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className={`px-2 py-1 rounded-full ${
                            variable.type === 'text' ? 'bg-blue-100 text-blue-700' :
                            variable.type === 'number' ? 'bg-green-100 text-green-700' :
                            variable.type === 'date' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {variable.type}
                          </span>
                          {variable.required && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                              obrigatório
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'styles' && (
                <div className="space-y-4">
                  <h3 className="font-medium">CSS Personalizado</h3>
                  <textarea
                    value={currentTemplate.cssStyles}
                    onChange={(e) => setCurrentTemplate(prev => ({ 
                      ...prev, 
                      cssStyles: e.target.value, 
                      updatedAt: new Date().toISOString() 
                    }))}
                    className="w-full h-64 p-3 border rounded-lg font-mono text-sm"
                    placeholder="Digite seu CSS personalizado aqui..."
                  />
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Dicas de CSS</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Use .document como classe principal</li>
                      <li>• Defina fonts responsivas com rem/em</li>
                      <li>• Considere impressão com @media print</li>
                      <li>• Mantenha contraste adequado para acessibilidade</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'validation' && (
                <div className="space-y-4">
                  <h3 className="font-medium">Status de Validação</h3>
                  
                  {validationErrors.length === 0 ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Template válido</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Todos os critérios de validação foram atendidos.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {validationErrors.map((error, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start space-x-2 text-red-700">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Editor */}
          <div className="flex-1 flex flex-col">
            {editorMode === 'visual' && (
              <div
                ref={contentRef}
                contentEditable
                className="flex-1 p-6 overflow-y-auto"
                style={{ fontFamily: 'Arial, sans-serif' }}
                dangerouslySetInnerHTML={{ __html: currentTemplate.htmlContent }}
                onInput={(e) => handleContentChange(e.currentTarget.innerHTML)}
              />
            )}

            {editorMode === 'code' && (
              <textarea
                name="htmlContent"
                value={currentTemplate.htmlContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="flex-1 p-4 font-mono text-sm border-none outline-none resize-none"
                placeholder="Digite o código HTML do template aqui..."
              />
            )}

            {editorMode === 'preview' && (
              <iframe
                srcDoc={generatePreview()}
                className="flex-1 border-none"
                title="Preview do Template"
              />
            )}
          </div>
        </div>
      </div>

      {/* Variable Modal */}
      {showVariableModal && (
        <VariableModal
          variable={editingVariable}
          onSave={editingVariable ? 
            (variable) => handleVariableEdit(currentTemplate.variables.indexOf(editingVariable), variable) :
            handleVariableAdd
          }
          onClose={() => {
            setShowVariableModal(false);
            setEditingVariable(null);
          }}
        />
      )}
    </div>
  );
}

// Modal para criar/editar variáveis
function VariableModal({ 
  variable, 
  onSave, 
  onClose 
}: { 
  variable?: TemplateVariable | null;
  onSave: (variable: TemplateVariable) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<TemplateVariable>(
    variable || {
      name: '',
      type: 'text',
      required: false,
      description: '',
      placeholder: ''
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">
          {variable ? 'Editar Variável' : 'Nova Variável'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Variável</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="ex: patientName"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="date">Data</option>
              <option value="boolean">Verdadeiro/Falso</option>
              <option value="list">Lista</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva o propósito da variável"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Placeholder</label>
            <input
              type="text"
              value={formData.placeholder || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Valor padrão para preview"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="required" className="text-sm">Obrigatório</label>
          </div>

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
              {variable ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdvancedTemplateEditor;