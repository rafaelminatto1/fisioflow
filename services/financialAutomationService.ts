import { PaymentTransaction, PaymentInvoice, PaymentPlan, InvoiceItem } from './paymentService';
import { Patient, Appointment } from '../types';
import { whatsappService } from './whatsappService';

// Financial Automation Types
export interface AutomationRule {
  id: string;
  name: string;
  type: 'recurring_charge' | 'payment_reminder' | 'late_fee' | 'early_discount' | 'subscription';
  isActive: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  schedule: AutomationSchedule;
  tenantId: string;
  createdAt: string;
  lastExecuted?: string;
  executionCount: number;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'date_range';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface AutomationAction {
  type: 'create_invoice' | 'send_reminder' | 'apply_fee' | 'apply_discount' | 'charge_payment' | 'update_status';
  parameters: Record<string, any>;
}

export interface AutomationSchedule {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  dayOfWeek?: number; // 0 = Sunday
  dayOfMonth?: number;
  time?: string; // HH:MM format
  startDate?: string;
  endDate?: string;
  timezone: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  trialPeriodDays: number;
  features: string[];
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

export interface PatientSubscription {
  id: string;
  patientId: string;
  patientName: string;
  planId: string;
  planName: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  nextBillingDate: string;
  amount: number;
  paymentMethod?: any;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  
  // Billing history
  billingHistory: {
    invoiceId: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: 'paid' | 'pending' | 'overdue' | 'failed';
  }[];
  
  // Usage tracking
  usageMetrics: {
    period: string;
    consultations: number;
    exercises: number;
    reports: number;
    messages: number;
  }[];
}

export interface PaymentReminder {
  id: string;
  invoiceId: string;
  patientId: string;
  patientName: string;
  type: 'due_soon' | 'overdue' | 'final_notice';
  scheduledDate: string;
  sentDate?: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  channels: ('email' | 'sms' | 'whatsapp' | 'push')[];
  message: string;
  tenantId: string;
  createdAt: string;
}

export interface EarlyPaymentDiscount {
  id: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  daysInAdvance: number; // How many days before due date
  applicableToTypes: ('consultation' | 'treatment' | 'subscription' | 'all')[];
  minimumAmount?: number;
  maximumDiscount?: number;
  isActive: boolean;
  tenantId: string;
  validFrom: string;
  validUntil?: string;
  usageCount: number;
  usageLimit?: number;
}

export interface LateFeeRule {
  id: string;
  name: string;
  description: string;
  gracePeriodDays: number;
  feeType: 'percentage' | 'fixed' | 'compound';
  feeValue: number;
  interestRate?: number; // Monthly percentage for compound
  maximumFee?: number;
  applicableToTypes: ('consultation' | 'treatment' | 'subscription' | 'all')[];
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

export interface CashFlowProjection {
  tenantId: string;
  period: string; // YYYY-MM
  projectedIncome: {
    recurring: number;
    oneTime: number;
    total: number;
  };
  projectedExpenses: {
    fixed: number;
    variable: number;
    total: number;
  };
  netCashFlow: number;
  confidenceLevel: number; // 0-100%
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  assumptions: string[];
  generatedAt: string;
}

class FinancialAutomationService {
  private automationRules: AutomationRule[] = [];
  private subscriptionPlans: SubscriptionPlan[] = [];
  private patientSubscriptions: PatientSubscription[] = [];
  private paymentReminders: PaymentReminder[] = [];
  private earlyDiscounts: EarlyPaymentDiscount[] = [];
  private lateFeeRules: LateFeeRule[] = [];
  private cashFlowProjections: CashFlowProjection[] = [];
  private automationIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadStoredData();
    this.initializeDefaultRules();
    this.startAutomationEngine();
  }

