# FisioFlow Project Structure

## Root Directory Organization

```
fisioflow/
├── components/           # React components (main UI layer)
├── hooks/               # Custom React hooks for data and logic
├── services/            # API services and external integrations
├── types/               # TypeScript type definitions
├── utils/               # Utility functions and helpers
├── contexts/            # React Context providers
├── backend/             # Flask API backend
├── mobile/              # Expo/React Native mobile app
├── docs/                # Project documentation
├── scripts/             # Build and deployment scripts
├── tests/               # Test files and configurations
└── public/              # Static assets
```

## Frontend Architecture

### Component Organization
- **components/**: All React components, organized by feature/module
  - **ui/**: Reusable UI components (buttons, modals, forms)
  - **dashboard/**: Dashboard-specific components
  - **patient/**: Patient management components
  - **auth/**: Authentication components
  - **admin/**: Administrative components
  - One component per file, named with PascalCase

### Data Layer
- **hooks/**: Custom hooks for data management and business logic
  - **useData.tsx**: Central data management hook
  - **useAuth.tsx**: Authentication state management
  - **usePatients.tsx**: Patient-specific data operations
  - **data/**: Specialized data hooks by domain
- **services/**: External API calls and integrations
  - **supabase.ts**: Database service
  - **geminiService.ts**: AI integration
  - **notificationService.ts**: Push notifications

### Type System
- **types.ts**: Main type definitions
- **types/**: Domain-specific type definitions
  - **patient.types.ts**: Patient-related types
  - **exercise.types.ts**: Exercise and protocol types
  - **analytics.ts**: Analytics and metrics types

## Backend Architecture

```
backend/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── mentorship/          # Mentorship module
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── routes.py        # API endpoints
│   │   ├── services.py      # Business logic
│   │   └── utils.py         # Module utilities
│   └── database.py          # Database configuration
├── migrations/              # Database migrations
├── requirements.txt         # Python dependencies
└── Dockerfile              # Container configuration
```

## Mobile Architecture

```
mobile/
├── src/
│   ├── components/         # React Native components
│   ├── screens/           # Screen components
│   ├── navigation/        # Navigation configuration
│   ├── services/          # API and storage services
│   └── utils/             # Mobile-specific utilities
├── assets/                # Images, fonts, icons
└── app.json              # Expo configuration
```

## Naming Conventions

### Files and Directories
- **Components**: PascalCase (e.g., `PatientModal.tsx`)
- **Hooks**: camelCase starting with "use" (e.g., `usePatients.tsx`)
- **Services**: camelCase (e.g., `geminiService.ts`)
- **Types**: camelCase with .types suffix (e.g., `patient.types.ts`)
- **Utilities**: camelCase (e.g., `validations.ts`)

### Code Conventions
- **Interfaces**: PascalCase with descriptive names (e.g., `Patient`, `Appointment`)
- **Enums**: PascalCase (e.g., `UserRole`, `SubscriptionPlan`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `INITIAL_PATIENTS`)
- **Functions**: camelCase with descriptive verbs (e.g., `createPatient`, `updateAppointment`)

## Import Organization

### Path Aliases (configured in tsconfig.json)
```typescript
import { Patient } from '@/types';
import { usePatients } from '@/hooks/usePatients';
import { PatientModal } from '@/components/PatientModal';
import { geminiService } from '@/services/geminiService';
```

### Import Order (enforced by ESLint)
1. React and external libraries
2. Internal services and utilities
3. Types and interfaces
4. Relative imports

## Multi-tenant Architecture

### Data Isolation
- All data operations filtered by `tenantId`
- Tenant context provided at app root level
- Automatic tenant detection and switching
- Isolated storage per tenant in localStorage

### Module Integration
- Cross-module data sharing through centralized hooks
- Unified search across all modules
- Integrated dashboard with consolidated metrics
- Automated workflows between modules

## Performance Patterns

### Code Splitting
- Route-based splitting with React.lazy
- Component-based splitting for large features
- Vendor chunk separation for better caching

### Data Management
- Centralized state in useData hook
- Local storage persistence with tenant isolation
- Optimistic updates for better UX
- Background sync for offline support

### Component Optimization
- React.memo for expensive components
- useMemo for complex calculations
- useCallback for stable function references
- Virtualization for large lists (react-window)

## Testing Structure

```
tests/
├── components/           # Component tests
├── hooks/               # Hook tests
├── services/            # Service tests
├── integration/         # Integration tests
└── setup.ts            # Test configuration
```

## Configuration Files

- **package.json**: Dependencies and scripts
- **tsconfig.json**: TypeScript configuration with strict mode
- **vite.config.ts**: Build configuration with optimizations
- **tailwind.config.js**: Design system configuration
- **.eslintrc.json**: Code quality rules
- **.prettierrc**: Code formatting rules
- **docker-compose.yml**: Development environment setup