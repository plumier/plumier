import { BindingDecorator, ConverterFunction, DefaultConverter, TypeConverter } from "@plumier/core"
import { Context } from "koa"
import { MethodReflection, ParameterReflection } from "tinspector"

import { isCustomClass } from "./common"
import { arrayConverter, booleanConverter, convert, dateConverter, modelConverter, numberConverter } from "./converter"

/* ------------------------------------------------------------------------------- */
/* --------------------------------- TYPES --------------------------------------- */
/* ------------------------------------------------------------------------------- */

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

