import { GoogleProfile, GoogleProvider, oAuthCallback } from "@plumier/social-login"
import { bind, response, route } from "plumier"
import qs from "querystring"

import { google } from "../config"


export class GoogleController {
    @route.get()
    login() {
        const query = qs.stringify({
            access_type: "offline",
            include_granted_scopes: true,
            state: "state",
            redirect_uri: google.redirectUri,
            response_type:"code",
            client_id: google.appId,
            scope: "https://www.googleapis.com/auth/userinfo.profile"
        })
        const dialog = "https://accounts.google.com/o/oauth2/v2/auth?" + query
        return response.redirect(dialog)
    }

    @oAuthCallback(new GoogleProvider(google.appId, google.appSecret))
    callback(@bind.profile() profile: GoogleProfile) {
        return profile
    }
}