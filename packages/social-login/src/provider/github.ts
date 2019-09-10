import { SocialAuthProvider } from "../middleware"
import { domain } from '@plumier/core';

/*
Dialog: 
https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/#1-request-a-users-github-identity


SETUP APPLICATION:
https://developer.github.com/apps/building-oauth-apps/creating-an-oauth-app/


*/

@domain()
export class GithubProfile {
    constructor(
        public html_url: string,
        public id: number,
        public location: string,
        public login: string,
        public name: string,
        public node_id: string,
        public organizations_url: string,
        public public_gists: number,
        public public_repos: number,
        public received_events_url: string,
        public repos_url: string,
        public site_admin: boolean,
        public starred_url: string,
        public subscriptions_url: string,
        public type: string,
        public updated_at: string,
        public url: string,
    ) { }
}

export class GithubProvider implements SocialAuthProvider {
    tokenEndPoint = "https://github.com/login/oauth/access_token"
    profileEndPoint = "https://api.github.com/user"

    constructor(
        public clientId: string,
        public clientSecret: string,
        public profileParams: {} = {}
    ) { }

}