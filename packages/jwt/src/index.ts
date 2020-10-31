import { AuthPolicy, Class, DefaultFacility, findClassRecursive, PlumierApplication } from "@plumier/core"
import KoaJwt from "koa-jwt"
import { join } from "path"

/* ------------------------------------------------------------------------------- */
/* ------------------------------- TYPES ----------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type RoleField = string | ((value: any) => Promise<string[]>)

export interface JwtAuthFacilityOption {
    secret?: string,
    roleField?: RoleField,
    global?: (...args: any[]) => void,
    authPolicies?: Class<AuthPolicy> | Class<AuthPolicy>[] | string | string[]
}

async function getPoliciesByFile(root: string, opt: Class<AuthPolicy> | Class<AuthPolicy>[] | string | string[]): Promise<Class[]> {
    if (Array.isArray(opt)) {
        const result = []
        for (const o of opt) {
            result.push(...await getPoliciesByFile(root, o))
        }
        return result
    }
    if (typeof opt === "string") {
        const result = await findClassRecursive(join(root, opt))
        return getPoliciesByFile(root, result.map(x => x.type))
    }
    else {
        return opt.name.match(/policy$/i) ? [opt] : []
    }
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN IMPLEMENTATION ------------------------------- */
/* ------------------------------------------------------------------------------- */

export class JwtAuthFacility extends DefaultFacility {
    constructor(private option?: JwtAuthFacilityOption & KoaJwt.Options) { super() }

    async preInitialize(app: Readonly<PlumierApplication>) {
        if (this.option?.authPolicies)
            app.set({ authPolicies: await getPoliciesByFile(app.config.rootDir, this.option.authPolicies) })
    }

    setup(app: Readonly<PlumierApplication>) {
        app.set({ enableAuthorization: true })
        app.set({ roleField: this.option?.roleField || "role" })
        app.set({ globalAuthorizationDecorators: this.option?.global })
        const secret = this.option?.secret ?? process.env.PLUM_JWT_SECRET
        if (!secret) throw new Error("JWT Secret not provided. Provide secret on JwtAuthFacility constructor or environment variable PLUM_JWT_SECRET")
        app.koa.use(KoaJwt({ cookie: "Authorization", ...this.option, secret, passthrough: true }))
    }
}
