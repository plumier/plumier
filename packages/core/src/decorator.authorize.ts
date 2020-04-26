import { decorate } from "tinspector"

import { AuthorizerFunction, AuthorizeDecorator, Authorizer } from "./authorization"
import { errorMessage } from "./types"

type AccessModifier = "get" | "set" | "all"

class AuthDecoratorImpl {
    
    /**
     * Authorize controller or action or property or parameter and specify the custom logic
     * @param authorize custom authorizer
     * @param modifier modifier access (for property and parameter authorizer)
     * @param tag authorizer name visible on route generator
     */
    custom(authorize: symbol | string | AuthorizerFunction | Authorizer, modifier: AccessModifier = "all", tag: string = "Custom") {
        return decorate((...args: any[]) => {
            const location = args.length === 1 ? "Class" : args.length === 2 ? "Method" : "Parameter"
            return <AuthorizeDecorator>{
                type: "plumier-meta:authorize", tag, authorize, location, modifier
            }
        }, ["Class", "Parameter", "Method", "Property"])
    }

    /**
     * Authorize controller or action accessible by public
     */
    public() {
        return decorate((...args: any[]) => {
            if (args.length === 3 && typeof args[2] === "number")
                throw new Error(errorMessage.PublicNotInParameter)
            return <AuthorizeDecorator>{ type: "plumier-meta:authorize", tag: "Public" }
        }, ["Class", "Parameter", "Method", "Property"])
    }

    /**
     * Auhtorize property or parameter property accessible by specific role with access control
     * @param role user role allowed
     * @param modifier access kind
     */
    role(role: string, modifier: AccessModifier): PropertyDecorator | ParameterDecorator

    /**
     * Auhtorize property or parameter property accessible by specific role
     * @param role user role allowed
     */
    role(role: string): (...args: any[]) => void
    role(...roles: string[]): (...args: any[]) => void
    role(...roles: string[]) {
        const modifier = roles.length === 2 && ["get", "set", "all"].some(x => roles[1] === x) ? roles[1] as AccessModifier : undefined
        return this.custom(async (info, location) => {
            const { role, value } = info
            const isAuthorized = roles.some(x => role.some(y => x === y))
            return location === "Parameter" ? !!value && isAuthorized : isAuthorized
        }, modifier, roles.join("|"))
    }
}

const authorize = new AuthDecoratorImpl()

export { authorize, AuthDecoratorImpl }