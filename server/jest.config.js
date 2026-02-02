/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // ✅ FIX: Correct configuration to silence warning
        isolatedModules: true,
        tsconfig: {
          esModuleInterop: true,
        },
      },
    ],
  },
  roots: ["<rootDir>/tests"],
};