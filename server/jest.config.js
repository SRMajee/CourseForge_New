/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        isolatedModules: true,
        tsconfig: {
          esModuleInterop: true,
        },
      },
    ],
  },
  // ✅ FIX: Force Jest to use our CJS stub instead of the real ESM files
  moduleNameMapper: {
    "^@e2b/code-interpreter$": "<rootDir>/tests/mocks/esmStub.js",
    "^chalk$": "<rootDir>/tests/mocks/esmStub.js",
    "^#ansi-styles$": "<rootDir>/tests/mocks/esmStub.js", // Internal chalk dependency
  },
  roots: ["<rootDir>/tests"],
};