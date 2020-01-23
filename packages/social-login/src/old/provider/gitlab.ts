import { GitLabProfile } from "../../gitlab"
import { DialogProvider, SocialAuthProvider, SocialLoginStatus } from "../middleware"

/*
Dialog: 
https://docs.gitlab.com/ee/api/oauth2.html
*/

export interface GitLabLoginStatus extends SocialLoginStatus<GitLabProfile> {}

export class GitLabProvider implements SocialAuthProvider {
    tokenEndPoint = "https://gitlab.com/oauth/token"
    profileEndPoint = "https://gitlab.com/api/v4/user"

    constructor(
        public clientId: string,
        public clientSecret: string,
        public profileParams: {} = {}
    ) { }

}

export class GitLabDialogProvider extends DialogProvider {
    url = "https://gitlab.com/oauth/authorize"
    params = {
        response_type: "code"
    }
}