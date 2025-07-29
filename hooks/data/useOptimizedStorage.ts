import { useState, useEffect } from 'react';
import { dataOptimizer } from '../../services/dataOptimizer';

/**
 * Hook otimizado para armazenamento com índices e compressão
 */
export const useOptimizedStorage = <T>(
  key: string,
  initialValue: T,
  searchFields: string[] = [],
  tenantField?: string
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const data = dataOptimizer.loadOptimized<T>(key);
      return Array.isArray(data) && data.length > 0 ? data : initialValue;
    } catch (error) {
      // Silent error handling for production
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (Array.isArray(storedValue)) {
        dataOptimizer.saveOptimized(
          key,
          storedValue,
          searchFields,
          tenantField
        );
      } else {
        // Fallback para dados não-array
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      // Silent error handling for production
    }
  }, [key, storedValue, searchFields, tenantField]);

  return [storedValue, setStoredValue];
};

/**
 * Hook simples para localStorage
 */
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: React.SetStateAction<T>) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // Silent error handling
    }
  };

  return [storedValue, setValue];
};