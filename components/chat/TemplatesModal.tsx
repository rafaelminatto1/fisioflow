import React, { useState, useMemo } from 'react';
import { MessageTemplate } from '../../types';
import BaseModal from '../ui/BaseModal';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MessageTemplate[];
  onUseTemplate: (templateId: string) => void;
}

const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  templates,
  onUseTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return Array.from(cats).sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Filtro por busca
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por categoria
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (template) => template.category === selectedCategory
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, searchQuery, selectedCategory]);

  const handleUseTemplate = (templateId: string) => {
    onUseTemplate(templateId);
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'saudacao':
        return '👋';
      case 'consulta':
        return '🩺';
      case 'exercicio':
        return '💪';
      case 'agendamento':
        return '📅';
      case 'orientacao':
        return '📋';
      case 'emergencia':
        return '🚨';
      case 'despedida':
        return '👋';
      default:
        return '📝';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'saudacao':
        return 'Saudações';
      case 'consulta':
        return 'Consultas';
      case 'exercicio':
        return 'Exercícios';
      case 'agendamento':
        return 'Agendamentos';
      case 'orientacao':
        return 'Orientações';
      case 'emergencia':
        return 'Emergência';
      case 'despedida':
        return 'Despedidas';
      default:
        return 'Outros';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'saudacao':
        return 'bg-green-100 text-green-700';
      case 'consulta':
        return 'bg-blue-100 text-blue-700';
      case 'exercicio':
        return 'bg-purple-100 text-purple-700';
      case 'agendamento':
        return 'bg-orange-100 text-orange-700';
      case 'orientacao':
        return 'bg-indigo-100 text-indigo-700';
      case 'emergencia':
        return 'bg-red-100 text-red-700';
      case 'despedida':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Templates de Mensagem"
      size="lg"
    >
      <div className="space-y-4">
        {/* Controles de busca e filtro */}
        <div className="flex space-x-3">
          {/* Barra de busca */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-400">
              🔍
            </div>
          </div>

          {/* Filtro por categoria */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {getCategoryIcon(category)} {getCategoryName(category)}
              </option>
            ))}
          </select>
        </div>

        {/* Estatísticas */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
          <span className="text-sm text-slate-600">
            {filteredTemplates.length} template
            {filteredTemplates.length !== 1 ? 's' : ''} encontrado
            {filteredTemplates.length !== 1 ? 's' : ''}
          </span>

          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-500">
              Total: {templates.length} templates
            </span>
            <span className="text-xs text-slate-500">
              {categories.length} categoria{categories.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Lista de templates */}
        <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
          {filteredTemplates.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <div className="mb-2 text-4xl">📝</div>
              <p className="mb-1 font-medium">Nenhum template encontrado</p>
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      {/* Header do template */}
                      <div className="mb-2 flex items-center space-x-2">
                        <h4 className="truncate font-medium text-slate-900">
                          {template.name}
                        </h4>

                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getCategoryColor(template.category)}`}
                        >
                          {getCategoryIcon(template.category)}{' '}
                          {getCategoryName(template.category)}
                        </span>
                      </div>

                      {/* Descrição */}
                      {template.description && (
                        <p className="mb-2 text-sm text-slate-600">
                          {template.description}
                        </p>
                      )}

                      {/* Preview do conteúdo */}
                      <div className="mb-3 rounded-lg bg-slate-50 p-3">
                        <p className="line-clamp-3 text-sm text-slate-700">
                          {template.content}
                        </p>
                      </div>

                      {/* Variáveis (se houver) */}
                      {template.variables && template.variables.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          <span className="text-xs text-slate-500">
                            Variáveis:
                          </span>
                          {template.variables.map((variable, index) => (
                            <span
                              key={index}
                              className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                            >
                              {`{${variable}}`}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metadados */}
                      <div className="flex items-center space-x-4 text-xs text-slate-400">
                        <span>
                          Categoria: {getCategoryName(template.category)}
                        </span>
                        {template.isActive !== undefined && (
                          <span
                            className={
                              template.isActive
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {template.isActive ? '✓ Ativo' : '✗ Inativo'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botão de usar template */}
                    <button
                      onClick={() => handleUseTemplate(template.id)}
                      disabled={template.isActive === false}
                      className="ml-4 flex-shrink-0 rounded-lg bg-blue-500 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Usar Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex justify-between border-t border-slate-200 pt-4">
          <div className="text-sm text-slate-500">
            💡 <strong>Dica:</strong> Use {`{nome}`}, {`{data}`} e outras
            variáveis nos templates para personalização automática
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default TemplatesModal;
