/**
 * Componente de Análise de Bundle para Desenvolvimento
 * Mostra métricas de performance e code splitting em tempo real
 */

import React, { useState, useEffect } from 'react';
import { useBundleAnalysis } from '../../utils/bundleAnalysis';

interface AnalyzerProps {
  show?: boolean;
}

export const BundleAnalyzer: React.FC<AnalyzerProps> = ({ show = false }) => {
  const { getReport, getOptimizations, startMonitoring } = useBundleAnalysis();
  const [report, setReport] = useState<any>(null);
  const [optimizations, setOptimizations] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    startMonitoring();
    
    const updateReport = () => {
      setReport(getReport());
      setOptimizations(getOptimizations());
    };

    updateReport();
    const interval = setInterval(updateReport, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, [getReport, getOptimizations, startMonitoring]);

  // Só mostrar em desenvolvimento
  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null;
  }

  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    return kb > 1000 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'text-red-600 bg-red-50',
      high: 'text-yellow-600 bg-yellow-50',
      medium: 'text-green-600 bg-green-50',
      low: 'text-blue-600 bg-blue-50',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
      >
        📊 Bundle Analysis
      </button>

      {/* Analysis Panel */}
      {isVisible && report && (
        <div className="bg-white border shadow-lg rounded-lg p-4 max-w-md max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">Bundle Analysis</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Summary */}
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Size:</span>
              <span className="font-mono">{formatSize(report.totalSize)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Initial Size:</span>
              <span className="font-mono">{formatSize(report.initialSize)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Load Time:</span>
              <span className="font-mono">{report.loadingTime.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Cache Hit Rate:</span>
              <span className="font-mono">{(report.cacheHitRate * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Chunks */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Chunks Loaded</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {report.chunks.map((chunk: any, index: number) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs ${getPriorityColor(chunk.priority)}`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{chunk.name}</span>
                    <span>{formatSize(chunk.size)}</span>
                  </div>
                  <div className="text-xs opacity-75">
                    {chunk.priority} • {chunk.loadTime.toFixed(2)}ms
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimizations */}
          {optimizations.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Optimization Suggestions</h4>
              <div className="space-y-1">
                {optimizations.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-2 bg-orange-50 text-orange-700 rounded text-xs"
                  >
                    💡 {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BundleAnalyzer;