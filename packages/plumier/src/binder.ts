import {
    BindingDecorator,
    Class,
    ConversionError,
    ConverterFunction,
    Converters,
    DefaultConverter,
    errorMessage,
    isCustomClass,
    safeToString,
    TypeConverter,
} from "@plumjs/core"
import { Context } from "koa"
import { MethodReflection, ParameterReflection, reflect } from "tinspector"

function createConversionError(value: any, typ: Function, path: string[]) {
    const type = (typ as Class).name
    return new ConversionError({ path: path, messages: [errorMessage.UnableToConvertValue.format(value, type)] })
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- CONVERTER ------------------------------------- */
/* ------------------------------------------------------------------------------- */

export function booleanConverter(rawValue: {}, path: string[]) {
    const value: string = safeToString(rawValue)
    const list: { [key: string]: boolean | undefined } = {
        on: true, true: true, "1": true, yes: true,
        off: false, false: false, "0": false, no: false
    }
    const result = list[value.toLowerCase()]
    if (result === undefined) throw createConversionError(value, Boolean, path)
    return result
}

export function numberConverter(rawValue: {}, path: string[]) {
    const value = safeToString(rawValue)
    const result = Number(value)
    if (isNaN(result) || value === "") throw createConversionError(value, Number, path)
    return result
}

export function dateConverter(rawValue: {}, path: string[]) {
    const value = safeToString(rawValue)
    const result = new Date(value)
    if (isNaN(result.getTime()) || value === "") throw createConversionError(value, Date, path)
    return result
}

export function modelConverter(value: {}, path: string[], expectedType: Function | Function[], converters: Converters): any {
    //--- helper functions
    const isConvertibleToObject = (value: any) =>
        typeof value !== "boolean"
        && typeof value !== "number"
        && typeof value !== "string"
    //---
    if (Array.isArray(expectedType)) throw createConversionError(value, expectedType[0], path)
    const TheType = expectedType as Class
    
    //get reflection metadata of the class
    const reflection = reflect(TheType)
    //check if the value is possible to convert to model
    if (!isConvertibleToObject(value)) throw createConversionError(value, TheType, path)

    //sanitize excess property to prevent object having properties that doesn't match with declaration
    //traverse through the object properties and convert to appropriate property's type
    let result: any;
    try {
        result = new TheType()
    }
    catch (e) {
        const message = errorMessage.UnableToInstantiateModel.format(TheType.name)
        if (e instanceof Error) {
            e.message = message + "\n" + e.message
            throw e
        }
        else throw new Error(message)
    }
    for (let x of reflection.properties) {
        const val = convert((value as any)[x.name], path.concat(x.name), x.type, converters)
        if (val === undefined) {
            delete result[x.name]
        }
        else {
            result[x.name] = val
        }
    }
    return result;
}

export function arrayConverter(value: {}[], path: string[], expectedType: Function | Function[], converters: Converters): any {
    //allow single value as array for url encoded
    if (!Array.isArray(value)) value = [value]
    if (!Array.isArray(expectedType)) throw createConversionError(value, expectedType, path)
    return value.map((x, i) => convert(x, path.concat(i.toString()), expectedType[0], converters))
}

export function convert(value: any, path: string[], expectedType: Function | Function[] | undefined, conf: Converters) {
    if (value === null || value === undefined) return undefined
    if (!expectedType) return value
    if (value.constructor === expectedType) return value;
    //check if the parameter contains @array()
    if (Array.isArray(expectedType))
        return arrayConverter(value, path, expectedType, conf)
    //check if parameter is native value that has default converter (Number, Date, Boolean) or if user provided converter
    else if (conf.converters.has(expectedType))
        return conf.converters.get(expectedType)!(value, path, expectedType, conf)
    //if type of model and has no  converter, use DefaultObject converter
    else if (isCustomClass(expectedType))
        return modelConverter(value, path, expectedType as Class, conf)
    //no converter, return the value
    else
        return value
}

export function flattenConverters(converters: TypeConverter[]) {
    return converters.reduce((a, b) => { a.set(b.type, b.converter); return a }, new Map<Function, ConverterFunction>())
}

export const TypeConverters: TypeConverter[] = [
    { type: Number, converter: numberConverter },
    { type: Date, converter: dateConverter },
    { type: Boolean, converter: booleanConverter }
]

export const DefaultConverters: { [key in DefaultConverter]: ConverterFunction } = {
    "Boolean": booleanConverter,
    "Number": numberConverter,
    "Date": dateConverter,
    "Object": modelConverter,
    "Array": arrayConverter
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------- BINDER FUNCTIONS -------------------------------- */
/* ------------------------------------------------------------------------------- */

type Binder = (ctx: Context, par: ParameterReflection) => any
class Next { }

function getProperty(obj: any, key: string) {
    const realKey = Object.keys(obj).find(x => x.toLowerCase() === key.toLowerCase())
    return realKey && obj[realKey]
}

function bindBody(ctx: Context, par: ParameterReflection): any {
    return isCustomClass(par.type) || Array.isArray(par.type) ? ctx.request.body : undefined
}

function bindDecorator(ctx: Context, par: ParameterReflection): any {
    const decorator: BindingDecorator = par.decorators.find((x: BindingDecorator) => x.type == "ParameterBinding")
    if (!decorator) return new Next()
    return decorator.process(ctx)
}

function bindByName(ctx: Context, par: ParameterReflection): any {
    const { body, query } = ctx.request;
    const keys = Object.keys(query || {}).concat(Object.keys(body || {})).map(x => x.toLowerCase())
    if (keys.some(x => x === par.name.toLowerCase())) {
        return getProperty(query, par.name) || getProperty(body, par.name)
    }
    else return new Next()
}

function chain(...binder: Binder[]) {
    return (ctx: Context, par: ParameterReflection) => binder
        .reduce((a, b) => a instanceof Next ? b(ctx, par) : a, new Next())
}

export function bindParameter(ctx: Context, action: MethodReflection, converter?: TypeConverter[]) {
    const converters = flattenConverters(TypeConverters.concat(converter || []))
    return action.parameters.map(((x, i) => {
        const binder = chain(bindDecorator, bindByName, bindBody)
        const result = binder(ctx, x)
        return convert(result, [x.name], x.type, {
            default: DefaultConverters, converters
        })
    }))
}