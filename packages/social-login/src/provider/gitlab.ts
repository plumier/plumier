import { SocialAuthProvider, SocialLoginStatus, DialogProvider } from "../middleware"
import { domain, val } from '@plumier/core';

/*
Dialog: 
https://docs.gitlab.com/ee/api/oauth2.html
*/

export interface GitLabProfile {
    id: number,
    username: string,
    email: string,
    name: string,
    state: string,
    avatar_url: string,
    web_url: string,
    created_at: Date,
    bio: string,
    location: string,
    public_email: string,
    skype: string,
    linkedin: string,
    twitter: string,
    website_url: string,
    organization: string,
    last_sign_in_at: Date,
    confirmed_at: Date,
    theme_id: number,
    last_activity_on: Date,
    color_scheme_id: number,
    projects_limit: number,
    current_sign_in_at: Date,
    identities: any[],
    can_create_group: boolean,
    can_create_project: boolean,
    two_factor_enabled: boolean,
    external: boolean,
    private_profile: boolean
}

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