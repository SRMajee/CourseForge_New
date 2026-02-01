/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    // This tells Jest to use ts-jest for all .ts and .tsx files
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
  // Matches your folder structure
  roots: ['<rootDir>/tests'],
};
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    // This tells Jest to use ts-jest for all .ts and .tsx files
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
  // Matches your folder structure
  roots: ['<rootDir>/tests'],
};