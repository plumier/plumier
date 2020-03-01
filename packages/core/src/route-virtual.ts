import reflect from "tinspector"

import { Class, printTable } from "./common"
import { Middleware, MiddlewareFunction, DependencyResolver, VirtualRouteInfo, HttpMethod, } from "./types"
import { VirtualRouteDecorator } from './route-generator'


function getMiddlewares(middlewares: (string | symbol | Middleware | MiddlewareFunction)[], resolver: DependencyResolver) {
    const result: Middleware[] = []
    for (const mdw of middlewares) {
        if (typeof mdw === "function") continue
        if (typeof mdw === "object") {
            result.push(mdw)
            continue
        }
        result.push(resolver.resolve(mdw))
    }
    return result
}

function getVirtualRoutes(middlewares: Middleware[]): VirtualRouteInfo[] {
    const routes: VirtualRouteInfo[] = []
    for (const middleware of middlewares) {
        const meta = reflect(middleware.constructor as Class)
        const infos = meta.decorators.filter((x: VirtualRouteDecorator): x is VirtualRouteDecorator => x.name === "VirtualRoute")
        routes.push(...infos.map(({ access, method, url }) => ({
            className: middleware.constructor.name, access,
            method, url: url.toLowerCase()
        })))
    }
    return routes
}

function printVirtualRoutes(vRoutes: VirtualRouteInfo[], middlewares: (string | symbol | Middleware | MiddlewareFunction)[], resolver: DependencyResolver) {
    const cleansedMdw = getMiddlewares(middlewares, resolver)
    const decorator = getVirtualRoutes(cleansedMdw)
    const routes = decorator.concat(vRoutes)
    if (routes.length === 0) return
    console.log("Virtual Routes")
    printTable(["className", { property: x => "->" }, "access", { property: x => x.method.toUpperCase() }, "url"], routes)
}

export { printVirtualRoutes }