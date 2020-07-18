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
import { authorize } from './decorator/authorize'


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type AuthorizerType = "Route" | "Filter" | "Parameter"
interface AuthorizationContext {
    value?: any
    parentValue?: any
    role: string[]
    user: any
    ctx: ActionContext
    metadata: Metadata
    type: AuthorizerType
}

type AuthorizerFunction = (info: AuthorizationContext, location: "Class" | "Parameter" | "Method") => boolean | Promise<boolean>

interface AuthorizeDecorator {
    type: "plumier-meta:authorize",
    authorize: string | AuthorizerFunction | Authorizer
    access: "get" | "set" | "all"
    tag: string,
    location: "Class" | "Parameter" | "Method",
    // only applied on authorize filter
    // static -> authorize function evaluate once then applied through all data 
    // dynamic -> authorize function evaluate on each data
    evaluation: "Static" | "Dynamic"
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

function createAuthorizer(decorator: AuthorizeDecorator, info: AuthorizationContext): Authorizer {
    const authorize = decorator.authorize
    if (typeof authorize === "function")
        return { authorize }
    else if (hasKeyOf<Authorizer>(authorize, "authorize"))
        return authorize
    else
        return info.ctx.config.dependencyResolver.resolve(authorize)
}

function executeDecorator(decorator: AuthorizeDecorator, info: AuthorizationContext) {
    const instance = createAuthorizer(decorator, info)
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


async function createAuthContext(ctx: ActionContext, type: AuthorizerType): Promise<AuthorizationContext> {
    const { route, parameters, state, config } = ctx
    const userRoles = await getRole(state.user, config.roleField)
    return <AuthorizationContext>{
        role: userRoles, user: state.user, route, ctx, type,
        metadata: new MetadataImpl(ctx.parameters, ctx.route, {} as any),
    }
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

interface ParamCheckContext {
    path: string[]
    info: AuthorizationContext
    parent: Class
    parentValue?: any
}

async function checkParameter(meta: PropertyReflection | ParameterReflection, value: any, ctx: ParamCheckContext) {
    if (value === undefined) return []
    else if (Array.isArray(meta.type)) {
        const newMeta = { ...meta, type: meta.type[0] };
        const result: string[] = []
        for (let i = 0; i < value.length; i++) {
            const val = value[i];
            result.push(...await checkParameter(newMeta, val, { ...ctx, path: ctx.path.concat(i.toString()) }))
        }
        return result
    }
    else if (isCustomClass(meta.type)) {
        const classMeta = reflect(<Class>meta.type)
        const values = classMeta.properties.map(x => value[x.name])
        return checkParameters(classMeta.properties, values, { ...ctx, parent: meta.type, parentValue: value })
    }
    else {
        const decorators = meta.decorators.filter(createDecoratorFilter())
        const result: string[] = []
        for (const dec of decorators) {
            if (dec.access === "get") continue;
            ctx.info.metadata.current = { ...meta, parent: ctx.parent }
            const allowed = await executeDecorator(dec, { ...ctx.info, value, parentValue: ctx.parentValue })
            if (!allowed)
                result.push(ctx.path.join("."))
        }
        return result
    }
}

async function checkParameters(meta: (PropertyReflection | ParameterReflection)[], value: any[], ctx: ParamCheckContext) {
    const result: string[] = []
    for (let i = 0; i < meta.length; i++) {
        const prop = meta[i];
        const issues = await checkParameter(prop, value[i], { ...ctx, path: ctx.path.concat(prop.name), })
        result.push(...issues)
    }
    return result
}

async function checkUserAccessToParameters(meta: ParameterReflection[], values: any[], info: AuthorizationContext) {
    const unauthorizedPaths = await checkParameters(meta, values, { info, path: [], parent: info.ctx.route.controller.type })
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
        const info = await createAuthContext(ctx, "Route")
        const decorator = getAuthorizeDecorators(route, config.globalAuthorizationDecorators)
        //check user access
        await checkUserAccessToRoute(decorator, info)
        //if ok check parameter access
        await checkUserAccessToParameters(route.action.parameters, parameters, { ...info, type: "Parameter" })
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
    properties: { name: string, meta: PropertyReflection & { parent?: Class }, authorizer: (boolean | Authorizer)[], type: FilterNode }[]
}

async function createPropertyNode(prop: PropertyReflection, info: AuthorizerContext) {
    const decorators = prop.decorators.filter(createDecoratorFilter(x => x.access === "get" || x.access === "all"))
    // if no authorize decorator then always allow to access
    let authorizer: (boolean | Authorizer)[] = [decorators.length === 0]
    for (const dec of decorators) {
        const auth = dec.evaluation === "Static" ? await executeDecorator(dec, info) : createAuthorizer(dec, info)
        authorizer.push(auth)
        if (auth === true) break
    }
    return { name: prop.name, authorizer }
}

async function compileType(type: Class | Class[], ctx: AuthorizerContext, parentTypes: Class[]): Promise<FilterNode> {
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
            properties.push({
                ...propNode,
                meta: { ...prop, parent: type },
                type: await compileType(prop.type, ctx, parentTypes.concat(type))
            })
        }
        return { kind: "Class", properties }
    }
    else return { kind: "Value" }
}

async function getAuthorize(authorizers: (boolean | Authorizer)[], ctx: AuthorizerContext) {
    for (const auth of authorizers) {
        if (auth === true) return true
        if (typeof auth === "object") {
            const result = await auth.authorize(ctx, "Parameter")
            if (result) return true
        }
    }
    return false
}

async function filterType(raw: any, node: FilterNode, ctx: AuthorizerContext): Promise<any> {
    if (raw === undefined || raw === null) return undefined
    if (node.kind === "Array") {
        const result = []
        for (const item of raw) {
            result.push(await filterType(item, node.child, ctx))
        }
        return result
    }
    else if (node.kind === "Class") {
        const result: any = {}
        for (const prop of node.properties) {
            const value = raw[prop.name]
            const authorized = await getAuthorize(prop.authorizer, {
                ...ctx, value,
                parentValue: raw,
                metadata: { ...ctx.metadata, current: prop.meta }
            })
            if (authorized) {
                result[prop.name] = await filterType(value, prop.type, ctx)
            }
        }
        return result
    }
    else return raw
}

async function filterResult(raw: ActionResult, ctx: ActionContext): Promise<ActionResult> {
    const type = ctx.route.action.returnType
    if (type !== Promise && type && raw.status === 200 && raw.body) {
        const info = await createAuthContext(ctx, "Filter")
        const node = await compileType(type, info, [])
        raw.body = await filterType(raw.body, node, info)
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