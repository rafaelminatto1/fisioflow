import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { LazyWrapper } from '../../ui/LazyWrapper';

// Mock ErrorBoundary
vi.mock('../../ErrorBoundary', () => ({
  ErrorBoundary: ({ children, fallback }: any) => {
    try {
      return children;
    } catch (error) {
      return fallback;
    }
  },
}));

// Componente de teste que simula carregamento
const MockLazyComponent = () => <div>Componente carregado</div>;

// Componente que simula erro
const ErrorComponent = () => {
  throw new Error('Erro de teste');
};

describe('LazyWrapper', () => {
  it('deve renderizar children quando carregado com sucesso', async () => {
    render(
      <LazyWrapper name="test-component">
        <MockLazyComponent />
      </LazyWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Componente carregado')).toBeInTheDocument();
    });
  });

  it('deve mostrar loader padrão durante carregamento', () => {
    const LazyTestComponent = React.lazy(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ default: MockLazyComponent }), 100)
      )
    );

    render(
      <LazyWrapper name="loading-test">
        <LazyTestComponent />
      </LazyWrapper>
    );

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('deve mostrar fallback customizado quando fornecido', () => {
    const customFallback = <div>Loading customizado...</div>;
    
    const LazyTestComponent = React.lazy(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ default: MockLazyComponent }), 100)
      )
    );

    render(
      <LazyWrapper name="custom-fallback" fallback={customFallback}>
        <LazyTestComponent />
      </LazyWrapper>
    );

    expect(screen.getByText('Loading customizado...')).toBeInTheDocument();
  });

  it('deve mostrar error fallback padrão em caso de erro', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LazyWrapper name="error-test">
        <ErrorComponent />
      </LazyWrapper>
    );

    expect(screen.getByText('Erro ao carregar error-test')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('deve mostrar error fallback customizado quando fornecido', () => {
    const customErrorFallback = <div>Erro customizado!</div>;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LazyWrapper name="custom-error" errorFallback={customErrorFallback}>
        <ErrorComponent />
      </LazyWrapper>
    );

    expect(screen.getByText('Erro customizado!')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('deve usar nome padrão quando não fornecido', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LazyWrapper>
        <ErrorComponent />
      </LazyWrapper>
    );

    expect(screen.getByText('Erro ao carregar componente')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('deve ter displayName correto', () => {
    expect(LazyWrapper.displayName).toBe('LazyWrapper');
  });
});