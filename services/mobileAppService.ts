/**
 * Serviço para Aplicativo Mobile PWA
 * Funcionalidades específicas para dispositivos móveis, notificações push, câmera, geolocalização
 */

import { auditLogger, AuditAction, LegalBasis } from './auditLogger';
import { intelligentNotificationService } from './intelligentNotificationService';
import { syncService } from './syncService';

// === INTERFACES ===
interface DeviceInfo {
  id: string;
  type: 'mobile' | 'tablet' | 'desktop';
  platform: 'ios' | 'android' | 'web';
  userAgent: string;
  screenSize: { width: number; height: number };
  supportedFeatures: {
    camera: boolean;
    geolocation: boolean;
    pushNotifications: boolean;
    backgroundSync: boolean;
    deviceMotion: boolean;
    vibration: boolean;
    fullscreen: boolean;
  };
  
  // PWA specific
  isInstalled: boolean;
  installPromptAvailable: boolean;
  lastActiveAt: string;
  
  // Connectivity
  networkType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
  isOnline: boolean;
  
  // Performance
  memoryInfo?: {
    used: number;
    total: number;
    limit: number;
  };
  
  // Location (if enabled)
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
}

interface CameraCapture {
  id: string;
  type: 'photo' | 'video';
  
  // File info
  blob: Blob;
  dataUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  
  // Metadata
  capturedAt: string;
  deviceInfo: {
    facing: 'user' | 'environment';
    resolution: { width: number; height: number };
  };
  
  // Context
  purpose: 'profile_photo' | 'exercise_demo' | 'injury_documentation' | 'progress_photo' | 'other';
  associatedEntityId?: string;
  associatedEntityType?: string;
  
  // Processing
  processed: boolean;
  thumbnailUrl?: string;
  annotations?: Array<{
    type: 'text' | 'arrow' | 'circle' | 'rectangle';
    data: any;
  }>;
  
  userId: string;
  tenantId: string;
}

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: any;
  
  // Metadata
  createdAt: string;
  userId: string;
  tenantId: string;
  
  // Status
  status: 'pending' | 'synced' | 'failed' | 'conflict';
  attempts: number;
  lastAttempt?: string;
  error?: string;
  
  // Priority
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface PushSubscription {
  id: string;
  userId: string;
  deviceId: string;
  
  // Subscription details
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  
  // Preferences
  enabled: boolean;
  categories: string[]; // Quais tipos de notificação aceita
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
  };
  
  // Status
  isActive: boolean;
  lastSeen: string;
  
  createdAt: string;
  tenantId: string;
}

interface MobileSettings {
  userId: string;
  
  // UI Preferences
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  reducedMotion: boolean;
  highContrast: boolean;
  
  // Accessibility
  voiceOverEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  
  // Privacy
  locationEnabled: boolean;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  
  // Performance
  imageQuality: 'low' | 'medium' | 'high';
  videoAutoplay: boolean;
  backgroundSync: boolean;
  
  // Notifications
  pushNotificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  
  updatedAt: string;
}

// === CLASSE PRINCIPAL ===
class MobileAppService {
  private deviceInfo: DeviceInfo | null = null;
  private offlineActions: OfflineAction[] = [];
  private pushSubscriptions: Map<string, PushSubscription> = new Map();
  private mobileSettings: Map<string, MobileSettings> = new Map();
  
  private installPrompt: any = null;
  private wakeLock: any = null;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializar o service
   */
  async initialize(): Promise<void> {
    await this.detectDevice();
    await this.loadStoredData();
    this.setupEventListeners();
    this.startOfflineSync();
    
    console.log('📱 Mobile App Service inicializado');
  }

  // === DETECÇÃO DE DISPOSITIVO ===

  /**
   * Detectar informações do dispositivo
   */
  async detectDevice(): Promise<DeviceInfo> {
    const deviceInfo: DeviceInfo = {
      id: this.getDeviceId(),
      type: this.getDeviceType(),
      platform: this.getPlatform(),
      userAgent: navigator.userAgent,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height,
      },
      supportedFeatures: {
        camera: this.checkCameraSupport(),
        geolocation: 'geolocation' in navigator,
        pushNotifications: 'PushManager' in window && 'serviceWorker' in navigator,
        backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        deviceMotion: 'DeviceMotionEvent' in window,
        vibration: 'vibrate' in navigator,
        fullscreen: 'requestFullscreen' in document.documentElement,
      },
      isInstalled: this.isAppInstalled(),
      installPromptAvailable: false,
      lastActiveAt: new Date().toISOString(),
      networkType: this.getNetworkType(),
      isOnline: navigator.onLine,
    };

