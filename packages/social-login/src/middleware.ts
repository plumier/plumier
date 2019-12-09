import { ActionResult, bind, BindingDecorator, Invocation, Middleware, response, } from "@plumier/core"
import Axios from "axios"
import debug from "debug"
import { Context } from "koa"
import qs from "querystring"
import { decorateProperty, mergeDecorator } from "tinspector"
import * as tc from "typedconverter"

const LoginStatusParameterBinding = "LoginStatusParameterBinding"

export interface SocialLoginStatus<T = any> {
    status: "Success" | "Failed",
    error?: any,
    data?: T
}

export interface SocialAuthProvider {
    tokenEndPoint: string
    profileEndPoint: string
    clientId: string
    clientSecret: string
    profileParams: {}
}

export abstract class DialogProvider {
    abstract url: string
    params: any = {}
    constructor(public redirectUriPath: string, public clientId: string) { }
}

declare module "@plumier/core" {
    namespace bind {
        export function loginStatus(): (target: any, name: string, index: number) => void
    }
}

bind.loginStatus = () => bind.custom(x => x.state.loginStatus)

export class OAuthCallbackMiddleware implements Middleware {
    private log = debug("@plumier/social-login")

    constructor(private option: SocialAuthProvider) { }

    protected async exchange(code: string, redirectUri: string): Promise<string> {
        const response = await Axios.post<{ access_token: string }>(this.option.tokenEndPoint,
            {
                client_id: this.option.clientId, redirect_uri: redirectUri,
                client_secret: this.option.clientSecret,
                //required by google
                grant_type: "authorization_code",
                code
            }, {
            headers: {
                Accept: 'application/json',
            },
        })
        return response.data.access_token;
    }

    protected async getProfile(token: string): Promise<any> {
        const response = await Axios.get(this.option.profileEndPoint, {
            params: this.option.profileParams,
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        return response.data;
    }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const req = invocation.ctx.request;
        if (req.query.code) {
            try {
                this.log("Exchange Code: %s", req.query.code)
                this.log("Redirect Uri: %s", req.origin + req.path)
                const token = await this.exchange(req.query.code, req.origin + req.path)
                this.log("Token: %s", token)
                const data = await this.getProfile(token)
                this.log("Profile: %o", data)
                invocation.ctx.state.loginStatus = { status: "Success", data }
            }
            catch (e) {
                this.log("Error: %o", e.response && e.response.data || e)
                if (e.response)
                    invocation.ctx.state.loginStatus = { status: "Failed", error: e.response.data }
                else
                    invocation.ctx.state.loginStatus = { status: "Failed", error: { message: e.message } }
            }
        }
        else {
            this.log("No authorization code provided")
            invocation.ctx.state.loginStatus = { status: "Failed", error: { message: "Authorization code is required" } }
        }
        return invocation.proceed()
    }
}

export class OAuthDialogEndPointMiddleware implements Middleware {
    constructor(private provider: DialogProvider) { }

    async execute(invocation: Readonly<Invocation>): Promise<ActionResult> {
        const result = await invocation.proceed()
        const params = { ...this.provider.params, ...result.body }
        const url = this.provider.url
        const root = url.endsWith("?") ? url.substring(0, url.length - 1) : url;
        params.redirect_uri = invocation.ctx.origin + this.provider.redirectUriPath
        params.client_id = this.provider.clientId
        const redirect = root + "?" + qs.stringify(params)
        return response.redirect(redirect)
    }
}
