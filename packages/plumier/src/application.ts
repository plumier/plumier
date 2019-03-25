import Cors from "@koa/cors"
import {
    ActionResult,
    Application,
    Class,
    Configuration,
    ConversionError,
    DefaultConfiguration,
    DefaultFacility,
    errorMessage,
    Facility,
    HttpStatusError,
    Invocation,
    KoaMiddleware,
    Middleware,
    middleware as mdw,
    MiddlewareUtil,
    PlumierApplication,
    PlumierConfiguration,
    RouteInfo,
    ValidationError,
    ValidatorFunction,
} from "@plumier/core"
import { hasKeyOf, RouteGenerator } from "@plumier/kernel"
import { validate as validateString } from "@plumier/validator"
import { existsSync } from "fs"
import Koa, { Context } from "koa"
import BodyParser from "koa-bodyparser"
import { dirname, isAbsolute, join } from "path"

import { router } from "./router"

/* ------------------------------------------------------------------------------- */
/* ----------------------------------- CORE -------------------------------------- */
/* ------------------------------------------------------------------------------- */

export interface RouteContext extends Koa.Context {
    route: Readonly<RouteInfo>,
    parameters: any[]
}

export interface BodyParserOption {
    enableTypes?: string[];
    encode?: string;
    formLimit?: string;
    jsonLimit?: string;
    strict?: boolean;
    detectJSON?: (ctx: Koa.Context) => boolean;
    extendTypes?: {
        json?: string[];
        form?: string[];
        text?: string[];
    }
    onerror?: (err: Error, ctx: Koa.Context) => void;
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

class NotFoundActionInvocation implements Invocation {
    constructor(public context: Context) { }

    proceed(): Promise<ActionResult> {
        throw new HttpStatusError(404)
    }
}

export class ActionInvocation implements Invocation {
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

export function pipe(middleware: Middleware[], context: Context, invocation: Invocation) {
    return middleware.reverse().reduce((prev: Invocation, cur) => new MiddlewareInvocation(cur, context, prev), invocation)
}

/* ------------------------------------------------------------------------------- */
/* -------------------------------- FACILITIES ----------------------------------- */
/* ------------------------------------------------------------------------------- */

/**
 * Preset configuration for building web api. This facility contains:
 * 
 * body parser: koa-bodyparser
 * 
 * cors: @koa/cors
 */
export class WebApiFacility extends DefaultFacility {
    constructor(private opt?: {
        controller?: string | Class | Class[],
        bodyParser?: BodyParserOption, cors?: Cors.Options,
        validators?: { [key: string]: ValidatorFunction }
    }) { super() }

    setup(app: Readonly<PlumierApplication>) {
        app.koa.use(async (ctx, next) => {
            try {
                await next()
            }
            catch (e) {
                if (e instanceof ValidationError) {
                    ctx.body = e.issues
                    ctx.status = e.status
                }
                else if (e instanceof ConversionError) {
                    ctx.body = [e.issues]
                    ctx.status = e.status
                }
                else if (e instanceof HttpStatusError)
                    ctx.throw(e.status, e)
                else
                    ctx.throw(500, e)
            }
        })
        app.koa.use(BodyParser(this.opt && this.opt.bodyParser))
        app.koa.use(Cors(this.opt && this.opt.cors))
        if (this.opt && this.opt.controller)
            app.set({ controller: this.opt.controller })
        if (this.opt && this.opt.validators)
            app.set({ validators: this.opt.validators })
        app.set({
            validator: (value, meta, ctx, validators) => validateString(value, meta.decorators, [meta.name], ctx, validators)
        })
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
    setup(app: Readonly<PlumierApplication>) {
        super.setup(app)
        app.set({ responseStatus: { post: 201, put: 204, delete: 204 } })
    }
}


/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN APPLICATION ---------------------------------- */
/* ------------------------------------------------------------------------------- */

export class Plumier implements PlumierApplication {
    readonly config: Readonly<PlumierConfiguration>;
    readonly koa: Koa
    private globalMiddleware: Middleware[] = []

    constructor() {
        this.koa = new Koa()
        this.config = { ...DefaultConfiguration, middleware: [], facilities: [] }
    }

    use(option: KoaMiddleware): Application
    use(option: Middleware): Application
    use(option: KoaMiddleware | Middleware): Application {
        if (typeof option === "function") {
            this.globalMiddleware.push(MiddlewareUtil.fromKoa(option))
        }
        else {
            this.globalMiddleware.push(option)
        }
        return this
    }

    set(facility: Facility): Application
    set(config: Partial<Configuration>): Application
    set(config: Partial<Configuration> | Facility): Application {
        if (hasKeyOf<Facility>(config, "setup")) {
            config.setup(this)
            this.config.facilities.push(config)
        }
        else
            Object.assign(this.config, config)
        return this;
    }

    private createRoutes(executionPath: string) {
        let routes: RouteInfo[] = []
        if (typeof this.config.controller === "string") {
            const path = isAbsolute(this.config.controller) ? this.config.controller :
                join(executionPath, this.config.controller)
            if (!existsSync(path))
                throw new Error(errorMessage.ControllerPathNotFound.format(path))
            routes = RouteGenerator.transformModule(path)
        }
        else if (Array.isArray(this.config.controller)) {
            routes = this.config.controller.map(x => RouteGenerator.transformController(x))
                .flatten()
        }
        else {
            routes = RouteGenerator.transformController(this.config.controller)
        }
        return routes
    }

    async initialize(): Promise<Koa> {
        try {
            if (process.env["NODE_ENV"] === "production")
                Object.assign(this.config, { mode: "production" })
            //get file location of script who initialized the application to calculate the controller path
            //module.parent.parent.filename -> because Plumier app also exported in plumier/src/index.ts
            let routes: RouteInfo[] = this.createRoutes(dirname(module.parent!.parent!.filename))
            for (const facility of this.config.facilities) {
                await facility.initialize(this, routes)
            }
            if (this.config.mode === "debug") RouteGenerator.printAnalysis(RouteGenerator.analyzeRoutes(routes))
            const decorators: { [key: string]: Middleware[] } = {}
            this.koa.use(router(routes, this.config, ctx => {
                if (ctx.route && ctx.parameters) {
                    //execute global middleware and controller
                    const middleware = decorators[ctx.route.url] || (decorators[ctx.route.url] = this.globalMiddleware.concat(mdw.extractDecorators(ctx.route)))
                    return pipe(middleware, ctx, new ActionInvocation(<RouteContext>ctx))
                }
                else {
                    //execute global middleware only 
                    return pipe(this.globalMiddleware.slice(0), ctx, new NotFoundActionInvocation(ctx))
                }
            }))
            return this.koa
        }
        catch (e) {
            throw e
        }
    }
}
