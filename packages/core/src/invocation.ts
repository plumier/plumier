import { Context } from "koa"
import { ActionResult } from './action-result';
import { Middleware } from './middleware';
import { HttpStatusError, RouteContext } from './application';
import { ValidationError } from './validator';


interface Invocation {
    context: Readonly<Context>
    proceed(): Promise<ActionResult>
}

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
        const { route, config } = this.context
        const controller: any = config.dependencyResolver.resolve(route.controller.type)
        //check validation
        if (config.validator) {
            const param = (i: number) => route.action.parameters[i]
            const validate = (value: any, i: number) => config.validator!(value, param(i), this.context, this.context.config.validators)
            const result = await Promise.all(this.context.parameters.map((value, index) => validate(value, index)))
            const issues = result.flatten()
            if (issues.length > 0) throw new ValidationError(issues)
        }
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

function pipe(middleware: Middleware[], context: Context, invocation: Invocation) {
    return middleware.reverse().reduce((prev: Invocation, cur) => new MiddlewareInvocation(cur, context, prev), invocation)
}

async function execute(middlewares: Middleware[], context: Context, invocation: Invocation) {
    const result = await pipe(middlewares, context, invocation).proceed()
    await result.execute(context)
}

export { execute, Invocation, ActionInvocation, NotFoundActionInvocation, pipe }