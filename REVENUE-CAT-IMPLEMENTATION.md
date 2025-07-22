# 💰 Revenue Cat - Implementação Freemium FisioFlow

## 🎯 Overview da Monetização

Sistema de assinaturas multiplataforma (iOS, Android, Web) com modelo freemium de 3 tiers:
- **Free**: 10 pacientes, 1 fisioterapeuta
- **Pro**: 100 pacientes, 5 fisioterapeutas, AI completo (R$ 29,90/mês)
- **Enterprise**: Ilimitado, features customizadas (R$ 99,90/mês)

## 🛠️ Setup Revenue Cat

### 1. Configuração Inicial
```bash
# Instalar SDK
npm install react-native-purchases

# iOS additional setup
cd ios && pod install
```

### 2. Revenue Cat Dashboard Setup
```typescript
// constants/purchases.ts
const REVENUE_CAT_CONFIG = {
  apiKey: {
    ios: process.env.REVENUE_CAT_IOS_KEY || 'appl_xxx',
    android: process.env.REVENUE_CAT_ANDROID_KEY || 'goog_xxx',
  },
  
  // Produtos configurados no RC Dashboard
  products: {
    PRO_MONTHLY: 'fisioflow_pro_monthly',
    PRO_YEARLY: 'fisioflow_pro_yearly', 
    ENTERPRISE_MONTHLY: 'fisioflow_enterprise_monthly',
    ENTERPRISE_YEARLY: 'fisioflow_enterprise_yearly',
  },
  
  // Entitlements (permissões)
  entitlements: {
    PRO: 'pro_features',
    ENTERPRISE: 'enterprise_features',
  },
};
```

## 🏗️ Arquitetura de Assinaturas

### Estrutura de Planos
```typescript
// types/subscription.ts
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  currency: 'BRL';
  interval: 'monthly' | 'yearly';
  features: PlanFeatures;
  popular?: boolean;
  trial?: {
    days: number;
    type: 'free' | 'paid';
  };
}

export interface PlanFeatures {
  maxPatients: number | 'unlimited';
  maxPhysiotherapists: number | 'unlimited';
  aiAnalysis: boolean;
  advancedReports: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  FREE: {
    id: 'free',
    name: 'Gratuito',
    price: 'R$ 0',
    priceValue: 0,
    currency: 'BRL',
    interval: 'monthly',
    features: {
      maxPatients: 10,
      maxPhysiotherapists: 1,
      aiAnalysis: false,
      advancedReports: false,
      customBranding: false,
      prioritySupport: false,
      apiAccess: false,
      whiteLabel: false,
    },
  },
  
  PRO: {
    id: 'pro',
    name: 'Profissional',
    price: 'R$ 29,90',
    priceValue: 29.90,
    currency: 'BRL',
    interval: 'monthly',
    popular: true,
    trial: {
      days: 7,
      type: 'free',
    },
    features: {
      maxPatients: 100,
      maxPhysiotherapists: 5,
      aiAnalysis: true,
      advancedReports: true,
      customBranding: false,
      prioritySupport: true,
      apiAccess: false,
      whiteLabel: false,
    },
  },
  
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'R$ 99,90',
    priceValue: 99.90,
    currency: 'BRL',
    interval: 'monthly',
    features: {
      maxPatients: 'unlimited',
      maxPhysiotherapists: 'unlimited',
      aiAnalysis: true,
      advancedReports: true,
      customBranding: true,
      prioritySupport: true,
      apiAccess: true,
      whiteLabel: true,
    },
  },
};
```

## 🔧 Service de Purchases

