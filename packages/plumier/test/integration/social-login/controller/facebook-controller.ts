import { FacebookProfile, FacebookProvider, oAuthCallback } from "@plumier/social-login"
import { bind, response, route } from "plumier"
import qs from "querystring"

import { fb } from "../config"


export class FacebookController {
    @route.get()
    login() {
        const query = qs.stringify({
            redirect_uri: fb.redirectUri,
            client_id: fb.appId,
            state: "state"
        })
        const dialog = "https://www.facebook.com/v4.0/dialog/oauth?" + query
        return response.redirect(dialog)
    }

    @oAuthCallback(new FacebookProvider(fb.appId, fb.appSecret))
    callback(@bind.profile() profile: FacebookProfile) {
        return profile
    }
}