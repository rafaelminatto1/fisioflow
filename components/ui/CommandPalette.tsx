import { Command } from 'cmdk';
import { File, Home, Search } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface CommandPaletteProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  setIsOpen,
}) => {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <Command.Dialog open={isOpen} onOpenChange={setIsOpen} label="Command Menu">
      <Command.Input placeholder="Digite um comando ou pesquise..." />
      <Command.List>
        <Command.Empty>Nenhum resultado encontrado.</Command.Empty>

        <Command.Group heading="Sugestões">
          <Command.Item>
            <Home className="mr-2 h-4 w-4" />
            <span>Início</span>
          </Command.Item>
          <Command.Item>
            <File className="mr-2 h-4 w-4" />
            <span>Novo Paciente</span>
          </Command.Item>
          <Command.Item>
            <Search className="mr-2 h-4 w-4" />
            <span>Buscar Protocolo</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};