### Core Purchases Service
```typescript
// services/purchasesService.ts
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering,
  PurchasesPackage 
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUE_CAT_CONFIG } from '../constants/purchases';

class PurchasesService {
  private initialized = false;
  
  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Setup Revenue Cat
      if (Platform.OS === 'ios') {
        Purchases.configure({ 
          apiKey: REVENUE_CAT_CONFIG.apiKey.ios,
          appUserID: userId 
        });
      } else if (Platform.OS === 'android') {
        Purchases.configure({ 
          apiKey: REVENUE_CAT_CONFIG.apiKey.android,
          appUserID: userId 
        });
      }
      
      this.initialized = true;
      console.log('✅ Revenue Cat inicializado');
      
      // Setup listeners
      this.setupListeners();
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Revenue Cat:', error);
      throw error;
    }
  }
  
  private setupListeners(): void {
    // Listener para atualizações de customer info
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      console.log('📱 Customer info atualizada:', customerInfo);
      // Notifica app sobre mudanças na assinatura
      this.notifySubscriptionChange(customerInfo);
    });
  }
  
  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('❌ Erro ao obter customer info:', error);
      throw error;
    }
  }
  
  async getOfferings(): Promise<PurchasesOffering[]> {
    try {
      const offerings = await Purchases.getOfferings();
      return Object.values(offerings.all);
    } catch (error) {
      console.error('❌ Erro ao obter ofertas:', error);
      throw error;
    }
  }
  
  async purchasePackage(packageToBuy: PurchasesPackage): Promise<{
    customerInfo: CustomerInfo;
    success: boolean;
  }> {
    try {
      console.log('💳 Iniciando compra:', packageToBuy.identifier);
      
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageToBuy);
      
      console.log('✅ Compra realizada:', productIdentifier);
      
      return {
        customerInfo,
        success: true,
      };
      
    } catch (error: any) {
      console.error('❌ Erro na compra:', error);
      
      // Trata diferentes tipos de erro
      if (error.userCancelled) {
        return { customerInfo: await this.getCustomerInfo(), success: false };
      }
      
      throw error;
    }
  }
  
  async restorePurchases(): Promise<CustomerInfo> {
    try {
      console.log('🔄 Restaurando compras...');
      const customerInfo = await Purchases.restorePurchases();
      console.log('✅ Compras restauradas');
      return customerInfo;
    } catch (error) {
      console.error('❌ Erro ao restaurar compras:', error);
      throw error;
    }
  }
  
  async syncPurchases(): Promise<CustomerInfo> {
    try {
      return await Purchases.syncPurchases();
    } catch (error) {
      console.error('❌ Erro ao sincronizar compras:', error);
      throw error;
    }
  }
  
  private notifySubscriptionChange(customerInfo: CustomerInfo): void {
    // Implementar notificação global do app
    // Pode usar EventEmitter ou Context API
  }
  
  // Utility methods
  hasActiveSubscription(customerInfo: CustomerInfo): boolean {
    return Object.keys(customerInfo.entitlements.active).length > 0;
  }
  
  hasProSubscription(customerInfo: CustomerInfo): boolean {
    return customerInfo.entitlements.active[REVENUE_CAT_CONFIG.entitlements.PRO] !== undefined;
  }
  
  hasEnterpriseSubscription(customerInfo: CustomerInfo): boolean {
    return customerInfo.entitlements.active[REVENUE_CAT_CONFIG.entitlements.ENTERPRISE] !== undefined;
  }
  
  getCurrentPlan(customerInfo: CustomerInfo): 'free' | 'pro' | 'enterprise' {
    if (this.hasEnterpriseSubscription(customerInfo)) {
      return 'enterprise';
    } else if (this.hasProSubscription(customerInfo)) {
      return 'pro';
    }
    return 'free';
  }
}

export const purchasesService = new PurchasesService();
```

## 🎣 Hook de Purchases

