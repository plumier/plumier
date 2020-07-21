import { Context } from "koa"

import { AuthorizerMiddleware } from "./authorization"
import { ParameterBinderMiddleware } from "./binder"
import { hasKeyOf } from "./common"
import {
    ActionContext,
    ActionResult,
    HttpStatusError,
    Invocation,
    MetadataImpl,
    Middleware,
    MiddlewareMeta,
    MiddlewareUtil,
    RouteInfo,
} from "./types"
import { ValidatorMiddleware } from "./validator"


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
    target?: "Controller" | "Action"
    constructor(public ctx: Readonly<Context>) {
        this.proceed = this.proceed.bind(this)
    }
    get metadata(): MetadataImpl | undefined {
        const current = this.target === "Controller" ? this.ctx.route!.controller : this.ctx.route?.action
        return this.ctx.route ? new MetadataImpl(this.ctx.parameters, this.ctx.route, current) : undefined
    }
    abstract proceed(): Promise<ActionResult>
}

class MiddlewareInvocation extends DefaultInvocation {
    constructor(private meta: MiddlewareMeta<string | symbol | Middleware>, ctx: Context, private next: Invocation) {
        super(ctx)
    }
    proceed() {
        const mdw = typeof this.meta.middleware === "object" ? this.meta.middleware : this.ctx.config.dependencyResolver.resolve(this.meta.middleware)
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
    private mdw: MiddlewareMeta<string | symbol | Middleware>
    constructor({ middleware, target }: MiddlewareMeta, private next: Pipe) {
        this.mdw = typeof middleware === "function" ? { middleware: { execute: middleware }, target } : { middleware, target }
    }
    execute(ctx: Context): Invocation<Context> {
        //pass current middleware target into the invocation.. thus the metadata current will work properly
        const next = this.next.execute(ctx) as DefaultInvocation
        next.target = this.mdw.target
        return new MiddlewareInvocation(this.mdw, ctx, next)
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

function link(middlewares: MiddlewareMeta[], topNode: Pipe) {
    for (let i = middlewares.length; i--;) {
        topNode = new MiddlewarePipe(middlewares[i], topNode)
    }
    return topNode
}

function createPipes(context: Context | ActionContext) {
    const globalMdw = []
    const actionMdw = []
    for (const mdw of context.config.middlewares) {
        if(mdw.scope === "Global")
            globalMdw.push(mdw)
        else 
            actionMdw.push(mdw)
    }
    if (hasKeyOf<ActionContext>(context, "route")) {
        const middlewares = [
            // 1. global middlewares
            ...globalMdw,
            // 2. parameter binding
            { middleware: new ParameterBinderMiddleware() },
            // 3. validation
            { middleware: new ValidatorMiddleware() },
            // 4. authorization
            { middleware: new AuthorizerMiddleware() },
            // 5. action middlewares
            ...actionMdw,
            // 6. action middlewares from decorators
            ...MiddlewareUtil.extractDecorators(context.route)
        ]
        return link(middlewares, new ActionPipe())
    }
    else {
        // unhandled request
        return link(globalMdw, new NotFoundPipe())
    }
}

function invoke(ctx: Context, route: RouteInfo) {
    ctx.route = route
    ctx.state.caller = "invoke"
    const pipe = createPipes(ctx)
    return pipe.execute(ctx).proceed()
}

export { invoke, createPipes, Pipe };
