import { domain, val } from "@plumier/core"

import { DialogProvider, SocialAuthProvider, SocialLoginStatus } from "../middleware"

/*
Dialog: 
https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/#1-request-a-users-github-identity


SETUP APPLICATION:
https://developer.github.com/apps/building-oauth-apps/creating-an-oauth-app/
*/

export interface GitHubProfile {
    html_url: string,
    id: number,
    location: string,
    login: string,
    name: string,
    node_id: string,
    organizations_url: string,
    public_gists: number,
    public_repos: number,
    received_events_url: string,
    repos_url: string,
    site_admin: boolean,
    starred_url: string,
    subscriptions_url: string,
    type: string,
    updated_at: string,
    url: string,
}


export interface GitHubLoginStatus extends SocialLoginStatus<GitHubProfile> {}

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