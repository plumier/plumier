import { ignore, noop, parameterProperties, type } from "./decorators"
import { createClass, reflection, useCache } from "./helpers"
import * as v from "./analyzer"
import { parseFunction } from "./parser"
import { Class, ClassReflection, ObjectReflection, Reflection } from "./types"
import { walkReflectionMembers, walkTypeMembersRecursive } from "./walker"

interface TraverseContext {
    path: any[]
}

type Visitor<Ref, Ctx, Ret> = (r: Ref, c: Ctx) => Ret

function pipe<Ref, Ctx, Ret>(visitors: Visitor<Ref, Ctx, Ret>[]): Visitor<Ref, Ctx, Ret> {
    return (value, ctx) => visitors.reduce((a, b) => !!a ? b(a, ctx) : a, value as any)
}

function reflectClass(target: Class): ClassReflection {
    // walk into member inheritance
    const ref = walkTypeMembersRecursive(target, {
        target, memberVisitor: pipe([
            // add typescript design types information
            v.addsDesignTypes,
            // add metadata decorators
            v.addsDecorators,
            // add parameter properties
            v.addsParameterProperties,
            // remove @ignore decorator
            v.removeIgnored,
        ]),
        classPath: []
    })
    // walk through flatten member
    return walkReflectionMembers(ref, {
        classPath: [], target, parent: ref, memberVisitor: pipe([
            v.addsApplyToDecorator,
            // add dynamic type defined with @type() decorator
            v.addsTypeByTypeDecorator,
            // add typeClassification information
            v.addsTypeClassification,
        ])
    })
}

function traverseObject(fn: any, name: string, ctx: TraverseContext): Reflection | undefined {
    if (fn === undefined || fn === null) return
    if (Array.isArray(fn)) return
    if (typeof fn === "object") {
        // CIRCULAR: return immediately
        if (ctx.path.some(x => x === fn)) return
        return reflectObject(fn, name, { path: ctx.path.concat(fn) })
    }
    if (typeof fn === "function" && reflection.isConstructor(fn))
        return reflectClass(fn)
    if (typeof fn === "function")
        return parseFunction(fn)
}

function reflectObject(object: any, name: string, ctx: TraverseContext): ObjectReflection {
    return {
        kind: "Object", name,
        members: Object.keys(object).map(x => traverseObject(object[x], x, ctx)).filter((x): x is Reflection => !!x)
    }
}

function reflectModuleOrClass(opt: string | Class | Function) {
    if (typeof opt === "string") {
        return reflectObject(require(opt), "module", { path: [] })
    }
    if (typeof opt === "function" && reflection.isConstructor(opt))
        return reflectClass(opt)
    if (typeof opt === "function")
        return parseFunction(opt)
}


// --------------------------------------------------------------------- //
// ------------------------------- CACHE ------------------------------- //
// --------------------------------------------------------------------- //

interface ReflectOption {
    /**
     * Flush cached current module/class metadata before processing. 
     */
    flushCache?: true
}

const cacheStore = new Map<string | Class | Function, ClassReflection | ObjectReflection>()
const reflectCached = useCache(cacheStore, reflectModuleOrClass, x => x)

/**
 * Reflect module
 * @param path module name
 */
function reflect(path: string, opt?: Partial<ReflectOption>): ObjectReflection

/**
 * Reflect class
 * @param classType Class 
 */
function reflect(classType: Class | Function, opt?: Partial<ReflectOption>): ClassReflection

function reflect(pathOrClass: string | Class | Function, opt?: Partial<ReflectOption>): ClassReflection | ObjectReflection {
    if (opt?.flushCache)
        cacheStore.delete(pathOrClass)
    return reflectCached(pathOrClass)
}

function flush(pathOrClass?: string | Class) {
    if (pathOrClass)
        cacheStore.delete(pathOrClass)
    else
        cacheStore.clear()
}

// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

/**
 * Decorator that do nothing, intended to be able to inspect data type
 */
reflect.noop = noop

/**
 * Ignore member from metadata generated
 */
reflect.ignore = ignore

/**
 * Override type definition information. Useful to add type definition for some data type that is erased 
 * after transfile such as Partial<Type> or ReadOnly<Type>
 * 
 * If applied to parameter it will override the parameter type
 * 
 * If applied to property it will override the property type
 * 
 * if applied to method it will overrid the method return value
 * @param type The type overridden
 * @param info Additional information about type (readonly, partial etc)
 */
reflect.type = type

/**
 * Create class dynamically
 */
reflect.create = createClass

/**
 * Mark all constructor parameters as properties
 */
reflect.parameterProperties = parameterProperties

/**
 * Flush metadata cache, call without parameter to clear all
 */
reflect.flush = flush

export { reflect }
