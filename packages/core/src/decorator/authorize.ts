import { CustomPropertyDecorator, decorate, mergeDecorator } from "@plumier/reflect"

import { AccessModifier, AuthorizeDecorator, Authorizer, AuthorizerFunction, Public } from "../authorization"
import { ApplyToOption, FilterQueryType } from "../types"
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
    custom( policies: string[], opt: CustomAuthorizeOption) {
        const option = { tag: "Custom", evaluation: "Dynamic", ...opt }
        return decorate((...args: any[]) => {
            const location = args.length === 1 ? "Class" : args.length === 2 ? "Method" : "Parameter"
            return <AuthorizeDecorator>{
                type: "plumier-meta:authorize",
                tag: option.tag, policies, location,
                access: option.access, evaluation: option.evaluation,
            }
        }, ["Class", "Parameter", "Method", "Property"], option)
    }

    private byPolicies(policies: any[], access: AccessModifier) {
        const last = policies[policies.length - 1]
        const defaultOpt = { access, methods: [] }
        const opt: AuthorizeSelectorOption = typeof last === "string" ? defaultOpt : { ...defaultOpt, ...last }
        const allPolicies: string[] = typeof last === "string" ? policies : policies.slice(0, policies.length - 1)
        return this.custom(allPolicies, { ...opt, tag: allPolicies.join("|"), evaluation: "Dynamic" })
    }

    /**
     * Authorize controller or action to be accessible by specific policy
     * @param policy Allowed policy
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(policy: string, option?: ApplyToOption): (target: any, name?: string) => void
    /**
     * Authorize controller or action to be accessible by specific policy(s)
     * @param policy1 Allowed policy
     * @param policy2 Allowed policy
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(policy1: string, policy2: string, option?: ApplyToOption): (target: any, name?: string) => void
    /**
     * Authorize controller or action to be accessible by specific policy(s)
     * @param policy1 Allowed policy
     * @param policy2 Allowed policy
     * @param policy3 Allowed policy
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(policy1: string, policy2: string, policy3: string, option?: ApplyToOption): (target: any, name?: string) => void
    /**
     * Authorize controller or action to be accessible by specific policy(s)
     * @param policy1 Allowed policy
     * @param policy2 Allowed policy
     * @param policy3 Allowed policy
     * @param policy4 Allowed policy
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(policy1: string, policy2: string, policy3: string, policy4: string, option?: ApplyToOption): (target: any, name?: string) => void
    /**
     * Authorize controller or action to be accessible by specific policy(s)
     * @param policy1 Allowed policy
     * @param policy2 Allowed policy
     * @param policy3 Allowed policy
     * @param policy4 Allowed policy
     * @param policy5 Allowed policy
     * @param option Selector option. Only for controller scoped authorizer
     */
    route(policy1: string, policy2: string, policy3: string, policy4: string, policy5: string, option?: ApplyToOption): (target: any, name?: string) => void
    route(...policies: any[]) {
        return this.byPolicies(policies, "route")
    }

    /**
     * Authorize domain or entity property only can be retrieved by specific policy
     * @param policies List of allowed policies
     */
    read(...policies: string[]): CustomPropertyDecorator {
        return this.byPolicies(policies, "read")
    }

    /**
     * Authorize domain or entity property only can be set by specific policy
     * @param policies List of allowed policies
     */
    write(...policies: string[]): CustomPropertyDecorator {
        return this.byPolicies(policies, "write")
    }

    /**
     * Authorize a domain property to be used as query string filter
     * @param policies List of allowed policies
     */
    filter(...policies: string[]): CustomPropertyDecorator {
        return this.byPolicies(policies.length == 0 ? ["Authenticated"] : policies, "filter")
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
