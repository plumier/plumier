import { DefaultFacility, PlumierApplication } from "@plumier/core"
import KoaJwt from "koa-jwt"
import jwt from "koa-jwt"

/* ------------------------------------------------------------------------------- */
/* ------------------------------- TYPES ----------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type RoleField = string | ((value: any) => Promise<string[]>)

export interface JwtAuthFacilityOption {
    secret: string,
    roleField?: RoleField,
    global?: (...args:any[]) => void
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN IMPLEMENTATION ------------------------------- */
/* ------------------------------------------------------------------------------- */

export class JwtAuthFacility extends DefaultFacility {
    constructor(private option: JwtAuthFacilityOption & jwt.Options) { super() }

    setup(app: Readonly<PlumierApplication>) {
        Object.assign(app.config, { 
            enableAuthorization: true, 
            roleField: this.option.roleField || "role",
            globalAuthorizationDecorators: this.option.global
         })
        app.koa.use(KoaJwt({ cookie: "Authorization", ...this.option, secret: this.option.secret, passthrough: true }))
    }
}
