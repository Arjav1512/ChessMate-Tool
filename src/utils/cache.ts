interface CacheConfig {
  maxAge: number;
  maxSize: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 5 * 60 * 1000,
  maxSize: 10 * 1024 * 1024,
};

class MemoryCache {
  private cache = new Map<string, { data: unknown; timestamp: number; size: number }>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  set(key: string, data: unknown): void {
    const size = this.calculateSize(data);
    if (this.getTotalSize() + size > this.config.maxSize) {
      this.cleanup();
    }
    this.cache.set(key, { data, timestamp: Date.now(), size });
  }

  get(key: string): unknown {
    const entry = this.cache.get(key);
    if (!entry) return null;
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

  private calculateSize(data: unknown): number {
    return JSON.stringify(data).length * 2;
  }

  private getTotalSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) total += entry.size;
    return total;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.maxAge) this.cache.delete(key);
    }
    if (this.getTotalSize() > this.config.maxSize) {
      const entries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      for (const [key] of entries) {
        this.cache.delete(key);
        if (this.getTotalSize() <= this.config.maxSize) break;
      }
    }
  }
}

export const cache = new MemoryCache();

export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  cacheKey?: string
): Promise<Response> {
  const key = cacheKey || `fetch:${url}:${JSON.stringify(options)}`;
  const cached = cache.get(key);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const response = await fetch(url, options);
  if (response.ok) {
    const data = await response.json();
    cache.set(key, data);
  }
  return response;
}

export function cachedCompute<T>(key: string, computeFn: () => T): T {
  const cached = cache.get(key);
  if (cached) return cached as T;
  const result = computeFn();
  cache.set(key, result);
  return result;
}

export function preloadResources(resources: Array<{ url: string; as: string }>): void {
  resources.forEach(({ url, as }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    document.head.appendChild(link);
  });
}