    // Adicionar informações de memória se suportado
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      deviceInfo.memoryInfo = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }

    this.deviceInfo = deviceInfo;
    return deviceInfo;
  }

  /**
   * Verificar se o app está instalado como PWA
   */
  isAppInstalled(): boolean {
    // Verifica se está sendo executado como PWA
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           (window.navigator as any).standalone === true;
  }

  // === INSTALAÇÃO PWA ===

  /**
   * Configurar prompt de instalação
   */
  setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('💾 Install prompt disponível');
      e.preventDefault();
      this.installPrompt = e;
      
      if (this.deviceInfo) {
        this.deviceInfo.installPromptAvailable = true;
      }
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ App instalado como PWA');
      if (this.deviceInfo) {
        this.deviceInfo.isInstalled = true;
        this.deviceInfo.installPromptAvailable = false;
      }
      this.installPrompt = null;
    });
  }

  /**
   * Mostrar prompt de instalação
   */
  async showInstallPrompt(): Promise<{ outcome: 'accepted' | 'dismissed' | 'not_available' }> {
    if (!this.installPrompt) {
      return { outcome: 'not_available' };
    }

    try {
      this.installPrompt.prompt();
      const result = await this.installPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        console.log('✅ Usuário aceitou instalar o app');
      } else {
        console.log('❌ Usuário rejeitou a instalação');
      }

      this.installPrompt = null;
      return { outcome: result.outcome };
    } catch (error) {
      console.error('❌ Erro ao mostrar prompt de instalação:', error);
      return { outcome: 'not_available' };
    }
  }

  // === CÂMERA E MÍDIA ===

  /**
   * Capturar foto ou vídeo
   */
  async captureMedia(
    options: {
      type: 'photo' | 'video';
      facing?: 'user' | 'environment';
      quality?: number;
      maxDuration?: number; // para vídeo, em segundos
      purpose: CameraCapture['purpose'];
      associatedEntityId?: string;
      associatedEntityType?: string;
    },
    userId: string,
    tenantId: string
  ): Promise<CameraCapture> {
    if (!this.deviceInfo?.supportedFeatures.camera) {
      throw new Error('Câmera não suportada neste dispositivo');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: options.facing || 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: options.type === 'video',
      });

      let blob: Blob;
      let dataUrl: string;

      if (options.type === 'photo') {
        const result = await this.capturePhoto(stream, options.quality || 0.8);
        blob = result.blob;
        dataUrl = result.dataUrl;
      } else {
        const result = await this.captureVideo(stream, options.maxDuration || 30);
        blob = result.blob;
        dataUrl = result.dataUrl;
      }

      // Parar todas as tracks
      stream.getTracks().forEach(track => track.stop());

      const capture: CameraCapture = {
        id: this.generateId('capture'),
        type: options.type,
        blob,
        dataUrl,
        fileName: `${options.type}_${Date.now()}.${options.type === 'photo' ? 'jpg' : 'webm'}`,
        fileSize: blob.size,
        mimeType: blob.type,
        capturedAt: new Date().toISOString(),
        deviceInfo: {
          facing: options.facing || 'environment',
          resolution: { width: 1920, height: 1080 }, // Seria obtido do stream
        },
        purpose: options.purpose,
        associatedEntityId: options.associatedEntityId,
        associatedEntityType: options.associatedEntityType,
        processed: false,
        userId,
        tenantId,
      };

      // Gerar thumbnail se for vídeo
      if (options.type === 'video') {
        capture.thumbnailUrl = await this.generateVideoThumbnail(dataUrl);
      }

      // Log de auditoria
      await auditLogger.logAction(
        tenantId,
        userId,
        'USER',
        AuditAction.CREATE,
        'media_capture',
        capture.id,
        {
          entityName: `${options.type} capture`,
          legalBasis: LegalBasis.LEGITIMATE_INTEREST,
          dataAccessed: ['camera', 'media_storage'],
          metadata: {
            type: options.type,
            purpose: options.purpose,
            fileSize: blob.size,
            resolution: capture.deviceInfo.resolution,
          },
        }
      );

      console.log(`📸 ${options.type} capturada: ${capture.fileName} (${Math.round(blob.size / 1024)}KB)`);
      return capture;
    } catch (error) {
      console.error('❌ Erro ao capturar mídia:', error);
      throw error;
    }
  }

  // === GEOLOCALIZAÇÃO ===

  /**
   * Obter localização atual
   */
  async getCurrentLocation(
    options: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    } = {},
    userId: string,
    tenantId: string
  ): Promise<GeolocationData> {
    if (!this.deviceInfo?.supportedFeatures.geolocation) {
      throw new Error('Geolocalização não suportada');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: new Date().toISOString(),
          };

          // Atualizar última localização conhecida
          if (this.deviceInfo) {
            this.deviceInfo.lastKnownLocation = {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              accuracy: locationData.accuracy,
              timestamp: locationData.timestamp,
            };
          }

          // Log de auditoria
          await auditLogger.logAction(
            tenantId,
            userId,
            'USER',
            AuditAction.READ,
            'geolocation',
            'current_location',
            {
              entityName: 'Current Location',
              legalBasis: LegalBasis.CONSENT,
              dataAccessed: ['location_data'],
              metadata: {
                accuracy: locationData.accuracy,
                method: 'gps',
              },
            }
          );

          console.log(`📍 Localização obtida: ${locationData.latitude}, ${locationData.longitude} (±${locationData.accuracy}m)`);
          resolve(locationData);
        },
        (error) => {
          console.error('❌ Erro ao obter localização:', error);
          reject(error);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy || false,
          timeout: options.timeout || 10000,
          maximumAge: options.maximumAge || 300000, // 5 minutos
        }
      );
    });
  }

  // === NOTIFICAÇÕES PUSH ===

  /**
   * Registrar para notificações push
   */
  async registerPushNotifications(
    userId: string,
    tenantId: string,
    categories: string[] = ['all']
  ): Promise<PushSubscription | null> {
    if (!this.deviceInfo?.supportedFeatures.pushNotifications) {
      throw new Error('Push notifications não suportadas');
    }

    try {
      // Solicitar permissão
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permissão para notificações negada');
      }

      // Registrar service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Criar subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.REACT_APP_VAPID_PUBLIC_KEY || 'default_vapid_key'
        ),
      });

      const pushSub: PushSubscription = {
        id: this.generateId('push_sub'),
        userId,
        deviceId: this.deviceInfo!.id,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
        },
        enabled: true,
        categories,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
        isActive: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        tenantId,
      };

      this.pushSubscriptions.set(pushSub.id, pushSub);
      await this.savePushSubscriptions();

      console.log('🔔 Push notifications registradas');
      return pushSub;
    } catch (error) {
      console.error('❌ Erro ao registrar push notifications:', error);
      throw error;
    }
  }

  // === AÇÕES OFFLINE ===

  /**
   * Registrar ação para sync quando online
   */
  async registerOfflineAction(
    action: Omit<OfflineAction, 'id' | 'createdAt' | 'status' | 'attempts'>
  ): Promise<string> {
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateId('offline_action'),
      createdAt: new Date().toISOString(),
      status: 'pending',
      attempts: 0,
    };

    this.offlineActions.push(offlineAction);
    await this.saveOfflineActions();

    console.log(`💾 Ação offline registrada: ${action.type} ${action.entityType}`);
    return offlineAction.id;
  }

  /**
   * Sincronizar ações offline
   */
  async syncOfflineActions(): Promise<{ synced: number; failed: number; conflicts: number }> {
    if (!navigator.onLine) {
      console.log('📵 Offline - sync adiado');
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    const pendingActions = this.offlineActions.filter(action => action.status === 'pending');
    
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    for (const action of pendingActions) {
      try {
        action.attempts++;
        action.lastAttempt = new Date().toISOString();

        // Simular sync da ação
        const result = await this.syncSingleAction(action);
        
        if (result.success) {
          action.status = 'synced';
          synced++;
        } else if (result.conflict) {
          action.status = 'conflict';
          conflicts++;
        } else {
          action.status = 'failed';
          action.error = result.error;
          failed++;
        }
      } catch (error) {
        action.status = 'failed';
        action.error = String(error);
        failed++;
      }
    }

    // Remover ações sincronizadas com sucesso
    this.offlineActions = this.offlineActions.filter(action => action.status !== 'synced');
    await this.saveOfflineActions();

    console.log(`🔄 Sync offline: ${synced} ok, ${failed} erro, ${conflicts} conflito`);
    return { synced, failed, conflicts };
  }

  // === CONFIGURAÇÕES MOBILE ===

  /**
   * Atualizar configurações mobile
   */
  async updateMobileSettings(
    userId: string,
    settings: Partial<Omit<MobileSettings, 'userId' | 'updatedAt'>>
  ): Promise<void> {
    const existing = this.mobileSettings.get(userId) || {
      userId,
      theme: 'auto',
      fontSize: 'medium',
      reducedMotion: false,
      highContrast: false,
      voiceOverEnabled: false,
      hapticFeedbackEnabled: true,
      locationEnabled: false,
      cameraEnabled: true,
      microphoneEnabled: true,
      imageQuality: 'medium',
      videoAutoplay: false,
      backgroundSync: true,
      pushNotificationsEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      updatedAt: new Date().toISOString(),
    };

    const updated: MobileSettings = {
      ...existing,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    this.mobileSettings.set(userId, updated);
    await this.saveMobileSettings();

    // Aplicar configurações imediatamente
    this.applyMobileSettings(updated);

    console.log(`⚙️ Configurações mobile atualizadas para ${userId}`);
  }

  /**
   * Aplicar configurações mobile
   */
  private applyMobileSettings(settings: MobileSettings): void {
    // Aplicar tema
    if (settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (settings.theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // Auto - usar preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }

    // Aplicar tamanho da fonte
    document.documentElement.setAttribute('data-font-size', settings.fontSize);

    // Aplicar movimento reduzido
    if (settings.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
      document.documentElement.style.setProperty('--transition-duration', '0s');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
      document.documentElement.style.removeProperty('--transition-duration');
    }

    // Aplicar alto contraste
    if (settings.highContrast) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
    } else {
      document.documentElement.removeAttribute('data-high-contrast');
    }
  }

  // === FUNCIONALIDADES ESPECÍFICAS ===

  /**
   * Manter tela ativa (wake lock)
   */
  async requestWakeLock(reason: string = 'user_activity'): Promise<boolean> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        
        this.wakeLock.addEventListener('release', () => {
          console.log('🔓 Wake lock liberado');
          this.wakeLock = null;
        });

        console.log(`🔒 Wake lock ativado: ${reason}`);
        return true;
      } catch (error) {
        console.error('❌ Erro ao ativar wake lock:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Liberar wake lock
   */
  releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  /**
   * Vibrar dispositivo
   */
  vibrate(pattern: number | number[]): boolean {
    if (this.deviceInfo?.supportedFeatures.vibration) {
      navigator.vibrate(pattern);
      return true;
    }
    return false;
  }

  /**
   * Entrar em fullscreen
   */
  async requestFullscreen(): Promise<boolean> {
    if (this.deviceInfo?.supportedFeatures.fullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        return true;
      } catch (error) {
        console.error('❌ Erro ao entrar em fullscreen:', error);
        return false;
      }
    }
    return false;
  }

  // === MÉTODOS PRIVADOS ===

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('fisioflow_device_id');
    if (!deviceId) {
      deviceId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('fisioflow_device_id', deviceId);
    }
    return deviceId;
  }

  private getDeviceType(): DeviceInfo['type'] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  private getPlatform(): DeviceInfo['platform'] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else {
      return 'web';
    }
  }

  private checkCameraSupport(): boolean {
    return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
  }

  private getNetworkType(): DeviceInfo['networkType'] {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private async capturePhoto(stream: MediaStream, quality: number): Promise<{ blob: Blob; dataUrl: string }> {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    return new Promise((resolve, reject) => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        
        // Configurar canvas com as dimensões do vídeo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Desenhar frame atual no canvas
        context.drawImage(video, 0, 0);
        
        // Converter para blob
        canvas.toBlob((blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({ blob, dataUrl });
          } else {
            reject(new Error('Falha ao gerar imagem'));
          }
        }, 'image/jpeg', quality);
      };
    });
  }

  private async captureVideo(stream: MediaStream, maxDuration: number): Promise<{ blob: Blob; dataUrl: string }> {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    });

    const chunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const dataUrl = URL.createObjectURL(blob);
        resolve({ blob, dataUrl });
      };

      mediaRecorder.onerror = (event) => {
        reject(new Error('Erro na gravação de vídeo'));
      };

      mediaRecorder.start();
      
      // Parar gravação após maxDuration
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, maxDuration * 1000);
    });
  }

  private async generateVideoThumbnail(videoUrl: string): Promise<string> {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    return new Promise((resolve, reject) => {
      video.src = videoUrl;
      video.currentTime = 1; // 1 segundo do vídeo
      
      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnailUrl);
      };
      
      video.onerror = () => reject(new Error('Erro ao gerar thumbnail'));
    });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private async syncSingleAction(action: OfflineAction): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
    // Simular sync de uma ação específica
    // Em produção, faria chamada real para API
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular latência
      
      // 90% de chance de sucesso
      if (Math.random() > 0.1) {
        return { success: true };
      } else {
        return { success: false, error: 'Erro simulado de rede' };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private setupEventListeners(): void {
    // Detectar mudanças de conectividade
    window.addEventListener('online', () => {
      if (this.deviceInfo) {
        this.deviceInfo.isOnline = true;
      }
      console.log('🌐 Device online - iniciando sync');
      this.syncOfflineActions();
    });

    window.addEventListener('offline', () => {
      if (this.deviceInfo) {
        this.deviceInfo.isOnline = false;
      }
      console.log('📵 Device offline');
    });

    // Detectar mudanças de rede
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        if (this.deviceInfo) {
          this.deviceInfo.networkType = connection.effectiveType || 'unknown';
        }
        console.log(`📶 Rede mudou para: ${this.deviceInfo?.networkType}`);
      });
    }

    // Detectar visibilidade da página
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.deviceInfo) {
        this.deviceInfo.lastActiveAt = new Date().toISOString();
        
        // Sync quando voltar para o app
        if (navigator.onLine) {
          this.syncOfflineActions();
        }
      }
    });

    // Setup install prompt
    this.setupInstallPrompt();
  }

  private startOfflineSync(): void {
    // Tentar sync a cada 30 segundos quando online
    setInterval(() => {
      if (navigator.onLine && this.offlineActions.some(a => a.status === 'pending')) {
        this.syncOfflineActions();
      }
    }, 30000);
  }

  private async loadStoredData(): Promise<void> {
    try {
      // Carregar ações offline
      const offlineData = localStorage.getItem('fisioflow_offline_actions');
      if (offlineData) {
        this.offlineActions = JSON.parse(offlineData);
      }

      // Carregar push subscriptions
      const pushData = localStorage.getItem('fisioflow_push_subscriptions');
      if (pushData) {
        const subscriptions = JSON.parse(pushData);
        subscriptions.forEach((sub: PushSubscription) => {
          this.pushSubscriptions.set(sub.id, sub);
        });
      }

      // Carregar configurações mobile
      const settingsData = localStorage.getItem('fisioflow_mobile_settings');
      if (settingsData) {
        const settings = JSON.parse(settingsData);
        settings.forEach((setting: MobileSettings) => {
          this.mobileSettings.set(setting.userId, setting);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados mobile:', error);
    }
  }

  private async saveOfflineActions(): Promise<void> {
    try {
      localStorage.setItem('fisioflow_offline_actions', JSON.stringify(this.offlineActions));
    } catch (error) {
      console.error('❌ Erro ao salvar ações offline:', error);
    }
  }

  private async savePushSubscriptions(): Promise<void> {
    try {
      const subscriptions = Array.from(this.pushSubscriptions.values());
      localStorage.setItem('fisioflow_push_subscriptions', JSON.stringify(subscriptions));
    } catch (error) {
      console.error('❌ Erro ao salvar push subscriptions:', error);
    }
  }

  private async saveMobileSettings(): Promise<void> {
    try {
      const settings = Array.from(this.mobileSettings.values());
      localStorage.setItem('fisioflow_mobile_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('❌ Erro ao salvar configurações mobile:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === INSTÂNCIA SINGLETON ===
export const mobileAppService = new MobileAppService();

// === HOOKS REACT ===
export const useMobileApp = () => {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo | null>(null);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const updateDeviceInfo = async () => {
      const info = await mobileAppService.detectDevice();
      setDeviceInfo(info);
    };

    updateDeviceInfo();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const captureMedia = React.useCallback(async (
    options: any,
    userId: string,
    tenantId: string
  ) => {
    return await mobileAppService.captureMedia(options, userId, tenantId);
  }, []);

  const getCurrentLocation = React.useCallback(async (
    options: any,
    userId: string,
    tenantId: string
  ) => {
    return await mobileAppService.getCurrentLocation(options, userId, tenantId);
  }, []);

  return {
    deviceInfo,
    isOnline,
    captureMedia,
    getCurrentLocation,
    registerPushNotifications: mobileAppService.registerPushNotifications.bind(mobileAppService),
    showInstallPrompt: mobileAppService.showInstallPrompt.bind(mobileAppService),
    updateMobileSettings: mobileAppService.updateMobileSettings.bind(mobileAppService),
    registerOfflineAction: mobileAppService.registerOfflineAction.bind(mobileAppService),
    syncOfflineActions: mobileAppService.syncOfflineActions.bind(mobileAppService),
    requestWakeLock: mobileAppService.requestWakeLock.bind(mobileAppService),
    releaseWakeLock: mobileAppService.releaseWakeLock.bind(mobileAppService),
    vibrate: mobileAppService.vibrate.bind(mobileAppService),
    requestFullscreen: mobileAppService.requestFullscreen.bind(mobileAppService),
  };
};

export default mobileAppService;

// Adicionar import do React
import React from 'react';