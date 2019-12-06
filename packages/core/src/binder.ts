import { IncomingHttpHeaders } from "http"
import { Context, Request } from "koa"
import { ParameterReflection } from "tinspector"

import { isCustomClass } from "./common"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- // 

interface BindingDecorator { type: "ParameterBinding", process: (ctx: Context) => any, name:string }
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
    return isCustomClass(par.type) || !!(par.type && par.type[0]) ? ctx.request.body : undefined
}

function bindDecorator(ctx: Context, par: ParameterReflection): any {
    const decorator: BindingDecorator = par.decorators.find((x: BindingDecorator) => x.type == "ParameterBinding")
    if (!decorator) return NEXT
    return decorator.process(ctx)
}

function bindByName(ctx: Context, par: ParameterReflection): any {
    return getProperty(ctx.request.query, par.name) || getProperty(ctx.request.body, par.name) || NEXT
}

function chain(...binder: Binder[]) {
    return (ctx: Context, par: ParameterReflection) => binder
        .reduce((a: any, b) => a === NEXT ? b(ctx, par) : a, NEXT)
}

const binder = chain(bindDecorator, bindByName, bindBody)

export { RequestPart, HeaderPart, BindingDecorator, binder }