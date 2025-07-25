import React, { useState, createContext, useContext } from 'react';

interface TabsContextProps {
  activeTab: string;
  setActiveTab: (label: string) => void;
}

const TabsContext = createContext<TabsContextProps | undefined>(undefined);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
};

// Componente Principal
export const Tabs: React.FC<{
  defaultValue: string;
  children: React.ReactNode;
}> = ({ defaultValue, children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

// Lista de Triggers
export const TabsList: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="mb-4 border-b border-slate-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {children}
      </nav>
    </div>
  );
};

// Trigger Individual
export const TabsTrigger: React.FC<{
  value: string;
  children: React.ReactNode;
}> = ({ value, children }) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors
        ${
          isActive
            ? 'border-primary text-primary'
            : 'border-transparent text-foreground/60 hover:border-slate-500 hover:text-foreground/80'
        }`}
    >
      {children}
    </button>
  );
};

// Conteúdo da Aba
export const TabsContent: React.FC<{
  value: string;
  children: React.ReactNode;
}> = ({ value, children }) => {
  const { activeTab } = useTabs();
  const isActive = activeTab === value;

  return isActive ? <div>{children}</div> : null;
};
