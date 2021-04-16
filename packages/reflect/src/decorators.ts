import "reflect-metadata"

import { createClass, reflection } from "./helpers"
import { getMetadata, setMetadata } from "./storage"
import {
    Class,
    CustomPropertyDecorator,
    DecoratorId,
    DecoratorOption,
    DecoratorOptionId,
    DecoratorTargetType,
    GenericTemplateDecorator,
    GenericTypeDecorator,
    NativeParameterDecorator,
    NoopDecorator,
    ParameterPropertiesDecorator,
    PrivateDecorator,
    TypeDecorator,
    TypeOverride,
} from "./types"

/**
 * Add metadata information on parameter specified
 */
export function decorateParameter(callback: ((target: Class, name: string, index: number) => any), option?: DecoratorOption): ParameterDecorator
export function decorateParameter(data: any, option?: DecoratorOption): ParameterDecorator
export function decorateParameter(data: any, option?: DecoratorOption): ParameterDecorator {
    return (target: any, name: string | symbol, index: number) => {
        const isCtorParam = reflection.isConstructor(target)
        const targetClass = isCtorParam ? target : target.constructor
        const methodName = isCtorParam ? "constructor" : name
        const meta = typeof data === "function" ? data(targetClass, methodName, index) : data
        setMetadata({ ...meta, [DecoratorOptionId]: { ...meta[DecoratorOptionId], ...option } }, targetClass, methodName, index)
    }
}

/**
 * Add metadata information on method specified
 */
export function decorateMethod(callback: ((target: Class, name: string) => any), option?: DecoratorOption): MethodDecorator
export function decorateMethod(data: any, option?: DecoratorOption): MethodDecorator
export function decorateMethod(data: any, option?: DecoratorOption) {
    return (target: any, name: string | symbol) => {
        const targetClass = target.constructor
        const meta = typeof data === "function" ? data(targetClass, name) : data
        setMetadata({ ...meta, [DecoratorOptionId]: { ...meta[DecoratorOptionId], ...option } }, targetClass, name)
    }
}

/**
 * Add metadata information on property specified
 */
export function decorateProperty(callback: ((target: Class, name: string, index?: any) => any), option?: DecoratorOption): CustomPropertyDecorator
export function decorateProperty(data: any, option?: DecoratorOption): CustomPropertyDecorator
export function decorateProperty(data: any, option?: DecoratorOption) {
    return (target: any, name: string | symbol, index?: any) => {
        if (typeof index === "number")
            decorateParameter(data, option)(target, name, index)
        else
            decorateMethod(data, option)(target, name, index)
    }
}

/**
 * Add metadata information on class specified
 */
export function decorateClass(callback: ((target: Class) => any), option?: DecoratorOption): ClassDecorator
export function decorateClass(data: any, option?: DecoratorOption): ClassDecorator
export function decorateClass(data: any, option?: DecoratorOption) {
    return (target: any) => {
        const meta = typeof data === "function" ? data(target) : data
        setMetadata({ ...meta, [DecoratorOptionId]: { ...meta[DecoratorOptionId], ...option } }, target)
    }
}

/**
 * Add metadata information on specified declaration, can be applied to class, property, method, or parameter
 */
export function decorate(data: any | ((...args: any[]) => any), targetTypes: DecoratorTargetType[] = [], option?: Partial<DecoratorOption>) {
    const throwIfNotOfType = (target: DecoratorTargetType) => {
        if (targetTypes.length > 0 && !targetTypes.some(x => x === target))
            throw new Error(`Reflect Error: Decorator of type ${targetTypes.join(", ")} applied into ${target}`)
    }
    return (...args: any[]) => {
        //class decorator
        if (args.length === 1) {
            throwIfNotOfType("Class")
            return decorateClass(data, option)(args[0])
        }
        //parameter decorator
        if (args.length === 3 && typeof args[2] === "number") {
            throwIfNotOfType("Parameter")
            return decorateParameter(data, option)(args[0], args[1], args[2])
        }
        //property
        if (args[2] === undefined || args[2].get || args[2].set) {
            throwIfNotOfType("Property")
            return decorateProperty(data, option)(args[0], args[1], args[2])
        }
        throwIfNotOfType("Method")
        return decorateMethod(data, option)(args[0], args[1], args[2])
    }
}

/**
 * Compose multiple metadata decorators into single decorator. 
 * 
 * ```
 * function merged() {
 *      return mergeDecorator(decoratorOne(), decoratorTwo(), decoratorThree())
 * }
 * 
 * ＠merged()
 * class TargetClass {
 * }
 * ```
 */
export function mergeDecorator(...fn: (ClassDecorator | PropertyDecorator | CustomPropertyDecorator | ParameterDecorator | MethodDecorator)[]) {
    return (...args: any[]) => {
        fn.forEach(x => (x as Function)(...args))
    }
}

const symIgnore = Symbol("ignore")
const symOverride = Symbol("override")
const symParamProp = Symbol("paramProp")
const symNoop = Symbol("noop")

export function ignore() {
    return decorate(<PrivateDecorator>{ [DecoratorId]: symIgnore, kind: "Ignore" }, ["Parameter", "Method", "Property"], { allowMultiple: false })
}

