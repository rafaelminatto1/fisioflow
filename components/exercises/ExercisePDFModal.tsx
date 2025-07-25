import React, { useState } from 'react';
import { Exercise, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData.minimal';
import { pdfService } from '../../services/pdfService';
import { qrCodeService } from '../../services/qrCodeService';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';

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
      const videos = selectedOptions.videos
        ? getExerciseVideos(exercise.id)
        : [];
      const images = selectedOptions.images
        ? getExerciseImages(exercise.id)
        : [];

      let qrCodeUrl = '';
      if (includeQR) {
        qrCodeUrl = await qrCodeService.generateExerciseQR(
          exercise,
          user.tenantId
        );
      }

      const exerciseData = {
        exercise: {
          ...exercise,
          description: selectedOptions.description
            ? exercise.description
            : 'Descrição não incluída',
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
      const videos = selectedOptions.videos
        ? getExerciseVideos(exercise.id)
        : [];
      const images = selectedOptions.images
        ? getExerciseImages(exercise.id)
        : [];

      let qrCodeUrl = '';
      if (includeQR) {
        qrCodeUrl = await qrCodeService.generateExerciseQR(
          exercise,
          user.tenantId
        );
      }

      const exerciseData = {
        exercise: {
          ...exercise,
          description: selectedOptions.description
            ? exercise.description
            : 'Descrição não incluída',
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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`PDF - ${exercise.name}`}
      size="medium"
    >
      <div className="space-y-6">
        {/* Exercise Preview */}
        <div className="rounded-lg bg-slate-50 p-4">
          <h4 className="mb-2 font-semibold text-slate-900">{exercise.name}</h4>
          <div className="mb-3 flex gap-2">
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
              {exercise.category}
            </span>
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
              {exercise.bodyPart}
            </span>
          </div>
          <p className="line-clamp-3 text-sm text-slate-600">
            {exercise.description}
          </p>

          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span>🎥 {videoCount} vídeos</span>
            <span>📷 {imageCount} imagens</span>
          </div>
        </div>

        {/* Content Selection */}
        <div>
          <h4 className="mb-3 font-semibold text-slate-900">
            Conteúdo a incluir no PDF
          </h4>
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedOptions.description}
                onChange={(e) =>
                  setSelectedOptions((prev) => ({
                    ...prev,
                    description: e.target.checked,
                  }))
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Descrição do exercício</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedOptions.videos}
                onChange={(e) =>
                  setSelectedOptions((prev) => ({
                    ...prev,
                    videos: e.target.checked,
                  }))
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                disabled={videoCount === 0}
              />
              <span
                className={`text-sm ${videoCount === 0 ? 'text-slate-400' : ''}`}
              >
                Lista de vídeos ({videoCount})
              </span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedOptions.images}
                onChange={(e) =>
                  setSelectedOptions((prev) => ({
                    ...prev,
                    images: e.target.checked,
                  }))
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                disabled={imageCount === 0}
              />
              <span
                className={`text-sm ${imageCount === 0 ? 'text-slate-400' : ''}`}
              >
                Resumo de imagens ({imageCount})
              </span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedOptions.instructions}
                onChange={(e) =>
                  setSelectedOptions((prev) => ({
                    ...prev,
                    instructions: e.target.checked,
                  }))
                }
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
        <div className="rounded-lg bg-blue-50 p-4">
          <h5 className="mb-2 font-medium text-blue-900">
            📋 O que será incluído:
          </h5>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Informações básicas do exercício</li>
            {selectedOptions.description && <li>• Descrição detalhada</li>}
            {selectedOptions.videos && videoCount > 0 && (
              <li>• Lista com {videoCount} vídeo(s) demonstrativo(s)</li>
            )}
            {selectedOptions.images && imageCount > 0 && (
              <li>• Resumo de {imageCount} imagem(ns) explicativa(s)</li>
            )}
            {selectedOptions.instructions && (
              <li>• Instruções de segurança e execução</li>
            )}
            {includeQR && <li>• QR Code para acesso via celular</li>}
            <li>• Header e footer profissionais</li>
          </ul>
        </div>

        {/* Warning */}
        {!selectedOptions.description &&
          !selectedOptions.videos &&
          !selectedOptions.images && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-sm text-orange-800">
                ⚠️ Selecione pelo menos uma opção de conteúdo para gerar um PDF
                útil.
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
            disabled={
              isGenerating ||
              (!selectedOptions.description &&
                !selectedOptions.videos &&
                !selectedOptions.images)
            }
          >
            {isGenerating ? 'Gerando PDF...' : 'Baixar PDF'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ExercisePDFModal;
