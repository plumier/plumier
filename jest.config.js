module.exports = {
    silent:false,
    verbose:false,
    collectCoverage: true,
    collectCoverageFrom: [
        'packages/*/src/**/*.{js}'
    ],
    roots: [
        'packages/',
    ],
};