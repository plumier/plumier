import { ParameterReflection, PropertyReflection, reflect } from "tinspector"

import { Class, hasKeyOf, isCustomClass } from "./common"
import { HttpStatus } from "./http-status"
import { ActionContext, ActionResult, Configuration, HttpStatusError, Invocation, Middleware, RouteInfo } from "./types"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface AuthorizationContext {
    value?: any
    role: string[]
    user: any
    ctx: ActionContext
}

type AuthorizerFunction = (info: AuthorizationContext, location: "Class" | "Parameter" | "Method") => boolean | Promise<boolean>

interface AuthorizeDecorator {
    type: "plumier-meta:authorize",
    authorize: string | AuthorizerFunction | Authorizer
    tag: string,
    location: "Class" | "Parameter" | "Method"
}

interface Authorizer {
    authorize(info: AuthorizationContext, location: "Class" | "Parameter" | "Method"): boolean | Promise<boolean>
}

type CustomAuthorizer = Authorizer
type CustomAuthorizerFunction = AuthorizerFunction
type AuthorizerContext = AuthorizationContext

type RoleField = string | ((value: any) => Promise<string[]>)


/* ------------------------------------------------------------------------------- */
/* ------------------------------- HELPERS --------------------------------------- */
/* ------------------------------------------------------------------------------- */

function executeDecorator(decorator: AuthorizeDecorator, info: AuthorizationContext) {
    const authorize = decorator.authorize
    let instance: Authorizer
    if (typeof authorize === "function")
        instance = { authorize }
    else if (hasKeyOf<Authorizer>(authorize, "authorize"))
        instance = authorize
    else
        instance = info.ctx.config.dependencyResolver.resolve(authorize)
    return instance.authorize(info, decorator.location)
}

function isAuthDecorator(decorator: AuthorizeDecorator) {
    return decorator.type === "plumier-meta:authorize"
}

function getGlobalDecorators(globalDecorator?: (...args: any[]) => void) {
    if (globalDecorator) {
        @globalDecorator
        class DummyClass { }
        const meta = reflect(DummyClass)
        return meta.decorators.filter((x): x is AuthorizeDecorator => isAuthDecorator(x))
    }
    else return []
}

function getAuthorizeDecorators(info: RouteInfo, globalDecorator?: (...args: any[]) => void) {
    const actionDecs = info.action.decorators.filter((x: any): x is AuthorizeDecorator => isAuthDecorator(x))
    if (actionDecs.length > 0) return actionDecs
    const controllerDecs = info.controller.decorators.filter((x: any): x is AuthorizeDecorator => isAuthDecorator(x))
    if (controllerDecs.length > 0) return controllerDecs
    return getGlobalDecorators(globalDecorator)
}

async function checkParameter(path: string[], meta: PropertyReflection | ParameterReflection, value: any, info: AuthorizationContext) {
    if (value === undefined) return []
    else if (Array.isArray(meta.type)) {
        const newMeta = { ...meta, type: meta.type[0] };
        const result: string[] = []
        for (let i = 0; i < value.length; i++) {
            const val = value[i];
            result.push(...await checkParameter(path.concat(i.toString()), newMeta, val, info))
        }
        return result
    }
    else if (isCustomClass(meta.type)) {
        const classMeta = reflect(<Class>meta.type)
        const values = classMeta.properties.map(x => value[x.name])
        return checkParameters(path, classMeta.properties, values, info)
    }
    else {
        const decorators = meta.decorators.filter((x): x is AuthorizeDecorator => isAuthDecorator(x))
        const result: string[] = []
        for (const dec of decorators) {
            if (!await executeDecorator(dec, { ...info, value }))
                result.push(path.join("."))
        }
        return result
    }
}

async function checkParameters(path: string[], meta: (PropertyReflection | ParameterReflection)[], value: any[], info: AuthorizationContext) {
    const result: string[] = []
    for (let i = 0; i < meta.length; i++) {
        const prop = meta[i];
        const issues = await checkParameter(path.concat(prop.name), prop, value[i], info)
        result.push(...issues)
    }
    return result
}


async function checkUserAccessToRoute(decorators: AuthorizeDecorator[], info: AuthorizationContext) {
    if (decorators.some(x => x.tag === "Public")) return
    if (info.role.length === 0) throw new HttpStatusError(HttpStatus.Forbidden, "Forbidden")
    const conditions = await Promise.all(decorators.map(x => executeDecorator(x, info)))
    //use OR condition
    //if ALL condition doesn't authorize user then throw
    if (conditions.length > 0 && conditions.every(x => x === false))
        throw new HttpStatusError(HttpStatus.Unauthorized, "Unauthorized")
}

async function checkUserAccessToParameters(meta: ParameterReflection[], values: any[], info: AuthorizationContext) {
    const unauthorizedPaths = await checkParameters([], meta, values, info)
    if (unauthorizedPaths.length > 0)
        throw new HttpStatusError(401, `Unauthorized to populate parameter paths (${unauthorizedPaths.join(", ")})`)
}

async function getRole(user: any, roleField: RoleField): Promise<string[]> {
    if (!user) return []
    if (typeof roleField === "function")
        return await roleField(user)
    else {
        const role = user[roleField]
        return Array.isArray(role) ? role : [role]
    }
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN IMPLEMENTATION ------------------------------- */
/* ------------------------------------------------------------------------------- */

function updateRouteAuthorizationAccess(routes: RouteInfo[], config: Configuration) {
    if (config.enableAuthorization) {
        routes.forEach(x => {
            const decorators = getAuthorizeDecorators(x, config.globalAuthorizationDecorators)
            if (decorators.length > 0)
                x.access = decorators.map(x => x.tag).join("|")
            else
                x.access = "Authenticated"
        })
    }
}

async function checkAuthorize(ctx: ActionContext) {
    if (ctx.config.enableAuthorization) {
        const { route, parameters, state, config } = ctx
        const decorator = getAuthorizeDecorators(route, config.globalAuthorizationDecorators)
        const userRoles = await getRole(state.user, config.roleField)
        const info = <AuthorizationContext>{ role: userRoles, user: state.user, route, ctx }
        //check user access
        await checkUserAccessToRoute(decorator, info)
        //if ok check parameter access
        await checkUserAccessToParameters(route.action.parameters, parameters, info)
    }
}

class AuthorizerMiddleware implements Middleware {
    async execute(invocation: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        await checkAuthorize(invocation.ctx)
        return invocation.proceed()
    }
}

export {
    AuthorizerFunction, RoleField, Authorizer, checkAuthorize, AuthorizeDecorator,
    getAuthorizeDecorators, updateRouteAuthorizationAccess, AuthorizerMiddleware, 
    CustomAuthorizer, CustomAuthorizerFunction, AuthorizationContext, AuthorizerContext
}