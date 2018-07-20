import Chalk from "chalk";
import { inspect } from "util";
import { lstatSync, readdirSync, existsSync } from 'fs';
import { extname, join, basename } from 'path';
import { reflect } from '@plumjs/reflect';

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
        return Chalk.blue(inspect(msg, false, null))
    else return Chalk.blue(msg)
}

export function isCustomClass(type: Function | Function[]) {
    switch (Array.isArray(type) ? type[0] : type) {
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
    const removeExtension = (x:string) => x.replace(/\.[^/.]+$/, "")
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

export function reflectPath(path: string) {
    return resolvePath(path)
        .map(x => reflect(x))
        .map(x => x.members)
        .reduce((a, b) => a.concat(b), [])
}


