/**
 * This module will serialize function as [typeof: <Function Name>] instead of [Function]
 */
module.exports = {
    test(val) {
        return typeof val === "function";
    },
    print(val) {
        return val.name;
    },
}