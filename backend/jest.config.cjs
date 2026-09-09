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
    './src/assessment-instances/grade-instrument.ts': {
      branches: 80,
    },
    './src/assessment-instances/attempt-window.ts': {
      branches: 80,
    },
    './src/auth/auth.service.ts': {
      branches: 80,
    },
    './src/certificates/certificates.service.ts': {
      branches: 80,
    },
    './src/common/file-storage.service.ts': {
      branches: 80,
    },
    './src/common/tenant/tenant-scope.ts': {
      branches: 80,
    },
    './src/enrollments/completion-gate.service.ts': {
      branches: 80,
    },
    './src/poe/poe-workflow.service.ts': {
      branches: 80,
    },
  },
  testPathIgnorePatterns:
    process.env.RUN_DB_E2E === '1' ? [] : ['\\.db\\.e2e\\.spec\\.ts$'],
};
