# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm install` - Install dependencies
- `npm run dev` - Start development server using Vite
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Environment Setup

- Create `.env.local` file with `GEMINI_API_KEY` for AI assistant functionality
- The API key is used for Gemini AI integration in the assistant features

## Architecture Overview

This is a React + TypeScript single-page application for a physiotherapy clinic management system (FisioFlow). The app uses Vite as the build tool and implements a comprehensive healthcare management platform.

### Core Architecture Patterns

**Multi-tenant Architecture**: The application supports multiple clinics (tenants) with data isolation:

- All entities have `tenantId` fields for data segregation
- Authentication system manages current user and tenant context
- Data filtering happens at the hook level (`useData`) based on current tenant

**Provider-based State Management**: Uses React Context for global state:

- `AuthProvider` - manages authentication and current user/tenant
- `DataProvider` - manages all business data with tenant filtering
- `NotificationProvider` - handles toast notifications

**Modal-driven UI Pattern**: Most CRUD operations use modal overlays:

- Consistent modal structure with `BaseModal` component
- Each entity type has dedicated modal components (PatientModal, TaskModal, etc.)

### Key Components Structure

**Layout Components**:

- `App.tsx` - Main app wrapper with provider setup
- `Sidebar.tsx` - Navigation sidebar with role-based menu items
- `Header.tsx` - Top header with breadcrumbs
- `PageShell.tsx` - Common page layout wrapper

**Data Management**:

- `types.ts` - Central type definitions for all entities
- `constants.tsx` - Initial data and configuration
- `hooks/useData.tsx` - Main data management with tenant filtering
- `hooks/useAuth.tsx` - Authentication and user management
- `hooks/useNotification.tsx` - Notification system

**AI Integration**:

- `services/geminiService.ts` - Google Gemini AI integration for:
  - Progress note analysis and feedback
  - Knowledge base search
  - Patient report generation
  - Treatment plan generation
  - Abandonment risk prediction
  - SOAP note generation

### User Roles and Access

The system supports multiple user roles with different access levels:

- `ADMIN` - Full system access, clinic onboarding
- `FISIOTERAPEUTA` - Physiotherapist with patient management
- `ESTAGIARIO` - Intern with limited access
- `PACIENTE` - Patient portal access

Role-based navigation and features are handled throughout the application.

### Data Persistence

All data is stored in localStorage with automatic persistence:

- Each data type has its own localStorage key
- Data is automatically filtered by tenant ID
- No external database dependencies

### Notable Features

**Mentorship System**: Built-in mentorship functionality for interns:

- Course management with modules and progress tracking
- Mentorship sessions with feedback
- Student progress monitoring

**Clinical Documentation**: Comprehensive patient management:

- Patient assessments with structured data entry
- Exercise prescriptions and progress tracking
- SOAP note generation
- Document upload and management

**Financial Management**: Basic billing and transaction tracking:

- Transaction management with payment status
- Subscription plan management for tenants

**AI Assistant**: Integrated AI features for clinical support:

- Progress note analysis
- Knowledge base search
- Treatment plan suggestions
- Risk prediction analytics

## Development Notes

- TypeScript is configured with strict mode enabled
- Components are organized by feature/functionality
- All new components should follow the existing modal pattern for consistency
- AI features require valid Gemini API key configuration
- The application uses a component-first architecture with minimal external dependencies
