/**
 * Contexto para gerenciamento do estado da UI
 * Controla modais, drawers, overlays e outros elementos de interface
 */

import React, { createContext, useContext, ReactNode } from 'react';

import { useOptimizedState, useStableCallback } from '../hooks/useOptimizedComponent';

// === INTERFACES ===
interface ModalState {
  id: string;
  isOpen: boolean;
  data?: any;
  options?: ModalOptions;
}

interface ModalOptions {
  closable?: boolean;
  persistent?: boolean;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  overlay?: boolean;
  animation?: 'fade' | 'slide' | 'scale' | 'none';
  onClose?: () => void;
}

interface DrawerState {
  id: string;
  isOpen: boolean;
  position: 'left' | 'right' | 'top' | 'bottom';
  size?: number | string;
  data?: any;
}

interface ToastState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  actions?: ToastAction[];
  persistent?: boolean;
}

interface ToastAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface LoadingState {
  id: string;
  message?: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: () => void;
}

interface UIStateContextType {
  // === MODAIS ===
  modals: ModalState[];
  openModal: (id: string, data?: any, options?: ModalOptions) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  isModalOpen: (id: string) => boolean;
  getModalData: (id: string) => any;
  
  // === DRAWERS ===
  drawers: DrawerState[];
  openDrawer: (id: string, position: DrawerState['position'], data?: any, size?: number | string) => void;
  closeDrawer: (id: string) => void;
  closeAllDrawers: () => void;
  isDrawerOpen: (id: string) => boolean;
  
  // === TOASTS ===
  toasts: ToastState[];
  showToast: (toast: Omit<ToastState, 'id'>) => string;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
  
  // === LOADING ===
  loadings: LoadingState[];
  showLoading: (id: string, message?: string, options?: Partial<LoadingState>) => void;
  hideLoading: (id: string) => void;
  updateLoadingProgress: (id: string, progress: number) => void;
  isLoading: (id: string) => boolean;
  
  // === OVERLAYS ===
  overlayVisible: boolean;
  showOverlay: () => void;
  hideOverlay: () => void;
  
  // === SIDEBAR ===
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // === COMANDOS ===
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  
  // === UTILS ===
  focusedElement: string | null;
  setFocusedElement: (id: string | null) => void;
  
  // Estado geral da UI
  uiBlocked: boolean;
  blockUI: (reason?: string) => void;
  unblockUI: () => void;
}

// === CONTEXTO ===
const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

