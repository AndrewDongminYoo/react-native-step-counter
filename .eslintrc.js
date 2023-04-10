module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    '@react-native-community',
    'plugin:jsdoc/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['@typescript-eslint', 'jsdoc', 'jest'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'prettier/prettier': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/no-inline-styles': 'off',
    'react-native/sort-styles': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-trailing-spaces': [
      'error',
      {
        ignoreComments: true,
      },
    ],
    // JEST
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    // JsDoc
    'jsdoc/check-access': 'warn', // Recommended
    'jsdoc/check-alignment': 'warn', // Recommended
    'jsdoc/check-examples': 'off',
    'jsdoc/check-indentation': 'off',
    'jsdoc/check-line-alignment': 'off',
    'jsdoc/check-param-names': 'warn', // Recommended
    'jsdoc/check-property-names': 'warn', // Recommended
    'jsdoc/check-syntax': 'off',
    'jsdoc/check-tag-names': 'warn', // Recommended
    'jsdoc/check-types': 'warn', // Recommended
    'jsdoc/check-values': 'warn', // Recommended

    'jsdoc/empty-tags': 'warn', // Recommended
    'jsdoc/implements-on-classes': 'warn', // Recommended
    'jsdoc/match-description': 'off',
    'jsdoc/multiline-blocks': 'warn', // Recommended
    'jsdoc/newline-after-description': 'warn', // Recommended
    'jsdoc/no-bad-blocks': 'off',
    'jsdoc/no-defaults': 'off',
    'jsdoc/no-missing-syntax': 'off',
    'jsdoc/no-multi-asterisks': 'warn', // Recommended
    'jsdoc/no-restricted-syntax': 'off',
    'jsdoc/no-types': 'off',
    'jsdoc/no-undefined-types': 'warn', // Recommended

    'jsdoc/require-asterisk-prefix': 'off',
    'jsdoc/require-description': 'off',
    'jsdoc/require-description-complete-sentence': 'off',
    'jsdoc/require-example': 'off',
    'jsdoc/require-file-overview': 'off',
    'jsdoc/require-hyphen-before-param-description': 'off',
    'jsdoc/require-jsdoc': 'warn', // Recommended
    'jsdoc/require-param': 'warn', // Recommended
    'jsdoc/require-param-description': 'warn', // Recommended
    'jsdoc/require-param-name': 'warn', // Recommended
    'jsdoc/require-param-type': 'warn', // Recommended
    'jsdoc/require-property': 'warn', // Recommended
    'jsdoc/require-property-description': 'warn', // Recommended
    'jsdoc/require-property-name': 'warn', // Recommended
    'jsdoc/require-property-type': 'warn', // Recommended
    'jsdoc/require-returns': 'warn', // Recommended
    'jsdoc/require-returns-check': 'warn', // Recommended
    'jsdoc/require-returns-description': 'warn', // Recommended
    'jsdoc/require-returns-type': 'warn', // Recommended
    'jsdoc/require-throws': 'off',
    'jsdoc/require-yields': 'warn', // Recommended
    'jsdoc/require-yields-check': 'warn', // Recommended

    'jsdoc/sort-tags': 'off',
    'jsdoc/tag-lines': 'warn', // Recommended
    'jsdoc/valid-types': 'warn', // Recommended
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
      },
    ],
  },
  ignorePatterns: ['**/node_modules/', '**/lib/', '**/scripts/'],
  env: {
    'jest/globals': true,
    'jest': true,
    'commonjs': true,
    'node': true,
  },
};
