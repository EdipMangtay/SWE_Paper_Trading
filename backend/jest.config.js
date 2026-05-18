/* Jest configuration for the layered REST API. */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/jest.env.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30_000,
  forceExit: true,
  clearMocks: true,
  verbose: true
};
