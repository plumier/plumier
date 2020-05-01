import { decorate } from "tinspector"

import { AuthorizerFunction, AuthorizeDecorator, Authorizer } from "./authorization"
import { errorMessage } from "./types"

type AccessModifier = "get" | "set" | "all"
interface AuthorizeOption { access: AccessModifier, role: string | string[] }

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
    role(option: AuthorizeOption): PropertyDecorator | ParameterDecorator

    /**
     * Auhtorize property or parameter property accessible by specific role
     * @param role user role allowed
     */
    role(role: string): (...args: any[]) => void
    role(...roles: string[]): (...args: any[]) => void
    role(option: AuthorizeOption | string, ...roles: string[]) {
        const allRoles = typeof option === "string" ? [option, ...roles] : Array.isArray(option.role) ? option.role : [option.role]
        const modifier = typeof option === 'string' ? "all" : option.access
        return this.custom(async (info, location) => {
            const { role, value } = info
            const isAuthorized = allRoles.some(x => role.some(y => x === y))
            return location === "Parameter" ? !!value && isAuthorized : isAuthorized
        }, modifier, allRoles.join("|"))
    }
}

const authorize = new AuthDecoratorImpl()

export { authorize, AuthDecoratorImpl }