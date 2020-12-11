import { lstat, exists } from "fs"
import glob from "glob"
import reflect, { useCache } from "@plumier/reflect"
import { promisify } from "util"

import { EntityIdDecorator } from "./decorator/entity"


const lstatAsync = promisify(lstat)
const existsAsync = promisify(exists)

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type Class<T = any> = new (...args: any[]) => T

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

function ellipsis(str: string, length: number) {
    if (str.length > length) {
        const leftPart = str.substring(0, length - 9)
        const rightPart = str.substring(str.length - 6)
        return `${leftPart}...${rightPart}`
    }
    else return str
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

function cleanupConsole(mocks: string[][]) {
    const cleanup = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
    const millisecond = /\d*ms/g
    return mocks.map(x => x.map(y => y.replace(cleanup, "").replace(millisecond, "123ms")))
}

// --------------------------------------------------------------------- //
// ---------------------------- FILE SYSTEM ---------------------------- //
// --------------------------------------------------------------------- //

function removeExtension(x: string) {
    return x.replace(/\.[^/.]+$/, "")
}

function globAsync(path: string, opts?: glob.IOptions) {
    return new Promise<string[]>((resolve) => {
        glob(path, { ...opts }, (e, match) => resolve(match))
    })
}

async function traverseDirectory(path: string) {
    const dirs = await globAsync(path, { nodir: true })
    const files = dirs.map(x => removeExtension(x))
    return Array.from(new Set(files))
}

async function findFilesRecursive(path: string): Promise<string[]> {
    // if file / directory provided
    if (await existsAsync(path)) {
        if ((await lstatAsync(path)).isDirectory()) {
            return traverseDirectory(`${path}/**/*.{ts,js}`)
        }
        else
            return [removeExtension(path)]
    }
    // else check if glob provided
    return traverseDirectory(path)
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


// --------------------------------------------------------------------- //
// ----------------------------- REFLECTION ---------------------------- //
// --------------------------------------------------------------------- //

interface TraverseContext<T> {
    path: string[],
    parentPath: Class[]
}

interface AnalysisMessage {
    issue: "NoProperties" | "TypeMissing" | "ArrayTypeMissing"
    location: string
}

function analyzeModel<T>(type: Class | Class[], ctx: TraverseContext<T> = { path: [], parentPath: [] }): AnalysisMessage[] {
    const parentType = ctx.parentPath[ctx.parentPath.length - 1]
    const propName = ctx.path[ctx.path.length - 1]
    const location = `${parentType?.name}.${propName}`
    if (Array.isArray(type)) {
        if (type[0] === Object) return [{ location, issue: "ArrayTypeMissing" }]
        return analyzeModel(type[0], ctx)
    }
    if (isCustomClass(type)) {
        // CIRCULAR: check if type already in path, skip immediately
        if (ctx.parentPath.some(x => x === type)) return []
        const meta = reflect(type)
        if (meta.properties.length === 0) return [{ location: type.name, issue: "NoProperties" }]
        const result = []
        for (const prop of meta.properties) {
            const path = ctx.path.concat(prop.name)
            const typePath = ctx.parentPath.concat(type)
            const msgs = analyzeModel(prop.type, { ...ctx, path, parentPath: typePath })
            result.push(...msgs)
        }
        return result
    }
    if (type === Object) return [{ location, issue: "TypeMissing" }]
    return []
}


namespace entityHelper {
    export function getIdProp(entity: Class) {
        const meta = reflect(entity)
        for (const prop of meta.properties) {
            const decorator = prop.decorators.find((x: EntityIdDecorator) => x.kind === "plumier-meta:entity-id")
            if (decorator) return prop
        }
    }
    export function getIdType(entity: Class): Class | undefined {
        const prop = getIdProp(entity)
        return prop?.type 
    }
}


export {
    ellipsis, toBoolean, getChildValue, Class, hasKeyOf, isCustomClass, consoleLog, entityHelper,
    findFilesRecursive, memoize, printTable, cleanupConsole, analyzeModel, AnalysisMessage, globAsync
}

