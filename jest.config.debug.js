module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: ".",
    moduleNameMapper: {
        "@plumier/(.*)": "<rootDir>packages/$1/src",
        "^plumier$": "<rootDir>packages/plumier/src/index.ts",
        'axios': 'axios/dist/node/axios.cjs'
    },
    globals: {
        'ts-jest': {
            tsconfig: '<rootDir>tests/tsconfig.json'
        }
    }
};