process.env.TZ = "UTC";
const jestConfig = require("jest-config");
module.exports = {
  preset: "@react-native/jest-preset",
  // other Jest configuration options...
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleFileExtensions: [...jestConfig.defaults.moduleFileExtensions, "mts"],
  modulePathIgnorePatterns: ["<rootDir>/example/node_modules", "<rootDir>/lib/"],
  moduleNameMapper: {
    // Force example/src files to use the root copies of React + RN (jest-configured versions)
    "^react$": "<rootDir>/node_modules/react",
    "^react/(.*)": "<rootDir>/node_modules/react/$1",
    "^react-native$": "<rootDir>/node_modules/react-native",
    // Secondary entry points exposed only via `exports` (RN 0.88+); the generic
    // mapper below would resolve them as literal paths, so alias them first,
    // as @react-native/jest-preset does.
    "^react-native/react-private-interface$":
      "<rootDir>/node_modules/react-native/src/react-private-interface.js",
    "^react-native/setup-env$": "<rootDir>/node_modules/react-native/src/setup-env.js",
    "^react-native/(.*)": "<rootDir>/node_modules/react-native/$1",
    // Map the local library to source so example tests can import it
    "^react-native-step-counter-newarch$": "<rootDir>/src/index.tsx",
    // Mock native packages from example/node_modules
    "^react-native-svg$": "<rootDir>/__mocks__/react-native-svg.tsx",
    "^react-native-safe-area-context$": "<rootDir>/__mocks__/react-native-safe-area-context.tsx",
    "^react-native-permissions$": "<rootDir>/__mocks__/react-native-permissions.ts",
    "^react-native-circular-progress-indicator$":
      "<rootDir>/__mocks__/react-native-circular-progress-indicator.tsx",
  },
};
