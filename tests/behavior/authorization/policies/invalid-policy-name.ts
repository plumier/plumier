import { AuthorizationContext, CustomAuthorizer } from "@plumier/core"

export class HasUserAuth implements CustomAuthorizer {
    authorize(info: AuthorizationContext): boolean | Promise<boolean> {
        return info.role.some(x => x === "user")
    }
}