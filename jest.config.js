module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  testMatch: ['**/test/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['lib/**/*.js', 'scripts/**/*.js'],
};
