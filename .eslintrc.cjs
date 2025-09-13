/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: ['dist', 'cdk.out', 'build', 'coverage', 'node_modules'],
  env: { es2023: true, node: true, browser: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', project: ['./tsconfig.base.json'] },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  settings: { 'import/resolver': { typescript: { project: ['./tsconfig.base.json'] } } },
  rules: {
    'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'import/no-unresolved': 'off'
  }
};
