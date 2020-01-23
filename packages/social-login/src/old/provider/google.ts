import { GoogleProfile } from "../../google"
import { DialogProvider, SocialAuthProvider, SocialLoginStatus } from "../middleware"

/*
Dialog: 
https://accounts.google.com/o/oauth2/v4/auth?
    scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.metadata.readonly&
    access_type=offline&
    include_granted_scopes=true&
    state=state_parameter_passthrough_value&
    redirect_uri=http%3A%2F%2Foauth2.example.com%2Fcallback&
    response_type=code&
    client_id=618103802046-48c83lio7h0fl4spoqbb6if1g2ol94i4.apps.googleusercontent.com

SERVER SIDE INFO
https://developers.google.com/identity/protocols/OAuth2WebServer


Get Client ID :
goto https://console.developers.google.com  -> select project 
goto credential. Crete credential -> OAuth Client ID 

Playground 
https://developers.google.com/oauthplayground

*/

export interface GoogleLoginStatus extends SocialLoginStatus<GoogleProfile> { }

export class GoogleProvider implements SocialAuthProvider {
    tokenEndPoint = "https://www.googleapis.com/oauth2/v4/token"
    profileEndPoint = "https://www.googleapis.com/oauth2/v2/userinfo"

    constructor(
        public clientId: string,
        public clientSecret: string,
        public profileParams: {} = {}
    ) { }
}

export class GoogleDialogProvider extends DialogProvider {
    url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        access_type: "offline",
        include_granted_scopes: true,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
    }
}