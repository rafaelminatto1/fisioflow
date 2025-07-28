import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { pdfService } from '../../services/pdfService';
import { qrCodeService } from '../../services/qrCodeService';
import { Exercise, Prescription, Patient, UserRole } from '../../types';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';

interface QRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'exercise' | 'prescription' | 'patient_portal' | 'program';
  exercise?: Exercise;
  prescription?: Prescription;
  patient?: Patient;
}

const QRGeneratorModal: React.FC<QRGeneratorModalProps> = ({
  isOpen,
  onClose,
  type,
  exercise,
  prescription,
  patient,
}) => {
  const { user } = useAuth();
  const { exercises, getExerciseVideos, getExerciseImages } = useData();

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [shareOptions, setShareOptions] = useState({
    whatsapp: true,
    email: true,
    print: true,
  });

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    } else {
      setQrCodeUrl('');
    }
  }, [isOpen, type, exercise, prescription, patient]);

  const generateQRCode = async () => {
    if (!user?.tenantId) return;

    setIsGenerating(true);

    try {
      let qrCode = '';

      switch (type) {
        case 'exercise':
          if (exercise) {
            qrCode = await qrCodeService.generateExerciseQR(
              exercise,
              user.tenantId
            );
          }
          break;

        case 'prescription':
          if (prescription && exercise) {
            qrCode = await qrCodeService.generatePrescriptionQR(
              prescription,
              exercise,
              user.tenantId
            );
          }
          break;

        case 'patient_portal':
          if (patient) {
            qrCode = await qrCodeService.generatePatientPortalQR(
              patient.id,
              user.tenantId
            );
          }
          break;

        case 'program':
          if (patient) {
            qrCode = await qrCodeService.generatePatientProgramQR(
              patient.id,
              user.tenantId
            );
          }
          break;
      }

      setQrCodeUrl(qrCode);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      alert('Erro ao gerar QR Code. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getTitle = (): string => {
    switch (type) {
      case 'exercise':
        return `QR Code - ${exercise?.name || 'Exercício'}`;
      case 'prescription':
        return `QR Code - Prescrição de ${exercise?.name || 'Exercício'}`;
      case 'patient_portal':
        return `QR Code - Portal do Paciente`;
      case 'program':
        return `QR Code - Programa do Paciente`;
      default:
        return 'QR Code';
    }
  };

  const getDescription = (): string => {
    switch (type) {
      case 'exercise':
        return 'O paciente pode escanear este QR Code para acessar diretamente o exercício e seus vídeos demonstrativos.';
      case 'prescription':
        return 'QR Code específico para esta prescrição. Inclui informações sobre séries, repetições e registra automaticamente a execução.';
      case 'patient_portal':
        return 'Acesso completo ao portal do paciente com todos os exercícios, histórico e funcionalidades.';
      case 'program':
        return 'Programa completo de exercícios do paciente com progresso e estatísticas.';
      default:
        return '';
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `qrcode-${type}-${Date.now()}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const handleShare = (platform: 'whatsapp' | 'email') => {
    if (!qrCodeUrl) return;

    const title = getTitle();
    const description = getDescription();

    switch (platform) {
      case 'whatsapp':
        const whatsappText = `${title}\n\n${description}\n\nEscaneie o QR Code para acessar!`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        window.open(whatsappUrl, '_blank');
        break;

      case 'email':
        const emailSubject = encodeURIComponent(title);
        const emailBody = encodeURIComponent(
          `${description}\n\nEscaneie o QR Code em anexo para acessar o conteúdo.`
        );
        const emailUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;
        window.open(emailUrl);
        break;
    }
  };

  const handlePrint = () => {
    if (!qrCodeUrl) return;

    const printWindow = window.open('', '', 'width=600,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${getTitle()}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            .qr-container {
              border: 2px solid #000;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .qr-image {
              max-width: 300px;
              height: auto;
            }
            .info {
              margin-top: 20px;
              font-size: 14px;
              line-height: 1.4;
            }
            .instructions {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin-top: 20px;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h2>${getTitle()}</h2>
          <div class="qr-container">
            <img src="${qrCodeUrl}" alt="QR Code" class="qr-image" />
          </div>
          <div class="info">
            <p><strong>Instrução:</strong> Escaneie o QR Code com a câmera do seu celular</p>
            <p>${getDescription()}</p>
          </div>
          <div class="instructions">
            <h4>Como usar:</h4>
            <ol style="text-align: left;">
              <li>Abra a câmera do seu celular</li>
              <li>Aponte para o QR Code</li>
              <li>Toque na notificação que aparecer</li>
              <li>Acesse o conteúdo diretamente</li>
            </ol>
          </div>
          <p style="font-size: 10px; color: #666; margin-top: 30px;">
            Gerado em ${new Date().toLocaleDateString('pt-BR')} - FisioFlow
          </p>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleGenerateQRPDF = async () => {
    if (!qrCodeUrl) return;

    setIsGeneratingPDF(true);

    try {
      const instructions = [
        'Abra a câmera do seu celular',
        'Aponte para o QR Code',
        'Toque na notificação que aparecer',
        'Acesse o conteúdo diretamente',
      ];

      const pdfBlob = await pdfService.generateQRCodePDF(
        qrCodeUrl,
        getTitle(),
        getDescription(),
        instructions
      );

      const filename = `qr-code-${type}-${Date.now()}.pdf`;
      await pdfService.savePDF(pdfBlob, filename);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateExercisePDF = async () => {
    if (!exercise || !qrCodeUrl) return;

    setIsGeneratingPDF(true);

    try {
      const videos = getExerciseVideos(exercise.id);
      const images = getExerciseImages(exercise.id);

      const exerciseData = {
        exercise,
        videos,
        images,
        qrCodeUrl,
        prescription,
        patient,
      };

      const pdfBlob = await pdfService.generateExercisePDF(exerciseData);

      const filename = `exercicio-${exercise.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
      await pdfService.savePDF(pdfBlob, filename);
    } catch (error) {
      console.error('Erro ao gerar PDF do exercício:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Only allow therapists and admins to generate QR codes
  if (user?.role !== UserRole.FISIOTERAPEUTA && user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="medium"
    >
      <div className="space-y-6">
        {/* Description */}
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">{getDescription()}</p>
        </div>

        {/* QR Code Display */}
        <div className="text-center">
          {isGenerating ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <p className="text-slate-600">Gerando QR Code...</p>
            </div>
          ) : qrCodeUrl ? (
            <div className="space-y-4">
              <div className="inline-block rounded-lg border-2 border-slate-200 bg-white p-4">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="mx-auto h-64 w-64"
                />
              </div>

              {/* Info */}
              <div className="text-sm text-slate-600">
                <p>📱 Escaneie com a câmera do celular</p>
                <p>🔗 Acesso direto ao conteúdo</p>
                <p>📈 Registro automático de uso</p>
              </div>
            </div>
          ) : (
            <div className="text-slate-500">
              <p>Erro ao gerar QR Code</p>
            </div>
          )}
        </div>

        {/* Share Options */}
        {qrCodeUrl && (
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">
              Compartilhar e Exportar
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                onClick={handleDownload}
                className="flex flex-col items-center space-y-2 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
              >
                <span className="text-2xl">💾</span>
                <span className="text-xs font-medium">Download PNG</span>
              </button>

              <button
                onClick={() => handleShare('whatsapp')}
                className="flex flex-col items-center space-y-2 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
              >
                <span className="text-2xl">💬</span>
                <span className="text-xs font-medium">WhatsApp</span>
              </button>

              <button
                onClick={() => handleShare('email')}
                className="flex flex-col items-center space-y-2 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
              >
                <span className="text-2xl">📧</span>
                <span className="text-xs font-medium">Email</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex flex-col items-center space-y-2 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
              >
                <span className="text-2xl">🖨️</span>
                <span className="text-xs font-medium">Imprimir</span>
              </button>

              <button
                onClick={handleGenerateQRPDF}
                disabled={isGeneratingPDF}
                className="flex flex-col items-center space-y-2 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <span className="text-2xl">📄</span>
                <span className="text-xs font-medium">
                  {isGeneratingPDF ? 'Gerando...' : 'PDF QR Only'}
                </span>
              </button>

              {type === 'exercise' && exercise && (
                <button
                  onClick={handleGenerateExercisePDF}
                  disabled={isGeneratingPDF}
                  className="flex flex-col items-center space-y-2 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="text-2xl">📋</span>
                  <span className="text-xs font-medium">
                    {isGeneratingPDF ? 'Gerando...' : 'PDF Completo'}
                  </span>
                </button>
              )}
            </div>

            {type === 'exercise' && exercise && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-slate-600">
                <p className="mb-1 font-medium">💡 Opções de PDF:</p>
                <p>
                  • <strong>PDF QR Only:</strong> Apenas o QR Code otimizado
                  para impressão
                </p>
                <p>
                  • <strong>PDF Completo:</strong> Exercício com descrição,
                  vídeos, imagens e QR Code
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {qrCodeUrl && (
            <>
              <Button
                variant="secondary"
                onClick={handleGenerateQRPDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? 'Gerando PDF...' : 'PDF QR Code'}
              </Button>
              <Button onClick={handleDownload}>Download PNG</Button>
            </>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default QRGeneratorModal;
