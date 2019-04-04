module.exports = {
    preset: 'ts-jest',
    rootDir: ".",
    moduleNameMapper: {
        "@plumier/(.*)": "<rootDir>packages/$1/src",
        "^plumier$": "<rootDir>packages/plumier/src/index.ts",
    }
};