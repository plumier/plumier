import Debug from "debug";
import { Request } from "koa";
import { inspect } from "util";

import { ArrayBindingDecorator, b, BindingDecorator, Class, TypeConverter, ValueConverter, isCustomClass } from "./framework";
import { FunctionReflection, ParameterReflection, reflect } from "./libs/reflect";


const log = Debug("plum:binder")

/* ------------------------------------------------------------------------------- */
/* -------------------------------- HELPER --------------------------------------- */
/* ------------------------------------------------------------------------------- */


/* ------------------------------------------------------------------------------- */
/* ------------------------------- CONVERTER ------------------------------------- */
/* ------------------------------------------------------------------------------- */

export function booleanConverter(value: any) {
    return ["on", "true", "1", "yes"].some(x => value.toLocaleLowerCase() == x)
}

export function dateConverter(value: any) {
    return new Date(value)
}

export function defaultModelConverter(value: any, type: Class, converters: Map<Function, ValueConverter>): any {
    const getType = (par: ParameterReflection) => {
        const decorator: ArrayBindingDecorator = par.decorators.find((x: ArrayBindingDecorator) => x.type == "ParameterBinding" && x.name == "Array")
        log(`[Model Converter] Constructor parameter ${par.name} decorator ${inspect(par.decorators, false, null)}`)
        if (decorator) return decorator.typeAnnotation as Class
        else return par.typeAnnotation as Class
    }
    log(`[Model Converter] converting ${b(inspect(value, false, null))} to ${b(type.name)} `)
    const reflection = reflect(type)
    log(`[Model Converter] model info ${b(inspect(reflection.ctorParameters))} `)
    const sanitized = reflection.ctorParameters.map(x => ({
        name: x.name,
        value: convert(value[x.name], getType(x), converters)
    })).reduce((a, b) => { a[b.name] = b.value; return a }, {} as any)
    log(`[Model Converter] Sanitized value ${b(inspect(sanitized, false, null))}`)
    return Object.assign(new type(), sanitized)
}

export function defaultArrayConverter(value: any[], type: Class, converters: Map<Function, ValueConverter>): any {
    log(`[Array Converter] converting ${b(inspect(value, false, null))} to Array<${type.name}>`)
    return value.map(x => convert(x, type, converters))
}

export function flattenConverters(converters: [Function, ValueConverter][]) {
    return converters.reduce((a, b) => { a.set(b[0], b[1]); return a }, new Map<Function, ValueConverter>())
}

export const DefaultConverterList: [Function, ValueConverter][] = [
    [Number, Number],
    [Date, dateConverter],
    [Boolean, booleanConverter]
]

export function convert(value: any, type: Class | undefined, converters: Map<Function, ValueConverter>) {
    if (!type) return value
    if (Array.isArray(value))
        return defaultArrayConverter(value, type, converters)
    else if (converters.has(type))
        return converters.get(type)!(value, type, converters)
    //if type of model and has no  converter, use DefaultObject converter
    else if (isCustomClass(type))
        return defaultModelConverter(value, type, converters)
    //no converter, return the value
    else
        return value
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------- MODEL BINDER ------------------------------------ */
/* ------------------------------------------------------------------------------- */


function bindModel(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any) => any): object | undefined {
    if (!par.typeAnnotation) return
    if (!isCustomClass(par.typeAnnotation)) return
    log(`[Model Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Parameter Type: ${b(par.typeAnnotation.name)}`)
    return converter(request.body)
}

/* ------------------------------------------------------------------------------- */
/* ------------------------ DECORATOR PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */


function bindDecorator(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any) => any): object | string | undefined {
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

/* ------------------------------------------------------------------------------- */
/* --------------------------- ARRAY PARAMETER BINDER ---------------------------- */
/* ------------------------------------------------------------------------------- */


function arrayDecorator(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any, type: Class) => any): object | string | undefined {
    const decorator: ArrayBindingDecorator = par.decorators.find((x: ArrayBindingDecorator) => x.type == "ParameterBinding" && x.name == "Array")
    if (!decorator) return
    log(`[Array Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Type: ${b(decorator.typeAnnotation.name)}`)
    return converter(request.body, decorator.typeAnnotation)
}

/* ------------------------------------------------------------------------------- */
/* -------------------------- REGULAR PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */

function bindRegular(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any) => any): object | undefined {
    log(`[Regular Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Value: ${b(request.query[par.name])}`)
    return converter(request.query[par.name.toLowerCase()])
}

/* ------------------------------------------------------------------------------- */
/* -------------------------- MAIN PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */

export function bindParameter(request: Request, action: FunctionReflection, converter?: TypeConverter) {
    const mergedConverters = flattenConverters(DefaultConverterList.concat(converter || []))
    return action.parameters.map(x => {
        const converter = (result: any, type?: Class) => convert(result, type || x.typeAnnotation, mergedConverters)
        return arrayDecorator(action, request, x, converter) ||
            bindDecorator(action, request, x, converter) ||
            bindModel(action, request, x, converter) ||
            bindRegular(action, request, x, converter)
    })
}