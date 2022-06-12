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
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
    },
    plugins: ["@typescript-eslint"],
    ignorePatterns: ["*.d.ts", "*.js"],
    rules: {
        "no-magic-numbers": ["error", { "ignore": [-1, 0, 1, 2], "enforceConst": true }],
        "no-constant-condition": ["error", { "checkLoops": false }],
        "no-empty": ["warn", { "allowEmptyCatch": true }],
        "no-inner-declarations": ["off"],
        "@typescript-eslint/no-floating-promises": "error",
        "no-unexpected-multiline": "error",
        "no-extra-semi": "error",
        "semi-style": "error",
        "block-spacing": "error",
        "comma-spacing": "error",
        "key-spacing": 2,
        "keyword-spacing": "error",
        "semi-spacing": "error",
        "@typescript-eslint/type-annotation-spacing": "error",
        "space-unary-ops": ["error", { "words": true, "nonwords": false }],
        "operator-linebreak": ["error", "before"],
        // we main Java in this house
        "quotes": ["error", "double"],
        "semi": ["error", "always", { "omitLastInOneLineBlock": true }],
        "no-unreachable": "warn",
    }
}
