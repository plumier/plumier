import { OAuthProviderBaseFacility, redirectUri, OAuthUser, OAuthProviderOption } from "./core"

const tokenEndPoint = "https://graph.facebook.com/v4.0/oauth/access_token"
const profileEndPoint = "https://graph.facebook.com/v4.0/me"
const loginEndpoint = "https://www.facebook.com/v4.0/dialog/oauth"


export interface FacebookProfile {
    id: string
    name: string
    first_name: string,
    last_name: string,
    email: string,
    gender: string,
    birthday: string,
    picture: {
        data: {
            height: number, width: number,
            is_silhouette: boolean, url: string
        }
    }
}

function transform(value: FacebookProfile): OAuthUser {
    return {
        provider: "Facebook",
        firstName: value.first_name,
        lastName: value.last_name,
        name: value.name,
        id: value.id,
        profilePicture: value.picture.data.url,
        dateOfBirth: value.birthday,
        email: value.email,
        gender: value.gender,
        raw: value
    }
}

class FacebookOAuthFacility extends OAuthProviderBaseFacility {
    constructor(opt: OAuthProviderOption) {
        super({
            ...opt,
            profile: {
                endpoint: profileEndPoint,
                params: { fields: "id,name,first_name,last_name,picture.type(large)", ...opt.profileParams },
                transformer: transform
            },
            login: { endpoint: loginEndpoint, params: { display: "popup" } },
            token: { endpoint: tokenEndPoint, params: {} },
            provider: "Facebook"
        }, opt.loginEndPoint ?? "/auth/facebook/login")
    }
}

export { FacebookOAuthFacility }