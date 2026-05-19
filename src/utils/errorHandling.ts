export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

export class OAuthError extends AppError {
  constructor(message: string) {
    super(message, 'OAUTH_ERROR', 400);
    this.name = 'OAuthError';
  }
}

export function handleError(error: unknown): { message: string; code: string; userFriendly: boolean } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code, userFriendly: error.isOperational };
  }

  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return { message: 'Network error. Please check your connection and try again.', code: 'NETWORK_ERROR', userFriendly: true };
    }
    if (error.message.includes('timeout')) {
      return { message: 'Request timed out. Please try again.', code: 'TIMEOUT_ERROR', userFriendly: true };
    }
    if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
      return { message: 'Too many requests. Please wait a moment and try again.', code: 'RATE_LIMIT_ERROR', userFriendly: true };
    }
    return { message: error.message, code: 'UNKNOWN_ERROR', userFriendly: false };
  }

  return { message: 'An unexpected error occurred', code: 'UNKNOWN_ERROR', userFriendly: true };
}

export function logError(error: unknown, context?: string): void {
  const errorInfo = handleError(error);
  console.error(`[${context || 'App'}] Error:`, {
    message: errorInfo.message,
    code: errorInfo.code,
    originalError: error,
    timestamp: new Date().toISOString(),
  });
}
