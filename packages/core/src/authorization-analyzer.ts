import { reflect } from "@plumier/reflect"
import { AuthorizeDecorator, EntityAuthPolicy, EntityPolicyProviderDecorator, getRouteAuthorizeDecorators } from "./authorization"

import { Class, isCustomClass } from "./common"
import {
    AccessModifier,
    AuthorizationContext,
    Authorizer,
    AuthPolicy,
    Configuration,
    RouteAnalyzerFunction,
    RouteAnalyzerIssue,
    RouteInfo,
    RouteMetadata,
} from "./types"

type PolicyInfoType = "Mistyped" | "EntityPolicy" | "AuthPolicy"

interface PolicyInfo {
    name: string;
    access: AccessModifier;
    decoratorTarget: Class<any>;
    type: PolicyInfoType;
    entity?: Class;
}

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

function getEntityProvider(route: RouteInfo) {
    const entityProvider: EntityPolicyProviderDecorator | undefined = route.action.decorators.find((x: EntityPolicyProviderDecorator) => x.kind === "plumier-meta:entity-policy-provider")
    return entityProvider?.entity
}

function getPolicyInfo(authDecorators: AuthorizeDecorator[], registeredPolicy: AuthPolicy[]) {
    const getType = (name: string): { type: PolicyInfoType, entity?: Class } => {
        const pol = registeredPolicy.find(x => x.name === name)
        if (!pol) return { type: "Mistyped" }
        if (pol instanceof EntityAuthPolicy) return { type: "EntityPolicy", entity: pol.entity }
        return { type: "AuthPolicy" }
    }
    const result: PolicyInfo[] = []
    for (const item of authDecorators) {
        result.push(...item.policies.map(x => ({
            ...getType(x),
            name: x,
            access: item.access,
            decoratorTarget: item.appliedClass,
        })))
    }
    return result
}

function getMistypedMultiple(params: { decorators: any[], name: string }[], registeredPolicy: AuthPolicy[], predicate: (x: PolicyInfo) => boolean) {
    const messages = []
    for (const par of params) {
        const decs = par.decorators.filter((x: AuthorizeDecorator) => x.type === "plumier-meta:authorize")
        const mistyped = getPolicyInfo(decs, registeredPolicy)
            .filter(predicate)
            .map(x => x.name)
        if (mistyped.length > 0)
            messages.push({ name: par.name, mistyped: mistyped.join(", ") })
    }
    return messages
}

// --------------------------------------------------------------------- //
// ------------------------ MISTYPED AUTH POLICY ----------------------- //
// --------------------------------------------------------------------- //

function checkMistypedPoliciesOnRoute(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const authDecorators = getRouteAuthorizeDecorators(route, globalAuthorize)
    const mistyped = getPolicyInfo(authDecorators, policies)
        .filter(x => x.type === "Mistyped")
        .map(x => x.name)
    return mistyped.length > 0 ? [{ type: "error", message: `Route uses unknown authorization policy ${mistyped.join(", ")}` }] : []
}

function checkMistypedPoliciesOnParameters(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const mistyped = getMistypedMultiple(route.action.parameters, policies, x => x.type === "Mistyped")
    return mistyped.map(x => ({ type: "error", message: `Parameter ${x.name} uses unknown authorization policy ${x.mistyped}` }))
}

function checkMistypePoliciesOnModel(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const messages: RouteAnalyzerIssue[] = []
    for (const par of route.action.parameters) {
        const type: Class = Array.isArray(par.type) ? par.type[0] : par.type
        if (isCustomClass(type)) {
            const meta = reflect(type)
            const mistyped = getMistypedMultiple(meta.properties, policies, x => x.type === "Mistyped")
            messages.push(...mistyped.map(x => <RouteAnalyzerIssue>({
                type: "error",
                message: `Model property ${type.name}.${x.name} uses unknown authorization policy ${x.mistyped}`
            })))
        }
    }
    return messages
}

function checkMistypePoliciesOnReturnValue(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const type: Class = Array.isArray(route.action.returnType) ? route.action.returnType[0] : route.action.returnType
    if (isCustomClass(type)) {
        const meta = reflect(type)
        const mistyped = getMistypedMultiple(meta.properties, policies, x => x.type === "Mistyped")
        return mistyped.map(x => <RouteAnalyzerIssue>({
            type: "error",
            message: `Return type property ${type.name}.${x.name} uses unknown authorization policy ${x.mistyped}`
        }))
    }
    return []
}

// --------------------------------------------------------------------- //
// ------------------- APPLIED ON NON ENTITY PROVIDER ------------------ //
// --------------------------------------------------------------------- //

function checkMissingEntityProviderOnRoute(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const authDecorators = getRouteAuthorizeDecorators(route, globalAuthorize)
    const provider = getEntityProvider(route)
    if (!!provider) return []
    const infos = getPolicyInfo(authDecorators, policies)
        .filter(x => x.type === "EntityPolicy" && x.access === "route")
        .map(x => x.name)
    return infos.length > 0 ? [{ type: "error", message: `Entity policy ${infos.join(", ")} applied on non entity provider` }] : []
}

function checkMissingEntityProviderOnParameters(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const provider = getEntityProvider(route)
    if (!!provider) return []
    const result: RouteAnalyzerIssue[] = []
    for (const par of route.action.parameters) {
        const decs = par.decorators.filter((x: AuthorizeDecorator) => x.type === "plumier-meta:authorize")
        const infos = getPolicyInfo(decs, policies).filter(x => x.type === "EntityPolicy" && x.access === "write")
        if (infos.length > 0)
            result.push({ type: "error", message: `Entity policy ${infos.map(x => x.name).join(", ")} applied on non entity provider parameter ${par.name}` })
    }
    return result
}

