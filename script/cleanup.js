const del = require("del");
const list = [
    "packages/*/lib",
    "packages/*/src/**/*.js",
    "packages/*/src/**/*.js.map",
    "packages/*/src/**/*.d.ts",
    "packages/*/src/**/*.d.ts.map",

    "packages/*/test/**/*.js",
    "packages/*/test/**/*.js.map",
    "packages/*/test/**/*.d.ts",
    "packages/*/test/**/*.d.ts.map",

    "tests/**/*.js",
    "tests/**/*.js.map",
    "tests/**/*.d.ts",
    "tests/**/*.d.ts.map",

    "!tests/manual/benchmark/autocannon.d.ts",
    "!tests/manual/social-login-test/www/script.js"
];
del.sync(list);