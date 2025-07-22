/**
 * useOptimizedStorage - Hook para armazenamento otimizado com índices
 * Substitui useLocalStorage com funcionalidades avançadas
 */

import { useState, useEffect } from 'react';
import { dataOptimizer } from '../services/dataOptimizer';

export const useOptimizedStorage = <T,>(
  key: string,
  initialValue: T,
  searchFields: (keyof T)[] = [],
  tenantField?: keyof T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (Array.isArray(initialValue)) {
        const data = dataOptimizer.loadOptimized<any>(key);
        return (data.length > 0 ? data : initialValue) as T;
      } else {
        const item = window.localStorage.getItem(key);
        if (item) {
          return JSON.parse(item);
        }
        return initialValue;
      }
    } catch (error) {
      console.error(`Error reading optimized storage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (Array.isArray(storedValue)) {
        dataOptimizer.saveOptimized(key, storedValue, searchFields, tenantField);
      } else {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.error(`Error setting optimized storage key "${key}":`, error);
    }
  }, [key, storedValue, searchFields, tenantField]);

  return [storedValue, setStoredValue];
};