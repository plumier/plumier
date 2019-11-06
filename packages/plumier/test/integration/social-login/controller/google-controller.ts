import { GoogleDialogProvider, GoogleLoginStatus, GoogleProvider, oAuthCallback, socialDialog } from "@plumier/social-login"
import { bind } from "plumier"

import { google } from "../config"


export class GoogleController {
    @socialDialog(new GoogleDialogProvider("/google/callback", google.appId))
    login() { }

    @oAuthCallback(new GoogleProvider(google.appId, google.appSecret))
    callback(@bind.loginStatus() profile: GoogleLoginStatus) {
        return profile
    }
}