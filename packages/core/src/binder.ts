import { IncomingHttpHeaders } from "http"
import { Context, Request } from "koa"
import { MethodReflection, ParameterReflection } from "tinspector"

import { isCustomClass } from "./common"
import { RouteDecorator } from './route-generator'
import { ActionContext, ActionResult, Invocation, Middleware, MetadataImpl, GlobalMetadata, FormFile } from "./types"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- // 

interface BindingDecorator { type: "ParameterBinding", process: CustomBinderFunction, name: string }
interface BindActionResult { kind: "plumier-meta:bind-action-result" }

type RequestPart = keyof Request
type HeaderPart = keyof IncomingHttpHeaders
type CustomBinderFunction = (ctx: Context, metadata: GlobalMetadata) => any

declare module "koa" {
    interface Request {
        body?: any;
    }
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------- BINDER FUNCTIONS -------------------------------- */
/* ------------------------------------------------------------------------------- */

type Binder = (ctx: ActionContext, par: ParameterReflection) => any
const NEXT = Symbol("__NEXT")

function isFile(par: ParameterReflection) {
    const type = Array.isArray(par.type) ? par.type[0] : par.type
    return type === FormFile
}

function getProperty(obj: any, parKey: string) {
    for (const key in obj) {
        if (key.toLowerCase() === parKey.toLowerCase())
            return obj[key]
    }
}

function bindBody(ctx: Context, par: ParameterReflection): any {
    if (isFile(par)) return
    return isCustomClass(par.type) || !!(par.type && par.type[0]) ? ctx.request.body : undefined
}

function bindDecorator(ctx: Context, par: ParameterReflection): any {
    const decorator: BindingDecorator = par.decorators.find((x: BindingDecorator) => x.type === "ParameterBinding")
    if (!decorator) return NEXT
    return decorator.process(ctx, new MetadataImpl([], ctx.route!, { ...par, parent: ctx.route!.controller.type }))
}

function bindByName(ctx: ActionContext, par: ParameterReflection): any {
    const paramName = ctx.route.paramMapper.alias(par.name)
    return getProperty(ctx.request.query, paramName)
        || getProperty(ctx.request.body, par.name)
        || getProperty((ctx.request as any).files, par.name)
        || NEXT
}

function chain(...binder: Binder[]) {
    return (ctx: ActionContext, par: ParameterReflection) => binder
        .reduce((a: any, b) => a === NEXT ? b(ctx, par) : a, NEXT)
}

const binderChain = chain(bindDecorator, bindByName, bindBody)

function binder(methodReflection: MethodReflection, ctx: ActionContext) {
    return Promise.all(methodReflection.parameters.map(x => binderChain(ctx, x)))
}

class ParameterBinderMiddleware implements Middleware {
    async execute(invocation: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        (invocation.ctx as any).parameters = await binder(invocation.ctx.route.action, invocation.ctx)
        return invocation.proceed()
    }
}

export { RequestPart, HeaderPart, BindingDecorator, binder, ParameterBinderMiddleware, CustomBinderFunction, BindActionResult }
