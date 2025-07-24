import React, { useState } from 'react';
import { Exercise, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData.minimal';
import { pdfService } from '../../services/pdfService';
import { qrCodeService } from '../../services/qrCodeService';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';

interface ExercisePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise;
}

const ExercisePDFModal: React.FC<ExercisePDFModalProps> = ({
  isOpen,
  onClose,
  exercise,
}) => {
  const { user } = useAuth();
  const { getExerciseVideos, getExerciseImages } = useData();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeQR, setIncludeQR] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState({
    description: true,
    videos: true,
    images: true,
    instructions: true,
  });

  // Only allow therapists and admins to generate PDFs
  if (user?.role !== UserRole.FISIOTERAPEUTA && user?.role !== UserRole.ADMIN) {
    return null;
  }

  const handleGeneratePDF = async () => {
    if (!user?.tenantId) return;
    
    setIsGenerating(true);
    
    try {
      const videos = selectedOptions.videos ? getExerciseVideos(exercise.id) : [];
      const images = selectedOptions.images ? getExerciseImages(exercise.id) : [];
      
      let qrCodeUrl = '';
      if (includeQR) {
        qrCodeUrl = await qrCodeService.generateExerciseQR(exercise, user.tenantId);
      }
      
      const exerciseData = {
        exercise: {
          ...exercise,
          description: selectedOptions.description ? exercise.description : 'Descrição não incluída'
        },
        videos,
        images,
        qrCodeUrl,
      };
      
      const pdfBlob = await pdfService.generateExercisePDF(exerciseData);
      
      const filename = `exercicio-${exercise.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
      await pdfService.savePDF(pdfBlob, filename);
      
      onClose();
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!user?.tenantId) return;
    
    setIsGenerating(true);
    
    try {
      const videos = selectedOptions.videos ? getExerciseVideos(exercise.id) : [];
      const images = selectedOptions.images ? getExerciseImages(exercise.id) : [];
      
      let qrCodeUrl = '';
      if (includeQR) {
        qrCodeUrl = await qrCodeService.generateExerciseQR(exercise, user.tenantId);
      }
      
      const exerciseData = {
        exercise: {
          ...exercise,
          description: selectedOptions.description ? exercise.description : 'Descrição não incluída'
        },
        videos,
        images,
        qrCodeUrl,
      };
      
      const pdfBlob = await pdfService.generateExercisePDF(exerciseData);
      await pdfService.openPDF(pdfBlob);
      
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      alert('Erro ao gerar preview. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const videoCount = getExerciseVideos(exercise.id).length;
  const imageCount = getExerciseImages(exercise.id).length;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={`PDF - ${exercise.name}`} size="medium">
      <div className="space-y-6">
        {/* Exercise Preview */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-semibold text-slate-900 mb-2">{exercise.name}</h4>
          <div className="flex gap-2 mb-3">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {exercise.category}
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              {exercise.bodyPart}
            </span>
          </div>
          <p className="text-sm text-slate-600 line-clamp-3">{exercise.description}</p>
          
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span>🎥 {videoCount} vídeos</span>
            <span>📷 {imageCount} imagens</span>
          </div>
        </div>

        {/* Content Selection */}
        <div>
          <h4 className="font-semibold text-slate-900 mb-3">Conteúdo a incluir no PDF</h4>
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedOptions.description}
                onChange={(e) => setSelectedOptions(prev => ({ ...prev, description: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Descrição do exercício</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedOptions.videos}
                onChange={(e) => setSelectedOptions(prev => ({ ...prev, videos: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                disabled={videoCount === 0}
              />
              <span className={`text-sm ${videoCount === 0 ? 'text-slate-400' : ''}`}>
                Lista de vídeos ({videoCount})
              </span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedOptions.images}
                onChange={(e) => setSelectedOptions(prev => ({ ...prev, images: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                disabled={imageCount === 0}
              />
              <span className={`text-sm ${imageCount === 0 ? 'text-slate-400' : ''}`}>
                Resumo de imagens ({imageCount})
              </span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedOptions.instructions}
                onChange={(e) => setSelectedOptions(prev => ({ ...prev, instructions: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Instruções gerais</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={includeQR}
                onChange={(e) => setIncludeQR(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">QR Code para acesso mobile</span>
            </label>
          </div>
        </div>

        {/* Options Info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h5 className="font-medium text-blue-900 mb-2">📋 O que será incluído:</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Informações básicas do exercício</li>
            {selectedOptions.description && <li>• Descrição detalhada</li>}
            {selectedOptions.videos && videoCount > 0 && <li>• Lista com {videoCount} vídeo(s) demonstrativo(s)</li>}
            {selectedOptions.images && imageCount > 0 && <li>• Resumo de {imageCount} imagem(ns) explicativa(s)</li>}
            {selectedOptions.instructions && <li>• Instruções de segurança e execução</li>}
            {includeQR && <li>• QR Code para acesso via celular</li>}
            <li>• Header e footer profissionais</li>
          </ul>
        </div>

        {/* Warning */}
        {(!selectedOptions.description && !selectedOptions.videos && !selectedOptions.images) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800">
              ⚠️ Selecione pelo menos uma opção de conteúdo para gerar um PDF útil.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            variant="secondary" 
            onClick={handlePreviewPDF}
            disabled={isGenerating}
          >
            {isGenerating ? 'Gerando...' : 'Visualizar'}
          </Button>
          <Button 
            onClick={handleGeneratePDF}
            disabled={isGenerating || (!selectedOptions.description && !selectedOptions.videos && !selectedOptions.images)}
          >
            {isGenerating ? 'Gerando PDF...' : 'Baixar PDF'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ExercisePDFModal;