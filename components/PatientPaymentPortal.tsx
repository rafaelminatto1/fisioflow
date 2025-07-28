import { 
  CreditCard, 
  Smartphone, 
  FileText, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Download,
  Eye,
  QrCode,
  Banknote,
  Wallet,
  History,
  Settings,
  Lock,
  TrendingUp,
  Calculator
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useFinancialAutomation, PatientSubscription } from '../services/financialAutomationService';
import { usePayments, PaymentTransaction, PaymentInvoice } from '../services/paymentService';

interface PatientPaymentPortalProps {
  patientId: string;
  onClose?: () => void;
}

export const PatientPaymentPortal: React.FC<PatientPaymentPortalProps> = ({
  patientId,
  onClose
}) => {
  const {
    createPixPayment,
    createCardPayment,
    createBoletoPayment,
    createDigitalWalletPayment,
    getTransactions,
    getInvoices,
    getPaymentMethods
  } = usePayments();

  const {
    getPatientSubscriptions,
    applyEarlyPaymentDiscount
  } = useFinancialAutomation();

  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'invoices' | 'history' | 'subscription' | 'payment'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'boleto' | 'wallet'>('pix');
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  // Payment form data
  const [cardData, setCardData] = useState({
    number: '',
    holderName: '',
    expirationMonth: '',
    expirationYear: '',
    cvv: '',
    installments: 1
  });

  // Data states
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<PatientSubscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const tenantId = currentUser?.tenantId || 'default';

  useEffect(() => {
    loadPaymentData();
  }, [patientId, tenantId]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      const allInvoices = getInvoices(tenantId);
      const patientInvoices = allInvoices.filter(inv => inv.patientId === patientId);
      setInvoices(patientInvoices);

      const allTransactions = getTransactions(tenantId);
      const patientTransactions = allTransactions.filter(tx => tx.patientId === patientId);
      setTransactions(patientTransactions);

      const patientSubs = getPatientSubscriptions(tenantId).filter(sub => sub.patientId === patientId);
      setSubscriptions(patientSubs);

      const availablePaymentMethods = getPaymentMethods();
      setPaymentMethods(availablePaymentMethods);
      
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedInvoice) return;

    setLoading(true);
    try {
      let result;

      // Apply early payment discount if applicable
      const daysBeforeDue = Math.floor(
        (new Date(selectedInvoice.dueDate).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
      );

      let finalAmount = selectedInvoice.amount;
      let discountApplied = null;

      if (daysBeforeDue > 0) {
        discountApplied = await applyEarlyPaymentDiscount(
          selectedInvoice.amount,
          daysBeforeDue,
          'consultation',
          tenantId
        );

        if (discountApplied) {
          finalAmount = selectedInvoice.amount - discountApplied.discountAmount;
        }
      }

      switch (paymentMethod) {
        case 'pix':
          result = await createPixPayment(
            finalAmount,
            `Pagamento Fatura #${selectedInvoice.number}`,
            patientId,
            tenantId
          );
          break;

        case 'card':
          result = await createCardPayment(
            finalAmount,
            `Pagamento Fatura #${selectedInvoice.number}`,
            patientId,
            tenantId,
            {
              number: cardData.number.replace(/\s/g, ''),
              holderName: cardData.holderName,
              expirationMonth: parseInt(cardData.expirationMonth),
              expirationYear: parseInt(cardData.expirationYear),
              cvv: cardData.cvv
            },
            cardData.installments
          );
          break;

        case 'boleto':
          result = await createBoletoPayment(
            finalAmount,
            `Pagamento Fatura #${selectedInvoice.number}`,
            patientId,
            tenantId
          );
          break;

        case 'wallet':
          result = await createDigitalWalletPayment(
            finalAmount,
            `Pagamento Fatura #${selectedInvoice.number}`,
            patientId,
            tenantId,
            'picpay'
          );
          break;
      }

      if (result && result.id) {
        alert('Pagamento processado com sucesso!');
        setShowPaymentForm(false);
        setSelectedInvoice(null);
        await loadPaymentData();
      }

    } catch (error) {
      console.error('Payment error:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return CheckCircle;
      case 'pending': return Clock;
      case 'overdue': return AlertCircle;
      default: return FileText;
    }
  };

  const renderInvoicesTab = () => {
    const pendingInvoices = invoices.filter(inv => inv.status !== 'paid');
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
                </p>
                <p className="text-xs text-yellow-700">{pendingInvoices.length} faturas</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">Em Atraso</p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(
                    pendingInvoices
                      .filter(inv => new Date(inv.dueDate) < new Date())
                      .reduce((sum, inv) => sum + inv.amount, 0)
                  )}
                </p>
                <p className="text-xs text-red-700">
                  {pendingInvoices.filter(inv => new Date(inv.dueDate) < new Date()).length} faturas
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Pagas</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(paidInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
                </p>
                <p className="text-xs text-green-700">{paidInvoices.length} faturas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Invoices */}
        {pendingInvoices.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Faturas Pendentes</h3>
            <div className="space-y-3">
              {pendingInvoices.map((invoice) => {
                const StatusIcon = getStatusIcon(invoice.status);
                const isOverdue = new Date(invoice.dueDate) < new Date();
                
                return (
                  <div
                    key={invoice.id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                      isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <StatusIcon className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`} />
                        <div>
                          <h4 className="font-medium text-gray-900">Fatura #{invoice.number}</h4>
                          <p className="text-sm text-gray-600">{invoice.description}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              Vencimento: {formatDate(invoice.dueDate)}
                            </span>
                            {isOverdue && (
                              <span className="text-xs text-red-600 font-medium">
                                {Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (24 * 60 * 60 * 1000))} dias em atraso
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(invoice.amount)}
                        </p>
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPaymentForm(true);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pagar
                          </button>
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
                            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Paid Invoices */}
        {paidInvoices.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Faturas Pagas Recentes</h3>
            <div className="space-y-3">
              {paidInvoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">Fatura #{invoice.number}</h4>
                        <p className="text-sm text-gray-600">{invoice.description}</p>
                        <span className="text-sm text-green-600">
                          Pago em {formatDate(invoice.updatedAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </p>
                      <button
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center mt-1"
                        onClick={() => {/* Download receipt */}}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Comprovante
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPaymentForm = () => {
    if (!selectedInvoice) return null;

    // Calculate early payment discount
    const daysBeforeDue = Math.floor(
      (new Date(selectedInvoice.dueDate).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
    );

    const hasEarlyDiscount = daysBeforeDue > 5;
    const discountAmount = hasEarlyDiscount ? selectedInvoice.amount * 0.05 : 0;
    const finalAmount = selectedInvoice.amount - discountAmount;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Pagamento da Fatura #{selectedInvoice.number}
              </h3>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Invoice Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Original:</span>
                  <span className="font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                </div>
                {hasEarlyDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto Pagamento Antecipado (5%):</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total a Pagar:</span>
                    <span>{formatCurrency(finalAmount)}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Vencimento: {formatDate(selectedInvoice.dueDate)}
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 border rounded-lg flex items-center justify-center ${
                    paymentMethod === 'pix' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  PIX
                </button>
                
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 border rounded-lg flex items-center justify-center ${
                    paymentMethod === 'card' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Cartão
                </button>
                
                <button
                  onClick={() => setPaymentMethod('boleto')}
                  className={`p-3 border rounded-lg flex items-center justify-center ${
                    paymentMethod === 'boleto' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Banknote className="w-5 h-5 mr-2" />
                  Boleto
                </button>
                
                <button
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-3 border rounded-lg flex items-center justify-center ${
                    paymentMethod === 'wallet' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  PicPay
                </button>
              </div>
            </div>

            {/* Card Payment Form */}
            {paymentMethod === 'card' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Cartão
                  </label>
                  <input
                    type="text"
                    value={cardData.number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
                      setCardData({ ...cardData, number: value });
                    }}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome no Cartão
                  </label>
                  <input
                    type="text"
                    value={cardData.holderName}
                    onChange={(e) => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
                    placeholder="NOME COMPLETO"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mês
                    </label>
                    <select
                      value={cardData.expirationMonth}
                      onChange={(e) => setCardData({ ...cardData, expirationMonth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {(i + 1).toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ano
                    </label>
                    <select
                      value={cardData.expirationYear}
                      onChange={(e) => setCardData({ ...cardData, expirationYear: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">AAAA</option>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                      placeholder="000"
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {finalAmount >= 100 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parcelas
                    </label>
                    <select
                      value={cardData.installments}
                      onChange={(e) => setCardData({ ...cardData, installments: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: Math.min(12, Math.floor(finalAmount / 50)) }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}x de {formatCurrency(finalAmount / (i + 1))}
                          {i > 0 && ' (com juros)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* PIX Instructions */}
            {paymentMethod === 'pix' && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center text-blue-700 mb-2">
                  <QrCode className="w-5 h-5 mr-2" />
                  <span className="font-medium">Pagamento PIX</span>
                </div>
                <p className="text-sm text-blue-600">
                  Após confirmar, você receberá um QR Code para realizar o pagamento PIX. 
                  O pagamento é processado instantaneamente.
                </p>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={loading || (paymentMethod === 'card' && !cardData.number)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processando...
                </div>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Confirmar Pagamento - {formatCurrency(finalAmount)}
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                🔒 Pagamento seguro e criptografado
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Histórico de Transações</h3>
      
      <div className="space-y-3">
        {transactions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((transaction) => {
            const StatusIcon = getStatusIcon(transaction.status);
            
            return (
              <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <StatusIcon className={`w-5 h-5 ${
                      transaction.status === 'paid' ? 'text-green-600' :
                      transaction.status === 'failed' ? 'text-red-600' :
                      'text-yellow-600'
                    }`} />
                    <div>
                      <h4 className="font-medium text-gray-900">{transaction.description}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{transaction.paymentMethod.displayName}</span>
                        <span>{formatDate(transaction.createdAt)}</span>
                        {transaction.installments && transaction.installments > 1 && (
                          <span>{transaction.installments}x</span>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status === 'paid' ? 'Pago' :
                         transaction.status === 'pending' ? 'Pendente' :
                         transaction.status === 'failed' ? 'Falhou' : transaction.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </p>
                    {transaction.originalAmount !== transaction.amount && (
                      <p className="text-sm text-gray-500 line-through">
                        {formatCurrency(transaction.originalAmount)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        
        {transactions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma transação encontrada</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSubscriptionTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Assinaturas</h3>
      
      {subscriptions.map((subscription) => (
        <div key={subscription.id} className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xl font-semibold text-gray-900">{subscription.planName}</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                subscription.status === 'active' ? 'text-green-800 bg-green-100' :
                subscription.status === 'trial' ? 'text-blue-800 bg-blue-100' :
                subscription.status === 'past_due' ? 'text-red-800 bg-red-100' :
                'text-gray-800 bg-gray-100'
              }`}>
                {subscription.status === 'active' ? 'Ativa' :
                 subscription.status === 'trial' ? 'Período de Teste' :
                 subscription.status === 'past_due' ? 'Em Atraso' :
                 subscription.status}
              </span>
            </div>
            
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(subscription.amount)}
              </p>
              <p className="text-sm text-gray-600">mensais</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Início</p>
              <p className="text-gray-900">{formatDate(subscription.startDate)}</p>
            </div>
            
            {subscription.trialEndDate && (
              <div>
                <p className="text-sm font-medium text-gray-700">Fim do Teste</p>
                <p className="text-gray-900">{formatDate(subscription.trialEndDate)}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-gray-700">Próxima Cobrança</p>
              <p className="text-gray-900">{formatDate(subscription.nextBillingDate)}</p>
            </div>
          </div>

          {/* Usage Metrics */}
          {subscription.usageMetrics.length > 0 && (
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Uso no Período Atual</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {subscription.usageMetrics[0]?.consultations || 0}
                  </p>
                  <p className="text-xs text-gray-600">Consultas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {subscription.usageMetrics[0]?.exercises || 0}
                  </p>
                  <p className="text-xs text-gray-600">Exercícios</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {subscription.usageMetrics[0]?.reports || 0}
                  </p>
                  <p className="text-xs text-gray-600">Relatórios</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {subscription.usageMetrics[0]?.messages || 0}
                  </p>
                  <p className="text-xs text-gray-600">Mensagens</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {subscriptions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhuma assinatura ativa</p>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Ver Planos Disponíveis
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Portal de Pagamentos</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'invoices', label: 'Faturas', icon: FileText },
              { id: 'history', label: 'Histórico', icon: History },
              { id: 'subscription', label: 'Assinaturas', icon: TrendingUp }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Carregando...</span>
            </div>
          ) : (
            <>
              {activeTab === 'invoices' && renderInvoicesTab()}
              {activeTab === 'history' && renderHistoryTab()}
              {activeTab === 'subscription' && renderSubscriptionTab()}
            </>
          )}
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && renderPaymentForm()}
    </>
  );
};