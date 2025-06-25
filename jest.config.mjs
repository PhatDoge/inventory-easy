import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  preset: "ts-jest",
  moduleNameMapper: {
    // Handle module aliases (if you have them in tsconfig.json)
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/convex/(.*)$": "<rootDir>/convex/$1",
    // If you have other aliases, add them here
  },
  transform: {
    // Use ts-jest for ts/tsx files
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
    // Use babel-jest for js/jsx files if needed, or rely on Next.js's default transform
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig);
