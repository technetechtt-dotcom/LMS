/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  testPathIgnorePatterns:
    process.env.RUN_DB_E2E === '1' ? [] : ['\\.db\\.e2e\\.spec\\.ts$'],
};
