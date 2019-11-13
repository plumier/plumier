import { HttpMethod, RouteInfo, Middleware, Invocation, ActionResult, response, DefaultFacility, PlumierApplication } from "@plumier/core"
import { OpenApiBuilder, OperationObject, PathItemObject, PathObject, ResponseObject } from "openapi3-ts"
import dist from 'swagger-ui-dist'
import { ServeStaticFacility } from 'serve-static/lib'

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

class OpenApiMiddleware implements Middleware {
    constructor(private spec: any) { }
    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        if (invocation.context.request.path === "/swagger.json") 
            return response.json(this.spec)
        else 
            return invocation.proceed()
    }
}

export class OpenApiFacility extends DefaultFacility {
     
    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]): Promise<void> {
        const path = dist.getAbsoluteFSPath()
        const spec = transform(routes)
        app.use(new OpenApiMiddleware(spec))
        //app.use(new ServeStaticFacility({}))

    }
}