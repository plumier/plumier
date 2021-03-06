import reflect, { mergeDecorator } from "@plumier/reflect"

import { safeToString } from "./converter"
import { pipe, VisitorExtension, VisitorInvocation, VisitorInvocationImpl } from "./invocation"
import { ArrayNode, ObjectNode, PrimitiveNode, SuperNode } from "./transformer"
import { Class } from './types';

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface ResultMessages {
    path: string,
    messages: string[]
}

interface Result<T = any> {
    value: T,
    issues?: ResultMessages[]
}

interface ParentInfo {
    value: any,
    type: Class
    decorators: any[]
}

interface VisitorOption {
    path: string
    extension: VisitorExtension[]
    decorators: any[],
    guessArrayElement: boolean,
    parent?: ParentInfo
}

namespace Result {
    export function create(value: any): Result {
        return { value }
    }
    export function error(value: any, path: string, message: string | string[]): Result {
        return { value, issues: [{ path, messages: Array.isArray(message) ? message : [message] }] }
    }
}


// --------------------------------------------------------------------- //
// ------------------------------ HELPER ------------------------------- //
// --------------------------------------------------------------------- //

function getPath(path: string, name: string) {
    return path.length === 0 ? name : `${path}.${name}`
}

const visitorMap = {
    "Primitive": primitiveVisitor,
    "Array": arrayVisitor,
    "Object": objectVisitor,
}

function unableToConvert(value: {}, type: string) {
    return `Unable to convert "${safeToString(value)}" into ${type}`
}

// --------------------------------------------------------------------- //
// ------------------------------ VISITORS ----------------------------- //
// --------------------------------------------------------------------- //

function primitiveVisitor(value: {}, ast: PrimitiveNode, opt: VisitorOption): Result {
    const result = ast.converter(value)
    if (result === undefined)
        return Result.error(value, opt.path, unableToConvert(value, ast.type.name))
    else
        return Result.create(result)
}

function arrayVisitor(value: {}[], ast: ArrayNode, opt: VisitorOption): Result {
    const newValues = opt.guessArrayElement && !Array.isArray(value) ? [value] : value
    if (!Array.isArray(newValues)) return Result.error(value, opt.path, unableToConvert(value, `Array<${ast.type.name}>`))
    const result: any[] = []
    const errors: ResultMessages[] = []
    for (let i = 0; i < newValues.length; i++) {
        const val = newValues[i];
        const option = {
            path: getPath(opt.path, i.toString()), extension: opt.extension,
            decorators: opt.decorators, parent: opt.parent,
            guessArrayElement: opt.guessArrayElement
        }
        const elValue = pipeline(val, ast.element as SuperNode, option)
        result.push(elValue.value)
        if (elValue.issues)
            errors.push(...elValue.issues)
    }
    return { value: result, issues: errors.length === 0 ? undefined : errors }
}

function objectVisitor(value: any, ast: ObjectNode, opt: VisitorOption): Result {
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean")
        return Result.error(value, opt.path, unableToConvert(value, ast.type.name))
    const instance = Object.create(ast.type.prototype)
    const meta = reflect(ast.type)
    const errors: ResultMessages[] = []
    const props = Object.keys(value).reduce((prev, x) => ({ ...prev, [x]: true }), {} as any)
    for (const property of meta.properties) {
        const node = ast.properties.get(property.name) as SuperNode
        // if the property is not provided, then skip
        const option = {
            path: getPath(opt.path, property.name), extension: opt.extension,
            decorators: property.decorators, parent: { value, type: ast.type, decorators: opt.decorators },
            guessArrayElement: opt.guessArrayElement
        }
        const propValue = pipeline(value[property.name], node, option)
        if (propValue.issues)
            errors.push(...propValue.issues)
        if (!props[property.name]) continue
        instance[property.name] = propValue.value
    }
    return { value: instance, issues: errors.length === 0 ? undefined : errors }
}

function visitor(value: any, ast: SuperNode, opt: VisitorOption): Result {
    if (value === undefined || value === null)
        return { value }
    if (value.constructor === ast.type || ast.type === Object)
        return { value: ast.kind === "Array" && opt.guessArrayElement && !Array.isArray(value) ? [value] : value }
    return visitorMap[ast.kind](value, ast as any, opt)
}

function pipeline(value: any, ast: SuperNode, opt: VisitorOption): Result {
    const mainVis = (i: VisitorInvocation) => visitor(i.value, i.ast, opt)
    const last = new VisitorInvocationImpl(mainVis, {
        decorators: opt.decorators, path: opt.path,
        ast: ast, value, parent: opt.parent
    });
    const visitors = pipe(opt.extension, last)
    return visitors.proceed()
}

export { pipeline, ResultMessages, Result, ParentInfo }