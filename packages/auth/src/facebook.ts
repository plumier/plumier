import Axios from "axios";
import { bind, domain, Middleware, Invocation, ActionResult, HttpStatusError, HttpStatus } from "@plumier/core"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

@domain()
export class FacebookUser {
    constructor(
        public id: string,
        public name: string,
        //public email: string,
        public picture: { data: { url: string } }
    ) { }
}

export interface FacebookAuthOption {
    appId: number,
    appSecret: string
    userFields?: string
}

interface ExchangeResponse {
    access_token: string
    token_type: string
    expires_in: string
}

interface VerifyResponse {
    data: {
        app_id: number,
        type: string,
        application: string,
        expires_at: number,
        is_valid: boolean,
        issued_at: number,
        metadata: {
            sso: string
        },
        scopes: string[],
        user_id: string
    }
}

declare module "@plumier/core" {
    namespace bind {
        export function socialUser(): (target: any, name: string, index: number) => void
    }
}

bind.socialUser = () => {
    return bind.custom(x => x.state.socialUser)
}

// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //

async function exchangeCode(appId: number, redirectUri: string, appSecret: string, code: string) {
    const response = await Axios.get<ExchangeResponse>("https://graph.facebook.com/v4.0/oauth/access_token",
        { params: { client_id: appId, redirect_uri: redirectUri, client_secret: appSecret, code } })
    return response.data.access_token;
}

async function isValid(accessToken: string, appId: number, appSecret: string) {
    const tokenResponse = await Axios.get<ExchangeResponse>("https://graph.facebook.com/v4.0/oauth/access_token", {
        params: { client_id: appId, client_secret: appSecret, grant_type: "client_credentials", }
    })
    const { data: response } = await Axios.get<VerifyResponse>("https://graph.facebook.com/debug_token", {
        params: { input_token: accessToken, access_token: tokenResponse.data.access_token }
    })
    return response.data.is_valid && appId === response.data.app_id
}

async function getUserInfo(accessToken: string, fields: string) {
    const response = await Axios.get<FacebookUser>(`https://graph.facebook.com/me`, {
        params: {
            fields: fields,
            access_token: accessToken
        }
    })
    return response.data;
}

export class FacebookLoginMiddleware implements Middleware {
    constructor(private opts: FacebookAuthOption) { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const req = invocation.context.request;
        if (!req.query.response_type)
            throw new HttpStatusError(HttpStatus.UnprocessableEntity, "Unable to get response_type parameter")
        const fields = this.opts.userFields || "id,name,picture.type(large)"
        if (req.query.response_type.contains("code")) {
            const token = await exchangeCode(this.opts.appId, req.path, this.opts.appSecret, req.query.code)
            invocation.context.state.socialUser = await getUserInfo(token, fields)
        }
        else {
            if (await isValid(req.query.access_token, this.opts.appId, this.opts.appSecret)) {
                invocation.context.state.socialUser = await getUserInfo(req.query.access_token, fields)
            }
        }
        return invocation.proceed()
    }
}