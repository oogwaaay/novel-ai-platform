/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

export function measurePerformance(name: string, fn: () => void | Promise<void>): void | Promise<void> {
  if (typeof window === 'undefined' || !window.performance) {
    return fn();
  }

  const start = performance.now();
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      recordMetric(name, duration);
    });
  } else {
    const duration = performance.now() - start;
    recordMetric(name, duration);
    return result;
  }
}

export function recordMetric(name: string, value: number): void {
  metrics.push({
    name,
    value,
    timestamp: Date.now()
  });

  // Trim if too many entries
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }

  // Log slow operations
  if (value > 1000) {
    console.warn(`[Performance] Slow operation: ${name} took ${value.toFixed(2)}ms`);
  }
}

export function getMetrics(name?: string): PerformanceMetric[] {
  if (name) {
    return metrics.filter((m) => m.name === name);
  }
  return [...metrics];
}

export function getAverageMetric(name: string): number {
  const filtered = metrics.filter((m) => m.name === name);
  if (filtered.length === 0) return 0;
  const sum = filtered.reduce((acc, m) => acc + m.value, 0);
  return sum / filtered.length;
}

export function clearMetrics(): void {
  metrics.length = 0;
}

/**
 * Monitor React component render performance
 */
export function usePerformanceMonitor(componentName: string) {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  const start = performance.now();

  return () => {
    const duration = performance.now() - start;
    recordMetric(`render:${componentName}`, duration);
  };
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}


