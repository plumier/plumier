import { bind, response, route } from "@plumier/core"
import { oAuthCallback, FacebookProfile, FacebookProvider, GoogleProvider, GoogleProfile } from "@plumier/social-login"
import { join } from "path"
import Plumier, { WebApiFacility } from "plumier"
import qs from "querystring"

const dotenv = require("dotenv")

dotenv.config({ path: join(__dirname, "../.env") })

const fb = {
    appId: process.env.FACEBOOK_APP_ID || "",
    appSecret: process.env.FACEBOOK_APP_SECRET || "",
    redirectUri: process.env.FACEBOOK_REDIRECT_URI || "",
}

const google = {
    appId: process.env.GOOGLE_APP_ID || "",
    appSecret: process.env.GOOGLE_APP_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "",
}

class FacebookController {
    @route.get("")
    code() {
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
        console.log("PROFILE", profile)
    }
}

class GoogleController {
    @route.get("")
    code() {
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
        console.log("PROFILE", profile)
    }
}

new Plumier()
    .set(new WebApiFacility({ controller: [FacebookController, GoogleController] }))
    .initialize()
    .then(x => x.listen(8000))
    .catch(e => console.log(e))
