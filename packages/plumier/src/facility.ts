import Cors from "@koa/cors"
import { Class, DefaultDependencyResolver, DefaultFacility, PlumierApplication, DependencyResolver, CustomMiddleware, Invocation, ActionResult, response, toBoolean, generateRoutes, Configuration } from "@plumier/core"
import BodyParser from "koa-body"
import { Context } from 'koa'
import { dirname } from "path"


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
        return generateRoutes(app.config.controller, app.config.rootDir)
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