import Chalk from "chalk"
import { inspect } from "util";

declare global {
    interface String {
        format(...args: any[]): string
    }
}

String.prototype.format = function (this: string, ...args: any[]) {
    return this.replace(/{(\d+)}/g, (m, i) => typeof args[i] != 'undefined' ? args[i] : m)
}

export function hasKeyOf<T>(opt: any, key: string): opt is T {
    return key in opt;
}

export function b(msg: any) {
    if (typeof msg === "object")
        return Chalk.blue(inspect(msg))
    else return Chalk.blue(msg)
}

export function isCustomClass(type: Function) {
    switch (type) {
        case Boolean:
        case String:
        case Array:
        case Number:
        case Object:
        case Date:
            return false
        default:
            return true
    }
}