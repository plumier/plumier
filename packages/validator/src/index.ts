import { Opt, val } from "./decorators"
import { VisitorExtension, VisitorInvocation } from "./invocation"
import { getAst } from "./transformer"
import { Class } from "./types"
import {
    partial,
    PartialValidator,
    Validator,
    validatorVisitor,
    ValidatorDecorator,
    RequiredValidator,
    createValidation
} from "./validation"
import { pipeline, Result, ResultMessages } from "./visitor"
import {defaultConverters} from "./converter"



interface Option<T = any> {
    /**
     * Expected type
     */
    type: T,

    /**
     * List of visitor extension to extend TypedConverter internal process
     */
    visitors?: VisitorExtension[]

    /**
     * Top decorators of the type
     */
    decorators?: any[],

    /**
     * Root path
     */
    path?: string,

    /**
     * Guess single value as array element if expected type is array. Default false
     */
    guessArrayElement?: boolean
}

/**
 * Convert value into type specified on configuration.
 * @param value 
 * @param opt 
 */
function convert<T = any>(value: any, option: Option<T> | T): T extends Class<infer R>[] ? Result<R[]> : T extends Class<infer R> ? Result<R> : Result<any> {
    const opt = "type" in option ? option : { type: option }
    return pipeline(value, getAst(opt.type as any), {
        path: opt.path || "", extension: opt.visitors || [],
        decorators: opt.decorators || [],
        guessArrayElement: opt.guessArrayElement || false
    }) as any
}

/**
 * Create type converter with specific configuration
 * @param option 
 */
export default function createConverter<T = any>(option: Option<T> | T) {
    return (value: any) => convert<T>(value, option)
}

function createValidator<T>(option: T | Option<T>) {
    return (value: any) => validate<T>(value, option)
}

function validate<T>(value: any, option: Option<T> | T) {
    const opt = "type" in option ? option : { type: option }
    const visitors = [validatorVisitor]
    for (const visitor of (opt.visitors || [])) {
        visitors.push(visitor)
    }
    return convert(value, {
        decorators: opt.decorators, guessArrayElement: opt.guessArrayElement,
        path: opt.path, type: opt.type, visitors
    })
}

export {
    convert, Option, VisitorExtension,
    VisitorInvocation, Result, ResultMessages,
    partial, validatorVisitor, Validator, getAst,
    PartialValidator, val, Opt, validate, createValidator, ValidatorDecorator,
    RequiredValidator, defaultConverters, createValidation
}