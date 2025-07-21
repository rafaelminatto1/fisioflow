import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './useAuth';
import { useData } from './useData';
import { SubscriptionPlan } from '../types';

interface ABTest {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  variants: ABVariant[];
  targetAudience: {
    plans?: SubscriptionPlan[];
    userTypes?: string[];
    regions?: string[];
    newUsersOnly?: boolean;
    trialUsersOnly?: boolean;
  };
  metrics: {
    conversionGoal: string;
    secondaryMetrics: string[];
  };
  startDate: string;
  endDate?: string;
  trafficAllocation: number; // Percentage of users to include in test
  createdAt: string;
  createdBy: string;
}

interface ABVariant {
  id: string;
  name: string;
  description: string;
  trafficWeight: number; // Percentage of test traffic
  config: Record<string, any>;
  isControl: boolean;
}

interface ABTestResult {
  testId: string;
  variantId: string;
  userId: string;
  tenantId: string;
  assignedAt: string;
  convertedAt?: string;
  conversionValue?: number;
  events: ABTestEvent[];
}

interface ABTestEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

interface ABTestingContextType {
  getVariant: (testId: string) => ABVariant | null;
  trackEvent: (
    testId: string,
    eventType: string,
    data?: Record<string, any>
  ) => void;
  trackConversion: (testId: string, value?: number) => void;
  isInTest: (testId: string) => boolean;
  getTestConfig: (testId: string, key: string, defaultValue?: any) => any;
  getAllActiveTests: () => ABTest[];
  getTestResults: (testId: string) => ABTestResult[];
  createTest: (test: Omit<ABTest, 'id' | 'createdAt' | 'createdBy'>) => string;
  updateTest: (testId: string, updates: Partial<ABTest>) => boolean;
  stopTest: (testId: string) => boolean;
}

const ABTestingContext = createContext<ABTestingContextType | undefined>(
  undefined
);

