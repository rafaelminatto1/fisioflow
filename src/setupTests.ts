import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Polyfills para Node.js
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {} as SubtleCrypto,
  } as Crypto;
}

// Mock localStorage com implementação mais robusta
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock(),
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock(),
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  private callback: IntersectionObserverCallback;
  private options: IntersectionObserverInit;
  
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options || {};
  }
  
  observe() {
    return null;
  }
  
  disconnect() {
    return null;
  }
  
  unobserve() {
    return null;
  }
  
  get root() {
    return this.options.root || null;
  }
  
  get rootMargin() {
    return this.options.rootMargin || '0px';
  }
  
  get thresholds() {
    return Array.isArray(this.options.threshold) 
      ? this.options.threshold 
      : [this.options.threshold || 0];
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  private callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe() {
    return null;
  }
  
  disconnect() {
    return null;
  }
  
  unobserve() {
    return null;
  }
};

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  private callback: MutationCallback;
  
  constructor(callback: MutationCallback) {
    this.callback = callback;
  }
  
  observe() {
    return null;
  }
  
  disconnect() {
    return null;
  }
  
  takeRecords(): MutationRecord[] {
    return [];
  }
};

// Mock fetch com implementação mais robusta
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL e URL.revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mocked-object-url'),
  writable: true,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn();

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  value: jest.fn().mockResolvedValue(undefined),
  writable: true,
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  value: jest.fn(),
  writable: true,
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Mock Element.scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
});

// Mock File e FileReader
global.File = class File {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  
  constructor(chunks: BlobPart[], filename: string, options?: FilePropertyBag) {
    this.name = filename;
    this.size = chunks.reduce((acc, chunk) => acc + (typeof chunk === 'string' ? chunk.length : chunk.size || 0), 0);
    this.type = options?.type || '';
    this.lastModified = options?.lastModified || Date.now();
  }
  
  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(0));
  }
  
  text(): Promise<string> {
    return Promise.resolve('');
  }
  
  stream(): ReadableStream {
    return new ReadableStream();
  }
  
  slice(): Blob {
    return new Blob();
  }
};

global.FileReader = class FileReader extends EventTarget {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: number = 0;
  
  readAsText() {
    setTimeout(() => {
      this.result = '';
      this.readyState = 2;
      this.dispatchEvent(new Event('load'));
    }, 0);
  }
  
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:text/plain;base64,';
      this.readyState = 2;
      this.dispatchEvent(new Event('load'));
    }, 0);
  }
  
  readAsArrayBuffer() {
    setTimeout(() => {
      this.result = new ArrayBuffer(0);
      this.readyState = 2;
      this.dispatchEvent(new Event('load'));
    }, 0);
  }
  
  abort() {
    this.readyState = 2;
    this.dispatchEvent(new Event('abort'));
  }
  
  addEventListener() {}
  removeEventListener() {}
};

// Suppress specific React warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (
        args[0].includes('Warning: ReactDOM.render is deprecated') ||
        args[0].includes('Warning: React.createFactory() is deprecated') ||
        args[0].includes('Warning: componentWillReceiveProps has been renamed')
      )
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (
        args[0].includes('Warning: React.createFactory() is deprecated') ||
        args[0].includes('Warning: componentWillReceiveProps has been renamed')
      )
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  
  // Reset fetch mock
  mockFetch.mockReset();
  
  // Clear localStorage and sessionStorage
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// Global test utilities
global.testUtils = {
  // Utility para criar mock de Response
  createMockResponse: (data: any, status = 200, statusText = 'OK') => ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: function() { return this; },
    body: null,
    bodyUsed: false,
  }),
  
  // Utility para simular delay
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Utility para criar eventos customizados
  createEvent: (type: string, data?: any) => {
    const event = new CustomEvent(type, { detail: data });
    return event;
  },
};

// Declaração de tipos para utilities globais
declare global {
  var testUtils: {
    createMockResponse: (data: any, status?: number, statusText?: string) => Response;
    delay: (ms: number) => Promise<void>;
    createEvent: (type: string, data?: any) => CustomEvent;
  };
}
