import { ActionResult, bind, BindingDecorator, Invocation, Middleware, val, ValidationError } from "@plumier/core"
import Axios from "axios"
import { Context } from "koa"
import { decorateProperty, mergeDecorator } from "tinspector"
import * as tc from "typedconverter"
import debug from "debug"


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

export class SocialAuthMiddleware implements Middleware {
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
                    const result = tc.validate(value, { type: paramMeta.type, path: paramMeta.name })
                    this.log("Binding: %o", result.value)
                    this.log("Binding Issue: %o", result.issues)
                    if (!result.issues)
                        ctx.parameters![idx] = result.value
                    else
                        throw new ValidationError(result.issues
                            .map(x => ({ path: x.path.split("."), messages: x.messages })));
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
                else if (e instanceof ValidationError)
                    this.bindProfile({ status: "Failed", error: e.issues }, invocation.context)
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
