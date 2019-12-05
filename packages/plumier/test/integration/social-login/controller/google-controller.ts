import { GoogleDialogProvider, GoogleLoginStatus, GoogleProvider, oAuthCallback, oAuthDialogEndPoint } from "@plumier/social-login"
import { bind, val } from "plumier"

import { google } from "../config"
import { decorateParameter } from 'tinspector'

export class GoogleController {
    @oAuthDialogEndPoint(new GoogleDialogProvider("/google/callback", google.appId))
    login() { }

    @oAuthCallback(new GoogleProvider(google.appId, google.appSecret))
    callback(@bind.loginStatus() @decorateParameter({ type: "dummy" }) profile: GoogleLoginStatus) {
        return profile
    }
}