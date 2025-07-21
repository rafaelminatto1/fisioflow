import React, { useState } from 'react';
import { NOTEBOOKS } from '../constants';
import { Notebook, Page } from '../types';
import { IconChevronRight } from './icons/IconComponents';

interface PageItemProps {
  page: Page;
  onSelect: (pageId: string) => void;
}

const PageItem: React.FC<PageItemProps> = ({ page, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(page.id)}
      className="flex w-full items-center rounded-md py-1 pl-8 pr-2 text-left text-sm text-slate-400 transition-colors hover:text-slate-100"
    >
      <span className="mr-3 h-1.5 w-1.5 rounded-full bg-slate-500"></span>
      {page.title}
    </button>
  );
};

interface NotebookItemProps {
  notebook: Notebook;
  onSelectPage: (pageId: string) => void;
}

const NotebookItem: React.FC<NotebookItemProps> = ({
  notebook,
  onSelectPage,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center rounded-md p-2 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
      >
        <span className="mr-2">{notebook.icon}</span>
        <span className="flex-1">{notebook.title}</span>
        <IconChevronRight
          className={`h-4 w-4 transform transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="mt-1 space-y-1">
          {notebook.pages.map((page) => (
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
  return (
    <div className="space-y-2">
      {NOTEBOOKS.map((notebook) => (
        <NotebookItem
          key={notebook.id}
          notebook={notebook}
          onSelectPage={onSelectPage}
        />
      ))}
    </div>
  );
};

export default NotebookTree;
