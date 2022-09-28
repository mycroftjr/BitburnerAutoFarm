module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es6: false,
    },
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
    ignorePatterns: ["*.d.ts", "*.js"],
    plugins: [
        "@typescript-eslint",
        "eslint-comments",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking"
    ],
    rules: {
        "no-magic-numbers": ["error", { "ignore": [-1, 0, 1, 2], "enforceConst": true, "ignoreDefaultValues": true, "detectObjects": false }],
        "no-constant-condition": ["error", { "checkLoops": false }],
        "no-empty": ["warn", { "allowEmptyCatch": true }],
        "no-inner-declarations": "off",
        "no-unexpected-multiline": "error",
        "no-extra-semi": "error",
        "semi-style": "error",
        "block-spacing": "error",
        "comma-spacing": "error",
        "key-spacing": 2,
        "keyword-spacing": "error",
        "semi-spacing": "error",
        "space-unary-ops": ["error", { "words": true, "nonwords": false }],
        "operator-linebreak": ["error", "before"],
        // @typescript-eslint
        "@typescript-eslint/array-type": "error",
        "@typescript-eslint/consistent-generic-constructors": "error",
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-base-to-string": "warn",
        "@typescript-eslint/no-confusing-non-null-assertion": "warn",
        "@typescript-eslint/no-confusing-void-expression": ["error", { "ignoreVoidOperator": true }],
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-invalid-void-type": "error",
        "@typescript-eslint/no-redundant-type-constituents": "error",
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": ["warn", {"allow": ["tmp"]}],
        "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
        "@typescript-eslint/no-unnecessary-condition": ["warn", { "allowConstantLoopConditions": true }],
        "@typescript-eslint/no-unnecessary-qualifier": "warn",
        "@typescript-eslint/no-unnecessary-type-arguments": "error",
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": ["error", { "functions": false }],
        "@typescript-eslint/no-useless-empty-export": "warn",
        "@typescript-eslint/non-nullable-type-assertion-style": "error",
        "@typescript-eslint/prefer-for-of": "warn",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/prefer-includes": "error",
        "@typescript-eslint/prefer-nullish-coalescing": "error",
        "@typescript-eslint/prefer-optional-chain": "error",
        "@typescript-eslint/prefer-readonly": "warn",
        "@typescript-eslint/prefer-readonly-parameter-types": ["warn", {
            "checkParameterProperties": false,
            "ignoreInferredTypes": true,
            "treatMethodsAsReadonly": true
        }],
        "@typescript-eslint/prefer-reduce-type-parameter": "error",
        "@typescript-eslint/prefer-string-starts-ends-with": "error",
        "@typescript-eslint/prefer-ts-expect-error": "error",
        "@typescript-eslint/promise-function-async": "error",
        "require-await": "off",
        "@typescript-eslint/require-await": "error",
        "@typescript-eslint/restrict-template-expressions": "off",
        "no-return-await": "off",
        "@typescript-eslint/return-await": "warn",
        "@typescript-eslint/sort-type-union-intersection-members": "error",
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "@typescript-eslint/type-annotation-spacing": "error",
        // eslint-comments
        "eslint-comments/disable-enable-pair": "error",
        "eslint-comments/no-aggregating-enable": "error",
        "eslint-comments/no-duplicate-disable": "error",
        "eslint-comments/no-unlimited-disable": "error",
        "eslint-comments/no-unused-disable": "warn",
        "eslint-comments/no-unused-enable": "warn",
        // we main Java in this house
        "quotes": ["error", "double"],
        "semi": ["error", "always", { "omitLastInOneLineBlock": true }],
        "no-unreachable": "warn",
    }
}
