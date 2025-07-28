import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { 
  useStableCallback, 
  useOptimizedDebounce, 
  useVirtualScrolling,
  useFormOptimization,
  useComponentMetrics 
} from '../useOptimizedComponent';

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  callback,
}));

describe('useOptimizedComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useStableCallback', () => {
    it('should return a stable callback reference', () => {
      let callbackCallCount = 0;
      const originalCallback = () => {
        callbackCallCount++;
        return 'result';
      };

      const { result, rerender } = renderHook(
        ({ callback, deps }) => useStableCallback(callback, deps),
        {
          initialProps: { 
            callback: originalCallback, 
            deps: ['dep1', 'dep2'] 
          }
        }
      );

      const firstCallback = result.current;

      // Rerender with same deps - callback should be stable
      rerender({ 
        callback: originalCallback, 
        deps: ['dep1', 'dep2'] 
      });

      const secondCallback = result.current;

      expect(firstCallback).toBe(secondCallback);
    });

    it('should update callback when dependencies change', () => {
      let callbackCallCount = 0;
      const originalCallback = (multiplier: number) => {
        callbackCallCount++;
        return callbackCallCount * multiplier;
      };

      const { result, rerender } = renderHook(
        ({ callback, deps }) => useStableCallback(callback, deps),
        {
          initialProps: { 
            callback: originalCallback, 
            deps: [1] 
          }
        }
      );

      const firstCallback = result.current;
      expect(firstCallback(2)).toBe(2); // callbackCallCount = 1, 1 * 2 = 2

      // Update dependencies
      rerender({ 
        callback: originalCallback, 
        deps: [2] 
      });

      const secondCallback = result.current;
      expect(firstCallback).not.toBe(secondCallback);
      expect(secondCallback(3)).toBe(6); // callbackCallCount = 2, 2 * 3 = 6
    });

    it('should preserve callback functionality', () => {
      const mockCallback = jest.fn((a: number, b: number) => a + b);

      const { result } = renderHook(() => 
        useStableCallback(mockCallback, [])
      );

      const stableCallback = result.current;

      // Test callback functionality
      expect(stableCallback(2, 3)).toBe(5);
      expect(mockCallback).toHaveBeenCalledWith(2, 3);

      expect(stableCallback(5, 7)).toBe(12);
      expect(mockCallback).toHaveBeenCalledWith(5, 7);
    });
  });

  describe('useOptimizedDebounce', () => {
    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useOptimizedDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 300 }
        }
      );

      expect(result.current).toBe('initial');

      // Update value multiple times quickly
      rerender({ value: 'first', delay: 300 });
      expect(result.current).toBe('initial'); // Should not update immediately

      rerender({ value: 'second', delay: 300 });
      expect(result.current).toBe('initial'); // Still should not update

      rerender({ value: 'final', delay: 300 });
      expect(result.current).toBe('initial'); // Still should not update

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('final'); // Should update to final value
    });

    it('should update immediately if delay is 0', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useOptimizedDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 0 }
        }
      );

      expect(result.current).toBe('initial');

      rerender({ value: 'updated', delay: 0 });
      expect(result.current).toBe('updated'); // Should update immediately
    });

    it('should handle different delay values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useOptimizedDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 100 }
        }
      );

      rerender({ value: 'first', delay: 100 });
      
      act(() => {
        jest.advanceTimersByTime(50); // Half the delay
      });
      
      expect(result.current).toBe('initial'); // Should not update yet

      // Change delay
      rerender({ value: 'second', delay: 200 });
      
      act(() => {
        jest.advanceTimersByTime(100); // Original delay would have passed
      });
      
      expect(result.current).toBe('initial'); // Should not update with new delay

      act(() => {
        jest.advanceTimersByTime(200); // New delay passes
      });
      
      expect(result.current).toBe('second'); // Should update now
    });

    it('should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() => 
        useOptimizedDebounce('value', 300)
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('useVirtualScrolling', () => {
    const mockItems = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: i * 10
    }));

    it('should calculate visible items correctly', () => {
      const { result } = renderHook(() => 
        useVirtualScrolling({
          items: mockItems,
          itemHeight: 50,
          containerHeight: 400,
          overscan: 5
        })
      );

      expect(result.current.visibleItems.length).toBeGreaterThan(0);
      expect(result.current.visibleItems.length).toBeLessThan(mockItems.length);
      expect(result.current.totalHeight).toBe(1000 * 50); // 1000 items * 50px each
    });

    it('should update visible items on scroll', () => {
      const { result } = renderHook(() => 
        useVirtualScrolling({
          items: mockItems,
          itemHeight: 50,
          containerHeight: 400,
          overscan: 5
        })
      );

      const initialVisibleItems = result.current.visibleItems;

      act(() => {
        result.current.onScroll({ target: { scrollTop: 500 } } as any);
      });

      expect(result.current.visibleItems).not.toEqual(initialVisibleItems);
      expect(result.current.scrollTop).toBe(500);
    });

    it('should handle empty items list', () => {
      const { result } = renderHook(() => 
        useVirtualScrolling({
          items: [],
          itemHeight: 50,
          containerHeight: 400,
          overscan: 5
        })
      );

      expect(result.current.visibleItems).toEqual([]);
      expect(result.current.totalHeight).toBe(0);
    });

    it('should apply overscan correctly', () => {
      const { result } = renderHook(() => 
        useVirtualScrolling({
          items: mockItems,
          itemHeight: 50,
          containerHeight: 400,
          overscan: 10
        })
      );

      // With overscan of 10, should render more items than visible
      const visibleCount = Math.ceil(400 / 50); // 8 visible items
      const expectedCount = visibleCount + (10 * 2); // + overscan above and below

      expect(result.current.visibleItems.length).toBe(Math.min(expectedCount, mockItems.length));
    });

    it('should handle variable item heights', () => {
      const getItemHeight = (index: number) => index % 2 === 0 ? 60 : 40;

      const { result } = renderHook(() => 
        useVirtualScrolling({
          items: mockItems.slice(0, 100), // Use smaller dataset for testing
          itemHeight: 50, // This will be overridden by getItemHeight
          containerHeight: 400,
          overscan: 5,
          getItemHeight
        })
      );

      expect(result.current.visibleItems.length).toBeGreaterThan(0);
      // Total height should reflect variable heights
      const expectedHeight = mockItems.slice(0, 100).reduce((acc, _, index) => 
        acc + getItemHeight(index), 0
      );
      expect(result.current.totalHeight).toBe(expectedHeight);
    });
  });

  describe('useFormOptimization', () => {
    it('should optimize form field updates', () => {
      const initialValues = {
        name: '',
        email: '',
        phone: ''
      };

      const { result } = renderHook(() => 
        useFormOptimization(initialValues)
      );

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.dirtyFields).toEqual({});
      expect(result.current.isDirty).toBe(false);

      // Update a field
      act(() => {
        result.current.updateField('name', 'João Silva');
      });

      expect(result.current.values.name).toBe('João Silva');
      expect(result.current.dirtyFields.name).toBe(true);
      expect(result.current.isDirty).toBe(true);
    });

    it('should batch multiple field updates', () => {
      const initialValues = { name: '', email: '', phone: '' };
      const { result } = renderHook(() => useFormOptimization(initialValues));

      act(() => {
        result.current.batchUpdate({
          name: 'João Silva',
          email: 'joao@email.com'
        });
      });

      expect(result.current.values).toEqual({
        name: 'João Silva',
        email: 'joao@email.com',
        phone: ''
      });
      expect(result.current.dirtyFields).toEqual({
        name: true,
        email: true
      });
    });

    it('should validate fields', () => {
      const initialValues = { email: '' };
      const validation = {
        email: (value: string) => {
          if (!value) return 'Email is required';
          if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
          return null;
        }
      };

      const { result } = renderHook(() => 
        useFormOptimization(initialValues, { validation })
      );

      // Test required validation
      act(() => {
        result.current.validateField('email');
      });

      expect(result.current.errors.email).toBe('Email is required');

      // Test invalid email validation
      act(() => {
        result.current.updateField('email', 'invalid-email');
        result.current.validateField('email');
      });

      expect(result.current.errors.email).toBe('Email is invalid');

      // Test valid email
      act(() => {
        result.current.updateField('email', 'joao@email.com');
        result.current.validateField('email');
      });

      expect(result.current.errors.email).toBeNull();
    });

    it('should reset form to initial values', () => {
      const initialValues = { name: 'Initial', email: '' };
      const { result } = renderHook(() => useFormOptimization(initialValues));

      // Make changes
      act(() => {
        result.current.updateField('name', 'Changed');
        result.current.updateField('email', 'test@email.com');
      });

      expect(result.current.isDirty).toBe(true);

      // Reset form
      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.dirtyFields).toEqual({});
      expect(result.current.isDirty).toBe(false);
      expect(result.current.errors).toEqual({});
    });

    it('should handle nested object updates', () => {
      const initialValues = {
        user: {
          name: '',
          profile: {
            age: 0,
            city: ''
          }
        }
      };

      const { result } = renderHook(() => useFormOptimization(initialValues));

      act(() => {
        result.current.updateField('user.name', 'João Silva');
        result.current.updateField('user.profile.age', 30);
      });

      expect(result.current.values.user.name).toBe('João Silva');
      expect(result.current.values.user.profile.age).toBe(30);
    });
  });

  describe('useComponentMetrics', () => {
    it('should track render count', () => {
      const { result, rerender } = renderHook(() => 
        useComponentMetrics('TestComponent')
      );

      expect(result.current.renderCount).toBe(1);

      rerender();
      expect(result.current.renderCount).toBe(2);

      rerender();
      expect(result.current.renderCount).toBe(3);
    });

    it('should measure render time', () => {
      const mockNow = jest.mocked(performance.now);
      mockNow
        .mockReturnValueOnce(100) // Mount start
        .mockReturnValueOnce(110) // Mount end
        .mockReturnValueOnce(200) // Update start
        .mockReturnValueOnce(205); // Update end

      const { result, rerender } = renderHook(() => 
        useComponentMetrics('TestComponent')
      );

      expect(result.current.lastRenderTime).toBe(10); // 110 - 100

      rerender();
      expect(result.current.lastRenderTime).toBe(5); // 205 - 200
    });

    it('should provide average render time', () => {
      const mockNow = jest.mocked(performance.now);
      mockNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(110) // 10ms
        .mockReturnValueOnce(200)
        .mockReturnValueOnce(220) // 20ms
        .mockReturnValueOnce(300)
        .mockReturnValueOnce(315); // 15ms

      const { result, rerender } = renderHook(() => 
        useComponentMetrics('TestComponent')
      );

      rerender();
      rerender();

      // Average: (10 + 20 + 15) / 3 = 15
      expect(result.current.averageRenderTime).toBe(15);
    });

    it('should track memory usage if available', () => {
      // Mock memory API
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 1000000,
          totalJSHeapSize: 2000000,
          jsHeapSizeLimit: 4000000,
        },
        writable: true,
      });

      const { result } = renderHook(() => 
        useComponentMetrics('TestComponent')
      );

      expect(result.current.memoryUsage).toEqual({
        used: 1000000,
        total: 2000000,
        limit: 4000000,
      });
    });

    it('should handle missing memory API', () => {
      // Ensure memory API is not available
      delete (performance as any).memory;

      const { result } = renderHook(() => 
        useComponentMetrics('TestComponent')
      );

      expect(result.current.memoryUsage).toBeNull();
    });

    it('should reset metrics', () => {
      const { result, rerender } = renderHook(() => 
        useComponentMetrics('TestComponent')
      );

      rerender();
      rerender();

      expect(result.current.renderCount).toBe(3);

      act(() => {
        result.current.resetMetrics();
      });

      expect(result.current.renderCount).toBe(0);
      expect(result.current.averageRenderTime).toBe(0);
    });

    it('should provide performance warnings', () => {
      const mockNow = jest.mocked(performance.now);
      // Simulate slow render (> 16ms threshold)
      mockNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(120); // 20ms render

      const { result } = renderHook(() => 
        useComponentMetrics('TestComponent', { slowThreshold: 16 })
      );

      expect(result.current.isSlowRender).toBe(true);
      expect(result.current.warnings).toContain('Slow render detected');
    });
  });
});