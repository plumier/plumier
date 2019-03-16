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
    "!packages/core/test/resolve-path/my-module.js",
    "!packages/plumier/test/benchmark/autocannon.d.ts"
];
del.sync(list);