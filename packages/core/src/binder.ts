import { IncomingHttpHeaders } from "http"
import { Context, Request } from "koa"
import { ParameterReflection } from "tinspector"
import createConverter, { ConverterMap } from "typedconverter"

import { isCustomClass } from "./common"
import { HttpStatus } from './http-status';

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- // 

interface BindingDecorator { type: "ParameterBinding", process: (ctx: Context) => any }
type RequestPart = keyof Request
type HeaderPart = keyof IncomingHttpHeaders

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
    const keys = Object.keys(query).concat(Object.keys(body!)).map(x => x.toLowerCase())
    if (keys.some(x => x === par.name.toLowerCase())) {
        return getProperty(query, par.name) || getProperty(body, par.name)
    }
    else return new Next()
}

function chain(...binder: Binder[]) {
    return (ctx: Context, par: ParameterReflection) => binder
        .reduce((a, b) => a instanceof Next ? b(ctx, par) : a, new Next())
}

function bindParameter(ctx: Context, converters?: ConverterMap[]) {
    const convert = createConverter({
        converters, guessArrayElement: !!ctx.is("urlencoded"),
        visitors: ctx.config.typeConverterVisitors
    })
    return Promise.all(ctx.route!.action.parameters.map(x => {
        const binder = chain(bindDecorator, bindByName, bindBody)
        const result = binder(ctx, x)
        return convert(result, {
            type: x.type, path: [x.name], ctx,
            errorStatus: HttpStatus.UnprocessableEntity,
            decorators: x.decorators
        })
    }))
}

export { bindParameter, RequestPart, HeaderPart, BindingDecorator }