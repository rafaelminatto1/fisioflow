import { useState, useCallback } from 'react';
import { SubscriptionPlan } from '../types';
import { useAuth } from './useAuth';
import { useData } from './useData.minimal';
import { useNotification } from './useNotification';

interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'requires_capture'
    | 'canceled'
    | 'succeeded';
  client_secret: string;
}

interface Subscription {
  id: string;
  customer: string;
  status:
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid';
  current_period_start: number;
  current_period_end: number;
  plan: {
    id: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
  };
}

interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface UseStripeReturn {
  isLoading: boolean;
  error: string | null;
  createCustomer: (
    customerData: Omit<Customer, 'id'>
  ) => Promise<Customer | null>;
  createSubscription: (
    customerId: string,
    priceId: string
  ) => Promise<Subscription | null>;
  createPaymentIntent: (
    amount: number,
    currency: string,
    customerId?: string
  ) => Promise<PaymentIntent | null>;
  confirmPayment: (
    paymentIntentId: string,
    paymentMethodId: string
  ) => Promise<boolean>;
  cancelSubscription: (subscriptionId: string) => Promise<boolean>;
  updateSubscription: (
    subscriptionId: string,
    newPriceId: string
  ) => Promise<Subscription | null>;
  getSubscription: (subscriptionId: string) => Promise<Subscription | null>;
  createCheckoutSession: (
    priceId: string,
    customerId?: string
  ) => Promise<{ url: string } | null>;
  handleWebhook: (payload: string, signature: string) => Promise<boolean>;
}

// Stripe Price IDs for each plan (these would be configured in Stripe Dashboard)
const STRIPE_PRICE_IDS: Record<
  SubscriptionPlan,
  { monthly: string; yearly: string }
> = {
  free: { monthly: '', yearly: '' }, // Free plan doesn't have Stripe prices
  silver: {
    monthly: 'price_silver_monthly_97', // Replace with actual Stripe price IDs
    yearly: 'price_silver_yearly_970',
  },
  gold: {
    monthly: 'price_gold_monthly_197',
    yearly: 'price_gold_yearly_1970',
  },
  platinum: {
    monthly: 'price_platinum_monthly_397',
    yearly: 'price_platinum_yearly_3970',
  },
};

