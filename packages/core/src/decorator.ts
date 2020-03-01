import reflect, { decorate } from "tinspector"

import { Middleware, MiddlewareDecorator, MiddlewareFunction } from "./types"


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

export { middleware, domain }
