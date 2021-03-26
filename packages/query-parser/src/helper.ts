import { AuthorizeDecorator, AuthorizerContext, EntityAuthPolicy, executeAuthorizer } from "@plumier/core"
import { Class, generic, reflection } from "@plumier/reflect"

import { QueryParserDecorator } from "./decorator"

const ParserAst = Symbol()

function getDecoratorType(controller: Class, decorator: QueryParserDecorator): Class {
    // extract generic type from controller if string type provided
    const [expType] = reflection.getTypeFromDecorator(decorator)
    return typeof expType === "string" ? generic.getType(decorator, controller) as Class : expType as Class
}

async function isAuthorized(decorators: AuthorizeDecorator[], ctx: AuthorizerContext): Promise<boolean> {
    const authPolicies = ctx.ctx.config.authPolicies.map(x => new x())
    const policies: { decorator: AuthorizeDecorator, isEntityPolicy: boolean }[] = []
    const staticPolicies = []
    // flatten decorator to make each decorator only have one policy
    // and add flag if its an entity policy
    // to make them easily filtered by its flag
    for (const decorator of decorators) {
        for (const policy of decorator.policies) {
            const isEntityPolicy = authPolicies.some(x => x.name === policy && x instanceof EntityAuthPolicy)
            const dec: AuthorizeDecorator = { ...decorator, policies: [policy] }
            if (!isEntityPolicy)
                staticPolicies.push(dec)
            policies.push({ decorator: dec, isEntityPolicy })
        }
    }
    if (policies.every(x => x.isEntityPolicy)) return false
    return executeAuthorizer(staticPolicies, ctx)
}

export { getDecoratorType, ParserAst, isAuthorized }