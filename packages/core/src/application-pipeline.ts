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
    Metadata,
} from "./types"
import { ParameterBinderMiddleware } from './binder'
import { ValidatorMiddleware } from "./validator"
import { AuthorizerMiddleware } from './authorization'


// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

interface Pipe {
    execute(ctx: Context): Invocation
}


// --------------------------------------------------------------------- //
// ---------------------------- INVOCATIONS ---------------------------- //
// --------------------------------------------------------------------- //

function createInvocation(ctx: Context, proceed: () => Promise<ActionResult>): Invocation {
    return {
        ctx, proceed,
        get metadata() {
            return ctx.route ? new Metadata(ctx.parameters, ctx.route) : undefined
        }
    }
}

function middlewareInvocation(middleware: string | symbol | MiddlewareFunction | Middleware, ctx: Context, next: Invocation): Invocation {
    return createInvocation(ctx, async () => {
        let mdw: Middleware
        if (typeof middleware === "function") {
            mdw = { execute: middleware }
        }
        else if (hasKeyOf<Middleware>(middleware, "execute")) {
            mdw = middleware
        }
        else {
            mdw = ctx.config.dependencyResolver.resolve(middleware)
        }
        return mdw.execute(next)
    })
}

function notFoundInvocation(ctx: Context): Invocation {
    return createInvocation(ctx, async () => { throw new HttpStatusError(404) })
}

function actionInvocation(ctx: ActionContext): Invocation {
    return createInvocation(ctx, async () => {
        const controller: any = ctx.config.dependencyResolver.resolve(ctx.route.controller.type)
        const result = await (<Function>controller[ctx.route.action.name]).apply(controller, ctx.parameters)
        const status = ctx.config.responseStatus?.[ctx.route.method] ?? 200
        //if instance of action result, return immediately
        if (result && result.execute) {
            result.status = result.status ?? status
            return result;
        }
        else {
            return new ActionResult(result, status)
        }
    })
}

// --------------------------------------------------------------------- //
// ------------------------------- PIPES ------------------------------- //
// --------------------------------------------------------------------- //

class MiddlewarePipe implements Pipe {
    constructor(private middleware: string | symbol | MiddlewareFunction | Middleware, private next: Pipe) { }
    execute(ctx: Context): Invocation<Context> {
        return middlewareInvocation(this.middleware, ctx, this.next.execute(ctx))
    }
}

class ActionPipe implements Pipe {
    execute(ctx: ActionContext): Invocation<Context> {
        return actionInvocation(ctx)
    }
}

class NotFoundPipe implements Pipe {
    execute(ctx: ActionContext): Invocation<Context> {
        return notFoundInvocation(ctx)
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ PIPELINE ----------------------------- //
// --------------------------------------------------------------------- //

function link(middlewares: (string | symbol | MiddlewareFunction | Middleware)[], topNode: Pipe) {
    for (let i = middlewares.length; i--;) {
        topNode = new MiddlewarePipe(middlewares[i], topNode)
    }
    return topNode
}

function createPipes(context: Context | ActionContext) {
    if (hasKeyOf<ActionContext>(context, "route")) {
        const middlewares = [
            // 1. global middlewares
            ...context.config.middlewares,
            // 2. parameter binding
            new ParameterBinderMiddleware(),
            // 3. validation
            new ValidatorMiddleware(),
            // 4. authorization
            new AuthorizerMiddleware(),
            // 5. action middlewares
            ...MiddlewareUtil.extractDecorators(context.route)
        ]
        return link(middlewares, new ActionPipe())
    }
    else {
        // unhandled request
        return link(context.config.middlewares, new NotFoundPipe())
    }
}

function invoke(ctx: Context, route: RouteInfo) {
    ctx.route = route
    ctx.state.caller = "invoke"
    const pipe = createPipes(ctx)
    return pipe.execute(ctx).proceed()
}

export { invoke, createPipes, Pipe };
