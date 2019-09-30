import { SocialAuthProvider, SocialLoginStatus } from "../middleware"
import { domain, val } from '@plumier/core';

/*
OAUTH DIALOG
https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/#login

Dialog: 
https://www.facebook.com/v4.0/dialog/oauth?
    client_id={app-id}
    &redirect_uri={redirect-uri}
    &state={state-param}
*/

@domain()
export class FacebookProfile {
    constructor(
        public id: string,
        public name: string,
        public picture: {
            data: {
                height: number, width: number,
                is_silhouette: boolean, url: string
            }
        }
    ) { }
}

@domain() 
export class FacebookLoginStatus implements SocialLoginStatus<FacebookProfile> {
    constructor(
        public status: "Success" | "Failed",
        @val.optional()
        public error?: any,
        @val.optional()
        public data?: FacebookProfile 
    ){}
}

export class FacebookProvider implements SocialAuthProvider {
    tokenEndPoint = "https://graph.facebook.com/v4.0/oauth/access_token"
    profileEndPoint = "https://graph.facebook.com/v4.0/me"

    constructor(
        public clientId: string,
        public clientSecret: string,
        public profileParams: {} = { fields: "id,name,picture.type(large)" },
    ) { }

}