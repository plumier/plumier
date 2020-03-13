import reflect, { decorate, ClassReflection } from "tinspector"

import { Middleware, MiddlewareDecorator, MiddlewareFunction, ActionContext } from "./types"
import { Class } from './common'


// --------------------------------------------------------------------- //
// ------------------------------- DOMAIN ------------------------------ //
// --------------------------------------------------------------------- //

function domain() { return reflect.parameterProperties() }

// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //

namespace middleware {
    export function use(middleware: MiddlewareFunction<ActionContext>): (...args: any[]) => void
    export function use(middleware: Middleware): (...args: any[]) => void
    export function use(id: string): (...args: any[]) => void
    export function use(id: symbol): (...args: any[]) => void
    export function use(...middleware: (string | symbol | MiddlewareFunction<ActionContext> | Middleware)[]) {
        const value = { name: "Middleware", value: middleware as any }
        return decorate((...args: any[]) => {
            if (args.length === 1)
                return <MiddlewareDecorator>{ ...value, target: "Controller" }
            else {
                return <MiddlewareDecorator>{ ...value, target: "Action" }
            }
        }, ["Class", "Method"])
    }
}

export { middleware, domain }
