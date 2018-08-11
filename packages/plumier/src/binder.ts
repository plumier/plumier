import {
    BindingDecorator,
    Class,
    ConversionError,
    errorMessage,
    isCustomClass,
    ParameterProperties,
    ParameterPropertiesType,
    TypeConverter,
    ValueConverter,
    getChildValue,
} from "@plumjs/core";
import { FunctionReflection, ParameterReflection, reflect } from "@plumjs/reflect";
import { Context } from "koa";


function createConversionError(value: any, prop: ParameterProperties) {
    const type = Array.isArray(prop.parameterType) ? `Array<${prop.parameterType[0].name}>` : prop.parameterType.name
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

export function booleanConverter(rawValue: any, prop: ParameterProperties) {
    const value: string = safeToString(rawValue)
    const list: { [key: string]: boolean | undefined } = {
        on: true, true: true, "1": true, yes: true,
        off: false, false: false, "0": false, no: false
    }
    const result = list[value.toLowerCase()]
    if (result === undefined) throw createConversionError(value, prop)
    return result
}

export function numberConverter(rawValue: any, prop: ParameterProperties) {
    const value = safeToString(rawValue)
    const result = Number(value)
    if (isNaN(result) || value === "") throw createConversionError(value, prop)
    return result
}

export function dateConverter(rawValue: any, prop: ParameterProperties) {
    const value = safeToString(rawValue)
    const result = new Date(value)
    if (isNaN(result.getTime()) || value === "") throw createConversionError(value, prop)
    return result
}



export function defaultModelConverter(value: any, prop: ParameterPropertiesType<Class>): any {
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

    //crete new instance of the type and assigned the sanitized values
    try {
        const result = Object.assign(new prop.parameterType(), sanitized)
        //remove property that is not defined in value
        //because new prop.parameterType() will create property with undefined value
        const trim = Object.keys(result).filter(x => Object.keys(value).indexOf(x) === -1)
        trim.forEach(x =>  delete result[x])
        return result
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

export function defaultArrayConverter(value: any[], prop: ParameterPropertiesType<Class[]>): any {
    if (!Array.isArray(value)) throw createConversionError(value, prop)
    return value.map(((x, i) => convert(x, {
        path: prop.path.concat(i.toString()),
        converters: prop.converters,
        decorators: [],
        parameterType: prop.parameterType[0]
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
    //check if the parameter contains @array()
    if (Array.isArray(prop.parameterType))
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


function bindModel(action: FunctionReflection, ctx: Context, par: ParameterReflection, converter: (value: any) => any): any {
    if (!par.typeAnnotation) return
    if (!isCustomClass(par.typeAnnotation)) return
    return converter(ctx.request.body)
}

function bindDecorator(action: FunctionReflection, ctx: Context, par: ParameterReflection, converter: (value: any) => any): any {
    const decorator: BindingDecorator = par.decorators.find((x: BindingDecorator) => x.type == "ParameterBinding")
    if (!decorator) return
    return converter(decorator.part ? ctx && getChildValue(ctx, decorator.part) : ctx)
}

function bindArrayDecorator(action: FunctionReflection, ctx: Context, par: ParameterReflection, converter: (value: any, type: Class | Class[]) => any): any {
    if (!Array.isArray(par.typeAnnotation)) return 
    return converter(ctx.request.body, par.typeAnnotation)
}

function bindRegular(action: FunctionReflection, ctx: Context, par: ParameterReflection, converter: (value: any) => any): any {
    const queryKey = Object.keys(ctx.request.query).find(x => x.toLowerCase() === par.name.toLocaleLowerCase())
    const bodyKey = Object.keys(ctx.request.body || {}).find(x => x.toLowerCase() === par.name.toLocaleLowerCase())
    const body:any = ctx.request.body;
    return converter(ctx.request.query[queryKey!] || body && body[bodyKey!])
}

export function bindParameter(ctx: Context, action: FunctionReflection, converter?: TypeConverter[]) {
    const mergedConverters = flattenConverters(DefaultConverterList.concat(converter || []))
    return action.parameters.map(((x, i) => {
        const converter = (result: any, type?: Class | Class[]) => convert(result, {
            path: [x.name], parameterType: type || x.typeAnnotation,
            converters: mergedConverters, decorators: x.decorators
        });
        return bindArrayDecorator(action, ctx, x, converter) ||
            bindDecorator(action, ctx, x, converter) ||
            bindModel(action, ctx, x, converter) ||
            bindRegular(action, ctx, x, converter)
    }))
}