import Debug from "debug";
import { Request } from "koa";
import { FunctionReflection, ParameterReflection, reflect, decorateClass } from "tinspector";
import { inspect, isArray } from "util";

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

export function createConversionError(value: any, prop: ParameterProperties & { parameterType: Class }) {
    const decorator = getArrayDecorator(prop.decorators)
    const type = decorator ? `Array<${decorator.typeAnnotation.name}>` : prop.parameterType.name
    log(`[Converter] Unable to convert ${b(value)} into ${b(type)}`)
    return new ConversionError({ path: prop.path, type, value },
        errorMessage.UnableToConvertValue.format(value, type, prop.path.join("->")))
}

export function booleanConverter(rawValue: any, prop: ParameterProperties & { parameterType: Class }) {
    const value: string = rawValue.toString().toLowerCase()
    const list: { [key: string]: boolean | undefined } = {
        on: true, true: true, "1": true, yes: true,
        off: false, false: false, "0": false, no: false
    }
    const result = list[value]
    log(`[Boolean Converter] Raw: ${b(rawValue)} Value: ${b(result)}`)
    if (result === undefined) throw createConversionError(rawValue, prop)
    return result
}

export function numberConverter(value: any, prop: ParameterProperties & { parameterType: Class }) {
    const result = Number(value)
    if (isNaN(result) || value === "") throw createConversionError(value, prop)
    log(`[Number Converter] Raw: ${b(value)} Value: ${b(result)}`)
    return result
}

export function dateConverter(value: any, prop: ParameterProperties & { parameterType: Class }) {
    const result = new Date(value)
    if (isNaN(result.getTime()) || value === "") throw createConversionError(value, prop)
    log(`[Date Converter] Raw: ${b(value)} Value: ${b(result)}`)
    return result
}



export function defaultModelConverter(value: any, prop: ParameterProperties & { parameterType: Class }): any {
    //--- helper functions
    const isConvertibleToObject = (value: any) => {
        if (typeof value == "boolean" ||
            typeof value == "number" ||
            typeof value == "string") return false
        else return true
    }
    //---

    //if the value already instance of the type then return immediately
    //this is possible when using decorator binding such as @bind.request("req")
    if (value instanceof prop.parameterType) return value

    //get reflection metadata of the class
    const reflection = reflect(prop.parameterType)
    //check if the value is possible to convert to model
    if (!isConvertibleToObject(value)) throw createConversionError(value, prop)
    log(`[Model Converter] converting ${b(value)} to ${b(prop.parameterType.name)}{${b(reflection.ctorParameters.map(x => x.name).join(", "))}}`)

    //sanitize excess property to prevent object having properties that doesn't match with declaration
    //traverse through the object properties and convert to appropriate property's type
    const sanitized = reflection.ctorParameters.map(x => ({
        name: x.name,
        value: convert(value[x.name], {
            parameterType: x.typeAnnotation,
            path: prop.path.concat(x.name),
            decorators: x.decorators,
            converters: prop.converters
        })
    })).reduce((a, b) => { a[b.name] = b.value; return a }, {} as any)
    log(`[Model Converter] Sanitized value ${b(sanitized)}`)

    //crete new instance of the type and assigned the sanitized values
    return Object.assign(new prop.parameterType(), sanitized)
}

export function defaultArrayConverter(value: any[], prop: ParameterProperties & { parameterType: Class }): any {
    const decorator:ArrayBindingDecorator = getArrayDecorator(prop.decorators)!
    if (!Array.isArray(value)) throw createConversionError(value, prop)
    log(`[Array Converter] converting ${b(value)} to Array<${decorator.typeAnnotation.name}>`)
    return value.map(((x, i) => convert(x, {
        path: prop.path.concat(i.toString()),
        converters: prop.converters,
        decorators: [],
        parameterType: decorator.typeAnnotation
    })))
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
    if (!prop.parameterType) return value
    log(`[Converter] Path: ${b(prop.path.join("->"))} Type:${b(prop.parameterType.name)} Decorators: ${b(prop.decorators.map(x => x.name).join(", "))}`)
    //if (prop.parameter.decorators.some((x:ArrayBindingDecorator)  => x.type == "ParameterBinding" && x.name == "Array"))
    if (Boolean(getArrayDecorator(prop.decorators)))
        return defaultArrayConverter(value, { ...prop, parameterType: prop.parameterType })
    else if (prop.converters.has(prop.parameterType))
        return prop.converters.get(prop.parameterType)!(value, { ...prop, parameterType: prop.parameterType })
    //if type of model and has no  converter, use DefaultObject converter
    else if (isCustomClass(prop.parameterType))
        return defaultModelConverter(value, { ...prop, parameterType: prop.parameterType })
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
    log(`[Model Binder] Request Body: ${b(request.body)}`)
    return converter(request.body)
}

function bindDecorator(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any) => any): any {
    const decorator: BindingDecorator = par.decorators.find((x: BindingDecorator) => x.type == "ParameterBinding")
    if (!decorator) return
    log(`[Decorator Binder] Action: ${b(action.name)} Parameter: ${b(par.name)} Decorator: ${b(decorator.name)} Part: ${b(decorator.part)}`)
    switch (decorator.name) {
        case "Body":
            return converter(decorator.part ? request.body && (<any>request.body)[decorator.part] : request.body)
        case "Query":
            return converter(decorator.part ? request.query && request.query[decorator.part] : request.query)
        case "Header":
            return converter(decorator.part ? request.headers && request.headers[decorator.part] : request.headers)
        case "Request":
            return converter(decorator.part ? request[decorator.part] : request)
    }
}

function bindArrayDecorator(action: FunctionReflection, request: Request, par: ParameterReflection, converter: (value: any, type: Class) => any): any {
    const decorator = getArrayDecorator(par.decorators)
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

function getArrayDecorator(decorators: any[]) {
    return decorators.find((x: ArrayBindingDecorator): x is ArrayBindingDecorator => x.type == "ParameterBinding" && x.name == "Array")
}

export function bindParameter(request: Request, action: FunctionReflection, converter?: TypeConverter) {
    const mergedConverters = flattenConverters(DefaultConverterList.concat(converter || []))
    return action.parameters.map(((x, i) => {
        const converter = (result: any, type?: Class) => convert(result, {
            path: [x.name], parameterType: type || x.typeAnnotation,
            converters: mergedConverters, decorators: x.decorators
        });
        return bindArrayDecorator(action, request, x, converter) ||
            bindDecorator(action, request, x, converter) ||
            bindModel(action, request, x, converter) ||
            bindRegular(action, request, x, converter)
    }))
}