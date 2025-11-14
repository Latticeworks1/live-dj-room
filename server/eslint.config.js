const js = require('@eslint/js');
const security = require('eslint-plugin-security');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    plugins: {
      security: security
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
      ...security.configs.recommended.rules
    }
  }
];
