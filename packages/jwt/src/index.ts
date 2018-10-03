import {
    ActionResult,
    Class,
    Facility,
    HttpStatusError,
    Invocation,
    isCustomClass,
    Middleware,
    PlumierApplication,
    RouteInfo,
    ValidatorDecorator,
    PlumierConfiguration,
    Configuration,

} from "@plumjs/core";
import { decorateClass, decorateMethod, decorateParameter, ParameterReflection, reflect } from "@plumjs/reflect";
import KoaJwt from "koa-jwt";

/* ------------------------------------------------------------------------------- */
/* ------------------------------- TYPES ----------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type RoleField = string | ((value: any) => Promise<string[]>)
export interface JwtAuthFacilityOption { secret: string, roleField?: RoleField, global?: (...args: any[]) => void }

/* ------------------------------------------------------------------------------- */
/* ----------------------------- DECORATORS -------------------------------------- */
/* ------------------------------------------------------------------------------- */

export interface AuthDecorator {
    type: "authorize:public" | "authorize:role",
    value: string[]
}

function decorate(data: AuthDecorator) {
    return (...args: any[]) => {
        if (args.length === 1)
            decorateClass(data)(args[0])
        else if (typeof args[2] === "object")
            decorateMethod(data)(args[0], args[1])
        else {
            if (data.type === "authorize:public") throw new Error("JWT1000: @authorize.public() should not be applied on parameter")
            decorateParameter(data)(args[0], args[1], args[2])
            decorateParameter(<ValidatorDecorator>{ type: "ValidatorDecorator", name: "optional" })(args[0], args[1], args[2])
        }
    }
}

export class AuthDecoratorImpl {
    public() {
        return decorate({ type: "authorize:public", value: [] })
    }

    role(...roles: string[]) {
        return decorate({ type: "authorize:role", value: roles })
    }
}

export const authorize = new AuthDecoratorImpl()

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
    return info.action.decorators.find((x): x is AuthDecorator => isAuthDecorator(x)) ||
        info.controller.decorators.find((x): x is AuthDecorator => isAuthDecorator(x)) ||
        getGlobalDecorator(globalDecorator)
}

export function checkParameter(path: string[], meta: ParameterReflection, value: any, userRole: string[]): string[] {
    if (value && Array.isArray(meta.typeAnnotation)) {
        const newMeta = { ...meta, typeAnnotation: meta.typeAnnotation[0] };
        return (value as any[]).map((x, i) => checkParameter(path.concat(i.toString()), newMeta, x, userRole))
            .flatten()
    }
    else if (isCustomClass(meta.typeAnnotation)) {
        const classMeta = reflect(<Class>meta.typeAnnotation)
        const values = classMeta.ctorParameters.map(x => value[x.name])
        return checkParameters(path, classMeta.ctorParameters, values, userRole)
    }
    else if (typeof value !== "undefined") {
        const requestRoles = meta.decorators.find((x): x is AuthDecorator => isAuthDecorator(x))
        if (requestRoles && !userRole.some(x => requestRoles.value.some(y => y === x)))
            return [path.join(".")]
    }
    return []
}

export function checkParameters(path: string[], meta: ParameterReflection[], value: any[], userRole: string[]): string[] {
    return meta.map((x, i) => checkParameter(path.concat(x.name), x, value[i], userRole))
        .flatten()
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
        if(!user) return []
        if (typeof this.roleField === "function")
            return await this.roleField(user)
        else {
            const role = user[this.roleField]
            return Array.isArray(role) ? role : [role]
        }
    }

    async checkParameterAuthorization(invocation: Readonly<Invocation>, userRoles: string[]) {
        const unauthorizedPaths = checkParameters([], invocation.context.route!.action.parameters, invocation.context.parameters!, userRoles)
        if (unauthorizedPaths.length > 0)
            throw new HttpStatusError(401, `Unauthorized to populate parameter paths (${unauthorizedPaths.join(", ")})`)
        else
            return invocation.proceed()
    }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        if(!invocation.context.route) return invocation.proceed()
        const decorator = getDecorator(invocation.context.route, this.global)
        const userRoles = await this.getRole(invocation.context.state.user)
        if (decorator && decorator.type === "authorize:public")
            return this.checkParameterAuthorization(invocation, userRoles)
        const isLogin = !!invocation.context.state.user
        if (!isLogin) throw new HttpStatusError(403, "Forbidden") //forbidden 
        if (!decorator || userRoles.some(x => decorator.value.some(y => x === y)))
            return this.checkParameterAuthorization(invocation, userRoles)
        else
            throw new HttpStatusError(401, "Unauthorized") //unauthorized
    }
}
