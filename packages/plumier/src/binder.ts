import { Request } from "koa";
import Debug from "debug"

import { BindingDecorator, RouteDecorator, TypeConverter, Class, b } from "./framework";
import { FunctionReflection, getDecorators, ParameterReflection } from "./libs/reflect";


const log = Debug("plum:binder")

/* ------------------------------------------------------------------------------- */
/* ------------------------------- CONVERTER ------------------------------------- */
/* ------------------------------------------------------------------------------- */

function booleanConverter(value: any, type: Class) {
    return ["on", "true", "1", "yes"].some(x => value.toLocaleLowerCase() == x)
}

function defaultObjectConverter(value: any, type: Class) {
    return Object.assign(new type(), value)
}

const defaultConverter: TypeConverter = {
    Number: Number,
    Boolean: booleanConverter,
    __CustomClass: defaultObjectConverter
}

function convert(value: any, converters?: TypeConverter, type?: Class) {
    if (!type) return value
    const registry: TypeConverter = { ...defaultConverter, ...converters }
    const converter = registry[type.name]
    if (converter)
        return converter(value, type)
    //if type of model and has no  converter, use DefaultObject converter
    else if (isCustomClass(type))
        return registry["__CustomClass"](value, type)
    //no converter, return the value
    else
        return value
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------- MODEL BINDER ------------------------------------ */
/* ------------------------------------------------------------------------------- */

function isCustomClass(type: Function) {
    switch (type) {
        case Boolean:
        case String:
        case Array:
        case Number:
        case Object:
            return false
        default:
            return true
    }
}

function bindModel(action: FunctionReflection, request: Request, par: ParameterReflection): object | undefined {
    if (!par.typeAnnotation) return
    if (!isCustomClass(par.typeAnnotation)) return
    log(`[Model Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Parameter Type: ${b(par.typeAnnotation.name)}`)
    return request.body as object
}

/* ------------------------------------------------------------------------------- */
/* ------------------------ DECORATOR PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */


function bindDecorator(action: FunctionReflection, request: Request, par: ParameterReflection): object | string | undefined {
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
/* -------------------------- REGULAR PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */

function bindRegular(action: FunctionReflection, request: Request, par: ParameterReflection): object | undefined {
    log(`[Regular Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Value: ${b(request.query[par.name])}`)
    return request.query[par.name.toLowerCase()]
}

/* ------------------------------------------------------------------------------- */
/* -------------------------- MAIN PARAMETER BINDER --------------------------- */
/* ------------------------------------------------------------------------------- */

export function bindParameter(request: Request, action: FunctionReflection, converter?: TypeConverter) {
    return action.parameters.map(x => {
        const value = bindDecorator(action, request, x)
            || bindModel(action, request, x)
            || bindRegular(action, request, x)
        return convert(value, converter, x.typeAnnotation)
    })
}