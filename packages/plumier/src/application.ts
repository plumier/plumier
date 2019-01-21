import Cors from "@koa/cors"
import {
    ActionResult,
    Application,
    BodyParserOption,
    Class,
    Configuration,
    ConversionError,
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
    ValidationError,
} from "@plumjs/core"
import { validate } from "@plumjs/validator"
import { existsSync } from "fs"
import Koa, { Context } from "koa"
import BodyParser from "koa-bodyparser"
import { dirname, isAbsolute, join } from "path"

import { analyzeRoutes, printAnalysis, router, transformController, transformModule } from "./router"
import { FileActionResult, ServeStaticOptions } from "./serve-static"

/* ------------------------------------------------------------------------------- */
/* ----------------------------------- CORE -------------------------------------- */
/* ------------------------------------------------------------------------------- */

export interface RouteContext extends Koa.Context {
    route: Readonly<RouteInfo>,
    parameters: any[]
}

export class RedirectActionResult extends ActionResult {
    constructor(public path:string){ super() }

    async execute(ctx: Context): Promise<void> {
        ctx.redirect(this.path)
    }
}

export namespace response {
    export function json(body: any) {
        return new ActionResult(body)
    }
    export function file(path: string, opt?:ServeStaticOptions) {
        return new FileActionResult(path, opt)
    }
    export function redirect(path:string){
        return new RedirectActionResult(path)
    }
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------------- HELPERS ----------------------------------- */
/* ------------------------------------------------------------------------------- */


export function extractDecorators(route: RouteInfo): Middleware[] {
    const classDecorator: MiddlewareDecorator[] = route.controller.decorators.filter(x => x.name == "Middleware")
    const methodDecorator: MiddlewareDecorator[] = route.action.decorators.filter(x => x.name == "Middleware")
    const extract = (d: MiddlewareDecorator[]) => d.map(x => x.value).flatten()
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
            const validate = (value: any, i: number) => config.validator!(value, param(i), this.context)
            const result = await Promise.all(this.context.parameters.map((value, index) => validate(value, index)))
            const issues = result.flatten()
            if (issues.length > 0) throw new ValidationError(issues)
        }
        const result = (<Function>controller[route.action.name]).apply(controller, this.context.parameters)
        const awaitedResult = await Promise.resolve(result)
        const status = config.responseStatus && config.responseStatus[route.method] || 200
        if (awaitedResult instanceof ActionResult) {
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
export class WebApiFacility implements Facility {
    constructor(private opt?: { controller?: string | Class | Class[], bodyParser?: BodyParserOption, cors?: Cors.Options }) { }

    async setup(app: Readonly<PlumierApplication>) {
        app.koa.use(async (ctx, next) => {
            try {
                await next()
            }
            catch (e) {
                if(e instanceof ValidationError){
                    ctx.body = e.issues
                    ctx.status = e.status
                }
                else if(e instanceof ConversionError){
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
        app.set({
            validator: (value, meta, ctx) => validate(value, meta.decorators, [meta.name], ctx)
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
    async setup(app: Readonly<PlumierApplication>) {
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
        if (hasKeyOf<Facility>(config, "setup"))
            this.config.facilities.push(config)
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
            routes = transformModule(path)
        }
        else if (Array.isArray(this.config.controller)) {
            routes = this.config.controller.map(x => transformController(x))
                .flatten()
        }
        else {
            routes = transformController(this.config.controller)
        }
        return routes
    }

    async initialize(): Promise<Koa> {
        try {
            if (process.env["NODE_ENV"] === "production")
                Object.assign(this.config, { mode: "production" })
            await Promise.all(this.config.facilities.map(x => x.setup(this)))
            //module.parent.parent.filename -> because Plumier app also exported in plumier/src/index.ts
            let routes: RouteInfo[] = this.createRoutes(dirname(module.parent!.parent!.filename))
            if (this.config.mode === "debug") printAnalysis(analyzeRoutes(routes))
            const decorators: { [key: string]: Middleware[] } = {}
            this.koa.use(router(routes, this.config, ctx => {
                if (ctx.route && ctx.parameters) {
                    //execute global middleware and controller
                    const middleware = decorators[ctx.route.url] || (decorators[ctx.route.url] = this.globalMiddleware.concat(extractDecorators(ctx.route)))
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
