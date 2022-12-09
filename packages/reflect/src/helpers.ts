

/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */

import { Class, ParameterPropertyReflection, ClassReflection, TypeOverride, GenericTypeParameterDecorator, GenericTypeArgumentDecorator, TypeDecorator } from "./types"
import * as decorate from "./decorators"
import { getMetadata } from "./storage"

const IsDynamicType = Symbol()

function useCache<K, P extends any[], R>(cache: Map<K, R>, fn: (...args: P) => R, getKey: (...args: P) => K) {
    return (...args: P) => {
        const key = getKey(...args)
        const result = cache.get(key)
        if (!!result) return result
        else {
            const newResult = fn(...args)
            cache.set(key, newResult)
            return newResult
        }
    }
}


namespace reflection {
    export function isParameterProperties(meta: any): meta is ParameterPropertyReflection {
        return meta && meta.kind === "Property" && (meta as ParameterPropertyReflection).isParameter
    }

    export function isCallback(type: any): type is ((x: any) => TypeOverride) {
        return typeof type === "function" && !type.prototype
    }

    export function isConstructor(value: any) {
        return ("" + value).indexOf("class") == 0
    }

    export function isCustomClass(type: Function | Function[]) {
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

    export function getMethods(meta: ClassReflection) {
        return meta.methods.map(x => ({
            name: x.name,
            type: x.returnType,
            pars: x.parameters
                .map(p => ({ name: p.name, type: p.type }))
        }))
    }

    export function getProperties(meta: ClassReflection) {
        return meta.properties.map(x => ({
            name: x.name,
            type: x.type
        }))
    }

    export function getTypeFromDecorator(decorator: { type: TypeOverride | ((x: any) => TypeOverride) }): [string | Class | CustomTypeDefinition, boolean] {
        const type = reflection.isCallback(decorator.type) ? decorator.type({}) : decorator.type
        return [Array.isArray(type) ? type[0] : type, Array.isArray(type)]
    }
}

// --------------------------------------------------------------------- //
// ---------------------------- CREATE CLASS --------------------------- //
// --------------------------------------------------------------------- //

type CustomTypeDefinition = { [key: string]: Class | Class[] | {} | {}[] }
interface CreateClassOption {
    extends: Class,
    name: string,
    genericParams: TypeOverride[]
}


function createClass(definition: CustomTypeDefinition, opt?: Partial<CreateClassOption>): Class {
    class Base { }
    const {extends:BaseClass, ...option} = { name: "DynamicType", genericParams: [], ...opt }
    const obj = !!BaseClass ? { [option.name]: class extends BaseClass { } } : { [option.name]: class { } }
    const type = obj[option.name];
    (type as any)[IsDynamicType] = true
    for (const key in definition) {
        Reflect.decorate([decorate.type(definition[key])], type.prototype, key)
    }
    if (option.genericParams.length > 0)
        Reflect.decorate([decorate.generic.argument(...option.genericParams)], type)
    return type
}

export { useCache, reflection, createClass, CustomTypeDefinition, CreateClassOption, IsDynamicType }
