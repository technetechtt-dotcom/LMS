/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 40,
      lines: 45,
      statements: 45,
    },
  },
  testPathIgnorePatterns:
    process.env.RUN_DB_E2E === '1' ? [] : ['\\.db\\.e2e\\.spec\\.ts$'],
};
