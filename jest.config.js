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
    //rootDir: "packages/",
    // roots: [
    //     'packages/',
    // ],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(tsx?)$",
    testPathIgnorePatterns: ["/lib/", "/node_modules/"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    // moduleNameMapper: {
    //     "tinspector": "<rootDir>/packages/tinspector/src",
    //     "tinspector/test/*": "<rootDir>/packages/tinspector/test",
    // }
};