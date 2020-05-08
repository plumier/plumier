import { HttpMethod, RouteInfo, AuthorizeDecorator } from "@plumier/core"
import { OperationObject, PathItemObject, PathObject, SecurityRequirementObject } from "openapi3-ts"

import { transformBody } from "./body"
import { transformParameters } from "./parameter"
import { transformResponses } from "./response"
import { TransformContext } from "./shared"

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

function transformPaths(routes: RouteInfo[], ctx: TransformContext) {
    const group = groupRoutes(routes)
    return Object.keys(group)
        .map(x => transformPath(x, group[x], ctx))
        .reduce((result, [path, item]) => {
            result[path] = item
            return result
        }, {} as PathObject)
}

function transformPath(path: string, route: RouteInfo[], ctx: TransformContext): [string, PathItemObject] {
    const item = route.map(x => transformOperation(x, ctx))
        .reduce((result, [method, opr]) => {
            result[method] = opr
            return result
        }, {} as PathItemObject)
    return [transformUrl(path), item]
}

function transformOperation(route: RouteInfo, ctx: TransformContext): [HttpMethod, OperationObject] {
    const isPublic = !!route.action.decorators.find((x:AuthorizeDecorator) => x.type === "plumier-meta:authorize" && x.tag === "Public")
    const secured = ctx.config.enableAuthorization && !isPublic
    const bearer: any[] = []
    const parameters = transformParameters(route, ctx)
    const requestBody = transformBody(route, ctx)
    const operation: OperationObject = {
        responses: transformResponses(route, ctx, isPublic),
        tags: [route.controller.name.replace("Controller", "")],
        parameters, requestBody,
    }
    if (secured) operation.security = [{ bearer }]
    return [route.method, operation]
}

export { transformPaths }