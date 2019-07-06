import { Context } from "koa"

import { ActionResult, HttpStatusError, Invocation, Middleware, RouteContext } from "./types"

class MiddlewareInvocation implements Invocation {
    constructor(private middleware: Middleware, public context: Context, private next: Invocation) { }
    proceed(): Promise<ActionResult> {
        return this.middleware.execute(this.next)
    }
}

class NotFoundActionInvocation implements Invocation {
    constructor(public context: Context) { }

    proceed(): Promise<ActionResult> {
        throw new HttpStatusError(404)
    }
}

class ActionInvocation implements Invocation {
    constructor(public context: RouteContext) { }
    async proceed(): Promise<ActionResult> {
        const route = this.context.route;
        const config = this.context.config
        const controller: any = config.dependencyResolver.resolve(route.controller.type)
        const result = (<Function>controller[route.action.name]).apply(controller, this.context.parameters)
        const awaitedResult = await Promise.resolve(result)
        const status = config.responseStatus && config.responseStatus[route.method] || 200
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

async function pipe(middlewares: Middleware[], context: Context, invocation: Invocation) {
    let invocationStack: Invocation = invocation;
    for (let i = middlewares.length; i--;) {
        const mdw = middlewares[i];
        invocationStack = new MiddlewareInvocation(mdw, context, invocationStack)
    }
    const result = await invocationStack.proceed()
    await result.execute(context)
}

export { pipe, ActionInvocation, NotFoundActionInvocation }