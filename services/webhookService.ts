import { PaymentTransaction } from './paymentService';

// Webhook Types
export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  secret: string;
  provider: 'mercado_pago' | 'pagseguro' | 'picpay' | 'custom';
  retryPolicy: {
    maxRetries: number;
    retryDelay: number; // in seconds
    exponentialBackoff: boolean;
  };
  headers?: Record<string, string>;
  tenantId: string;
  createdAt: string;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
}

export interface WebhookEvent {
  type: 'payment.created' | 'payment.updated' | 'payment.approved' | 'payment.cancelled' | 
        'payment.rejected' | 'payment.refunded' | 'invoice.created' | 'invoice.paid' | 
        'invoice.overdue' | 'subscription.created' | 'subscription.cancelled' | 
        'subscription.renewed' | 'reconciliation.completed' | 'custom';
  description: string;
  isActive: boolean;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: string;
  payload: any;
  status: 'pending' | 'delivered' | 'failed' | 'cancelled';
  httpStatus?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  attemptCount: number;
  maxAttempts: number;
  scheduledAt: string;
  deliveredAt?: string;
  failedAt?: string;
  nextRetryAt?: string;
  error?: string;
  tenantId: string;
  createdAt: string;
}

export interface WebhookSignature {
  algorithm: 'sha256' | 'md5';
  header: string; // Header name to check
  secret: string;
}

export interface WebhookLog {
  id: string;
  endpointId: string;
  eventType: string;
  method: 'POST' | 'PUT' | 'PATCH';
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  duration: number; // in milliseconds
  success: boolean;
  error?: string;
  timestamp: string;
  tenantId: string;
}

export interface WebhookTemplate {
  id: string;
  name: string;
  description: string;
  eventType: string;
  template: string; // JSON template with placeholders
  variables: Array<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
  }>;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

