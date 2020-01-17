import { OAuthProviderBaseFacility, redirectUri, OAuthUser, OAuthProviderOption } from "./core"

const tokenEndPoint = "https://www.googleapis.com/oauth2/v4/token"
const profileEndPoint = "https://www.googleapis.com/oauth2/v2/userinfo"
const loginEndpoint = "https://accounts.google.com/o/oauth2/v2/auth"

export interface GoogleProfile {
    id: string,
    family_name: string,
    given_name: string,
    locale: string,
    name: string,
    picture: string,
    email:string
    gender:string
}

function transform(value: GoogleProfile): OAuthUser {
    return {
        provider: "Google",
        firstName: value.given_name,
        lastName: value.family_name,
        name: value.name,
        id: value.id,
        profilePicture: value.picture,
        email: value.email,
        gender: value.gender,
        raw: value
    }
}

class GoogleOAuthFacility extends OAuthProviderBaseFacility {
    constructor(opt: OAuthProviderOption) {
        super({
            ...opt,
            profile: {
                endpoint: profileEndPoint,
                params: { ...opt.profileParams },
                transformer: transform
            },
            login: {
                endpoint: loginEndpoint,
                params: {
                    access_type: "offline",
                    include_granted_scopes: true,
                    response_type: "code",
                    scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
                }
            },
            token: {
                endpoint: tokenEndPoint,
                params: { grant_type: "authorization_code" }
            },
            provider: "Google"
        }, opt.loginEndPoint ?? "/auth/google/login")
    }
}

export { GoogleOAuthFacility }