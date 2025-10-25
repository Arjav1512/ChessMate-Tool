/**
 * Cache management utilities
 */

interface CacheConfig {
  maxAge: number; // in milliseconds
  maxSize: number; // in bytes
}

const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 5 * 60 * 1000, // 5 minutes
  maxSize: 10 * 1024 * 1024, // 10MB
};

class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; size: number }>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  set(key: string, data: any): void {
    const size = this.calculateSize(data);
    
    // Remove oldest entries if cache is too large
    if (this.getTotalSize() + size > this.config.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.config.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate
  }

  private getTotalSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  private cleanup(): void {
    // Remove expired entries first
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.maxAge) {
        this.cache.delete(key);
      }
    }

    // If still too large, remove oldest entries
    if (this.getTotalSize() > this.config.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (const [key] of entries) {
        this.cache.delete(key);
        if (this.getTotalSize() <= this.config.maxSize) {
          break;
        }
      }
    }
  }
}

// Global cache instance
export const cache = new MemoryCache();

/**
 * Cache API responses
 */
export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  cacheKey?: string
): Promise<Response> {
  const key = cacheKey || `fetch:${url}:${JSON.stringify(options)}`;
  
  // Try to get from cache first
  const cached = cache.get(key);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch from network
  const response = await fetch(url, options);
  
  if (response.ok) {
    const data = await response.json();
    cache.set(key, data);
  }

  return response;
}

/**
 * Cache expensive computations
 */
export function cachedCompute<T>(
  key: string,
  computeFn: () => T,
  _maxAge?: number
): T {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const result = computeFn();
  cache.set(key, result);
  return result;
}

/**
 * Preload critical resources
 */
export function preloadResources(resources: Array<{ url: string; as: string }>): void {
  resources.forEach(({ url, as }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    document.head.appendChild(link);
  });
}
