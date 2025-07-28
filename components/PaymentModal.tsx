import React, { useState } from 'react';

import { useNotification } from '../hooks/useNotification';
import { PaymentModalProps } from '../types';

import {
  IconX,
  IconQrCode,
  IconCopy,
  IconCheckCircle,
  IconCreditCard,
} from './icons/IconComponents';

const formatCurrency = (value: number) =>
  `R$ ${value.toFixed(2).replace('.', ',')}`;

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onConfirmPayment,
}) => {
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'pix' | 'card'>('pix');
  const [isPaying, setIsPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !transaction) return null;

  const pixCode =
    '00020126330014br.gov.bcb.pix01111234567890102125204000053039865802BR5913FisioFlow6009SAO PAULO62070503***6304E7DF';

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    addNotification({
      type: 'success',
      title: 'Código Copiado!',
      message: 'O código PIX foi copiado para sua área de transferência.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayment = () => {
    setIsPaying(true);
    // Simulate payment processing
    setTimeout(() => {
      onConfirmPayment(transaction);
      addNotification({
        type: 'success',
        title: 'Pagamento Confirmado!',
        message: 'Seu pagamento foi processado com sucesso.',
      });
      setIsPaying(false);
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-md flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Efetuar Pagamento
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>
        <main className="space-y-4 p-6">
          <div className="text-center">
            <p className="text-sm text-slate-400">Você está pagando</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(transaction.amount)}
            </p>
            <p className="text-slate-300">{transaction.description}</p>
          </div>

          <div className="border-b border-slate-700">
            <nav className="-mb-px flex space-x-2">
              <button
                onClick={() => setActiveTab('pix')}
                className={`flex items-center gap-2 rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'pix' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                <IconQrCode size={16} /> PIX
              </button>
              <button
                onClick={() => setActiveTab('card')}
                className={`flex items-center gap-2 rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'card' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                <IconCreditCard size={16} /> Cartão de Crédito
              </button>
            </nav>
          </div>

          {activeTab === 'pix' && (
            <div className="animate-fade-in space-y-4 text-center">
              <div className="mx-auto inline-block rounded-lg border-4 border-slate-600 bg-white p-2">
                <IconQrCode size={180} className="text-black" />
              </div>
              <p className="text-sm text-slate-300">
                Use o app do seu banco para ler o QR Code ou copie o código
                abaixo.
              </p>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={pixCode}
                  className="w-full truncate rounded-lg border border-slate-600 bg-slate-900 p-3 pr-12 text-xs text-slate-400"
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-slate-700 p-2 text-slate-300 hover:bg-slate-600 hover:text-white"
                >
                  {copied ? (
                    <IconCheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <IconCopy size={16} />
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'card' && (
            <div className="animate-fade-in space-y-4 rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
              <p className="text-slate-400">
                A opção de pagamento com cartão de crédito é apenas
                demonstrativa e está desabilitada.
              </p>
            </div>
          )}
        </main>
        <footer className="border-t border-slate-700 bg-slate-800 p-4">
          <button
            onClick={handlePayment}
            disabled={isPaying}
            className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-800"
          >
            {isPaying ? (
              <>
                <svg
                  className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processando...
              </>
            ) : (
              `Confirmar Pagamento de ${formatCurrency(transaction.amount)}`
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PaymentModal;
