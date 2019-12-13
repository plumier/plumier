import { Context } from "koa"

import { hasKeyOf } from "./common"
import {
    ActionContext,
    ActionResult,
    HttpStatusError,
    Invocation,
    Middleware,
    MiddlewareFunction,
    MiddlewareUtil,
    RouteInfo,
} from "./types"
import { ParameterBinderMiddleware } from './binder'
import { ValidatorMiddleware } from "./validator"
import { AuthorizerMiddleware } from './authorization'


// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

function pipeMiddleware(middlewares: (string | symbol | MiddlewareFunction | Middleware)[], ctx: Context, invocation: Invocation) {
    for (let i = middlewares.length; i--;) {
        invocation = new MiddlewareInvocation(middlewares[i], ctx, invocation)
    }
    return invocation.proceed()
}


// --------------------------------------------------------------------- //
// ---------------------------- INVOCATIONS ---------------------------- //
// --------------------------------------------------------------------- //

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
    constructor(public ctx: ActionContext) { }
    async proceed(): Promise<ActionResult> {
        const { config, route, parameters } = this.ctx
        // 4. Controller Creation
        const controller: any = config.dependencyResolver.resolve(route.controller.type)
        // 5. Controller Invocation
        const result = await (<Function>controller[route.action.name]).apply(controller, parameters)
        const status = config.responseStatus && config.responseStatus[route.method] || 200
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


// --------------------------------------------------------------------- //
// ------------------------------ PIPELINE ----------------------------- //
// --------------------------------------------------------------------- //


function pipe(context: Context | ActionContext, caller: "system" | "invoke" = "system") {
    context.state.caller = caller;
    // request with controller's handler
    if (hasKeyOf<ActionContext>(context, "route")) {
        const middlewares:(string | symbol | MiddlewareFunction | Middleware)[] = []
        // 1. global middlewares
        middlewares.push(...context.config.middlewares)
        // 2. parameter binding
        middlewares.push(new ParameterBinderMiddleware())
        // 3. validation
        middlewares.push(new ValidatorMiddleware())
        // 4. authorization
        middlewares.push(new AuthorizerMiddleware())
        // 5. action middlewares
        middlewares.push(...MiddlewareUtil.extractDecorators(context.route))
        // 6. execute action
        return pipeMiddleware(middlewares, context, new ActionInvocation(context))
    }
    // request without controller handler
    else {
        const globalMiddlewares = context.config.middlewares.slice(0)
        return pipeMiddleware(globalMiddlewares, context, new NotFoundActionInvocation(context))
    }
}

function invoke(ctx: Context, route: RouteInfo) {
    ctx.route = route
    return pipe(ctx, "invoke")
}

export { invoke, pipe };