// Predefined A/B tests for the freemium system
const DEFAULT_AB_TESTS: ABTest[] = [
  {
    id: 'paywall_design_v1',
    name: 'Paywall Design Test',
    description: 'Test different paywall designs to improve conversion rates',
    isActive: true,
    variants: [
      {
        id: 'control',
        name: 'Original Paywall',
        description: 'Current paywall design',
        trafficWeight: 50,
        isControl: true,
        config: {
          showBenefits: true,
          highlightPopularPlan: false,
          showTestimonials: false,
          buttonColor: '#3B82F6',
          urgencyMessage: false,
        },
      },
      {
        id: 'variant_a',
        name: 'Enhanced Paywall',
        description: 'Paywall with testimonials and urgency',
        trafficWeight: 50,
        isControl: false,
        config: {
          showBenefits: true,
          highlightPopularPlan: true,
          showTestimonials: true,
          buttonColor: '#10B981',
          urgencyMessage: true,
          urgencyText: 'Oferta limitada - 20% de desconto!',
        },
      },
    ],
    targetAudience: {
      plans: ['free'],
      newUsersOnly: false,
      trialUsersOnly: false,
    },
    metrics: {
      conversionGoal: 'subscription_started',
      secondaryMetrics: ['paywall_viewed', 'plan_selected', 'checkout_started'],
    },
    startDate: new Date().toISOString(),
    trafficAllocation: 100,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'trial_length_test',
    name: 'Trial Length Optimization',
    description: 'Test different trial lengths to maximize conversions',
    isActive: true,
    variants: [
      {
        id: 'control_14_days',
        name: '14 Days Trial',
        description: 'Standard 14-day trial',
        trafficWeight: 33,
        isControl: true,
        config: {
          trialDays: 14,
          reminderDays: [7, 3, 1],
        },
      },
      {
        id: 'variant_7_days',
        name: '7 Days Trial',
        description: 'Shorter 7-day trial with urgency',
        trafficWeight: 33,
        isControl: false,
        config: {
          trialDays: 7,
          reminderDays: [3, 1],
          urgencyMessaging: true,
        },
      },
      {
        id: 'variant_21_days',
        name: '21 Days Trial',
        description: 'Extended 21-day trial',
        trafficWeight: 34,
        isControl: false,
        config: {
          trialDays: 21,
          reminderDays: [14, 7, 3, 1],
          extendedOnboarding: true,
        },
      },
    ],
    targetAudience: {
      plans: ['free'],
      newUsersOnly: true,
    },
    metrics: {
      conversionGoal: 'trial_to_paid_conversion',
      secondaryMetrics: ['trial_started', 'feature_usage', 'trial_extended'],
    },
    startDate: new Date().toISOString(),
    trafficAllocation: 80,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'onboarding_flow_test',
    name: 'Onboarding Flow Optimization',
    description: 'Test different onboarding flows for new users',
    isActive: true,
    variants: [
      {
        id: 'control_standard',
        name: 'Standard Onboarding',
        description: 'Current onboarding flow',
        trafficWeight: 50,
        isControl: true,
        config: {
          steps: ['welcome', 'clinic_setup', 'first_patient'],
          showProgress: true,
          allowSkip: true,
        },
      },
      {
        id: 'variant_guided',
        name: 'Guided Onboarding',
        description: 'Step-by-step guided onboarding with tooltips',
        trafficWeight: 50,
        isControl: false,
        config: {
          steps: [
            'welcome',
            'clinic_setup',
            'team_invite',
            'first_patient',
            'first_appointment',
          ],
          showProgress: true,
          allowSkip: false,
          showTooltips: true,
          interactiveDemo: true,
        },
      },
    ],
    targetAudience: {
      newUsersOnly: true,
    },
    metrics: {
      conversionGoal: 'onboarding_completed',
      secondaryMetrics: [
        'step_completed',
        'time_to_complete',
        'feature_adoption',
      ],
    },
    startDate: new Date().toISOString(),
    trafficAllocation: 100,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
];

interface ABTestingProviderProps {
  children: ReactNode;
}

export const ABTestingProvider: React.FC<ABTestingProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const { saveAuditLog } = useData();

  const [tests, setTests] = useState<ABTest[]>(DEFAULT_AB_TESTS);
  const [results, setResults] = useState<ABTestResult[]>([]);
  const [userAssignments, setUserAssignments] = useState<
    Record<string, string>
  >({});

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTests = localStorage.getItem('fisioflow_ab_tests');
    const savedResults = localStorage.getItem('fisioflow_ab_results');
    const savedAssignments = localStorage.getItem('fisioflow_ab_assignments');

    if (savedTests) {
      try {
        setTests(JSON.parse(savedTests));
      } catch (error) {
        console.error('Error loading AB tests:', error);
      }
    }

    if (savedResults) {
      try {
        setResults(JSON.parse(savedResults));
      } catch (error) {
        console.error('Error loading AB results:', error);
      }
    }

    if (savedAssignments) {
      try {
        setUserAssignments(JSON.parse(savedAssignments));
      } catch (error) {
        console.error('Error loading AB assignments:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('fisioflow_ab_tests', JSON.stringify(tests));
  }, [tests]);

  useEffect(() => {
    localStorage.setItem('fisioflow_ab_results', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    localStorage.setItem(
      'fisioflow_ab_assignments',
      JSON.stringify(userAssignments)
    );
  }, [userAssignments]);

  const hashUserId = (userId: string, testId: string): number => {
    // Simple hash function for consistent user assignment
    let hash = 0;
    const str = `${userId}_${testId}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  };

  const isUserEligible = (test: ABTest, user: any): boolean => {
    if (!test.targetAudience) return true;

    const { plans, userTypes, newUsersOnly, trialUsersOnly } =
      test.targetAudience;

    // Check plan eligibility
    if (plans && plans.length > 0) {
      const userPlan = user?.tenant?.plan || 'free';
      if (!plans.includes(userPlan)) return false;
    }

    // Check if user is new (created within last 7 days)
    if (newUsersOnly) {
      const userCreatedAt = new Date(user?.createdAt || 0);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (userCreatedAt < sevenDaysAgo) return false;
    }

    // Check if user is in trial
    if (trialUsersOnly) {
      const isInTrial =
        user?.tenant?.trialEndDate &&
        new Date(user.tenant.trialEndDate) > new Date();
      if (!isInTrial) return false;
    }

    return true;
  };

  const assignUserToVariant = (test: ABTest): ABVariant | null => {
    if (!user || !isUserEligible(test, user)) return null;

    const assignmentKey = `${user.id}_${test.id}`;

    // Check if user is already assigned
    if (userAssignments[assignmentKey]) {
      const variantId = userAssignments[assignmentKey];
      return test.variants.find((v) => v.id === variantId) || null;
    }

    // Check if user should be included in test based on traffic allocation
    const userHash = hashUserId(user.id, test.id);
    if (userHash >= test.trafficAllocation) return null;

    // Assign user to variant based on traffic weights
    let cumulativeWeight = 0;
    const variantHash = hashUserId(user.id, `${test.id}_variant`);

    for (const variant of test.variants) {
      cumulativeWeight += variant.trafficWeight;
      if (variantHash < cumulativeWeight) {
        // Assign user to this variant
        setUserAssignments((prev) => ({
          ...prev,
          [assignmentKey]: variant.id,
        }));

        // Create result record
        const newResult: ABTestResult = {
          testId: test.id,
          variantId: variant.id,
          userId: user.id,
          tenantId: user.tenantId,
          assignedAt: new Date().toISOString(),
          events: [],
        };

        setResults((prev) => [...prev, newResult]);

        // Log assignment
        if (saveAuditLog) {
          saveAuditLog(
            {
              action: 'ab_test_assigned',
              userId: user.id,
              tenantId: user.tenantId,
              details: {
                testId: test.id,
                variantId: variant.id,
                testName: test.name,
                variantName: variant.name,
              },
              timestamp: new Date().toISOString(),
            },
            user
          );
        }

        return variant;
      }
    }

    return null;
  };

  const getVariant = (testId: string): ABVariant | null => {
    const test = tests.find((t) => t.id === testId && t.isActive);
    if (!test || !user) return null;

    return assignUserToVariant(test);
  };

  const trackEvent = (
    testId: string,
    eventType: string,
    data: Record<string, any> = {}
  ) => {
    if (!user) return;

    const assignmentKey = `${user.id}_${testId}`;
    const variantId = userAssignments[assignmentKey];

    if (!variantId) return;

    const event: ABTestEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    setResults((prev) =>
      prev.map((result) => {
        if (
          result.testId === testId &&
          result.userId === user.id &&
          result.variantId === variantId
        ) {
          return {
            ...result,
            events: [...result.events, event],
          };
        }
        return result;
      })
    );

    // Log event
    if (saveAuditLog) {
      saveAuditLog(
        {
          action: 'ab_test_event',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            testId,
            variantId,
            eventType,
            eventData: data,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );
    }
  };

  const trackConversion = (testId: string, value?: number) => {
    if (!user) return;

    const assignmentKey = `${user.id}_${testId}`;
    const variantId = userAssignments[assignmentKey];

    if (!variantId) return;

    const test = tests.find((t) => t.id === testId);
    if (!test) return;

    setResults((prev) =>
      prev.map((result) => {
        if (
          result.testId === testId &&
          result.userId === user.id &&
          result.variantId === variantId &&
          !result.convertedAt
        ) {
          return {
            ...result,
            convertedAt: new Date().toISOString(),
            conversionValue: value,
          };
        }
        return result;
      })
    );

    // Track conversion event
    trackEvent(testId, test.metrics.conversionGoal, { conversionValue: value });

    // Log conversion
    if (saveAuditLog) {
      saveAuditLog(
        {
          action: 'ab_test_conversion',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            testId,
            variantId,
            conversionGoal: test.metrics.conversionGoal,
            conversionValue: value,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );
    }
  };

  const isInTest = (testId: string): boolean => {
    if (!user) return false;
    const assignmentKey = `${user.id}_${testId}`;
    return !!userAssignments[assignmentKey];
  };

  const getTestConfig = (
    testId: string,
    key: string,
    defaultValue: any = null
  ): any => {
    const variant = getVariant(testId);
    if (!variant) return defaultValue;

    return variant.config[key] !== undefined
      ? variant.config[key]
      : defaultValue;
  };

  const getAllActiveTests = (): ABTest[] => {
    return tests.filter((test) => test.isActive);
  };

  const getTestResults = (testId: string): ABTestResult[] => {
    return results.filter((result) => result.testId === testId);
  };

  const createTest = (
    testData: Omit<ABTest, 'id' | 'createdAt' | 'createdBy'>
  ): string => {
    if (!user) throw new Error('User must be authenticated to create tests');

    const newTest: ABTest = {
      ...testData,
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    setTests((prev) => [...prev, newTest]);

    // Log test creation
    if (saveAuditLog) {
      saveAuditLog(
        {
          action: 'ab_test_created',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            testId: newTest.id,
            testName: newTest.name,
            variants: newTest.variants.length,
          },
          timestamp: new Date().toISOString(),
        },
        user
      );
    }

    return newTest.id;
  };

  const updateTest = (testId: string, updates: Partial<ABTest>): boolean => {
    if (!user) return false;

    setTests((prev) =>
      prev.map((test) => {
        if (test.id === testId) {
          return { ...test, ...updates };
        }
        return test;
      })
    );

    // Log test update
    if (saveAuditLog) {
      saveAuditLog(
        {
          action: 'ab_test_updated',
          userId: user.id,
          tenantId: user.tenantId,
          details: {
            testId,
            updates: Object.keys(updates),
          },
          timestamp: new Date().toISOString(),
        },
        user
      );
    }

    return true;
  };

  const stopTest = (testId: string): boolean => {
    return updateTest(testId, {
      isActive: false,
      endDate: new Date().toISOString(),
    });
  };

  const value: ABTestingContextType = {
    getVariant,
    trackEvent,
    trackConversion,
    isInTest,
    getTestConfig,
    getAllActiveTests,
    getTestResults,
    createTest,
    updateTest,
    stopTest,
  };

  return (
    <ABTestingContext.Provider value={value}>
      {children}
    </ABTestingContext.Provider>
  );
};

export const useABTesting = (): ABTestingContextType => {
  const context = useContext(ABTestingContext);
  if (!context) {
    throw new Error('useABTesting must be used within an ABTestingProvider');
  }
  return context;
};

export default useABTesting;
export type { ABTest, ABVariant, ABTestResult, ABTestEvent };
