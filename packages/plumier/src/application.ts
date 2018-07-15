import Debug from "debug";
import { existsSync } from "fs";
import Koa, { Context } from "koa";
import Cors from "@koa/cors";
import BodyParser from "koa-bodyparser";

import { bindParameter } from "./binder";
import {
    ActionResult,
    Application,
    b,
    Configuration,
    DefaultConfiguration,
    errorMessage,
    Facility,
    hasKeyOf,
    HttpStatusError,
    Invocation,
    KoaMiddleware,
    Middleware,
    MiddlewareDecorator,
    MiddlewareUtil,
    PlumierApplication,
    PlumierConfiguration,
    RouteInfo,
    BodyParserOption,
    ValidationError,
} from "./framework";
import { analyzeRoutes, printAnalysis, router, transformController, transformModule } from "./router";
import { validateObject, validate, ValidatorDecorator } from 'validatorts';


const log = Debug("plum:app")


export function extractDecorators(route: RouteInfo): Middleware[] {
    const classDecorator: MiddlewareDecorator[] = route.controller.decorators.filter(x => x.name == "Middleware")
    const methodDecorator: MiddlewareDecorator[] = route.action.decorators.filter(x => x.name == "Middleware")
    const extract = (d: MiddlewareDecorator[]) => d.map(x => x.value).reduce((a, b) => a.concat(b), [])
    return extract(classDecorator)
        .concat(extract(methodDecorator))
        .reverse()
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- INVOCATIONS ----------------------------------- */
/* ------------------------------------------------------------------------------- */

export class MiddlewareInvocation implements Invocation {
    constructor(private middleware: Middleware, public context: Context, private next: Invocation) { }
    proceed(): Promise<ActionResult> {
        return this.middleware.execute(this.next)
    }
}

export class ActionInvocation implements Invocation {
    constructor(public context: Context) { }
    async proceed(): Promise<ActionResult> {
        const { request, route, config } = this.context
        const controller: any = config.dependencyResolver.resolve(route.controller.object)
        //bind parameters
        const parameters = bindParameter(request, route.action, config.converters)
        //check validation
        if (config.validator) {
            const param = (i: number) => route.action.parameters[i]
            const validate = (value: any, i: number) => config.validator!(value, param(i))
            const issues = parameters.map((value, index) => validate(value, index))
                .reduce((a, b) => a.concat(b), [])
            log(`[Action Invocation] Validation result ${b(issues)}`)
            if (issues.length > 0) throw new ValidationError(issues)
        }
        const result = (<Function>controller[route.action.name]).apply(controller, parameters)
        const awaitedResult = await Promise.resolve(result)
        const status = config.responseStatus && config.responseStatus[route.method] || 200
        if (awaitedResult instanceof ActionResult) {
            awaitedResult.status = awaitedResult.status || status
            log(`[Action Invocation] ActionResult value - Method: ${b(route.method)} Status config: ${b(config.responseStatus)} Status: ${b(result.status)} `)
            return awaitedResult;
        }
        else {
            log(`[Action Invocation] Raw value - Method: ${route.method} Status config: ${b(config.responseStatus)} Status: ${b(status)} `)
            return new ActionResult(awaitedResult, status)
        }
    }
}

export function pipe(middleware: Middleware[], context: Context, invocation: Invocation) {
    return middleware.reverse().reduce((prev: Invocation, cur) => new MiddlewareInvocation(cur, context, prev), invocation)
}

/* ------------------------------------------------------------------------------- */
/* -------------------------------- FACITLITIES ---------------------------------- */
/* ------------------------------------------------------------------------------- */

class ValidationMiddleware implements Middleware {
    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        try {
            return await invocation.proceed()
        }
        catch (e) {
            if (e instanceof ValidationError) {
                return new ActionResult(e.issues, 400)
            }
            else throw e
        }
    }
}

/**
 * Preset configuration for building web api. This facility contains:
 * 
 * body parser: koa-bodyparser
 * 
 * cors: @koa/cors
 */
