import { existsSync } from "fs";
import Koa, { Context } from "koa";
import { join } from "path";

import { bindParameter } from "./binder";
import {
    ActionResult,
    Application,
    Configuration,
    DefaultDependencyResolver,
    DependencyResolver,
    errorMessage,
    Facility,
    Invocation,
    KoaMiddleware,
    Middleware,
    PlumierApplication,
    PlumierConfiguration,
    RouteInfo,
    StringUtil,
} from "./framework";
import { analyzeRoutes, printAnalysis, router, transformModule, extractDecorators } from "./router";


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
    constructor(public context: Context, private resolver: DependencyResolver) { }
    async proceed(): Promise<ActionResult> {
        try {
            const { request, route } = this.context
            const controller: any = this.resolver.resolve(route!.controller.object)
            const result = (<Function>controller[route!.action.name]).apply(controller, bindParameter(request, route!.action, this.context.config.converters))
            if (result instanceof ActionResult) return Promise.resolve(result);
            else {
                const awaitedResult = await Promise.resolve(result)
                return new ActionResult(awaitedResult)
            }
        }
        catch (e) {
            return new ActionResult(e, 500)
        }
    }
}

export class ErrorInvocation implements Invocation {
    constructor(public context: Context, private error: Error) { }
    proceed(): Promise<ActionResult> {
        throw this.error
    }
}

/* ------------------------------------------------------------------------------- */
/* ------------------------- MIDDLEWARE PIPELINE --------------------------------- */
/* ------------------------------------------------------------------------------- */

export function pipe(middleware: Middleware[], context: Context, invocation: Invocation) {
    return middleware.reverse().reduce((prev: Invocation, cur) => new MiddlewareInvocation(cur, context, prev), invocation)
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- REQUEST HANDLER ----------------------------------- */
/* ------------------------------------------------------------------------------- */

function routeHandler(route: RouteInfo, config: Configuration) {
    return async (ctx: Context) => {
        const controllerMiddleware = extractDecorators(route)
        Object.assign(ctx, { config, route })
        const pipeline = pipe(controllerMiddleware, ctx, new ActionInvocation(ctx, config.dependencyResolver))
        const result = await pipeline.proceed()
        result.execute(ctx)
    }
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN APPLICATION ---------------------------------- */
/* ------------------------------------------------------------------------------- */

export class Plumier implements PlumierApplication {
    readonly config: Readonly<PlumierConfiguration>;
    readonly koa: Koa

    constructor() {
        this.koa = new Koa()
        this.config = {
            mode: "debug",
            middleware: [],
            facilities: [],
            rootPath: process.cwd(),
            controllerPath: "./controller",
            modelPath: "./model",
            dependencyResolver: new DefaultDependencyResolver()
        }
    }

    use(option: KoaMiddleware): Application
    use(option: Middleware): Application
    use(option: KoaMiddleware | Middleware): Application {
        if (typeof option === "function") {
            this.koa.use(option)
        }
        else {
            this.koa.use(Middleware.toKoa(option))
        }
        return this
    }

    set(facility: Facility): Application
    set(config: Partial<Configuration>): Application
    set(config: Partial<Configuration> | Facility): Application {
        if (config instanceof Facility)
            this.config.facilities.push(config)
        else
            Object.assign(this.config, config)
        return this;
    }

    async initialize(): Promise<Koa> {
        try {
            const controllerPath = join(this.config.rootPath, this.config.controllerPath)
            const modelPath = join(this.config.rootPath, this.config.modelPath)
            if (!existsSync(controllerPath))
                throw new Error(StringUtil.format(errorMessage.ControllerPathNotFound, controllerPath))
            const routes = await transformModule(controllerPath)
            if (this.config.mode === "debug") printAnalysis(analyzeRoutes(routes))
            //wait all pre initialization facilities
            await Promise.all(this.config.facilities.map(x => x.onPreInitialize(this)))
            //setup all generated routes
            routes.forEach(route => this.koa.use(router(route, routeHandler(route, this.config))))
            //wait all after initialization facilities
            await Promise.all(this.config.facilities.map(x => x.onPostInitialize(this)))
            return this.koa
        }
        catch (e) {
            throw e
        }
    }
}
