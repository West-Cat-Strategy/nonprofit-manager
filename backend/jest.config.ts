import type { Config } from 'jest';

const targetedCoveragePathRequested = process.argv.some(
  (arg) => arg.includes('/__tests__/') || arg.endsWith('.test.ts') || arg.endsWith('.spec.ts')
);
const runningTargetedCoverage =
  process.argv.includes('--coverage') && targetedCoveragePathRequested;
const coverageThresholdsEnabled =
  process.env.JEST_RELAX_COVERAGE_THRESHOLDS !== '1' && !runningTargetedCoverage;

const config: Config = {
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
    '^@container/(.*)$': '<rootDir>/src/container/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@app-types/(.*)$': '<rootDir>/src/types/$1',
    '^@validations/(.*)$': '<rootDir>/src/validations/$1',
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
  ...(coverageThresholdsEnabled
    ? {
        coverageThreshold: {
          global: {
            branches: 32,
            functions: 41,
            lines: 46,
            statements: 47,
          },
        },
      }
    : {}),
};

export default config;
