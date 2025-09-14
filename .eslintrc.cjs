module.exports = {
  root: true,
  ignorePatterns: ['dist', 'cdk.out', 'node_modules'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parserOptions: { project: ['./tsconfig.base.json'] },
      rules: {}
    }
  ]
};
