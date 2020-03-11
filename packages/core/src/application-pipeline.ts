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

abstract class DefaultInvocation implements Invocation {
    constructor(public ctx: Readonly<Context>) { 
        this.proceed = this.proceed.bind(this)
    }
    get metadata(): Metadata | undefined {
        return this.ctx.route ? new Metadata(this.ctx.parameters, this.ctx.route) : undefined
    }
    abstract proceed(): Promise<ActionResult>
}

class MiddlewareInvocation extends DefaultInvocation {
    constructor(private middleware: string | symbol | Middleware, ctx: Context, private next: Invocation) {
        super(ctx)
    }
    proceed() {
        const mdw = typeof this.middleware === "object" ? this.middleware : this.ctx.config.dependencyResolver.resolve(this.middleware)
        return mdw.execute(this.next)
    }
}

class NotFoundInvocation extends DefaultInvocation {
    constructor(ctx: Context) {
        super(ctx)
    }
    proceed(): Promise<ActionResult> { throw new HttpStatusError(404) }
}

class ActionInvocation extends DefaultInvocation {
    constructor(public ctx: ActionContext) {
        super(ctx)
    }
    async proceed(): Promise<ActionResult> {
        const controller: any = this.ctx.config.dependencyResolver.resolve(this.ctx.route.controller.type)
        const result = await (<Function>controller[this.ctx.route.action.name]).apply(controller, this.ctx.parameters)
        const status = this.ctx.config.responseStatus?.[this.ctx.route.method] ?? 200
        //if instance of action result, return immediately
        if (result && result.execute) {
            result.status = result.status ?? status
            return result;
        }
        else {
            return new ActionResult(result, status)
        }
    }
}


// --------------------------------------------------------------------- //
// ------------------------------- PIPES ------------------------------- //
// --------------------------------------------------------------------- //

class MiddlewarePipe implements Pipe {
    private mdw: string | symbol | Middleware
    constructor(middleware: string | symbol | MiddlewareFunction | Middleware, private next: Pipe) {
        this.mdw = typeof middleware === "function" ? { execute: middleware } : middleware
    }
    execute(ctx: Context): Invocation<Context> {
        return new MiddlewareInvocation(this.mdw, ctx, this.next.execute(ctx))
    }
}

class ActionPipe implements Pipe {
    execute(ctx: ActionContext): Invocation<Context> {
        return new ActionInvocation(ctx)
    }
}

class NotFoundPipe implements Pipe {
    execute(ctx: ActionContext): Invocation<Context> {
        return new NotFoundInvocation(ctx)
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
