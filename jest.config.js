module.exports = {
    silent: false,
    verbose: false,
    collectCoverage: true,
    collectCoverageFrom: [
        'packages/*/src/**/*.{ts}'
    ],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    },
    rootDir: ".",
    moduleNameMapper: {
        "@plumjs/(.*)": "<rootDir>packages/$1/src"
    }
    ,
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(tsx?)$",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};