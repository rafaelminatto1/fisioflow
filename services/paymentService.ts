import { Patient } from '../types';

// Payment Types and Interfaces
export interface PaymentMethod {
  id: string;
  type: 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'bank_transfer' | 'digital_wallet';
  provider: 'mercado_pago' | 'pagseguro' | 'stripe' | 'picpay' | 'paypal' | 'pix_bacen';
  displayName: string;
  isActive: boolean;
  fees: {
    percentage: number;
    fixed: number;
  };
  configuration: Record<string, any>;
}

export interface PaymentTransaction {
  id: string;
  patientId: string;
  patientName: string;
  invoiceId?: string;
  amount: number;
  originalAmount: number;
  currency: 'BRL';
  paymentMethod: PaymentMethod;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partial_refund';
  gatewayTransactionId?: string;
  gatewayPaymentId?: string;
  description: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  
  // Payment-specific data
  pixData?: PixPaymentData;
  cardData?: CardPaymentData;
  boletoData?: BoletoPaymentData;
  digitalWalletData?: DigitalWalletData;
  
  // Installments
  installments?: number;
  installmentAmount?: number;
  
  // Fees and discounts
  fees: {
    gatewayFee: number;
    platformFee: number;
    totalFees: number;
  };
  discounts: {
    earlyPayment?: number;
    loyalty?: number;
    promotional?: number;
    total: number;
  };
  
  // Metadata
  metadata: {
    source: 'manual' | 'automatic' | 'recurring' | 'installment';
    treatmentId?: string;
    appointmentId?: string;
    subscriptionId?: string;
    notes?: string;
  };
}

export interface PixPaymentData {
  qrCode: string;
  qrCodeBase64: string;
  pixKey: string;
  expiresAt: string;
  txId: string;
}

export interface CardPaymentData {
  brand: string;
  lastFourDigits: string;
  holderName: string;
  expirationMonth: number;
  expirationYear: number;
  authorizationCode?: string;
  nsu?: string;
  tid?: string;
}

export interface BoletoPaymentData {
  boletoUrl: string;
  barCode: string;
  digitableLine: string;
  expirationDate: string;
  instructions: string[];
}

export interface DigitalWalletData {
  walletType: 'picpay' | 'paypal' | 'mercado_pago' | 'google_pay' | 'apple_pay';
  walletId?: string;
  redirectUrl?: string;
}

export interface PaymentInvoice {
  id: string;
  number: string;
  patientId: string;
  patientName: string;
  amount: number;
  originalAmount: number;
  dueDate: string;
  description: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentTransactions: PaymentTransaction[];
  isRecurring: boolean;
  recurringConfig?: RecurringConfig;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  
  // Invoice details
  items: InvoiceItem[];
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  
  // Late fees
  lateFees: {
    interestRate: number; // Monthly percentage
    fineAmount: number; // Fixed amount
    gracePeriodDays: number;
  };
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: 'consultation' | 'treatment' | 'exercise' | 'equipment' | 'subscription' | 'other';
}

export interface RecurringConfig {
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  dayOfMonth?: number; // For monthly recurring
  dayOfWeek?: number; // For weekly recurring (0 = Sunday)
  endDate?: string;
  maxOccurrences?: number;
  currentOccurrence: number;
  isActive: boolean;
}

export interface PaymentPlan {
  id: string;
  patientId: string;
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  firstDueDate: string;
  frequency: 'weekly' | 'monthly';
  status: 'active' | 'completed' | 'cancelled' | 'suspended';
  paymentMethod: PaymentMethod;
  createdInvoices: string[]; // Invoice IDs
  paidInstallments: number;
  nextDueDate: string;
  createdAt: string;
  tenantId: string;
}

export interface PaymentProvider {
  name: string;
  displayName: string;
  isActive: boolean;
  supportedMethods: PaymentMethod['type'][];
  configuration: {
    apiKey: string;
    secretKey: string;
    publicKey?: string;
    webhookSecret?: string;
    environment: 'sandbox' | 'production';
    baseUrl: string;
  };
}

export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  averageTicket: number;
  conversionRate: number;
  
  // By payment method
  byPaymentMethod: {
    [key: string]: {
      amount: number;
      count: number;
      percentage: number;
    };
  };
  
  // By status
  byStatus: {
    [key: string]: {
      amount: number;
      count: number;
      percentage: number;
    };
  };
  
  // Timeline data
  dailyRevenue: { date: string; amount: number; count: number }[];
  monthlyRevenue: { month: string; amount: number; count: number }[];
  
  // Outstanding amounts
  pendingAmount: number;
  overdueAmount: number;
  
  period: {
    start: string;
    end: string;
  };
  tenantId: string;
}