  private loadStoredData(): void {
    try {
      const storedRules = localStorage.getItem('financial_automation_rules');
      if (storedRules) {
        this.automationRules = JSON.parse(storedRules);
      }

      const storedPlans = localStorage.getItem('subscription_plans');
      if (storedPlans) {
        this.subscriptionPlans = JSON.parse(storedPlans);
      }

      const storedSubscriptions = localStorage.getItem('patient_subscriptions');
      if (storedSubscriptions) {
        this.patientSubscriptions = JSON.parse(storedSubscriptions);
      }

      const storedReminders = localStorage.getItem('payment_reminders');
      if (storedReminders) {
        this.paymentReminders = JSON.parse(storedReminders);
      }

      const storedDiscounts = localStorage.getItem('early_payment_discounts');
      if (storedDiscounts) {
        this.earlyDiscounts = JSON.parse(storedDiscounts);
      }

      const storedLateFees = localStorage.getItem('late_fee_rules');
      if (storedLateFees) {
        this.lateFeeRules = JSON.parse(storedLateFees);
      }

      const storedProjections = localStorage.getItem('cash_flow_projections');
      if (storedProjections) {
        this.cashFlowProjections = JSON.parse(storedProjections);
      }
    } catch (error) {
      console.error('Error loading financial automation data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('financial_automation_rules', JSON.stringify(this.automationRules));
      localStorage.setItem('subscription_plans', JSON.stringify(this.subscriptionPlans));
      localStorage.setItem('patient_subscriptions', JSON.stringify(this.patientSubscriptions));
      localStorage.setItem('payment_reminders', JSON.stringify(this.paymentReminders));
      localStorage.setItem('early_payment_discounts', JSON.stringify(this.earlyDiscounts));
      localStorage.setItem('late_fee_rules', JSON.stringify(this.lateFeeRules));
      localStorage.setItem('cash_flow_projections', JSON.stringify(this.cashFlowProjections));
    } catch (error) {
      console.error('Error saving financial automation data:', error);
    }
  }

  private initializeDefaultRules(): void {
    // Default monthly subscription billing rule
    const monthlyBillingRule: AutomationRule = {
      id: 'monthly_billing',
      name: 'Cobrança Mensal de Assinaturas',
      type: 'recurring_charge',
      isActive: true,
      conditions: [
        {
          field: 'subscription.status',
          operator: 'equals',
          value: 'active'
        },
        {
          field: 'subscription.nextBillingDate',
          operator: 'equals',
          value: 'today',
          logicalOperator: 'AND'
        }
      ],
      actions: [
        {
          type: 'create_invoice',
          parameters: {
            description: 'Mensalidade - {{planName}}',
            dueDate: 'same_day',
            autoCharge: true
          }
        }
      ],
      schedule: {
        frequency: 'daily',
        time: '09:00',
        timezone: 'America/Sao_Paulo'
      },
      tenantId: 'default',
      createdAt: new Date().toISOString(),
      executionCount: 0
    };

    // Payment reminder rule (3 days before due)
    const reminderRule: AutomationRule = {
      id: 'payment_reminder_3days',
      name: 'Lembrete de Pagamento (3 dias)',
      type: 'payment_reminder',
      isActive: true,
      conditions: [
        {
          field: 'invoice.dueDate',
          operator: 'equals',
          value: 'in_3_days'
        },
        {
          field: 'invoice.status',
          operator: 'not_equals',
          value: 'paid',
          logicalOperator: 'AND'
        }
      ],
      actions: [
        {
          type: 'send_reminder',
          parameters: {
            channels: ['email', 'whatsapp'],
            template: 'payment_reminder_3days',
            priority: 'normal'
          }
        }
      ],
      schedule: {
        frequency: 'daily',
        time: '10:00',
        timezone: 'America/Sao_Paulo'
      },
      tenantId: 'default',
      createdAt: new Date().toISOString(),
      executionCount: 0
    };

    // Late fee rule
    const lateFeeRule: AutomationRule = {
      id: 'apply_late_fees',
      name: 'Aplicar Juros e Multa',
      type: 'late_fee',
      isActive: true,
      conditions: [
        {
          field: 'invoice.status',
          operator: 'equals',
          value: 'overdue'
        },
        {
          field: 'invoice.daysOverdue',
          operator: 'greater_than',
          value: 5,
          logicalOperator: 'AND'
        }
      ],
      actions: [
        {
          type: 'apply_fee',
          parameters: {
            feeType: 'compound',
            finePercentage: 2,
            interestRate: 1,
            maxFeePercentage: 20
          }
        }
      ],
      schedule: {
        frequency: 'daily',
        time: '11:00',
        timezone: 'America/Sao_Paulo'
      },
      tenantId: 'default',
      createdAt: new Date().toISOString(),
      executionCount: 0
    };

    // Early payment discount rule
    const earlyDiscountRule: AutomationRule = {
      id: 'early_payment_discount',
      name: 'Desconto Pagamento Antecipado',
      type: 'early_discount',
      isActive: true,
      conditions: [
        {
          field: 'payment.daysBeforeDue',
          operator: 'greater_than',
          value: 5
        },
        {
          field: 'invoice.amount',
          operator: 'greater_than',
          value: 100,
          logicalOperator: 'AND'
        }
      ],
      actions: [
        {
          type: 'apply_discount',
          parameters: {
            discountType: 'percentage',
            discountValue: 5,
            description: 'Desconto pagamento antecipado (5%)'
          }
        }
      ],
      schedule: {
        frequency: 'once',
        timezone: 'America/Sao_Paulo'
      },
      tenantId: 'default',
      createdAt: new Date().toISOString(),
      executionCount: 0
    };

    // Add rules if they don't exist
    if (this.automationRules.length === 0) {
      this.automationRules = [monthlyBillingRule, reminderRule, lateFeeRule, earlyDiscountRule];
      this.saveData();
    }
  }

  private startAutomationEngine(): void {
    // Start automation engine that checks rules every minute
    const engineInterval = setInterval(() => {
      this.executeAutomationRules();
    }, 60 * 1000); // Check every minute

    // Generate cash flow projections daily
    const projectionInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 6 && now.getMinutes() === 0) { // 6 AM daily
        this.generateCashFlowProjections();
      }
    }, 60 * 1000);