const useStripe = (): UseStripeReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { saveTenant, tenants, saveAuditLog } = useData();
  const { addNotification } = useNotification();

  const stripeConfig: StripeConfig = {
    publishableKey:
      process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_...',
    secretKey: process.env.REACT_APP_STRIPE_SECRET_KEY || 'sk_test_...',
    webhookSecret: process.env.REACT_APP_STRIPE_WEBHOOK_SECRET || 'whsec_...',
  };

  const makeStripeRequest = async (
    endpoint: string,
    method: string = 'POST',
    data?: any
  ) => {
    try {
      const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${stripeConfig.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data ? new URLSearchParams(data).toString() : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Stripe API error');
      }

      return await response.json();
    } catch (err) {
      console.error('Stripe API Error:', err);
      throw err;
    }
  };

  const createCustomer = useCallback(
    async (customerData: Omit<Customer, 'id'>): Promise<Customer | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const customer = await makeStripeRequest('customers', 'POST', {
          email: customerData.email,
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address
            ? {
                line1: customerData.address.line1,
                line2: customerData.address.line2,
                city: customerData.address.city,
                state: customerData.address.state,
                postal_code: customerData.address.postal_code,
                country: customerData.address.country,
              }
            : undefined,
        });

        // Log the customer creation
        if (user) {
          saveAuditLog(
            {
              action: 'billing_customer_created',
              userId: user.id,
              tenantId: user.tenantId,
              details: {
                customerId: customer.id,
                email: customerData.email,
              },
              timestamp: new Date().toISOString(),
            },
            user
          );
        }

        return customer;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao criar cliente';
        setError(errorMessage);
        addNotification({
          type: 'error',
          title: 'Erro no Stripe',
          message: errorMessage,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, saveAuditLog, addNotification]
  );

  const createSubscription = useCallback(
    async (
      customerId: string,
      priceId: string
    ): Promise<Subscription | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const subscription = await makeStripeRequest('subscriptions', 'POST', {
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription',
          },
          expand: ['latest_invoice.payment_intent'],
        });

        // Log the subscription creation
        if (user) {
          saveAuditLog(
            {
              action: 'billing_subscription_created',
              userId: user.id,
              tenantId: user.tenantId,
              details: {
                subscriptionId: subscription.id,
                customerId,
                priceId,
                status: subscription.status,
              },
              timestamp: new Date().toISOString(),
            },
            user
          );
        }

        return subscription;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao criar assinatura';
        setError(errorMessage);
        addNotification({
          type: 'error',
          title: 'Erro no Stripe',
          message: errorMessage,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, saveAuditLog, addNotification]
  );

  const createPaymentIntent = useCallback(
    async (
      amount: number,
      currency: string = 'brl',
      customerId?: string
    ): Promise<PaymentIntent | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const paymentIntent = await makeStripeRequest(
          'payment_intents',
          'POST',
          {
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            customer: customerId,
            automatic_payment_methods: {
              enabled: true,
            },
          }
        );

        return paymentIntent;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Erro ao criar intenção de pagamento';
        setError(errorMessage);
        addNotification({
          type: 'error',
          title: 'Erro no Stripe',
          message: errorMessage,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [addNotification]
  );

  const confirmPayment = useCallback(
    async (
      paymentIntentId: string,
      paymentMethodId: string
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await makeStripeRequest(
          `payment_intents/${paymentIntentId}/confirm`,
          'POST',
          {
            payment_method: paymentMethodId,
          }
        );

        const success = result.status === 'succeeded';

        // Log the payment confirmation
        if (user) {
          saveAuditLog(
            {
              action: success
                ? 'billing_payment_succeeded'
                : 'billing_payment_failed',
              userId: user.id,
              tenantId: user.tenantId,
              details: {
                paymentIntentId,
                paymentMethodId,
                status: result.status,
              },
              timestamp: new Date().toISOString(),
            },
            user
          );
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao confirmar pagamento';
        setError(errorMessage);
        addNotification({
          type: 'error',
          title: 'Erro no Stripe',
          message: errorMessage,
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user, saveAuditLog, addNotification]
  );

  const cancelSubscription = useCallback(
    async (subscriptionId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        await makeStripeRequest(`subscriptions/${subscriptionId}`, 'DELETE');

        // Log the subscription cancellation
        if (user) {
          saveAuditLog(
            {
              action: 'billing_subscription_canceled',
              userId: user.id,
              tenantId: user.tenantId,
              details: {
                subscriptionId,
              },
              timestamp: new Date().toISOString(),
            },
            user
          );
        }

        addNotification({
          type: 'success',
          title: 'Assinatura Cancelada',
          message: 'Sua assinatura foi cancelada com sucesso.',
        });

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao cancelar assinatura';
        setError(errorMessage);
        addNotification({
          type: 'error',
          title: 'Erro no Stripe',
          message: errorMessage,
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user, saveAuditLog, addNotification]
  );

  const updateSubscription = useCallback(
    async (
      subscriptionId: string,
      newPriceId: string
    ): Promise<Subscription | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // First, get the current subscription
        const currentSubscription = await makeStripeRequest(
          `subscriptions/${subscriptionId}`,
          'GET'
        );

        // Update the subscription with new price
        const updatedSubscription = await makeStripeRequest(
          `subscriptions/${subscriptionId}`,
          'POST',
          {
            items: [
              {
                id: currentSubscription.items.data[0].id,
                price: newPriceId,
              },
            ],
            proration_behavior: 'create_prorations',
          }
        );

        // Log the subscription update
        if (user) {
          saveAuditLog(
            {
              action: 'billing_subscription_updated',
              userId: user.id,
              tenantId: user.tenantId,
              details: {
                subscriptionId,
                oldPriceId: currentSubscription.items.data[0].price.id,
                newPriceId,
                status: updatedSubscription.status,
              },
              timestamp: new Date().toISOString(),
            },
            user
          );
        }

        addNotification({
          type: 'success',
          title: 'Plano Atualizado',
          message: 'Seu plano foi atualizado com sucesso.',
        });

        return updatedSubscription;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao atualizar assinatura';
        setError(errorMessage);
        addNotification({
          type: 'error',
          title: 'Erro no Stripe',
          message: errorMessage,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, saveAuditLog, addNotification]
  );

  const getSubscription = useCallback(
    async (subscriptionId: string): Promise<Subscription | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const subscription = await makeStripeRequest(
          `subscriptions/${subscriptionId}`,
          'GET'
        );
        return subscription;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao buscar assinatura';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const createCheckoutSession = useCallback(
    async (
      priceId: string,
      customerId?: string
    ): Promise<{ url: string } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const session = await makeStripeRequest('checkout/sessions', 'POST', {
          customer: customerId,
          payment_method_types: ['card'],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/billing/canceled`,
        });

        return { url: session.url };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Erro ao criar sessão de checkout';
        setError(errorMessage);
        addNotification({
          type: 'error',
          title: 'Erro no Stripe',
          message: errorMessage,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [addNotification]
  );

  const handleWebhook = useCallback(
    async (payload: string, signature: string): Promise<boolean> => {
      try {
        // In a real implementation, you would verify the webhook signature
        // const event = stripe.webhooks.constructEvent(payload, signature, stripeConfig.webhookSecret);

        const event = JSON.parse(payload);

        switch (event.type) {
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted':
            // Handle subscription changes
            if (user) {
              saveAuditLog(
                {
                  action: 'billing_webhook_received',
                  userId: user.id,
                  tenantId: user.tenantId,
                  details: {
                    eventType: event.type,
                    subscriptionId: event.data.object.id,
                  },
                  timestamp: new Date().toISOString(),
                },
                user
              );
            }
            break;

          case 'invoice.payment_succeeded':
          case 'invoice.payment_failed':
            // Handle payment events
            if (user) {
              saveAuditLog(
                {
                  action: 'billing_webhook_received',
                  userId: user.id,
                  tenantId: user.tenantId,
                  details: {
                    eventType: event.type,
                    invoiceId: event.data.object.id,
                    amount: event.data.object.amount_paid,
                  },
                  timestamp: new Date().toISOString(),
                },
                user
              );
            }
            break;

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        return true;
      } catch (err) {
        console.error('Webhook handling error:', err);
        return false;
      }
    },
    [user, saveAuditLog]
  );

  return {
    isLoading,
    error,
    createCustomer,
    createSubscription,
    createPaymentIntent,
    confirmPayment,
    cancelSubscription,
    updateSubscription,
    getSubscription,
    createCheckoutSession,
    handleWebhook,
  };
};

export default useStripe;
export { STRIPE_PRICE_IDS };
export type { Customer, Subscription, PaymentIntent };
