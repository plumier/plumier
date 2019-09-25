import { GitLabProfile, GitLabProvider, oAuthCallback, GitLabLoginStatus } from "@plumier/social-login"
import { bind, response, route } from "plumier"
import qs from "querystring"

import { gitlab } from "../config"


export class GitLabController {
    @route.get()
    login() {
        const query = qs.stringify({
            state: "state",
            response_type:"code",
            redirect_uri: gitlab.redirectUri,
            client_id: gitlab.appId,
        })
        const dialog = "https://gitlab.com/oauth/authorize?" + query
        return response.redirect(dialog)
    }

    @oAuthCallback(new GitLabProvider(gitlab.appId, gitlab.appSecret))
    callback(@bind.loginStatus() profile: GitLabLoginStatus) {
        return profile
    }
}