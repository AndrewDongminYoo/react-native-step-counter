process.env.TZ = "UTC";
const jestConfig = require("jest-config");
module.exports = {
  preset: "react-native",
  // other Jest configuration options...
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleFileExtensions: [...jestConfig.defaults.moduleFileExtensions, "mts"],
  modulePathIgnorePatterns: ["<rootDir>/example/node_modules", "<rootDir>/lib/"],
  moduleNameMapper: {
    // Force example/src files to use the root copies of React + RN (jest-configured versions)
    "^react$": "<rootDir>/node_modules/react",
    "^react/(.*)": "<rootDir>/node_modules/react/$1",
    "^react-native$": "<rootDir>/node_modules/react-native",
    "^react-native/(.*)": "<rootDir>/node_modules/react-native/$1",
    // Map the local library to source so example tests can import it
    "^@dongminyu/react-native-step-counter$": "<rootDir>/src/index.tsx",
    // Mock native packages from example/node_modules
    "^react-native-svg$": "<rootDir>/__mocks__/react-native-svg.tsx",
    "^react-native-safe-area-context$": "<rootDir>/__mocks__/react-native-safe-area-context.tsx",
    "^react-native-permissions$": "<rootDir>/__mocks__/react-native-permissions.ts",
    "^react-native-circular-progress-indicator$":
      "<rootDir>/__mocks__/react-native-circular-progress-indicator.tsx",
  },
};
