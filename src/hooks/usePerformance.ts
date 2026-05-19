import { useCallback, useRef } from 'react';

export function usePerformance() {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  renderCount.current += 1;
  startTime.current = performance.now();

  const logRender = useCallback((componentName: string) => {
    const renderTime = performance.now() - startTime.current;
    if (renderTime > 16) {
      console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (#${renderCount.current})`);
    }
  }, []);

  const measureAsync = useCallback(async <T>(
    name: string,
    asyncFunction: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await asyncFunction();
      console.log(`[Performance] ${name} took ${(performance.now() - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      console.error(`[Performance] ${name} failed after ${(performance.now() - start).toFixed(2)}ms:`, error);
      throw error;
    }
  }, []);

  return { logRender, measureAsync };
}
