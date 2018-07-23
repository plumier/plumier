module.exports = {
    silent: false,
    verbose: true,
    collectCoverage: true,
    collectCoverageFrom: [
        "packages/*/src/**/*.{js}"
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
};