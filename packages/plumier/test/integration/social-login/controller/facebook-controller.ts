import {
    FacebookDialogProvider,
    FacebookLoginStatus,
    FacebookProvider,
    oAuthCallback,
    oAuthDialogEndPoint,
} from "@plumier/social-login"
import { bind } from "plumier"

import { fb } from "../config"


export class FacebookController {
    @oAuthDialogEndPoint(new FacebookDialogProvider("/facebook/callback", fb.appId))
    login() { }

    @oAuthCallback(new FacebookProvider(fb.appId, fb.appSecret))
    callback(@bind.loginStatus() profile: FacebookLoginStatus) {
        return profile
    }
}