export class WebApiFacility implements Facility {
    constructor(private opt?: { bodyParser?: BodyParserOption, cors?: Cors.Options }) { }
    async setup(app: Readonly<PlumierApplication>) {
        app.koa.use(BodyParser(this.opt && this.opt.bodyParser))
        app.koa.use(Cors(this.opt && this.opt.cors))
        app.set({
            validator: (value, meta) => {
                const decorators = meta.decorators.filter((x: ValidatorDecorator) => x.type === "ValidatorDecorator")
                log(`[Validator] Validating ${b(value)} metadata: ${b(meta)}`)
                return validate(value, decorators, [meta.name])
                    .map(x => ({ messages: x.messages, path: x.path }))
            }
        })
        app.use(new ValidationMiddleware())
    }
}

/**
 * Preset configuration for building restful style api. This facility contains:
 * 
 * body parser: koa-bodyparser
 * 
 * cors: @koa/cors
 * 
 * default response status: { get: 200, post: 201, put: 204, delete: 204 }
 */
export class RestfulApiFacility extends WebApiFacility {
    async setup(app: Readonly<PlumierApplication>) {
        super.setup(app)
        app.set({ responseStatus: { post: 201, put: 204, delete: 204 } })
    }
}



/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN APPLICATION ---------------------------------- */
/* ------------------------------------------------------------------------------- */

async function requestHandler(ctx: Context) {
    const controllerMiddleware = extractDecorators(ctx.route)
    const pipeline = pipe(controllerMiddleware, ctx, new ActionInvocation(ctx))
    const result = await pipeline.proceed()
    result.execute(ctx)
    log(`[Request Handler] ${b(ctx.path)} -> ${b(ctx.route.controller.name)}.${b(ctx.route.action.name)}`)
    log(`[Request Handler] Request Query: ${b(ctx.query)}`)
    log(`[Request Handler] Request Header: ${b(ctx.headers)}`)
    log(`[Request Handler] Request Body: ${b(result.body)}`)
}

export class Plumier implements PlumierApplication {
    readonly config: Readonly<PlumierConfiguration>;
    readonly koa: Koa

    constructor() {
        this.koa = new Koa()
        this.config = { ...DefaultConfiguration, middleware: [], facilities: [] }
    }

    use(option: KoaMiddleware): Application
    use(option: Middleware): Application
    use(option: KoaMiddleware | Middleware): Application {
        if (typeof option === "function") {
            this.koa.use(option)
        }
        else {
            this.koa.use(MiddlewareUtil.toKoa(option))
        }
        return this
    }

    set(facility: Facility): Application
    set(config: Partial<Configuration>): Application
    set(config: Partial<Configuration> | Facility): Application {
        if (hasKeyOf<Facility>(config, "setup"))
            this.config.facilities.push(config)
        else
            Object.assign(this.config, config)
        return this;
    }

    async initialize(): Promise<Koa> {
        try {
            let routes: RouteInfo[] = []
            if (typeof this.config.controller === "string") {
                if (!existsSync(this.config.controller))
                    throw new Error(errorMessage.ControllerPathNotFound.format(this.config.controller))
                routes = await transformModule(this.config.controller, [this.config.fileExtension!])
            }
            else if (Array.isArray(this.config.controller)) {
                routes = this.config.controller.map(x => transformController(x))
                    .reduce((a, b) => a.concat(b), [])
            }
            else {
                routes = transformController(this.config.controller)
            }
            if (this.config.mode === "debug") printAnalysis(analyzeRoutes(routes))
            await Promise.all(this.config.facilities.map(x => x.setup(this)))
            this.koa.use(async (ctx, next) => {
                try {
                    await next()
                }
                catch (e) {
                    if (e instanceof HttpStatusError)
                        ctx.throw(e.status, e)
                    else
                        ctx.throw(500, e)
                }
            })
            this.koa.use(router(routes, this.config, requestHandler))
            return this.koa
        }
        catch (e) {
            throw e
        }
    }
}
