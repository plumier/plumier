import { ParameterReflection, PropertyReflection, reflect } from "tinspector"

import { Class, hasKeyOf, isCustomClass } from "./common"
import { HttpStatus } from "./http-status"
import {
    ActionContext,
    ActionResult,
    Configuration,
    HttpStatusError,
    Invocation,
    Metadata,
    MetadataImpl,
    Middleware,
    RouteInfo,
    RouteMetadata,
} from "./types"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

interface AuthorizationContext {
    value?: any
    role: string[]
    user: any
    ctx: ActionContext
    metadata: Metadata
}

type AuthorizerFunction = (info: AuthorizationContext, location: "Class" | "Parameter" | "Method") => boolean | Promise<boolean>

interface AuthorizeDecorator {
    type: "plumier-meta:authorize",
    authorize: string | AuthorizerFunction | Authorizer
    access: "get" | "set" | "all"
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

function createDecoratorFilter(predicate: (x: AuthorizeDecorator) => boolean = x => true) {
    return (x: AuthorizeDecorator): x is AuthorizeDecorator => x.type === "plumier-meta:authorize" && predicate(x)
}

function getGlobalDecorators(globalDecorator?: (...args: any[]) => void) {
    if (globalDecorator) {
        @globalDecorator
        class DummyClass { }
        const meta = reflect(DummyClass)
        return meta.decorators.filter(createDecoratorFilter())
    }
    else return []
}

function getAuthorizeDecorators(info: RouteInfo, globalDecorator?: (...args: any[]) => void) {
    const actionDecs = info.action.decorators.filter(createDecoratorFilter())
    if (actionDecs.length > 0) return actionDecs
    const controllerDecs = info.controller.decorators.filter(createDecoratorFilter())
    if (controllerDecs.length > 0) return controllerDecs
    return getGlobalDecorators(globalDecorator)
}


async function createAuthContext(ctx: ActionContext): Promise<AuthorizationContext> {
    const { route, parameters, state, config } = ctx
    const userRoles = await getRole(state.user, config.roleField)
    return <AuthorizationContext>{ role: userRoles, user: state.user, route, ctx, metadata: new MetadataImpl(ctx.parameters, ctx.route, {} as any) }
}

// --------------------------------------------------------------------- //
// ----------------- CONTROLLER OR ACTION AUTHORIZATION ---------------- //
// --------------------------------------------------------------------- //

function fixContext(decorator: AuthorizeDecorator, info: AuthorizerContext) {
    if (decorator.location === "Class") {
        info.metadata.current = info.ctx.route.controller
    }
    if (decorator.location === "Method") {
        info.metadata.current = { ...info.ctx.route.action, parent: info.ctx.route.controller.type }
    }
    return info
}

async function checkUserAccessToRoute(decorators: AuthorizeDecorator[], info: AuthorizationContext) {
    if (decorators.some(x => x.tag === "Public")) return
    if (info.role.length === 0) throw new HttpStatusError(HttpStatus.Forbidden, "Forbidden")
    const conditions = await Promise.all(decorators.map(x => executeDecorator(x, fixContext(x, info))))
    //use OR condition
    //if ALL condition doesn't authorize user then throw
    if (conditions.length > 0 && conditions.every(x => x === false))
        throw new HttpStatusError(HttpStatus.Unauthorized, "Unauthorized")
}


// --------------------------------------------------------------------- //
// ---------------------- PARAMETER AUTHORIZATION ---------------------- //
// --------------------------------------------------------------------- //


async function checkParameter(path: string[], meta: PropertyReflection | ParameterReflection, value: any, info: AuthorizationContext, parent: Class) {
    if (value === undefined) return []
    else if (Array.isArray(meta.type)) {
        const newMeta = { ...meta, type: meta.type[0] };
        const result: string[] = []
        for (let i = 0; i < value.length; i++) {
            const val = value[i];
            result.push(...await checkParameter(path.concat(i.toString()), newMeta, val, info, parent))
        }
        return result
    }
    else if (isCustomClass(meta.type)) {
        const classMeta = reflect(<Class>meta.type)
        const values = classMeta.properties.map(x => value[x.name])
        return checkParameters(path, classMeta.properties, values, info, meta.type)
    }
    else {
        const decorators = meta.decorators.filter(createDecoratorFilter())
        const result: string[] = []
        for (const dec of decorators) {
            if (dec.access === "get") continue;
            info.metadata.current = { ...meta, parent }
            const allowed = await executeDecorator(dec, { ...info, value })
            if (!allowed)
                result.push(path.join("."))
        }
        return result
    }
}

async function checkParameters(path: string[], meta: (PropertyReflection | ParameterReflection)[], value: any[], info: AuthorizationContext, parent: Class) {
    const result: string[] = []
    for (let i = 0; i < meta.length; i++) {
        const prop = meta[i];
        const issues = await checkParameter(path.concat(prop.name), prop, value[i], info, parent)
        result.push(...issues)
    }
    return result
}

async function checkUserAccessToParameters(meta: ParameterReflection[], values: any[], info: AuthorizationContext) {
    const unauthorizedPaths = await checkParameters([], meta, values, info, info.ctx.route.controller.type)
    if (unauthorizedPaths.length > 0)
        throw new HttpStatusError(401, `Unauthorized to populate parameter paths (${unauthorizedPaths.join(", ")})`)
}

// --------------------------------------------------------------------- //
// --------------------------- AUTHORIZATION --------------------------- //
// --------------------------------------------------------------------- //

function updateRouteAuthorizationAccess(routes: RouteMetadata[], config: Configuration) {
    if (config.enableAuthorization) {
        routes.forEach(x => {
            if (x.kind === "ActionRoute") {
                const decorators = getAuthorizeDecorators(x, config.globalAuthorizationDecorators)
                if (decorators.length > 0)
                    x.access = decorators.map(x => x.tag).join("|")
                else
                    x.access = "Authenticated"
            }
        })
    }
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


async function checkAuthorize(ctx: ActionContext) {
    if (ctx.config.enableAuthorization) {
        const { route, parameters, config } = ctx
        const info = await createAuthContext(ctx)
        const decorator = getAuthorizeDecorators(route, config.globalAuthorizationDecorators)
        //check user access
        await checkUserAccessToRoute(decorator, info)
        //if ok check parameter access
        await checkUserAccessToParameters(route.action.parameters, parameters, info)
    }
}


// --------------------------------------------------------------------- //
// ------------------------ AUTHORIZATION FILTER ----------------------- //
// --------------------------------------------------------------------- //

type FilterNode = ArrayNode | ClassNode | ValueNode

interface ValueNode {
    kind: "Value"
}

interface ArrayNode {
    kind: "Array"
    child: FilterNode
}

interface ClassNode {
    kind: "Class"
    properties: { name: string, authorized: boolean, type: FilterNode }[]
}

async function createPropertyNode(prop: PropertyReflection, ctx: ActionContext) {
    const decorators = prop.decorators.filter(createDecoratorFilter(x => x.access === "get" || x.access === "all"))
    const info = await createAuthContext(ctx)
    // if no authorize decorator then always allow to access
    let authorized = decorators.length === 0
    for (const dec of decorators) {
        authorized = await executeDecorator(dec, info)
        if (authorized) break
    }
    return { name: prop.name, authorized }
}

async function compileType(type: Class | Class[], ctx: ActionContext, parentTypes: Class[]): Promise<FilterNode> {
    if (Array.isArray(type)) {
        return { kind: "Array", child: await compileType(type[0], ctx, parentTypes) }
    }
    else if (isCustomClass(type)) {
        // CIRCULAR: just return basic node if circular dependency happened
        if (parentTypes.some(x => x === type)) return { kind: "Class", properties: [] }
        const meta = reflect(type)
        const properties = []
        for (const prop of meta.properties) {
            const propNode = await createPropertyNode(prop, ctx)
            properties.push({ ...propNode, type: await compileType(prop.type, ctx, parentTypes.concat(type)) })
        }
        return { kind: "Class", properties }
    }
    else return { kind: "Value" }
}


function filterType(raw: any, node: FilterNode) {
    if (node.kind === "Array") {
        return raw.map((x: any) => filterType(x, node.child))
    }
    else if (node.kind === "Class") {
        return node.properties.reduce((a, b) => {
            if (b.authorized) {
                a[b.name] = filterType(raw[b.name], b.type)
            }
            return a
        }, {} as any)
    }
    else return raw
}

async function filterResult(raw: ActionResult, ctx: ActionContext): Promise<ActionResult> {
    const type = ctx.route.action.returnType
    if (type !== Promise && type && raw.status === 200 && raw.body) {
        const node = await compileType(type, ctx, [])
        raw.body = filterType(raw.body, node)
        return raw
    }
    else {
        return raw;
    }
}


// --------------------------------------------------------------------- //
// ----------------------------- MIDDLEWARE ---------------------------- //
// --------------------------------------------------------------------- //


class AuthorizerMiddleware implements Middleware {
    async execute(invocation: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        await checkAuthorize(invocation.ctx)
        const result = await invocation.proceed()
        return filterResult(result, invocation.ctx)
    }
}

export {
    AuthorizerFunction, RoleField, Authorizer, checkAuthorize, AuthorizeDecorator,
    getAuthorizeDecorators, updateRouteAuthorizationAccess, AuthorizerMiddleware,
    CustomAuthorizer, CustomAuthorizerFunction, AuthorizationContext, AuthorizerContext
}