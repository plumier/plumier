import {
    ActionResult,
    DefaultFacility,
    HttpMethod,
    Invocation,
    Middleware,
    PlumierApplication,
    response,
    RouteInfo,
} from "@plumier/core"
import { ServeStaticMiddleware } from "@plumier/serve-static"
import { OpenApiBuilder, OperationObject, PathItemObject, PathObject, ResponseObject, ParameterObject } from "openapi3-ts"
import dist from "swagger-ui-dist"
import { join } from 'path'
import { MethodReflection, ParameterReflection } from 'tinspector'

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

interface RouteGroup { [url: string]: RouteInfo[] }

function groupRoutes(routes: RouteInfo[]): RouteGroup {
    return routes.reduce((prev, cur) => {
        prev[cur.url] = (prev[cur.url] || []).concat(cur)
        return prev
    }, {} as RouteGroup)
}

function transformUrl(url: string) {
    return url.replace(/(:(\w*\d*)(\/|-{0,1}))/g, (a, b, par, slash) => `{${par}}${slash}`)
}

// function parPosition(action:MethodReflection, par:ParameterReflection): "cookie" | "path" | "query" | "header" {
//     if(par.decorators.)
// }

// --------------------------------------------------------------------- //
// ----------------------------- TRANSFORM ----------------------------- //
// --------------------------------------------------------------------- //

function transformPaths(group: RouteGroup) {
    return Object.keys(group)
        .map(x => transformPath(x, group[x]))
        .reduce((result, [path, item]) => {
            result[path] = item
            return result
        }, {} as PathObject)
}

function transformPath(path: string, route: RouteInfo[]): [string, PathItemObject] {
    const item = route.map(x => transformOperation(x))
        .reduce((result, [method, opr]) => {
            result[method] = opr
            return result
        }, {} as PathItemObject)
    return [transformUrl(path), item]
}

function transformOperation(route: RouteInfo): [HttpMethod, OperationObject] {
    const operation: OperationObject = {
        responses: transformResponses(route)
    }
    return [route.method, operation]
}

// function transformParameters(action:MethodReflection, par:ParameterReflection): ParameterObject {

//     return {
//         name: par.name,
//         in: 
//     }
// }

function transformResponses(route: RouteInfo): { [status: string]: ResponseObject } {
    return {
        "200": { description: "", content: {} }
    }
}

function transform(routes: RouteInfo[]) {
    const group = groupRoutes(routes)
    const paths = transformPaths(group)
    return OpenApiBuilder.create({
        openapi: "3.0.0",
        info: { title: "title", version: "1.0.0" },
        paths
    }).getSpec()
}

// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //

export interface SwaggerFacilityConfiguration { endpoint: string }

class SwaggerMiddleware implements Middleware {
    constructor(private spec: any, private opt: SwaggerFacilityConfiguration) { }
    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const uiPath = this.opt.endpoint.toLowerCase() + "/index"
        if (invocation.context.path.toLowerCase() === "/swagger.json")
            return response.json(this.spec)
        if (invocation.context.path.toLowerCase() === this.opt.endpoint.toLowerCase())
            return response.redirect(uiPath)
        if (invocation.context.path.toLowerCase() === uiPath)
            return response.file(join(dist.getAbsoluteFSPath(), "index.html"))
        else
            return invocation.proceed()
    }
}

export class SwaggerFacility extends DefaultFacility {
    opt: SwaggerFacilityConfiguration
    constructor(opt?: SwaggerFacilityConfiguration) {
        super()
        this.opt = { endpoint: "/swagger", ...opt }
        if(this.opt.endpoint.toLocaleLowerCase().endsWith("/index")) 
            this.opt.endpoint = this.opt.endpoint.substring(0, this.opt.endpoint.length - 6)
    }

    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]): Promise<void> {
        const path = dist.getAbsoluteFSPath()
        const spec = transform(routes)
        app.use(new SwaggerMiddleware(spec, this.opt))
        app.use(new ServeStaticMiddleware({ root: path, rootPath: this.opt.endpoint }))
    }
}