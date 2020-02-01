import { IncomingHttpHeaders } from "http"
import { Context, Request } from "koa"
import { ParameterReflection } from "tinspector"

import { isCustomClass } from "./common"
import { ActionContext, ActionResult, Invocation, Middleware } from "./types"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- // 

interface BindingDecorator { type: "ParameterBinding", process: CustomBinderFunction, name:string }
type RequestPart = keyof Request
type HeaderPart = keyof IncomingHttpHeaders
type CustomBinderFunction = (ctx:Context) => any

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
    return getProperty(ctx.request.query, par.name) 
    || getProperty(ctx.request.body, par.name) 
    || getProperty((ctx.request as any).files, par.name)
    || NEXT
}

function chain(...binder: Binder[]) {
    return (ctx: Context, par: ParameterReflection) => binder
        .reduce((a: any, b) => a === NEXT ? b(ctx, par) : a, NEXT)
}

const binderChain = chain(bindDecorator, bindByName, bindBody)

function binder(ctx:ActionContext){
    return ctx.route.action.parameters.map(x => binderChain(ctx, x))
}

class ParameterBinderMiddleware implements Middleware {
    async execute(invocation: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        (invocation.ctx as any).parameters = binder(invocation.ctx)
        return invocation.proceed()
    }
}

export { RequestPart, HeaderPart, BindingDecorator, binder, ParameterBinderMiddleware, CustomBinderFunction }
