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
import ejs from "ejs"
import { readFile } from "fs"
import { promisify } from "util"

import { transform } from "./transform"

const readFileAsync = promisify(readFile)

export interface SwaggerDisplayOption {
    deepLinking: boolean
    displayOperationId: boolean
    defaultModelsExpandDepth: number
    defaultModelExpandDepth: number
    defaultModelRendering: number
    displayRequestDuration: boolean
    docExpansion: string[]
    filter: boolean | string
    maxDisplayedTags: number
    showExtensions: boolean
    showCommonExtensions: boolean
    useUnsafeMarkdown: boolean
    tryItOutEnabled: boolean
}

async function swaggerUI(options?: Partial<SwaggerDisplayOption>) {
    const params: Partial<SwaggerDisplayOption> = { deepLinking:true, defaultModelsExpandDepth: -1, ...options }
    const tpl = await readFileAsync(join(__dirname, "index.ejs"));
    const result = ejs.render(tpl.toString(), { options: params })
    return new ActionResult(result)
        .setHeader("content-type", "text/html")
}

export interface SwaggerFacilityConfiguration { endpoint: string, info?: InfoObject, display?: Partial<SwaggerDisplayOption> }

type ResultGroup = { [group: string]: RouteMetadata[] }

class SwaggerMiddleware implements Middleware {
    constructor(private spec: any, private opt: SwaggerFacilityConfiguration) { }
    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const endpoint = this.opt.endpoint.toLowerCase()
        const uiPath = endpoint + "/index"
        if (invocation.ctx.path.toLowerCase() === endpoint + "/swagger.json")
            return response.json(this.spec)
        if (invocation.ctx.path.toLowerCase() === this.opt.endpoint.toLowerCase())
            return response.redirect(uiPath)
        if (invocation.ctx.path.toLowerCase() === uiPath)
            return swaggerUI(this.opt.display)
        else
            return invocation.proceed()
    }
}

export class SwaggerFacility extends DefaultFacility {
    private defaultGroup = "___default___"
    opt: SwaggerFacilityConfiguration
    constructor(opt?: Partial<SwaggerFacilityConfiguration>) {
        super()
        const display: Partial<SwaggerDisplayOption> = { defaultModelsExpandDepth: -1, ...opt?.display }
        this.opt = { endpoint: "/swagger", ...opt, display }
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
            app.use(new SwaggerMiddleware(spec, { ...this.opt, endpoint }))
            app.use(new ServeStaticMiddleware({ root: path, rootPath: endpoint }))
        }
    }
}