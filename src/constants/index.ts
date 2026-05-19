/**
 * Application constants
 */

export const APP_CONFIG = {
  NAME: 'ChessMate',
  DESCRIPTION: 'Your Personal Chess Mentor',
  VERSION: '1.2.0',
} as const;

export const API_CONFIG = {
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 10,
  },
  TIMEOUT: 30000, // 30 seconds
} as const;

export const UI_CONFIG = {
  ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
} as const;

export const CHESS_CONFIG = {
  BOARD_SIZE: 8,
  PIECE_SYMBOLS: {
    white: {
      king: '♔',
      queen: '♕',
      rook: '♖',
      bishop: '♗',
      knight: '♘',
      pawn: '♙',
    },
    black: {
      king: '♚',
      queen: '♛',
      rook: '♜',
      bishop: '♝',
      knight: '♞',
      pawn: '♟',
    },
  },
} as const;

export const THEME_CONFIG = {
  STORAGE_KEY: 'chessmate-theme',
  DEFAULT_THEME: 'light',
} as const;

export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  GAME: '/game',
  ANALYSIS: '/analysis',
  STATS: '/stats',
  PROGRESS: '/progress',
} as const;