    // Cleanup expired data weekly
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 2) { // Sunday 2 AM
        this.cleanupExpiredData();
      }
    }, 60 * 60 * 1000); // Check every hour

    this.automationIntervals.set('engine', engineInterval);
    this.automationIntervals.set('projections', projectionInterval);
    this.automationIntervals.set('cleanup', cleanupInterval);
  }

  private async executeAutomationRules(): Promise<void> {
    const now = new Date();
    
    for (const rule of this.automationRules) {
      if (!rule.isActive) continue;
      
      try {
        const shouldExecute = this.shouldExecuteRule(rule, now);
        if (shouldExecute) {
          await this.executeRule(rule);
          rule.lastExecuted = now.toISOString();
          rule.executionCount++;
        }
      } catch (error) {
        console.error(`Error executing automation rule ${rule.id}:`, error);
      }
    }

    this.saveData();
  }

  private shouldExecuteRule(rule: AutomationRule, now: Date): boolean {
    const schedule = rule.schedule;
    
    // Check if rule should run based on schedule
    if (schedule.frequency === 'once' && rule.lastExecuted) {
      return false; // Already executed
    }

    // Check time constraints
    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      if (now.getHours() !== hours || now.getMinutes() !== minutes) {
        return false;
      }
    }

    // Check frequency constraints
    switch (schedule.frequency) {
      case 'daily':
        return true; // Already checked time above
        
      case 'weekly':
        return schedule.dayOfWeek === undefined || now.getDay() === schedule.dayOfWeek;
        
      case 'monthly':
        return schedule.dayOfMonth === undefined || now.getDate() === schedule.dayOfMonth;
        
      case 'quarterly':
        return (now.getMonth() % 3 === 0) && (schedule.dayOfMonth === undefined || now.getDate() === schedule.dayOfMonth);
        
      case 'annually':
        return (now.getMonth() === 0) && (schedule.dayOfMonth === undefined || now.getDate() === schedule.dayOfMonth);
        
      default:
        return false;
    }
  }

  private async executeRule(rule: AutomationRule): Promise<void> {
    console.log(`Executing automation rule: ${rule.name}`);

    switch (rule.type) {
      case 'recurring_charge':
        await this.executeRecurringChargeRule(rule);
        break;
        
      case 'payment_reminder':
        await this.executePaymentReminderRule(rule);
        break;
        
      case 'late_fee':
        await this.executeLateFeeRule(rule);
        break;
        
      case 'early_discount':
        await this.executeEarlyDiscountRule(rule);
        break;
        
      case 'subscription':
        await this.executeSubscriptionRule(rule);
        break;
    }
  }

  private async executeRecurringChargeRule(rule: AutomationRule): Promise<void> {
    // Get active subscriptions due today
    const today = new Date().toISOString().split('T')[0];
    const dueSubscriptions = this.patientSubscriptions.filter(sub => 
      sub.status === 'active' && 
      sub.nextBillingDate === today
    );

    for (const subscription of dueSubscriptions) {
      try {
        await this.createSubscriptionInvoice(subscription);
        
        // Update next billing date
        const nextDate = this.calculateNextBillingDate(subscription);
        subscription.nextBillingDate = nextDate;
        subscription.updatedAt = new Date().toISOString();
        
      } catch (error) {
        console.error(`Error processing subscription ${subscription.id}:`, error);
        subscription.status = 'past_due';
      }
    }
  }

  private async createSubscriptionInvoice(subscription: PatientSubscription): Promise<void> {
    const { paymentService } = await import('./paymentService');
    
    const items: InvoiceItem[] = [
      {
        id: this.generateId(),
        description: `Mensalidade - ${subscription.planName}`,
        quantity: 1,
        unitPrice: subscription.amount,
        totalPrice: subscription.amount,
        category: 'subscription'
      }
    ];

    const invoice = await paymentService.createInvoice(
      subscription.patientId,
      items,
      subscription.nextBillingDate,
      subscription.tenantId
    );

    // Add to billing history
    subscription.billingHistory.push({
      invoiceId: invoice.id,
      amount: subscription.amount,
      dueDate: subscription.nextBillingDate,
      status: 'pending'
    });

    // Auto-charge if payment method is available
    if (subscription.paymentMethod) {
      try {
        // Attempt auto-charge based on payment method type
        // Implementation would depend on stored payment method
        console.log(`Auto-charging subscription ${subscription.id}`);
      } catch (error) {
        console.error(`Auto-charge failed for subscription ${subscription.id}:`, error);
      }
    }
  }

  private calculateNextBillingDate(subscription: PatientSubscription): string {
    const currentDate = new Date(subscription.nextBillingDate);
    const plan = this.subscriptionPlans.find(p => p.id === subscription.planId);
    
    if (!plan) return subscription.nextBillingDate;

    switch (plan.frequency) {
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 'semi_annual':
        currentDate.setMonth(currentDate.getMonth() + 6);
        break;
      case 'annual':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }

    return currentDate.toISOString().split('T')[0];
  }

  private async executePaymentReminderRule(rule: AutomationRule): Promise<void> {
    const { paymentService } = await import('./paymentService');
    
    // Find invoices that match reminder conditions
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 3); // 3 days from now
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const invoices = paymentService.getInvoices('default'); // Get all invoices
    const eligibleInvoices = invoices.filter(invoice => 
      invoice.dueDate === targetDateStr && 
      invoice.status !== 'paid'
    );

    for (const invoice of eligibleInvoices) {
      // Check if reminder already sent
      const existingReminder = this.paymentReminders.find(r => 
        r.invoiceId === invoice.id && 
        r.type === 'due_soon' && 
        r.status === 'sent'
      );

      if (!existingReminder) {
        await this.createPaymentReminder(invoice, 'due_soon');
      }
    }
  }

  private async createPaymentReminder(
    invoice: PaymentInvoice, 
    type: PaymentReminder['type']
  ): Promise<void> {
    const reminder: PaymentReminder = {
      id: this.generateId(),
      invoiceId: invoice.id,
      patientId: invoice.patientId,
      patientName: invoice.patientName,
      type,
      scheduledDate: new Date().toISOString(),
      status: 'scheduled',
      channels: ['email', 'whatsapp'],
      message: this.generateReminderMessage(invoice, type),
      tenantId: invoice.tenantId,
      createdAt: new Date().toISOString()
    };

    this.paymentReminders.push(reminder);
    
    // Send reminder immediately
    await this.sendPaymentReminder(reminder);
  }

  private generateReminderMessage(invoice: PaymentInvoice, type: PaymentReminder['type']): string {
    const messages = {
      'due_soon': `Olá ${invoice.patientName}, sua fatura #${invoice.number} no valor de R$ ${invoice.amount.toFixed(2)} vence em 3 dias (${new Date(invoice.dueDate).toLocaleDateString('pt-BR')}). Para evitar juros, efetue o pagamento até a data de vencimento.`,
      'overdue': `${invoice.patientName}, sua fatura #${invoice.number} no valor de R$ ${invoice.amount.toFixed(2)} está em atraso desde ${new Date(invoice.dueDate).toLocaleDateString('pt-BR')}. Regularize sua situação o quanto antes para evitar o acúmulo de juros.`,
      'final_notice': `AVISO FINAL: ${invoice.patientName}, sua fatura #${invoice.number} está significativamente em atraso. Entre em contato conosco imediatamente para regularizar sua situação e evitar a suspensão dos serviços.`
    };

    return messages[type];
  }

  private async sendPaymentReminder(reminder: PaymentReminder): Promise<void> {
    try {
      // Send via WhatsApp if enabled
      if (reminder.channels.includes('whatsapp')) {
        const patient = await this.getPatientData(reminder.patientId);
        if (patient?.phone) {
          await whatsappService.sendTextMessage(patient.phone, reminder.message);
        }
      }

      // Send via email if enabled
      if (reminder.channels.includes('email')) {
        // Email sending would be implemented here
        console.log(`Sending email reminder to ${reminder.patientName}`);
      }

      reminder.status = 'sent';
      reminder.sentDate = new Date().toISOString();
      
    } catch (error) {
      console.error(`Error sending payment reminder ${reminder.id}:`, error);
      reminder.status = 'failed';
    }
  }

  private async executeLateFeeRule(rule: AutomationRule): Promise<void> {
    const { paymentService } = await import('./paymentService');
    
    const invoices = paymentService.getInvoices('default');
    const overdueInvoices = invoices.filter(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const today = new Date();
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
      
      return invoice.status !== 'paid' && daysOverdue > 5;
    });

    for (const invoice of overdueInvoices) {
      await this.applyLateFees(invoice);
    }
  }

  private async applyLateFees(invoice: PaymentInvoice): Promise<void> {
    if (invoice.status === 'overdue') return; // Already processed

    const lateFeeRule = this.lateFeeRules.find(rule => 
      rule.isActive && 
      rule.applicableToTypes.includes('all') // Simplified logic
    );

    if (!lateFeeRule) return;

    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));

    if (daysOverdue <= lateFeeRule.gracePeriodDays) return;

    let feeAmount = 0;
    
    if (lateFeeRule.feeType === 'percentage') {
      feeAmount = invoice.originalAmount * (lateFeeRule.feeValue / 100);
    } else if (lateFeeRule.feeType === 'fixed') {
      feeAmount = lateFeeRule.feeValue;
    } else if (lateFeeRule.feeType === 'compound') {
      const monthsOverdue = Math.ceil(daysOverdue / 30);
      const interestAmount = invoice.originalAmount * ((lateFeeRule.interestRate || 1) / 100) * monthsOverdue;
      const fineAmount = invoice.originalAmount * (lateFeeRule.feeValue / 100);
      feeAmount = fineAmount + interestAmount;
    }

    if (lateFeeRule.maximumFee && feeAmount > lateFeeRule.maximumFee) {
      feeAmount = lateFeeRule.maximumFee;
    }

    invoice.amount = invoice.originalAmount + feeAmount;
    invoice.status = 'overdue';
    invoice.updatedAt = new Date().toISOString();
  }

  private async executeEarlyDiscountRule(rule: AutomationRule): Promise<void> {
    // This rule would typically be applied during payment processing
    // when a payment is made early, not as a scheduled automation
    console.log('Early discount rule execution - applies during payment');
  }

  private async executeSubscriptionRule(rule: AutomationRule): Promise<void> {
    // Handle subscription-specific automation like trial expiration, 
    // usage limits, plan changes, etc.
    console.log('Executing subscription-specific automation');
  }

  // Subscription Management
  async createSubscriptionPlan(
    name: string,
    description: string,
    amount: number,
    frequency: SubscriptionPlan['frequency'],
    features: string[],
    tenantId: string,
    trialPeriodDays: number = 7
  ): Promise<SubscriptionPlan> {
    const plan: SubscriptionPlan = {
      id: this.generateId(),
      name,
      description,
      amount,
      frequency,
      trialPeriodDays,
      features,
      isActive: true,
      tenantId,
      createdAt: new Date().toISOString()
    };

    this.subscriptionPlans.push(plan);
    this.saveData();

    return plan;
  }

  async subscribePatient(
    patientId: string,
    planId: string,
    paymentMethod?: any,
    tenantId: string = 'default'
  ): Promise<PatientSubscription> {
    const plan = this.subscriptionPlans.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const patient = await this.getPatientData(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const startDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(startDate.getDate() + plan.trialPeriodDays);
    
    const nextBillingDate = new Date();
    nextBillingDate.setDate(trialEndDate.getDate() + 1);

    const subscription: PatientSubscription = {
      id: this.generateId(),
      patientId,
      patientName: patient.name,
      planId,
      planName: plan.name,
      status: plan.trialPeriodDays > 0 ? 'trial' : 'active',
      startDate: startDate.toISOString().split('T')[0],
      trialEndDate: plan.trialPeriodDays > 0 ? trialEndDate.toISOString().split('T')[0] : undefined,
      nextBillingDate: nextBillingDate.toISOString().split('T')[0],
      amount: plan.amount,
      paymentMethod,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      billingHistory: [],
      usageMetrics: []
    };

    this.patientSubscriptions.push(subscription);
    this.saveData();

    return subscription;
  }

  // Early Payment Discount Management
  async createEarlyPaymentDiscount(
    name: string,
    description: string,
    discountType: EarlyPaymentDiscount['discountType'],
    discountValue: number,
    daysInAdvance: number,
    tenantId: string,
    applicableToTypes: EarlyPaymentDiscount['applicableToTypes'] = ['all'],
    minimumAmount?: number,
    maximumDiscount?: number,
    validUntil?: string
  ): Promise<EarlyPaymentDiscount> {
    const discount: EarlyPaymentDiscount = {
      id: this.generateId(),
      name,
      description,
      discountType,
      discountValue,
      daysInAdvance,
      applicableToTypes,
      minimumAmount,
      maximumDiscount,
      isActive: true,
      tenantId,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil,
      usageCount: 0
    };

    this.earlyDiscounts.push(discount);
    this.saveData();

    return discount;
  }

  async applyEarlyPaymentDiscount(
    invoiceAmount: number,
    daysBeforeDue: number,
    invoiceType: string,
    tenantId: string
  ): Promise<{ discountAmount: number; discountDescription: string } | null> {
    const applicableDiscounts = this.earlyDiscounts.filter(discount => 
      discount.isActive &&
      discount.tenantId === tenantId &&
      discount.daysInAdvance <= daysBeforeDue &&
      (discount.applicableToTypes.includes('all') || discount.applicableToTypes.includes(invoiceType as any)) &&
      (!discount.minimumAmount || invoiceAmount >= discount.minimumAmount) &&
      (!discount.validUntil || new Date() <= new Date(discount.validUntil)) &&
      (!discount.usageLimit || discount.usageCount < discount.usageLimit)
    );

    if (applicableDiscounts.length === 0) return null;

    // Apply the best discount (highest value)
    const bestDiscount = applicableDiscounts.reduce((best, current) => {
      const currentValue = current.discountType === 'percentage' 
        ? invoiceAmount * (current.discountValue / 100)
        : current.discountValue;
      
      const bestValue = best.discountType === 'percentage'
        ? invoiceAmount * (best.discountValue / 100)
        : best.discountValue;

      return currentValue > bestValue ? current : best;
    });

    let discountAmount = bestDiscount.discountType === 'percentage'
      ? invoiceAmount * (bestDiscount.discountValue / 100)
      : bestDiscount.discountValue;

    if (bestDiscount.maximumDiscount && discountAmount > bestDiscount.maximumDiscount) {
      discountAmount = bestDiscount.maximumDiscount;
    }

    // Update usage count
    bestDiscount.usageCount++;
    this.saveData();

    return {
      discountAmount,
      discountDescription: bestDiscount.description
    };
  }

  // Cash Flow Projections
  private async generateCashFlowProjections(): Promise<void> {
    const tenants = this.getUniqueTenantIds();
    
    for (const tenantId of tenants) {
      for (let monthsAhead = 1; monthsAhead <= 12; monthsAhead++) {
        const projectionDate = new Date();
        projectionDate.setMonth(projectionDate.getMonth() + monthsAhead);
        const period = `${projectionDate.getFullYear()}-${(projectionDate.getMonth() + 1).toString().padStart(2, '0')}`;

        const projection = await this.calculateCashFlowProjection(tenantId, period);
        
        // Remove existing projection for same period
        this.cashFlowProjections = this.cashFlowProjections.filter(p => 
          !(p.tenantId === tenantId && p.period === period)
        );
        
        this.cashFlowProjections.push(projection);
      }
    }

    this.saveData();
  }

  private async calculateCashFlowProjection(tenantId: string, period: string): Promise<CashFlowProjection> {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Calculate recurring income from active subscriptions
    const activeSubscriptions = this.patientSubscriptions.filter(sub => 
      sub.tenantId === tenantId && 
      sub.status === 'active'
    );

    const recurringIncome = activeSubscriptions.reduce((total, sub) => {
      const plan = this.subscriptionPlans.find(p => p.id === sub.planId);
      if (!plan) return total;

      // Calculate how many billing cycles in this month
      const billingDate = new Date(sub.nextBillingDate);
      if (billingDate.getMonth() === month - 1 && billingDate.getFullYear() === year) {
        return total + sub.amount;
      }
      return total;
    }, 0);

    // Estimate one-time income based on historical data
    const { paymentService } = await import('./paymentService');
    const historicalTransactions = paymentService.getTransactions(tenantId);
    const lastMonthTransactions = historicalTransactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return transactionDate.getMonth() === lastMonth.getMonth() &&
             transactionDate.getFullYear() === lastMonth.getFullYear() &&
             t.status === 'paid' &&
             t.metadata.source !== 'recurring';
    });

    const lastMonthOneTimeIncome = lastMonthTransactions.reduce((total, t) => total + t.amount, 0);
    const projectedOneTimeIncome = lastMonthOneTimeIncome * 0.9; // Conservative estimate

    const totalProjectedIncome = recurringIncome + projectedOneTimeIncome;

    // Estimate expenses (simplified - would be more complex in real implementation)
    const estimatedFixedExpenses = totalProjectedIncome * 0.3; // 30% for fixed costs
    const estimatedVariableExpenses = totalProjectedIncome * 0.2; // 20% for variable costs
    const totalExpenses = estimatedFixedExpenses + estimatedVariableExpenses;

    const netCashFlow = totalProjectedIncome - totalExpenses;

    // Calculate confidence level based on data quality
    const confidenceLevel = Math.min(90, 50 + (activeSubscriptions.length * 2)); // Higher confidence with more subscriptions

    // Generate scenarios
    const scenarios = {
      optimistic: netCashFlow * 1.2,
      realistic: netCashFlow,
      pessimistic: netCashFlow * 0.7
    };

    return {
      tenantId,
      period,
      projectedIncome: {
        recurring: recurringIncome,
        oneTime: projectedOneTimeIncome,
        total: totalProjectedIncome
      },
      projectedExpenses: {
        fixed: estimatedFixedExpenses,
        variable: estimatedVariableExpenses,
        total: totalExpenses
      },
      netCashFlow,
      confidenceLevel,
      scenarios,
      assumptions: [
        'Baseado em assinaturas ativas atuais',
        'Receita única estimada com base no mês anterior',
        'Despesas estimadas como percentual da receita',
        'Não considera eventos extraordinários'
      ],
      generatedAt: new Date().toISOString()
    };
  }

  // Utility Methods
  private getUniqueTenantIds(): string[] {
    const tenantIds = new Set<string>();
    
    this.automationRules.forEach(rule => tenantIds.add(rule.tenantId));
    this.subscriptionPlans.forEach(plan => tenantIds.add(plan.tenantId));
    this.patientSubscriptions.forEach(sub => tenantIds.add(sub.tenantId));
    
    return Array.from(tenantIds);
  }

  private async getPatientData(patientId: string): Promise<Patient | null> {
    try {
      const patients = JSON.parse(localStorage.getItem('patients') || '[]');
      return patients.find((p: Patient) => p.id === patientId) || null;
    } catch {
      return null;
    }
  }

  private cleanupExpiredData(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    // Cleanup old payment reminders
    this.paymentReminders = this.paymentReminders.filter(reminder => 
      reminder.createdAt > cutoffDate || reminder.status === 'scheduled'
    );

    // Cleanup old cash flow projections (keep only last 3 months of historical data)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const historicalCutoff = `${threeMonthsAgo.getFullYear()}-${(threeMonthsAgo.getMonth() + 1).toString().padStart(2, '0')}`;

    this.cashFlowProjections = this.cashFlowProjections.filter(projection => 
      projection.period >= historicalCutoff
    );

    this.saveData();
  }

  private generateId(): string {
    return `FA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API Methods
  getAutomationRules(tenantId: string): AutomationRule[] {
    return this.automationRules.filter(rule => rule.tenantId === tenantId);
  }

  getSubscriptionPlans(tenantId: string): SubscriptionPlan[] {
    return this.subscriptionPlans.filter(plan => plan.tenantId === tenantId);
  }

  getPatientSubscriptions(tenantId: string): PatientSubscription[] {
    return this.patientSubscriptions.filter(sub => sub.tenantId === tenantId);
  }

  getPaymentReminders(tenantId: string): PaymentReminder[] {
    return this.paymentReminders.filter(reminder => reminder.tenantId === tenantId);
  }

  getEarlyPaymentDiscounts(tenantId: string): EarlyPaymentDiscount[] {
    return this.earlyDiscounts.filter(discount => discount.tenantId === tenantId);
  }

  getLateFeeRules(tenantId: string): LateFeeRule[] {
    return this.lateFeeRules.filter(rule => rule.tenantId === tenantId);
  }

  getCashFlowProjections(tenantId: string): CashFlowProjection[] {
    return this.cashFlowProjections.filter(projection => projection.tenantId === tenantId);
  }

  async createAutomationRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'executionCount'>): Promise<AutomationRule> {
    const newRule: AutomationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      executionCount: 0
    };

    this.automationRules.push(newRule);
    this.saveData();

    return newRule;
  }

  async updateAutomationRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule | undefined> {
    const ruleIndex = this.automationRules.findIndex(rule => rule.id === id);
    if (ruleIndex === -1) return undefined;

    this.automationRules[ruleIndex] = { ...this.automationRules[ruleIndex], ...updates };
    this.saveData();

    return this.automationRules[ruleIndex];
  }

  async deleteAutomationRule(id: string): Promise<boolean> {
    const initialLength = this.automationRules.length;
    this.automationRules = this.automationRules.filter(rule => rule.id !== id);
    
    if (this.automationRules.length < initialLength) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Force execution of automation rules (for testing/manual triggers)
  async forceExecuteRule(ruleId: string): Promise<void> {
    const rule = this.automationRules.find(r => r.id === ruleId);
    if (rule) {
      await this.executeRule(rule);
      rule.lastExecuted = new Date().toISOString();
      rule.executionCount++;
      this.saveData();
    }
  }

  // Manual cash flow projection generation
  async generateManualCashFlowProjection(tenantId: string): Promise<void> {
    for (let monthsAhead = 1; monthsAhead <= 12; monthsAhead++) {
      const projectionDate = new Date();
      projectionDate.setMonth(projectionDate.getMonth() + monthsAhead);
      const period = `${projectionDate.getFullYear()}-${(projectionDate.getMonth() + 1).toString().padStart(2, '0')}`;

      const projection = await this.calculateCashFlowProjection(tenantId, period);
      
      // Remove existing projection for same period
      this.cashFlowProjections = this.cashFlowProjections.filter(p => 
        !(p.tenantId === tenantId && p.period === period)
      );
      
      this.cashFlowProjections.push(projection);
    }

    this.saveData();
  }
}

export const financialAutomationService = new FinancialAutomationService();

// React Hook for Financial Automation
export const useFinancialAutomation = () => {
  const createSubscriptionPlan = (
    name: string,
    description: string,
    amount: number,
    frequency: SubscriptionPlan['frequency'],
    features: string[],
    tenantId: string,
    trialPeriodDays?: number
  ) => financialAutomationService.createSubscriptionPlan(name, description, amount, frequency, features, tenantId, trialPeriodDays);

  const subscribePatient = (patientId: string, planId: string, paymentMethod: any, tenantId: string) =>
    financialAutomationService.subscribePatient(patientId, planId, paymentMethod, tenantId);

  const createEarlyPaymentDiscount = (
    name: string,
    description: string,
    discountType: EarlyPaymentDiscount['discountType'],
    discountValue: number,
    daysInAdvance: number,
    tenantId: string,
    applicableToTypes?: EarlyPaymentDiscount['applicableToTypes'],
    minimumAmount?: number,
    maximumDiscount?: number,
    validUntil?: string
  ) => financialAutomationService.createEarlyPaymentDiscount(
    name, description, discountType, discountValue, daysInAdvance, tenantId, 
    applicableToTypes, minimumAmount, maximumDiscount, validUntil
  );

  const applyEarlyPaymentDiscount = (invoiceAmount: number, daysBeforeDue: number, invoiceType: string, tenantId: string) =>
    financialAutomationService.applyEarlyPaymentDiscount(invoiceAmount, daysBeforeDue, invoiceType, tenantId);

  const getAutomationRules = (tenantId: string) => financialAutomationService.getAutomationRules(tenantId);
  const getSubscriptionPlans = (tenantId: string) => financialAutomationService.getSubscriptionPlans(tenantId);
  const getPatientSubscriptions = (tenantId: string) => financialAutomationService.getPatientSubscriptions(tenantId);
  const getPaymentReminders = (tenantId: string) => financialAutomationService.getPaymentReminders(tenantId);
  const getEarlyPaymentDiscounts = (tenantId: string) => financialAutomationService.getEarlyPaymentDiscounts(tenantId);
  const getLateFeeRules = (tenantId: string) => financialAutomationService.getLateFeeRules(tenantId);
  const getCashFlowProjections = (tenantId: string) => financialAutomationService.getCashFlowProjections(tenantId);

  const createAutomationRule = (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'executionCount'>) =>
    financialAutomationService.createAutomationRule(rule);
  
  const updateAutomationRule = (id: string, updates: Partial<AutomationRule>) =>
    financialAutomationService.updateAutomationRule(id, updates);
  
  const deleteAutomationRule = (id: string) => financialAutomationService.deleteAutomationRule(id);
  const forceExecuteRule = (ruleId: string) => financialAutomationService.forceExecuteRule(ruleId);
  const generateManualCashFlowProjection = (tenantId: string) => 
    financialAutomationService.generateManualCashFlowProjection(tenantId);

  return {
    createSubscriptionPlan,
    subscribePatient,
    createEarlyPaymentDiscount,
    applyEarlyPaymentDiscount,
    getAutomationRules,
    getSubscriptionPlans,
    getPatientSubscriptions,
    getPaymentReminders,
    getEarlyPaymentDiscounts,
    getLateFeeRules,
    getCashFlowProjections,
    createAutomationRule,
    updateAutomationRule,
    deleteAutomationRule,
    forceExecuteRule,
    generateManualCashFlowProjection
  };
};