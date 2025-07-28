import React, { useState, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { searchKnowledgeBase } from '../services/geminiService';
import { Page } from '../types';

import {
  IconPencil,
  IconDeviceFloppy,
  IconSearch,
  IconSparkles,
} from './icons/IconComponents';

interface NotebookPageProps {
  pageId: string;
}

const NotebookPage: React.FC<NotebookPageProps> = ({ pageId }) => {
  const { user } = useAuth();
  const { notebooks, savePage } = useData();
  const [page, setPage] = useState<Page | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState('');

  useEffect(() => {
    let foundPage: Page | undefined;
    for (const notebook of notebooks) {
      const p = notebook.pages.find((p) => p.id === pageId);
      if (p) {
        foundPage = p;
        break;
      }
    }
    setPage(foundPage || null);
    setContent(foundPage?.content || '');
    setIsEditing(false); // Reset editing mode on page change
    setSearchResult(''); // Reset search results
    setSearchQuery(''); // Reset search query
  }, [pageId, notebooks]);

  const handleSave = () => {
    if (user) {
      savePage(pageId, content, user);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setContent(page?.content || '');
    setIsEditing(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResult('');

    const knowledgeBase = notebooks
      .flatMap((notebook) => notebook.pages)
      .map(
        (p) =>
          `Página: ${p.title}\nConteúdo:\n${p.content || 'Nenhum conteúdo.'}`
      )
      .join('\n\n---\n\n');

    const result = await searchKnowledgeBase(searchQuery, knowledgeBase);
    setSearchResult(result);
    setIsSearching(false);
  };

  if (!page) {
    return (
      <div className="text-center text-slate-400">Página não encontrada.</div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-8 lg:flex-row">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col rounded-lg border border-slate-700 bg-slate-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">{page.title}</h1>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center rounded-md px-3 py-2 text-sm text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300"
            >
              <IconPencil className="mr-2" /> Editar
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCancel}
                className="rounded-md bg-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <IconDeviceFloppy className="mr-2" /> Salvar
              </button>
            </div>
          )}
        </div>

        <div className="prose prose-invert max-w-none flex-1 overflow-y-auto">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="h-full min-h-[400px] w-full rounded-md border border-slate-600 bg-slate-900 p-3 font-mono text-slate-200 outline-none transition focus:ring-2 focus:ring-blue-500"
              placeholder="Adicione o conteúdo da página aqui..."
            />
          ) : (
            <div className="whitespace-pre-wrap leading-relaxed text-slate-300">
              {content || (
                <p className="italic text-slate-500">
                  Esta página ainda não tem conteúdo. Clique em "Editar" para
                  adicionar.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Search Sidebar */}
      <aside className="flex flex-col gap-4 lg:w-1/3">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-3 flex items-center text-lg font-semibold text-slate-200">
            <IconSearch className="mr-2 text-blue-400" />
            Busca Inteligente
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Pergunte à base de conhecimento..."
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
            >
              {isSearching ? '...' : <IconSearch size={16} />}
            </button>
          </div>

          {isSearching && (
            <div className="mt-4 text-center text-slate-400">
              <IconSparkles className="mr-2 inline-block animate-spin" />
              Buscando...
            </div>
          )}

          {searchResult && (
            <div className="mt-4 border-t border-slate-700 pt-4">
              <h3 className="text-md mb-2 font-semibold text-slate-200">
                Resultado da Busca:
              </h3>
              <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-900/50 p-3 text-sm text-slate-300">
                {searchResult}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default NotebookPage;
