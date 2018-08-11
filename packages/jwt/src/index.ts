import { Facility, PlumierApplication, Middleware, Invocation, ActionResult, HttpStatusError, RouteInfo, isCustomClass, Class, ValidatorDecorator } from "@plumjs/core";
import KoaJwt from "koa-jwt"
import { decorateClass, decorateMethod, decorateParameter, ParameterReflection, reflect } from "@plumjs/reflect";

export type RoleField = string | ((value: any) => Promise<string[]>)
export interface JwtSecurityFacilityOption { secret: string, roleField?: RoleField }

//decorators

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

// helpers

function isAuthDecorator(decorator: any) {
    return decorator.type === "authorize:role" || decorator.type === "authorize:public"
}

function getDecorator(info: RouteInfo) {
    return info.action.decorators.find((x): x is AuthDecorator => isAuthDecorator(x)) ||
        info.controller.decorators.find((x): x is AuthDecorator => isAuthDecorator(x))
}

export function checkParameter(path: string[], meta: ParameterReflection, value: any, userRole: string[]): string[] {
    if (Array.isArray(meta.typeAnnotation)) {
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

//implementation 

export class JwtAuthFacility implements Facility {
    constructor(private option: JwtSecurityFacilityOption) { }

    async setup(app: Readonly<PlumierApplication>): Promise<void> {
        app.koa.use(KoaJwt({ secret: this.option.secret, passthrough: true }))
        app.use(new AuthorizeMiddleware(this.option.roleField || "role"))
    }
}



export class AuthorizeMiddleware implements Middleware {
    constructor(private roleField: RoleField) { }

    private async getRole(user: any): Promise<string[]> {
        if (typeof this.roleField === "function")
            return await this.roleField(user)
        else {
            const role = user[this.roleField]
            return Array.isArray(role) ? role : [role]
        }
    }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const decorator = getDecorator(invocation.context.route)
        if (decorator && decorator.type === "authorize:public") return invocation.proceed()
        const isLogin = !!invocation.context.state.user
        if (!isLogin) throw new HttpStatusError(403, "Forbidden") //forbidden 
        const userRoles = await this.getRole(invocation.context.state.user)
        if (!decorator || userRoles.some(x => decorator.value.some(y => x === y))){
            const unauthorizedPaths = checkParameters([], invocation.context.route.action.parameters, invocation.context.parameters, userRoles)
            if(unauthorizedPaths.length > 0)
                throw new HttpStatusError(401, `Unauthorized to populate parameter paths (${unauthorizedPaths.join(", ")})`)
            else
                return invocation.proceed()
        }
        else
            throw new HttpStatusError(401, "Unauthorized") //unauthorized
    }
}
