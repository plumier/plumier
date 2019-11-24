import { Context } from "koa"

import { hasKeyOf } from "./common"
import {
    ActionResult,
    HttpStatusError,
    Invocation,
    Middleware,
    MiddlewareFunction,
    MiddlewareUtil,
    RouteContext,
    RouteInfo,
} from "./types"


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
    constructor(private middleware: string | symbol | MiddlewareFunction | Middleware, public context: Context, private next: Invocation) { }
    proceed(): Promise<ActionResult> {
        let middleware: Middleware
        if (typeof this.middleware === "function") {
            middleware = { execute: this.middleware }
        }
        else if (hasKeyOf<Middleware>(this.middleware, "execute")) {
            middleware = this.middleware
        }
        else {
            middleware = this.context.config.dependencyResolver.resolve(this.middleware)
        }
        return middleware.execute(this.next)
    }
}

class NotFoundActionInvocation implements Invocation {
    constructor(public context: Context) { }

    proceed(): Promise<ActionResult> {
        throw new HttpStatusError(404)
    }
}

class ActionInvocation implements Invocation {
    constructor(public context: RouteContext, private route: RouteInfo) { }
    async proceed(): Promise<ActionResult> {
        const config = this.context.config
        const controller: any = config.dependencyResolver.resolve(this.route.controller.type)
        const result = (<Function>controller[this.route.action.name]).apply(controller, this.context.parameters)
        const awaitedResult = await Promise.resolve(result)
        const status = config.responseStatus && config.responseStatus[this.route.method] || 200
        //if instance of action result, return immediately
        if (awaitedResult && awaitedResult.execute) {
            awaitedResult.status = awaitedResult.status || status
            return awaitedResult;
        }
        else {
            return new ActionResult(awaitedResult, status)
        }
    }
}

function pipe(ctx: Context, route?: RouteInfo, caller: "system" | "invoke" = "system") {
    const context = ctx;
    context.state.caller = caller
    let middlewares: (string | symbol | MiddlewareFunction | Middleware)[];
    let invocationStack: Invocation;
    if (!!route) {
        middlewares = getMiddleware(context.config.middlewares, route)
        invocationStack = new ActionInvocation(context as RouteContext, route)
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
    return pipe(ctx, route, "invoke")
}

export { invoke, pipe };
