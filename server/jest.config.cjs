/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 30000,
  setupFiles: ['<rootDir>/src/test/env-setup.ts'],
  moduleNameMapper: {
    '^@sams/shared$': '<rootDir>/../shared/src/index.ts',
  },
};
