type AnyFn = (...args: unknown[]) => unknown;

export function throttle<T extends AnyFn>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      (func as AnyFn)(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function debounce<T extends AnyFn>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => (func as AnyFn)(...args), delay);
  };
}

export function memoize<T extends AnyFn>(fn: T, keyFn?: (...args: Parameters<T>) => string): T {
  const memo = new Map<string, ReturnType<T>>();
  return ((...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    if (memo.has(key)) return memo.get(key);
    const result = (fn as AnyFn)(...args) as ReturnType<T>;
    memo.set(key, result);
    return result;
  }) as T;
}

export function lazyLoadImage(img: HTMLImageElement, src: string): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    },
    { threshold: 0.1 }
  );
  observer.observe(img);
}

export function preloadResource(href: string, as: string): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}

export function batchDOMUpdates(updates: (() => void)[]): void {
  requestAnimationFrame(() => updates.forEach(update => update()));
}

export async function measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await operation();
    console.log(`[Performance] ${name} took ${(performance.now() - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    console.error(`[Performance] ${name} failed after ${(performance.now() - start).toFixed(2)}ms:`, error);
    throw error;
  }
}

export function createPerformanceObserver(): PerformanceObserver | null {
  if (typeof PerformanceObserver === 'undefined') return null;
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'measure') {
        console.log(`[Performance] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
      }
    });
  });
  observer.observe({ entryTypes: ['measure'] });
  return observer;
}

export function createVirtualScroll<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const totalHeight = items.length * itemHeight;
  return {
    getVisibleItems: (scrollTop: number) => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount + overscan, items.length - 1);
      return { items: items.slice(startIndex, endIndex + 1), startIndex, endIndex, totalHeight };
    },
  };
}
