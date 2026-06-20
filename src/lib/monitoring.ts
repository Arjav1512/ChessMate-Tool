import { logError } from './sentry';

let teardown: (() => void) | null = null;

/**
 * Install global handlers for uncaught errors and unhandled promise rejections,
 * routing them through `logError` (the app's single error funnel → Sentry when a
 * DSN is configured). This guarantees otherwise-silent failures are captured —
 * important because the production build strips `console.*` (vite drop_console),
 * so without this an uncaught error in prod would surface nowhere.
 *
 * Idempotent: a second call is a no-op until the returned teardown runs. Returns
 * a teardown function (used by tests and HMR).
 */
export function installGlobalErrorHandlers(target: Window = window): () => void {
  if (teardown) return teardown;

  const onError = (event: ErrorEvent) => {
    const err = event.error instanceof Error
      ? event.error
      : new Error(event.message || 'Uncaught error');
    logError(err, {
      source: 'window.onerror',
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const err = reason instanceof Error
      ? reason
      : new Error(typeof reason === 'string' ? reason : 'Unhandled promise rejection');
    logError(err, { source: 'unhandledrejection' });
  };

  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection as EventListener);

  teardown = () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection as EventListener);
    teardown = null;
  };
  return teardown;
}
