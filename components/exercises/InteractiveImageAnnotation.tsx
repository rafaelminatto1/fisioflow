import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ExerciseImage, ImageAnnotation, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface InteractiveImageAnnotationProps {
  image: ExerciseImage;
  onUpdateAnnotations?: (annotations: ImageAnnotation[]) => void;
  readOnly?: boolean;
  className?: string;
}

interface AnnotationPoint {
  x: number;
  y: number;
  annotation: ImageAnnotation;
}

const InteractiveImageAnnotation: React.FC<InteractiveImageAnnotationProps> = ({
  image,
  onUpdateAnnotations,
  readOnly = false,
  className = "",
}) => {
  const { user } = useAuth();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>(image.annotationPoints || []);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [newAnnotationData, setNewAnnotationData] = useState({
    x: 0,
    y: 0,
    title: '',
    description: '',
    color: '#ef4444'
  });

  // Only allow therapists and admins to edit annotations
  const canEdit = !readOnly && (user?.role === UserRole.FISIOTERAPEUTA || user?.role === UserRole.ADMIN);

  useEffect(() => {
    setAnnotations(image.annotationPoints || []);
  }, [image.annotationPoints]);

  const getImageCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!imageRef.current || !containerRef.current) return { x: 0, y: 0 };
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    return { 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    };
  }, []);

  const handleImageClick = useCallback((event: React.MouseEvent<HTMLImageElement>) => {
    if (!canEdit || !isCreatingAnnotation) return;

    const { x, y } = getImageCoordinates(event.clientX, event.clientY);
    
    setNewAnnotationData(prev => ({ ...prev, x, y }));
    setShowAnnotationForm(true);
    setIsCreatingAnnotation(false);
  }, [canEdit, isCreatingAnnotation, getImageCoordinates]);

  const handleCreateAnnotation = () => {
    if (!newAnnotationData.title.trim()) return;

    const newAnnotation: ImageAnnotation = {
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: newAnnotationData.x,
      y: newAnnotationData.y,
      title: newAnnotationData.title.trim(),
      description: newAnnotationData.description.trim(),
      color: newAnnotationData.color,
    };

    const updatedAnnotations = [...annotations, newAnnotation];
    setAnnotations(updatedAnnotations);
    
    if (onUpdateAnnotations) {
      onUpdateAnnotations(updatedAnnotations);
    }

    // Reset form
    setShowAnnotationForm(false);
    setNewAnnotationData({
      x: 0,
      y: 0,
      title: '',
      description: '',
      color: '#ef4444'
    });
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    if (!canEdit) return;

    const updatedAnnotations = annotations.filter(ann => ann.id !== annotationId);
    setAnnotations(updatedAnnotations);
    
    if (onUpdateAnnotations) {
      onUpdateAnnotations(updatedAnnotations);
    }

    setSelectedAnnotation(null);
  };

  const handleUpdateAnnotation = (annotationId: string, updates: Partial<ImageAnnotation>) => {
    if (!canEdit) return;

    const updatedAnnotations = annotations.map(ann => 
      ann.id === annotationId ? { ...ann, ...updates } : ann
    );
    setAnnotations(updatedAnnotations);
    
    if (onUpdateAnnotations) {
      onUpdateAnnotations(updatedAnnotations);
    }
  };

  const getAnnotationColors = () => [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
  ];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Image */}
      <img
        ref={imageRef}
        src={image.imageUrl}
        alt={image.title}
        className={`w-full h-auto rounded-lg ${
          isCreatingAnnotation ? 'cursor-crosshair' : 'cursor-default'
        }`}
        onClick={handleImageClick}
        draggable={false}
      />

      {/* Annotation Points */}
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="absolute group"
          style={{
            left: `${annotation.x}%`,
            top: `${annotation.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Annotation Marker */}
          <button
            onClick={() => setSelectedAnnotation(
              selectedAnnotation === annotation.id ? null : annotation.id
            )}
            className="relative w-6 h-6 rounded-full border-2 border-white shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            style={{ backgroundColor: annotation.color || '#ef4444' }}
          >
            <div className="absolute inset-0 rounded-full animate-ping opacity-30"
                 style={{ backgroundColor: annotation.color || '#ef4444' }} />
          </button>

          {/* Annotation Tooltip */}
          <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-10 transition-opacity duration-200 ${
            selectedAnnotation === annotation.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none'
          }`}>
            <div className="font-medium">{annotation.title}</div>
            {annotation.description && (
              <div className="text-xs text-slate-300 mt-1">{annotation.description}</div>
            )}
            
            {/* Delete button for editors */}
            {canEdit && selectedAnnotation === annotation.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteAnnotation(annotation.id);
                }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
                title="Remover anotação"
              >
                ×
              </button>
            )}

            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
          </div>
        </div>
      ))}

      {/* Controls for editors */}
      {canEdit && (
        <div className="absolute top-2 right-2 flex space-x-2">
          <button
            onClick={() => setIsCreatingAnnotation(!isCreatingAnnotation)}
            className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
              isCreatingAnnotation
                ? 'bg-blue-500 text-white'
                : 'bg-white/80 text-slate-700 hover:bg-white'
            }`}
            title={isCreatingAnnotation ? 'Cancelar adição' : 'Adicionar marcação'}
          >
            {isCreatingAnnotation ? '✕ Cancelar' : '+ Marcar'}
          </button>
        </div>
      )}

      {/* Annotation Form Modal */}
      {showAnnotationForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Nova Marcação Anatômica
            </h3>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Título da Marcação *
                </label>
                <input
                  type="text"
                  value={newAnnotationData.title}
                  onChange={(e) => setNewAnnotationData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Músculo Bíceps"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={newAnnotationData.description}
                  onChange={(e) => setNewAnnotationData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição adicional sobre esta marcação..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cor da Marcação
                </label>
                <div className="flex space-x-2">
                  {getAnnotationColors().map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewAnnotationData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newAnnotationData.color === color
                          ? 'border-slate-900 scale-110'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Position Info */}
              <div className="bg-slate-50 rounded-md p-3">
                <div className="text-sm text-slate-600">
                  <strong>Posição:</strong> {newAnnotationData.x.toFixed(1)}% × {newAnnotationData.y.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAnnotationForm(false);
                  setNewAnnotationData({ x: 0, y: 0, title: '', description: '', color: '#ef4444' });
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAnnotation}
                disabled={!newAnnotationData.title.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Criar Marcação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions for creation mode */}
      {isCreatingAnnotation && (
        <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-3 py-2 rounded-md text-sm">
          👆 Clique na imagem para adicionar uma marcação
        </div>
      )}

      {/* Annotation count */}
      {annotations.length > 0 && (
        <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white px-2 py-1 rounded text-xs">
          {annotations.length} marcaç{annotations.length === 1 ? 'ão' : 'ões'}
        </div>
      )}
    </div>
  );
};

export default InteractiveImageAnnotation;