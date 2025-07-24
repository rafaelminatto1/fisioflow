
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Page } from '/types.js';
import { searchKnowledgeBase } from '/services/geminiService.js';
import { IconPencil, IconDeviceFloppy, IconSearch, IconSparkles } from '/components/icons/IconComponents.js';
import { useNotification } from '/hooks/useNotification.js';
import { useNotebooks } from '/hooks/useNotebooks.js';
import { GenerateContentResponse } from '@google/genai';
import { useAuth } from '/hooks/useAuth.js';
import { usePermissions } from '/hooks/usePermissions.js';

const NotebookPage: React.FC = () => {
    const { pageId } = useParams<{ pageId: string }>();
    const { data: notebooks = [], savePage } = useNotebooks();
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const { permissions } = usePermissions();

    const [page, setPage] = useState<Page | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState('');

    const canEdit = useMemo(() => {
        if (!user || !permissions) return false;
        return permissions[user.role].notebooks.edit;
    }, [user, permissions]);

    useEffect(() => {
        let foundPage: Page | undefined;
        for (const notebook of notebooks) {
            const p = notebook.pages.find(p => p.id === pageId);
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

    const handleSave = async () => {
        if (!pageId) return;
        try {
            await savePage({ pageId, content });
            addNotification({ type: 'success', title: 'Página Salva', message: 'O conteúdo da página foi salvo.' });
            setIsEditing(false);
        } catch (error) {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: (error as Error).message });
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

        try {
            const knowledgeBase = notebooks
                .flatMap(notebook => notebook.pages)
                .map(p => `Página: ${p.title}\nConteúdo:\n${p.content || 'Nenhum conteúdo.'}`)
                .join('\n\n---\n\n');
            
            const result: GenerateContentResponse = await searchKnowledgeBase(searchQuery, knowledgeBase);
            setSearchResult(result.text);
        } catch (error) {
             if (error instanceof Error) {
                addNotification({ type: 'error', title: 'Erro de Busca', message: error.message });
            }
            setSearchResult('Não foi possível realizar a busca no momento.');
        } finally {
            setIsSearching(false);
        }
    };

    if (!page) {
        return <div className="text-center text-slate-400">Página não encontrada.</div>;
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-slate-100">{page.title}</h1>
                    {!isEditing ? (
                        canEdit && (
                            <button onClick={() => setIsEditing(true)} className="flex items-center text-sm text-blue-400 hover:text-blue-300 px-3 py-2 rounded-md hover:bg-blue-500/10 transition-colors">
                                <IconPencil className="mr-2" /> Editar
                            </button>
                        )
                    ) : (
                        <div className="flex items-center space-x-2">
                             <button onClick={handleCancel} className="px-3 py-2 rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors text-sm">Cancelar</button>
                             <button onClick={handleSave} className="flex items-center text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors font-semibold px-3 py-2 rounded-md">
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
                            className="w-full h-full min-h-[400px] bg-slate-900 border border-slate-600 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
                            placeholder="Adicione o conteúdo da página aqui..."
                            readOnly={!isEditing}
                        />
                    ) : (
                        <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {content || <p className="text-slate-500 italic">Esta página ainda não tem conteúdo. Clique em "Editar" para adicionar.</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* AI Search Sidebar */}
            <aside className="lg:w-1/3 flex flex-col gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center">
                        <IconSearch className="mr-2 text-blue-400"/>
                        Busca Inteligente
                    </h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Pergunte à base de conhecimento..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                        <button onClick={handleSearch} disabled={isSearching} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors font-semibold disabled:bg-blue-800 disabled:cursor-not-allowed">
                            {isSearching ? '...' : <IconSearch size={16}/>}
                        </button>
                    </div>
                    
                    {isSearching && (
                        <div className="mt-4 text-center text-slate-400">
                            <IconSparkles className="animate-spin inline-block mr-2" />
                            Buscando...
                        </div>
                    )}

                    {searchResult && (
                        <div className="mt-4 border-t border-slate-700 pt-4">
                             <h3 className="text-md font-semibold text-slate-200 mb-2">Resultado da Busca:</h3>
                             <div className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/50 p-3 rounded-md max-h-96 overflow-y-auto">
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