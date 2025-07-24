
import React, { useState } from 'react';
import { NOTEBOOKS } from '/constants.js';
import { Notebook, Page } from '/types.js';
import { IconChevronRight, IconLoader } from '/components/icons/IconComponents.js';
import { useAuth } from '/hooks/useAuth.js';
import { usePermissions } from '/hooks/usePermissions.js';

interface PageItemProps {
    page: Page;
    onSelect: (pageId: string) => void;
}

const PageItem: React.FC<PageItemProps> = ({ page, onSelect }) => {
    return (
        <button onClick={() => onSelect(page.id)} className="w-full text-left flex items-center text-sm text-slate-400 hover:text-slate-100 py-1 pl-8 pr-2 rounded-md transition-colors">
            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full mr-3"></span>
            {page.title}
        </button>
    );
};

interface NotebookItemProps {
    notebook: Notebook;
    onSelectPage: (pageId: string) => void;
}


const NotebookItem: React.FC<NotebookItemProps> = ({ notebook, onSelectPage }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center w-full text-left text-sm font-medium text-slate-300 hover:bg-slate-700 p-2 rounded-md transition-colors"
            >
                <span className="mr-2">{notebook.icon}</span>
                <span className="flex-1">{notebook.title}</span>
                <IconChevronRight className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="mt-1 space-y-1">
                    {notebook.pages.map(page => (
                        <PageItem key={page.id} page={page} onSelect={onSelectPage} />
                    ))}
                </div>
            )}
        </div>
    );
};

interface NotebookTreeProps {
    onSelectPage: (pageId: string) => void;
}

const NotebookTree: React.FC<NotebookTreeProps> = ({ onSelectPage }) => {
    const { user } = useAuth();
    const { permissions, isLoading } = usePermissions();

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-400 p-2">
                <IconLoader className="animate-spin" />
                <span>Carregando...</span>
            </div>
        );
    }
    
    const canViewNotebooks = user && permissions ? permissions[user.role].notebooks.view : false;

    if (!canViewNotebooks) {
        return null;
    }

    return (
        <div className="space-y-2">
            {NOTEBOOKS.map(notebook => (
                <NotebookItem key={notebook.id} notebook={notebook} onSelectPage={onSelectPage} />
            ))}
        </div>
    );
};

export default NotebookTree;