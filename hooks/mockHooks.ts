// Mock hooks para evitar erros no deploy
// Substitui temporariamente hooks complexos que causam problemas

export const useABTesting = () => ({
  // Mock implementation
  currentVariant: 'control',
  joinExperiment: () => {},
  recordConversion: () => {},
  getExperimentData: () => null,
});

export const useAppleIAP = () => ({
  // Mock implementation
  isAvailable: false,
  purchaseProduct: async () => false,
  restorePurchases: async () => false,
});

export const useBackupSync = () => ({
  // Mock implementation
  isEnabled: false,
  syncData: async () => {},
  exportData: async () => ({}),
});

export const useExternalIntegrations = () => ({
  // Mock implementation
  integrations: [],
  connect: async () => false,
  disconnect: async () => {},
});

export const usePushNotifications = () => ({
  // Mock implementation
  isSupported: false,
  requestPermission: async () => false,
  sendNotification: async () => {},
});

export const useStripe = () => ({
  // Mock implementation
  isLoaded: false,
  createPaymentIntent: async () => null,
  confirmPayment: async () => false,
});

export const useTrialManager = () => ({
  // Mock implementation
  isTrialActive: false,
  daysRemaining: 0,
  startTrial: async () => {},
  upgradePlan: async () => {},
});