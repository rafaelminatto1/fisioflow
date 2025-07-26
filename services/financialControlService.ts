import { PaymentTransaction, PaymentInvoice } from './paymentService';

// Financial Control Types
export interface BankAccount {
  id: string;
  name: string;
  bankCode: string;
  bankName: string;
  agencyNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'business';
  balance: number;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: 'payment_received' | 'fee' | 'transfer' | 'withdrawal' | 'deposit' | 'other';
  reference?: string;
  reconciled: boolean;
  reconciledAt?: string;
  reconciledBy?: string;
  tenantId: string;
  createdAt: string;
  
  // Integration data
  bankTransactionId?: string;
  gatewayTransactionId?: string;
  paymentTransactionId?: string;
}

export interface ReconciliationMatch {
  id: string;
  bankTransactionId: string;
  paymentTransactionId: string;
  matchType: 'exact' | 'partial' | 'manual';
  matchScore: number; // 0-100
  amountDifference: number;
  dateDifference: number; // in days
  confidence: 'high' | 'medium' | 'low';
  status: 'matched' | 'pending_review' | 'rejected';
  matchedBy?: string;
  matchedAt?: string;
  notes?: string;
  tenantId: string;
  createdAt: string;
}

export interface ReconciliationReport {
  id: string;
  accountId: string;
  accountName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  status: 'in_progress' | 'completed' | 'needs_review';
  
  // Summary data
  totalBankTransactions: number;
  totalPaymentTransactions: number;
  matchedTransactions: number;
  unmatchedBankTransactions: number;
  unmatchedPaymentTransactions: number;
  
  // Financial summary
  bankBalance: number;
  systemBalance: number;
  variance: number;
  
  // Detailed results
  matches: ReconciliationMatch[];
  unmatchedBankTransactions: BankTransaction[];
  unmatchedPaymentTransactions: PaymentTransaction[];
  
  generatedAt: string;
  generatedBy: string;
  tenantId: string;
}

export interface FinancialRule {
  id: string;
  name: string;
  description: string;
  type: 'categorization' | 'matching' | 'validation' | 'notification';
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  tenantId: string;
  createdAt: string;
  executionCount: number;
  lastExecuted?: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'set_category' | 'create_match' | 'flag_for_review' | 'send_notification' | 'create_adjustment';
  parameters: Record<string, any>;
}

export interface FinancialAdjustment {
  id: string;
  type: 'bank_error' | 'system_error' | 'fee_adjustment' | 'correction' | 'manual_entry';
  description: string;
  amount: number;
  accountId: string;
  relatedTransactionId?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
  tenantId: string;
}

export interface CashFlowStatement {
  tenantId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Operating activities
  operatingActivities: {
    receiptsFromCustomers: number;
    paymentsToSuppliers: number;
    employeePayments: number;
    interestReceived: number;
    interestPaid: number;
    taxesPaid: number;
    netOperatingCashFlow: number;
  };
  
  // Investing activities
  investingActivities: {
    equipmentPurchases: number;
    equipmentSales: number;
    investmentPurchases: number;
    investmentSales: number;
    netInvestingCashFlow: number;
  };
  
  // Financing activities
  financingActivities: {
    loanProceeds: number;
    loanRepayments: number;
    ownerContributions: number;
    ownerWithdrawals: number;
    netFinancingCashFlow: number;
  };
  
  // Summary
  netCashFlowChange: number;
  beginningCashBalance: number;
  endingCashBalance: number;
  
  generatedAt: string;
}

export interface InadimplenceAnalysis {
  tenantId: string;
  analysisDate: string;
  
  // Current status
  totalOutstandingAmount: number;
  totalOverdueAmount: number;
  totalCustomersInDebt: number;
  averageDebtPerCustomer: number;
  
  // Age analysis
  debtByAge: {
    current: { amount: number; count: number }; // 0-30 days
    thirtyDays: { amount: number; count: number }; // 31-60 days
    sixtyDays: { amount: number; count: number }; // 61-90 days
    ninetyDays: { amount: number; count: number }; // 91-120 days
    overOneHundredTwenty: { amount: number; count: number }; // 120+ days
  };
  
  // Customer analysis
  topDebtors: {
    patientId: string;
    patientName: string;
    totalDebt: number;
    oldestDebtDate: string;
    invoiceCount: number;
  }[];
  
  // Trends
  monthlyTrend: {
    month: string;
    totalDebt: number;
    newDebts: number;
    recoveredDebts: number;
    writeOffs: number;
  }[];
  
  // Recovery metrics
  recoveryMetrics: {
    recoveryRate: number; // Percentage of debts recovered
    averageRecoveryTime: number; // Days
    totalRecoveredAmount: number;
    totalWrittenOffAmount: number;
  };
  
  // Recommendations
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: string;
  }[];
}

export interface ContabilityIntegration {
  id: string;
  name: string;
  type: 'sped' | 'nfe' | 'nfse' | 'contabil' | 'fiscal';
  provider: string;
  configuration: {
    apiUrl?: string;
    apiKey?: string;
    companyId?: string;
    certificatePath?: string;
    environment: 'production' | 'sandbox';
  };
  isActive: boolean;
  lastSync?: string;
  syncErrors?: string[];
  tenantId: string;
  createdAt: string;
}

export interface ContabilityEntry {
  id: string;
  integrationId: string;
  entryType: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity';
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  documentNumber?: string;
  relatedTransactionId?: string;
  status: 'pending' | 'sent' | 'confirmed' | 'error';
  errorMessage?: string;
  externalId?: string;
  tenantId: string;
  createdAt: string;
}

