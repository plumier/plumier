import "reflect-metadata"

import { createClass, reflection } from "./helpers"
import { getMetadata, setMetadata } from "./metadata"
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
import { GenericMap } from "./walker"


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

export function decorateMethod(callback: ((target: Class, name: string) => any), option?: DecoratorOption): MethodDecorator
export function decorateMethod(data: any, option?: DecoratorOption): MethodDecorator
export function decorateMethod(data: any, option?: DecoratorOption) {
    return (target: any, name: string | symbol) => {
        const targetClass = target.constructor
        const meta = typeof data === "function" ? data(targetClass, name) : data
        setMetadata({ ...meta, [DecoratorOptionId]: { ...meta[DecoratorOptionId], ...option } }, targetClass, name)
    }
}

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

export function decorateClass(callback: ((target: Class) => any), option?: DecoratorOption): ClassDecorator
export function decorateClass(data: any, option?: DecoratorOption): ClassDecorator
export function decorateClass(data: any, option?: DecoratorOption) {
    return (target: any) => {
        const meta = typeof data === "function" ? data(target) : data
        setMetadata({ ...meta, [DecoratorOptionId]: { ...meta[DecoratorOptionId], ...option } }, target)
    }
}

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

export function type(type: TypeOverride | ((x: any) => TypeOverride), ...genericParams: (string | string[])[]) {
    return decorate((target: any) => <TypeDecorator>{ [DecoratorId]: symOverride, kind: "Override", type, genericParams: genericParams, target }, ["Parameter", "Method", "Property"], { inherit: true, allowMultiple: false })
}

export function noop() {
    // type is not inheritable because derived class can define their own type override
    return decorate((target: any) => <NoopDecorator>{ [DecoratorId]: symNoop, kind: "Noop", target }, undefined, { inherit: false, allowMultiple: false })
}

export function parameterProperties() {
    return decorateClass(<ParameterPropertiesDecorator>{ [DecoratorId]: symParamProp, type: "ParameterProperties" }, { allowMultiple: false })
}

export namespace generic {
    const symGenericType = Symbol("genericType")
    const symGenericTemplate = Symbol("genericTemplate")
    export function template(...templates: string[]) {
        return decorateClass(target => <GenericTemplateDecorator>{ [DecoratorId]: symGenericTemplate, kind: "GenericTemplate", templates, target }, { inherit: false, allowMultiple: false })
    }
    export function type(...types: TypeOverride[]) {
        return decorateClass(target => <GenericTypeDecorator>{ [DecoratorId]: symGenericType, kind: "GenericType", types, target }, { inherit: false, allowMultiple: false })
    }
    /**
     * Create generic class dynamically
     * @param parent Super class that the class inherited from
     * @param params List of generic type parameters
     */
    export function create<T extends Class>(parent: T | { parent: T, name: string }, ...params: TypeOverride[]) {
        const opt = (typeof parent === "object") ? parent : { parent: parent, name: "DynamicType" }
        const Type = createClass({ ...opt, genericParams: params })
        return Type
    }

    /**
     * Get generic type from template type
     * @param type type
     * @param template template type 
     */
    export function getGenericType(type: Class, template: string | string[]) {
        const getParents = (typ: Class): Class[] => {
            const parent: Class | undefined = Object.getPrototypeOf(typ)
            // if no more parent then escape
            if (!parent) return []
            const template = getMetadata(parent)
                .find((x: GenericTemplateDecorator): x is GenericTemplateDecorator => x.kind === "GenericTemplate")
            const type = getMetadata(parent)
                .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind === "GenericType")
            // if no template or generic parameter then escape
            if (!template && !type) return []
            return [parent, ...getParents(parent)]
        }
        const types = [type, ...getParents(type)].slice(0, -1)
        const map = new GenericMap(types)
        return map.get(template)
    }
}
