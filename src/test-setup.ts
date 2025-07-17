import { vi } from 'vitest';
import { clearFixtureCache } from './test-fixture-helpers.js';

// Global mock setup for external dependencies

// Mock clipboardy
vi.mock('clipboardy', () => ({
  write: vi.fn().mockResolvedValue(undefined),
  read: vi.fn().mockResolvedValue(''),
  writeSync: vi.fn(),
  readSync: vi.fn().mockReturnValue(''),
}));

// Mock open
vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  openApp: vi.fn().mockResolvedValue(undefined),
  apps: {
    chrome: 'google chrome',
    firefox: 'firefox',
    edge: 'microsoft edge',
  },
}));

// Mock process.exit to prevent test runner from exiting
const originalExit = process.exit;
// @ts-ignore - Mocking process.exit
process.exit = vi.fn((code?: number) => {
  // Exit call intercepted, code captured
  // Don't actually exit during tests
}) as typeof process.exit;

// Restore original process.exit after all tests
afterAll(() => {
  process.exit = originalExit;
});

// Suppress console.error and console.debug for expected errors in tests
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;
beforeEach(() => {
  console.error = vi.fn();
  console.debug = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.debug = originalConsoleDebug;
});

// Clean up fixture cache after all tests complete
afterAll(async () => {
  await clearFixtureCache();
});
