import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;
