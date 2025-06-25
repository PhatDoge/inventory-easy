// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock Recharts ResizeObserver to prevent errors during tests
// Recharts uses ResizeObserver, which might not be available in JSDOM or can cause issues.
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock next/router for components that use it (if any)
// Example:
// jest.mock('next/router', () => ({
//   useRouter() {
//     return {
//       route: '/',
//       pathname: '',
//       query: '',
//       asPath: '',
//       push: jest.fn(),
//       events: {
//         on: jest.fn(),
//         off: jest.fn()
//       },
//       beforePopState: jest.fn(() => null),
//       prefetch: jest.fn(() => null)
//     };
//   }
// }));

// You might also need to mock other browser-specific APIs if they cause issues
// For example, matchMedia:
// Object.defineProperty(window, 'matchMedia', {
//   writable: true,
//   value: jest.fn().mockImplementation(query => ({
//     matches: false,
//     media: query,
//     onchange: null,
//     addListener: jest.fn(), // deprecated
//     removeListener: jest.fn(), // deprecated
//     addEventListener: jest.fn(),
//     removeEventListener: jest.fn(),
//     dispatchEvent: jest.fn(),
//   })),
// });
