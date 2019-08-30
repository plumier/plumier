import { bind, Middleware, Invocation, ActionResult, HttpStatusError, HttpStatus, middleware } from "@plumier/core"


declare module "@plumier/core" {
    namespace bind {
        export function profile(): (target: any, name: string, index: number) => void
    }
}

bind.profile = () => {
    return bind.custom(x => x.state.profile)
}

export interface LoginProvider {
    exchange(code: string, redirectUri:string): Promise<string>
    validate(accessToken: string): Promise<boolean>
    getProfile(accessToken: string): Promise<any>
}

export class SocialAuthMiddleware implements Middleware {
    constructor(private provider: LoginProvider) { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const req = invocation.context.request;
        if (req.query.code) {
            const token = await this.provider.exchange(req.query.code, invocation.context.path)
            invocation.context.state.profile = await this.provider.getProfile(token)
        }
        else if (req.query.access_token) {
            if (await this.provider.validate(req.query.access_token)) {
                invocation.context.state.profile = await this.provider.getProfile(req.query.access_token)
            }
            else {
                throw new HttpStatusError(HttpStatus.UnprocessableEntity, "Invalid access token")
            }
        }
        else {
            throw new HttpStatusError(HttpStatus.UnprocessableEntity, "Invalid OAuth parameters")
        }
        return invocation.proceed()
    }
}

export function callback(provider: LoginProvider) {
    return middleware.use(new SocialAuthMiddleware(provider))
}