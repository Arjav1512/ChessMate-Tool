import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook for performance monitoring and optimization
 */
export function usePerformance() {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    startTime.current = performance.now();
  });

  const logRender = useCallback((componentName: string) => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    if (renderTime > 16) { // More than one frame (60fps)
      console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
    }
  }, []);

  const measureAsync = useCallback(async <T>(
    name: string,
    asyncFunction: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await asyncFunction();
      const end = performance.now();
      console.log(`[Performance] ${name} took ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`[Performance] ${name} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  }, []);

  return { logRender, measureAsync };
}

/**
 * Hook for memoizing expensive calculations
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = useRef<T>();
  
  if (!ref.current || deps.some((dep, i) => dep !== (ref.current as any)?.[i])) {
    ref.current = callback;
  }
  
  return ref.current as T;
}
