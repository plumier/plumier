import { SocialAuthProvider, SocialLoginStatus } from "../middleware"
import { domain, val } from '@plumier/core';

/*
Dialog: 
https://docs.gitlab.com/ee/api/oauth2.html
*/

@domain()
export class GitLabProfile {
    constructor(
        public id: number,
        public username: string,
        public email: string,
        public name: string,
        public state: string,
        public avatar_url: string,
        public web_url: string,
        public created_at: Date,
        public bio: string,
        public location: string,
        public public_email: string,
        public skype: string,
        public linkedin: string,
        public twitter: string,
        public website_url: string,
        public organization: string,
        public last_sign_in_at: Date,
        public confirmed_at: Date,
        public theme_id: number,
        public last_activity_on: Date,
        public color_scheme_id: number,
        public projects_limit: number,
        public current_sign_in_at: Date,
        public identities: any[],
        public can_create_group: boolean,
        public can_create_project: boolean,
        public two_factor_enabled: boolean,
        public external: boolean,
        public private_profile: boolean
    ) { }
}


@domain() 
export class GitLabLoginStatus implements SocialLoginStatus<GitLabProfile> {
    constructor(
        public status: "Success" | "Failed",
        @val.optional()
        public error?: any,
        @val.optional()
        public data?: GitLabProfile 
    ){}
}

export class GitLabProvider implements SocialAuthProvider {
    tokenEndPoint = "https://gitlab.com/oauth/token"
    profileEndPoint = "https://gitlab.com/api/v4/user"

    constructor(
        public clientId: string,
        public clientSecret: string,
        public profileParams: {} = {}
    ) { }

}