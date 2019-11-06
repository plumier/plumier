import { GitHubDialogProvider, GitHubLoginStatus, GitHubProvider, oAuthCallback, socialDialog } from "@plumier/social-login"
import { bind } from "plumier"

import { github } from "../config"


export class GithubController {
    @socialDialog(new GitHubDialogProvider("/github/callback", github.appId))
    login() { }

    @oAuthCallback(new GitHubProvider(github.appId, github.appSecret))
    callback(@bind.loginStatus() profile: GitHubLoginStatus) {
        return profile
    }
}