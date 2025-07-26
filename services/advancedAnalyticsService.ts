// Advanced Analytics Service with Google Analytics and Mixpanel Integration

export interface AnalyticsConfig {
  googleAnalytics: {
    measurementId: string; // GA4 Measurement ID
    apiSecret?: string; // For Measurement Protocol
    enabled: boolean;
  };
  mixpanel: {
    projectToken: string;
    apiSecret?: string; // For server-side tracking
    enabled: boolean;
  };
  universal: {
    enabled: boolean;
    userId?: string;
    tenantId?: string;
    debug?: boolean;
  };
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  category: 'user_action' | 'system' | 'business' | 'engagement' | 'conversion';
  parameters: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  source: 'web' | 'mobile' | 'api' | 'system';
  tenantId: string;
  processed: boolean;
  providers: {
    googleAnalytics: boolean;
    mixpanel: boolean;
  };
}

export interface UserProperties {
  userId: string;
  tenantId: string;
  role: string;
  registrationDate: string;
  lastLoginDate: string;
  totalSessions: number;
  totalEvents: number;
  customProperties: Record<string, any>;
  updatedAt: string;
}

export interface ConversionGoal {
  id: string;
  name: string;
  description: string;
  type: 'event' | 'page_view' | 'duration' | 'custom';
  conditions: {
    eventName?: string;
    pageUrl?: string;
    minDuration?: number;
    customCondition?: string;
  };
  value?: number;
  currency?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

export interface AnalyticsFunnel {
  id: string;
  name: string;
  description: string;
  steps: {
    name: string;
    eventName: string;
    conditions?: Record<string, any>;
  }[];
  timeWindow: number; // in hours
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

export interface AnalyticsSegment {
  id: string;
  name: string;
  description: string;
  conditions: {
    userProperties?: Record<string, any>;
    eventHistory?: {
      eventName: string;
      timeframe: number;
      count?: number;
    }[];
    customFilters?: string;
  };
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  type: 'events' | 'users' | 'sessions' | 'conversions' | 'retention' | 'funnel';
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    segments?: string[];
    events?: string[];
    userProperties?: Record<string, any>;
  };
  metrics: {
    name: string;
    value: number;
    change?: number;
    changePercentage?: number;
  }[];
  dimensions: {
    name: string;
    values: { label: string; value: number }[];
  }[];
  generatedAt: string;
  tenantId: string;
}

export interface CohortAnalysis {
  id: string;
  name: string;
  cohortType: 'acquisition' | 'behavioral';
  metric: 'retention' | 'revenue' | 'engagement';
  periods: {
    period: string;
    cohortSize: number;
    values: number[];
  }[];
  generatedAt: string;
  tenantId: string;
}

class AdvancedAnalyticsService {
  private config: AnalyticsConfig | null = null;
  private events: AnalyticsEvent[] = [];
  private userProperties: UserProperties[] = [];
  private conversionGoals: ConversionGoal[] = [];
  private funnels: AnalyticsFunnel[] = [];
  private segments: AnalyticsSegment[] = [];
  private reports: AnalyticsReport[] = [];
  private cohorts: CohortAnalysis[] = [];
  
  // Provider instances
  private gtag: any = null;
  private mixpanelInstance: any = null;
  
  // Session tracking
  private currentSession: {
    id: string;
    startTime: string;
    userId?: string;
    tenantId?: string;
  } | null = null;

  constructor() {
    this.loadStoredData();
    this.initializeDefaultGoals();
    this.startSessionTracking();
    this.startEventProcessing();
  }

