module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: ".",
    moduleNameMapper: {
        "@plumier/(.*)": "<rootDir>packages/$1/src",
        "^plumier$": "<rootDir>packages/plumier/src/index.ts",
    },
    globals: {
        'ts-jest': {
            tsConfig: '<rootDir>tests/behavior/tsconfig.json'
        }
    }
};