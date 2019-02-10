import {
    ActionResult,
    AuthDecorator,
    Class,
    Facility,
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
export interface JwtAuthFacilityOption { secret: string, roleField?: RoleField, global?: (...args: any[]) => void }

/* ------------------------------------------------------------------------------- */
/* ------------------------------- HELPERS --------------------------------------- */
/* ------------------------------------------------------------------------------- */

function isAuthDecorator(decorator: any) {
    return decorator.type === "authorize:role" || decorator.type === "authorize:public"
}

function getGlobalDecorator(globalDecorator?: (...args: any[]) => void) {
    if (globalDecorator) {
        @globalDecorator
        class DummyClass { }
        const meta = reflect(DummyClass)
        const auth = meta.decorators.find((x): x is AuthDecorator => isAuthDecorator(x))
        return auth
    }
}

function getDecorator(info: RouteInfo, globalDecorator?: (...args: any[]) => void) {
    return info.action.decorators.find((x: any): x is AuthDecorator => isAuthDecorator(x)) ||
        info.controller.decorators.find((x: any): x is AuthDecorator => isAuthDecorator(x)) ||
        getGlobalDecorator(globalDecorator)
}

export function checkParameter(path: string[], meta: PropertyReflection | ParameterReflection, value: any, userRole: string[]): string[] {
    if (value === undefined) return []
    else if (Array.isArray(meta.type)) {
        const newMeta = { ...meta, type: meta.type[0] };
        return (value as any[]).map((x, i) => checkParameter(path.concat(i.toString()), newMeta, x, userRole))
            .flatten()
    }
    else if (isCustomClass(meta.type)) {
        const classMeta = reflect(<Class>meta.type)
        const values = classMeta.properties.map(x => value[x.name])
        return checkParameters(path, classMeta.properties, values, userRole)
    }
    else {
        const requestRoles = meta.decorators.find((x): x is AuthDecorator => isAuthDecorator(x))
        if (requestRoles && !userRole.some(x => requestRoles.value.some(y => y === x)))
            return [path.join(".")]
    }
    return []
}

export function checkParameters(path: string[], meta: (PropertyReflection | ParameterReflection)[], value: any[], userRole: string[]): string[] {
    const result: string[] = []
    for (let i = 0; i < meta.length; i++) {
        const prop = meta[i];
        const issues = checkParameter(path.concat(prop.name), prop, value[i], userRole)
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

    private checkUserAccessToRoute(userRoles: string[], decorator: AuthDecorator | undefined) {
        //if the access is public
        if (decorator && decorator.type === "authorize:public")
            return
        //if user not login (all user must have role)
        else if (userRoles.length === 0)
            throw new HttpStatusError(403, "Forbidden")
        //if no decorator specific (secured) or decorator match with user role
        else if (!decorator || userRoles.some(x => decorator.value.some(y => x === y)))
            return
        else
            throw new HttpStatusError(401, "Unauthorized")
    }

    private checkUserAccessToParameters(meta: ParameterReflection[], values: any[], roles: string[]) {
        const unauthorizedPaths = checkParameters([], meta, values, roles)
        if (unauthorizedPaths.length > 0)
            throw new HttpStatusError(401, `Unauthorized to populate parameter paths (${unauthorizedPaths.join(", ")})`)
    }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        if (!invocation.context.route) return invocation.proceed()
        const decorator = getDecorator(invocation.context.route, this.global)
        const userRoles = await this.getRole(invocation.context.state.user)
        //check user access
        this.checkUserAccessToRoute(userRoles, decorator)
        //if ok check parameter access
        this.checkUserAccessToParameters(invocation.context.route.action.parameters, invocation.context.parameters!, userRoles)
        //if all above passed then proceed
        return invocation.proceed()
    }
}