### usePurchases Hook
```typescript
// hooks/usePurchases.ts
import { useState, useEffect, useCallback } from 'react';
import { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { purchasesService } from '../services/purchasesService';
import { SUBSCRIPTION_PLANS } from '../types/subscription';

export const usePurchases = (userId?: string) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize on mount
  useEffect(() => {
    initializePurchases();
  }, [userId]);
  
  const initializePurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await purchasesService.initialize(userId);
      
      // Load customer info and offerings
      const [customerInfo, offerings] = await Promise.all([
        purchasesService.getCustomerInfo(),
        purchasesService.getOfferings(),
      ]);
      
      setCustomerInfo(customerInfo);
      setOfferings(offerings);
      
    } catch (error) {
      console.error('Erro ao inicializar purchases:', error);
      setError('Erro ao carregar informações de assinatura');
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  const purchasePackage = useCallback(async (packageId: string) => {
    if (!customerInfo || purchasing) return false;
    
    try {
      setPurchasing(true);
      setError(null);
      
      // Find package in offerings
      const packageToBuy = offerings
        .flatMap(offering => offering.availablePackages)
        .find(pkg => pkg.identifier === packageId);
      
      if (!packageToBuy) {
        throw new Error('Pacote não encontrado');
      }
      
      const result = await purchasesService.purchasePackage(packageToBuy);
      
      if (result.success) {
        setCustomerInfo(result.customerInfo);
        return true;
      }
      
      return false;
      
    } catch (error: any) {
      console.error('Erro na compra:', error);
      setError(error.message || 'Erro na compra');
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [customerInfo, offerings, purchasing]);
  
  const restorePurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const restoredCustomerInfo = await purchasesService.restorePurchases();
      setCustomerInfo(restoredCustomerInfo);
      
      return true;
    } catch (error: any) {
      setError(error.message || 'Erro ao restaurar compras');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Derived values
  const currentPlan = customerInfo ? purchasesService.getCurrentPlan(customerInfo) : 'free';
  const hasActiveSubscription = customerInfo ? purchasesService.hasActiveSubscription(customerInfo) : false;
  const planFeatures = SUBSCRIPTION_PLANS[currentPlan.toUpperCase()]?.features || SUBSCRIPTION_PLANS.FREE.features;
  
  const canAccessFeature = useCallback((feature: keyof typeof planFeatures) => {
    return planFeatures[feature] === true || 
           (typeof planFeatures[feature] === 'number' && planFeatures[feature] > 0) ||
           planFeatures[feature] === 'unlimited';
  }, [planFeatures]);
  
  return {
    // State
    customerInfo,
    offerings,
    loading,
    purchasing,
    error,
    
    // Current subscription info
    currentPlan,
    hasActiveSubscription,
    planFeatures,
    
    // Actions
    purchasePackage,
    restorePurchases,
    canAccessFeature,
    
    // Utils
    initializePurchases,
  };
};
```

## 🎨 Paywall Component

