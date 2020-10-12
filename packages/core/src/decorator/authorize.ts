import { CustomPropertyDecorator, decorate, mergeDecorator, DecoratorOption, decorateProperty } from "tinspector"

import { AuthorizeDecorator, Authorizer, AuthorizerFunction } from "../authorization"
import { errorMessage, FilterQueryType } from "../types"
import { api } from "./api"


type AccessModifier = "read" | "write" | "all" | "filter"
type FunctionEvaluation = "Static" | "Dynamic"

interface AuthorizeSelectorOption {
    /**
     * Apply authorizer into specific action, only work on controller scoped authorizer.
     * 
     * Should specify a correct action name(s)
     */
    applyTo?: string | string[]
}

interface CustomAuthorizeOption extends AuthorizeSelectorOption {

    /**
     * Text that will visible on route analysis
     */
    tag?: string,

    /**
     * Allow access only to specific modifier
     * 
     * `read`: only allow user to retrieve value on specified field
     * 
     * `write`: only allow user to set value on specified field
     * 
     * `all`: allow user to both set and retrieve value on specified field
     */
    access?: AccessModifier,

    /**
     * Specify how the authorizer execution will evaluated during response serialization
     * 
     * `Static` will evaluated once for each properties applied. Good for performance, but unable to access current property value 
     * 
     * `Dynamic` will evaluated on every property serialization. Good for authorization require check to specific property value
     */
    evaluation?: FunctionEvaluation
}

interface FilterAuthorizeOption {
    type?: FilterQueryType
    default?: any
}

interface FilterDecorator {
    kind: "plumier-meta:filter",
    type: FilterQueryType
    default?: any
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
            }
        }, ["Class", "Parameter", "Method", "Property"], typeof tag === "string" ? { applyTo: [] } : { ...tag })
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
                access: "all"
            }
        }, ["Class", "Parameter", "Method", "Property"], { ...opt })
    }

    private byRole(roles: any[], access: AccessModifier) {
        const last = roles[roles.length - 1]
        const defaultOpt = { access, methods: [] }
        const opt: AuthorizeSelectorOption = typeof last === "string" ? defaultOpt : { ...defaultOpt, ...last }
        const allRoles: string[] = typeof last === "string" ? roles : roles.slice(0, roles.length - 1)
        return this.custom(async (info) => {
            return allRoles.filter(x => !!x).some(x => info.role.some(y => x === y))
        }, { ...opt, tag: allRoles.join("|"), evaluation: "Static" })
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
     * Authorize entity or parameter or domain property only can be retrieved by specific role
     * @param role List of allowed roles
     */
    read(...roles: string[]) {
        return this.byRole(roles, "read")
    }

    /**
     * Authorize entity  parameter or domain property only can be set by specific role
     * @param role List of allowed role
     */
    write(...roles: string[]) {
        return this.byRole(roles, "write")
    }

    /**
     * Authorize domain property to allow filter by specific role
     * @param role Allowed role
     * @param option filter type option
     */
    filter(option?: FilterAuthorizeOption): CustomPropertyDecorator

    /**
     * Authorize domain property to allow filter by specific role
     * @param role Allowed role
     * @param option filter type option
     */
    filter(role: string, option?: FilterAuthorizeOption): CustomPropertyDecorator
    /**
     * Authorize domain property to allow filter by specific role
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param option filter type option
     */
    filter(role1: string, role2: string, option?: FilterAuthorizeOption): CustomPropertyDecorator
    /**
     * Authorize domain property to allow filter by specific role
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param role3 Allowed role
     * @param option filter type option
     */
    filter(role1: string, role2: string, role3: string, option?: FilterAuthorizeOption): CustomPropertyDecorator
    /**
     * Authorize domain property to allow filter by specific role
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param role3 Allowed role
     * @param role4 Allowed role
     * @param option filter type option
     */
    filter(role1: string, role2: string, role3: string, role4: string, option?: FilterAuthorizeOption): CustomPropertyDecorator
    /**
     * Authorize domain property to allow filter by specific role
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param role3 Allowed role
     * @param role4 Allowed role
     * @param role5 Allowed role
     * @param option filter type option
     */
    filter(role1: string, role2: string, role3: string, role4: string, role5: string, option?: FilterAuthorizeOption): CustomPropertyDecorator
    filter(...roles: any[]): CustomPropertyDecorator {
        const last = roles[roles.length - 1]
        const option: FilterAuthorizeOption = typeof last === "string" ? { type: "exact" } : { type: last?.type ?? "exact", ...last }
        return mergeDecorator(
            this.byRole(roles, "filter"),
            decorateProperty(<FilterDecorator>{ kind: "plumier-meta:filter", ...option })
        )
    }

    /**
     * Mark parameter or property as readonly, no Role can set its value
     */
    readonly(): CustomPropertyDecorator {
        return mergeDecorator(this.write("plumier::readonly"), api.readonly())
    }

    /**
     * Mark parameter or property as writeonly, no Role can read its value
     */
    writeonly(): CustomPropertyDecorator {
        return mergeDecorator(this.read("plumier::writeonly"), api.writeonly())
    }
}

const authorize = new AuthDecoratorImpl()


export { authorize, AuthDecoratorImpl, AuthorizeSelectorOption, FilterDecorator, FilterAuthorizeOption }
