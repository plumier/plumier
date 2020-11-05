import { Context } from 'koa'
import { ClassReflection, ParameterReflection, PropertyReflection, reflect } from "tinspector"

import { Class, hasKeyOf, isCustomClass } from "./common"
import { EntityIdDecorator } from "./decorator/entity"
import { HttpStatus } from "./http-status"
import {
    AccessModifier,
    ActionContext,
    ActionResult,
    AuthorizationContext,
    Authorizer,
    AuthPolicy,
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

type AuthorizerFunction = (info: AuthorizationContext, location: "Class" | "Parameter" | "Method") => boolean | Promise<boolean>

interface AuthorizeDecorator {
    type: "plumier-meta:authorize",
    authorize: string | AuthorizerFunction | Authorizer | { policies: string[] }
    access: AccessModifier
    tag: string,
    location: "Class" | "Parameter" | "Method",
    evaluation: "Static" | "Dynamic"
}


type CustomAuthorizer = Authorizer
type CustomAuthorizerFunction = AuthorizerFunction
type AuthorizerContext = AuthorizationContext

type RoleField = string | ((value: any) => Promise<string[]>)


/* ------------------------------------------------------------------------------- */
/* ------------------------------- HELPERS --------------------------------------- */
/* ------------------------------------------------------------------------------- */

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

function getRouteAuthorizeDecorators(info: RouteInfo, globalDecorator?: (...args: any[]) => void) {
    // if action has decorators then return immediately to prioritize the action decorator
    const actionDecs = info.action.decorators.filter(createDecoratorFilter(x => x.access === "route"))
    if (actionDecs.length > 0) return actionDecs
    // if controller has decorators then return immediately
    const controllerDecs = info.controller.decorators.filter(createDecoratorFilter(x => x.access === "route"))
    if (controllerDecs.length > 0) return controllerDecs
    return getGlobalDecorators(globalDecorator)
}

async function createAuthContext(ctx: ActionContext, access: AccessModifier): Promise<AuthorizationContext> {
    const { route, parameters, state, config } = ctx
    const userRoles = await getRole(state.user, config.roleField)
    return <AuthorizationContext>{
        role: userRoles, user: state.user, route, ctx, access, policyIds: [],
        metadata: new MetadataImpl(ctx.parameters, ctx.route, {} as any),
    }
}

function throwAuthError(ctx: AuthorizerContext) {
    if (ctx.role.length === 0) throw new HttpStatusError(HttpStatus.Forbidden, "Forbidden")
    else throw new HttpStatusError(HttpStatus.Unauthorized, "Unauthorized")
}

function getErrorLocation(metadata: Metadata) {
    const current = metadata.current!
    if (current.kind === "Class")
        return `class ${current.name}` 
    return `${current.kind.toLowerCase()} ${current.parent!.name}.${current.name}`
}

// --------------------------------------------------------------------- //
// ------------------------ AUTHORIZATION POLICY ----------------------- //
// --------------------------------------------------------------------- //

const Public = "Public"
const Authenticated = "Authenticated"
type EntityProviderQuery<T = any> = (entity: Class, id: any) => Promise<T>
interface EntityPolicyProviderDecorator { kind: "plumier-meta:entity-policy-provider", entity: Class, idParam: string }
type EntityPolicyAuthorizerFunction = (ctx: AuthorizerContext, id: number|string) => boolean | Promise<boolean>

interface AuthPolicyBuilder {
    policies: AuthPolicy[]
}

class PolicyAuthorizer implements Authorizer {
    private readonly policies: Class<AuthPolicy>[] = [
        PublicAuthPolicy, AuthorizedAuthPolicy
    ]
    constructor(policies: Class<AuthPolicy>[], private keys: string[]) {
        this.policies.push(...policies)
    }
    async authorize(ctx: AuthorizationContext, location: 'Class' | 'Parameter' | 'Method'): Promise<boolean> {
        // test for auth policy first
        for (const Auth of this.policies.reverse()) {
            const authPolicy = new Auth()
            for (const policy of this.keys) {
                if (authPolicy.equals(policy, ctx)) return authPolicy.authorize(ctx, location)
            }
        }
        // if none match, check for user role
        return ctx.role.some(x => this.keys.some(y => y === x))
    }
}

class PublicAuthPolicy implements AuthPolicy {
    equals(id: string, ctx: AuthorizationContext): boolean {
        return id === Public
    }
    async authorize(ctx: AuthorizationContext): Promise<boolean> {
        return true
    }
}

class AuthorizedAuthPolicy implements AuthPolicy {
    equals(id: string, ctx: AuthorizationContext): boolean {
        return id === Authenticated
    }
    async authorize(ctx: AuthorizationContext): Promise<boolean> {
        return !!ctx.user
    }
}

class CustomAuthPolicy implements AuthPolicy {
    constructor(private id: string, private authorizer: CustomAuthorizerFunction | CustomAuthorizer) { }
    equals(id: string, ctx: AuthorizationContext): boolean {
        return id === this.id
    }
    async authorize(ctx: AuthorizationContext, location: 'Class' | 'Parameter' | 'Method'): Promise<boolean> {
        try {
            if (typeof this.authorizer === "function")
                return this.authorizer(ctx, location)
            else
                return this.authorizer.authorize(ctx, "Class")
        }
        catch (e) {
            const message = e instanceof Error ? e.stack : e
            const location = getErrorLocation(ctx.metadata)
            throw new Error(`Error occur inside authorization policy ${this.id} on ${location} \n ${message}`)
        }
    }
}

class EntityAuthPolicy<T> implements AuthPolicy {
    constructor(private id: string, private entity: Class<T>, private authorizer: EntityPolicyAuthorizerFunction) { }
    private getEntity(ctx: AuthorizerContext): { entity: Class, id: any } {
        if (ctx.access === "route" || ctx.access === "write") {
            // when the entity provider is Route 
            // take the provided Entity from decorator 
            // take the entity ID value from the Action Parameter
            const dec: EntityPolicyProviderDecorator | undefined = ctx.metadata.action.decorators
                .find((x: EntityPolicyProviderDecorator) => x.kind === "plumier-meta:entity-policy-provider")
            if (!dec) {
                const meta = ctx.metadata
                throw new Error(`Action ${meta.controller.name}.${meta.action.name} doesn't have Entity Policy Provider information`)
            }
            const id = ctx.metadata.actionParams!.get(dec.idParam)
            return { entity: dec.entity, id }
        }
        else {
            // when the entity provider is Read/Write/Filter
            // take the provided entity from the parent type from context
            // take the entity ID value using @primaryId() decorator
            const entity = ctx.metadata.current!.parent!
            const meta = reflect(entity)
            const prop = meta.properties.find(p => p.decorators.some((x: EntityIdDecorator) => x.kind === "plumier-meta:entity-id"))
            if (!prop)
                throw new Error(`Entity ${entity.name} doesn't have primary ID information required for entity policy`)
            const id = ctx.parentValue[prop.name]
            return { entity, id }
        }
    }
    equals(id: string, ctx: AuthorizationContext): boolean {
        if(id === this.id){
            const provider = this.getEntity(ctx)
            return this.entity === provider.entity
        }
        return false
    }
    async authorize(ctx: AuthorizationContext): Promise<boolean> {
        const provider = this.getEntity(ctx)
        try {
            return this.authorizer(ctx, provider.id)
        }
        catch (e) {
            const message = e instanceof Error ? e.stack : e
            const location = getErrorLocation(ctx.metadata)
            throw new Error(`Error occur inside authorization policy ${this.id} for entity ${this.entity.name} on ${location} \n ${message}`)
        }
    }
}

function authPolicy() {
    return {
        define: (id: string, authorizer: CustomAuthorizerFunction | CustomAuthorizer):Class<AuthPolicy> => {
            class Policy extends CustomAuthPolicy {
                constructor() { super(id, authorizer) }
            }
            return Policy
        }
    }
}

function entityPolicy<T>(entity: Class<T>) {
    return {
        define: (id: string, authorizer: EntityPolicyAuthorizerFunction): Class<AuthPolicy> => {
            class Policy extends EntityAuthPolicy<T> {
                constructor() { super(id, entity, authorizer) }
            }
            return Policy
        }
    }
}

// --------------------------------------------------------------------- //
// ---------------------- MAIN AUTHORIZER FUNCTION --------------------- //
// --------------------------------------------------------------------- //

function createAuthorizer(decorator: AuthorizeDecorator, info: AuthorizationContext): Authorizer {
    const authorize = decorator.authorize
    if (typeof authorize === "function")
        return { authorize }
    else if (hasKeyOf<Authorizer>(authorize, "authorize"))
        return authorize
    else if (hasKeyOf<{ policies: string[] }>(authorize, "policies"))
        return new PolicyAuthorizer(info.ctx.config.authPolicies ?? [], authorize.policies)
    else
        return info.ctx.config.dependencyResolver.resolve(authorize)
}

function executeAuthorizer(decorator: AuthorizeDecorator, info: AuthorizationContext) {
    const instance = createAuthorizer(decorator, info)
    return instance.authorize(info, decorator.location)
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
    // if no rule applied but Authenticated then pass
    if (decorators.length === 0 && !!info.user) return
    const conditions = await Promise.all(decorators.map(x => executeAuthorizer(x, fixContext(x, info))))
    // if authorized once then pass
    if (conditions.some(x => x === true)) return
    // if not then throw error accordingly
    throwAuthError(info)
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

async function executeAuthorizers(decorators: AuthorizeDecorator[], info: AuthorizationContext, path: string) {
    const result: string[] = []
    for (const dec of decorators) {
        const allowed = await executeAuthorizer(dec, info)
        if (!allowed)
            result.push(path)
    }
    return result
}

function createContext(ctx: ParamCheckContext, value: any, meta: ClassReflection | PropertyReflection | ParameterReflection) {
    const info = { ...ctx.info }
    const metadata = { ...info.metadata }
    metadata.current = { ...meta, parent: ctx.parent }
    info.value = value
    info.parentValue = ctx.parentValue
    info.metadata = metadata
    return info
}

async function checkParameter(meta: PropertyReflection | ParameterReflection, value: any, ctx: ParamCheckContext): Promise<string[]> {
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
        const decorators = ctx.info.ctx.method === "GET" ? meta.decorators.filter(createDecoratorFilter(x => x.access === "filter")) :
            meta.decorators.filter(createDecoratorFilter(x => x.access === "write"))
        const info = createContext(ctx, value, meta)
        return executeAuthorizers(decorators, info, ctx.path.join("."))
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
                const decorators = getRouteAuthorizeDecorators(x, config.globalAuthorizationDecorators)
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
        const info = await createAuthContext(ctx, "route")
        const decorator = getRouteAuthorizeDecorators(route, config.globalAuthorizationDecorators)
        //check user access
        await checkUserAccessToRoute(decorator, info)
        //if ok check parameter access
        await checkUserAccessToParameters(route.action.parameters, parameters, { ...info, access: "write" })
    }
}

// --------------------------------------------------------------------- //
// ----------------------- RESPONSE AUTHORIZATION ---------------------- //
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
    const decorators = prop.decorators.filter(createDecoratorFilter(x => x.access === "read"))
    // if no authorize decorator then always allow to access
    let authorizer: (boolean | Authorizer)[] = [decorators.length === 0]
    for (const dec of decorators) {
        authorizer.push(createAuthorizer(dec, info))
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
            const meta = { ...prop, parent: type }
            const propCtx = { ...ctx, metadata: new MetadataImpl(ctx.ctx.parameters, ctx.ctx.route, meta) }
            const propNode = await createPropertyNode(prop, propCtx)
            properties.push({
                ...propNode, meta,
                type: await compileType(prop.type, propCtx, parentTypes.concat(type))
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
            const val = await filterType(item, node.child, ctx)
            if (val !== undefined)
                result.push(val)
        }
        return result.length === 0 ? undefined : result
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
                const candidate = await filterType(value, prop.type, ctx)
                const transform = ctx.ctx.config.responseProjectionTransformer ?? ((a, b) => b)
                const val = transform(prop.meta, candidate)
                if (val !== undefined)
                    result[prop.name] = val
            }
        }
        return Object.keys(result).length === 0 && result.constructor === Object ? undefined : result
    }
    else return raw
}

async function responseAuthorize(raw: ActionResult, ctx: ActionContext): Promise<ActionResult> {
    const type = ctx.route.action.returnType
    if (type !== Promise && type && raw.status === 200 && raw.body) {
        const info = await createAuthContext(ctx, "read")
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
    constructor() { }
    async execute(invocation: Readonly<Invocation<ActionContext>>): Promise<ActionResult> {
        await checkAuthorize(invocation.ctx)
        const result = await invocation.proceed()
        return responseAuthorize(result, invocation.ctx)
    }
}

export {
    AuthorizerFunction, RoleField, Authorizer, checkAuthorize, AuthorizeDecorator,
    getRouteAuthorizeDecorators, updateRouteAuthorizationAccess, AuthorizerMiddleware,
    CustomAuthorizer, CustomAuthorizerFunction, AuthorizationContext, AuthorizerContext,
    AccessModifier, EntityPolicyProviderDecorator, EntityProviderQuery,
    authPolicy, entityPolicy, EntityPolicyAuthorizerFunction, PolicyAuthorizer, Public, Authenticated,
    AuthPolicy, CustomAuthPolicy, EntityAuthPolicy
}
