import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { bundleAnalyzer, useBundleAnalysis } from '../bundleAnalysis';
import { renderHook } from '@testing-library/react';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => 1000),
  getEntriesByType: vi.fn(() => []),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}));

Object.defineProperty(global, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Bundle Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(1000);
  });

  afterEach(() => {
    // Reset bundleAnalyzer state
    // Note: In a real implementation, we might need a reset method
  });

  describe('bundleAnalyzer', () => {
    it('deve registrar carregamento de chunk', () => {
      bundleAnalyzer.registerChunkLoad('test-chunk', 100000, 'high');

      const report = bundleAnalyzer.generateReport();
      
      expect(report.chunks).toHaveLength(1);
      expect(report.chunks[0]).toMatchObject({
        name: 'test-chunk',
        size: 100000,
        priority: 'high',
        isLoaded: true,
      });
    });

    it('deve calcular métricas de bundle corretamente', () => {
      bundleAnalyzer.registerChunkLoad('critical-chunk', 200000, 'critical');
      bundleAnalyzer.registerChunkLoad('low-chunk', 100000, 'low');

      const report = bundleAnalyzer.generateReport();

      expect(report.totalSize).toBe(300000);
      expect(report.initialSize).toBe(200000); // Only critical chunks
      expect(report.chunks).toHaveLength(2);
    });

    it('deve identificar otimizações necessárias', () => {
      // Simular bundle inicial muito grande
      bundleAnalyzer.registerChunkLoad('large-critical', 600000, 'critical');
      
      const optimizations = bundleAnalyzer.analyzeOptimizations();

      expect(optimizations).toContain(
        expect.stringMatching(/Bundle inicial muito grande/)
      );
    });

    it('deve identificar chunks de baixa prioridade carregados cedo', () => {
      mockPerformance.now.mockReturnValue(1500); // 1.5s

      bundleAnalyzer.registerChunkLoad('early-low', 100000, 'low');
      
      const optimizations = bundleAnalyzer.analyzeOptimizations();

      expect(optimizations).toContain(
        expect.stringMatching(/baixa prioridade carregados muito cedo/)
      );
    });

    it('deve identificar chunks muito grandes', () => {
      bundleAnalyzer.registerChunkLoad('huge-chunk', 250000, 'medium');
      
      const optimizations = bundleAnalyzer.analyzeOptimizations();

      expect(optimizations).toContain(
        expect.stringMatching(/muito grandes/)
      );
    });

    it('deve iniciar monitoramento de performance', () => {
      bundleAnalyzer.startPerformanceMonitoring();

      expect(mockPerformanceObserver).toHaveBeenCalled();
    });
  });

  describe('useBundleAnalysis hook', () => {
    it('deve retornar funções de análise', () => {
      const { result } = renderHook(() => useBundleAnalysis());

      expect(result.current.startMonitoring).toBeDefined();
      expect(result.current.getReport).toBeDefined();
      expect(result.current.getOptimizations).toBeDefined();
      expect(result.current.registerChunk).toBeDefined();
    });

    it('deve gerar relatório quando chamado', () => {
      const { result } = renderHook(() => useBundleAnalysis());

      const report = result.current.getReport();

      expect(report).toHaveProperty('totalSize');
      expect(report).toHaveProperty('initialSize');
      expect(report).toHaveProperty('chunks');
      expect(report).toHaveProperty('loadingTime');
      expect(report).toHaveProperty('cacheHitRate');
    });

    it('deve retornar otimizações quando chamado', () => {
      const { result } = renderHook(() => useBundleAnalysis());

      const optimizations = result.current.getOptimizations();

      expect(Array.isArray(optimizations)).toBe(true);
    });

    it('deve registrar chunk corretamente', () => {
      const { result } = renderHook(() => useBundleAnalysis());

      result.current.registerChunk('test-chunk-hook', 50000, 'medium');

      const report = result.current.getReport();
      const testChunk = report.chunks.find(chunk => chunk.name === 'test-chunk-hook');

      expect(testChunk).toBeDefined();
      expect(testChunk?.size).toBe(50000);
      expect(testChunk?.priority).toBe('medium');
    });
  });

  describe('Performance Metrics', () => {
    it('deve calcular tempo de carregamento corretamente', () => {
      const startTime = 1000;
      const endTime = 1500;
      
      mockPerformance.now.mockReturnValueOnce(startTime);
      mockPerformance.now.mockReturnValueOnce(endTime);

      bundleAnalyzer.registerChunkLoad('timing-test', 100000, 'high');

      const report = bundleAnalyzer.generateReport();
      const chunk = report.chunks.find(c => c.name === 'timing-test');

      expect(chunk?.loadTime).toBe(500);
    });

    it('deve calcular cache hit rate', () => {
      const report = bundleAnalyzer.generateReport();

      expect(typeof report.cacheHitRate).toBe('number');
      expect(report.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(report.cacheHitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Environment Handling', () => {
    it('deve funcionar sem PerformanceObserver', () => {
      const originalPO = global.PerformanceObserver;
      delete (global as any).PerformanceObserver;

      expect(() => {
        bundleAnalyzer.startPerformanceMonitoring();
      }).not.toThrow();

      global.PerformanceObserver = originalPO;
    });

    it('deve armazenar métricas no localStorage', () => {
      bundleAnalyzer.registerChunkLoad('storage-test', 100000, 'medium');

      // O localStorage deve ser chamado para armazenar métricas
      // Em uma implementação real, verificaríamos se setItem foi chamado
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'bundle-metrics',
        expect.any(String)
      );
    });
  });
});