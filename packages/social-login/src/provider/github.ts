import { domain, val } from "@plumier/core"

import { DialogProvider, SocialAuthProvider, SocialLoginStatus } from "../middleware"

/*
Dialog: 
https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/#1-request-a-users-github-identity


SETUP APPLICATION:
https://developer.github.com/apps/building-oauth-apps/creating-an-oauth-app/
*/

export interface GitHubProfile {
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: string
    site_admin: boolean
    name: string
    company: string
    blog: string
    location: string
    email: string
    hireable: boolean
    bio: string
    public_repos: number
    public_gists: number
    followers: number
    following: number
    created_at: string
    updated_at: string
}


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