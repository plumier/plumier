import { existsSync, lstatSync } from "fs"
import glob from "glob"
import { extname } from 'path';

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type Class = new (...args: any[]) => any

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

declare global {
    interface String {
        format(...args: any[]): string
    }

    interface Array<T> {
        flatten(): T
    }
}

String.prototype.format = function (this: string, ...args: any[]) {
    return this.replace(/{(\d+)}/g, (m, i) => args[i])
}

Array.prototype.flatten = function <T>(this: Array<T>) {
    return this.reduce((a, b) => a.concat(b), <T[]>[])
}

function getChildValue(object: any, path: string) {
    return path
        .split(/[\.\[\]\'\"]/)
        .filter(p => p)
        .reduce((o, p) => o[p], object)
}

function hasKeyOf<T>(opt: any, key: string): opt is T {
    return!!opt[key]
}

function isCustomClass(type: Function | Function[]) {
    switch (type && (type as any)[0] || type) {
        case undefined:
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


// --------------------------------------------------------------------- //
// ------------------------------ TESTING ------------------------------ //
// --------------------------------------------------------------------- //

const log = console.log;

namespace consoleLog {
    export function startMock() {
        console.log = jest.fn(message => { })
    }
    export function clearMock() {
        console.log = log
    }
}

// --------------------------------------------------------------------- //
// ---------------------------- FILE SYSTEM ---------------------------- //
// --------------------------------------------------------------------- //

function findFilesRecursive(path: string): string[] {
    const removeExtension = (x: string) => x.replace(/\.[^/.]+$/, "")
    if (existsSync(`${path}.js`)) return [removeExtension(path)]
    else if (existsSync(`${path}.ts`)) return [removeExtension(path)]
    //resolve provided path directory or file
    else if (lstatSync(path).isDirectory()) {
        const files = glob.sync(`${path}/**/*+(.js|.ts)`)
            //take only file in extension list
            .filter(x => [".js", ".ts"].some(ext => extname(x) == ext))
            //add root path + file name
            .map(x => removeExtension(x))
        return Array.from(new Set(files))
    }
    else return [path]
}

// --------------------------------------------------------------------- //
// ------------------------------- CACHE ------------------------------- //
// --------------------------------------------------------------------- // 

export { getChildValue, Class, hasKeyOf, isCustomClass, consoleLog, findFilesRecursive, }