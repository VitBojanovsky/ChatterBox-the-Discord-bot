module.exports = [
  {
    ignores: ["node_modules/", ".env", ".env.local", "dist/", "build/"],
  },
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: {
      // Errors
      "no-const-assign": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-redeclare": "error",
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "valid-typeof": "error",

      // Best practices
      "no-var": "error",
      "prefer-const": "warn",
      "eqeqeq": ["warn", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-with": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // Style
      "indent": ["warn", 2],
      "quotes": ["warn", "double"],
      "semi": ["warn", "always"],
      "comma-dangle": ["warn", "always-multiline"],
      "no-trailing-spaces": "warn",
      "eol-last": ["warn", "always"],
    },
  },
];
