import React, { useState, useMemo } from 'react';
import { UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { qrCodeService } from '../../services/qrCodeService';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';

interface QRAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QRAnalyticsModal: React.FC<QRAnalyticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);

  const stats = useMemo(() => {
    if (!user?.tenantId) return null;
    return qrCodeService.getUsageStats(user.tenantId, selectedPeriod);
  }, [user?.tenantId, selectedPeriod]);

  const analytics = useMemo(() => {
    if (!user?.tenantId) return [];
    return qrCodeService
      .getAnalytics(user.tenantId)
      .sort(
        (a, b) =>
          new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime()
      )
      .slice(0, 50); // Últimos 50 acessos
  }, [user?.tenantId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      default:
        return '📱';
    }
  };

  const getDeviceLabel = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return 'Mobile';
      case 'tablet':
        return 'Tablet';
      case 'desktop':
        return 'Desktop';
      default:
        return 'Desconhecido';
    }
  };

  // Only allow therapists and admins to view analytics
  if (user?.role !== UserRole.FISIOTERAPEUTA && user?.role !== UserRole.ADMIN) {
    return null;
  }

  if (!stats) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Analytics de QR Code">
        <div className="py-8 text-center">
          <p className="text-slate-500">Carregando estatísticas...</p>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Analytics de QR Code"
      size="large"
    >
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-700">Período:</span>
          <div className="flex space-x-2">
            {[7, 30, 90].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as 7 | 30 | 90)}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {period} dias
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">
              {stats.totalAccesses}
            </div>
            <div className="text-sm text-blue-600">Total de Acessos</div>
          </div>

          <div className="rounded-lg bg-green-50 p-4 text-center">
            <div className="text-2xl font-bold text-green-700">
              {stats.uniqueQRCodes}
            </div>
            <div className="text-sm text-green-600">QR Codes Únicos</div>
          </div>

          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {stats.successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-purple-600">Taxa de Sucesso</div>
          </div>

          <div className="rounded-lg bg-orange-50 p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">
              {Math.round(stats.totalAccesses / selectedPeriod)}
            </div>
            <div className="text-sm text-orange-600">Média Diária</div>
          </div>
        </div>

        {/* Device Breakdown */}
        <div>
          <h4 className="mb-3 font-semibold text-slate-900">
            Dispositivos Utilizados
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.deviceBreakdown).map(([device, count]) => {
              const percentage =
                stats.totalAccesses > 0
                  ? ((count / stats.totalAccesses) * 100).toFixed(1)
                  : '0';

              return (
                <div key={device} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getDeviceIcon(device)}</span>
                    <span className="min-w-[70px] text-sm font-medium text-slate-700">
                      {getDeviceLabel(device)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="h-3 flex-1 rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="ml-3 text-sm font-medium text-slate-600">
                        {count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Access Chart */}
        {/*{Object.keys(stats.dailyAccesses).length > 0 && (
          <div>
            <h4 className="mb-3 font-semibold text-slate-900">Acessos por Dia</h4>
            <div className="h-64 bg-slate-50 rounded-lg flex items-end justify-center p-4">
              <p className="text-slate-500">Gráfico de acessos diários (TODO: implementar gráfico)</p>
            </div>
          </div>
        )}*/}

        {/* Recent Access Log */}
        <div>
          <h4 className="mb-3 font-semibold text-slate-900">
            Acessos Recentes
          </h4>
          <div className="max-h-64 overflow-y-auto">
            {analytics.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p>Nenhum acesso registrado ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analytics.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {getDeviceIcon(access.deviceType)}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          QR ID: {access.qrCodeId.substring(0, 12)}...
                        </div>
                        <div className="text-xs text-slate-500">
                          {getDeviceLabel(access.deviceType)} •{' '}
                          {formatDate(access.accessedAt)}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        access.success
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {access.success ? '✓ Sucesso' : '✗ Falha'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Export Options */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              💡 Os dados são atualizados em tempo real conforme os pacientes
              acessam os QR Codes
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const data = { stats, analytics };
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `qr-analytics-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
              >
                📥 Exportar JSON
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default QRAnalyticsModal;
