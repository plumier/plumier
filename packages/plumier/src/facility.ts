import Cors from "@koa/cors"
import {
    ActionResult,
    Class,
    CustomMiddleware,
    DefaultFacility,
    DependencyResolver,
    generateRoutes,
    HttpStatusError,
    Invocation,
    PlumierApplication,
    response,
    toBoolean,
} from "@plumier/core"
import chalk from "chalk"
import { Context } from "koa"
import BodyParser from "koa-body"
import { isAbsolute, join } from "path"

export interface WebApiFacilityOption {
    controller?: string | Class | Class[],
    bodyParser?: BodyParser.IKoaBodyOptions,
    cors?: Cors.Options | boolean,
    trustProxyHeader?: boolean,
    forceHttps?: boolean,
    dependencyResolver?: DependencyResolver
}

/**
 * Preset configuration for building rest. This facility contains:
 * 
 * parameter binder
 * 
 * body parser: koa-body
 * 
 * cors: @koa/cors
 */
export class WebApiFacility extends DefaultFacility {
    constructor(private opt?: WebApiFacilityOption) { super() }

    async generateRoutes(app: Readonly<PlumierApplication>) {
        const { controller, rootDir } = app.config
        let ctl = typeof controller === "string" && !isAbsolute(controller) ? join(rootDir, controller) : controller
        return generateRoutes(ctl, { ...app.config })
    }

    setup(app: Readonly<PlumierApplication>) {
        const option: WebApiFacilityOption = { ...this.opt }
        if (option.forceHttps ?? toBoolean(process.env.PLUM_FORCE_HTTPS || "__none")) {
            app.use(new ForceHttpsMiddleware())
        }
        app.koa.use(BodyParser(option.bodyParser))
        if (typeof option.cors !== "boolean" && option.cors) {
            app.koa.use(Cors(option.cors))
        }
        else if (option.cors) {
            app.koa.use(Cors())
        }
        if (option.dependencyResolver)
            app.set({ dependencyResolver: option.dependencyResolver })
        if (option.controller)
            app.set({ controller: option.controller })
        if (option.trustProxyHeader)
            app.set({ trustProxyHeader: option.trustProxyHeader })
    }
}

/**
 * Preset configuration for building restful style api. This facility contains:
 * 
 * parameter binder
 * 
 * body parser: koa-body
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


export class ForceHttpsMiddleware implements CustomMiddleware {
    async execute(i: Readonly<Invocation<Context>>): Promise<ActionResult> {
        const req = i.ctx.request
        if (req.protocol === "http")
            return response.redirect(`https://${req.hostname}${req.originalUrl}`)
        else
            return i.proceed()
    }
}

export class LoggerFacility extends DefaultFacility {
    setup(app: Readonly<PlumierApplication>) {
        app.use(new LoggerMiddleware())
    }
}

class LoggerMiddleware implements CustomMiddleware {
    async execute(i: Readonly<Invocation<Context>>): Promise<ActionResult> {
        const log = (msg: string) => {
            if (i.ctx.config.mode === "debug")
                console.log(msg)
        }
        const start = new Date()
        const getTime = () => `${(new Date().getTime() - start.getTime())}ms`
        try {
            const result = await i.proceed()
            log(chalk.green(`${i.ctx.method} ${result.status || 200} ${i.ctx.url} ${getTime()}`))
            return result;
        }
        catch (e) {
            if (e instanceof HttpStatusError) {
                log(chalk.yellow(`${i.ctx.method} ${e.status} ${i.ctx.url} ${getTime()}`))
                if (e.message)
                    log(chalk.yellow(e.message))
            }
            else {
                log(chalk.red(`${i.ctx.method} 500 ${i.ctx.url} ${getTime()}`))
                log(chalk.red(e.stack))
            }
            throw e
        }
    }
}

export interface ControllerFacilityOption {
    /**
     * Define group of route generated, this will be used to categorized routes in Route Analysis and Swagger (separate swagger endpoint for each group)
     */
    group?: string
    /**
     * Root path of the endpoint generated, for example /api/v1
     */
    rootPath?: string

    /**
     * Controllers or controller path
     */
    controller: string | Class | Class[],

    /**
     * Transform nested directories as route path, default true
     */
    directoryAsPath?: boolean
}

export class ControllerFacility extends DefaultFacility {
    constructor(private option: ControllerFacilityOption) {
        super()
    }

    async generateRoutes(app: Readonly<PlumierApplication>) {
        const { rootDir } = app.config
        const controller = this.option.controller
        let ctl = typeof controller === "string" && !isAbsolute(controller) ? join(rootDir, controller) : controller
        return generateRoutes(ctl, {
            ...app.config,
            ...this.option
        })
    }
}