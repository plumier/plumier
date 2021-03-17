import { AuthorizeDecorator, AuthorizerContext, authPolicy, AuthPolicy, EntityAuthPolicy, executeAuthorizer } from "@plumier/core"
import { Class, generic } from "@plumier/reflect"


const ParserAst = Symbol()

function getDecoratorType(controller: Class, expType: string | Class) {
    // extract generic type from controller if string type provided
    return typeof expType === "string" ? generic.getGenericType(controller, expType) as Class : expType
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