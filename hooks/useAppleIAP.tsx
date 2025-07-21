import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { SubscriptionPlan } from '../types';
import { useAuth } from './useAuth';
import { useData } from './useData';
import { useNotification } from './useNotification';

interface AppleProduct {
  productId: string;
  type: 'subscription' | 'consumable' | 'non_consumable';
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  title: string;
  description: string;
  subscriptionPeriod?: {
    unit: 'day' | 'week' | 'month' | 'year';
    numberOfUnits: number;
  };
  introductoryPrice?: {
    price: string;
    priceAmountMicros: number;
    subscriptionPeriod: {
      unit: 'day' | 'week' | 'month' | 'year';
      numberOfUnits: number;
    };
    numberOfPeriods: number;
  };
}

interface AppleTransaction {
  transactionId: string;
  productId: string;
  purchaseDate: string;
  expirationDate?: string;
  isTrialPeriod: boolean;
  isIntroductoryPricePeriod: boolean;
  cancellationDate?: string;
  cancellationReason?: string;
  isUpgraded: boolean;
  webOrderLineItemId: string;
  subscriptionGroupIdentifier?: string;
}

interface AppleReceipt {
  receiptData: string;
  transactions: AppleTransaction[];
  bundleId: string;
  applicationVersion: string;
  originalApplicationVersion: string;
  creationDate: string;
}

interface AppleIAPContextType {
  products: AppleProduct[];
  isLoading: boolean;
  isAvailable: boolean;
  loadProducts: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  validateReceipt: (receiptData: string) => Promise<boolean>;
  getActiveSubscriptions: () => AppleTransaction[];
  cancelSubscription: (productId: string) => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
  getSubscriptionInfo: (productId: string) => AppleTransaction | null;
}

const AppleIAPContext = createContext<AppleIAPContextType | undefined>(
  undefined
);

// Apple product IDs mapping to our subscription plans
const APPLE_PRODUCT_IDS: Record<SubscriptionPlan, string[]> = {
  free: [], // Free plan has no products
  silver: ['com.fisioflow.silver.monthly', 'com.fisioflow.silver.yearly'],
  gold: ['com.fisioflow.gold.monthly', 'com.fisioflow.gold.yearly'],
  platinum: ['com.fisioflow.platinum.monthly', 'com.fisioflow.platinum.yearly'],
};

// Mock Apple products for development
const MOCK_APPLE_PRODUCTS: AppleProduct[] = [
  {
    productId: 'com.fisioflow.silver.monthly',
    type: 'subscription',
    price: 'R$ 29,90',
    priceAmountMicros: 29900000,
    priceCurrencyCode: 'BRL',
    title: 'FisioFlow Silver - Mensal',
    description: 'Plano Silver com recursos avançados para fisioterapeutas',
    subscriptionPeriod: {
      unit: 'month',
      numberOfUnits: 1,
    },
    introductoryPrice: {
      price: 'R$ 14,90',
      priceAmountMicros: 14900000,
      subscriptionPeriod: {
        unit: 'month',
        numberOfUnits: 1,
      },
      numberOfPeriods: 1,
    },
  },
  {
    productId: 'com.fisioflow.silver.yearly',
    type: 'subscription',
    price: 'R$ 299,90',
    priceAmountMicros: 299900000,
    priceCurrencyCode: 'BRL',
    title: 'FisioFlow Silver - Anual',
    description: 'Plano Silver anual com 2 meses grátis',
    subscriptionPeriod: {
      unit: 'year',
      numberOfUnits: 1,
    },
  },
  {
    productId: 'com.fisioflow.gold.monthly',
    type: 'subscription',
    price: 'R$ 49,90',
    priceAmountMicros: 49900000,
    priceCurrencyCode: 'BRL',
    title: 'FisioFlow Gold - Mensal',
    description: 'Plano Gold com IA avançada e relatórios completos',
    subscriptionPeriod: {
      unit: 'month',
      numberOfUnits: 1,
    },
    introductoryPrice: {
      price: 'R$ 24,90',
      priceAmountMicros: 24900000,
      subscriptionPeriod: {
        unit: 'month',
        numberOfUnits: 1,
      },
      numberOfPeriods: 1,
    },
  },
  {
    productId: 'com.fisioflow.gold.yearly',
    type: 'subscription',
    price: 'R$ 499,90',
    priceAmountMicros: 499900000,
    priceCurrencyCode: 'BRL',
    title: 'FisioFlow Gold - Anual',
    description: 'Plano Gold anual com 2 meses grátis',
    subscriptionPeriod: {
      unit: 'year',
      numberOfUnits: 1,
    },
  },
  {
    productId: 'com.fisioflow.platinum.monthly',
    type: 'subscription',
    price: 'R$ 99,90',
    priceAmountMicros: 99900000,
    priceCurrencyCode: 'BRL',
    title: 'FisioFlow Platinum - Mensal',
    description: 'Plano Platinum com todos os recursos premium',
    subscriptionPeriod: {
      unit: 'month',
      numberOfUnits: 1,
    },
    introductoryPrice: {
      price: 'R$ 49,90',
      priceAmountMicros: 49900000,
      subscriptionPeriod: {
        unit: 'month',
        numberOfUnits: 1,
      },
      numberOfPeriods: 1,
    },
  },
  {
    productId: 'com.fisioflow.platinum.yearly',
    type: 'subscription',
    price: 'R$ 999,90',
    priceAmountMicros: 999900000,
    priceCurrencyCode: 'BRL',
    title: 'FisioFlow Platinum - Anual',
    description: 'Plano Platinum anual com 2 meses grátis',
    subscriptionPeriod: {
      unit: 'year',
      numberOfUnits: 1,
    },
  },
];

