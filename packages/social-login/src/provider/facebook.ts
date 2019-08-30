import { domain } from "@plumier/core"
import Axios from "axios"

import { LoginProvider } from "../middleware"


// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

@domain()
export class FacebookProfile {
    constructor(
        public id: string,
        public name: string,
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

// --------------------------------------------------------------------- //
// ------------------------------ PROVIDER ----------------------------- //
// --------------------------------------------------------------------- //

/*
https://www.facebook.com/v4.0/dialog/oauth?client_id=1682082525389457&redirect_uri=https://localhost:8080/auth/facebook&state=lorem
*/

const AccessTokenUrl = "https://graph.facebook.com/v4.0/oauth/access_token"
const DebugTokenUrl = "https://graph.facebook.com/v4.0/debug_token"
const ProfileUrl = "https://graph.facebook.com/v4.0/me"

export class FacebookProvider implements LoginProvider {

    constructor(private opts: FacebookAuthOption) { }

    async exchange(code: string, redirectUri: string): Promise<string> {
        const response = await Axios.get<ExchangeResponse>(AccessTokenUrl,
            { params: { client_id: this.opts.appId, redirect_uri: redirectUri, client_secret: this.opts.appSecret, code } })
        return response.data.access_token;
    }

    async validate(accessToken: string): Promise<boolean> {
        const tokenResponse = await Axios.get<ExchangeResponse>(AccessTokenUrl, {
            params: { client_id: this.opts.appId, client_secret: this.opts.appSecret, grant_type: "client_credentials", }
        })
        const { data: response } = await Axios.get<VerifyResponse>(DebugTokenUrl, {
            params: { input_token: accessToken, access_token: tokenResponse.data.access_token }
        })
        return response.data.is_valid && this.opts.appId === response.data.app_id
    }

    async getProfile(accessToken: string): Promise<any> {
        const response = await Axios.get<FacebookProfile>(ProfileUrl, {
            params: {
                fields: this.opts.userFields || "id,name,picture.type(large)",
                access_token: accessToken
            }
        })
        return response.data;
    }
}