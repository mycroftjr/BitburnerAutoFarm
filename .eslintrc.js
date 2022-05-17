module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es6: false,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 8,
        sourceType: "module",
        ecmaFeatures: {
            experimentalObjectRestSpread: true,
        },
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
    },
    plugins: ["@typescript-eslint"],
    ignorePatterns: ['*.d.ts', '*.js'],
    rules: {
        'no-magic-numbers': ['error', { 'ignore': [0, 1, 2], 'enforceConst': true }],
        'no-constant-condition': ['error', { 'checkLoops': false }],
        'no-empty': ['warn', { 'allowEmptyCatch': true }],
        'no-inner-declarations': ['off'],
        "@typescript-eslint/no-floating-promises": "error",
    }
}
