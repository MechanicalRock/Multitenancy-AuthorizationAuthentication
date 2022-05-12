/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/index.tsx',
    '<rootDir>/src/index.d',
    '<rootDir>/src/react-app-env.d.ts',
    '<rootDir>/src/reportWebVitals.ts',
    '<rootDir>/src/test.helpers.tsx',
    '<rootDir>/src/accept/',
  ],
}
