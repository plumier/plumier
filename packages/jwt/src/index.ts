import { Facility, PlumierApplication, Middleware, Invocation, ActionResult, HttpStatusError, RouteInfo } from "@plumjs/core";
import KoaJwt from "koa-jwt"
import { decorateClass, decorateMethod } from "@plumjs/reflect";

export type RoleField = string | ((value: any) => Promise<string[]>)
export interface JwtSecurityFacilityOption { secret: string, roleField?: RoleField }

//decorators

export interface AuthDecorator {
    type: "authorize:public" | "authorize:role",
    value: string[]
}

function decorate(data: any) {
    return (...args: any[]) => {
        if (args.length === 1)
            decorateClass(data)(args[0])
        else
            decorateMethod(data)(args[0], args[1])
    }
}

export class AuthDecoratorImpl {
    public() {
        return decorate(<AuthDecorator>{ type: "authorize:public", value: [] })
    }

    role(...roles: string[]) {
        return decorate(<AuthDecorator>{ type: "authorize:role", value: roles })
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

//implementation 

export class JwtAuthFacility implements Facility {
    constructor(private option: JwtSecurityFacilityOption) { }

    async setup(app: Readonly<PlumierApplication>): Promise<void> {
        app.use(KoaJwt({ secret: this.option.secret, passthrough: true }))
        app.use(new AuthorizeMiddleware(this.option.roleField || "role"))
    }
}

export class AuthorizeMiddleware implements Middleware {
    constructor(private roleField: RoleField) { }

    private async getRole(user:any):Promise<string[]>{
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
        if (!decorator) return invocation.proceed()
        const userRole = await this.getRole(invocation.context.state.user)
        if (userRole.some(x => decorator.value.some(y => x === y)))
            return invocation.proceed()
        else
            throw new HttpStatusError(401, "Unauthorized") //unauthorized
    }
}
