module.exports = {
  root: true,
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
    'plugin:xwalk/recommended',
  ],
  env: {
    browser: true,
  },
  globals: {
    algoliasearch: 'readonly',
    instantsearch: 'readonly',
    InstantSearchChat: 'readonly',
    setUiState: 'readonly',
    openIngredient: 'readonly',
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  ignorePatterns: [
    'scripts/lib-*.js',
    'scripts/dompurify.min.js',
  ],
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    'no-use-before-define': ['error', { functions: false, classes: true, variables: true }], // allow function hoisting
    'xwalk/no-orphan-collapsible-fields': 'warn', // warn instead of error for orphan collapsible fields
  },
};
