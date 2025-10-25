/**
 * Validation utilities
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }
  
  return { valid: true };
}

export function isValidDisplayName(name: string): { valid: boolean; message?: string } {
  if (name.trim().length === 0) {
    return { valid: false, message: 'Name is required' };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters long' };
  }
  
  if (name.trim().length > 50) {
    return { valid: false, message: 'Name must be less than 50 characters' };
  }
  
  return { valid: true };
}

export function isValidPGN(pgn: string): { valid: boolean; message?: string } {
  if (!pgn || pgn.trim().length === 0) {
    return { valid: false, message: 'PGN content is required' };
  }
  
  if (pgn.trim().length < 10) {
    return { valid: false, message: 'PGN content appears to be too short' };
  }
  
  // Basic PGN structure validation
  if (!pgn.includes('[Event') && !pgn.includes('1.')) {
    return { valid: false, message: 'PGN content does not appear to be valid chess notation' };
  }
  
  return { valid: true };
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function validateGameResult(result: string): boolean {
  const validResults = ['1-0', '0-1', '1/2-1/2', '*'];
  return validResults.includes(result);
}