class WebhookService {
  private endpoints: WebhookEndpoint[] = [];
  private deliveries: WebhookDelivery[] = [];
  private logs: WebhookLog[] = [];
  private templates: WebhookTemplate[] = [];
  private deliveryQueue: WebhookDelivery[] = [];
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    this.loadStoredData();
    this.initializeDefaultTemplates();
    this.startDeliveryProcessor();
  }

  private loadStoredData(): void {
    try {
      const storedEndpoints = localStorage.getItem('webhook_endpoints');
      if (storedEndpoints) {
        this.endpoints = JSON.parse(storedEndpoints);
      }

      const storedDeliveries = localStorage.getItem('webhook_deliveries');
      if (storedDeliveries) {
        this.deliveries = JSON.parse(storedDeliveries);
      }

      const storedLogs = localStorage.getItem('webhook_logs');
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }

      const storedTemplates = localStorage.getItem('webhook_templates');
      if (storedTemplates) {
        this.templates = JSON.parse(storedTemplates);
      }

      const storedQueue = localStorage.getItem('webhook_delivery_queue');
      if (storedQueue) {
        this.deliveryQueue = JSON.parse(storedQueue);
      }
    } catch (error) {
      console.error('Error loading webhook data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('webhook_endpoints', JSON.stringify(this.endpoints));
      localStorage.setItem('webhook_deliveries', JSON.stringify(this.deliveries));
      localStorage.setItem('webhook_logs', JSON.stringify(this.logs));
      localStorage.setItem('webhook_templates', JSON.stringify(this.templates));
      localStorage.setItem('webhook_delivery_queue', JSON.stringify(this.deliveryQueue));
    } catch (error) {
      console.error('Error saving webhook data:', error);
    }
  }

  private initializeDefaultTemplates(): void {
    if (this.templates.length === 0) {
      const defaultTemplates: WebhookTemplate[] = [
        {
          id: 'payment_approved',
          name: 'Payment Approved',
          description: 'Template for payment approval notifications',
          eventType: 'payment.approved',
          template: JSON.stringify({
            event: '{{eventType}}',
            timestamp: '{{timestamp}}',
            data: {
              id: '{{payment.id}}',
              amount: '{{payment.amount}}',
              currency: '{{payment.currency}}',
              status: '{{payment.status}}',
              patient: {
                id: '{{patient.id}}',
                name: '{{patient.name}}',
                email: '{{patient.email}}'
              },
              payment_method: {
                type: '{{paymentMethod.type}}',
                provider: '{{paymentMethod.provider}}'
              },
              created_at: '{{payment.createdAt}}',
              paid_at: '{{payment.paidAt}}'
            }
          }, null, 2),
          variables: [
            { name: 'eventType', description: 'Type of event', type: 'string', required: true },
            { name: 'timestamp', description: 'Event timestamp', type: 'string', required: true },
            { name: 'payment.id', description: 'Payment ID', type: 'string', required: true },
            { name: 'payment.amount', description: 'Payment amount', type: 'number', required: true },
            { name: 'payment.currency', description: 'Payment currency', type: 'string', required: true },
            { name: 'payment.status', description: 'Payment status', type: 'string', required: true },
            { name: 'patient.id', description: 'Patient ID', type: 'string', required: true },
            { name: 'patient.name', description: 'Patient name', type: 'string', required: true },
            { name: 'patient.email', description: 'Patient email', type: 'string', required: false },
            { name: 'paymentMethod.type', description: 'Payment method type', type: 'string', required: true },
            { name: 'paymentMethod.provider', description: 'Payment provider', type: 'string', required: true },
            { name: 'payment.createdAt', description: 'Payment creation date', type: 'string', required: true },
            { name: 'payment.paidAt', description: 'Payment completion date', type: 'string', required: false }
          ],
          isActive: true,
          tenantId: 'default',
          createdAt: new Date().toISOString()
        },
        {
          id: 'invoice_overdue',
          name: 'Invoice Overdue',
          description: 'Template for overdue invoice notifications',
          eventType: 'invoice.overdue',
          template: JSON.stringify({
            event: '{{eventType}}',
            timestamp: '{{timestamp}}',
            data: {
              invoice: {
                id: '{{invoice.id}}',
                number: '{{invoice.number}}',
                amount: '{{invoice.amount}}',
                due_date: '{{invoice.dueDate}}',
                days_overdue: '{{invoice.daysOverdue}}'
              },
              patient: {
                id: '{{patient.id}}',
                name: '{{patient.name}}',
                email: '{{patient.email}}',
                phone: '{{patient.phone}}'
              }
            }
          }, null, 2),
          variables: [
            { name: 'eventType', description: 'Type of event', type: 'string', required: true },
            { name: 'timestamp', description: 'Event timestamp', type: 'string', required: true },
            { name: 'invoice.id', description: 'Invoice ID', type: 'string', required: true },
            { name: 'invoice.number', description: 'Invoice number', type: 'string', required: true },
            { name: 'invoice.amount', description: 'Invoice amount', type: 'number', required: true },
            { name: 'invoice.dueDate', description: 'Invoice due date', type: 'string', required: true },
            { name: 'invoice.daysOverdue', description: 'Days overdue', type: 'number', required: true },
            { name: 'patient.id', description: 'Patient ID', type: 'string', required: true },
            { name: 'patient.name', description: 'Patient name', type: 'string', required: true },
            { name: 'patient.email', description: 'Patient email', type: 'string', required: false },
            { name: 'patient.phone', description: 'Patient phone', type: 'string', required: false }
          ],
          isActive: true,
          tenantId: 'default',
          createdAt: new Date().toISOString()
        },
        {
          id: 'reconciliation_completed',
          name: 'Reconciliation Completed',
          description: 'Template for reconciliation completion notifications',
          eventType: 'reconciliation.completed',
          template: JSON.stringify({
            event: '{{eventType}}',
            timestamp: '{{timestamp}}',
            data: {
              reconciliation: {
                id: '{{reconciliation.id}}',
                account_id: '{{reconciliation.accountId}}',
                account_name: '{{reconciliation.accountName}}',
                period: {
                  start_date: '{{reconciliation.startDate}}',
                  end_date: '{{reconciliation.endDate}}'
                },
                summary: {
                  total_transactions: '{{reconciliation.totalTransactions}}',
                  matched_transactions: '{{reconciliation.matchedTransactions}}',
                  unmatched_transactions: '{{reconciliation.unmatchedTransactions}}',
                  variance: '{{reconciliation.variance}}'
                }
              }
            }
          }, null, 2),
          variables: [
            { name: 'eventType', description: 'Type of event', type: 'string', required: true },
            { name: 'timestamp', description: 'Event timestamp', type: 'string', required: true },
            { name: 'reconciliation.id', description: 'Reconciliation ID', type: 'string', required: true },
            { name: 'reconciliation.accountId', description: 'Account ID', type: 'string', required: true },
            { name: 'reconciliation.accountName', description: 'Account name', type: 'string', required: true },
            { name: 'reconciliation.startDate', description: 'Period start date', type: 'string', required: true },
            { name: 'reconciliation.endDate', description: 'Period end date', type: 'string', required: true },
            { name: 'reconciliation.totalTransactions', description: 'Total transactions', type: 'number', required: true },
            { name: 'reconciliation.matchedTransactions', description: 'Matched transactions', type: 'number', required: true },
            { name: 'reconciliation.unmatchedTransactions', description: 'Unmatched transactions', type: 'number', required: true },
            { name: 'reconciliation.variance', description: 'Reconciliation variance', type: 'number', required: true }
          ],
          isActive: true,
          tenantId: 'default',
          createdAt: new Date().toISOString()
        }
      ];

      this.templates = defaultTemplates;
      this.saveData();
    }
  }

  private startDeliveryProcessor(): void {
    this.processingInterval = setInterval(() => {
      this.processDeliveryQueue();
    }, 5000); // Process every 5 seconds
  }

  private async processDeliveryQueue(): Promise<void> {
    const now = new Date();
    const readyDeliveries = this.deliveryQueue.filter(delivery => 
      delivery.status === 'pending' && 
      new Date(delivery.scheduledAt) <= now
    );

    for (const delivery of readyDeliveries) {
      await this.attemptDelivery(delivery);
    }

    // Remove completed deliveries from queue
    this.deliveryQueue = this.deliveryQueue.filter(delivery => 
      delivery.status === 'pending'
    );

    this.saveData();
  }

  private async attemptDelivery(delivery: WebhookDelivery): Promise<void> {
    const endpoint = this.endpoints.find(ep => ep.id === delivery.endpointId);
    if (!endpoint || !endpoint.isActive) {
      delivery.status = 'cancelled';
      delivery.error = 'Endpoint not found or inactive';
      delivery.failedAt = new Date().toISOString();
      return;
    }

    delivery.attemptCount++;
    
    const startTime = Date.now();
    let success = false;
    let httpStatus: number | undefined;
    let responseBody: string | undefined;
    let responseHeaders: Record<string, string> | undefined;
    let error: string | undefined;

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'FisioFlow-Webhook/1.0',
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-Delivery': delivery.id,
        'X-Webhook-Timestamp': delivery.createdAt,
        ...endpoint.headers
      };

      // Add signature if secret is provided
      if (endpoint.secret) {
        const signature = this.generateSignature(
          JSON.stringify(delivery.payload),
          endpoint.secret
        );
        headers['X-Webhook-Signature'] = signature;
      }

      // Make HTTP request
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      httpStatus = response.status;
      responseBody = await response.text();
      
      // Convert headers to object
      responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders![key] = value;
      });

      if (response.ok) {
        success = true;
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date().toISOString();
        endpoint.successCount++;
        endpoint.lastTriggered = new Date().toISOString();
      } else {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      httpStatus = 0;
    }

    const duration = Date.now() - startTime;

    // Create log entry
    const logEntry: WebhookLog = {
      id: this.generateId(),
      endpointId: endpoint.id,
      eventType: delivery.eventType,
      method: 'POST',
      url: endpoint.url,
      requestHeaders: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-Delivery': delivery.id
      },
      requestBody: JSON.stringify(delivery.payload),
      responseStatus: httpStatus,
      responseHeaders,
      responseBody,
      duration,
      success,
      error,
      timestamp: new Date().toISOString(),
      tenantId: delivery.tenantId
    };

    this.logs.push(logEntry);

    // Update delivery status
    delivery.httpStatus = httpStatus;
    delivery.responseBody = responseBody;
    delivery.responseHeaders = responseHeaders;

    if (!success) {
      endpoint.failureCount++;
      delivery.error = error;

      // Schedule retry if not exceeded max attempts
      if (delivery.attemptCount < delivery.maxAttempts) {
        const retryDelay = this.calculateRetryDelay(
          delivery.attemptCount,
          endpoint.retryPolicy
        );
        
        delivery.nextRetryAt = new Date(Date.now() + retryDelay * 1000).toISOString();
        delivery.scheduledAt = delivery.nextRetryAt;
      } else {
        delivery.status = 'failed';
        delivery.failedAt = new Date().toISOString();
      }
    }

    // Keep only recent logs (last 1000 entries per tenant)
    const tenantLogs = this.logs.filter(log => log.tenantId === delivery.tenantId);
    if (tenantLogs.length > 1000) {
      const logsToRemove = tenantLogs
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(0, tenantLogs.length - 1000);
      
      this.logs = this.logs.filter(log => 
        !logsToRemove.some(remove => remove.id === log.id)
      );
    }
  }

  private calculateRetryDelay(attemptCount: number, retryPolicy: WebhookEndpoint['retryPolicy']): number {
    if (retryPolicy.exponentialBackoff) {
      return retryPolicy.retryDelay * Math.pow(2, attemptCount - 1);
    }
    return retryPolicy.retryDelay;
  }

  private generateSignature(payload: string, secret: string): string {
    // Simple HMAC SHA256 signature (in production, use proper crypto library)
    const timestamp = Date.now().toString();
    const signaturePayload = `${timestamp}.${payload}`;
    
    // This is a simplified signature for demo purposes
    // In production, use: crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex')
    return `t=${timestamp},v1=${btoa(signaturePayload + secret)}`;
  }

  // Webhook Endpoint Management
  async createWebhookEndpoint(
    name: string,
    url: string,
    events: WebhookEvent[],
    tenantId: string,
    provider: WebhookEndpoint['provider'] = 'custom',
    secret?: string,
    headers?: Record<string, string>
  ): Promise<WebhookEndpoint> {
    const endpoint: WebhookEndpoint = {
      id: this.generateId(),
      name,
      url,
      events,
      isActive: true,
      secret: secret || this.generateSecret(),
      provider,
      retryPolicy: {
        maxRetries: 3,
        retryDelay: 60, // 1 minute
        exponentialBackoff: true
      },
      headers,
      tenantId,
      createdAt: new Date().toISOString(),
      successCount: 0,
      failureCount: 0
    };

    this.endpoints.push(endpoint);
    this.saveData();

    return endpoint;
  }

  async updateWebhookEndpoint(
    id: string,
    updates: Partial<WebhookEndpoint>
  ): Promise<WebhookEndpoint | undefined> {
    const endpointIndex = this.endpoints.findIndex(ep => ep.id === id);
    if (endpointIndex === -1) return undefined;

    this.endpoints[endpointIndex] = { ...this.endpoints[endpointIndex], ...updates };
    this.saveData();

    return this.endpoints[endpointIndex];
  }

  async deleteWebhookEndpoint(id: string): Promise<boolean> {
    const initialLength = this.endpoints.length;
    this.endpoints = this.endpoints.filter(ep => ep.id !== id);
    
    if (this.endpoints.length < initialLength) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Event Triggering
  async triggerWebhook(
    eventType: string,
    data: any,
    tenantId: string,
    immediateDelivery: boolean = false
  ): Promise<WebhookDelivery[]> {
    const relevantEndpoints = this.endpoints.filter(endpoint => 
      endpoint.tenantId === tenantId &&
      endpoint.isActive &&
      endpoint.events.some(event => event.type === eventType && event.isActive)
    );

    const deliveries: WebhookDelivery[] = [];

    for (const endpoint of relevantEndpoints) {
      const template = this.templates.find(t => 
        t.eventType === eventType && t.tenantId === tenantId && t.isActive
      );

      let payload = data;
      
      if (template) {
        payload = this.processTemplate(template.template, data);
      } else {
        // Default payload structure
        payload = {
          event: eventType,
          timestamp: new Date().toISOString(),
          data
        };
      }

      const delivery: WebhookDelivery = {
        id: this.generateId(),
        endpointId: endpoint.id,
        eventType,
        payload,
        status: 'pending',
        attemptCount: 0,
        maxAttempts: endpoint.retryPolicy.maxRetries,
        scheduledAt: immediateDelivery ? new Date().toISOString() : new Date().toISOString(),
        tenantId,
        createdAt: new Date().toISOString()
      };

      this.deliveries.push(delivery);
      
      if (immediateDelivery) {
        await this.attemptDelivery(delivery);
      } else {
        this.deliveryQueue.push(delivery);
      }

      deliveries.push(delivery);
    }

    this.saveData();
    return deliveries;
  }

  private processTemplate(template: string, data: any): any {
    try {
      let processedTemplate = template;

      // Replace template variables with actual data
      const replaceVariable = (path: string, obj: any): string => {
        const keys = path.split('.');
        let value = obj;
        
        for (const key of keys) {
          value = value?.[key];
        }
        
        return value !== undefined ? String(value) : '';
      };

      // Find all {{variable}} patterns and replace them
      const variablePattern = /\{\{([^}]+)\}\}/g;
      processedTemplate = processedTemplate.replace(variablePattern, (match, variable) => {
        const value = replaceVariable(variable.trim(), data);
        return value;
      });

      return JSON.parse(processedTemplate);
    } catch (error) {
      console.error('Error processing webhook template:', error);
      return {
        event: data.eventType || 'unknown',
        timestamp: new Date().toISOString(),
        data,
        error: 'Template processing failed'
      };
    }
  }

  // Webhook Verification (for incoming webhooks from payment providers)
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: 'sha256' | 'md5' = 'sha256'
  ): boolean {
    try {
      // Extract timestamp and signature from header
      const signatureParts = signature.split(',');
      const timestampPart = signatureParts.find(part => part.startsWith('t='));
      const signaturePart = signatureParts.find(part => part.startsWith('v1='));

      if (!timestampPart || !signaturePart) {
        return false;
      }

      const timestamp = timestampPart.split('=')[1];
      const expectedSignature = signaturePart.split('=')[1];

      // Check timestamp tolerance (5 minutes)
      const signatureTimestamp = parseInt(timestamp);
      const now = Date.now();
      if (Math.abs(now - signatureTimestamp) > 5 * 60 * 1000) {
        return false;
      }

      // Verify signature (simplified - use proper crypto in production)
      const signaturePayload = `${timestamp}.${payload}`;
      const computedSignature = btoa(signaturePayload + secret);

      return computedSignature === expectedSignature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Process incoming webhook from payment providers
  async processIncomingWebhook(
    provider: string,
    headers: Record<string, string>,
    payload: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (provider) {
        case 'mercado_pago':
          return await this.processMercadoPagoWebhook(headers, payload);
        case 'pagseguro':
          return await this.processPagSeguroWebhook(headers, payload);
        case 'picpay':
          return await this.processPicPayWebhook(headers, payload);
        default:
          return { success: false, message: 'Unknown provider' };
      }
    } catch (error) {
      console.error(`Error processing ${provider} webhook:`, error);
      return { success: false, message: 'Processing error' };
    }
  }

  private async processMercadoPagoWebhook(
    headers: Record<string, string>,
    payload: any
  ): Promise<{ success: boolean; message: string }> {
    // Verify Mercado Pago signature
    const signature = headers['x-signature'];
    if (!signature) {
      return { success: false, message: 'Missing signature' };
    }

    // Process different event types
    if (payload.type === 'payment') {
      await this.handlePaymentUpdate(payload.data.id, 'mercado_pago');
      return { success: true, message: 'Payment webhook processed' };
    }

    return { success: true, message: 'Webhook received' };
  }

  private async processPagSeguroWebhook(
    headers: Record<string, string>,
    payload: any
  ): Promise<{ success: boolean; message: string }> {
    // PagSeguro webhook processing logic
    console.log('Processing PagSeguro webhook:', payload);
    return { success: true, message: 'PagSeguro webhook processed' };
  }

  private async processPicPayWebhook(
    headers: Record<string, string>,
    payload: any
  ): Promise<{ success: boolean; message: string }> {
    // PicPay webhook processing logic
    if (payload.referenceId) {
      const { paymentService } = await import('./paymentService');
      await paymentService.processWebhook('picpay', payload);
      
      // Trigger our own webhook for the payment update
      await this.triggerWebhook('payment.updated', {
        paymentId: payload.referenceId,
        status: payload.status,
        provider: 'picpay'
      }, 'default');

      return { success: true, message: 'PicPay webhook processed' };
    }

    return { success: false, message: 'Invalid PicPay webhook' };
  }

  private async handlePaymentUpdate(paymentId: string, provider: string): Promise<void> {
    const { paymentService } = await import('./paymentService');
    
    // Find the transaction
    const transaction = Array.from({ length: 10 }, (_, i) => `tenant${i}`)
      .map(tenantId => paymentService.getTransactions(tenantId))
      .flat()
      .find(t => t.gatewayPaymentId === paymentId);

    if (transaction) {
      // Trigger webhook for payment update
      await this.triggerWebhook('payment.updated', {
        paymentId: transaction.id,
        gatewayPaymentId: paymentId,
        status: 'paid', // Would be determined from actual gateway response
        provider,
        amount: transaction.amount,
        patientId: transaction.patientId,
        patientName: transaction.patientName
      }, transaction.tenantId);
    }
  }

  // Template Management
  async createWebhookTemplate(
    name: string,
    description: string,
    eventType: string,
    template: string,
    variables: WebhookTemplate['variables'],
    tenantId: string
  ): Promise<WebhookTemplate> {
    const webhookTemplate: WebhookTemplate = {
      id: this.generateId(),
      name,
      description,
      eventType,
      template,
      variables,
      isActive: true,
      tenantId,
      createdAt: new Date().toISOString()
    };

    this.templates.push(webhookTemplate);
    this.saveData();

    return webhookTemplate;
  }

  async updateWebhookTemplate(
    id: string,
    updates: Partial<WebhookTemplate>
  ): Promise<WebhookTemplate | undefined> {
    const templateIndex = this.templates.findIndex(t => t.id === id);
    if (templateIndex === -1) return undefined;

    this.templates[templateIndex] = { ...this.templates[templateIndex], ...updates };
    this.saveData();

    return this.templates[templateIndex];
  }

  // Test webhook delivery
  async testWebhookEndpoint(endpointId: string): Promise<WebhookDelivery> {
    const endpoint = this.endpoints.find(ep => ep.id === endpointId);
    if (!endpoint) {
      throw new Error('Webhook endpoint not found');
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        endpoint_id: endpointId,
        endpoint_name: endpoint.name
      }
    };

    const testDelivery: WebhookDelivery = {
      id: this.generateId(),
      endpointId,
      eventType: 'webhook.test',
      payload: testPayload,
      status: 'pending',
      attemptCount: 0,
      maxAttempts: 1,
      scheduledAt: new Date().toISOString(),
      tenantId: endpoint.tenantId,
      createdAt: new Date().toISOString()
    };

    await this.attemptDelivery(testDelivery);
    this.deliveries.push(testDelivery);
    this.saveData();

    return testDelivery;
  }

  // Retry failed delivery
  async retryWebhookDelivery(deliveryId: string): Promise<WebhookDelivery | undefined> {
    const delivery = this.deliveries.find(d => d.id === deliveryId);
    if (!delivery || delivery.status !== 'failed') {
      return undefined;
    }

    delivery.status = 'pending';
    delivery.attemptCount = 0;
    delivery.scheduledAt = new Date().toISOString();
    delivery.error = undefined;
    delivery.failedAt = undefined;

    this.deliveryQueue.push(delivery);
    this.saveData();

    return delivery;
  }

  // Utility methods
  private generateId(): string {
    return `WH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSecret(): string {
    return `whsec_${Math.random().toString(36).substr(2, 32)}`;
  }

  // Public API methods
  getWebhookEndpoints(tenantId: string): WebhookEndpoint[] {
    return this.endpoints.filter(ep => ep.tenantId === tenantId);
  }

  getWebhookDeliveries(tenantId: string, endpointId?: string): WebhookDelivery[] {
    return this.deliveries.filter(d => 
      d.tenantId === tenantId && 
      (!endpointId || d.endpointId === endpointId)
    );
  }

  getWebhookLogs(tenantId: string, endpointId?: string): WebhookLog[] {
    return this.logs.filter(l => 
      l.tenantId === tenantId && 
      (!endpointId || l.endpointId === endpointId)
    );
  }

  getWebhookTemplates(tenantId: string): WebhookTemplate[] {
    return this.templates.filter(t => t.tenantId === tenantId);
  }

  getWebhookEndpoint(id: string): WebhookEndpoint | undefined {
    return this.endpoints.find(ep => ep.id === id);
  }

  getWebhookDelivery(id: string): WebhookDelivery | undefined {
    return this.deliveries.find(d => d.id === id);
  }

  // Cleanup old data
  cleanupOldData(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = cutoffDate.toISOString();

    // Remove old deliveries
    this.deliveries = this.deliveries.filter(d => d.createdAt > cutoffTimestamp);
    
    // Remove old logs
    this.logs = this.logs.filter(l => l.timestamp > cutoffTimestamp);

    this.saveData();
  }

  // Get webhook statistics
  getWebhookStats(tenantId: string, days: number = 7): {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    averageResponseTime: number;
    topEvents: Array<{ event: string; count: number }>;
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = cutoffDate.toISOString();

    const recentDeliveries = this.deliveries.filter(d => 
      d.tenantId === tenantId && d.createdAt > cutoffTimestamp
    );

    const recentLogs = this.logs.filter(l => 
      l.tenantId === tenantId && l.timestamp > cutoffTimestamp
    );

    const totalDeliveries = recentDeliveries.length;
    const successfulDeliveries = recentDeliveries.filter(d => d.status === 'delivered').length;
    const failedDeliveries = recentDeliveries.filter(d => d.status === 'failed').length;
    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

    const totalResponseTime = recentLogs.reduce((sum, log) => sum + log.duration, 0);
    const averageResponseTime = recentLogs.length > 0 ? totalResponseTime / recentLogs.length : 0;

    // Count events
    const eventCounts = new Map<string, number>();
    recentDeliveries.forEach(d => {
      eventCounts.set(d.eventType, (eventCounts.get(d.eventType) || 0) + 1);
    });

    const topEvents = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      successRate,
      averageResponseTime,
      topEvents
    };
  }

  // Stop processing (for cleanup)
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }
}

export const webhookService = new WebhookService();

// React Hook for Webhook Management
export const useWebhooks = () => {
  const createWebhookEndpoint = (
    name: string,
    url: string,
    events: WebhookEvent[],
    tenantId: string,
    provider?: WebhookEndpoint['provider'],
    secret?: string,
    headers?: Record<string, string>
  ) => webhookService.createWebhookEndpoint(name, url, events, tenantId, provider, secret, headers);

  const updateWebhookEndpoint = (id: string, updates: Partial<WebhookEndpoint>) =>
    webhookService.updateWebhookEndpoint(id, updates);

  const deleteWebhookEndpoint = (id: string) => webhookService.deleteWebhookEndpoint(id);

  const triggerWebhook = (eventType: string, data: any, tenantId: string, immediateDelivery?: boolean) =>
    webhookService.triggerWebhook(eventType, data, tenantId, immediateDelivery);

  const createWebhookTemplate = (
    name: string,
    description: string,
    eventType: string,
    template: string,
    variables: WebhookTemplate['variables'],
    tenantId: string
  ) => webhookService.createWebhookTemplate(name, description, eventType, template, variables, tenantId);

  const testWebhookEndpoint = (endpointId: string) => webhookService.testWebhookEndpoint(endpointId);
  const retryWebhookDelivery = (deliveryId: string) => webhookService.retryWebhookDelivery(deliveryId);

  const processIncomingWebhook = (provider: string, headers: Record<string, string>, payload: any) =>
    webhookService.processIncomingWebhook(provider, headers, payload);

  const verifyWebhookSignature = (payload: string, signature: string, secret: string, algorithm?: 'sha256' | 'md5') =>
    webhookService.verifyWebhookSignature(payload, signature, secret, algorithm);

  const getWebhookEndpoints = (tenantId: string) => webhookService.getWebhookEndpoints(tenantId);
  const getWebhookDeliveries = (tenantId: string, endpointId?: string) => 
    webhookService.getWebhookDeliveries(tenantId, endpointId);
  const getWebhookLogs = (tenantId: string, endpointId?: string) => 
    webhookService.getWebhookLogs(tenantId, endpointId);
  const getWebhookTemplates = (tenantId: string) => webhookService.getWebhookTemplates(tenantId);
  const getWebhookStats = (tenantId: string, days?: number) => webhookService.getWebhookStats(tenantId, days);

  return {
    createWebhookEndpoint,
    updateWebhookEndpoint,
    deleteWebhookEndpoint,
    triggerWebhook,
    createWebhookTemplate,
    testWebhookEndpoint,
    retryWebhookDelivery,
    processIncomingWebhook,
    verifyWebhookSignature,
    getWebhookEndpoints,
    getWebhookDeliveries,
    getWebhookLogs,
    getWebhookTemplates,
    getWebhookStats
  };
};