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

declare module "koa" {
    interface Request {
        body?: any;
    }
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------- BINDER FUNCTIONS -------------------------------- */
/* ------------------------------------------------------------------------------- */

type Binder = (ctx: Context, par: ParameterReflection) => any
const NEXT = Symbol("__NEXT")

function getProperty(obj: any, parKey: string) {
    for (const key in obj) {
        if (key.toLowerCase() === parKey.toLowerCase())
            return obj[key]
    }
}

function bindBody(ctx: Context, par: ParameterReflection): any {
    return isCustomClass(par.type) || Array.isArray(par.type) ? ctx.request.body : undefined
}

function bindDecorator(ctx: Context, par: ParameterReflection): any {
    const decorator: BindingDecorator = par.decorators.find((x: BindingDecorator) => x.type == "ParameterBinding")
    if (!decorator) return NEXT
    return decorator.process(ctx)
}

function bindByName(ctx: Context, par: ParameterReflection): any {
    const { body, query } = ctx.request;
    return getProperty(query, par.name) || getProperty(body, par.name) || NEXT
}

function chain(...binder: Binder[]) {
    return (ctx: Context, par: ParameterReflection) => binder
        .reduce((a: any, b) => a === NEXT ? b(ctx, par) : a, NEXT)
}

function bindParameter(ctx: Context, converters?: ConverterMap[]) {
    const convert = createConverter({
        converters, guessArrayElement: !!ctx.is("urlencoded"),
        visitors: ctx.config.typeConverterVisitors,
        interceptor: visitor => (value, invocation) => {
            invocation.ctx = ctx
            invocation.route = ctx.route!
            return visitor(value, invocation)
        }
    })
    const binder = chain(bindDecorator, bindByName, bindBody)
    return Promise.all(ctx.route!.action.parameters.map(x => {
        const result = binder(ctx, x)
        return convert(result, {
            type: x.type, path: [x.name], ctx, name: x.name,
            errorStatus: HttpStatus.UnprocessableEntity,
            decorators: x.decorators, route: ctx.route!
        })
    }))
}

export { bindParameter, RequestPart, HeaderPart, BindingDecorator }