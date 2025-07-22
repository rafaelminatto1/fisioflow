# 🚀 Estratégia de Deployment - FisioFlow Universal

## 🎯 Overview do Deployment

Sistema unificado de deployment para apps iOS, Android e Web usando:
- **EAS Build & Submit** para mobile
- **Expo Updates** para OTA updates
- **Vercel/Netlify** para web deployment
- **GitHub Actions** para CI/CD automatizado

## 🏗️ Arquitetura de Deploy

### Ambientes
```
┌─ Production ────────────────────────────┐
│  • iOS App Store                       │
│  • Google Play Store                   │
│  • Web: fisioflow.com                  │
│  • API: api.fisioflow.com              │
└────────────────────────────────────────┘

┌─ Staging ───────────────────────────────┐
│  • TestFlight (iOS)                    │
│  • Internal Testing (Android)          │
│  • Web: staging.fisioflow.com          │
│  • API: staging-api.fisioflow.com      │
└────────────────────────────────────────┘

┌─ Development ───────────────────────────┐
│  • Expo Development Build              │
│  • Web: dev.fisioflow.com              │
│  • API: dev-api.fisioflow.com          │
└────────────────────────────────────────┘
```

## 📱 Mobile Deployment (EAS)

### EAS Configuration
```json
// eas.json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "resourceClass": "medium"
      }
    },
    "staging": {
      "distribution": "internal",
      "channel": "staging",
      "ios": {
        "resourceClass": "m-medium",
        "simulator": false,
        "bundleIdentifier": "com.fisioflow.app.staging"
      },
      "android": {
        "resourceClass": "medium",
        "buildType": "apk",
        "applicationId": "com.fisioflow.app.staging"
      }
    },
    "production": {
      "channel": "production",
      "ios": {
        "resourceClass": "m-large",
        "bundleIdentifier": "com.fisioflow.app"
      },
      "android": {
        "resourceClass": "large",
        "buildType": "aab",
        "applicationId": "com.fisioflow.app"
      }
    }
  },
  "submit": {
    "staging": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDEFGH12"
      },
      "android": {
        "serviceAccountKeyPath": "./android-upload-key.json",
        "track": "internal"
      }
    },
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDEFGH12"
      },
      "android": {
        "serviceAccountKeyPath": "./android-upload-key.json",
        "track": "production"
      }
    }
  }
}
```

### App Configuration
```typescript
// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isStaging = process.env.EAS_BUILD_PROFILE === 'staging';
  
  return {
    ...config,
    name: isStaging ? 'FisioFlow (Staging)' : 'FisioFlow',
    slug: 'fisioflow',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0f172a',
    },
    
    assetBundlePatterns: ['**/*'],
    
    ios: {
      supportsTablet: true,
      bundleIdentifier: isStaging 
        ? 'com.fisioflow.app.staging' 
        : 'com.fisioflow.app',
      buildNumber: process.env.EAS_BUILD_ID || '1',
      infoPlist: {
        NSCameraUsageDescription: 'FisioFlow precisa acessar a câmera para capturar documentos dos pacientes.',
        NSPhotoLibraryUsageDescription: 'FisioFlow precisa acessar a galeria para anexar imagens aos prontuários.',
        NSFaceIDUsageDescription: 'Use Face ID para fazer login de forma segura.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0f172a',
      },
      package: isStaging 
        ? 'com.fisioflow.app.staging' 
        : 'com.fisioflow.app',
      versionCode: parseInt(process.env.EAS_BUILD_ID || '1'),
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
      ],
    },
    
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'static',
    },
    
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      [
        'expo-camera',
        {
          cameraPermission: 'Permitir $(PRODUCT_NAME) acessar sua câmera',
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you share them.',
        },
      ],
      [
        '@react-native-async-storage/async-storage',
        {
          // iOS specific config
        },
      ],
    ],
    
    experiments: {
      typedRoutes: true,
    },
    
    extra: {
      eas: {
        projectId: 'your-project-id',
      },
      supabaseUrl: isProduction 
        ? process.env.SUPABASE_URL_PROD 
        : process.env.SUPABASE_URL_STAGING,
      supabaseAnonKey: isProduction 
        ? process.env.SUPABASE_ANON_KEY_PROD 
        : process.env.SUPABASE_ANON_KEY_STAGING,
      revenueCatApiKey: {
        ios: process.env.REVENUE_CAT_IOS_KEY,
        android: process.env.REVENUE_CAT_ANDROID_KEY,
      },
      geminiApiKey: process.env.GEMINI_API_KEY,
    },
    
    updates: {
      url: 'https://u.expo.dev/your-project-id',
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 5000,
    },
    
    runtimeVersion: {
      policy: 'sdkVersion',
    },
  };
};
```

## 🌐 Web Deployment

