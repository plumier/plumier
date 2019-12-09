import { Context } from "koa"

import { hasKeyOf } from "./common"
import {
    ActionResult,
    HttpStatusError,
    Invocation,
    Middleware,
    MiddlewareFunction,
    MiddlewareUtil,
    ActionContext,
    RouteInfo,
} from "./types"
import { binder } from './binder'
import { validate } from './validator'
import { checkAuthorize } from './authorization'


function getMiddleware(global: (string | symbol | MiddlewareFunction | Middleware)[], route: RouteInfo) {
    const conMdws = MiddlewareUtil.extractDecorators(route)
    const result: (string | symbol | MiddlewareFunction | Middleware)[] = []
    for (const mdw of global) {
        result.push(mdw)
    }
    for (const mdw of conMdws) {
        result.push(mdw)
    }
    return result
}


class MiddlewareInvocation implements Invocation {
    constructor(private middleware: string | symbol | MiddlewareFunction | Middleware, public ctx: Context, private next: Invocation) { }
    proceed(): Promise<ActionResult> {
        let middleware: Middleware
        if (typeof this.middleware === "function") {
            middleware = { execute: this.middleware }
        }
        else if (hasKeyOf<Middleware>(this.middleware, "execute")) {
            middleware = this.middleware
        }
        else {
            middleware = this.ctx.config.dependencyResolver.resolve(this.middleware)
        }
        return middleware.execute(this.next)
    }
}

class NotFoundActionInvocation implements Invocation {
    constructor(public ctx: Context) { }

    proceed(): Promise<ActionResult> {
        throw new HttpStatusError(404)
    }
}

class ActionInvocation implements Invocation {
    constructor(public ctx: ActionContext, private route: RouteInfo) { }
    async proceed(): Promise<ActionResult> {
        const config = this.ctx.config
        // 1. Parameter Binding
        this.ctx.parameters = binder(this.ctx)
        // 2. Conversion & validation
        this.ctx.parameters = await validate(this.ctx)
        // 3. Authorization
        await checkAuthorize(this.ctx)
        // 4. Controller Creation
        const controller: any = config.dependencyResolver.resolve(this.route.controller.type)
        // 5. Controller Invocation
        const result = await(<Function>controller[this.route.action.name]).apply(controller, this.ctx.parameters)
        const status = config.responseStatus && config.responseStatus[this.route.method] || 200
        //if instance of action result, return immediately
        if (result && result.execute) {
            result.status = result.status || status
            return result;
        }
        else {
            return new ActionResult(result, status)
        }
    }
}

function pipe(ctx: Context, caller: "system" | "invoke" = "system") {
    const context = ctx;
    context.state.caller = caller
    let middlewares: (string | symbol | MiddlewareFunction | Middleware)[];
    let invocationStack: Invocation;
    if (!!ctx.route) {
        middlewares = getMiddleware(context.config.middlewares, ctx.route)
        invocationStack = new ActionInvocation(context as ActionContext, ctx.route)
    }
    else {
        middlewares = context.config.middlewares.slice(0)
        invocationStack = new NotFoundActionInvocation(context)
    }
    for (let i = middlewares.length; i--;) {
        invocationStack = new MiddlewareInvocation(middlewares[i], context, invocationStack)
    }
    return invocationStack.proceed()
}

function invoke(ctx: Context, route: RouteInfo) {
    ctx.route = route
    return pipe(ctx, "invoke")
}

export { invoke, pipe };