interface AppleIAPProviderProps {
  children: ReactNode;
}

export const AppleIAPProvider: React.FC<AppleIAPProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const { tenants, saveTenant, saveAuditLog } = useData();
  const { addNotification } = useNotification();

  const [products, setProducts] = useState<AppleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeTransactions, setActiveTransactions] = useState<
    AppleTransaction[]
  >([]);

  const currentTenant = tenants.find((t) => t.id === user?.tenantId);

  useEffect(() => {
    initializeIAP();
  }, []);

  useEffect(() => {
    // Check subscription status every 5 minutes
    const interval = setInterval(
      () => {
        checkSubscriptionStatus();
      },
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  const initializeIAP = async () => {
    try {
      setIsLoading(true);

      // Check if running on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (!isIOS) {
        // For development/web, use mock data
        setProducts(MOCK_APPLE_PRODUCTS);
        setIsAvailable(true);
        return;
      }

      // In a real iOS app, this would initialize the StoreKit
      // For now, we'll simulate the initialization
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setProducts(MOCK_APPLE_PRODUCTS);
      setIsAvailable(true);

      // Load any existing transactions
      await loadStoredTransactions();
    } catch (error) {
      console.error('Failed to initialize Apple IAP:', error);
      addNotification({
        type: 'error',
        title: 'Erro de Inicialização',
        message: 'Não foi possível inicializar as compras da App Store.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStoredTransactions = async () => {
    try {
      const stored = localStorage.getItem('fisioflow_apple_transactions');
      if (stored) {
        const transactions = JSON.parse(stored);
        setActiveTransactions(transactions);
      }
    } catch (error) {
      console.error('Error loading stored transactions:', error);
    }
  };

  const saveTransactions = (transactions: AppleTransaction[]) => {
    setActiveTransactions(transactions);
    localStorage.setItem(
      'fisioflow_apple_transactions',
      JSON.stringify(transactions)
    );
  };

  const loadProducts = async (): Promise<void> => {
    if (!isAvailable) {
      throw new Error('Apple IAP not available');
    }

    try {
      setIsLoading(true);

      // In a real iOS app, this would call StoreKit to load products
      // For now, we'll use the mock products
      await new Promise((resolve) => setTimeout(resolve, 500));

      setProducts(MOCK_APPLE_PRODUCTS);
    } catch (error) {
      console.error('Failed to load products:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseProduct = async (productId: string): Promise<boolean> => {
    if (!isAvailable || !user || !currentTenant) {
      return false;
    }

    try {
      setIsLoading(true);

      const product = products.find((p) => p.productId === productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // In a real iOS app, this would initiate the purchase flow
      // For now, we'll simulate the purchase
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate successful purchase
      const transaction: AppleTransaction = {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId,
        purchaseDate: new Date().toISOString(),
        isTrialPeriod: false,
        isIntroductoryPricePeriod: !!product.introductoryPrice,
        isUpgraded: false,
        webOrderLineItemId: `woli_${Date.now()}`,
        subscriptionGroupIdentifier: 'com.fisioflow.subscriptions',
      };

      // Set expiration date for subscriptions
      if (product.type === 'subscription' && product.subscriptionPeriod) {
        const expirationDate = new Date();
        if (product.subscriptionPeriod.unit === 'month') {
          expirationDate.setMonth(
            expirationDate.getMonth() + product.subscriptionPeriod.numberOfUnits
          );
        } else if (product.subscriptionPeriod.unit === 'year') {
          expirationDate.setFullYear(
            expirationDate.getFullYear() +
              product.subscriptionPeriod.numberOfUnits
          );
        }
        transaction.expirationDate = expirationDate.toISOString();
      }

      // Update active transactions
      const updatedTransactions = [...activeTransactions, transaction];
      saveTransactions(updatedTransactions);

      // Update tenant subscription
      const plan = getSubscriptionPlanFromProductId(productId);
      if (plan) {
        const updatedTenant = {
          ...currentTenant,
          plan,
          appleSubscriptionId: transaction.transactionId,
          subscriptionExpiresAt: transaction.expirationDate,
        };
        saveTenant(updatedTenant, user);
      }

      // Log the purchase
      saveAuditLog(
        {
          action: 'apple_iap_purchase',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            productId,
            transactionId: transaction.transactionId,
            plan,
            price: product.price,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );

      addNotification({
        type: 'success',
        title: 'Compra Realizada!',
        message: `Sua assinatura ${product.title} foi ativada com sucesso.`,
      });

      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      addNotification({
        type: 'error',
        title: 'Erro na Compra',
        message: 'Não foi possível processar sua compra. Tente novamente.',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!isAvailable || !user) {
      return false;
    }

    try {
      setIsLoading(true);

      // In a real iOS app, this would call StoreKit to restore purchases
      // For now, we'll simulate restoring from stored data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await loadStoredTransactions();

      // Update tenant with active subscription if found
      const activeSubscription = getActiveSubscriptions()[0];
      if (activeSubscription && currentTenant) {
        const plan = getSubscriptionPlanFromProductId(
          activeSubscription.productId
        );
        if (plan) {
          const updatedTenant = {
            ...currentTenant,
            plan,
            appleSubscriptionId: activeSubscription.transactionId,
            subscriptionExpiresAt: activeSubscription.expirationDate,
          };
          saveTenant(updatedTenant, user);
        }
      }

      addNotification({
        type: 'success',
        title: 'Compras Restauradas',
        message: 'Suas compras foram restauradas com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      addNotification({
        type: 'error',
        title: 'Erro na Restauração',
        message: 'Não foi possível restaurar suas compras.',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const validateReceipt = async (receiptData: string): Promise<boolean> => {
    try {
      // In a real app, this would validate the receipt with Apple's servers
      // For now, we'll simulate validation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock validation - always return true for development
      return true;
    } catch (error) {
      console.error('Receipt validation failed:', error);
      return false;
    }
  };

  const getActiveSubscriptions = (): AppleTransaction[] => {
    const now = new Date();
    return activeTransactions.filter((transaction) => {
      if (!transaction.expirationDate) return false;
      if (transaction.cancellationDate) return false;
      return new Date(transaction.expirationDate) > now;
    });
  };

  const cancelSubscription = async (productId: string): Promise<boolean> => {
    try {
      // In a real iOS app, this would redirect to App Store subscription management
      // For now, we'll simulate cancellation
      const updatedTransactions = activeTransactions.map((transaction) => {
        if (
          transaction.productId === productId &&
          !transaction.cancellationDate
        ) {
          return {
            ...transaction,
            cancellationDate: new Date().toISOString(),
            cancellationReason: 'user_cancelled',
          };
        }
        return transaction;
      });

      saveTransactions(updatedTransactions);

      // Update tenant to free plan
      if (currentTenant && user) {
        const updatedTenant = {
          ...currentTenant,
          plan: 'free' as SubscriptionPlan,
          appleSubscriptionId: undefined,
          subscriptionExpiresAt: undefined,
        };
        saveTenant(updatedTenant, user);
      }

      addNotification({
        type: 'info',
        title: 'Assinatura Cancelada',
        message:
          'Sua assinatura foi cancelada. Você ainda pode usar os recursos até o final do período pago.',
      });

      return true;
    } catch (error) {
      console.error('Cancellation failed:', error);
      return false;
    }
  };

  const checkSubscriptionStatus = async (): Promise<void> => {
    if (!user || !currentTenant) return;

    try {
      const activeSubscriptions = getActiveSubscriptions();

      if (activeSubscriptions.length === 0 && currentTenant.plan !== 'free') {
        // No active subscriptions, revert to free plan
        const updatedTenant = {
          ...currentTenant,
          plan: 'free' as SubscriptionPlan,
          appleSubscriptionId: undefined,
          subscriptionExpiresAt: undefined,
        };
        saveTenant(updatedTenant, user);

        addNotification({
          type: 'warning',
          title: 'Assinatura Expirada',
          message:
            'Sua assinatura expirou. Você foi movido para o plano gratuito.',
        });
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const getSubscriptionInfo = (productId: string): AppleTransaction | null => {
    return activeTransactions.find((t) => t.productId === productId) || null;
  };

  const getSubscriptionPlanFromProductId = (
    productId: string
  ): SubscriptionPlan | null => {
    for (const [plan, productIds] of Object.entries(APPLE_PRODUCT_IDS)) {
      if (productIds.includes(productId)) {
        return plan as SubscriptionPlan;
      }
    }
    return null;
  };

  const value: AppleIAPContextType = {
    products,
    isLoading,
    isAvailable,
    loadProducts,
    purchaseProduct,
    restorePurchases,
    validateReceipt,
    getActiveSubscriptions,
    cancelSubscription,
    checkSubscriptionStatus,
    getSubscriptionInfo,
  };

  return (
    <AppleIAPContext.Provider value={value}>
      {children}
    </AppleIAPContext.Provider>
  );
};

export const useAppleIAP = (): AppleIAPContextType => {
  const context = useContext(AppleIAPContext);
  if (!context) {
    throw new Error('useAppleIAP must be used within an AppleIAPProvider');
  }
  return context;
};

export default useAppleIAP;
export type { AppleProduct, AppleTransaction, AppleReceipt };
export { APPLE_PRODUCT_IDS };
