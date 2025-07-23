import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// StoreKit 2 interfaces
interface StoreKit2Transaction {
  id: string;
  productID: string;
  purchaseDate: Date;
  originalPurchaseDate: Date;
  expirationDate?: Date;
  revocationDate?: Date;
  isUpgraded: boolean;
  offerID?: string;
  offerType?: number;
  environment: 'Sandbox' | 'Production';
  ownershipType: 'PURCHASED' | 'FAMILY_SHARED';
  signedDate: Date;
  appAccountToken?: string;
  subscriptionGroupID?: string;
  webOrderLineItemID?: string;
}

interface StoreKit2Product {
  id: string;
  displayName: string;
  description: string;
  price: number;
  displayPrice: string;
  type: 'consumable' | 'nonConsumable' | 'autoRenewable' | 'nonRenewable';
  subscription?: {
    subscriptionGroupID: string;
    subscriptionPeriod: {
      unit: 'day' | 'week' | 'month' | 'year';
      value: number;
    };
    introductoryOffer?: {
      displayPrice: string;
      period: {
        unit: 'day' | 'week' | 'month' | 'year';
        value: number;
      };
      periodCount: number;
      type: 'introductory' | 'promotional';
    };
    promotionalOffers?: Array<{
      id: string;
      displayPrice: string;
      period: {
        unit: 'day' | 'week' | 'month' | 'year';
        value: number;
      };
      periodCount: number;
    }>;
  };
}

