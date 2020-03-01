import reflect from "tinspector"

import { Class, printTable } from "./common"
import { Middleware, MiddlewareFunction, DependencyResolver, } from "./types"
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

function getVirtualRoutes(middlewares: Middleware[]) {
    const routes: { middleware: string, method: string, url: string, access: string }[] = []
    for (const middleware of middlewares) {
        const meta = reflect(middleware.constructor as Class)
        const infos = meta.decorators.filter((x: VirtualRouteDecorator): x is VirtualRouteDecorator => x.name === "VirtualRoute")
        routes.push(...infos.map(({ access, method, url }) => ({
            middleware: middleware.constructor.name, access,
            method: method.toUpperCase(), url: url.toLowerCase()
        })))
    }
    return routes
}

function printVirtualRoutes(middlewares: (string | symbol | Middleware | MiddlewareFunction)[], resolver: DependencyResolver) {
    const cleansedMdw = getMiddlewares(middlewares, resolver)
    if (cleansedMdw.length === 0) return
    const routes = getVirtualRoutes(cleansedMdw)
    console.log("Virtual Routes")
    console.log("These route might changed dynamically at runtime")
    printTable(["middleware", { property: x => "->" }, "access", "method", "url"], routes)
}

export { printVirtualRoutes }