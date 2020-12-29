

/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */

import { Class, ParameterPropertyReflection, ClassReflection, TypeOverride } from "./types"
import * as decorate from "./decorators"

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
}

// --------------------------------------------------------------------- //
// ---------------------------- CREATE CLASS --------------------------- //
// --------------------------------------------------------------------- //

type CustomTypeDefinition = { [key: string]: Class | Class[] }
interface CreateClassOption {
    parent: Class,
    definition: CustomTypeDefinition,
    name: string,
    genericParams: TypeOverride[]
}


function createClass(opt?: Partial<CreateClassOption>): Class {
    const option: CreateClassOption = { parent: Object, name: "DynamicType", definition: {}, genericParams: [], ...opt }
    const type = { [option.name]: class extends option.parent { } }[option.name];
    for (const key in option.definition) {
        Reflect.decorate([decorate.type(option.definition[key])], type.prototype, key)
    }
    Reflect.decorate([decorate.generic.type(...option.genericParams)], type)
    return type
}




export { useCache, reflection, createClass, CustomTypeDefinition, CreateClassOption }