// === PROVIDER ===
export const UIStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Estados principais
  const [modals, setModals] = useOptimizedState<ModalState[]>([]);
  const [drawers, setDrawers] = useOptimizedState<DrawerState[]>([]);
  const [toasts, setToasts] = useOptimizedState<ToastState[]>([]);
  const [loadings, setLoadings] = useOptimizedState<LoadingState[]>([]);
  
  // Estados simples
  const [overlayVisible, setOverlayVisible] = useOptimizedState(false);
  const [sidebarOpen, setSidebarOpen] = useOptimizedState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useOptimizedState(false);
  const [focusedElement, setFocusedElement] = useOptimizedState<string | null>(null);
  const [uiBlocked, setUIBlocked] = useOptimizedState(false);

  // === MODAL ACTIONS ===
  const openModal = useStableCallback((id: string, data?: any, options?: ModalOptions) => {
    setModals(prev => {
      const existing = prev.find(m => m.id === id);
      if (existing) {
        return prev.map(m => 
          m.id === id 
            ? { ...m, isOpen: true, data, options: { ...m.options, ...options } }
            : m
        );
      }
      
      return [...prev, { id, isOpen: true, data, options }];
    });
    
    setOverlayVisible(true);
    console.log(`🪟 Modal aberto: ${id}`);
  }, []);

  const closeModal = useStableCallback((id: string) => {
    setModals(prev => {
      const updated = prev.map(m => 
        m.id === id ? { ...m, isOpen: false } : m
      );
      
      // Se não há mais modais abertos, esconder overlay
      const hasOpenModals = updated.some(m => m.isOpen);
      if (!hasOpenModals) {
        setOverlayVisible(false);
      }
      
      return updated;
    });
    
    console.log(`🪟 Modal fechado: ${id}`);
  }, []);

  const closeAllModals = useStableCallback(() => {
    setModals(prev => prev.map(m => ({ ...m, isOpen: false })));
    setOverlayVisible(false);
    console.log('🪟 Todos os modais fechados');
  }, []);

  const isModalOpen = useStableCallback((id: string) => {
    return modals.find(m => m.id === id)?.isOpen || false;
  }, [modals]);

  const getModalData = useStableCallback((id: string) => {
    return modals.find(m => m.id === id)?.data;
  }, [modals]);

  // === DRAWER ACTIONS ===
  const openDrawer = useStableCallback((
    id: string, 
    position: DrawerState['position'], 
    data?: any, 
    size?: number | string
  ) => {
    setDrawers(prev => {
      const existing = prev.find(d => d.id === id);
      if (existing) {
        return prev.map(d => 
          d.id === id 
            ? { ...d, isOpen: true, position, data, size }
            : d
        );
      }
      
      return [...prev, { id, isOpen: true, position, data, size }];
    });
    
    console.log(`📋 Drawer aberto: ${id} (${position})`);
  }, []);

  const closeDrawer = useStableCallback((id: string) => {
    setDrawers(prev => prev.map(d => 
      d.id === id ? { ...d, isOpen: false } : d
    ));
    
    console.log(`📋 Drawer fechado: ${id}`);
  }, []);

  const closeAllDrawers = useStableCallback(() => {
    setDrawers(prev => prev.map(d => ({ ...d, isOpen: false })));
    console.log('📋 Todos os drawers fechados');
  }, []);

  const isDrawerOpen = useStableCallback((id: string) => {
    return drawers.find(d => d.id === id)?.isOpen || false;
  }, [drawers]);

  // === TOAST ACTIONS ===
  const showToast = useStableCallback((toast: Omit<ToastState, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastState = {
      ...toast,
      id,
      duration: toast.duration || (toast.type === 'error' ? 8000 : 4000),
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-hide se não for persistente
    if (!toast.persistent) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
    
    console.log(`🍞 Toast mostrado: ${toast.type} - ${toast.message}`);
    return id;
  }, []);

  const hideToast = useStableCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    console.log(`🍞 Toast removido: ${id}`);
  }, []);

  const clearAllToasts = useStableCallback(() => {
    setToasts([]);
    console.log('🍞 Todos os toasts removidos');
  }, []);

  // === LOADING ACTIONS ===
  const showLoading = useStableCallback((
    id: string, 
    message?: string, 
    options: Partial<LoadingState> = {}
  ) => {
    const loading: LoadingState = {
      id,
      message,
      progress: options.progress || 0,
      cancellable: options.cancellable || false,
      onCancel: options.onCancel,
    };
    
    setLoadings(prev => {
      const existing = prev.find(l => l.id === id);
      if (existing) {
        return prev.map(l => l.id === id ? { ...l, ...loading } : l);
      }
      return [...prev, loading];
    });
    
    console.log(`⏳ Loading iniciado: ${id} - ${message}`);
  }, []);

  const hideLoading = useStableCallback((id: string) => {
    setLoadings(prev => prev.filter(l => l.id !== id));
    console.log(`⏳ Loading finalizado: ${id}`);
  }, []);

  const updateLoadingProgress = useStableCallback((id: string, progress: number) => {
    setLoadings(prev => prev.map(l => 
      l.id === id ? { ...l, progress } : l
    ));
  }, []);

  const isLoading = useStableCallback((id: string) => {
    return loadings.some(l => l.id === id);
  }, [loadings]);

  // === OVERLAY ACTIONS ===
  const showOverlay = useStableCallback(() => {
    setOverlayVisible(true);
  }, []);

  const hideOverlay = useStableCallback(() => {
    setOverlayVisible(false);
  }, []);

  // === SIDEBAR ACTIONS ===
  const toggleSidebar = useStableCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // === COMMAND PALETTE ===
  const toggleCommandPalette = useStableCallback(() => {
    setCommandPaletteOpen(prev => !prev);
  }, []);

  // === UI BLOCKING ===
  const blockUI = useStableCallback((reason?: string) => {
    setUIBlocked(true);
    console.log(`🚫 UI bloqueada: ${reason || 'Sem motivo especificado'}`);
  }, []);

  const unblockUI = useStableCallback(() => {
    setUIBlocked(false);
    console.log('✅ UI desbloqueada');
  }, []);

  // === CLEANUP DE ESTADOS ANTIGOS ===
  React.useEffect(() => {
    const cleanup = () => {
      // Remover modais fechados após 5 minutos
      setModals(prev => prev.filter(m => 
        m.isOpen || Date.now() - parseInt(m.id.split('_')[1] || '0') < 5 * 60 * 1000
      ));
      
      // Remover drawers fechados após 5 minutos
      setDrawers(prev => prev.filter(d => 
        d.isOpen || Date.now() - parseInt(d.id.split('_')[1] || '0') < 5 * 60 * 1000
      ));
      
      // Manter apenas os últimos 50 toasts
      setToasts(prev => prev.slice(-50));
      
      // Remover loadings órfãos
      setLoadings(prev => prev.filter(l => 
        Date.now() - parseInt(l.id.split('_')[1] || '0') < 10 * 60 * 1000
      ));
    };

    const interval = setInterval(cleanup, 5 * 60 * 1000); // A cada 5 minutos
    return () => clearInterval(interval);
  }, []);

  // === KEYBOARD SHORTCUTS ===
  React.useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // ESC para fechar modais/drawers
      if (e.key === 'Escape') {
        if (modals.some(m => m.isOpen)) {
          const openModals = modals.filter(m => m.isOpen);
          const lastModal = openModals[openModals.length - 1];
          if (lastModal && lastModal.options?.closable !== false) {
            closeModal(lastModal.id);
          }
        } else if (drawers.some(d => d.isOpen)) {
          const openDrawers = drawers.filter(d => d.isOpen);
          const lastDrawer = openDrawers[openDrawers.length - 1];
          if (lastDrawer) {
            closeDrawer(lastDrawer.id);
          }
        }
      }
      
      // Ctrl+K para command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [modals, drawers, closeModal, closeDrawer, toggleCommandPalette]);

  // === VALOR DO CONTEXTO ===
  const contextValue: UIStateContextType = {
    // Modais
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getModalData,
    
    // Drawers
    drawers,
    openDrawer,
    closeDrawer,
    closeAllDrawers,
    isDrawerOpen,
    
    // Toasts
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
    
    // Loading
    loadings,
    showLoading,
    hideLoading,
    updateLoadingProgress,
    isLoading,
    
    // Overlay
    overlayVisible,
    showOverlay,
    hideOverlay,
    
    // Sidebar
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    
    // Command palette
    commandPaletteOpen,
    toggleCommandPalette,
    
    // Focus
    focusedElement,
    setFocusedElement,
    
    // UI Blocking
    uiBlocked,
    blockUI,
    unblockUI,
  };

  return (
    <UIStateContext.Provider value={contextValue}>
      {children}
    </UIStateContext.Provider>
  );
};

