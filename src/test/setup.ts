import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup the React testing-library DOM after each test to prevent leakage
// between component tests.
afterEach(() => {
  cleanup();
});