/**
 * Add metadata information about data type information
 * @param type Data type specified, A class or a callback function returned class for defer evaluation
 * @param genericParams List of generic type arguments
 */
export function type(type: TypeOverride | ((x: any) => TypeOverride), ...genericParams: (string | string[])[]) {
    return decorate((target: any) => <TypeDecorator>{ [DecoratorId]: symOverride, kind: "Override", type, genericParams: genericParams, target }, ["Parameter", "Method", "Property"], { inherit: true, allowMultiple: false })
}

/**
 * No operation decorator, this decorator does nothing except it use to force the TypeScript emit type information
 */
export function noop() {
    // type is not inheritable because derived class can define their own type override
    return decorate((target: any) => <NoopDecorator>{ [DecoratorId]: symNoop, kind: "Noop", target }, undefined, { inherit: false, allowMultiple: false })
}

/**
 * Add metadata information that all parameters of specified class is a parameter properties
 */
export function parameterProperties() {
    return decorateClass(<ParameterPropertiesDecorator>{ [DecoratorId]: symParamProp, type: "ParameterProperties" }, { allowMultiple: false })
}

export namespace generic {
    const symGenericType = Symbol("genericType")
    const symGenericTemplate = Symbol("genericTemplate")

    /**
     * Add metadata information of generic type parameters
     * @param templates list of generic type parameters
     */
    export function template(...templates: string[]) {
        return decorateClass(target => <GenericTemplateDecorator>{ [DecoratorId]: symGenericTemplate, kind: "GenericTemplate", templates, target }, { inherit: false, allowMultiple: false })
    }

    /**
     * Add metadata information of generic type arguments
     * @param types list of generic type arguments
     */
    export function argument(...types: TypeOverride[]) {
        return decorateClass(target => <GenericTypeDecorator>{ [DecoratorId]: symGenericType, kind: "GenericType", types, target }, { inherit: false, allowMultiple: false })
    }

    /**
     * Create generic class dynamically
     * @param parent Super class that the class inherited from
     * @param params List of generic type parameters
     */
    export function create<T extends Class>(parent: T | { extends: T, name: string }, ...params: TypeOverride[]) {
        const opt = (typeof parent === "object") ? parent : { extends: parent, name: "DynamicType" }
        const Type = createClass({}, { ...opt, genericParams: params })
        return Type
    }

    /**
     * Get generic type from decorator type("T")
     * @param decorator type() decorator contains generic type information
     * @param typeTarget The current type where the type will be calculated
     * @returns 
     */
    export function getType(decorator: { type: TypeOverride | ((x: any) => TypeOverride), target: Class }, typeTarget: Class): Class | Class[] | undefined {
        const getParent = (type: Class): Class[] => {
            const parent: Class = Object.getPrototypeOf(type)
            if (type === decorator.target) return []
            return [...getParent(parent), type]
        }
        const getTemplate = (target: Class) => getMetadata(target)
            .find((x: GenericTemplateDecorator): x is GenericTemplateDecorator => x.kind === "GenericTemplate")

        if (typeTarget === decorator.target) return
        if (!(typeTarget.prototype instanceof decorator.target))
            throw new Error(`Unable to get type information because ${typeTarget.name} is not inherited from ${decorator.target.name}`)
        let templateDec = getTemplate(decorator.target)
        if (!templateDec)
            throw new Error(`${decorator.target.name} doesn't define @generic.template() decorator`)
        const [type, isArray] = reflection.getTypeFromDecorator(decorator)
        if (typeof type !== "string")
            throw new Error("Provided decorator is not a generic type")
        /*
         get list of parents, for example 
         A <-- B <-- C <-- D (A is super super)
         const result = getParent(D)
         result = [B, C, D]
        */
        const types = getParent(typeTarget)
        let tmpType = decorator.target
        let result = type
        for (const type of types) {
            // get the index of type in @generic.template() list
            const index = templateDec.templates.indexOf(result)
            const typeDec = getMetadata(type)
                .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind === "GenericType")
            if (typeDec) {
                if (typeDec.types.length !== templateDec.templates.length)
                    throw new Error(`Number of parameters @generic.template() and @generic.type() mismatch between ${tmpType.name} and ${type.name}`)
                // get the actual type in @generic.type() list 
                result = typeDec.types[index] as any
                // check if the result is a "function" (Class) then return immediately
                const finalResult = isArray ? [result] : result
                const singleResult = Array.isArray(result) ? result[0] : result
                if (typeof singleResult === "function") return finalResult as any as (Class | Class[])
            }
            // continue searching other template
            const templates = getTemplate(type)
            if (templates) {
                tmpType = type
                templateDec = templates
            }
        }
    }

    /**
     * Get generic type parameter list by generic type
     * @param type the class
     * @returns List of generic type parameters
     */
    export function getGenericTypeParameters(type: Class): Class[] {
        const genericDecorator = getMetadata(type)
            .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind == "GenericType" && x.target === type)
        if (!genericDecorator) {
            const parent: Class = Object.getPrototypeOf(type)
            if (!parent.prototype) throw new Error(`${type.name} is not a generic type`)
            return getGenericTypeParameters(parent)
        }
        return genericDecorator.types.map(x => x as Class)
    }
}
