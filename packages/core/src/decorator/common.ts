import reflect, { decorate } from "tinspector"

import { EntityPolicyProviderDecorator } from "../authorization"
import { Class } from "../common"
import { ActionContext, ApplyToOption, Middleware, MiddlewareDecorator, MiddlewareFunction } from "../types"


interface ResponseTypeDecorator {
    kind: "plumier-meta:response-type"
    type: Class | Class[]
}

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

function entityProvider(entity: Class, idParam: string, opt?: ApplyToOption) {
    return decorate(<EntityPolicyProviderDecorator>{ kind: "plumier-meta:entity-policy-provider", entity, idParam }, ["Class", "Method"], opt)
}

function responseType(type: Class | Class[] | ((x: any) => Class | Class[]), opt?: ApplyToOption) {
    return decorate(<ResponseTypeDecorator>{ kind: "plumier-meta:response-type", type }, ["Class", "Method"], opt)
}


export { middleware, domain, entityProvider, responseType, ResponseTypeDecorator }
