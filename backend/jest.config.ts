import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        useESM: true,
        diagnostics: false,
      },
    ],
  },
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@services$': '<rootDir>/src/services/index.ts',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@app-types/(.*)$': '<rootDir>/src/types/$1',
    '^@middleware$': '<rootDir>/src/middleware/index.ts',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/**/__tests__/**', '!<rootDir>/src/index.ts'],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 28,
      lines: 27,
      statements: 28,
    },
  },
};

export default config;
