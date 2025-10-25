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

export function logError(error: Error, context?: Record<string, unknown>) {
  console.error('Error:', error, context);
  
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, {
  //     extra: context,
  //   });
  // }
}

export function logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`[${level}] ${message}`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setUserContext(_userId: string, _email?: string) {
  // if (import.meta.env.PROD) {
  //   Sentry.setUser({ id: userId, email });
  // }
}

export function clearUserContext() {
  // if (import.meta.env.PROD) {
  //   Sentry.setUser(null);
  // }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function addBreadcrumb(_message: string, _category: string, _data?: Record<string, unknown>) {
  // if (import.meta.env.PROD) {
  //   Sentry.addBreadcrumb({
  //     message,
  //     category,
  //     data,
  //     level: 'info',
  //   });
  // }
}
