import { GitLabDialogProvider, GitLabLoginStatus, GitLabProvider, oAuthCallback, oAuthDialogEndPoint } from "@plumier/social-login"
import { bind } from "plumier"

import { gitlab } from "../config"


export class GitLabController {
    @oAuthDialogEndPoint(new GitLabDialogProvider("/gitlab/callback", gitlab.appId))
    login() { }

    @oAuthCallback(new GitLabProvider(gitlab.appId, gitlab.appSecret))
    callback(@bind.loginStatus() profile: GitLabLoginStatus) {
        return profile
    }
}