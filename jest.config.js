process.env.TZ = 'UTC';
const jestConfig = require('jest-config');
module.exports = {
  preset: 'react-native',
  // other Jest configuration options...
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: [...jestConfig.defaults.moduleFileExtensions, 'mts'],
  modulePathIgnorePatterns: ['<rootDir>/example/node_modules', '<rootDir>/lib/'],
};
