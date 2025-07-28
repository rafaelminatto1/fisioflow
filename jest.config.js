module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/services/(.*)$': '<rootDir>/services/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/**/?(*.)(integration|e2e).test.(ts|tsx|js)',
    '<rootDir>/tests/**/*.test.(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/mobile/',
    '/vercel-mcp-temp/',
    '**/*.spec.{ts,tsx}' // Vitest files
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    'services/**/*.(ts|tsx)',
    'hooks/**/*.(ts|tsx)',
    'components/**/*.(ts|tsx)',
    'contexts/**/*.(ts|tsx)',
    'utils/**/*.(ts|tsx)',
    '!**/*.d.ts',
    '!src/main.tsx', 
    '!src/vite-env.d.ts',
    '!**/*.config.{ts,js}',
    '!**/__tests__/**',
    '!**/test/**'
  ],
  coverageDirectory: 'coverage/jest',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  testTimeout: 15000,
  setupTimeout: 10000,
  teardownTimeout: 5000,
  maxWorkers: '50%',
  verbose: true,
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },
  // Mock IndexedDB for tests
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  }
};