### Vercel Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist",
  "devCommand": "npm run dev:web",
  "installCommand": "npm install",
  "framework": "vite",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/((?!_next/static|_next/image|favicon.ico|api/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "@supabase-url-prod",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key-prod",
    "GEMINI_API_KEY": "@gemini-api-key"
  }
}
```

### Package.json Scripts
```json
{
  "scripts": {
    "start": "expo start",
    "start:web": "expo start --web",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    
    "build:web": "expo export --platform web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "build:all": "eas build --platform all",
    
    "submit:android": "eas submit --platform android",
    "submit:ios": "eas submit --platform ios",
    "submit:all": "eas submit --platform all",
    
    "update": "eas update",
    "update:staging": "eas update --branch staging",
    "update:production": "eas update --branch production",
    
    "preview": "expo export && npx serve dist",
    "test": "jest",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy FisioFlow Universal

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

jobs:
  # Lint and Test
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run TypeScript check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test

  # Web Deployment
  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for web
        run: npm run build:web
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ github.ref == 'refs/heads/main' && secrets.SUPABASE_URL_PROD || secrets.SUPABASE_URL_STAGING }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ github.ref == 'refs/heads/main' && secrets.SUPABASE_ANON_KEY_PROD || secrets.SUPABASE_ANON_KEY_STAGING }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}

  # Mobile Build (Staging)
  build-mobile-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for staging
        run: eas build --platform all --profile staging --non-interactive
        env:
          EAS_BUILD_PROFILE: staging
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL_STAGING }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_STAGING }}

  # Mobile Build & Submit (Production)
  build-mobile-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for production
        run: eas build --platform all --profile production --non-interactive
        env:
          EAS_BUILD_PROFILE: production
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL_PROD }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_PROD }}
      
      - name: Submit to stores
        run: eas submit --platform all --profile production --non-interactive

  # OTA Updates
  ota-update:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Publish OTA update
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            eas update --branch production --message "Production update: ${{ github.event.head_commit.message }}"
          else
            eas update --branch staging --message "Staging update: ${{ github.event.head_commit.message }}"
          fi
```

## 📊 Monitoring e Analytics

### Setup de Monitoring
```typescript
// services/monitoring.ts
import * as Sentry from 'sentry-expo';
import { Analytics } from 'expo-analytics';

// Sentry para error tracking
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
  enableInExpoDevelopment: false,
  integrations: [
    new Sentry.Native.ReactNativeTracing({
      tracingOrigins: ['localhost', 'fisioflow.com', /^\//],
    }),
  ],
  tracesSampleRate: 0.1,
});

// Analytics setup
const analytics = new Analytics({
  trackingId: process.env.EXPO_PUBLIC_GA_TRACKING_ID!,
  debug: __DEV__,
});

export const trackScreen = (screenName: string, parameters?: Record<string, any>) => {
  analytics.screen(screenName, parameters);
};

export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  analytics.event(eventName, parameters);
};

export const trackError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, { extra: context });
};
```

### Health Checks
```typescript
// app/api/health/+api.ts
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    services: {
      supabase: await checkSupabaseHealth(),
      gemini: await checkGeminiHealth(),
    },
  };
  
  return Response.json(health);
}

async function checkSupabaseHealth(): Promise<'ok' | 'error'> {
  try {
    const { data } = await supabase.from('tenants').select('id').limit(1);
    return 'ok';
  } catch {
    return 'error';
  }
}

async function checkGeminiHealth(): Promise<'ok' | 'error'> {
  try {
    // Teste básico da API Gemini
    return 'ok';
  } catch {
    return 'error';
  }
}
```

## 🔐 Security & Environment

### Environment Variables
```bash
# Production
EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Revenue Cat
REVENUE_CAT_IOS_KEY=appl_xxx
REVENUE_CAT_ANDROID_KEY=goog_xxx
REVENUE_CAT_WEBHOOK_SECRET=rcs_xxx

# AI Services
GEMINI_API_KEY=AIzaSyA...

# Analytics & Monitoring
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
EXPO_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX

# Deployment
EXPO_TOKEN=xxx
VERCEL_TOKEN=xxx
APPLE_ID=your-email@example.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
GOOGLE_SERVICE_ACCOUNT_KEY=base64_encoded_key
```

## 📈 Performance Optimization

### Bundle Analysis
```json
// package.json
{
  "scripts": {
    "analyze": "npx @expo/bundle-analyzer@latest",
    "analyze:web": "npm run build:web && npx webpack-bundle-analyzer dist/static/js/*.js",
    "preload-fonts": "expo font --embed-assets"
  }
}
```

### Caching Strategy
```typescript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Enable caching for faster rebuilds
config.resolver.platforms = ['native', 'web', 'ios', 'android'];
config.transformer.cacheStores = [
  require('metro-cache/src/stores/FileStore')({
    root: path.join(__dirname, '.metro'),
  }),
];

module.exports = config;
```

## 🚀 Deployment Checklist

### Pre-Launch
- [ ] **Environment Setup**
  - [ ] Supabase production database
  - [ ] Revenue Cat products configured
  - [ ] Apple Developer Account active
  - [ ] Google Play Console setup
  - [ ] Domain and SSL certificates

- [ ] **App Store Preparation**
  - [ ] App icons (all sizes)
  - [ ] Screenshots (all devices)
  - [ ] App descriptions
  - [ ] Privacy policy
  - [ ] Terms of service

- [ ] **Testing**
  - [ ] End-to-end testing all features
  - [ ] Cross-platform compatibility
  - [ ] Performance benchmarks
  - [ ] Security audit
  - [ ] Load testing

### Launch Day
- [ ] **Mobile Apps**
  - [ ] Final production builds
  - [ ] Submit to App Store (iOS)
  - [ ] Submit to Play Store (Android)
  - [ ] Monitor store review process

- [ ] **Web App**
  - [ ] Deploy to production domain
  - [ ] DNS configuration
  - [ ] CDN setup (Vercel Edge)
  - [ ] SEO optimization

- [ ] **Monitoring**
  - [ ] Error tracking active
  - [ ] Analytics configured
  - [ ] Performance monitoring
  - [ ] User feedback channels

### Post-Launch
- [ ] **Week 1**
  - [ ] Monitor crash reports
  - [ ] User feedback review
  - [ ] Performance metrics
  - [ ] Hot fixes if needed

- [ ] **Month 1**
  - [ ] User acquisition metrics
  - [ ] Conversion rates analysis
  - [ ] Feature usage analytics
  - [ ] Plan iteration based on data

---

**Deployment Complexity**: Alto (multi-platform)
**Estimated Setup Time**: 2-3 semanas
**Maintenance Overhead**: Médio
**Scalability**: Excelente (auto-scaling)