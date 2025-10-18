import * as Sentry from '@sentry/react';

export function initSentry() {
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
  const ENVIRONMENT = import.meta.env.MODE;

  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error monitoring disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event, hint) {
      if (event.exception) {
        const error = hint.originalException;

        if (error instanceof Error) {
          if (error.message.includes('API key')) {
            return null;
          }
          if (error.message.includes('Network')) {
            event.fingerprint = ['network-error'];
          }
        }
      }

      return event;
    },

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'AbortError',
      'NetworkError',
    ],
  });
}

export function logError(error: Error, context?: Record<string, any>) {
  console.error('Error:', error, context);

  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

export function logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}
