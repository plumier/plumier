module.exports = {
    silent: false,
    verbose: false,
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
        "@plumier/(.*)": "<rootDir>packages/$1/src",
        "^plumier$": "<rootDir>packages/plumier/src/index.ts",
    }
};