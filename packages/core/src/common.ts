import { existsSync, lstatSync, mkdirSync, readdirSync } from "fs"
import { dirname, extname, join } from "path"
import { reflect, Reflection } from "tinspector"

import { Class } from "./core"

declare global {
    interface String {
        format(...args: any[]): string
    }

    interface Array<T> {
        flatten(): T
    }
}

String.prototype.format = function (this: string, ...args: any[]) {
    return this.replace(/{(\d+)}/g, (m, i) => typeof args[i] != 'undefined' ? args[i] : m)
}

Array.prototype.flatten = function <T>(this: Array<T>) {
    return this.reduce((a, b) => a.concat(b), <T[]>[])
}

export function hasKeyOf<T>(opt: any, key: string): opt is T {
    return key in opt;
}

export function isCustomClass(type: Function | Function[]) {
    switch (Array.isArray(type) ? type[0] : type) {
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


export function resolvePath(path: string): string[] {
    const removeExtension = (x: string) => x.replace(/\.[^/.]+$/, "")
    if (existsSync(`${path}.js`)) return [removeExtension(path)]
    else if (existsSync(`${path}.ts`)) return [removeExtension(path)]
    //resolve provided path directory or file
    else if (lstatSync(path).isDirectory()) {
        const files = readdirSync(path)
            //take only file in extension list
            .filter(x => [".js", ".ts"].some(ext => extname(x) == ext))
            //add root path + file name
            .map(x => removeExtension(x))
            .map(x => join(path, x))
        return Array.from(new Set(files))
    }
    else return [path]
}

export function reflectPath(path: string | Class | Class[]): Reflection[] {
    if (Array.isArray(path))
        return path.map(x => reflect(x))
    else if (typeof path === "string")
        return resolvePath(path)
            .map(x => reflect(x))
            .map(x => x.members)
            .flatten()
    else
        return [reflect(path)]
}


const log = console.log;

export namespace consoleLog {
    export function startMock() {
        console.log = jest.fn(message => { })
    }
    export function clearMock() {
        console.log = log
    }
}

export function getChildValue(object: any, path: string, defaultValue?: any) {
    return path
        .split(/[\.\[\]\'\"]/)
        .filter(p => p)
        .reduce((o, p) => o ? o[p] : defaultValue, object)
}

export function createRoute(...args: string[]): string {
    return "/" + args
        .filter(x => !!x)
        .map(x => x.toLowerCase())
        .map(x => x.startsWith("/") ? x.slice(1) : x)
        .filter(x => !!x)
        .join("/")
}

export function mkdirp(path: string) {
    var dir = dirname(path);
    if (!existsSync(dir)) {
        mkdirp(dir);
    }
    mkdirSync(path);
}

//some object can't simply convertible to string https://github.com/emberjs/ember.js/issues/14922#issuecomment-278986178
export function safeToString(value: any) {
    try {
        return value.toString()
    } catch (e) {
        return "[object Object]"
    }
}