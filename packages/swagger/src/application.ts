import {
    ActionResult,
    DefaultFacility,
    Invocation,
    Middleware,
    PlumierApplication,
    response,
    RouteInfo,
} from "@plumier/core"
import { ServeStaticMiddleware } from "@plumier/serve-static"
import { join } from "path"
import dist from "swagger-ui-dist"

import { transform } from "./transform"
import { InfoObject } from 'openapi3-ts'


export interface SwaggerConfiguration { endpoint: string, info?: InfoObject }

class SwaggerMiddleware implements Middleware {
    constructor(private spec: any, private opt: SwaggerConfiguration) { }
    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const endpoint = this.opt.endpoint.toLowerCase()
        const uiPath = endpoint + "/index"
        if (invocation.ctx.path.toLowerCase() === endpoint + "/swagger.json")
            return response.json(this.spec)
        if (invocation.ctx.path.toLowerCase() === this.opt.endpoint.toLowerCase())
            return response.redirect(uiPath)
        if (invocation.ctx.path.toLowerCase() === uiPath)
            return response.file(join(__dirname, "index.html"))
        else
            return invocation.proceed()
    }
}

export class SwaggerFacility extends DefaultFacility {
    opt: SwaggerConfiguration
    constructor(opt?: Partial<SwaggerConfiguration>) {
        super()
        this.opt = { endpoint: "/swagger", ...opt }
        if (this.opt.endpoint.toLocaleLowerCase().endsWith("/index"))
            this.opt.endpoint = this.opt.endpoint.substring(0, this.opt.endpoint.length - 6)
    }

    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]): Promise<void> {
        const path = dist.getAbsoluteFSPath()
        const spec = transform(routes, { map: new Map(), config: app.config }, this.opt.info)
        app.use(new SwaggerMiddleware(spec, this.opt))
        app.use(new ServeStaticMiddleware({ root: path, rootPath: this.opt.endpoint }))
    }
}
