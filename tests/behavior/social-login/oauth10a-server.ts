import { ActionResult, bind, HttpStatusError, response, route } from "@plumier/core"
import { OAuthProviderBaseFacility, OAuthProviderOption, OAuthUser, splitName } from "@plumier/social-login"
import { Context } from "koa"
import qs from "querystring"

import { fixture } from "../helper"

var redirect_uri = ""

export class OAuthController {

    @route.post("request-token")
    requestToken(@bind.header("authorization") auth:any) {
        const url = qs.parse(/oauth_callback="(.*?)"/.exec(auth)![0].replace(/\"/g, ""))
        redirect_uri = url.oauth_callback as string
        return new ActionResult(qs.encode({ oauth_token: "REQUEST TOKEN" }))
    }

    @route.post()
    login(oauth_token: string, @bind.header() header:any) {
        const par = qs.stringify({ oauth_token, oauth_verifier: "OAUTH VERIFIER" })
        return response.redirect(redirect_uri + "?" + par)
    }

    @route.post()
    token(oauth_token:string, oauth_verifier:string, @bind.header() headers:any) {
        // simulate redirect_uri error 
        if (redirect_uri.match(/invalid-redirect/i))
            throw new HttpStatusError(400, "Invalid redirect uri")
        return {
            access_token: "secret",
            refresh_token: "very secret"
        }
    }

    profile(@bind.header() header: any) {
        return {
            email: "Josianne_Bosco@gmail.com",
            given_name: "Greta",
            id: "54f483f9-9b50-4c15-b53f-46ece9e3e5f8",
            family_name: "Erdman",
            name: "I Ketut Manuel Auer",
            picture: "http://lorempixel.com/640/480",
            locale: "en",
        }
    }
}

export class FakeOAuth10aFacility extends OAuthProviderBaseFacility {
    constructor(provider: string, origin: string, opt?: OAuthProviderOption) {
        super({
            profile: {
                endpoint: `${origin}/oauth/profile`,
                params: {},
                transformer: (x: OAuthUser) => {
                    const name = splitName(x.name)
                    return { ...x, firstName: name.firstName, lastName: name.lastName }
                }
            },
            login: { endpoint: `${origin}/oauth/login`, params: {} },
            requestToken: { endpoint: `${origin}/oauth/request-token`, params: {} },
            token: { endpoint: `${origin}/oauth/token`, params: {} },
            provider: provider as any,
            oAuthVersion: "1.0a"
        }, opt)
    }
}

export async function oAuth10aServer() {
    return fixture(OAuthController)
        .initialize()
}
