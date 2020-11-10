import { CustomPropertyDecorator, decorate, mergeDecorator, DecoratorOption, decorateProperty, decorateClass, decorateMethod } from "tinspector"

import { AccessModifier, AuthorizeDecorator, Authorizer, AuthorizerFunction, EntityPolicyProviderDecorator, EntityProviderQuery, Public } from "../authorization"
import { Class } from '../common'
import { ApplyToOption, errorMessage, FilterQueryType } from "../types"
import { api } from "./api"


type FunctionEvaluation = "Static" | "Dynamic"


interface AuthorizeSelectorOption extends ApplyToOption {
    /**
     * Allow access only to specific modifier
     * 
     * `read`: only allow user to retrieve value on specified field
     * 
     * `write`: only allow user to set value on specified field
     * 
     * `route`: allow user to both set and retrieve value on specified field
     */
    access: AccessModifier,
}

interface CustomAuthorizeOption extends AuthorizeSelectorOption {

    /**
     * Text that will visible on route analysis
     */
    tag?: string,

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

class AuthDecoratorImpl {

    /**
     * Authorize controller or action or property or parameter by specify a custom authorizer logic
     * @param authorize custom authorizer logic
     * @param modifier modifier access (for property and parameter authorizer)
     * @param tag authorizer name visible on route generator
     */
    custom(authorize: symbol | string | AuthorizerFunction | Authorizer | { policies: string[] }, opt: CustomAuthorizeOption) {
        const option = { tag: "Custom", evaluation: "Dynamic", ...opt }
        return decorate((...args: any[]) => {
            const location = args.length === 1 ? "Class" : args.length === 2 ? "Method" : "Parameter"
            return <AuthorizeDecorator>{
                type: "plumier-meta:authorize",
                tag: option.tag, authorize, location,
                access: option.access, evaluation: option.evaluation,
            }
        }, ["Class", "Parameter", "Method", "Property"], option)
    }

    /**
     * Authorize controller or action accessible by public
     */
    public(opt?: ApplyToOption): (target: any, name?: string) => void {
        return this.custom({ policies: [Public] }, { access: "route", tag: Public, ...opt })
    }

    private byRole(roles: any[], access: AccessModifier) {
        const last = roles[roles.length - 1]
        const defaultOpt = { access, methods: [] }
        const opt: AuthorizeSelectorOption = typeof last === "string" ? defaultOpt : { ...defaultOpt, ...last }
        const allRoles: string[] = typeof last === "string" ? roles : roles.slice(0, roles.length - 1)
        return this.custom({ policies: allRoles }, { ...opt, tag: allRoles.join("|"), evaluation: "Dynamic" })
    }

    /**
     * Authorize controller or action to be accessible by specific role
     * @param role Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(role: string, option?: ApplyToOption): (target: any, name?: string) => void
    /**
     * Authorize controller or action to be accessible by specific role(s)
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(role1: string, role2: string, option?: ApplyToOption): (target: any, name?: string) => void
    /**
     * Authorize controller or action to be accessible by specific role(s)
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param role3 Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(role1: string, role2: string, role3: string, option?: ApplyToOption): (target: any, name?: string) => void
    /**
     * Authorize controller or action to be accessible by specific role(s)
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param role3 Allowed role
     * @param role4 Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(role1: string, role2: string, role3: string, role4: string, option?: ApplyToOption): (target: any, name?: string) => void
    /**
     * Authorize controller or action to be accessible by specific role(s)
     * @param role1 Allowed role
     * @param role2 Allowed role
     * @param role3 Allowed role
     * @param role4 Allowed role
     * @param role5 Allowed role
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(role1: string, role2: string, role3: string, role4: string, role5: string, option?: ApplyToOption): (target: any, name?: string) => void
    route(...roles: any[]) {
        return this.byRole(roles, "route")
    }

    /**
     * Authorize entity or parameter or domain property only can be retrieved by specific role
     * @param roles List of allowed roles
     */
    read(...roles: string[]): CustomPropertyDecorator {
        return this.byRole(roles, "read")
    }

    /**
     * Authorize entity  parameter or domain property only can be set by specific role
     * @param roles List of allowed roles
     */
    write(...roles: string[]): CustomPropertyDecorator {
        return this.byRole(roles, "write")
    }

    /**
     * Authorize a domain property to be used as query string filter
     * @param roles List of allowed roles
     */
    filter(...roles: string[]): CustomPropertyDecorator {
        return this.byRole(roles.length == 0 ? ["Authenticated"] : roles, "filter")
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

export { authorize, AuthDecoratorImpl, AuthorizeSelectorOption, FilterAuthorizeOption }
