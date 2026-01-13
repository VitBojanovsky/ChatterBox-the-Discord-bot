module.exports = [
  {
    ignores: ["node_modules/", ".env", ".env.local", "dist/", "build/"],
  },
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        // Node.js globals
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        // Node.js timers
        setImmediate: "readonly",
        clearImmediate: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        // Global console
        console: "readonly",
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
      "no-var": "warn",
      "prefer-const": "warn",
      "eqeqeq": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-with": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // Style (warnings only - can be auto-fixed)
      "indent": "warn",
      "quotes": "warn",
      "semi": "warn",
      "comma-dangle": "warn",
      "no-trailing-spaces": "warn",
      "eol-last": "warn",
    },
  },
];
