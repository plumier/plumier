import { ActionResult, bind, BindingDecorator, Invocation, Middleware, response, val, ValidationError } from "@plumier/core"
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

bind.loginStatus = () => {
    return mergeDecorator(decorateProperty(<BindingDecorator>{
        type: "ParameterBinding", process: () => undefined,
        name: LoginStatusParameterBinding
    }), val.optional())
}

export class OAuthCallbackMiddleware implements Middleware {
    private log = debug("@plumier/social-login")

    constructor(private option: SocialAuthProvider) { }

    private bindProfile(value: SocialLoginStatus<any>, ctx: Context) {
        /**
         * parameter binding occur in the higher middleware so its must be 
         * injected manually
         */
        for (const [idx, paramMeta] of ctx.route!.action.parameters.entries()) {
            for (const decorator of paramMeta.decorators) {
                if (decorator.type === "ParameterBinding" && decorator.name === LoginStatusParameterBinding) {
                    this.log("Binding: %o", value)
                    ctx.parameters![idx] = value
                }
            }
        }
    }

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
        const req = invocation.context.request;
        if (req.query.code) {
            try {
                this.log("Exchange Code: %s", req.query.code)
                this.log("Redirect Uri: %s", req.origin + req.path)
                const token = await this.exchange(req.query.code, req.origin + req.path)
                this.log("Token: %s", token)
                const data = await this.getProfile(token)
                this.log("Profile: %o", data)
                this.bindProfile({ status: "Success", data }, invocation.context)
            }
            catch (e) {
                this.log("Error: %o", e.response && e.response.data || e)
                if (e.response)
                    this.bindProfile({ status: "Failed", error: e.response.data }, invocation.context)
                else
                    this.bindProfile({ status: "Failed", error: { message: e.message } }, invocation.context)
            }
        }
        else {
            this.log("No authorization code provided")
            this.bindProfile({ status: "Failed", error: { message: "Authorization code is required" } }, invocation.context)
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
        params.redirect_uri = invocation.context.origin + this.provider.redirectUriPath
        params.client_id = this.provider.clientId
        const redirect = root + "?" + qs.stringify(params)
        return response.redirect(redirect)
    }
}
