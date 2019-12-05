import { GitHubDialogProvider, GitHubLoginStatus, GitHubProvider, oAuthCallback, oAuthDialogEndPoint } from "@plumier/social-login"
import { bind, val } from "plumier"

import { github } from "../config"


export class GithubController {
    @oAuthDialogEndPoint(new GitHubDialogProvider("/github/callback", github.appId))
    login() { }

    @oAuthCallback(new GitHubProvider(github.appId, github.appSecret))
    callback(@bind.loginStatus() profile: GitHubLoginStatus) {
        return profile
    }
}