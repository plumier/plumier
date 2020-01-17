import { GitHubProfile } from "../../github"
import { DialogProvider, SocialAuthProvider, SocialLoginStatus } from "../middleware"

/*
Dialog: 
https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/#1-request-a-users-github-identity


SETUP APPLICATION:
https://developer.github.com/apps/building-oauth-apps/creating-an-oauth-app/
*/



export interface GitHubLoginStatus extends SocialLoginStatus<GitHubProfile> { }

export class GitHubProvider implements SocialAuthProvider {
    tokenEndPoint = "https://github.com/login/oauth/access_token"
    profileEndPoint = "https://api.github.com/user"

    constructor(
        public clientId: string,
        public clientSecret: string,
        public profileParams: {} = {}
    ) { }

}

export class GitHubDialogProvider extends DialogProvider {
    url = "https://github.com/login/oauth/authorize"
}