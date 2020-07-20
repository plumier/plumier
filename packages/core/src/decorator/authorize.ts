import { decorate, CustomPropertyDecorator, mergeDecorator } from "tinspector"

import { AuthorizerFunction, AuthorizeDecorator, Authorizer } from "../authorization"
import { errorMessage } from "../types"
import { api } from './api'

type AccessModifier = "get" | "set" | "all"
type FunctionEvaluation = "Static" | "Dynamic"
interface AuthorizeOption { access: AccessModifier, role: string | string[] }

class AuthDecoratorImpl {

    /**
     * Authorize controller or action or property or parameter and specify the custom logic
     * @param authorize custom authorizer
     * @param modifier modifier access (for property and parameter authorizer)
     * @param tag authorizer name visible on route generator
     */
    custom(authorize: symbol | string | AuthorizerFunction | Authorizer, tag: string | { tag?: string, access?: AccessModifier, evaluation?: FunctionEvaluation } = "Custom") {
        return decorate((...args: any[]) => {
            const option = typeof tag === "string" ? { tag, access: "all", evaluation: "Dynamic" } : { tag: "Custom", access: "all", evaluation: "Dynamic", ...tag }
            const location = args.length === 1 ? "Class" : args.length === 2 ? "Method" : "Parameter"
            return <AuthorizeDecorator>{
                type: "plumier-meta:authorize", tag: option.tag, authorize, location, access: option.access, evaluation: option.evaluation
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
            return <AuthorizeDecorator>{ type: "plumier-meta:authorize", tag: "Public", evaluation: "Static" }
        }, ["Class", "Parameter", "Method", "Property"])
    }

    /**
     * Authorize property or parameter property accessible by specific role with access control
     * @param role user role allowed
     * @param modifier access kind
     */
    role(option: AuthorizeOption): CustomPropertyDecorator

    /**
     * Authorize property or parameter property accessible by specific role
     * @param role user role allowed
     */
    role(role: string): (...args: any[]) => void
    role(...roles: string[]): (...args: any[]) => void
    role(option: AuthorizeOption | string, ...roles: string[]) {
        const allRoles = typeof option === "string" ? [option, ...roles] : Array.isArray(option.role) ? option.role : [option.role]
        const access = typeof option === 'string' ? "all" : option.access
        return this.custom(async (info) => {
            return allRoles.some(x => info.role.some(y => x === y))
        }, { access, tag: allRoles.join("|"), evaluation: "Static" })
    }

    /**
     * Authorize role to access property of a domain
     * @param roles Roles allowed
     */
    get(...roles: string[]) {
        return this.role({ access: "get", role: roles })
    }

    /**
     * Authorize role to set property of a domain
     * @param roles Roles allowed
     */
    set(...roles: string[]) {
        return this.role({ access: "set", role: roles })
    }

    /**
     * Mark parameter or property as readonly, no Role can set its value
     */
    readonly() {
        return mergeDecorator(this.set("plumier::readonly"), api.readOnly()) as CustomPropertyDecorator
    }

    /**
      * Mark parameter or property as writeonly, no Role can read its value
      */
    writeonly() {
        return mergeDecorator(this.get("plumier::writeonly"), api.writeOnly()) as CustomPropertyDecorator
    }
}

const authorize = new AuthDecoratorImpl()

export { authorize, AuthDecoratorImpl }