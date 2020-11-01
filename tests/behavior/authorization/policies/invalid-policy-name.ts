import { AuthorizationContext, CustomAuthorizer } from "@plumier/core"

export class HasUserAuth implements CustomAuthorizer {
    authorize(info: AuthorizationContext, location: 'Class' | 'Parameter' | 'Method'): boolean | Promise<boolean> {
        return info.role.some(x => x === "user")
    }
}