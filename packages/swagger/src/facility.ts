import {
    ActionResult,
    appendRoute,
    DefaultFacility,
    Invocation,
    Middleware,
    PlumierApplication,
    response,
    RouteMetadata,
} from "@plumier/core"
import { ServeStaticMiddleware } from "@plumier/serve-static"
import { InfoObject } from "openapi3-ts"
import { join } from "path"
import dist from "swagger-ui-dist"

import { transform } from "./transform"


export interface SwaggerConfiguration { endpoint: string, info?: InfoObject }
type ResultGroup = { [group: string]: RouteMetadata[] }

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
    private defaultGroup = "___default___"
    opt: SwaggerConfiguration
    constructor(opt?: Partial<SwaggerConfiguration>) {
        super()
        this.opt = { endpoint: "/swagger", ...opt }
        if (this.opt.endpoint.toLocaleLowerCase().endsWith("/index"))
            this.opt.endpoint = this.opt.endpoint.substring(0, this.opt.endpoint.length - 6)
    }

    private groupRoutes(routes: RouteMetadata[]) {
        return routes.reduce((prev, cur) => {
            const key = cur.group ?? this.defaultGroup
            prev[key] = (prev[key] ?? []).concat(cur)
            return prev
        }, {} as ResultGroup)
    }

    async initialize(app: Readonly<PlumierApplication>, routes: RouteMetadata[]): Promise<void> {
        const path = dist.getAbsoluteFSPath()
        const group = this.groupRoutes(routes)
        for (const key in group) {
            const spec = transform(group[key], { map: new Map(), config: app.config }, this.opt.info)
            const endpoint = key === this.defaultGroup ? this.opt.endpoint : appendRoute(this.opt.endpoint, key)
            app.use(new SwaggerMiddleware(spec, {...this.opt, endpoint }))
            app.use(new ServeStaticMiddleware({ root: path, rootPath: endpoint }))
        }
    }
}