class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();
  private transactions: PaymentTransaction[] = [];
  private invoices: PaymentInvoice[] = [];
  private paymentPlans: PaymentPlan[] = [];
  private webhookEndpoints: Map<string, string> = new Map();

  constructor() {
    this.initializeProviders();
    this.loadStoredData();
    this.startAutomationTasks();
  }

  private initializeProviders(): void {
    // Mercado Pago
    this.providers.set('mercado_pago', {
      name: 'mercado_pago',
      displayName: 'Mercado Pago',
      isActive: true,
      supportedMethods: ['pix', 'credit_card', 'debit_card', 'boleto'],
      configuration: {
        apiKey: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
        secretKey: process.env.MERCADO_PAGO_SECRET_KEY || '',
        publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || '',
        webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || '',
        environment: (process.env.MERCADO_PAGO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        baseUrl: process.env.MERCADO_PAGO_ENVIRONMENT === 'production' 
          ? 'https://api.mercadopago.com' 
          : 'https://api.mercadopago.com'
      }
    });

    // PagSeguro
    this.providers.set('pagseguro', {
      name: 'pagseguro',
      displayName: 'PagSeguro',
      isActive: true,
      supportedMethods: ['pix', 'credit_card', 'debit_card', 'boleto'],
      configuration: {
        apiKey: process.env.PAGSEGURO_TOKEN || '',
        secretKey: process.env.PAGSEGURO_SECRET || '',
        environment: (process.env.PAGSEGURO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        baseUrl: process.env.PAGSEGURO_ENVIRONMENT === 'production' 
          ? 'https://ws.pagseguro.uol.com.br' 
          : 'https://ws.sandbox.pagseguro.uol.com.br'
      }
    });

    // PIX via Banco Central
    this.providers.set('pix_bacen', {
      name: 'pix_bacen',
      displayName: 'PIX Banco Central',
      isActive: true,
      supportedMethods: ['pix'],
      configuration: {
        apiKey: process.env.PIX_CLIENT_ID || '',
        secretKey: process.env.PIX_CLIENT_SECRET || '',
        environment: (process.env.PIX_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        baseUrl: process.env.PIX_ENVIRONMENT === 'production' 
          ? 'https://api.bacen.gov.br' 
          : 'https://api-h.bacen.gov.br'
      }
    });

    // PicPay
    this.providers.set('picpay', {
      name: 'picpay',
      displayName: 'PicPay',
      isActive: true,
      supportedMethods: ['digital_wallet'],
      configuration: {
        apiKey: process.env.PICPAY_X_PICPAY_TOKEN || '',
        secretKey: process.env.PICPAY_X_SELLER_TOKEN || '',
        environment: (process.env.PICPAY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        baseUrl: process.env.PICPAY_ENVIRONMENT === 'production' 
          ? 'https://appws.picpay.com' 
          : 'https://appws.picpay.com'
      }
    });
  }

  private loadStoredData(): void {
    try {
      const storedTransactions = localStorage.getItem('payment_transactions');
      if (storedTransactions) {
        this.transactions = JSON.parse(storedTransactions);
      }

      const storedInvoices = localStorage.getItem('payment_invoices');
      if (storedInvoices) {
        this.invoices = JSON.parse(storedInvoices);
      }

      const storedPlans = localStorage.getItem('payment_plans');
      if (storedPlans) {
        this.paymentPlans = JSON.parse(storedPlans);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('payment_transactions', JSON.stringify(this.transactions));
      localStorage.setItem('payment_invoices', JSON.stringify(this.invoices));
      localStorage.setItem('payment_plans', JSON.stringify(this.paymentPlans));
    } catch (error) {
      console.error('Error saving payment data:', error);
    }
  }

  private startAutomationTasks(): void {
    // Check for overdue invoices every hour
    setInterval(() => {
      this.processOverdueInvoices();
    }, 60 * 60 * 1000);

    // Process recurring payments daily at 9 AM
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        this.processRecurringPayments();
      }
    }, 60 * 1000);

    // Send payment reminders daily at 10 AM
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 10 && now.getMinutes() === 0) {
        this.sendPaymentReminders();
      }
    }, 60 * 1000);
  }

  // PIX Payment Methods
  async createPixPayment(
    amount: number,
    description: string,
    patientId: string,
    tenantId: string,
    expirationMinutes: number = 60
  ): Promise<PaymentTransaction> {
    const provider = this.providers.get('mercado_pago') || this.providers.get('pix_bacen');
    if (!provider) {
      throw new Error('PIX provider not configured');
    }

    const transaction: PaymentTransaction = {
      id: this.generateId(),
      patientId,
      patientName: await this.getPatientName(patientId),
      amount,
      originalAmount: amount,
      currency: 'BRL',
      paymentMethod: {
        id: 'pix',
        type: 'pix',
        provider: provider.name as any,
        displayName: 'PIX',
        isActive: true,
        fees: { percentage: 0.99, fixed: 0 },
        configuration: {}
      },
      status: 'pending',
      description,
      dueDate: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId,
      fees: {
        gatewayFee: amount * 0.0099,
        platformFee: 0,
        totalFees: amount * 0.0099
      },
      discounts: { total: 0 },
      metadata: {
        source: 'manual'
      }
    };

    try {
      if (provider.name === 'mercado_pago') {
        const pixData = await this.createMercadoPagoPixPayment(transaction, expirationMinutes);
        transaction.pixData = pixData;
        transaction.gatewayPaymentId = pixData.txId;
      } else if (provider.name === 'pix_bacen') {
        const pixData = await this.createBacenPixPayment(transaction, expirationMinutes);
        transaction.pixData = pixData;
        transaction.gatewayPaymentId = pixData.txId;
      }

      this.transactions.push(transaction);
      this.saveData();
      
      return transaction;
    } catch (error) {
      transaction.status = 'failed';
      this.transactions.push(transaction);
      this.saveData();
      throw error;
    }
  }

  private async createMercadoPagoPixPayment(
    transaction: PaymentTransaction, 
    expirationMinutes: number
  ): Promise<PixPaymentData> {
    const provider = this.providers.get('mercado_pago')!;
    
    const paymentData = {
      transaction_amount: transaction.amount,
      description: transaction.description,
      payment_method_id: 'pix',
      payer: {
        email: await this.getPatientEmail(transaction.patientId),
        first_name: transaction.patientName.split(' ')[0],
        last_name: transaction.patientName.split(' ').slice(1).join(' ')
      },
      date_of_expiration: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString(),
      external_reference: transaction.id
    };

    const response = await fetch(`${provider.configuration.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.configuration.apiKey}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': transaction.id
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mercado Pago error: ${error.message || 'Payment creation failed'}`);
    }

    const result = await response.json();
    
    return {
      qrCode: result.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: result.point_of_interaction.transaction_data.qr_code_base64,
      pixKey: result.point_of_interaction.transaction_data.qr_code,
      expiresAt: result.date_of_expiration,
      txId: result.id.toString()
    };
  }

  private async createBacenPixPayment(
    transaction: PaymentTransaction, 
    expirationMinutes: number
  ): Promise<PixPaymentData> {
    const provider = this.providers.get('pix_bacen')!;
    
    // Implement PIX Direct API integration
    const txId = `TX${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    
    const pixPayload = {
      calendario: {
        expiracao: expirationMinutes * 60
      },
      devedor: {
        nome: transaction.patientName,
        cpf: await this.getPatientCPF(transaction.patientId)
      },
      valor: {
        original: transaction.amount.toFixed(2)
      },
      chave: provider.configuration.apiKey,
      solicitacaoPagador: transaction.description
    };

    // In a real implementation, you would call the PIX API here
    // For now, we'll simulate the response
    const qrCode = this.generatePixQRCode(pixPayload, txId);
    
    return {
      qrCode,
      qrCodeBase64: btoa(qrCode),
      pixKey: provider.configuration.apiKey,
      expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString(),
      txId
    };
  }

  // Credit Card Payment Methods
  async createCardPayment(
    amount: number,
    description: string,
    patientId: string,
    tenantId: string,
    cardData: {
      number: string;
      holderName: string;
      expirationMonth: number;
      expirationYear: number;
      cvv: string;
    },
    installments: number = 1
  ): Promise<PaymentTransaction> {
    const provider = this.providers.get('mercado_pago');
    if (!provider) {
      throw new Error('Card payment provider not configured');
    }

    const transaction: PaymentTransaction = {
      id: this.generateId(),
      patientId,
      patientName: await this.getPatientName(patientId),
      amount,
      originalAmount: amount,
      currency: 'BRL',
      paymentMethod: {
        id: 'credit_card',
        type: 'credit_card',
        provider: 'mercado_pago',
        displayName: 'Cartão de Crédito',
        isActive: true,
        fees: { percentage: 3.99, fixed: 0.39 },
        configuration: {}
      },
      status: 'processing',
      description,
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId,
      installments,
      installmentAmount: amount / installments,
      fees: {
        gatewayFee: (amount * 0.0399) + 0.39,
        platformFee: 0,
        totalFees: (amount * 0.0399) + 0.39
      },
      discounts: { total: 0 },
      metadata: {
        source: 'manual'
      }
    };

    try {
      const cardPaymentData = await this.processCardPayment(transaction, cardData, installments);
      transaction.cardData = cardPaymentData;
      transaction.status = 'paid';
      transaction.paidAt = new Date().toISOString();

      this.transactions.push(transaction);
      this.saveData();
      
      return transaction;
    } catch (error) {
      transaction.status = 'failed';
      this.transactions.push(transaction);
      this.saveData();
      throw error;
    }
  }

  private async processCardPayment(
    transaction: PaymentTransaction,
    cardData: any,
    installments: number
  ): Promise<CardPaymentData> {
    const provider = this.providers.get('mercado_pago')!;
    
    // Create card token first
    const tokenResponse = await fetch(`${provider.configuration.baseUrl}/v1/card_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.configuration.publicKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        card_number: cardData.number,
        security_code: cardData.cvv,
        expiration_month: cardData.expirationMonth,
        expiration_year: cardData.expirationYear,
        cardholder: {
          name: cardData.holderName
        }
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to create card token');
    }

    const tokenResult = await tokenResponse.json();

    // Create payment
    const paymentData = {
      transaction_amount: transaction.amount,
      description: transaction.description,
      installments,
      payment_method_id: tokenResult.payment_method_id,
      token: tokenResult.id,
      payer: {
        email: await this.getPatientEmail(transaction.patientId),
        identification: {
          type: 'CPF',
          number: await this.getPatientCPF(transaction.patientId)
        }
      },
      external_reference: transaction.id
    };

    const paymentResponse = await fetch(`${provider.configuration.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.configuration.apiKey}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': transaction.id
      },
      body: JSON.stringify(paymentData)
    });

    if (!paymentResponse.ok) {
      const error = await paymentResponse.json();
      throw new Error(`Payment failed: ${error.message || 'Unknown error'}`);
    }

    const paymentResult = await paymentResponse.json();
    
    return {
      brand: tokenResult.payment_method_id,
      lastFourDigits: tokenResult.last_four_digits,
      holderName: cardData.holderName,
      expirationMonth: cardData.expirationMonth,
      expirationYear: cardData.expirationYear,
      authorizationCode: paymentResult.authorization_code,
      nsu: paymentResult.acquirer_reference,
      tid: paymentResult.id.toString()
    };
  }

  // Boleto Payment Methods
  async createBoletoPayment(
    amount: number,
    description: string,
    patientId: string,
    tenantId: string,
    daysToExpire: number = 7
  ): Promise<PaymentTransaction> {
    const provider = this.providers.get('mercado_pago');
    if (!provider) {
      throw new Error('Boleto provider not configured');
    }

    const transaction: PaymentTransaction = {
      id: this.generateId(),
      patientId,
      patientName: await this.getPatientName(patientId),
      amount,
      originalAmount: amount,
      currency: 'BRL',
      paymentMethod: {
        id: 'boleto',
        type: 'boleto',
        provider: 'mercado_pago',
        displayName: 'Boleto Bancário',
        isActive: true,
        fees: { percentage: 2.99, fixed: 0 },
        configuration: {}
      },
      status: 'pending',
      description,
      dueDate: new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId,
      fees: {
        gatewayFee: amount * 0.0299,
        platformFee: 0,
        totalFees: amount * 0.0299
      },
      discounts: { total: 0 },
      metadata: {
        source: 'manual'
      }
    };

    try {
      const boletoData = await this.createMercadoPagoBoleto(transaction, daysToExpire);
      transaction.boletoData = boletoData;
      transaction.gatewayPaymentId = boletoData.digitableLine;

      this.transactions.push(transaction);
      this.saveData();
      
      return transaction;
    } catch (error) {
      transaction.status = 'failed';
      this.transactions.push(transaction);
      this.saveData();
      throw error;
    }
  }

  private async createMercadoPagoBoleto(
    transaction: PaymentTransaction, 
    daysToExpire: number
  ): Promise<BoletoPaymentData> {
    const provider = this.providers.get('mercado_pago')!;
    
    const paymentData = {
      transaction_amount: transaction.amount,
      description: transaction.description,
      payment_method_id: 'bolbradesco',
      payer: {
        email: await this.getPatientEmail(transaction.patientId),
        first_name: transaction.patientName.split(' ')[0],
        last_name: transaction.patientName.split(' ').slice(1).join(' '),
        identification: {
          type: 'CPF',
          number: await this.getPatientCPF(transaction.patientId)
        }
      },
      date_of_expiration: new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000).toISOString(),
      external_reference: transaction.id
    };

    const response = await fetch(`${provider.configuration.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.configuration.apiKey}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': transaction.id
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Boleto creation failed: ${error.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    return {
      boletoUrl: result.transaction_details.external_resource_url,
      barCode: result.barcode?.content || '',
      digitableLine: result.transaction_details.verification_code,
      expirationDate: result.date_of_expiration,
      instructions: [
        'Não receber após o vencimento',
        'Multa de 2% após o vencimento',
        'Juros de 1% ao mês'
      ]
    };
  }

  // Digital Wallet Payments
  async createDigitalWalletPayment(
    amount: number,
    description: string,
    patientId: string,
    tenantId: string,
    walletType: 'picpay' | 'paypal'
  ): Promise<PaymentTransaction> {
    const provider = this.providers.get(walletType);
    if (!provider) {
      throw new Error(`${walletType} provider not configured`);
    }

    const transaction: PaymentTransaction = {
      id: this.generateId(),
      patientId,
      patientName: await this.getPatientName(patientId),
      amount,
      originalAmount: amount,
      currency: 'BRL',
      paymentMethod: {
        id: walletType,
        type: 'digital_wallet',
        provider: walletType as any,
        displayName: walletType === 'picpay' ? 'PicPay' : 'PayPal',
        isActive: true,
        fees: { percentage: walletType === 'picpay' ? 1.99 : 4.99, fixed: 0 },
        configuration: {}
      },
      status: 'pending',
      description,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiration
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId,
      fees: {
        gatewayFee: amount * (walletType === 'picpay' ? 0.0199 : 0.0499),
        platformFee: 0,
        totalFees: amount * (walletType === 'picpay' ? 0.0199 : 0.0499)
      },
      discounts: { total: 0 },
      metadata: {
        source: 'manual'
      }
    };

    try {
      let walletData: DigitalWalletData;
      
      if (walletType === 'picpay') {
        walletData = await this.createPicPayPayment(transaction);
      } else {
        walletData = await this.createPayPalPayment(transaction);
      }
      
      transaction.digitalWalletData = walletData;
      transaction.gatewayPaymentId = walletData.walletId;

      this.transactions.push(transaction);
      this.saveData();
      
      return transaction;
    } catch (error) {
      transaction.status = 'failed';
      this.transactions.push(transaction);
      this.saveData();
      throw error;
    }
  }

  private async createPicPayPayment(transaction: PaymentTransaction): Promise<DigitalWalletData> {
    const provider = this.providers.get('picpay')!;
    
    const paymentData = {
      referenceId: transaction.id,
      callbackUrl: `${window.location.origin}/api/webhooks/picpay`,
      returnUrl: `${window.location.origin}/payment/success`,
      value: transaction.amount,
      buyer: {
        firstName: transaction.patientName.split(' ')[0],
        lastName: transaction.patientName.split(' ').slice(1).join(' '),
        document: await this.getPatientCPF(transaction.patientId),
        email: await this.getPatientEmail(transaction.patientId),
        phone: await this.getPatientPhone(transaction.patientId)
      }
    };

    const response = await fetch(`${provider.configuration.baseUrl}/ecommerce/public/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-picpay-token': provider.configuration.apiKey
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`PicPay error: ${error.message || 'Payment creation failed'}`);
    }

    const result = await response.json();
    
    return {
      walletType: 'picpay',
      walletId: result.referenceId,
      redirectUrl: result.paymentUrl
    };
  }

  private async createPayPalPayment(transaction: PaymentTransaction): Promise<DigitalWalletData> {
    // PayPal integration would go here
    // For now, return mock data
    return {
      walletType: 'paypal',
      walletId: `PP_${transaction.id}`,
      redirectUrl: `https://paypal.com/checkout/${transaction.id}`
    };
  }

  // Invoice Management
  async createInvoice(
    patientId: string,
    items: InvoiceItem[],
    dueDate: string,
    tenantId: string,
    isRecurring: boolean = false,
    recurringConfig?: RecurringConfig
  ): Promise<PaymentInvoice> {
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const invoice: PaymentInvoice = {
      id: this.generateId(),
      number: this.generateInvoiceNumber(),
      patientId,
      patientName: await this.getPatientName(patientId),
      amount: totalAmount,
      originalAmount: totalAmount,
      dueDate,
      description: `Fatura #${this.generateInvoiceNumber()}`,
      status: 'draft',
      paymentTransactions: [],
      isRecurring,
      recurringConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId,
      items,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount,
      lateFees: {
        interestRate: 2.0, // 2% monthly interest
        fineAmount: totalAmount * 0.02, // 2% fine
        gracePeriodDays: 5
      }
    };

    this.invoices.push(invoice);
    this.saveData();

    return invoice;
  }

  // Payment Plan Management
  async createPaymentPlan(
    patientId: string,
    totalAmount: number,
    installments: number,
    firstDueDate: string,
    frequency: 'weekly' | 'monthly',
    paymentMethod: PaymentMethod,
    tenantId: string
  ): Promise<PaymentPlan> {
    const installmentAmount = totalAmount / installments;
    
    const paymentPlan: PaymentPlan = {
      id: this.generateId(),
      patientId,
      totalAmount,
      installments,
      installmentAmount,
      firstDueDate,
      frequency,
      status: 'active',
      paymentMethod,
      createdInvoices: [],
      paidInstallments: 0,
      nextDueDate: firstDueDate,
      createdAt: new Date().toISOString(),
      tenantId
    };

    this.paymentPlans.push(paymentPlan);
    this.saveData();

    // Create first installment invoice
    await this.createInstallmentInvoice(paymentPlan);

    return paymentPlan;
  }

  private async createInstallmentInvoice(paymentPlan: PaymentPlan): Promise<PaymentInvoice> {
    const installmentNumber = paymentPlan.paidInstallments + 1;
    
    const invoice = await this.createInvoice(
      paymentPlan.patientId,
      [{
        id: this.generateId(),
        description: `Parcela ${installmentNumber}/${paymentPlan.installments}`,
        quantity: 1,
        unitPrice: paymentPlan.installmentAmount,
        totalPrice: paymentPlan.installmentAmount,
        category: 'treatment'
      }],
      paymentPlan.nextDueDate,
      paymentPlan.tenantId
    );

    paymentPlan.createdInvoices.push(invoice.id);
    
    // Calculate next due date
    const nextDate = new Date(paymentPlan.nextDueDate);
    if (paymentPlan.frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    paymentPlan.nextDueDate = nextDate.toISOString().split('T')[0];

    this.saveData();
    return invoice;
  }

  // Automation Methods
  private async processOverdueInvoices(): Promise<void> {
    const today = new Date();
    const overdueInvoices = this.invoices.filter(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const gracePeriod = new Date(dueDate);
      gracePeriod.setDate(gracePeriod.getDate() + invoice.lateFees.gracePeriodDays);
      
      return invoice.status !== 'paid' && today > gracePeriod;
    });

    for (const invoice of overdueInvoices) {
      await this.applyLateFees(invoice);
      await this.sendOverdueNotification(invoice);
    }

    this.saveData();
  }

  private async applyLateFees(invoice: PaymentInvoice): Promise<void> {
    if (invoice.status === 'overdue') return; // Already processed

    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const monthsOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
    
    const interestAmount = invoice.originalAmount * (invoice.lateFees.interestRate / 100) * monthsOverdue;
    const totalAmount = invoice.originalAmount + invoice.lateFees.fineAmount + interestAmount;
    
    invoice.amount = totalAmount;
    invoice.status = 'overdue';
    invoice.updatedAt = new Date().toISOString();
  }

  private async sendOverdueNotification(invoice: PaymentInvoice): Promise<void> {
    // Integration with notification service
    console.log(`Sending overdue notification for invoice ${invoice.number} to patient ${invoice.patientName}`);
  }

  private async processRecurringPayments(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Process payment plans
    const activePlans = this.paymentPlans.filter(plan => 
      plan.status === 'active' && 
      plan.nextDueDate <= today &&
      plan.paidInstallments < plan.installments
    );

    for (const plan of activePlans) {
      await this.createInstallmentInvoice(plan);
    }

    // Process recurring invoices
    const recurringInvoices = this.invoices.filter(invoice => 
      invoice.isRecurring && 
      invoice.recurringConfig?.isActive &&
      this.shouldCreateRecurringInvoice(invoice, today)
    );

    for (const invoice of recurringInvoices) {
      await this.createNextRecurringInvoice(invoice);
    }

    this.saveData();
  }

  private shouldCreateRecurringInvoice(invoice: PaymentInvoice, today: string): boolean {
    if (!invoice.recurringConfig) return false;
    
    const config = invoice.recurringConfig;
    const lastCreated = new Date(invoice.createdAt);
    const todayDate = new Date(today);
    
    switch (config.frequency) {
      case 'monthly':
        return todayDate.getDate() === (config.dayOfMonth || 1) && 
               todayDate > lastCreated;
      case 'weekly':
        return todayDate.getDay() === (config.dayOfWeek || 1) &&
               todayDate > lastCreated;
      default:
        return false;
    }
  }

  private async createNextRecurringInvoice(templateInvoice: PaymentInvoice): Promise<void> {
    const config = templateInvoice.recurringConfig!;
    
    if (config.maxOccurrences && config.currentOccurrence >= config.maxOccurrences) {
      config.isActive = false;
      return;
    }

    const nextDueDate = this.calculateNextRecurringDate(templateInvoice);
    
    await this.createInvoice(
      templateInvoice.patientId,
      templateInvoice.items,
      nextDueDate,
      templateInvoice.tenantId,
      true,
      { ...config, currentOccurrence: config.currentOccurrence + 1 }
    );
  }

  private calculateNextRecurringDate(invoice: PaymentInvoice): string {
    const config = invoice.recurringConfig!;
    const lastDate = new Date(invoice.dueDate);
    
    switch (config.frequency) {
      case 'weekly':
        lastDate.setDate(lastDate.getDate() + 7);
        break;
      case 'monthly':
        lastDate.setMonth(lastDate.getMonth() + 1);
        break;
      case 'quarterly':
        lastDate.setMonth(lastDate.getMonth() + 3);
        break;
      case 'semi_annual':
        lastDate.setMonth(lastDate.getMonth() + 6);
        break;
      case 'annual':
        lastDate.setFullYear(lastDate.getFullYear() + 1);
        break;
    }
    
    return lastDate.toISOString().split('T')[0];
  }

  private async sendPaymentReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const upcomingInvoices = this.invoices.filter(invoice => 
      invoice.status === 'sent' && 
      invoice.dueDate === tomorrowStr
    );

    for (const invoice of upcomingInvoices) {
      await this.sendPaymentReminder(invoice);
    }
  }

  private async sendPaymentReminder(invoice: PaymentInvoice): Promise<void> {
    // Integration with notification service (email, SMS, WhatsApp)
    console.log(`Sending payment reminder for invoice ${invoice.number} to patient ${invoice.patientName}`);
  }

  // Webhook Processing
  async processWebhook(provider: string, payload: any): Promise<void> {
    try {
      switch (provider) {
        case 'mercado_pago':
          await this.processMercadoPagoWebhook(payload);
          break;
        case 'pagseguro':
          await this.processPagSeguroWebhook(payload);
          break;
        case 'picpay':
          await this.processPicPayWebhook(payload);
          break;
        default:
          console.warn(`Unknown webhook provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error processing ${provider} webhook:`, error);
    }
  }

  private async processMercadoPagoWebhook(payload: any): Promise<void> {
    if (payload.type === 'payment') {
      const paymentId = payload.data.id;
      const transaction = this.transactions.find(t => t.gatewayPaymentId === paymentId.toString());
      
      if (transaction) {
        // Fetch payment details from Mercado Pago
        const provider = this.providers.get('mercado_pago')!;
        const response = await fetch(`${provider.configuration.baseUrl}/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${provider.configuration.apiKey}`
          }
        });

        if (response.ok) {
          const paymentData = await response.json();
          await this.updateTransactionStatus(transaction.id, paymentData.status, paymentData);
        }
      }
    }
  }

  private async processPagSeguroWebhook(payload: any): Promise<void> {
    // PagSeguro webhook processing
    console.log('Processing PagSeguro webhook:', payload);
  }

  private async processPicPayWebhook(payload: any): Promise<void> {
    if (payload.referenceId) {
      const transaction = this.transactions.find(t => t.id === payload.referenceId);
      
      if (transaction) {
        const status = payload.status === 'paid' ? 'paid' : 
                      payload.status === 'cancelled' ? 'cancelled' : 'pending';
        
        await this.updateTransactionStatus(transaction.id, status, payload);
      }
    }
  }

  private async updateTransactionStatus(
    transactionId: string, 
    status: string, 
    gatewayData: any
  ): Promise<void> {
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const mappedStatus = this.mapGatewayStatus(status);
    transaction.status = mappedStatus;
    transaction.updatedAt = new Date().toISOString();

    if (mappedStatus === 'paid') {
      transaction.paidAt = new Date().toISOString();
      await this.markInvoiceAsPaid(transaction);
    }

    // Store gateway response
    transaction.metadata = {
      ...transaction.metadata,
      gatewayResponse: gatewayData
    };

    this.saveData();
  }

  private mapGatewayStatus(gatewayStatus: string): PaymentTransaction['status'] {
    const statusMap: Record<string, PaymentTransaction['status']> = {
      'approved': 'paid',
      'paid': 'paid',
      'pending': 'pending',
      'in_process': 'processing',
      'cancelled': 'cancelled',
      'rejected': 'failed',
      'refunded': 'refunded'
    };

    return statusMap[gatewayStatus] || 'pending';
  }

  private async markInvoiceAsPaid(transaction: PaymentTransaction): Promise<void> {
    if (!transaction.invoiceId) return;

    const invoice = this.invoices.find(i => i.id === transaction.invoiceId);
    if (invoice) {
      invoice.status = 'paid';
      invoice.updatedAt = new Date().toISOString();
      
      // Update payment plan if applicable
      const paymentPlan = this.paymentPlans.find(p => 
        p.createdInvoices.includes(invoice.id)
      );
      
      if (paymentPlan) {
        paymentPlan.paidInstallments++;
        
        if (paymentPlan.paidInstallments >= paymentPlan.installments) {
          paymentPlan.status = 'completed';
        }
      }
    }
  }

  // Analytics and Reporting
  getPaymentAnalytics(tenantId: string, startDate: string, endDate: string): PaymentAnalytics {
    const filteredTransactions = this.transactions.filter(t => 
      t.tenantId === tenantId &&
      t.createdAt >= startDate &&
      t.createdAt <= endDate
    );

    const paidTransactions = filteredTransactions.filter(t => t.status === 'paid');
    const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = paidTransactions.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const conversionRate = filteredTransactions.length > 0 ? 
      (totalTransactions / filteredTransactions.length) * 100 : 0;

    // Group by payment method
    const byPaymentMethod: Record<string, any> = {};
    paidTransactions.forEach(t => {
      const method = t.paymentMethod.displayName;
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { amount: 0, count: 0, percentage: 0 };
      }
      byPaymentMethod[method].amount += t.amount;
      byPaymentMethod[method].count++;
    });

    Object.keys(byPaymentMethod).forEach(method => {
      byPaymentMethod[method].percentage = (byPaymentMethod[method].amount / totalRevenue) * 100;
    });

    // Group by status
    const byStatus: Record<string, any> = {};
    filteredTransactions.forEach(t => {
      if (!byStatus[t.status]) {
        byStatus[t.status] = { amount: 0, count: 0, percentage: 0 };
      }
      byStatus[t.status].amount += t.amount;
      byStatus[t.status].count++;
    });

    Object.keys(byStatus).forEach(status => {
      byStatus[status].percentage = (byStatus[status].count / filteredTransactions.length) * 100;
    });

    // Generate daily revenue data
    const dailyRevenue = this.generateDailyRevenue(paidTransactions, startDate, endDate);
    const monthlyRevenue = this.generateMonthlyRevenue(paidTransactions, startDate, endDate);

    // Calculate outstanding amounts
    const allInvoices = this.invoices.filter(i => i.tenantId === tenantId);
    const pendingAmount = allInvoices
      .filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + i.amount, 0);
    
    const overdueAmount = allInvoices
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      totalRevenue,
      totalTransactions,
      averageTicket,
      conversionRate,
      byPaymentMethod,
      byStatus,
      dailyRevenue,
      monthlyRevenue,
      pendingAmount,
      overdueAmount,
      period: { start: startDate, end: endDate },
      tenantId
    };
  }

  private generateDailyRevenue(
    transactions: PaymentTransaction[], 
    startDate: string, 
    endDate: string
  ): { date: string; amount: number; count: number }[] {
    const dailyData: Record<string, { amount: number; count: number }> = {};
    
    transactions.forEach(t => {
      const date = t.paidAt?.split('T')[0] || t.createdAt.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { amount: 0, count: 0 };
      }
      dailyData[date].amount += t.amount;
      dailyData[date].count++;
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private generateMonthlyRevenue(
    transactions: PaymentTransaction[], 
    startDate: string, 
    endDate: string
  ): { month: string; amount: number; count: number }[] {
    const monthlyData: Record<string, { amount: number; count: number }> = {};
    
    transactions.forEach(t => {
      const date = new Date(t.paidAt || t.createdAt);
      const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData[month]) {
        monthlyData[month] = { amount: 0, count: 0 };
      }
      monthlyData[month].amount += t.amount;
      monthlyData[month].count++;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // Utility Methods
  private generateId(): string {
    return `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const sequence = (this.invoices.length + 1).toString().padStart(4, '0');
    return `${year}${month}${sequence}`;
  }

  private generatePixQRCode(payload: any, txId: string): string {
    // Simplified PIX QR Code generation (in production, use proper PIX libraries)
    return `00020126580014br.gov.bcb.pix0136${txId}${payload.valor.original}6304`;
  }

  private async getPatientName(patientId: string): Promise<string> {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const patient = patients.find((p: any) => p.id === patientId);
    return patient?.name || 'Paciente não encontrado';
  }

  private async getPatientEmail(patientId: string): Promise<string> {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const patient = patients.find((p: any) => p.id === patientId);
    return patient?.email || 'noemail@fisioflow.com';
  }

  private async getPatientCPF(patientId: string): Promise<string> {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const patient = patients.find((p: any) => p.id === patientId);
    return patient?.cpf?.replace(/\D/g, '') || '00000000000';
  }

  private async getPatientPhone(patientId: string): Promise<string> {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const patient = patients.find((p: any) => p.id === patientId);
    return patient?.phone || '11999999999';
  }

  // Public API Methods
  getTransactions(tenantId: string): PaymentTransaction[] {
    return this.transactions.filter(t => t.tenantId === tenantId);
  }

  getInvoices(tenantId: string): PaymentInvoice[] {
    return this.invoices.filter(i => i.tenantId === tenantId);
  }

  getPaymentPlans(tenantId: string): PaymentPlan[] {
    return this.paymentPlans.filter(p => p.tenantId === tenantId);
  }

  getTransaction(id: string): PaymentTransaction | undefined {
    return this.transactions.find(t => t.id === id);
  }

  getInvoice(id: string): PaymentInvoice | undefined {
    return this.invoices.find(i => i.id === id);
  }

  getPaymentMethods(): PaymentMethod[] {
    const methods: PaymentMethod[] = [];
    
    this.providers.forEach(provider => {
      provider.supportedMethods.forEach(method => {
        methods.push({
          id: `${provider.name}_${method}`,
          type: method,
          provider: provider.name as any,
          displayName: this.getPaymentMethodDisplayName(method),
          isActive: provider.isActive,
          fees: this.getPaymentMethodFees(method),
          configuration: {}
        });
      });
    });

    return methods;
  }

  private getPaymentMethodDisplayName(type: PaymentMethod['type']): string {
    const names: Record<PaymentMethod['type'], string> = {
      'pix': 'PIX',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'boleto': 'Boleto Bancário',
      'bank_transfer': 'Transferência Bancária',
      'digital_wallet': 'Carteira Digital'
    };
    return names[type];
  }

  private getPaymentMethodFees(type: PaymentMethod['type']): { percentage: number; fixed: number } {
    const fees: Record<PaymentMethod['type'], { percentage: number; fixed: number }> = {
      'pix': { percentage: 0.99, fixed: 0 },
      'credit_card': { percentage: 3.99, fixed: 0.39 },
      'debit_card': { percentage: 2.99, fixed: 0.39 },
      'boleto': { percentage: 2.99, fixed: 0 },
      'bank_transfer': { percentage: 1.99, fixed: 0 },
      'digital_wallet': { percentage: 1.99, fixed: 0 }
    };
    return fees[type];
  }
}

export const paymentService = new PaymentService();

// React Hook for easy integration
export const usePayments = () => {
  const createPixPayment = async (amount: number, description: string, patientId: string, tenantId: string) => {
    return paymentService.createPixPayment(amount, description, patientId, tenantId);
  };

  const createCardPayment = async (
    amount: number, 
    description: string, 
    patientId: string, 
    tenantId: string, 
    cardData: any, 
    installments: number = 1
  ) => {
    return paymentService.createCardPayment(amount, description, patientId, tenantId, cardData, installments);
  };

  const createBoletoPayment = async (amount: number, description: string, patientId: string, tenantId: string) => {
    return paymentService.createBoletoPayment(amount, description, patientId, tenantId);
  };

  const createDigitalWalletPayment = async (
    amount: number, 
    description: string, 
    patientId: string, 
    tenantId: string, 
    walletType: 'picpay' | 'paypal'
  ) => {
    return paymentService.createDigitalWalletPayment(amount, description, patientId, tenantId, walletType);
  };

  const createInvoice = async (
    patientId: string, 
    items: InvoiceItem[], 
    dueDate: string, 
    tenantId: string
  ) => {
    return paymentService.createInvoice(patientId, items, dueDate, tenantId);
  };

  const createPaymentPlan = async (
    patientId: string,
    totalAmount: number,
    installments: number,
    firstDueDate: string,
    frequency: 'weekly' | 'monthly',
    paymentMethod: PaymentMethod,
    tenantId: string
  ) => {
    return paymentService.createPaymentPlan(
      patientId, totalAmount, installments, firstDueDate, frequency, paymentMethod, tenantId
    );
  };

  const getTransactions = (tenantId: string) => paymentService.getTransactions(tenantId);
  const getInvoices = (tenantId: string) => paymentService.getInvoices(tenantId);
  const getPaymentPlans = (tenantId: string) => paymentService.getPaymentPlans(tenantId);
  const getTransaction = (id: string) => paymentService.getTransaction(id);
  const getInvoice = (id: string) => paymentService.getInvoice(id);
  const getPaymentMethods = () => paymentService.getPaymentMethods();
  const getPaymentAnalytics = (tenantId: string, startDate: string, endDate: string) => 
    paymentService.getPaymentAnalytics(tenantId, startDate, endDate);
  const processWebhook = (provider: string, payload: any) => 
    paymentService.processWebhook(provider, payload);

  return {
    createPixPayment,
    createCardPayment,
    createBoletoPayment,
    createDigitalWalletPayment,
    createInvoice,
    createPaymentPlan,
    getTransactions,
    getInvoices,
    getPaymentPlans,
    getTransaction,
    getInvoice,
    getPaymentMethods,
    getPaymentAnalytics,
    processWebhook
  };
};