// === HOOK PRINCIPAL ===
export const useUIState = (): UIStateContextType => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within UIStateProvider');
  }
  return context;
};

// === HOOKS ESPECÍFICOS PARA PERFORMANCE ===
export const useModal = (id: string) => {
  const { openModal, closeModal, isModalOpen, getModalData } = useUIState();
  
  return {
    isOpen: isModalOpen(id),
    data: getModalData(id),
    open: (data?: any, options?: ModalOptions) => openModal(id, data, options),
    close: () => closeModal(id),
  };
};

export const useDrawer = (id: string) => {
  const { openDrawer, closeDrawer, isDrawerOpen } = useUIState();
  
  return {
    isOpen: isDrawerOpen(id),
    open: (position: DrawerState['position'], data?: any, size?: number | string) => 
      openDrawer(id, position, data, size),
    close: () => closeDrawer(id),
  };
};

export const useToast = () => {
  const { showToast } = useUIState();
  
  return {
    success: (message: string, options?: Partial<ToastState>) => 
      showToast({ type: 'success', message, ...options }),
    error: (message: string, options?: Partial<ToastState>) => 
      showToast({ type: 'error', message, ...options }),
    warning: (message: string, options?: Partial<ToastState>) => 
      showToast({ type: 'warning', message, ...options }),
    info: (message: string, options?: Partial<ToastState>) => 
      showToast({ type: 'info', message, ...options }),
  };
};

export const useLoading = (id: string) => {
  const { showLoading, hideLoading, updateLoadingProgress, isLoading } = useUIState();
  
  return {
    isLoading: isLoading(id),
    show: (message?: string, options?: Partial<LoadingState>) => 
      showLoading(id, message, options),
    hide: () => hideLoading(id),
    updateProgress: (progress: number) => updateLoadingProgress(id, progress),
  };
};

export default UIStateProvider;