import {
    ActionResult,
    AuthorizeDecorator,
    AuthorizeMetadataInfo,
    AuthorizeStore,
    Class,
    Facility,
    HttpStatus,
    HttpStatusError,
    Invocation,
    isCustomClass,
    Middleware,
    PlumierApplication,
    RouteInfo,
} from "@plumier/core"
import KoaJwt from "koa-jwt"
import { ParameterReflection, PropertyReflection, reflect } from "tinspector"

/* ------------------------------------------------------------------------------- */
/* ------------------------------- TYPES ----------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type RoleField = string | ((value: any) => Promise<string[]>)

export interface JwtAuthFacilityOption {
    secret: string,
    roleField?: RoleField,
    global?: (...args: any[]) => void,
    authorizer?: AuthorizeStore
}

/* ------------------------------------------------------------------------------- */
/* ------------------------------- HELPERS --------------------------------------- */
/* ------------------------------------------------------------------------------- */

function executeDecorator(decorator: AuthorizeDecorator, info: AuthorizeMetadataInfo) {
    const authorize = decorator.authorize
    const impl = typeof authorize === "string" ? info.ctx.config.authorizer![authorize] : authorize
    return impl(info)
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

export async function checkParameter(path: string[], meta: PropertyReflection | ParameterReflection, value: any, info: AuthorizeMetadataInfo) {
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

export async function checkParameters(path: string[], meta: (PropertyReflection | ParameterReflection)[], value: any[], info: AuthorizeMetadataInfo) {
    const result: string[] = []
    for (let i = 0; i < meta.length; i++) {
        const prop = meta[i];
        const issues = await checkParameter(path.concat(prop.name), prop, value[i], info)
        result.push(...issues)
    }
    return result
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN IMPLEMENTATION ------------------------------- */
/* ------------------------------------------------------------------------------- */


export class JwtAuthFacility implements Facility {
    constructor(private option: JwtAuthFacilityOption) { }

    async setup(app: Readonly<PlumierApplication>): Promise<void> {
        app.set({ authorizer: this.option.authorizer })
        app.koa.use(KoaJwt({ secret: this.option.secret, passthrough: true }))
        app.use(new AuthorizeMiddleware(this.option.roleField || "role", this.option.global))
    }
}

export class AuthorizeMiddleware implements Middleware {
    constructor(private roleField: RoleField, private global?: (...args: any[]) => void) { }

    private async getRole(user: any): Promise<string[]> {
        if (!user) return []
        if (typeof this.roleField === "function")
            return await this.roleField(user)
        else {
            const role = user[this.roleField]
            return Array.isArray(role) ? role : [role]
        }
    }

    private async checkUserAccessToRoute(decorators: AuthorizeDecorator[], info: AuthorizeMetadataInfo) {
        if (decorators.some(x => x.tag === "Public")) return
        if (info.role.length === 0) throw new HttpStatusError(HttpStatus.Forbidden, "Forbidden")
        const conditions = await Promise.all(decorators.map(x => executeDecorator(x, info)))
        //use OR condition
        //if ALL condition doesn't authorize user then throw
        if (conditions.length > 0 && conditions.every(x => x === false))
            throw new HttpStatusError(HttpStatus.Unauthorized, "Unauthorized")
    }

    private async checkUserAccessToParameters(meta: ParameterReflection[], values: any[], info: AuthorizeMetadataInfo) {
        const unauthorizedPaths = await checkParameters([], meta, values, info)
        if (unauthorizedPaths.length > 0)
            throw new HttpStatusError(401, `Unauthorized to populate parameter paths (${unauthorizedPaths.join(", ")})`)
    }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        if (!invocation.context.route) return invocation.proceed()
        const { route, parameters, state } = invocation.context
        const decorator = getAuthorizeDecorators(invocation.context.route, this.global)
        const userRoles = await this.getRole(invocation.context.state.user)
        const info = <AuthorizeMetadataInfo>{ role: userRoles, parameters, user: state.user, route, ctx: invocation.context }
        //check user access
        await this.checkUserAccessToRoute(decorator, info)
        //if ok check parameter access
        await this.checkUserAccessToParameters(invocation.context.route.action.parameters, invocation.context.parameters!, info)
        //if all above passed then proceed
        return invocation.proceed()
    }
}