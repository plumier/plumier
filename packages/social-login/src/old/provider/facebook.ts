import { FacebookProfile } from "../../facebook"
import { DialogProvider, SocialAuthProvider, SocialLoginStatus } from "../middleware"

/*
OAUTH DIALOG
https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/#login

Dialog: 
https://www.facebook.com/v4.0/dialog/oauth?
    client_id={app-id}
    &redirect_uri={redirect-uri}
    &state={state-param}
*/

export interface FacebookLoginStatus extends SocialLoginStatus<FacebookProfile> {}

export class FacebookProvider implements SocialAuthProvider {
    tokenEndPoint = "https://graph.facebook.com/v4.0/oauth/access_token"
    profileEndPoint = "https://graph.facebook.com/v4.0/me"

    constructor(
        public clientId: string,
        public clientSecret: string,
        public profileParams: {} = { fields: "id,name,picture.type(large)" },
    ) { }
}

export class FacebookDialogProvider extends DialogProvider {
    url = "https://www.facebook.com/v4.0/dialog/oauth?";
    params: any = { display: "popup" }
}