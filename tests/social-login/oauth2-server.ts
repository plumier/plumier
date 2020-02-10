import { bind, HttpStatusError, response, route } from "@plumier/core"
import { OAuthProviderBaseFacility, OAuthProviderOption, OAuthUser, splitName } from "@plumier/social-login"
import qs from "querystring"

import { fixture } from "../helper"



export class OAuthController {

    @route.post()
    login(redirect_uri: string, state: string) {
        const par = qs.stringify({ state, code: "lorem ipsum" })
        return response.redirect(redirect_uri + "?" + par)
    }

    @route.post()
    token(code: string, client_id: string, client_secret: string, redirect_uri: string) {
        // simulate redirect_uri error 
        if (redirect_uri.match(/invalid-redirect/i))
            throw new HttpStatusError(400, "Invalid redirect uri")
        return {
            access_token: "secret",
            request: { code, client_id, client_secret, redirect_uri }
        }
    }

    profile(@bind.header("authorization") auth: string, @bind.query() query: any) {
        if (auth.split(" ")[1] !== "secret") throw new HttpStatusError(401)
        return {
            email: "Josianne_Bosco@gmail.com",
            given_name: "Greta",
            id: "54f483f9-9b50-4c15-b53f-46ece9e3e5f8",
            family_name: "Erdman",
            name: "I Ketut Manuel Auer",
            picture: "http://lorempixel.com/640/480",
            locale: "en",
            query
        }
    }
}

export class FakeOAuth2Facility extends OAuthProviderBaseFacility {
    constructor(provider: string, origin: string, opt?: OAuthProviderOption) {
        super({
            ...opt,
            profile: {
                endpoint: `${origin}/oauth/profile`,
                params: {},
                transformer: (x: OAuthUser) => {
                    const name = splitName(x.name)
                    return { ...x, firstName: name.firstName, lastName: name.lastName }
                }
            },
            login: { endpoint: `${origin}/oauth/login`, params: {} },
            token: { endpoint: `${origin}/oauth/token`, params: {} },
            provider: provider as any,
            oAuthVersion: "2.0"
        }, opt)
    }
}

export async function oAuthServer() {
    return fixture(OAuthController)
        .initialize()
}