### Paywall UI
```typescript
// components/subscription/Paywall.tsx
import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { usePurchases } from '../../hooks/usePurchases';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';
import Button from '../ui/Button';
import { Crown, Check, X } from 'lucide-react-native';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  preselectedPlan?: 'pro' | 'enterprise';
}

const Paywall: React.FC<PaywallProps> = ({
  visible,
  onClose,
  preselectedPlan = 'pro'
}) => {
  const { 
    offerings, 
    purchasePackage, 
    restorePurchases,
    purchasing, 
    currentPlan,
    loading 
  } = usePurchases();
  
  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan);
  
  const handlePurchase = async (planId: string) => {
    const success = await purchasePackage(planId);
    
    if (success) {
      Alert.alert('Sucesso!', 'Sua assinatura foi ativada com sucesso!');
      onClose();
    }
  };
  
  const PlanCard = ({ plan, planKey }: { plan: any, planKey: string }) => {
    const isCurrentPlan = currentPlan === planKey.toLowerCase();
    const isSelected = selectedPlan === planKey.toLowerCase();
    
    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          isSelected && styles.selectedPlan,
          isCurrentPlan && styles.currentPlan,
        ]}
        onPress={() => setSelectedPlan(planKey.toLowerCase())}
        disabled={isCurrentPlan}
      >
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>Mais Popular</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>{plan.price}</Text>
          {plan.interval && (
            <Text style={styles.planInterval}>/{plan.interval === 'monthly' ? 'mês' : 'ano'}</Text>
          )}
        </View>
        
        {plan.trial && (
          <Text style={styles.trialText}>
            {plan.trial.days} dias grátis
          </Text>
        )}
        
        <View style={styles.featuresList}>
          <FeatureItem 
            text={`${plan.features.maxPatients === 'unlimited' ? 'Ilimitados' : plan.features.maxPatients} pacientes`}
            included={true}
          />
          <FeatureItem 
            text={`${plan.features.maxPhysiotherapists === 'unlimited' ? 'Ilimitados' : plan.features.maxPhysiotherapists} fisioterapeutas`}
            included={true}
          />
          <FeatureItem 
            text="Análises AI completas"
            included={plan.features.aiAnalysis}
          />
          <FeatureItem 
            text="Relatórios avançados"
            included={plan.features.advancedReports}
          />
          <FeatureItem 
            text="Suporte prioritário"
            included={plan.features.prioritySupport}
          />
          {planKey === 'ENTERPRISE' && (
            <>
              <FeatureItem 
                text="API Access"
                included={plan.features.apiAccess}
              />
              <FeatureItem 
                text="White Label"
                included={plan.features.whiteLabel}
              />
            </>
          )}
        </View>
        
        {isCurrentPlan ? (
          <View style={styles.currentPlanButton}>
            <Text style={styles.currentPlanText}>Plano Atual</Text>
          </View>
        ) : (
          <Button
            title={planKey === 'FREE' ? 'Usar Grátis' : `Assinar ${plan.name}`}
            onPress={() => handlePurchase(plan.id)}
            disabled={purchasing || loading}
            loading={purchasing}
            style={[
              styles.purchaseButton,
              isSelected && styles.selectedPurchaseButton
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };
  
  const FeatureItem = ({ text, included }: { text: string, included: boolean }) => (
    <View style={styles.featureItem}>
      {included ? (
        <Check size={16} color="#22c55e" />
      ) : (
        <X size={16} color="#ef4444" />
      )}
      <Text style={[
        styles.featureText,
        !included && styles.featureTextDisabled
      ]}>
        {text}
      </Text>
    </View>
  );
  
  if (!visible) return null;
  
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.header}>
            <Crown size={32} color="#f59e0b" />
            <Text style={styles.title}>Escolha seu Plano</Text>
            <Text style={styles.subtitle}>
              Desbloqueie todo o potencial do FisioFlow
            </Text>
          </View>
          
          <View style={styles.plansContainer}>
            {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
              <PlanCard key={key} plan={plan} planKey={key} />
            ))}
          </View>
          
          <View style={styles.footer}>
            <Button
              title="Restaurar Compras"
              variant="secondary"
              onPress={restorePurchases}
              disabled={loading}
            />
            
            <Button
              title="Fechar"
              variant="secondary"
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlan: {
    borderColor: '#3b82f6',
  },
  currentPlan: {
    backgroundColor: '#164e63',
    borderColor: '#0891b2',
  },
  // ... mais estilos
});

export default Paywall;
```

## 🚫 Feature Gating

