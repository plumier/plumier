import { AuthorizeDecorator, HttpMethod, RouteInfo, RouteMetadata, VirtualRoute } from "@plumier/core"
import { OperationObject, PathItemObject, PathObject, PathsObject } from "openapi3-ts"

import { transformBody } from "./body"
import { transformParameters } from "./parameter"
import { transformResponses } from "./response"
import { TransformContext, isDescription, isTag } from './shared'

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

function transformVirtualRoutes(routes: VirtualRoute[], ctx: TransformContext): [string, PathItemObject][] {
    return routes.map(x => {
        return [x.url, <PathItemObject>{
            [`${x.method}`]: x.openApiOperation ?? <OperationObject>{
                responses: {
                    "200": {
                        description: "Response body", content: { "application/json": {} }
                    }
                },
                tags: [x.provider.name],
                parameters: [],
                requestBody: undefined
            }
        }]
    })
}

function transformPaths(routes: RouteMetadata[], ctx: TransformContext) {
    const virtualPaths = transformVirtualRoutes(routes.filter((x): x is VirtualRoute => x.kind === "VirtualRoute"), ctx)
    const group = groupRoutes(routes.filter((x): x is RouteInfo => x.kind === "ActionRoute"))
    return Object.keys(group)
        .map(x => transformPath(x, group[x], ctx))
        .concat(virtualPaths)
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
    const isPublic = route.access === "Public"
    const desc = route.action.decorators.find(isDescription)
    const tags = route.controller.decorators.filter(isTag).map(x => x.tag)
    if (tags.length === 0) tags.push(route.controller.name.replace(/controller$/i, ""))
    const secured = ctx.config.enableAuthorization && !isPublic
    const bearer: any[] = []
    const parameters = transformParameters(route, ctx)
    const requestBody = transformBody(route, ctx)
    const operation: OperationObject = {
        responses: transformResponses(route, ctx, isPublic),
        tags, parameters, requestBody, description: desc?.desc
    }
    if (secured) operation.security = [{ bearer }]
    return [route.method, operation]
}

export { transformPaths }