function checkMissingEntityProviderOnModel(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const provider = getEntityProvider(route)
    if (!!provider) return []
    const result: RouteAnalyzerIssue[] = []
    for (const par of route.action.parameters) {
        const type: Class = Array.isArray(par.type) ? par.type[0] : par.type
        if (isCustomClass(type)) {
            const meta = reflect(type)
            for (const prop of meta.properties) {
                const decs = prop.decorators.filter((x: AuthorizeDecorator) => x.type === "plumier-meta:authorize")
                const infos = getPolicyInfo(decs, policies).filter(x => x.type === "EntityPolicy" && x.access === "write")
                if (infos.length > 0)
                    result.push({ type: "error", message: `Entity policy ${infos.map(x => x.name).join(", ")} applied on non entity provider model ${type.name}.${prop.name}` })
            }
        }
    }
    return result
}


// --------------------------------------------------------------------- //
// ----------------------- MISSING ENTITY POLICY ----------------------- //
// --------------------------------------------------------------------- //

function missingEntityPolicyErrorMessage(policies: PolicyInfo[], provider: Class, location?: string): RouteAnalyzerIssue {
    const loc = location ? ` on ${location}` : ""
    return { type: "error", message: `Entity policy ${policies.map(x => x.name).join(", ")} for entity ${provider.name} ${policies.length === 1 ? "is" : "are"} not found${loc}` }
}

function checkMissingEntityPolicyOnRoute(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const authDecorators = getRouteAuthorizeDecorators(route, globalAuthorize)
    const provider = getEntityProvider(route)
    if (!provider) return []
    const infos = getPolicyInfo(authDecorators, policies)
        .filter(x => x.type === "EntityPolicy" && x.access === "route")
    return infos.length > 0 && infos.every(x => x.entity !== provider) ? [missingEntityPolicyErrorMessage(infos, provider)] : []
}

function checkMissingEntityPolicyOnParameters(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const provider = getEntityProvider(route)
    if (!provider) return []
    const result: RouteAnalyzerIssue[] = []
    for (const par of route.action.parameters) {
        const decs = par.decorators.filter((x: AuthorizeDecorator) => x.type === "plumier-meta:authorize")
        const infos = getPolicyInfo(decs, policies).filter(x => x.type === "EntityPolicy" && x.access === "write")
        if (infos.length > 0 && infos.every(x => x.entity !== provider))
            result.push(missingEntityPolicyErrorMessage(infos, provider, `parameter ${par.name}`))
    }
    return result
}

function checkMissingEntityPolicyOnModel(route: RouteInfo, policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerIssue[] {
    const provider = getEntityProvider(route)
    if (!provider) return []
    const result: RouteAnalyzerIssue[] = []
    for (const par of route.action.parameters) {
        const type: Class = Array.isArray(par.type) ? par.type[0] : par.type
        if (isCustomClass(type)) {
            const meta = reflect(type)
            for (const prop of meta.properties) {
                const decs = prop.decorators.filter((x: AuthorizeDecorator) => x.type === "plumier-meta:authorize")
                const infos = getPolicyInfo(decs, policies).filter(x => x.type === "EntityPolicy" && x.access === "write")
                if (infos.length > 0 && infos.every(x => x.entity !== provider))
                    result.push(missingEntityPolicyErrorMessage(infos, provider, `model property ${type.name}.${prop.name}`))
            }
        }
    }
    return result
}

// --------------------------------------------------------------------- //
// ----------------------------- ANALYZERS ----------------------------- //
// --------------------------------------------------------------------- //

function updateRouteAuthorizationAccess(routes: RouteMetadata[], config: Configuration) {
    routes.forEach(x => {
        if (x.kind === "ActionRoute") {
            const decorators = getRouteAuthorizeDecorators(x, config.globalAuthorizations)
            x.access = decorators.map(x => x.tag).join("|")
        }
    })
}

function analyzeAuthPolicyNameConflict(policies: Class<AuthPolicy>[]) {
    for (let i = 0; i < policies.length - 1; i++) {
        const policy = new policies[i]();
        const nextI = i + 1;
        for (let j = nextI; j < policies.length; j++) {
            const next = new policies[j]();
            if (policy.conflict(next))
                throw new Error(`There are more than one authorization policies named ${policy.name}`)
        }
    }
}

function createAuthorizationAnalyzer(policies: AuthPolicy[], globalAuthorize?: string | string[]): RouteAnalyzerFunction[] {
    const analyzers = [
        // auth policy
        checkMistypedPoliciesOnRoute,
        checkMistypedPoliciesOnParameters,
        checkMistypePoliciesOnModel,
        checkMistypePoliciesOnReturnValue,
        // missing entity provider
        checkMissingEntityProviderOnRoute,
        checkMissingEntityProviderOnParameters,
        checkMissingEntityProviderOnModel,
        // missing entity policy
        checkMissingEntityPolicyOnRoute,
        checkMissingEntityPolicyOnParameters,
        checkMissingEntityPolicyOnModel,
    ]
    return analyzers.map(analyser => (info: RouteMetadata) => info.kind === "VirtualRoute" ? [] : analyser(info, policies, globalAuthorize));
}


export {
    Authorizer, updateRouteAuthorizationAccess, AuthorizationContext,
    AccessModifier, AuthPolicy, analyzeAuthPolicyNameConflict,
    createAuthorizationAnalyzer, getPolicyInfo
}

