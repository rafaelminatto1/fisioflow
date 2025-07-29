# FisioFlow Technology Stack

## Frontend Stack
- **Framework**: React 19.1.1 with TypeScript 5.2.2
- **Build Tool**: Vite 4.5.5 with optimized configuration
- **Styling**: TailwindCSS 3.3.5 with custom design system
- **State Management**: React Context API + custom hooks
- **Data Fetching**: @tanstack/react-query 5.83.0
- **Routing**: react-router-dom 7.1.1
- **UI Components**: Custom components with lucide-react icons
- **Charts**: Recharts 2.8.0 for analytics dashboards

## Backend Stack
- **Framework**: Flask 2.3.3 with SQLAlchemy 2.0.21
- **Database**: PostgreSQL 15+ (primary), Redis 7+ (cache/sessions)
- **Authentication**: Flask-JWT-Extended with refresh tokens
- **API Documentation**: Flask-RESTX with Swagger/OpenAPI
- **Task Queue**: Celery with Redis broker
- **File Storage**: Local storage with cloud backup support (AWS S3, GCP, Azure)

## Mobile Stack
- **Framework**: Expo ~51.0.28 with React Native 0.74.5
- **Navigation**: @react-navigation/native 6.1.18
- **UI**: react-native-paper 5.12.3
- **Storage**: @react-native-async-storage/async-storage + expo-sqlite
- **Notifications**: expo-notifications 0.28.19

## Development Tools
- **Linting**: ESLint with TypeScript, React, and React Hooks plugins
- **Formatting**: Prettier with Tailwind plugin
- **Testing**: Vitest (unit), Jest (integration), React Testing Library
- **Git Hooks**: Husky with lint-staged for pre-commit validation
- **Type Checking**: TypeScript strict mode (gradual adoption)

## Build & Deploy
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for local development
- **Proxy**: Nginx for production reverse proxy
- **Monitoring**: Prometheus + Grafana for observability
- **CI/CD**: GitHub Actions ready configuration

## Common Commands

### Development
```bash
# Frontend development
npm run dev                    # Start Vite dev server
npm run build                  # Production build
npm run preview               # Preview production build

# Backend development
flask run                     # Start Flask dev server
flask db upgrade              # Run database migrations
flask seed-mentorship        # Seed initial data

# Mobile development
npm run ios                   # Start iOS simulator
npm run android              # Start Android emulator
```

### Testing
```bash
# Frontend testing
npm run test:unit             # Run unit tests with Vitest
npm run test:coverage         # Generate coverage report
npm run test:ui              # Open Vitest UI

# Backend testing
pytest --cov=app             # Run tests with coverage
pytest --testmon             # Run only changed tests
```

### Code Quality
```bash
# Linting and formatting
npm run lint                 # Run ESLint
npm run lint:fix            # Fix ESLint issues
npm run format              # Format with Prettier
npm run type-check          # TypeScript type checking
```

### Production
```bash
# Docker deployment
docker-compose up -d         # Start all services
docker-compose --profile monitoring up -d  # With monitoring

# Build optimization
npm run build:deploy        # Optimized production build
npm run analyze             # Bundle analysis
```

## Performance Optimizations
- **Code Splitting**: Automatic route-based and manual chunk splitting
- **Lazy Loading**: React.lazy for components and routes
- **Virtualization**: react-window for large lists (1000+ items)
- **Caching**: Service worker for offline support, Redis for backend
- **Bundle Analysis**: Vite bundle analyzer for optimization insights