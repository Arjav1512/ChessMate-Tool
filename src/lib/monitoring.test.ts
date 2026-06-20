import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Capture logError calls without touching the real Sentry path.
const logError = vi.fn();
vi.mock('./sentry', () => ({
  logError: (...args: unknown[]) => logError(...args),
}));

import { installGlobalErrorHandlers } from './monitoring';

describe('installGlobalErrorHandlers', () => {
  let dispose: (() => void) | null = null;

  beforeEach(() => {
    logError.mockClear();
  });
  afterEach(() => {
    dispose?.();
    dispose = null;
  });

  it('reports uncaught errors via logError', () => {
    dispose = installGlobalErrorHandlers(window);
    const boom = new Error('boom');
    window.dispatchEvent(new ErrorEvent('error', { error: boom, message: 'boom' }));

    expect(logError).toHaveBeenCalledTimes(1);
    const [err, ctx] = logError.mock.calls[0];
    expect(err).toBe(boom);
    expect(ctx).toMatchObject({ source: 'window.onerror' });
  });

  it('reports unhandled promise rejections via logError', () => {
    dispose = installGlobalErrorHandlers(window);
    const reason = new Error('nope');
    const evt = Object.assign(new Event('unhandledrejection'), { reason });
    window.dispatchEvent(evt);

    expect(logError).toHaveBeenCalledTimes(1);
    const [err, ctx] = logError.mock.calls[0];
    expect(err).toBe(reason);
    expect(ctx).toMatchObject({ source: 'unhandledrejection' });
  });

  it('wraps non-Error rejection reasons in an Error', () => {
    dispose = installGlobalErrorHandlers(window);
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'string failure' }));

    expect(logError).toHaveBeenCalledTimes(1);
    const [err] = logError.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('string failure');
  });

  it('is idempotent — a second install does not double-report', () => {
    dispose = installGlobalErrorHandlers(window);
    installGlobalErrorHandlers(window); // no-op
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('x'), message: 'x' }));
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('teardown removes the listeners', () => {
    const t = installGlobalErrorHandlers(window);
    t();
    // Use a rejection event here: an unhandled 'error' event would be surfaced
    // by jsdom as an uncaught error (noise), and we've intentionally removed our
    // handler. Either event type exercises the same removeEventListener path.
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('x') }));
    expect(logError).not.toHaveBeenCalled();
  });
});
