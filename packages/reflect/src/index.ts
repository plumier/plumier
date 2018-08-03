import "reflect-metadata";

import Chalk from "chalk";
import { inspect } from "util";


/* ---------------------------------------------------------------- */
/* --------------------------- TYPES ------------------------------ */
/* ---------------------------------------------------------------- */

type Class = new (...arg: any[]) => any
export interface Decorator { targetType: "Method" | "Class" | "Parameter", target: string, value: any }
export interface ParameterDecorator extends Decorator { targetType: "Parameter", targetIndex: number }
export type Reflection = ParameterReflection | FunctionReflection | ClassReflection | ObjectReflection
export interface ReflectionBase { type: string, name: string }
export interface ParameterReflection extends ReflectionBase { type: "Parameter", decorators: any[], typeAnnotation?: any }
export interface FunctionReflection extends ReflectionBase { type: "Function", parameters: ParameterReflection[], decorators: any[] }
export interface ClassReflection extends ReflectionBase { type: "Class", ctorParameters: ParameterReflection[], methods: FunctionReflection[], decorators: any[], object: Class }
export interface ObjectReflection extends ReflectionBase { type: "Object", members: Reflection[] }
export interface ArrayDecorator { type: "Array", object: Class }
export interface TypeDecorator { type: "Override", object: Class, info?: string }
interface CacheItem {key:string | Class, result: Reflection}

export const DECORATOR_KEY = "plumier.key:DECORATOR"
export const DESIGN_PARAMETER_TYPE = "design:paramtypes"
const CACHE: CacheItem[] = []


/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */

//logic from https://github.com/goatslacker/get-parameter-names
function cleanUp(fn: string) {
    return fn
        //strive comments
        .replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '')
        //strive lambda
        .replace(/=>.*$/mg, '')
        //strive default params
        .replace(/=[^,)]+/mg, '');
}

export function getParameterNames(fn: Function) {
    const code = cleanUp(fn.toString())
    const result = code.slice(code.indexOf('(') + 1, code.indexOf(')'))
        .match(/([^\s,]+)/g);
    return result === null ? [] : result;
}

export function getConstructorParameters(fn: Class) {
    const match = cleanUp(fn.toString())
    const regex = /constructor\s*[^\(]*\(\s*([^\)]*)\)/mg
    const result = regex.exec(match)
    return result ? result[1].split(",").map(x => x.trim()).filter(x => Boolean(x)) : []
}

function isConstructor(value: Function) {
    return ("" + value).indexOf("class") == 0
}

function getType(object: any) {
    if (typeof object === "function") {
        if (isConstructor(object)) return "Class"
        else return "Function"
    }
    else return "Object"
}

export function decorateParameter(data: object | ((target: Class, name: string, index: number) => object)) {
    return (target: any, name: string, index: number) => {
        const isCtorParam = isConstructor(target)
        const targetType = isCtorParam ? target : target.constructor
        const targetName = isCtorParam ? "constructor" : name
        const decorators: Decorator[] = Reflect.getMetadata(DECORATOR_KEY, targetType) || []
        decorators.push(<ParameterDecorator>{
            targetType: "Parameter",
            target: targetName,
            targetIndex: index,
            value: typeof data === "function" ? data(targetType, targetName, index) : data
        })
        Reflect.defineMetadata(DECORATOR_KEY, decorators, targetType)
    }
}

export function decorateMethod(data: object | ((target: Class, name: string) => object)) {
    return (target: any, name: string) => {
        const decorators: Decorator[] = Reflect.getMetadata(DECORATOR_KEY, target.constructor) || []
        decorators.push({
            targetType: "Method",
            target: name,
            value: typeof data === "function" ? data(target.constructor, name) : data
        })
        Reflect.defineMetadata(DECORATOR_KEY, decorators, target.constructor)
    }
}

export function decorateClass(data: object | ((target: Class) => object)) {
    return (target: any) => {
        const decorators: Decorator[] = Reflect.getMetadata(DECORATOR_KEY, target) || []
        decorators.push({
            targetType: "Class",
            target: target.prototype.constructor.name,
            value: typeof data === "function" ? data(target) : data
        })
        Reflect.defineMetadata(DECORATOR_KEY, decorators, target)
    }
}

export function getDecorators(target: any): Decorator[] {
    return Reflect.getMetadata(DECORATOR_KEY, target) || []
}

export function array(type: Class) {
    return decorateParameter(<ArrayDecorator>{ type: "Array", object: type })
}

