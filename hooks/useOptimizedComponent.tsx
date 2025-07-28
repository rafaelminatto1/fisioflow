/**
 * Hook para otimização de performance em componentes React
 * Resolve problemas de re-renders excessivos identificados no sistema
 */

import { useCallback, useMemo, useRef, memo, useState, useEffect } from 'react';

// Hook para memoização inteligente de callbacks baseado em dependências profundas
export const useStableCallback = (
  callback: any,
  deps: any[]
): any => {
  const stableRef = useRef(callback);
  
  // Comparação profunda das dependências
  const memoizedDeps = useMemo(() => deps, deps);
  
  // Atualizar callback apenas quando dependências realmente mudarem
  useEffect(() => {
    stableRef.current = callback;
  }, [callback, memoizedDeps]);
  
  return useCallback((...args: any[]) => {
    return stableRef.current(...args);
  }, []);
};

// Hook para memoização de objetos complexos (evita re-renders por referência)
export const useStableObject = (
  obj: any,
  deps: any[] = []
): any => {
  return useMemo(() => obj, [JSON.stringify(obj), ...deps]);
};

// Hook otimizado para filtros e busca (evita re-computação desnecessária)
export const useOptimizedFilter = (
  items: any[],
  filterFn: (item: any) => boolean,
  deps: any[] = []
) => {
  return useMemo(() => {
    if (!items?.length) return [];
    return items.filter(filterFn);
  }, [items, JSON.stringify(deps)]);
};

// Hook para debounce otimizado (evita chamadas excessivas)
export const useOptimizedDebounce = (
  value: any,
  delay: number = 300
): any => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<any>();

  useEffect(() => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Criar novo timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook para cache local otimizado (evita recálculos)
export const useOptimizedMemo = (
  computeFn: () => any,
  deps: any[],
  cacheKey?: string
): any => {
  const cacheRef = useRef<Map<string, { value: any; deps: any[] }>>(new Map());
  
  return useMemo(() => {
    const key = cacheKey || JSON.stringify(deps);
    const cached = cacheRef.current.get(key);
    
    // Verificar se cache é válido
    if (cached && JSON.stringify(cached.deps) === JSON.stringify(deps)) {
      return cached.value;
    }
    
    // Computar novo valor
    const newValue = computeFn();
    
    // Armazenar no cache
    cacheRef.current.set(key, { value: newValue, deps });
    
    // Limpar cache antigo (manter apenas 10 entradas)
    if (cacheRef.current.size > 10) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    return newValue;
  }, deps);
};

// HOC para componentes pesados com memo otimizado
export const withOptimizedMemo = (
  Component: React.ComponentType<any>,
  propsAreEqual?: (prevProps: any, nextProps: any) => boolean
) => {
  const OptimizedComponent = memo(Component, propsAreEqual);
  OptimizedComponent.displayName = `OptimizedMemo(${Component.displayName || Component.name})`;
  return OptimizedComponent;
};

// Hook para componentes de lista otimizados
export const useOptimizedList = (
  items: any[],
  renderItem: (item: any, index: number) => React.ReactNode,
  keyExtractor?: (item: any) => string
) => {
  const stableRenderItem = useStableCallback(renderItem, []);
  const stableKeyExtractor = useStableCallback(
    keyExtractor || ((item: T) => item.id),
    []
  );

  return useMemo(() => {
    return items.map((item, index) => ({
      key: stableKeyExtractor(item),
      element: stableRenderItem(item, index),
      item,
    }));
  }, [items, stableRenderItem, stableKeyExtractor]);
};

// Hook para scroll virtual otimizado (para listas grandes)
export const useVirtualizedScroll = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    
    // Buffer para scroll suave
    const buffer = 3;
    const bufferedStart = Math.max(0, startIndex - buffer);
    const bufferedEnd = Math.min(itemCount - 1, endIndex + buffer);
    
    return {
      startIndex: bufferedStart,
      endIndex: bufferedEnd,
      visibleItems: bufferedEnd - bufferedStart + 1,
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount]);

  const handleScroll = useStableCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleRange,
    handleScroll,
    totalHeight: itemCount * itemHeight,
    scrollTop,
  };
};

// Hook para otimização de forms pesados
export const useOptimizedForm = (
  initialValues: any,
  validationFn?: (values: any) => Record<string, string>
) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleFieldChange = useStableCallback((field: string, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Validação em tempo real apenas para campos tocados
    if (touched[field as string] && validationFn) {
      const newValues = { ...values, [field]: value };
      const fieldErrors = validationFn(newValues);
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field as string] || '' }));
    }
  }, [values, touched, validationFn]);

  const handleFieldBlur = useStableCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (validationFn) {
      const fieldErrors = validationFn(values);
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field as string] || '' }));
    }
  }, [values, validationFn]);

  const validateForm = useStableCallback(() => {
    if (!validationFn) return true;
    
    const formErrors = validationFn(values);
    setErrors(formErrors);
    
    return Object.keys(formErrors).length === 0;
  }, [values, validationFn]);

  const resetForm = useStableCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleFieldChange,
    handleFieldBlur,
    validateForm,
    resetForm,
    isValid: Object.keys(errors).length === 0,
  };
};

// Hook para otimização de componentes com estado complexo
export const useOptimizedState = (
  initialState: any,
  reducer?: (state: any, action: any) => any
) => {
  const [state, setState] = useState(initialState);
  
  const optimizedSetState = useStableCallback((newState: any | ((prev: any) => any)) => {
    setState(prev => {
      if (typeof newState === 'function') {
        return newState(prev);
      }
      
      // Shallow comparison para evitar re-renders desnecessários
      const updated = { ...prev, ...newState };
      const hasChanged = Object.keys(updated).some(
        key => updated[key as keyof T] !== prev[key as keyof T]
      );
      
      return hasChanged ? updated : prev;
    });
  }, []);

  const dispatch = useStableCallback((action: any) => {
    if (reducer) {
      setState(prev => reducer(prev, action));
    }
  }, [reducer]);

  return [state, optimizedSetState, dispatch] as const;
};

// Utilitário para log de performance (desenvolvimento)
export const usePerformanceMonitor = (componentName: string, props?: any) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 ${componentName} render #${renderCount.current} (${timeSinceLastRender}ms since last)`);
      
      if (props) {
        console.log(`📊 Props:`, props);
      }
      
      if (timeSinceLastRender < 16) { // Menos de 1 frame (60fps)
        console.warn(`⚠️ ${componentName} renderizando muito rápido! Possível re-render desnecessário.`);
      }
    }
    
    lastRenderTime.current = now;
  });
  
  return renderCount.current;
};

export default {
  useStableCallback,
  useStableObject,
  useOptimizedFilter,
  useOptimizedDebounce,
  useOptimizedMemo,
  withOptimizedMemo,
  useOptimizedList,
  useVirtualizedScroll,
  useOptimizedForm,
  useOptimizedState,
  usePerformanceMonitor,
};