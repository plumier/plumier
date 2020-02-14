import Cors from "@koa/cors"
import { Class, DefaultDependencyResolver, DefaultFacility, PlumierApplication, DependencyResolver } from "@plumier/core"
import BodyParser from "koa-body"


export interface WebApiFacilityOption {
    controller?: string | Class | Class[],
    bodyParser?: BodyParser.IKoaBodyOptions,
    cors?: Cors.Options | boolean,
    trustProxyHeader?: boolean
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

    setup(app: Readonly<PlumierApplication>) {
        const option: WebApiFacilityOption = { ...this.opt }
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