interface StoreKit2VerificationResult<T> {
  isVerified: boolean;
  transaction: T;
  jwsRepresentation: string;
}
import { SubscriptionPlan } from '../types';
import { useAuth } from './useAuth';
import { useData } from './useData.minimal';
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
  // StoreKit 2 specific fields
  sk2Product?: StoreKit2Product;
  verificationResult?: StoreKit2VerificationResult<StoreKit2Product>;
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
  // StoreKit 2 specific fields
  sk2Transaction?: StoreKit2Transaction;
  verificationResult?: StoreKit2VerificationResult<StoreKit2Transaction>;
  jwsRepresentation?: string;
  environment?: 'Sandbox' | 'Production';
  ownershipType?: 'PURCHASED' | 'FAMILY_SHARED';
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
  // StoreKit 2 specific methods
  validateTransaction: (jwsRepresentation: string) => Promise<StoreKit2VerificationResult<StoreKit2Transaction> | null>;
  listenForTransactions: () => void;
  finishTransaction: (transactionId: string) => Promise<boolean>;
  getTransactionHistory: () => Promise<AppleTransaction[]>;
  checkEligibilityForIntroductoryOffer: (productId: string) => Promise<boolean>;
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
      
      // Check if StoreKit 2 is available
      const isStoreKit2Available = typeof window !== 'undefined' && 
        'webkit' in window && 
        'messageHandlers' in (window as any).webkit &&
        'storeKit2' in (window as any).webkit.messageHandlers;

      if (!isIOS) {
        // For development/web, use mock data
        setProducts(MOCK_APPLE_PRODUCTS);
        setIsAvailable(true);
        return;
      }

      if (isStoreKit2Available) {
        // Initialize StoreKit 2
        await initializeStoreKit2();
      } else {
        // Fallback to StoreKit 1 simulation
        console.warn('StoreKit 2 not available, falling back to simulation');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setProducts(MOCK_APPLE_PRODUCTS);
        setIsAvailable(true);
      }

      // Load any existing transactions
      await loadStoredTransactions();
      
      // Start listening for new transactions
      listenForTransactions();
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

  const initializeStoreKit2 = async () => {
    try {
      // Request products from StoreKit 2
      const productIds = Object.values(APPLE_PRODUCT_IDS).flat();
      
      const message = {
        action: 'requestProducts',
        productIds: productIds
      };
      
      // Send message to native StoreKit 2 handler
      if (typeof window !== 'undefined' && 
          'webkit' in window && 
          'messageHandlers' in (window as any).webkit &&
          'storeKit2' in (window as any).webkit.messageHandlers) {
        (window as any).webkit.messageHandlers.storeKit2.postMessage(message);
      }
      
      setIsAvailable(true);
    } catch (error) {
      console.error('StoreKit 2 initialization failed:', error);
      throw error;
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

      // Check if StoreKit 2 is available
      const isStoreKit2Available = typeof window !== 'undefined' && 
        'webkit' in window && 
        'messageHandlers' in (window as any).webkit &&
        'storeKit2' in (window as any).webkit.messageHandlers;

      if (isStoreKit2Available) {
        // Use StoreKit 2 purchase flow
        const purchaseResult = await purchaseWithStoreKit2(productId);
        if (!purchaseResult) return false;
        
        // Validate the transaction
        const verificationResult = await validateTransaction(purchaseResult.jwsRepresentation);
        if (!verificationResult || !verificationResult.isVerified) {
          throw new Error('Transaction verification failed');
        }
        
        // Process the verified transaction
        return await processVerifiedTransaction(verificationResult.transaction, product);
      } else {
        // Fallback to simulation for development
        return await simulatePurchase(productId, product);
      }
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

  const purchaseWithStoreKit2 = async (productId: string): Promise<{jwsRepresentation: string} | null> => {
    return new Promise((resolve, reject) => {
      // Set up response handler
      const handlePurchaseResponse = (event: any) => {
        if (event.data.action === 'purchaseResult') {
          window.removeEventListener('message', handlePurchaseResponse);
          if (event.data.success) {
            resolve(event.data.transaction);
          } else {
            reject(new Error(event.data.error || 'Purchase failed'));
          }
        }
      };
      
      window.addEventListener('message', handlePurchaseResponse);
      
      // Request purchase
      const message = {
        action: 'purchase',
        productId: productId
      };
      
      (window as any).webkit.messageHandlers.storeKit2.postMessage(message);
      
      // Timeout after 2 minutes
      setTimeout(() => {
        window.removeEventListener('message', handlePurchaseResponse);
        reject(new Error('Purchase timeout'));
      }, 120000);
    });
  };

  const simulatePurchase = async (productId: string, product: AppleProduct): Promise<boolean> => {
    // Simulate purchase delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create simulated transaction
    const transaction: AppleTransaction = {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId,
      purchaseDate: new Date().toISOString(),
      isTrialPeriod: false,
      isIntroductoryPricePeriod: !!product.introductoryPrice,
      isUpgraded: false,
      webOrderLineItemId: `woli_${Date.now()}`,
      subscriptionGroupIdentifier: 'com.fisioflow.subscriptions',
      environment: 'Sandbox',
      ownershipType: 'PURCHASED'
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

    return await processTransaction(transaction, product);
  };

  const processVerifiedTransaction = async (sk2Transaction: StoreKit2Transaction, product: AppleProduct): Promise<boolean> => {
    const transaction: AppleTransaction = {
      transactionId: sk2Transaction.id,
      productId: sk2Transaction.productID,
      purchaseDate: sk2Transaction.purchaseDate.toISOString(),
      expirationDate: sk2Transaction.expirationDate?.toISOString(),
      isTrialPeriod: false, // StoreKit 2 handles this differently
      isIntroductoryPricePeriod: !!sk2Transaction.offerID,
      isUpgraded: sk2Transaction.isUpgraded,
      webOrderLineItemId: sk2Transaction.webOrderLineItemID || '',
      subscriptionGroupIdentifier: sk2Transaction.subscriptionGroupID,
      sk2Transaction: sk2Transaction,
      environment: sk2Transaction.environment,
      ownershipType: sk2Transaction.ownershipType
    };

    return await processTransaction(transaction, product);
  };

  const processTransaction = async (transaction: AppleTransaction, product: AppleProduct): Promise<boolean> => {
    // Update active transactions
    const updatedTransactions = [...activeTransactions, transaction];
    saveTransactions(updatedTransactions);

    // Update tenant subscription
    const plan = getSubscriptionPlanFromProductId(transaction.productId);
    if (plan && currentTenant && user) {
      const updatedTenant = {
        ...currentTenant,
        plan,
        appleSubscriptionId: transaction.transactionId,
        subscriptionExpiresAt: transaction.expirationDate,
      };
      saveTenant(updatedTenant, user);
    }

    // Log the purchase
    if (user) {
      saveAuditLog(
        {
          action: 'apple_iap_purchase',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            productId: transaction.productId,
            transactionId: transaction.transactionId,
            plan,
            price: product.price,
            environment: transaction.environment,
            ownershipType: transaction.ownershipType
          },
          timestamp: new Date().toISOString(),
        },
        user
      );
    }

    // Finish the transaction (important for StoreKit 2)
    await finishTransaction(transaction.transactionId);

    addNotification({
      type: 'success',
      title: 'Compra Realizada!',
      message: `Sua assinatura ${product.title} foi ativada com sucesso.`,
    });

    return true;
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

  // StoreKit 2 specific methods
  const validateTransaction = async (jwsRepresentation: string): Promise<StoreKit2VerificationResult<StoreKit2Transaction> | null> => {
    try {
      // In production, this would validate against Apple's servers
      // For development, we'll simulate validation
      if (!jwsRepresentation) return null;
      
      // Mock validation - in production, decode and verify JWS
      const mockTransaction: StoreKit2Transaction = {
        id: `verified_${Date.now()}`,
        productID: 'com.fisioflow.silver.monthly',
        purchaseDate: new Date(),
        originalPurchaseDate: new Date(),
        isUpgraded: false,
        environment: 'Sandbox',
        ownershipType: 'PURCHASED',
        signedDate: new Date()
      };
      
      return {
        isVerified: true,
        transaction: mockTransaction,
        jwsRepresentation
      };
    } catch (error) {
      console.error('Transaction validation failed:', error);
      return null;
    }
  };

  const listenForTransactions = () => {
    // Set up listener for transaction updates from StoreKit 2
    const handleTransactionUpdate = (event: any) => {
      if (event.data.action === 'transactionUpdate') {
        const { transaction, isVerified } = event.data;
        if (isVerified) {
          // Process the new transaction
          console.log('New verified transaction received:', transaction);
          // Add to active transactions and update UI
          const updatedTransactions = [...activeTransactions];
          const existingIndex = updatedTransactions.findIndex(t => t.transactionId === transaction.id);
          
          const appleTransaction: AppleTransaction = {
            transactionId: transaction.id,
            productId: transaction.productID,
            purchaseDate: transaction.purchaseDate,
            expirationDate: transaction.expirationDate,
            isTrialPeriod: false,
            isIntroductoryPricePeriod: !!transaction.offerID,
            isUpgraded: transaction.isUpgraded,
            webOrderLineItemId: transaction.webOrderLineItemID || '',
            subscriptionGroupIdentifier: transaction.subscriptionGroupID,
            sk2Transaction: transaction,
            environment: transaction.environment,
            ownershipType: transaction.ownershipType
          };
          
          if (existingIndex >= 0) {
            updatedTransactions[existingIndex] = appleTransaction;
          } else {
            updatedTransactions.push(appleTransaction);
          }
          
          saveTransactions(updatedTransactions);
        }
      }
    };
    
    window.addEventListener('message', handleTransactionUpdate);
    
    // Request to start listening for transactions
    if (typeof window !== 'undefined' && 
        'webkit' in window && 
        'messageHandlers' in (window as any).webkit &&
        'storeKit2' in (window as any).webkit.messageHandlers) {
      (window as any).webkit.messageHandlers.storeKit2.postMessage({
        action: 'startTransactionListener'
      });
    }
  };

  const finishTransaction = async (transactionId: string): Promise<boolean> => {
    try {
      const isStoreKit2Available = typeof window !== 'undefined' && 
        'webkit' in window && 
        'messageHandlers' in (window as any).webkit &&
        'storeKit2' in (window as any).webkit.messageHandlers;
      
      if (isStoreKit2Available) {
        (window as any).webkit.messageHandlers.storeKit2.postMessage({
          action: 'finishTransaction',
          transactionId: transactionId
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to finish transaction:', error);
      return false;
    }
  };

  const getTransactionHistory = async (): Promise<AppleTransaction[]> => {
    try {
      const isStoreKit2Available = typeof window !== 'undefined' && 
        'webkit' in window && 
        'messageHandlers' in (window as any).webkit &&
        'storeKit2' in (window as any).webkit.messageHandlers;
      
      if (isStoreKit2Available) {
        return new Promise((resolve, reject) => {
          const handleHistoryResponse = (event: any) => {
            if (event.data.action === 'transactionHistory') {
              window.removeEventListener('message', handleHistoryResponse);
              const transactions = event.data.transactions.map((t: StoreKit2Transaction) => ({
                transactionId: t.id,
                productId: t.productID,
                purchaseDate: t.purchaseDate,
                expirationDate: t.expirationDate,
                isTrialPeriod: false,
                isIntroductoryPricePeriod: !!t.offerID,
                isUpgraded: t.isUpgraded,
                webOrderLineItemId: t.webOrderLineItemID || '',
                subscriptionGroupIdentifier: t.subscriptionGroupID,
                sk2Transaction: t,
                environment: t.environment,
                ownershipType: t.ownershipType
              }));
              resolve(transactions);
            }
          };
          
          window.addEventListener('message', handleHistoryResponse);
          
          (window as any).webkit.messageHandlers.storeKit2.postMessage({
            action: 'getTransactionHistory'
          });
          
          setTimeout(() => {
            window.removeEventListener('message', handleHistoryResponse);
            reject(new Error('Transaction history timeout'));
          }, 10000);
        });
      }
      
      // Fallback to stored transactions
      return activeTransactions;
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return activeTransactions;
    }
  };

  const checkEligibilityForIntroductoryOffer = async (productId: string): Promise<boolean> => {
    try {
      const isStoreKit2Available = typeof window !== 'undefined' && 
        'webkit' in window && 
        'messageHandlers' in (window as any).webkit &&
        'storeKit2' in (window as any).webkit.messageHandlers;
      
      if (isStoreKit2Available) {
        return new Promise((resolve, reject) => {
          const handleEligibilityResponse = (event: any) => {
            if (event.data.action === 'eligibilityResult') {
              window.removeEventListener('message', handleEligibilityResponse);
              resolve(event.data.isEligible);
            }
          };
          
          window.addEventListener('message', handleEligibilityResponse);
          
          (window as any).webkit.messageHandlers.storeKit2.postMessage({
            action: 'checkEligibility',
            productId: productId
          });
          
          setTimeout(() => {
            window.removeEventListener('message', handleEligibilityResponse);
            resolve(false); // Default to false on timeout
          }, 5000);
        });
      }
      
      // For development, check if user has never purchased this product
      const hasExistingPurchase = activeTransactions.some(t => 
        t.productId === productId && !t.cancellationDate
      );
      return !hasExistingPurchase;
    } catch (error) {
      console.error('Failed to check eligibility:', error);
      return false;
    }
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
    // StoreKit 2 methods
    validateTransaction,
    listenForTransactions,
    finishTransaction,
    getTransactionHistory,
    checkEligibilityForIntroductoryOffer,
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