/**
 * Add manual type definition to a parameter property. Useful on non array type that translated into Object 
 * on design type information such as Partial<Type> or ReadOnly<Type>
 * @param type The type overridden
 * @param info Additional information about type (readonly, partial etc)
 */
export function type(type: Class, info?: string) {
    return decorateParameter(<TypeDecorator>{ type: "Override", object: type, info })
}

/* ---------------------------------------------------------------- */
/* ------------------------- CACHE FUNCTIONS ----------------------- */
/* ---------------------------------------------------------------- */

function getCache(key:string | Class){
    return CACHE.find(x => x.key === key)
}

function setCache(key:string | Class, result:Reflection){
    CACHE.push({key, result})
    return result
}


/* ---------------------------------------------------------------- */
/* ------------------------- MAIN FUNCTIONS ----------------------- */
/* ---------------------------------------------------------------- */

function decorateReflection(decs: Decorator[], reflection: ClassReflection) {
    const toParameter = (method: string, index: number, par: ParameterReflection) => {
        const decorators = (<ParameterDecorator[]>decs)
            .filter((x) => x.targetType == "Parameter" && x.target == method && x.targetIndex == index)
            .map(x => ({ ...x.value }))
        const array = decorators.find((x: ArrayDecorator): x is ArrayDecorator => x.type === "Array")
        const override = decorators.find((x: TypeDecorator): x is TypeDecorator => x.type === "Override")
        return {
            ...par, decorators, typeAnnotation: override ? override.object : array ? [array.object] : par.typeAnnotation
        }
    }
    const toFunction = (fn: FunctionReflection) => ({
        ...fn,
        decorators: decs.filter(x => x.targetType == "Method" && x.target == fn.name).map(x => ({ ...x.value })),
        parameters: fn.parameters.map((x, i) => toParameter(fn.name, i, x))
    })
    return <ClassReflection>{
        ...reflection,
        decorators: decs.filter(x => x.targetType == "Class" && x.target == reflection.name).map(x => ({ ...x.value })),
        methods: reflection.methods.map(x => toFunction(x)),
        ctorParameters: reflection.ctorParameters.map((x, i) => toParameter("constructor", i, x))
    }
}

function reflectParameter(name: string, typeAnnotation?: any): ParameterReflection {
    return { type: "Parameter", name, decorators: [], typeAnnotation }
}

function reflectFunction(fn: Function): FunctionReflection {
    const parameters = getParameterNames(fn).map(x => reflectParameter(x))
    return { type: "Function", name: fn.name, parameters, decorators: [] }
}

function reflectMethod(clazz: Class, method: Function): FunctionReflection {
    const parType: any[] = Reflect.getMetadata(DESIGN_PARAMETER_TYPE, clazz.prototype, method.name) || []
    const parameters = getParameterNames(method).map((x, i) => reflectParameter(x, parType[i]))
    return { type: "Function", name: method.name, parameters, decorators: [] }
}

function reflectConstructorParameters(fn: Class) {
    const parTypes: any[] = Reflect.getMetadata(DESIGN_PARAMETER_TYPE, fn) || []
    const params = getConstructorParameters(fn)
    return params.map((x, i) => reflectParameter(x, parTypes[i]))
}

function reflectClass(fn: Class): ClassReflection {
    const methods = Object.getOwnPropertyNames(fn.prototype)
        .filter(x => x != "constructor")
        .filter(x => !x.startsWith("__"))
        .map(x => reflectMethod(fn, fn.prototype[x]))
    const ctorParameters = reflectConstructorParameters(fn)
    const decorators = getDecorators(fn)
    const reflct: ClassReflection = {
        type: "Class",
        ctorParameters,
        name: fn.name, methods,
        decorators: [],
        object: fn
    }
    return decorateReflection(decorators, reflct)
}

function reflectObject(object: any, name: string = "module"): ObjectReflection {
    return {
        type: "Object", name,
        members: Object.keys(object).map(x => traverse(object[x], x))
    }
}

function traverse(fn: any, name: string): Reflection {
    switch (getType(fn)) {
        case "Function":
            return reflectFunction(fn)
        case "Class":
            return reflectClass(fn)
        default:
            return reflectObject(fn, name)
    }
}

export function reflect(path: string): ObjectReflection
export function reflect(classType: Class): ClassReflection
export function reflect(option: string | Class) {
    const cache = getCache(option)
    if(!!cache) return cache.result
    if (typeof option === "string") {
        return setCache(option, reflectObject(require(option)))
    }
    else {
        return setCache(option, reflectClass(option))
    }
}