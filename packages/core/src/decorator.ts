import reflect, { decorate, decorateClass } from "tinspector"

import { MiddlewareDecorator, MiddlewareFunction, Middleware, HttpMethod, VirtualRouteInfo, VirtualRouteInfoDecorator } from "./types"

// --------------------------------------------------------------------- //
// ------------------------------- DOMAIN ------------------------------ //
// --------------------------------------------------------------------- //

function domain() { return reflect.parameterProperties() }

// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //

namespace middleware {
    export function use(middleware: MiddlewareFunction): (...args: any[]) => void
    export function use(middleware: Middleware): (...args: any[]) => void
    export function use(id: string): (...args: any[]) => void
    export function use(id: symbol): (...args: any[]) => void
    export function use(...middleware: (string | symbol | MiddlewareFunction | Middleware)[]) {
        const value: MiddlewareDecorator = { name: "Middleware", value: middleware }
        return decorate(value, ["Class", "Method"])
    }
}

function virtualRoute(info: { method: HttpMethod, url: string, access?: string }) {
    return decorateClass(x => <VirtualRouteInfoDecorator>{
        type: "VirtualRoute",
        info: <VirtualRouteInfo>{ ...info, access: info.access || "Public", facility: x.name }
    })
}

export { middleware, domain }