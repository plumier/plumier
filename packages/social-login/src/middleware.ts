import {
    ActionResult,
    bind,
    BindingDecorator,
    HttpStatus,
    HttpStatusError,
    Invocation,
    Middleware,
    val,
    ValidationError,
    middleware,
} from "@plumier/core"
import Axios, {AxiosError} from "axios"
import { Context } from "koa"
import { decorateProperty, mergeDecorator } from "tinspector"
import * as tc from "typedconverter"


const ProfileParameterBinding = "ProfileParameterBinding"

export interface SocialAuthProvider {
    tokenEndPoint: string
    profileEndPoint: string
    clientId: string
    clientSecret: string
    profileParams: {}
}

declare module "@plumier/core" {
    namespace bind {
        export function profile(): (target: any, name: string, index: number) => void
    }
}

bind.profile = () => {
    return mergeDecorator(decorateProperty(<BindingDecorator>{
        type: "ParameterBinding", process: () => undefined,
        name: ProfileParameterBinding
    }), val.optional())
}

export class SocialAuthMiddleware implements Middleware {
    constructor(private option: SocialAuthProvider) { }

    private bindProfile(value: any, ctx: Context) {
        /**
         * parameter binding occur in the higher middleware so its must be 
         * injected manually
         */
        for (const [idx, paramMeta] of ctx.route!.action.parameters.entries()) {
            for (const decorator of paramMeta.decorators) {
                if (decorator.type === "ParameterBinding" && decorator.name === ProfileParameterBinding) {
                    const result = tc.convert(value, { type: paramMeta.type, path: paramMeta.name })
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
            try{
                const token = await this.exchange(req.query.code, req.origin + req.path)
                const profile = await this.getProfile(token)
                this.bindProfile(profile, invocation.context)
            }
            catch(e){
                throw new HttpStatusError(500, JSON.stringify(e.response.data))
            }
        }
        else {
            throw new HttpStatusError(HttpStatus.UnprocessableEntity, "Invalid OAuth parameters")
        }
        return invocation.proceed()
    }
}
