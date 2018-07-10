import Debug from "debug";
import { Request } from "koa";
import { FunctionReflection, ParameterReflection, reflect, decorateClass } from "tinspector";
import { inspect } from "util";

import {
    ArrayBindingDecorator,
    b,
    BindingDecorator,
    Class,
    errorMessage,
    isCustomClass,
    ParameterProperties,
    TypeConverter,
    ConversionError,
    ValueConverter,
} from "./framework";


const log = Debug("plum:binder")

/* ------------------------------------------------------------------------------- */
/* ------------------------------- CONVERTER ------------------------------------- */
/* ------------------------------------------------------------------------------- */

export function throwValidationError(value: any, type: string, prop: ParameterProperties) {
    throw new ConversionError({ path: prop.path, type, value },
        errorMessage.UnableToConvertValue.format(value, type, prop.path.join("->")))
}

export function booleanConverter(rawValue: any, prop: ParameterProperties) {
    const value: string = rawValue.toString().toLowerCase()
    const list: { [key: string]: boolean | undefined } = {
        on: true, true: true, "1": true, yes: true,
        off: false, false: false, "0": false, no: false
    }
    const result = list[value]
    if (result === undefined) throwValidationError(rawValue, "Boolean", prop)
    return result
}

export function numberConverter(value: any, prop: ParameterProperties) {
    const result = Number(value)
    if (isNaN(result) || value === "") throwValidationError(value, "Number", prop)
    return result
}

export function dateConverter(value: any, prop: ParameterProperties) {
    const result = new Date(value)
    if (isNaN(result.getTime()) || value === "") throwValidationError(value, "Date", prop)
    return result
}

function isObject(value: any) {
    if (typeof value == "boolean" ||
        typeof value == "number" ||
        typeof value == "string") return false
    else return true
}

export function defaultModelConverter(value: any, prop: ParameterProperties & { type: Class }): any {
    const getType = (par: ParameterReflection) => {
        const decorator: ArrayBindingDecorator = par.decorators.find((x: ArrayBindingDecorator) => x.type == "ParameterBinding" && x.name == "Array")
        log(`[Model Converter] Constructor parameter ${par.name} decorator ${inspect(par.decorators, false, null)}`)
        if (decorator) return decorator.typeAnnotation as Class
        else return par.typeAnnotation as Class
    }
    const reflection = reflect(prop.type)
    if (!isObject(value))
        throwValidationError(value, prop.type.name, prop)
    log(`[Model Converter] converting ${b(inspect(value, false, null))} to ${b(prop.type.name)}{${b(reflection.ctorParameters.map(x => x.name).join(", "))}}`)
    const sanitized = reflection.ctorParameters.map(x => ({
        name: x.name,
        value: convert(value[x.name], { ...prop, type: getType(x), path: prop.path.concat(x.name) })
    })).reduce((a, b) => { a[b.name] = b.value; return a }, {} as any)
    log(`[Model Converter] Sanitized value ${b(inspect(sanitized, false, null))}`)
    return Object.assign(new prop.type(), sanitized)
}

export function defaultArrayConverter(value: any[], prop: ParameterProperties & { type: Class }): any {
    log(`[Array Converter] converting ${b(inspect(value, false, null))} to Array<${prop.type.name}>`)
    return value.map(x => convert(x, prop))
}

export function flattenConverters(converters: [Function, ValueConverter][]) {
    return converters.reduce((a, b) => { a.set(b[0], b[1]); return a }, new Map<Function, ValueConverter>())
}

export const DefaultConverterList: [Function, ValueConverter][] = [
    [Number, numberConverter],
    [Date, dateConverter],
    [Boolean, booleanConverter]
]

export function convert(value: any, prop: ParameterProperties) {
    if (value === null || value === undefined) return undefined
    if (!prop.type) return value
    if (Array.isArray(value))
        return defaultArrayConverter(value, { ...prop, type: prop.type })
    else if (prop.converters.has(prop.type))
        return prop.converters.get(prop.type)!(value, prop)
    //if type of model and has no  converter, use DefaultObject converter
    else if (isCustomClass(prop.type))
        return defaultModelConverter(value, { ...prop, type: prop.type })
    //no converter, return the value
    else
        return value
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------- BINDER FUNCTIONS -------------------------------- */
/* ------------------------------------------------------------------------------- */


function bindModel(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any) => any): any {
    if (!par.typeAnnotation) return
    if (!isCustomClass(par.typeAnnotation)) return
    log(`[Model Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Parameter Type: ${b(par.typeAnnotation.name)}`)
    log(`[Model Binder] Request Body: ${b(inspect(request.body, false, null))}`)
    return converter(request.body)
}

function bindDecorator(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any) => any): any {
    const decorator: BindingDecorator = par.decorators.find((x: BindingDecorator) => x.type == "ParameterBinding")
    if (!decorator) return
    log(`[Decorator Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Decorator: ${b(decorator.name)} Part: ${b(decorator.part)}`)
    switch (decorator.name) {
        case "Body":
            return decorator.part ? request.body && (<any>request.body)[decorator.part] : request.body
        case "Query":
            return decorator.part ? request.query && request.query[decorator.part] : request.query
        case "Header":
            return decorator.part ? request.headers && request.headers[decorator.part] : request.headers
        case "Request":
            return decorator.part ? request[decorator.part] : request
    }
}

function bindArrayDecorator(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any, type: Class) => any): any {
    const decorator: ArrayBindingDecorator = par.decorators.find((x: ArrayBindingDecorator) => x.type == "ParameterBinding" && x.name == "Array")
    if (!decorator) return
    log(`[Array Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Type: ${b(decorator.typeAnnotation.name)}`)
    return converter(request.body, decorator.typeAnnotation)
}

function bindRegular(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any) => any): any {
    log(`[Regular Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Value: ${b(request.query[par.name])}`)
    return converter(request.query[par.name.toLowerCase()])
}

/* ------------------------------------------------------------------------------- */
/* -------------------------- MAIN PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */

export function bindParameter(request: Request, action: FunctionReflection, converter?: TypeConverter) {
    const mergedConverters = flattenConverters(DefaultConverterList.concat(converter || []))
    return action.parameters.map(((x, i) => {
        const converter = (result: any, type?: Class) => convert(result, {
            path: [x.name],
            action, type: type || x.typeAnnotation,
            converters: mergedConverters
        });
        return bindArrayDecorator(action, request, x, converter) ||
            bindDecorator(action, request, x, converter) ||
            bindModel(action, request, x, converter) ||
            bindRegular(action, request, x, converter)
    }))
}