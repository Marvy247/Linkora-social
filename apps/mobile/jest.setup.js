// Jest setup for React Native testing

// Global test timeout
jest.setTimeout(10000);

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("Warning: ReactDOM.render is deprecated")) {
    return;
  }
  originalWarn.call(console, ...args);
};
