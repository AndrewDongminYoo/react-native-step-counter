import { fixupConfigRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import * as espree from "espree";
import prettier from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// eslint-plugin-react-native@5.0.0 (latest, unmaintained since 2024-12, peers
// eslint ^9) loads its rules via context.getSourceCode(), removed in ESLint 10,
// so every rule it provides is unusable. @react-native/eslint-config enables
// exactly one of them (react-native/no-inline-styles), so drop the plugin
// instead of carrying a dead override. '@react-native/*' rules come from
// @react-native/eslint-plugin, a different package — those stay.
const dropReactNativePlugin = ({ plugins, rules, ...block }) => {
  if (plugins) {
    const { "react-native": _dropped, ...kept } = plugins;
    block.plugins = kept;
  }
  if (rules) {
    block.rules = Object.fromEntries(
      Object.entries(rules).filter(([name]) => !name.startsWith("react-native/"))
    );
  }
  return block;
};

export default defineConfig([
  {
    extends: fixupConfigRules(compat.extends("@react-native", "prettier")).map(
      dropReactNativePlugin
    ),
    plugins: { prettier },
    rules: {
      "react/react-in-jsx-scope": "off",
      "prettier/prettier": "error",
    },
  },
  {
    // Build output and generated docs. The build directories are the set
    // `yarn clean` deletes; documents/ is the generated JSDoc site.
    ignores: [
      ".yarn/",
      "eslint.config.mjs",
      "node_modules/",
      "lib/",
      "documents/",
      "android/build/",
      "example/android/build/",
      "example/android/app/build/",
      "example/ios/build/",
      "example/ios/Pods/",
    ],
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  {
    // @react-native/eslint-config routes plain .js/.jsx files through
    // @babel/eslint-parser@7 (for Flow), whose eslint-scope@5 lacks
    // addGlobals(), which ESLint 10 requires: "TypeError:
    // scopeManager.addGlobals is not a function". @babel/eslint-parser@8
    // fixes this but needs @babel/core ^8 (still fresh, breaks Metro/Jest's
    // babel 7 toolchain), so fall back to ESLint's default parser instead.
    // None of this repo's .js files use Flow syntax (config files and the
    // example entry point only).
    // Re-check when @babel/eslint-parser ships eslint-scope@10 support on
    // the @babel/core 7 line.
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      parser: espree,
    },
  },
  {
    // Keep LAST so it wins the settings merge over @react-native's config.
    settings: {
      react: {
        // Pin the React version so eslint-plugin-react skips auto-detection.
        // detectReactVersion() calls context.getFilename(), removed in ESLint 10.
        version: "19.2",
      },
    },
  },
]);
