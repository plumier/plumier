import reflect, { decorate, decorateProperty } from "tinspector"

import { ActionContext, Middleware, MiddlewareDecorator, MiddlewareFunction } from "../types"
import { Class } from '../common'


interface RelationDecorator { kind: "plumier-meta:relation", type: Class | Class[] | ((x:any) => Class | Class[]) }

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

function relation(type: Class | Class[] | ((x:any) => Class | Class[])) {
    return decorateProperty(<RelationDecorator>{ kind: "plumier-meta:relation", type })
}

export { middleware, domain, relation, RelationDecorator }
