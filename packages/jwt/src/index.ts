import { DefaultFacility, PlumierApplication, RouteInfo, AuthorizeStore } from "@plumier/core"
import KoaJwt from "koa-jwt"
import {Security} from "@plumier/kernel"

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
/* --------------------------- MAIN IMPLEMENTATION ------------------------------- */
/* ------------------------------------------------------------------------------- */


export class JwtAuthFacility extends DefaultFacility {
    constructor(private option: JwtAuthFacilityOption) { super() }

    setup(app: Readonly<PlumierApplication>) {
        app.set({ authorizer: this.option.authorizer })
        app.koa.use(KoaJwt({ secret: this.option.secret, passthrough: true }))
        app.use(new Security.AuthorizeMiddleware(this.option.roleField || "role", this.option.global))
    }

    async initialize(app: Readonly<PlumierApplication>, routes: RouteInfo[]) {
        Security.updateRouteAccess(routes, this.option.global)
    }
}