### Hook para Controle de Features
```typescript
// hooks/useFeatureGate.ts
import { usePurchases } from './usePurchases';
import { useAuth } from './useAuth';

export const useFeatureGate = () => {
  const { canAccessFeature, currentPlan, planFeatures } = usePurchases();
  const { currentTenant } = useAuth();
  
  const checkPatientLimit = useCallback((currentCount: number): {
    allowed: boolean;
    limit: number | 'unlimited';
    message?: string;
  } => {
    const limit = planFeatures.maxPatients;
    
    if (limit === 'unlimited') {
      return { allowed: true, limit };
    }
    
    const allowed = currentCount < limit;
    const message = allowed ? undefined : 
      `Você atingiu o limite de ${limit} pacientes no plano ${currentPlan.toUpperCase()}. Faça upgrade para adicionar mais pacientes.`;
    
    return { allowed, limit, message };
  }, [planFeatures.maxPatients, currentPlan]);
  
  const checkAIAccess = useCallback((): {
    allowed: boolean;
    message?: string;
  } => {
    const allowed = canAccessFeature('aiAnalysis');
    const message = allowed ? undefined :
      'Análises AI estão disponíveis apenas nos planos Pro e Enterprise. Faça upgrade para desbloquear esta funcionalidade.';
    
    return { allowed, message };
  }, [canAccessFeature]);
  
  const checkReportsAccess = useCallback((): {
    allowed: boolean;
    message?: string;
  } => {
    const allowed = canAccessFeature('advancedReports');
    const message = allowed ? undefined :
      'Relatórios avançados estão disponíveis apenas nos planos pagos.';
    
    return { allowed, message };
  }, [canAccessFeature]);
  
  return {
    currentPlan,
    planFeatures,
    canAccessFeature,
    checkPatientLimit,
    checkAIAccess,
    checkReportsAccess,
  };
};
```

### Componente de Feature Gate
```typescript
// components/ui/FeatureGate.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import Button from './Button';
import { Crown } from 'lucide-react-native';

interface FeatureGateProps {
  feature: 'aiAnalysis' | 'advancedReports' | 'customBranding';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgrade?: () => void;
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  onUpgrade,
}) => {
  const { canAccessFeature, currentPlan } = useFeatureGate();
  
  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <View style={styles.container}>
      <Crown size={32} color="#f59e0b" />
      <Text style={styles.title}>Recurso Premium</Text>
      <Text style={styles.message}>
        Esta funcionalidade está disponível apenas nos planos pagos.
      </Text>
      <Button
        title="Fazer Upgrade"
        onPress={onUpgrade}
        style={styles.upgradeButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 12,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 12,
  },
  upgradeButton: {
    marginTop: 8,
  },
});

export default FeatureGate;
```

## 📊 Analytics e Métricas

### Tracking de Revenue
```typescript
// services/analyticsService.ts
import { CustomerInfo } from 'react-native-purchases';

class AnalyticsService {
  trackSubscriptionStart(plan: string, price: number) {
    // Track conversion
    console.log(`📊 Subscription started: ${plan} - $${price}`);
    
    // Implementar analytics (Firebase, Mixpanel, etc.)
    // analytics.track('subscription_started', { plan, price });
  }
  
  trackSubscriptionCancel(plan: string, reason?: string) {
    console.log(`📊 Subscription cancelled: ${plan}`, reason);
    // analytics.track('subscription_cancelled', { plan, reason });
  }
  
  trackPaywallView(source: string) {
    console.log(`📊 Paywall viewed from: ${source}`);
    // analytics.track('paywall_viewed', { source });
  }
  
  trackFeatureGated(feature: string, currentPlan: string) {
    console.log(`📊 Feature gated: ${feature} for ${currentPlan}`);
    // analytics.track('feature_gated', { feature, currentPlan });
  }
}

export const analyticsService = new AnalyticsService();
```

## 🎯 Estratégia de Conversão

### Onboarding com Trial
```typescript
// components/onboarding/TrialOffer.tsx
const TrialOffer: React.FC = () => {
  const { purchasePackage } = usePurchases();
  
  const startTrial = async () => {
    const success = await purchasePackage('fisioflow_pro_monthly');
    if (success) {
      // Track trial start
      analyticsService.trackSubscriptionStart('pro_trial', 0);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Experimente o FisioFlow Pro
      </Text>
      <Text style={styles.subtitle}>
        7 dias grátis, depois R$ 29,90/mês
      </Text>
      
      <Button
        title="Começar Teste Grátis"
        onPress={startTrial}
        style={styles.trialButton}
      />
      
      <Text style={styles.disclaimer}>
        Cancele a qualquer momento
      </Text>
    </View>
  );
};
```

---

**Total estimado de implementação**: 3-4 semanas
**Conversão esperada**: 8-12% (free → paid)
**Revenue projection**: R$ 15K-25K/mês (1000+ MAU)