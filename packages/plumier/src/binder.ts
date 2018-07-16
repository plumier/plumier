import Debug from "debug";
import { Request } from "koa";
import { FunctionReflection, ParameterReflection, reflect } from "@plum/reflect";

import { b, isCustomClass } from "./common";
import {
    ArrayBindingDecorator,
    BindingDecorator,
    Class,
    ConversionError,
    errorMessage,
    ParameterProperties,
    TypeConverter,
    ValueConverter,
} from "./core";


const log = Debug("plum:binder")

function getArrayDecorator(decorators: any[]) {
    return decorators.find((x: ArrayBindingDecorator): x is ArrayBindingDecorator => x.type == "ParameterBinding" && x.name == "Array")
}

function createConversionError(value: any, prop: ParameterProperties & { parameterType: Class }) {
    const decorator = getArrayDecorator(prop.decorators)
    const type = decorator ? `Array<${decorator.typeAnnotation.name}>` : prop.parameterType.name
    log(`[Converter] Unable to convert ${b(value)} into ${b(type)}`)
    return new ConversionError({ path: prop.path, type, value },
        errorMessage.UnableToConvertValue.format(value, type, prop.path.join("->")))
}


export function flattenConverters(converters: TypeConverter[]) {
    return converters.reduce((a, b) => { a.set(b.type, b.converter); return a }, new Map<Function, ValueConverter>())
}

//some object can't simply convertible to string https://github.com/emberjs/ember.js/issues/14922#issuecomment-278986178
function safeToString(value: any) {
    try {
        return value.toString()
    } catch (e) {
        return "[object Object]"
    }
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- CONVERTER ------------------------------------- */
/* ------------------------------------------------------------------------------- */

export function booleanConverter(rawValue: any, prop: ParameterProperties & { parameterType: Class }) {
    const value: string = safeToString(rawValue)
    const list: { [key: string]: boolean | undefined } = {
        on: true, true: true, "1": true, yes: true,
        off: false, false: false, "0": false, no: false
    }
    const result = list[value.toLowerCase()]
    log(`[Boolean Converter] Raw: ${b(value)} Value: ${b(result)}`)
    if (result === undefined) throw createConversionError(value, prop)
    return result
}

export function numberConverter(rawValue: any, prop: ParameterProperties & { parameterType: Class }) {
    const value = safeToString(rawValue)
    const result = Number(value)
    if (isNaN(result) || value === "") throw createConversionError(value, prop)
    log(`[Number Converter] Raw: ${b(value)} Value: ${b(result)}`)
    return result
}

export function dateConverter(rawValue: any, prop: ParameterProperties & { parameterType: Class }) {
    const value = safeToString(rawValue)
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
    try {
        return Object.assign(new prop.parameterType(), sanitized)
    }
    catch (e) {
        const message = errorMessage.UnableToInstantiateModel.format(prop.parameterType.name)
        if (e instanceof Error) {
            e.message = message + "\n" + e.message
            throw e
        }
        else throw new Error(message)
    }
}

export function defaultArrayConverter(value: any[], prop: ParameterProperties & { parameterType: Class }): any {
    const decorator: ArrayBindingDecorator = getArrayDecorator(prop.decorators)!
    if (!Array.isArray(value)) throw createConversionError(value, prop)
    log(`[Array Converter] converting ${b(value)} to Array<${decorator.typeAnnotation.name}>`)
    return value.map(((x, i) => convert(x, {
        path: prop.path.concat(i.toString()),
        converters: prop.converters,
        decorators: [],
        parameterType: decorator.typeAnnotation
    })))
}

export const DefaultConverterList: TypeConverter[] = [
    { type: Number, converter: numberConverter },
    { type: Date, converter: dateConverter },
    { type: Boolean, converter: booleanConverter }
]

export function convert(value: any, prop: ParameterProperties) {
    if (value === null || value === undefined) return undefined
    if (!prop.parameterType) return value
    log(`[Converter] Path: ${b(prop.path.join("->"))} ` +
        `Source Type: ${b(typeof value)} ` +
        `Target Type:${b(prop.parameterType.name)} ` +
        `Decorators: ${b(prop.decorators.map(x => x.name).join(", "))} ` +
        `Value: ${b(value)}`)
    //check if the parameter contains @bind.array()
    if (Boolean(getArrayDecorator(prop.decorators)))
        return defaultArrayConverter(value, { ...prop, parameterType: prop.parameterType })
    //check if parameter is native value that has default converter (Number, Date, Boolean) or if user provided converter
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
    const getDataOrPart = (data: any) => decorator.part ? data && data[decorator.part] : data
    switch (decorator.name) {
        case "Body":
            return converter(getDataOrPart(request.body))
        case "Query":
            return converter(getDataOrPart(request.query))
        case "Header":
            return converter(getDataOrPart(request.headers))
        case "Request":
            return converter(getDataOrPart(request))
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

export function bindParameter(request: Request, action: FunctionReflection, converter?: TypeConverter[]) {
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