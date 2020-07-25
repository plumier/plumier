import { CustomPropertyDecorator, decorate, mergeDecorator } from "tinspector"

import { AuthorizeDecorator, Authorizer, AuthorizerFunction } from "../authorization"
import { errorMessage } from "../types"
import { api } from "./api"


type AccessModifier = "get" | "set" | "all"
type FunctionEvaluation = "Static" | "Dynamic"
interface CustomAuthorizeOption {
    /**
     * Filter authorizer into specific method(s), only work on controller scoped authorizer
     */
    selector?: string | string[],

    /**
     * Text that will visible on route analysis
     */
    tag?: string,

    /**
     * Allow access only to specific modifier, only work on Parameter authorization and Filter authorization
     * 
     * `get`: only allow user to retrieve value on specified field
     * 
     * `set`: only allow user to set value on specified field
     * 
     * `all`: allow user to both set and retrieve value on specified field
     */
    access?: AccessModifier,

    /**
     * Specify how the authorizer execution will evaluated during response serialization. Only work on Filter authorization
     * 
     * `Static` will evaluated once for each properties applied. Good for performance, but unable to access current property value 
     * 
     * `Dynamic` will evaluated on every property serialization. Good for authorization require check to specific property value
     */
    evaluation?: FunctionEvaluation
}

interface AuthorizeSelectorOption {
    /**
     * Filter authorizer into specific method(s), only work on controller scoped authorizer
     */
    selector: string | string[]
}

class AuthDecoratorImpl {

    /**
     * Authorize controller or action or property or parameter by specify a custom authorizer logic
     * @param authorize custom authorizer logic
     * @param modifier modifier access (for property and parameter authorizer)
     * @param tag authorizer name visible on route generator
     */
    custom(authorize: symbol | string | AuthorizerFunction | Authorizer, tag: string | CustomAuthorizeOption = "Custom") {
        return decorate((...args: any[]) => {
            const option = typeof tag === "string" ? { tag, access: "all", evaluation: "Dynamic" } : { tag: "Custom", access: "all", evaluation: "Dynamic", ...tag }
            const location = args.length === 1 ? "Class" : args.length === 2 ? "Method" : "Parameter"
            return <AuthorizeDecorator>{
                type: "plumier-meta:authorize",
                tag: option.tag, authorize, location,
                access: option.access, evaluation: option.evaluation,
                selector: option.selector ?? []
            }
        }, ["Class", "Parameter", "Method", "Property"])
    }

    /**
     * Authorize controller or action accessible by public
     */
    public(opt?: AuthorizeSelectorOption) {
        return decorate((...args: any[]) => {
            if (args.length === 3 && typeof args[2] === "number")
                throw new Error(errorMessage.PublicNotInParameter)
            return <AuthorizeDecorator>{
                type: "plumier-meta:authorize",
                tag: "Public",
                evaluation: "Static",
                selector: opt?.selector ?? []
            }
        }, ["Class", "Parameter", "Method", "Property"])
    }

    private byRole(roles: any[], access: "all" | "get" | "set") {
        const last = roles[roles.length - 1]
        const defaultOpt = { access, methods: [] }
        const opt: AuthorizeSelectorOption = typeof last === "string" ? defaultOpt : { ...defaultOpt, ...last }
        const allRoles: string[] = typeof last === "string" ? roles : roles.slice(0, roles.length - 1)
        return this.custom(async (info) => {
            return allRoles.filter(x => !!x).some(x => info.role.some(y => x === y))
        }, { ...opt, tag: roles.join("|"), evaluation: "Static" })
    }

    /**
     * Authorize controller, action, parameter or domain property to be accessible by specific role
     * @param role Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    role(role: string, option?: AuthorizeSelectorOption): (...args: any[]) => void
    /**
     * Authorize controller, action, parameter or domain property to be accessible by specific role(s)
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    role(role1: string, role2: string, option?: AuthorizeSelectorOption): (...args: any[]) => void
    /**
     * Authorize controller, action, parameter or domain property to be accessible by specific role(s)
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param role3 Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    role(role1: string, role2: string, role3: string, option?: AuthorizeSelectorOption): (...args: any[]) => void
    /**
     * Authorize controller, action, parameter or domain property to be accessible by specific role(s)
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param role3 Allowed role
     * @param role4 Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    role(role1: string, role2: string, role3: string, role4: string, option?: AuthorizeSelectorOption): (...args: any[]) => void
    /**
     * Authorize controller, action, parameter or domain property to be accessible by specific role(s)
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param role3 Allowed role
     * @param role4 Allowed role
     * @param role5 Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    role(role1: string, role2: string, role3: string, role4: string, role5: string, option?: AuthorizeSelectorOption): (...args: any[]) => void
    role(...roles: any[]) {
        return this.byRole(roles, "all")
    }

    /**
     * Authorize parameter or domain property only can be retrieved by specific role
     * @param role List of allowed roles
     */
    get(...roles: string[]): CustomPropertyDecorator {
        return this.byRole(roles, "get")
    }

    /**
     * Authorize parameter or domain property only can be set by specific role
     * @param role List of allowed role
     */
    set(...roles: string[]): CustomPropertyDecorator {
        return this.byRole(roles, "set")
    }

    /**
     * Mark parameter or property as readonly, no Role can set its value
     */
    readonly(): CustomPropertyDecorator {
        return mergeDecorator(this.set("plumier::readonly"), api.readonly())
    }

    /**
     * Mark parameter or property as writeonly, no Role can read its value
     */
    writeonly(): CustomPropertyDecorator {
        return mergeDecorator(this.get("plumier::writeonly"), api.writeonly())
    }
}

const authorize = new AuthDecoratorImpl()


export { authorize, AuthDecoratorImpl }
