import { lstat, readdir } from "fs"
import { resolve } from "path"
import { useCache } from "tinspector"
import { promisify } from "util"

const readdirAsync = promisify(readdir)
const lstatAsync = promisify(lstat)

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

function toBoolean(val: string) {
    const list: { [key: string]: boolean | undefined } = {
        on: true, true: true, "1": true, yes: true,
        off: false, false: false, "0": false, no: false
    }
    return list[val.toLowerCase()] ?? false
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
        const fn = jest.fn(message => { })
        console.log = fn
        return fn
    }
    export function clearMock() {
        console.log = log
    }
}

// --------------------------------------------------------------------- //
// ---------------------------- FILE SYSTEM ---------------------------- //
// --------------------------------------------------------------------- //

async function findFilesRecursive(directory: string, filter:RegExp): Promise<string[]> {
    const dirs = await readdirAsync(directory, { withFileTypes: true })
    const files = await Promise.all(dirs.map(dir => {
        const res = resolve(directory, dir.name);
        return dir.isDirectory() ? findFilesRecursive(res, filter) : [res];
    }))
    return ([] as string[]).concat(...files)
        .filter(x => !!filter.exec(x))
}

async function findSourceFilesRecursive(path: string): Promise<string[]> {
    const removeExtension = (x: string) => x.replace(/\.[^/.]+$/, "")
    const stat = await lstatAsync(path)
    if (stat.isDirectory()) { 
        const files = (await findFilesRecursive(path, /.+\.(ts|js)$/i))
            .map(x => removeExtension(x))
        return Array.from(new Set(files))
    }
    else return [path]
}

// --------------------------------------------------------------------- //
// ---------------------------- PRINT TABLE ---------------------------- //
// --------------------------------------------------------------------- //

interface ColumnMeta {
    align?: "left" | "right",
    property: string | ((x: any) => string)
}

interface TableOption<T> {
    onPrintRow?: (row: string, data: T) => string
}

function printTable<T>(meta: (ColumnMeta | string | undefined)[], data: T[], option?: TableOption<T>) {
    const getText = (col: ColumnMeta, row: any): string => {
        if (typeof col.property === "string")
            return (row[col.property] ?? "") + ""
        else
            return col.property(row)
    }
    const metaData = meta.filter((x): x is ColumnMeta | string => !!x).map(x => typeof x === "string" ? <ColumnMeta>{ property: x } : x)
        .map(x => {
            const lengths = data.map(row => getText(x, row).length)
            const length = Math.max(...lengths)
            return {
                ...x, margin: x.align || "left", length,
            }
        })
    const opt: Required<TableOption<T>> = { onPrintRow: x => x, ...option }
    for (const [i, row] of data.entries()) {
        // row number
        let text = `${(i + 1).toString().padStart(data.length.toString().length)}. `
        for (const [idx, col] of metaData.entries()) {
            const exceptLast = idx < metaData.length - 1
            const colText = getText(col, row)
            // margin
            if (col.margin === "right")
                text += colText.padStart(col.length)
            else
                if (exceptLast)
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

function cleanupConsole(mocks: string[][]) {
    const cleanup = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
    return mocks.map(x => x.map(y => y.replace(cleanup, "")))
}

export { toBoolean, getChildValue, Class, hasKeyOf, isCustomClass, consoleLog, findSourceFilesRecursive, memoize, printTable, cleanupConsole }