  private loadStoredData(): void {
    try {
      const storedConfig = localStorage.getItem('analytics_config');
      if (storedConfig) {
        this.config = JSON.parse(storedConfig);
      }

      const storedEvents = localStorage.getItem('analytics_events');
      if (storedEvents) {
        this.events = JSON.parse(storedEvents);
      }

      const storedUsers = localStorage.getItem('analytics_users');
      if (storedUsers) {
        this.userProperties = JSON.parse(storedUsers);
      }

      const storedGoals = localStorage.getItem('analytics_goals');
      if (storedGoals) {
        this.conversionGoals = JSON.parse(storedGoals);
      }

      const storedFunnels = localStorage.getItem('analytics_funnels');
      if (storedFunnels) {
        this.funnels = JSON.parse(storedFunnels);
      }

      const storedSegments = localStorage.getItem('analytics_segments');
      if (storedSegments) {
        this.segments = JSON.parse(storedSegments);
      }

      const storedReports = localStorage.getItem('analytics_reports');
      if (storedReports) {
        this.reports = JSON.parse(storedReports);
      }

      const storedCohorts = localStorage.getItem('analytics_cohorts');
      if (storedCohorts) {
        this.cohorts = JSON.parse(storedCohorts);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  }

  private saveData(): void {
    try {
      if (this.config) {
        localStorage.setItem('analytics_config', JSON.stringify(this.config));
      }
      localStorage.setItem('analytics_events', JSON.stringify(this.events));
      localStorage.setItem('analytics_users', JSON.stringify(this.userProperties));
      localStorage.setItem('analytics_goals', JSON.stringify(this.conversionGoals));
      localStorage.setItem('analytics_funnels', JSON.stringify(this.funnels));
      localStorage.setItem('analytics_segments', JSON.stringify(this.segments));
      localStorage.setItem('analytics_reports', JSON.stringify(this.reports));
      localStorage.setItem('analytics_cohorts', JSON.stringify(this.cohorts));
    } catch (error) {
      console.error('Error saving analytics data:', error);
    }
  }

  private initializeDefaultGoals(): void {
    if (this.conversionGoals.length === 0) {
      const defaultGoals = [
        {
          name: 'User Registration',
          description: 'New user completes registration',
          type: 'event' as const,
          conditions: { eventName: 'user_register' },
          value: 100,
          currency: 'BRL',
          isActive: true
        },
        {
          name: 'Appointment Booking',
          description: 'Patient books an appointment',
          type: 'event' as const,
          conditions: { eventName: 'appointment_booked' },
          value: 200,
          currency: 'BRL',
          isActive: true
        },
        {
          name: 'Payment Completed',
          description: 'Patient completes payment',
          type: 'event' as const,
          conditions: { eventName: 'payment_completed' },
          value: 0, // Dynamic value from event
          currency: 'BRL',
          isActive: true
        },
        {
          name: 'Exercise Completion',
          description: 'Patient completes exercise session',
          type: 'event' as const,
          conditions: { eventName: 'exercise_completed' },
          value: 50,
          currency: 'BRL',
          isActive: true
        }
      ];

      defaultGoals.forEach(goal => {
        this.createConversionGoal(goal, 'default');
      });
    }
  }

  // Configuration
  async configure(config: AnalyticsConfig): Promise<void> {
    this.config = config;
    this.saveData();

    // Initialize Google Analytics
    if (config.googleAnalytics.enabled) {
      await this.initializeGoogleAnalytics();
    }

    // Initialize Mixpanel
    if (config.mixpanel.enabled) {
      await this.initializeMixpanel();
    }

    // Set universal properties
    if (config.universal.userId) {
      this.setUserId(config.universal.userId);
    }
  }

  private async initializeGoogleAnalytics(): Promise<void> {
    if (!this.config?.googleAnalytics.enabled) return;

    try {
      // Load Google Analytics gtag script
      if (typeof window !== 'undefined') {
        // Create script element
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.googleAnalytics.measurementId}`;
        document.head.appendChild(script);

        // Initialize gtag
        await new Promise((resolve) => {
          script.onload = resolve;
        });

        // Configure gtag
        (window as any).dataLayer = (window as any).dataLayer || [];
        this.gtag = function(...args: any[]) {
          (window as any).dataLayer.push(args);
        };

        this.gtag('js', new Date());
        this.gtag('config', this.config.googleAnalytics.measurementId, {
          debug_mode: this.config.universal.debug,
          send_page_view: true
        });

        console.log('Google Analytics initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing Google Analytics:', error);
    }
  }

  private async initializeMixpanel(): Promise<void> {
    if (!this.config?.mixpanel.enabled) return;

    try {
      // Load Mixpanel library
      if (typeof window !== 'undefined') {
        // Dynamically import Mixpanel
        const mixpanel = await import('mixpanel-browser');
        
        mixpanel.init(this.config.mixpanel.projectToken, {
          debug: this.config.universal.debug,
          track_pageview: true,
          persistence: 'localStorage'
        });

        this.mixpanelInstance = mixpanel;

        console.log('Mixpanel initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing Mixpanel:', error);
    }
  }

  // Session Management
  private startSessionTracking(): void {
    if (typeof window !== 'undefined') {
      // Start new session
      this.startSession();

      // Track page views
      this.trackPageView();

      // Handle beforeunload
      window.addEventListener('beforeunload', () => {
        this.endSession();
      });

      // Handle visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.pauseSession();
        } else {
          this.resumeSession();
        }
      });
    }
  }

  private startSession(): void {
    this.currentSession = {
      id: this.generateId(),
      startTime: new Date().toISOString(),
      userId: this.config?.universal.userId,
      tenantId: this.config?.universal.tenantId
    };

    this.track('session_start', {
      session_id: this.currentSession.id
    });
  }

  private endSession(): void {
    if (this.currentSession) {
      const duration = Date.now() - new Date(this.currentSession.startTime).getTime();
      
      this.track('session_end', {
        session_id: this.currentSession.id,
        session_duration: Math.round(duration / 1000)
      });

      this.currentSession = null;
    }
  }

  private pauseSession(): void {
    if (this.currentSession) {
      this.track('session_pause', {
        session_id: this.currentSession.id
      });
    }
  }

  private resumeSession(): void {
    if (this.currentSession) {
      this.track('session_resume', {
        session_id: this.currentSession.id
      });
    }
  }

  // Event Tracking
  async track(
    eventName: string,
    parameters: Record<string, any> = {},
    options: {
      userId?: string;
      tenantId?: string;
      source?: AnalyticsEvent['source'];
      category?: AnalyticsEvent['category'];
    } = {}
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      name: eventName,
      category: options.category || 'user_action',
      parameters: {
        ...parameters,
        timestamp: new Date().toISOString(),
        session_id: this.currentSession?.id,
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        page_title: typeof window !== 'undefined' ? document.title : '',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      },
      userId: options.userId || this.config?.universal.userId,
      sessionId: this.currentSession?.id,
      timestamp: new Date().toISOString(),
      source: options.source || 'web',
      tenantId: options.tenantId || this.config?.universal.tenantId || 'default',
      processed: false,
      providers: {
        googleAnalytics: false,
        mixpanel: false
      }
    };

    this.events.push(event);
    this.saveData();

    // Process event immediately for real-time providers
    await this.processEvent(event);

    // Update user properties
    this.updateUserActivity(event.userId, event.tenantId);

    // Check conversion goals
    this.checkConversionGoals(event);
  }

  private async processEvent(event: AnalyticsEvent): Promise<void> {
    // Send to Google Analytics
    if (this.config?.googleAnalytics.enabled && this.gtag) {
      try {
        this.gtag('event', event.name, {
          event_category: event.category,
          event_label: event.parameters.label,
          value: event.parameters.value,
          user_id: event.userId,
          session_id: event.sessionId,
          custom_parameters: event.parameters
        });

        event.providers.googleAnalytics = true;
      } catch (error) {
        console.error('Error sending event to Google Analytics:', error);
      }
    }

    // Send to Mixpanel
    if (this.config?.mixpanel.enabled && this.mixpanelInstance) {
      try {
        this.mixpanelInstance.track(event.name, {
          ...event.parameters,
          $user_id: event.userId,
          $session_id: event.sessionId,
          category: event.category,
          source: event.source,
          tenant_id: event.tenantId
        });

        event.providers.mixpanel = true;
      } catch (error) {
        console.error('Error sending event to Mixpanel:', error);
      }
    }

    event.processed = true;
    this.saveData();
  }

  // Page Tracking
  trackPageView(
    pagePath?: string,
    pageTitle?: string,
    parameters: Record<string, any> = {}
  ): void {
    const currentPath = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '');
    const currentTitle = pageTitle || (typeof window !== 'undefined' ? document.title : '');

    this.track('page_view', {
      page_path: currentPath,
      page_title: currentTitle,
      ...parameters
    }, { category: 'engagement' });
  }

  // User Management
  setUserId(userId: string): void {
    if (this.config) {
      this.config.universal.userId = userId;
      this.saveData();
    }

    // Set user ID in Google Analytics
    if (this.gtag) {
      this.gtag('config', this.config?.googleAnalytics.measurementId, {
        user_id: userId
      });
    }

    // Set user ID in Mixpanel
    if (this.mixpanelInstance) {
      this.mixpanelInstance.identify(userId);
    }
  }

  setUserProperties(
    userId: string,
    properties: Record<string, any>,
    tenantId: string
  ): void {
    let userProps = this.userProperties.find(u => u.userId === userId && u.tenantId === tenantId);
    
    if (!userProps) {
      userProps = {
        userId,
        tenantId,
        role: properties.role || 'user',
        registrationDate: new Date().toISOString(),
        lastLoginDate: new Date().toISOString(),
        totalSessions: 1,
        totalEvents: 0,
        customProperties: properties,
        updatedAt: new Date().toISOString()
      };
      this.userProperties.push(userProps);
    } else {
      userProps.customProperties = { ...userProps.customProperties, ...properties };
      userProps.updatedAt = new Date().toISOString();
    }

    this.saveData();

    // Send to Google Analytics
    if (this.gtag) {
      this.gtag('set', { user_properties: properties });
    }

    // Send to Mixpanel
    if (this.mixpanelInstance) {
      this.mixpanelInstance.people.set(properties);
    }
  }

  private updateUserActivity(userId?: string, tenantId?: string): void {
    if (!userId || !tenantId) return;

    const userProps = this.userProperties.find(u => u.userId === userId && u.tenantId === tenantId);
    if (userProps) {
      userProps.totalEvents++;
      userProps.lastLoginDate = new Date().toISOString();
      userProps.updatedAt = new Date().toISOString();
      this.saveData();
    }
  }

  // Conversion Goals
  createConversionGoal(
    goalData: Omit<ConversionGoal, 'id' | 'tenantId' | 'createdAt'>,
    tenantId: string
  ): ConversionGoal {
    const goal: ConversionGoal = {
      ...goalData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date().toISOString()
    };

    this.conversionGoals.push(goal);
    this.saveData();
    return goal;
  }

  private checkConversionGoals(event: AnalyticsEvent): void {
    const relevantGoals = this.conversionGoals.filter(g => 
      g.isActive && 
      g.tenantId === event.tenantId
    );

    relevantGoals.forEach(goal => {
      let isGoalMet = false;

      switch (goal.type) {
        case 'event':
          isGoalMet = goal.conditions.eventName === event.name;
          break;
        case 'page_view':
          isGoalMet = event.name === 'page_view' && 
                     event.parameters.page_path === goal.conditions.pageUrl;
          break;
        case 'duration':
          isGoalMet = event.name === 'session_end' && 
                     event.parameters.session_duration >= (goal.conditions.minDuration || 0);
          break;
      }

      if (isGoalMet) {
        this.track('conversion', {
          goal_id: goal.id,
          goal_name: goal.name,
          goal_value: goal.value || event.parameters.value || 0,
          currency: goal.currency
        }, { category: 'conversion' });
      }
    });
  }

  // Funnel Analysis
  createFunnel(
    funnelData: Omit<AnalyticsFunnel, 'id' | 'tenantId' | 'createdAt'>,
    tenantId: string
  ): AnalyticsFunnel {
    const funnel: AnalyticsFunnel = {
      ...funnelData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date().toISOString()
    };

    this.funnels.push(funnel);
    this.saveData();
    return funnel;
  }

  analyzeFunnel(
    funnelId: string,
    dateRange: { start: string; end: string }
  ): {
    steps: { name: string; users: number; conversionRate: number }[];
    totalConversions: number;
    overallConversionRate: number;
  } {
    const funnel = this.funnels.find(f => f.id === funnelId);
    if (!funnel) {
      throw new Error('Funnel not found');
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const timeWindowMs = funnel.timeWindow * 60 * 60 * 1000;

    // Get relevant events within date range
    const relevantEvents = this.events.filter(e => {
      const eventDate = new Date(e.timestamp);
      return eventDate >= startDate && 
             eventDate <= endDate && 
             e.tenantId === funnel.tenantId;
    });

    // Group events by user and session
    const userSessions = new Map<string, AnalyticsEvent[]>();
    relevantEvents.forEach(event => {
      if (event.userId) {
        const key = `${event.userId}_${event.sessionId}`;
        if (!userSessions.has(key)) {
          userSessions.set(key, []);
        }
        userSessions.get(key)!.push(event);
      }
    });

    // Analyze funnel progression
    const stepResults = funnel.steps.map(step => ({
      name: step.name,
      users: 0,
      conversionRate: 0
    }));

    let initialUsers = 0;

    userSessions.forEach(sessionEvents => {
      sessionEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      let currentStep = 0;
      let stepStartTime = 0;

      for (const event of sessionEvents) {
        const eventTime = new Date(event.timestamp).getTime();
        
        if (currentStep < funnel.steps.length) {
          const step = funnel.steps[currentStep];
          
          if (event.name === step.eventName) {
            if (currentStep === 0) {
              initialUsers++;
              stepResults[0].users++;
              stepStartTime = eventTime;
              currentStep++;
            } else if (eventTime - stepStartTime <= timeWindowMs) {
              stepResults[currentStep].users++;
              stepStartTime = eventTime;
              currentStep++;
            }
          }
        }
      }
    });

    // Calculate conversion rates
    stepResults.forEach((step, index) => {
      if (index === 0) {
        step.conversionRate = 100;
      } else {
        step.conversionRate = initialUsers > 0 ? (step.users / initialUsers) * 100 : 0;
      }
    });

    const totalConversions = stepResults[stepResults.length - 1]?.users || 0;
    const overallConversionRate = initialUsers > 0 ? (totalConversions / initialUsers) * 100 : 0;

    return {
      steps: stepResults,
      totalConversions,
      overallConversionRate
    };
  }

  // Segment Analysis
  createSegment(
    segmentData: Omit<AnalyticsSegment, 'id' | 'tenantId' | 'createdAt'>,
    tenantId: string
  ): AnalyticsSegment {
    const segment: AnalyticsSegment = {
      ...segmentData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date().toISOString()
    };

    this.segments.push(segment);
    this.saveData();
    return segment;
  }

  getUsersInSegment(segmentId: string): UserProperties[] {
    const segment = this.segments.find(s => s.id === segmentId);
    if (!segment) return [];

    return this.userProperties.filter(user => {
      // Check user property conditions
      if (segment.conditions.userProperties) {
        for (const [key, value] of Object.entries(segment.conditions.userProperties)) {
          if (user.customProperties[key] !== value) {
            return false;
          }
        }
      }

      // Check event history conditions
      if (segment.conditions.eventHistory) {
        for (const eventCondition of segment.conditions.eventHistory) {
          const userEvents = this.events.filter(e => 
            e.userId === user.userId && 
            e.name === eventCondition.eventName &&
            e.tenantId === user.tenantId
          );

          const recentEvents = userEvents.filter(e => {
            const eventTime = new Date(e.timestamp).getTime();
            const cutoffTime = Date.now() - (eventCondition.timeframe * 24 * 60 * 60 * 1000);
            return eventTime >= cutoffTime;
          });

          if (eventCondition.count && recentEvents.length < eventCondition.count) {
            return false;
          }
        }
      }

      return true;
    });
  }

  // Reporting
  generateReport(
    reportType: AnalyticsReport['type'],
    dateRange: { start: string; end: string },
    filters: AnalyticsReport['filters'],
    tenantId: string
  ): AnalyticsReport {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Filter events by date range and tenant
    const relevantEvents = this.events.filter(e => {
      const eventDate = new Date(e.timestamp);
      return eventDate >= startDate && 
             eventDate <= endDate && 
             e.tenantId === tenantId;
    });

    let metrics: AnalyticsReport['metrics'] = [];
    let dimensions: AnalyticsReport['dimensions'] = [];

    switch (reportType) {
      case 'events':
        metrics = this.generateEventMetrics(relevantEvents);
        dimensions = this.generateEventDimensions(relevantEvents);
        break;
      case 'users':
        metrics = this.generateUserMetrics(relevantEvents, tenantId);
        dimensions = this.generateUserDimensions(relevantEvents, tenantId);
        break;
      case 'sessions':
        metrics = this.generateSessionMetrics(relevantEvents);
        dimensions = this.generateSessionDimensions(relevantEvents);
        break;
      case 'conversions':
        metrics = this.generateConversionMetrics(relevantEvents);
        dimensions = this.generateConversionDimensions(relevantEvents);
        break;
    }

    const report: AnalyticsReport = {
      id: this.generateId(),
      name: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
      type: reportType,
      dateRange,
      filters,
      metrics,
      dimensions,
      generatedAt: new Date().toISOString(),
      tenantId
    };

    this.reports.push(report);
    this.saveData();
    return report;
  }

  private generateEventMetrics(events: AnalyticsEvent[]): AnalyticsReport['metrics'] {
    return [
      { name: 'Total Events', value: events.length },
      { name: 'Unique Events', value: new Set(events.map(e => e.name)).size },
      { name: 'Events per Session', value: events.length / new Set(events.map(e => e.sessionId)).size || 0 }
    ];
  }

  private generateEventDimensions(events: AnalyticsEvent[]): AnalyticsReport['dimensions'] {
    const eventCounts = events.reduce((acc, event) => {
      acc[event.name] = (acc[event.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        name: 'Event Name',
        values: Object.entries(eventCounts)
          .sort(([,a], [,b]) => b - a)
          .map(([label, value]) => ({ label, value }))
      }
    ];
  }

  private generateUserMetrics(events: AnalyticsEvent[], tenantId: string): AnalyticsReport['metrics'] {
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
    const tenantUsers = this.userProperties.filter(u => u.tenantId === tenantId);
    
    return [
      { name: 'Active Users', value: uniqueUsers },
      { name: 'Total Users', value: tenantUsers.length },
      { name: 'New Users', value: tenantUsers.filter(u => {
        const regDate = new Date(u.registrationDate).getTime();
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return regDate >= weekAgo;
      }).length }
    ];
  }

  private generateUserDimensions(events: AnalyticsEvent[], tenantId: string): AnalyticsReport['dimensions'] {
    const tenantUsers = this.userProperties.filter(u => u.tenantId === tenantId);
    const roleCounts = tenantUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        name: 'User Role',
        values: Object.entries(roleCounts).map(([label, value]) => ({ label, value }))
      }
    ];
  }

  private generateSessionMetrics(events: AnalyticsEvent[]): AnalyticsReport['metrics'] {
    const sessionEvents = events.filter(e => e.name === 'session_start' || e.name === 'session_end');
    const sessionStarts = sessionEvents.filter(e => e.name === 'session_start').length;
    const sessionEnds = sessionEvents.filter(e => e.name === 'session_end');
    
    const avgDuration = sessionEnds.length > 0 ? 
      sessionEnds.reduce((acc, e) => acc + (e.parameters.session_duration || 0), 0) / sessionEnds.length : 0;

    return [
      { name: 'Total Sessions', value: sessionStarts },
      { name: 'Average Session Duration', value: Math.round(avgDuration) },
      { name: 'Bounce Rate', value: 0 } // TODO: Calculate bounce rate
    ];
  }

  private generateSessionDimensions(events: AnalyticsEvent[]): AnalyticsReport['dimensions'] {
    const sourceCounts = events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        name: 'Traffic Source',
        values: Object.entries(sourceCounts).map(([label, value]) => ({ label, value }))
      }
    ];
  }

  private generateConversionMetrics(events: AnalyticsEvent[]): AnalyticsReport['metrics'] {
    const conversions = events.filter(e => e.name === 'conversion');
    const totalValue = conversions.reduce((acc, e) => acc + (e.parameters.goal_value || 0), 0);

    return [
      { name: 'Total Conversions', value: conversions.length },
      { name: 'Conversion Value', value: totalValue },
      { name: 'Average Order Value', value: conversions.length > 0 ? totalValue / conversions.length : 0 }
    ];
  }

  private generateConversionDimensions(events: AnalyticsEvent[]): AnalyticsReport['dimensions'] {
    const conversions = events.filter(e => e.name === 'conversion');
    const goalCounts = conversions.reduce((acc, event) => {
      const goalName = event.parameters.goal_name || 'Unknown';
      acc[goalName] = (acc[goalName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        name: 'Conversion Goal',
        values: Object.entries(goalCounts)
          .sort(([,a], [,b]) => b - a)
          .map(([label, value]) => ({ label, value }))
      }
    ];
  }

  // Cohort Analysis
  generateCohortAnalysis(
    cohortType: CohortAnalysis['cohortType'],
    metric: CohortAnalysis['metric'],
    tenantId: string,
    periods: number = 12
  ): CohortAnalysis {
    const users = this.userProperties.filter(u => u.tenantId === tenantId);
    const events = this.events.filter(e => e.tenantId === tenantId);

    // Group users by registration month (for acquisition cohorts)
    const cohorts = new Map<string, UserProperties[]>();
    
    users.forEach(user => {
      const cohortKey = new Date(user.registrationDate).toISOString().substring(0, 7); // YYYY-MM
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, []);
      }
      cohorts.get(cohortKey)!.push(user);
    });

    const cohortPeriods = Array.from(cohorts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-periods)
      .map(([period, cohortUsers]) => {
        const cohortSize = cohortUsers.length;
        const values: number[] = [];

        // Calculate retention/engagement for each subsequent period
        for (let i = 0; i < periods; i++) {
          const targetMonth = new Date(period);
          targetMonth.setMonth(targetMonth.getMonth() + i);
          const targetPeriod = targetMonth.toISOString().substring(0, 7);

          let activeUsers = 0;

          cohortUsers.forEach(user => {
            const userEvents = events.filter(e => 
              e.userId === user.userId && 
              e.timestamp.startsWith(targetPeriod)
            );

            if (userEvents.length > 0) {
              activeUsers++;
            }
          });

          const retentionRate = cohortSize > 0 ? (activeUsers / cohortSize) * 100 : 0;
          values.push(Math.round(retentionRate * 100) / 100);
        }

        return {
          period,
          cohortSize,
          values
        };
      });

    const analysis: CohortAnalysis = {
      id: this.generateId(),
      name: `${cohortType} ${metric} Cohort Analysis`,
      cohortType,
      metric,
      periods: cohortPeriods,
      generatedAt: new Date().toISOString(),
      tenantId
    };

    this.cohorts.push(analysis);
    this.saveData();
    return analysis;
  }

  // Event Processing
  private startEventProcessing(): void {
    // Process unprocessed events every 30 seconds
    setInterval(() => {
      this.processUnprocessedEvents();
    }, 30000);
  }

  private async processUnprocessedEvents(): Promise<void> {
    const unprocessedEvents = this.events.filter(e => !e.processed);
    
    for (const event of unprocessedEvents) {
      await this.processEvent(event);
    }
  }

  // Quick tracking methods for common FisioFlow events
  trackUserRegistration(userId: string, userRole: string, tenantId: string): void {
    this.track('user_register', {
      user_role: userRole,
      registration_method: 'form'
    }, { userId, tenantId, category: 'conversion' });
  }

  trackAppointmentBooked(userId: string, appointmentId: string, tenantId: string): void {
    this.track('appointment_booked', {
      appointment_id: appointmentId,
      booking_channel: 'web'
    }, { userId, tenantId, category: 'conversion' });
  }

  trackPaymentCompleted(userId: string, amount: number, currency: string, tenantId: string): void {
    this.track('payment_completed', {
      value: amount,
      currency: currency,
      payment_method: 'online'
    }, { userId, tenantId, category: 'conversion' });
  }

  trackExerciseCompleted(userId: string, exerciseId: string, duration: number, tenantId: string): void {
    this.track('exercise_completed', {
      exercise_id: exerciseId,
      duration_seconds: duration,
      completion_rate: 100
    }, { userId, tenantId, category: 'engagement' });
  }

  trackChatMessage(userId: string, recipientId: string, tenantId: string): void {
    this.track('chat_message_sent', {
      recipient_id: recipientId,
      message_type: 'text'
    }, { userId, tenantId, category: 'engagement' });
  }

  private generateId(): string {
    return `ANALYTICS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API Methods
  getEvents(tenantId: string): AnalyticsEvent[] {
    return this.events.filter(e => e.tenantId === tenantId);
  }

  getUserProperties(tenantId: string): UserProperties[] {
    return this.userProperties.filter(u => u.tenantId === tenantId);
  }

  getConversionGoals(tenantId: string): ConversionGoal[] {
    return this.conversionGoals.filter(g => g.tenantId === tenantId);
  }

  getFunnels(tenantId: string): AnalyticsFunnel[] {
    return this.funnels.filter(f => f.tenantId === tenantId);
  }

  getSegments(tenantId: string): AnalyticsSegment[] {
    return this.segments.filter(s => s.tenantId === tenantId);
  }

  getReports(tenantId: string): AnalyticsReport[] {
    return this.reports.filter(r => r.tenantId === tenantId);
  }

  getCohorts(tenantId: string): CohortAnalysis[] {
    return this.cohorts.filter(c => c.tenantId === tenantId);
  }

  getConfig(): AnalyticsConfig | null {
    return this.config;
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();

// React Hook for Analytics
export const useAdvancedAnalytics = () => {
  const configure = (config: AnalyticsConfig) => advancedAnalyticsService.configure(config);
  
  const track = (eventName: string, parameters?: Record<string, any>, options?: any) =>
    advancedAnalyticsService.track(eventName, parameters, options);
    
  const trackPageView = (pagePath?: string, pageTitle?: string, parameters?: Record<string, any>) =>
    advancedAnalyticsService.trackPageView(pagePath, pageTitle, parameters);
    
  const setUserId = (userId: string) => advancedAnalyticsService.setUserId(userId);
  
  const setUserProperties = (userId: string, properties: Record<string, any>, tenantId: string) =>
    advancedAnalyticsService.setUserProperties(userId, properties, tenantId);
    
  const createConversionGoal = (goalData: any, tenantId: string) =>
    advancedAnalyticsService.createConversionGoal(goalData, tenantId);
    
  const createFunnel = (funnelData: any, tenantId: string) =>
    advancedAnalyticsService.createFunnel(funnelData, tenantId);
    
  const analyzeFunnel = (funnelId: string, dateRange: any) =>
    advancedAnalyticsService.analyzeFunnel(funnelId, dateRange);
    
  const createSegment = (segmentData: any, tenantId: string) =>
    advancedAnalyticsService.createSegment(segmentData, tenantId);
    
  const getUsersInSegment = (segmentId: string) =>
    advancedAnalyticsService.getUsersInSegment(segmentId);
    
  const generateReport = (reportType: any, dateRange: any, filters: any, tenantId: string) =>
    advancedAnalyticsService.generateReport(reportType, dateRange, filters, tenantId);
    
  const generateCohortAnalysis = (cohortType: any, metric: any, tenantId: string, periods?: number) =>
    advancedAnalyticsService.generateCohortAnalysis(cohortType, metric, tenantId, periods);

  // Quick tracking methods
  const trackUserRegistration = (userId: string, userRole: string, tenantId: string) =>
    advancedAnalyticsService.trackUserRegistration(userId, userRole, tenantId);
    
  const trackAppointmentBooked = (userId: string, appointmentId: string, tenantId: string) =>
    advancedAnalyticsService.trackAppointmentBooked(userId, appointmentId, tenantId);
    
  const trackPaymentCompleted = (userId: string, amount: number, currency: string, tenantId: string) =>
    advancedAnalyticsService.trackPaymentCompleted(userId, amount, currency, tenantId);
    
  const trackExerciseCompleted = (userId: string, exerciseId: string, duration: number, tenantId: string) =>
    advancedAnalyticsService.trackExerciseCompleted(userId, exerciseId, duration, tenantId);
    
  const trackChatMessage = (userId: string, recipientId: string, tenantId: string) =>
    advancedAnalyticsService.trackChatMessage(userId, recipientId, tenantId);

  // Getters
  const getEvents = (tenantId: string) => advancedAnalyticsService.getEvents(tenantId);
  const getUserProperties = (tenantId: string) => advancedAnalyticsService.getUserProperties(tenantId);
  const getConversionGoals = (tenantId: string) => advancedAnalyticsService.getConversionGoals(tenantId);
  const getFunnels = (tenantId: string) => advancedAnalyticsService.getFunnels(tenantId);
  const getSegments = (tenantId: string) => advancedAnalyticsService.getSegments(tenantId);
  const getReports = (tenantId: string) => advancedAnalyticsService.getReports(tenantId);
  const getCohorts = (tenantId: string) => advancedAnalyticsService.getCohorts(tenantId);
  const getConfig = () => advancedAnalyticsService.getConfig();

  return {
    configure,
    track,
    trackPageView,
    setUserId,
    setUserProperties,
    createConversionGoal,
    createFunnel,
    analyzeFunnel,
    createSegment,
    getUsersInSegment,
    generateReport,
    generateCohortAnalysis,
    trackUserRegistration,
    trackAppointmentBooked,
    trackPaymentCompleted,
    trackExerciseCompleted,
    trackChatMessage,
    getEvents,
    getUserProperties,
    getConversionGoals,
    getFunnels,
    getSegments,
    getReports,
    getCohorts,
    getConfig
  };
};