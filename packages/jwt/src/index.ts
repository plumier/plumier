import { AuthPolicy, Class, DefaultFacility, PlumierApplication } from "@plumier/core"
import KoaJwt from "koa-jwt"

/* ------------------------------------------------------------------------------- */
/* ------------------------------- TYPES ----------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type RoleField = string | ((value: any) => Promise<string[]>)

export interface JwtAuthFacilityOption {
    secret?: string,
    roleField?: RoleField,
    global?: (...args: any[]) => void,
    authPolicies?: Class<AuthPolicy>[] //| string | string[]
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN IMPLEMENTATION ------------------------------- */
/* ------------------------------------------------------------------------------- */

export class JwtAuthFacility extends DefaultFacility {
    constructor(private option?: JwtAuthFacilityOption & KoaJwt.Options) { super() }

    setup(app: Readonly<PlumierApplication>) {
        app.set({ enableAuthorization: true })
        app.set({ roleField: this.option?.roleField || "role" })
        app.set({ globalAuthorizationDecorators: this.option?.global })
        app.set({ authPolicies: this.option?.authPolicies })
        const secret = this.option?.secret ?? process.env.PLUM_JWT_SECRET
        if (!secret) throw new Error("JWT Secret not provided. Provide secret on JwtAuthFacility constructor or environment variable PLUM_JWT_SECRET")
        app.koa.use(KoaJwt({ cookie: "Authorization", ...this.option, secret, passthrough: true }))
    }
}
