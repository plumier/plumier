import { existsSync, lstatSync } from "fs"
import glob from "glob"
import { extname } from "path"
import { useCache } from 'tinspector'

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
    return !!opt[key]
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

function memoize<R, P extends any[]>(fn: (...args: P) => R, getKey: (...args: P) => string): (...args: P) => R {
    const cache: Map<string, R> = new Map()
    return useCache(cache, fn, getKey)
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
// ---------------------------- PRINT TABLE ---------------------------- //
// --------------------------------------------------------------------- //

interface ColumnMeta {
    margin?: "left" | "right",
    property: string | ((x: any) => string)
}

interface TableOption<T> {
    onPrintRow?: (row:string, data:T) => string
}

function printTable<T>(meta: (ColumnMeta | string | undefined)[], data: T[], option?: TableOption<T>) {
    const getText = (col: ColumnMeta, row: any): string => {
        if (typeof col.property === "string")
            return (row[col.property] ?? "" + "")
        else
            return col.property(row)
    }
    const metaData = meta.filter((x): x is ColumnMeta | string => !!x).map(x => typeof x === "string" ? <ColumnMeta>{ property: x } : x)
        .map(x => {
            const lengths = data.map(row => getText(x, row).length)
            const length = Math.max(...lengths)
            return {
                ...x, margin: x.margin || "left", length,
            }
        })
    const opt:Required<TableOption<T>> = { onPrintRow: x => x, ...option}
    for (const [i, row] of data.entries()) {
        let text = `${(i + 1).toString().padStart(data.length.toString().length)}. `
        for (const [idx, col] of metaData.entries()) {
            const exceptLast = idx < metaData.length - 1
            const colText = getText(col, row)
            // margin
            if (col.margin === "right")
                text += colText.padStart(col.length)
            else if (exceptLast)
                text += colText.padEnd(col.length)
            else
                text += colText
            //padding
            if (exceptLast)
                text += " "
        }
        console.log(opt.onPrintRow(text, row))
    }
}

export { getChildValue, Class, hasKeyOf, isCustomClass, consoleLog, findFilesRecursive, memoize, printTable };
