import React, { Suspense, memo } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  name?: string;
}

/**
 * Wrapper otimizado para componentes lazy com error boundary
 */
const DefaultLoader = memo(() => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-sm text-gray-600">Carregando...</span>
  </div>
));

const DefaultErrorFallback = memo(({ name }: { name?: string }) => (
  <div className="flex items-center justify-center min-h-[200px] text-red-600">
    <span>Erro ao carregar {name || 'componente'}</span>
  </div>
));

export const LazyWrapper = memo<LazyWrapperProps>(({ 
  children, 
  fallback, 
  errorFallback, 
  name 
}) => {
  return (
    <ErrorBoundary
      fallback={errorFallback || <DefaultErrorFallback name={name} />}
    >
      <Suspense fallback={fallback || <DefaultLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
});

LazyWrapper.displayName = 'LazyWrapper';