class FinancialControlService {
  private bankAccounts: BankAccount[] = [];
  private bankTransactions: BankTransaction[] = [];
  private reconciliationMatches: ReconciliationMatch[] = [];
  private reconciliationReports: ReconciliationReport[] = [];
  private financialRules: FinancialRule[] = [];
  private financialAdjustments: FinancialAdjustment[] = [];
  private cashFlowStatements: CashFlowStatement[] = [];
  private inadimplenceAnalyses: InadimplenceAnalysis[] = [];
  private contabilityIntegrations: ContabilityIntegration[] = [];
  private contabilityEntries: ContabilityEntry[] = [];

  constructor() {
    this.loadStoredData();
    this.initializeDefaultRules();
    this.startReconciliationEngine();
  }

  private loadStoredData(): void {
    try {
      const storedAccounts = localStorage.getItem('bank_accounts');
      if (storedAccounts) {
        this.bankAccounts = JSON.parse(storedAccounts);
      }

      const storedBankTransactions = localStorage.getItem('bank_transactions');
      if (storedBankTransactions) {
        this.bankTransactions = JSON.parse(storedBankTransactions);
      }

      const storedMatches = localStorage.getItem('reconciliation_matches');
      if (storedMatches) {
        this.reconciliationMatches = JSON.parse(storedMatches);
      }

      const storedReports = localStorage.getItem('reconciliation_reports');
      if (storedReports) {
        this.reconciliationReports = JSON.parse(storedReports);
      }

      const storedRules = localStorage.getItem('financial_rules');
      if (storedRules) {
        this.financialRules = JSON.parse(storedRules);
      }

      const storedAdjustments = localStorage.getItem('financial_adjustments');
      if (storedAdjustments) {
        this.financialAdjustments = JSON.parse(storedAdjustments);
      }

      const storedCashFlow = localStorage.getItem('cash_flow_statements');
      if (storedCashFlow) {
        this.cashFlowStatements = JSON.parse(storedCashFlow);
      }

      const storedAnalyses = localStorage.getItem('inadimplence_analyses');
      if (storedAnalyses) {
        this.inadimplenceAnalyses = JSON.parse(storedAnalyses);
      }

      const storedIntegrations = localStorage.getItem('contability_integrations');
      if (storedIntegrations) {
        this.contabilityIntegrations = JSON.parse(storedIntegrations);
      }

      const storedEntries = localStorage.getItem('contability_entries');
      if (storedEntries) {
        this.contabilityEntries = JSON.parse(storedEntries);
      }
    } catch (error) {
      console.error('Error loading financial control data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('bank_accounts', JSON.stringify(this.bankAccounts));
      localStorage.setItem('bank_transactions', JSON.stringify(this.bankTransactions));
      localStorage.setItem('reconciliation_matches', JSON.stringify(this.reconciliationMatches));
      localStorage.setItem('reconciliation_reports', JSON.stringify(this.reconciliationReports));
      localStorage.setItem('financial_rules', JSON.stringify(this.financialRules));
      localStorage.setItem('financial_adjustments', JSON.stringify(this.financialAdjustments));
      localStorage.setItem('cash_flow_statements', JSON.stringify(this.cashFlowStatements));
      localStorage.setItem('inadimplence_analyses', JSON.stringify(this.inadimplenceAnalyses));
      localStorage.setItem('contability_integrations', JSON.stringify(this.contabilityIntegrations));
      localStorage.setItem('contability_entries', JSON.stringify(this.contabilityEntries));
    } catch (error) {
      console.error('Error saving financial control data:', error);
    }
  }

  private initializeDefaultRules(): void {
    if (this.financialRules.length === 0) {
      const defaultRules: FinancialRule[] = [
        {
          id: 'auto_categorize_pix',
          name: 'Categorizar PIX Automaticamente',
          description: 'Categoriza transações PIX como pagamentos recebidos',
          type: 'categorization',
          isActive: true,
          conditions: [
            {
              field: 'description',
              operator: 'contains',
              value: 'PIX'
            }
          ],
          actions: [
            {
              type: 'set_category',
              parameters: {
                category: 'payment_received'
              }
            }
          ],
          priority: 1,
          tenantId: 'default',
          createdAt: new Date().toISOString(),
          executionCount: 0
        },
        {
          id: 'match_by_amount_date',
          name: 'Conciliação por Valor e Data',
          description: 'Faz correspondência automática por valor e data próxima',
          type: 'matching',
          isActive: true,
          conditions: [
            {
              field: 'amount_difference',
              operator: 'equals',
              value: 0
            },
            {
              field: 'date_difference',
              operator: 'less_than',
              value: 2,
              logicalOperator: 'AND'
            }
          ],
          actions: [
            {
              type: 'create_match',
              parameters: {
                confidence: 'high',
                auto_approve: true
              }
            }
          ],
          priority: 2,
          tenantId: 'default',
          createdAt: new Date().toISOString(),
          executionCount: 0
        },
        {
          id: 'flag_large_discrepancies',
          name: 'Sinalizar Grandes Discrepâncias',
          description: 'Sinaliza transações com grandes diferenças para revisão',
          type: 'validation',
          isActive: true,
          conditions: [
            {
              field: 'amount_difference',
              operator: 'greater_than',
              value: 100
            }
          ],
          actions: [
            {
              type: 'flag_for_review',
              parameters: {
                priority: 'high',
                reason: 'Large amount discrepancy detected'
              }
            }
          ],
          priority: 3,
          tenantId: 'default',
          createdAt: new Date().toISOString(),
          executionCount: 0
        }
      ];

      this.financialRules = defaultRules;
      this.saveData();
    }
  }

  private startReconciliationEngine(): void {
    // Auto-reconciliation runs every hour
    setInterval(() => {
      this.runAutoReconciliation();
    }, 60 * 60 * 1000);

    // Generate inadimplence analysis daily
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 7 && now.getMinutes() === 0) { // 7 AM daily
        this.generateInadimplenceAnalysis();
      }
    }, 60 * 1000);

    // Generate cash flow statements monthly
    setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 8) { // 1st of month, 8 AM
        this.generateMonthlyCashFlowStatement();
      }
    }, 60 * 60 * 1000);
  }

  // Bank Account Management
  async createBankAccount(
    name: string,
    bankCode: string,
    bankName: string,
    agencyNumber: string,
    accountNumber: string,
    accountType: BankAccount['accountType'],
    tenantId: string,
    initialBalance: number = 0
  ): Promise<BankAccount> {
    const account: BankAccount = {
      id: this.generateId(),
      name,
      bankCode,
      bankName,
      agencyNumber,
      accountNumber,
      accountType,
      balance: initialBalance,
      isActive: true,
      tenantId,
      createdAt: new Date().toISOString()
    };

    this.bankAccounts.push(account);
    this.saveData();

    return account;
  }

  async importBankTransactions(
    accountId: string,
    transactions: Omit<BankTransaction, 'id' | 'accountId' | 'reconciled' | 'tenantId' | 'createdAt'>[]
  ): Promise<BankTransaction[]> {
    const account = this.bankAccounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    const importedTransactions: BankTransaction[] = [];

    for (const transactionData of transactions) {
      // Check for duplicates
      const existingTransaction = this.bankTransactions.find(bt => 
        bt.accountId === accountId &&
        bt.bankTransactionId === transactionData.bankTransactionId &&
        bt.amount === transactionData.amount &&
        bt.date === transactionData.date
      );

      if (!existingTransaction) {
        const transaction: BankTransaction = {
          ...transactionData,
          id: this.generateId(),
          accountId,
          reconciled: false,
          tenantId: account.tenantId,
          createdAt: new Date().toISOString()
        };

        this.bankTransactions.push(transaction);
        importedTransactions.push(transaction);

        // Update account balance
        if (transaction.type === 'credit') {
          account.balance += transaction.amount;
        } else {
          account.balance -= transaction.amount;
        }
      }
    }

    // Apply financial rules to new transactions
    await this.applyFinancialRules(importedTransactions);

    this.saveData();
    return importedTransactions;
  }

  // Reconciliation Methods
  private async runAutoReconciliation(): Promise<void> {
    console.log('Running auto-reconciliation...');

    const tenants = this.getUniqueTenantIds();
    
    for (const tenantId of tenants) {
      await this.reconcileTenant(tenantId);
    }
  }

  private async reconcileTenant(tenantId: string): Promise<void> {
    const { paymentService } = await import('./paymentService');
    
    const bankTransactions = this.bankTransactions.filter(bt => 
      bt.tenantId === tenantId && !bt.reconciled
    );
    
    const paymentTransactions = paymentService.getTransactions(tenantId).filter(pt => 
      pt.status === 'paid' && 
      !this.reconciliationMatches.some(rm => rm.paymentTransactionId === pt.id && rm.status === 'matched')
    );

    for (const bankTransaction of bankTransactions) {
      const potentialMatches = this.findPotentialMatches(bankTransaction, paymentTransactions);
      
      for (const match of potentialMatches) {
        if (match.matchScore >= 85 && match.confidence === 'high') {
          // Auto-approve high-confidence matches
          await this.createReconciliationMatch(
            bankTransaction.id,
            match.paymentTransactionId,
            'exact',
            match.matchScore,
            'high',
            'matched'
          );
          break;
        } else if (match.matchScore >= 60) {
          // Create pending matches for manual review
          await this.createReconciliationMatch(
            bankTransaction.id,
            match.paymentTransactionId,
            match.matchScore >= 80 ? 'exact' : 'partial',
            match.matchScore,
            match.matchScore >= 80 ? 'medium' : 'low',
            'pending_review'
          );
        }
      }
    }

    this.saveData();
  }

  private findPotentialMatches(
    bankTransaction: BankTransaction,
    paymentTransactions: PaymentTransaction[]
  ): (ReconciliationMatch & { paymentTransactionId: string })[] {
    const matches: (ReconciliationMatch & { paymentTransactionId: string })[] = [];

    for (const paymentTransaction of paymentTransactions) {
      const matchScore = this.calculateMatchScore(bankTransaction, paymentTransaction);
      const amountDifference = Math.abs(bankTransaction.amount - paymentTransaction.amount);
      const dateDifference = this.calculateDateDifference(bankTransaction.date, paymentTransaction.createdAt);

      if (matchScore >= 50) { // Minimum threshold
        matches.push({
          id: this.generateId(),
          bankTransactionId: bankTransaction.id,
          paymentTransactionId: paymentTransaction.id,
          matchType: matchScore >= 85 ? 'exact' : 'partial',
          matchScore,
          amountDifference,
          dateDifference,
          confidence: matchScore >= 85 ? 'high' : matchScore >= 70 ? 'medium' : 'low',
          status: 'pending_review',
          tenantId: bankTransaction.tenantId,
          createdAt: new Date().toISOString()
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateMatchScore(
    bankTransaction: BankTransaction,
    paymentTransaction: PaymentTransaction
  ): number {
    let score = 0;

    // Amount matching (40% weight)
    const amountDifference = Math.abs(bankTransaction.amount - paymentTransaction.amount);
    const amountPercentDiff = (amountDifference / paymentTransaction.amount) * 100;
    
    if (amountDifference === 0) {
      score += 40;
    } else if (amountPercentDiff <= 1) {
      score += 35;
    } else if (amountPercentDiff <= 5) {
      score += 25;
    } else if (amountPercentDiff <= 10) {
      score += 15;
    }

    // Date matching (30% weight)
    const dateDifference = this.calculateDateDifference(bankTransaction.date, paymentTransaction.createdAt);
    
    if (dateDifference === 0) {
      score += 30;
    } else if (dateDifference <= 1) {
      score += 25;
    } else if (dateDifference <= 3) {
      score += 20;
    } else if (dateDifference <= 7) {
      score += 10;
    }

    // Description/reference matching (20% weight)
    if (bankTransaction.reference && paymentTransaction.gatewayTransactionId) {
      if (bankTransaction.reference.includes(paymentTransaction.gatewayTransactionId)) {
        score += 20;
      }
    }

    // Payment method matching (10% weight)
    if (bankTransaction.category === 'payment_received' && 
        paymentTransaction.paymentMethod.type === 'pix' &&
        bankTransaction.description.toLowerCase().includes('pix')) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private calculateDateDifference(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(Math.floor((d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000)));
  }

  private async createReconciliationMatch(
    bankTransactionId: string,
    paymentTransactionId: string,
    matchType: ReconciliationMatch['matchType'],
    matchScore: number,
    confidence: ReconciliationMatch['confidence'],
    status: ReconciliationMatch['status'],
    matchedBy?: string
  ): Promise<ReconciliationMatch> {
    const bankTransaction = this.bankTransactions.find(bt => bt.id === bankTransactionId);
    const { paymentService } = await import('./paymentService');
    const paymentTransaction = paymentService.getTransaction(paymentTransactionId);

    if (!bankTransaction || !paymentTransaction) {
      throw new Error('Transaction not found');
    }

    const match: ReconciliationMatch = {
      id: this.generateId(),
      bankTransactionId,
      paymentTransactionId,
      matchType,
      matchScore,
      amountDifference: Math.abs(bankTransaction.amount - paymentTransaction.amount),
      dateDifference: this.calculateDateDifference(bankTransaction.date, paymentTransaction.createdAt),
      confidence,
      status,
      matchedBy,
      matchedAt: status === 'matched' ? new Date().toISOString() : undefined,
      tenantId: bankTransaction.tenantId,
      createdAt: new Date().toISOString()
    };

    this.reconciliationMatches.push(match);

    // Mark bank transaction as reconciled if matched
    if (status === 'matched') {
      bankTransaction.reconciled = true;
      bankTransaction.reconciledAt = new Date().toISOString();
      bankTransaction.reconciledBy = matchedBy;
      bankTransaction.paymentTransactionId = paymentTransactionId;
    }

    return match;
  }

  // Financial Rules Engine
  private async applyFinancialRules(transactions: BankTransaction[]): Promise<void> {
    const activeRules = this.financialRules.filter(rule => rule.isActive);

    for (const transaction of transactions) {
      for (const rule of activeRules) {
        if (this.evaluateRuleConditions(rule.conditions, transaction)) {
          await this.executeRuleActions(rule.actions, transaction);
          rule.executionCount++;
          rule.lastExecuted = new Date().toISOString();
        }
      }
    }
  }

  private evaluateRuleConditions(conditions: RuleCondition[], transaction: BankTransaction): boolean {
    if (conditions.length === 0) return true;

    let result = this.evaluateCondition(conditions[0], transaction);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, transaction);

      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(condition: RuleCondition, transaction: BankTransaction): boolean {
    const fieldValue = this.getFieldValue(condition.field, transaction);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      case 'starts_with':
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().startsWith(condition.value.toLowerCase());
      case 'ends_with':
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().endsWith(condition.value.toLowerCase());
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'between':
        return typeof fieldValue === 'number' && 
               Array.isArray(condition.value) && 
               fieldValue >= condition.value[0] && 
               fieldValue <= condition.value[1];
      default:
        return false;
    }
  }

  private getFieldValue(field: string, transaction: BankTransaction): any {
    const fields = field.split('.');
    let value: any = transaction;

    for (const f of fields) {
      value = value?.[f];
    }

    return value;
  }

  private async executeRuleActions(actions: RuleAction[], transaction: BankTransaction): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'set_category':
          transaction.category = action.parameters.category;
          break;
          
        case 'flag_for_review':
          // Create a financial adjustment for review
          await this.createFinancialAdjustment(
            'correction',
            action.parameters.reason || 'Flagged by financial rule',
            0,
            transaction.accountId,
            transaction.id,
            action.parameters.reason || 'Review required',
            'system'
          );
          break;
          
        case 'send_notification':
          console.log(`Notification: ${action.parameters.message || 'Transaction flagged for review'}`);
          break;
      }
    }
  }

  // Reconciliation Reports
  async generateReconciliationReport(
    accountId: string,
    startDate: string,
    endDate: string,
    generatedBy: string
  ): Promise<ReconciliationReport> {
    const account = this.bankAccounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    const { paymentService } = await import('./paymentService');

    // Get transactions for the period
    const bankTransactions = this.bankTransactions.filter(bt => 
      bt.accountId === accountId &&
      bt.date >= startDate &&
      bt.date <= endDate
    );

    const paymentTransactions = paymentService.getTransactions(account.tenantId).filter(pt => 
      pt.createdAt >= startDate &&
      pt.createdAt <= endDate &&
      pt.status === 'paid'
    );

    // Get matches for the period
    const matches = this.reconciliationMatches.filter(rm => 
      rm.tenantId === account.tenantId &&
      bankTransactions.some(bt => bt.id === rm.bankTransactionId)
    );

    // Find unmatched transactions
    const matchedBankTransactionIds = new Set(matches.map(m => m.bankTransactionId));
    const matchedPaymentTransactionIds = new Set(matches.map(m => m.paymentTransactionId));

    const unmatchedBankTransactions = bankTransactions.filter(bt => 
      !matchedBankTransactionIds.has(bt.id)
    );

    const unmatchedPaymentTransactions = paymentTransactions.filter(pt => 
      !matchedPaymentTransactionIds.has(pt.id)
    );

    // Calculate balances
    const bankBalance = account.balance;
    const systemBalance = paymentTransactions.reduce((sum, pt) => sum + pt.amount, 0);
    const variance = bankBalance - systemBalance;

    const report: ReconciliationReport = {
      id: this.generateId(),
      accountId,
      accountName: account.name,
      period: { startDate, endDate },
      status: variance === 0 && unmatchedBankTransactions.length === 0 && unmatchedPaymentTransactions.length === 0 
        ? 'completed' 
        : Math.abs(variance) > 100 ? 'needs_review' : 'in_progress',
      totalBankTransactions: bankTransactions.length,
      totalPaymentTransactions: paymentTransactions.length,
      matchedTransactions: matches.filter(m => m.status === 'matched').length,
      unmatchedBankTransactions: unmatchedBankTransactions.length,
      unmatchedPaymentTransactions: unmatchedPaymentTransactions.length,
      bankBalance,
      systemBalance,
      variance,
      matches,
      unmatchedBankTransactions,
      unmatchedPaymentTransactions,
      generatedAt: new Date().toISOString(),
      generatedBy,
      tenantId: account.tenantId
    };

    this.reconciliationReports.push(report);
    this.saveData();

    return report;
  }

  // Financial Adjustments
  async createFinancialAdjustment(
    type: FinancialAdjustment['type'],
    description: string,
    amount: number,
    accountId: string,
    relatedTransactionId: string | undefined,
    reason: string,
    createdBy: string
  ): Promise<FinancialAdjustment> {
    const account = this.bankAccounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    const adjustment: FinancialAdjustment = {
      id: this.generateId(),
      type,
      description,
      amount,
      accountId,
      relatedTransactionId,
      reason,
      status: 'pending',
      createdBy,
      createdAt: new Date().toISOString(),
      tenantId: account.tenantId
    };

    this.financialAdjustments.push(adjustment);
    this.saveData();

    return adjustment;
  }

  async approveFinancialAdjustment(adjustmentId: string, approvedBy: string): Promise<void> {
    const adjustment = this.financialAdjustments.find(adj => adj.id === adjustmentId);
    if (!adjustment) {
      throw new Error('Financial adjustment not found');
    }

    adjustment.status = 'approved';
    adjustment.approvedBy = approvedBy;
    adjustment.approvedAt = new Date().toISOString();

    // Apply adjustment to account balance
    const account = this.bankAccounts.find(acc => acc.id === adjustment.accountId);
    if (account) {
      account.balance += adjustment.amount;
    }

    this.saveData();
  }

  // Cash Flow Statement Generation
  private async generateMonthlyCashFlowStatement(): Promise<void> {
    const tenants = this.getUniqueTenantIds();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0];

    for (const tenantId of tenants) {
      await this.generateCashFlowStatement(tenantId, startDate, endDate);
    }
  }

  private async generateCashFlowStatement(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<CashFlowStatement> {
    const { paymentService } = await import('./paymentService');
    
    // Get all transactions for the period
    const paymentTransactions = paymentService.getTransactions(tenantId).filter(pt => 
      pt.createdAt >= startDate &&
      pt.createdAt <= endDate &&
      pt.status === 'paid'
    );

    const bankTransactions = this.bankTransactions.filter(bt => 
      bt.tenantId === tenantId &&
      bt.date >= startDate &&
      bt.date <= endDate
    );

    // Calculate operating activities
    const receiptsFromCustomers = paymentTransactions.reduce((sum, pt) => sum + pt.amount, 0);
    const paymentsToSuppliers = bankTransactions
      .filter(bt => bt.type === 'debit' && bt.category === 'other')
      .reduce((sum, bt) => sum + bt.amount, 0);

    const employeePayments = 0; // Would be calculated from payroll data
    const interestReceived = 0; // Would be calculated from investment income
    const interestPaid = bankTransactions
      .filter(bt => bt.type === 'debit' && bt.description.toLowerCase().includes('juros'))
      .reduce((sum, bt) => sum + bt.amount, 0);
    const taxesPaid = 0; // Would be calculated from tax payments

    const netOperatingCashFlow = receiptsFromCustomers - paymentsToSuppliers - employeePayments - interestPaid - taxesPaid + interestReceived;

    // Calculate investing activities (simplified)
    const equipmentPurchases = 0;
    const equipmentSales = 0;
    const investmentPurchases = 0;
    const investmentSales = 0;
    const netInvestingCashFlow = equipmentSales + investmentSales - equipmentPurchases - investmentPurchases;

    // Calculate financing activities (simplified)
    const loanProceeds = 0;
    const loanRepayments = 0;
    const ownerContributions = 0;
    const ownerWithdrawals = 0;
    const netFinancingCashFlow = loanProceeds + ownerContributions - loanRepayments - ownerWithdrawals;

    // Calculate net change and balances
    const netCashFlowChange = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;
    const beginningCashBalance = this.calculateBeginningBalance(tenantId, startDate);
    const endingCashBalance = beginningCashBalance + netCashFlowChange;

    const statement: CashFlowStatement = {
      tenantId,
      period: { startDate, endDate },
      operatingActivities: {
        receiptsFromCustomers,
        paymentsToSuppliers,
        employeePayments,
        interestReceived,
        interestPaid,
        taxesPaid,
        netOperatingCashFlow
      },
      investingActivities: {
        equipmentPurchases,
        equipmentSales,
        investmentPurchases,
        investmentSales,
        netInvestingCashFlow
      },
      financingActivities: {
        loanProceeds,
        loanRepayments,
        ownerContributions,
        ownerWithdrawals,
        netFinancingCashFlow
      },
      netCashFlowChange,
      beginningCashBalance,
      endingCashBalance,
      generatedAt: new Date().toISOString()
    };

    // Remove existing statement for same period
    this.cashFlowStatements = this.cashFlowStatements.filter(stmt => 
      !(stmt.tenantId === tenantId && 
        stmt.period.startDate === startDate && 
        stmt.period.endDate === endDate)
    );

    this.cashFlowStatements.push(statement);
    this.saveData();

    return statement;
  }

  private calculateBeginningBalance(tenantId: string, date: string): number {
    const accounts = this.bankAccounts.filter(acc => acc.tenantId === tenantId);
    
    // Simplified calculation - would be more complex in real implementation
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }

  // Inadimplence Analysis
  private async generateInadimplenceAnalysis(): Promise<void> {
    const tenants = this.getUniqueTenantIds();
    
    for (const tenantId of tenants) {
      await this.analyzeInadimplence(tenantId);
    }
  }

  private async analyzeInadimplence(tenantId: string): Promise<InadimplenceAnalysis> {
    const { paymentService } = await import('./paymentService');
    
    const invoices = paymentService.getInvoices(tenantId);
    const overdueInvoices = invoices.filter(inv => 
      inv.status !== 'paid' && new Date(inv.dueDate) < new Date()
    );

    const totalOutstandingAmount = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    // Get unique customers in debt
    const customersInDebt = new Set(overdueInvoices.map(inv => inv.patientId));
    const totalCustomersInDebt = customersInDebt.size;
    const averageDebtPerCustomer = totalCustomersInDebt > 0 ? totalOverdueAmount / totalCustomersInDebt : 0;

    // Analyze debt by age
    const now = new Date();
    const debtByAge = {
      current: { amount: 0, count: 0 },
      thirtyDays: { amount: 0, count: 0 },
      sixtyDays: { amount: 0, count: 0 },
      ninetyDays: { amount: 0, count: 0 },
      overOneHundredTwenty: { amount: 0, count: 0 }
    };

    overdueInvoices.forEach(invoice => {
      const daysOverdue = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysOverdue <= 30) {
        debtByAge.current.amount += invoice.amount;
        debtByAge.current.count++;
      } else if (daysOverdue <= 60) {
        debtByAge.thirtyDays.amount += invoice.amount;
        debtByAge.thirtyDays.count++;
      } else if (daysOverdue <= 90) {
        debtByAge.sixtyDays.amount += invoice.amount;
        debtByAge.sixtyDays.count++;
      } else if (daysOverdue <= 120) {
        debtByAge.ninetyDays.amount += invoice.amount;
        debtByAge.ninetyDays.count++;
      } else {
        debtByAge.overOneHundredTwenty.amount += invoice.amount;
        debtByAge.overOneHundredTwenty.count++;
      }
    });

    // Analyze top debtors
    const debtorMap = new Map<string, { name: string; totalDebt: number; oldestDebtDate: string; invoiceCount: number }>();
    
    overdueInvoices.forEach(invoice => {
      const existing = debtorMap.get(invoice.patientId);
      if (existing) {
        existing.totalDebt += invoice.amount;
        existing.invoiceCount++;
        if (invoice.dueDate < existing.oldestDebtDate) {
          existing.oldestDebtDate = invoice.dueDate;
        }
      } else {
        debtorMap.set(invoice.patientId, {
          name: invoice.patientName,
          totalDebt: invoice.amount,
          oldestDebtDate: invoice.dueDate,
          invoiceCount: 1
        });
      }
    });

    const topDebtors = Array.from(debtorMap.entries())
      .map(([patientId, data]) => ({ patientId, ...data }))
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, 10);

    // Generate monthly trend (simplified)
    const monthlyTrend = this.generateMonthlyDebtTrend(tenantId);

    // Calculate recovery metrics (simplified)
    const recoveryMetrics = {
      recoveryRate: 75, // Would be calculated from historical data
      averageRecoveryTime: 45, // Days
      totalRecoveredAmount: 0, // Would be calculated from payments
      totalWrittenOffAmount: 0 // Would be calculated from write-offs
    };

    // Generate recommendations
    const recommendations = this.generateInadimplenceRecommendations(debtByAge, totalOverdueAmount);

    const analysis: InadimplenceAnalysis = {
      tenantId,
      analysisDate: new Date().toISOString().split('T')[0],
      totalOutstandingAmount,
      totalOverdueAmount,
      totalCustomersInDebt,
      averageDebtPerCustomer,
      debtByAge,
      topDebtors,
      monthlyTrend,
      recoveryMetrics,
      recommendations
    };

    // Remove existing analysis for today
    this.inadimplenceAnalyses = this.inadimplenceAnalyses.filter(ana => 
      !(ana.tenantId === tenantId && ana.analysisDate === analysis.analysisDate)
    );

    this.inadimplenceAnalyses.push(analysis);
    this.saveData();

    return analysis;
  }

  private generateMonthlyDebtTrend(tenantId: string): InadimplenceAnalysis['monthlyTrend'] {
    // Simplified implementation - would use historical data
    const trend: InadimplenceAnalysis['monthlyTrend'] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      trend.push({
        month,
        totalDebt: Math.random() * 10000, // Would be actual calculated values
        newDebts: Math.random() * 2000,
        recoveredDebts: Math.random() * 1500,
        writeOffs: Math.random() * 500
      });
    }

    return trend;
  }

  private generateInadimplenceRecommendations(
    debtByAge: InadimplenceAnalysis['debtByAge'],
    totalOverdueAmount: number
  ): InadimplenceAnalysis['recommendations'] {
    const recommendations: InadimplenceAnalysis['recommendations'] = [];

    if (debtByAge.overOneHundredTwenty.amount > totalOverdueAmount * 0.3) {
      recommendations.push({
        priority: 'high',
        action: 'Implementar política de cobrança mais agressiva para débitos acima de 120 dias',
        expectedImpact: 'Redução de 20-30% nos débitos de longo prazo'
      });
    }

    if (debtByAge.current.amount > totalOverdueAmount * 0.5) {
      recommendations.push({
        priority: 'medium',
        action: 'Intensificar lembretes automáticos para débitos recentes (0-30 dias)',
        expectedImpact: 'Prevenção de 15-25% dos débitos de se tornarem crônicos'
      });
    }

    if (totalOverdueAmount > 50000) {
      recommendations.push({
        priority: 'high',
        action: 'Considerar terceirização da cobrança para grandes devedores',
        expectedImpact: 'Recuperação de 40-60% dos débitos terceirizados'
      });
    }

    return recommendations;
  }

  // Contability Integration
  async createContabilityIntegration(
    name: string,
    type: ContabilityIntegration['type'],
    provider: string,
    configuration: ContabilityIntegration['configuration'],
    tenantId: string
  ): Promise<ContabilityIntegration> {
    const integration: ContabilityIntegration = {
      id: this.generateId(),
      name,
      type,
      provider,
      configuration,
      isActive: true,
      tenantId,
      createdAt: new Date().toISOString()
    };

    this.contabilityIntegrations.push(integration);
    this.saveData();

    return integration;
  }

  async syncWithContability(integrationId: string): Promise<void> {
    const integration = this.contabilityIntegrations.find(int => int.id === integrationId);
    if (!integration) {
      throw new Error('Contability integration not found');
    }

    try {
      // Get unsynced payment transactions
      const { paymentService } = await import('./paymentService');
      const transactions = paymentService.getTransactions(integration.tenantId)
        .filter(pt => pt.status === 'paid' && !this.contabilityEntries.some(ce => ce.relatedTransactionId === pt.id));

      for (const transaction of transactions) {
        await this.createContabilityEntry(integration, transaction);
      }

      integration.lastSync = new Date().toISOString();
      integration.syncErrors = [];
      
    } catch (error) {
      integration.syncErrors = [error instanceof Error ? error.message : 'Unknown sync error'];
    }

    this.saveData();
  }

  private async createContabilityEntry(
    integration: ContabilityIntegration,
    transaction: PaymentTransaction
  ): Promise<ContabilityEntry> {
    const entry: ContabilityEntry = {
      id: this.generateId(),
      integrationId: integration.id,
      entryType: 'revenue',
      date: transaction.paidAt?.split('T')[0] || transaction.createdAt.split('T')[0],
      description: `Recebimento - ${transaction.description}`,
      debitAccount: '1.1.1.001', // Caixa
      creditAccount: '3.1.1.001', // Receita de Serviços
      amount: transaction.amount,
      documentNumber: transaction.gatewayTransactionId,
      relatedTransactionId: transaction.id,
      status: 'pending',
      tenantId: integration.tenantId,
      createdAt: new Date().toISOString()
    };

    this.contabilityEntries.push(entry);
    
    // In a real implementation, this would send the entry to the contability system
    await this.sendEntryToContabilitySystem(integration, entry);

    return entry;
  }

  private async sendEntryToContabilitySystem(
    integration: ContabilityIntegration,
    entry: ContabilityEntry
  ): Promise<void> {
    try {
      // Simulate API call to contability system
      console.log(`Sending entry to ${integration.provider}:`, entry);
      
      // Mock successful response
      entry.status = 'sent';
      entry.externalId = `EXT_${entry.id}`;
      
    } catch (error) {
      entry.status = 'error';
      entry.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Utility Methods
  private getUniqueTenantIds(): string[] {
    const tenantIds = new Set<string>();
    
    this.bankAccounts.forEach(acc => tenantIds.add(acc.tenantId));
    this.bankTransactions.forEach(bt => tenantIds.add(bt.tenantId));
    
    return Array.from(tenantIds);
  }

  private generateId(): string {
    return `FC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API Methods
  getBankAccounts(tenantId: string): BankAccount[] {
    return this.bankAccounts.filter(acc => acc.tenantId === tenantId);
  }

  getBankTransactions(tenantId: string, accountId?: string): BankTransaction[] {
    return this.bankTransactions.filter(bt => 
      bt.tenantId === tenantId && (!accountId || bt.accountId === accountId)
    );
  }

  getReconciliationMatches(tenantId: string): ReconciliationMatch[] {
    return this.reconciliationMatches.filter(rm => rm.tenantId === tenantId);
  }

  getReconciliationReports(tenantId: string): ReconciliationReport[] {
    return this.reconciliationReports.filter(rr => rr.tenantId === tenantId);
  }

  getFinancialRules(tenantId: string): FinancialRule[] {
    return this.financialRules.filter(fr => fr.tenantId === tenantId);
  }

  getFinancialAdjustments(tenantId: string): FinancialAdjustment[] {
    return this.financialAdjustments.filter(fa => fa.tenantId === tenantId);
  }

  getCashFlowStatements(tenantId: string): CashFlowStatement[] {
    return this.cashFlowStatements.filter(cfs => cfs.tenantId === tenantId);
  }

  getInadimplenceAnalyses(tenantId: string): InadimplenceAnalysis[] {
    return this.inadimplenceAnalyses.filter(ia => ia.tenantId === tenantId);
  }

  getContabilityIntegrations(tenantId: string): ContabilityIntegration[] {
    return this.contabilityIntegrations.filter(ci => ci.tenantId === tenantId);
  }

  getContabilityEntries(tenantId: string): ContabilityEntry[] {
    return this.contabilityEntries.filter(ce => ce.tenantId === tenantId);
  }

  // Manual reconciliation
  async manualReconciliation(
    bankTransactionId: string,
    paymentTransactionId: string,
    matchedBy: string,
    notes?: string
  ): Promise<ReconciliationMatch> {
    const match = await this.createReconciliationMatch(
      bankTransactionId,
      paymentTransactionId,
      'manual',
      100,
      'high',
      'matched',
      matchedBy
    );

    if (notes) {
      match.notes = notes;
    }

    this.saveData();
    return match;
  }

  // Force reconciliation run
  async forceReconciliation(tenantId: string): Promise<void> {
    await this.reconcileTenant(tenantId);
  }
}

export const financialControlService = new FinancialControlService();

// React Hook for Financial Control
export const useFinancialControl = () => {
  const createBankAccount = (
    name: string,
    bankCode: string,
    bankName: string,
    agencyNumber: string,
    accountNumber: string,
    accountType: BankAccount['accountType'],
    tenantId: string,
    initialBalance?: number
  ) => financialControlService.createBankAccount(name, bankCode, bankName, agencyNumber, accountNumber, accountType, tenantId, initialBalance);

  const importBankTransactions = (accountId: string, transactions: any[]) =>
    financialControlService.importBankTransactions(accountId, transactions);

  const generateReconciliationReport = (accountId: string, startDate: string, endDate: string, generatedBy: string) =>
    financialControlService.generateReconciliationReport(accountId, startDate, endDate, generatedBy);

  const createFinancialAdjustment = (
    type: FinancialAdjustment['type'],
    description: string,
    amount: number,
    accountId: string,
    relatedTransactionId: string | undefined,
    reason: string,
    createdBy: string
  ) => financialControlService.createFinancialAdjustment(type, description, amount, accountId, relatedTransactionId, reason, createdBy);

  const approveFinancialAdjustment = (adjustmentId: string, approvedBy: string) =>
    financialControlService.approveFinancialAdjustment(adjustmentId, approvedBy);

  const createContabilityIntegration = (
    name: string,
    type: ContabilityIntegration['type'],
    provider: string,
    configuration: ContabilityIntegration['configuration'],
    tenantId: string
  ) => financialControlService.createContabilityIntegration(name, type, provider, configuration, tenantId);

  const syncWithContability = (integrationId: string) => financialControlService.syncWithContability(integrationId);

  const manualReconciliation = (bankTransactionId: string, paymentTransactionId: string, matchedBy: string, notes?: string) =>
    financialControlService.manualReconciliation(bankTransactionId, paymentTransactionId, matchedBy, notes);

  const getBankAccounts = (tenantId: string) => financialControlService.getBankAccounts(tenantId);
  const getBankTransactions = (tenantId: string, accountId?: string) => financialControlService.getBankTransactions(tenantId, accountId);
  const getReconciliationMatches = (tenantId: string) => financialControlService.getReconciliationMatches(tenantId);
  const getReconciliationReports = (tenantId: string) => financialControlService.getReconciliationReports(tenantId);
  const getFinancialRules = (tenantId: string) => financialControlService.getFinancialRules(tenantId);
  const getFinancialAdjustments = (tenantId: string) => financialControlService.getFinancialAdjustments(tenantId);
  const getCashFlowStatements = (tenantId: string) => financialControlService.getCashFlowStatements(tenantId);
  const getInadimplenceAnalyses = (tenantId: string) => financialControlService.getInadimplenceAnalyses(tenantId);
  const getContabilityIntegrations = (tenantId: string) => financialControlService.getContabilityIntegrations(tenantId);
  const getContabilityEntries = (tenantId: string) => financialControlService.getContabilityEntries(tenantId);
  const forceReconciliation = (tenantId: string) => financialControlService.forceReconciliation(tenantId);

  return {
    createBankAccount,
    importBankTransactions,
    generateReconciliationReport,
    createFinancialAdjustment,
    approveFinancialAdjustment,
    createContabilityIntegration,
    syncWithContability,
    manualReconciliation,
    getBankAccounts,
    getBankTransactions,
    getReconciliationMatches,
    getReconciliationReports,
    getFinancialRules,
    getFinancialAdjustments,
    getCashFlowStatements,
    getInadimplenceAnalyses,
    getContabilityIntegrations,
    getContabilityEntries,
    forceReconciliation
  };
};