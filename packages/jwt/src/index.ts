import { DefaultFacility, PlumierApplication } from "@plumier/core"
import KoaJwt from "koa-jwt"
import jwt from "koa-jwt"

/* ------------------------------------------------------------------------------- */
/* ------------------------------- TYPES ----------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type RoleField = string | ((value: any) => Promise<string[]>)

export interface JwtAuthFacilityOption {
    secret?: string,
    roleField?: RoleField,
    global?: (...args: any[]) => void
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN IMPLEMENTATION ------------------------------- */
/* ------------------------------------------------------------------------------- */

export class JwtAuthFacility extends DefaultFacility {
    constructor(private option?: JwtAuthFacilityOption & jwt.Options) { super() }

    setup(app: Readonly<PlumierApplication>) {
        Object.assign(app.config, {
            enableAuthorization: true,
            roleField: this.option?.roleField || "role",
            globalAuthorizationDecorators: this.option?.global
        })
        const secret = this.option?.secret ?? process.env.PLUM_JWT_SECRET
        if(!secret) throw new Error("JWT Secret not provided. Provide secret on JwtAuthFacility constructor or environment variable PLUM_JWT_SECRET")
        app.koa.use(KoaJwt({ cookie: "Authorization", ...this.option, secret, passthrough: true }))
    }
}
