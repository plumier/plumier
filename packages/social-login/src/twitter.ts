import { OAuthProviderBaseFacility, OAuthProviderOption, splitName } from "./core"

const requestTokenEndpoint = "https://api.twitter.com/oauth/request_token"
const tokenEndPoint = "https://api.twitter.com/oauth/access_token"
const profileEndPoint = "https://api.twitter.com/1.1/account/verify_credentials.json"
const loginEndpoint = "https://api.twitter.com/oauth/authenticate"

export interface TwitterProfile {
    id: number,
    id_str: string,
    name: string,
    screen_name: string,
    location: string,
    description: string,
    url: string,
    protected: boolean,
    followers_count: number,
    friends_count: number,
    listed_count: number,
    created_at: string,
    favourites_count: number,
    geo_enabled: boolean,
    verified: boolean,
    statuses_count: number,
    lang: string,
    contributors_enabled: boolean,
    is_translator: boolean,
    profile_image_url_https: string,
    profile_banner_url: string,
    default_profile: boolean,
    default_profile_image: boolean,
    following: boolean,
    follow_request_sent: boolean,
    notifications: boolean,
    translator_type: "regular"
}

class TwitterOAuthFacility extends OAuthProviderBaseFacility {
    constructor(opt?: OAuthProviderOption) {
        super({
            profile: {
                endpoint: profileEndPoint,
                params: {},
                transformer: (value: TwitterProfile) => {
                    const names = splitName(value.name)
                    return {
                        provider: "Twitter",
                        firstName: names.firstName,
                        lastName: names.lastName,
                        name: value.name,
                        id: value.id_str,
                        profilePicture: value.profile_image_url_https?.replace("__normal", "__400x400"),
                    }
                }
            },
            login: {
                endpoint: loginEndpoint,
                params: {}
            },
            token: {
                endpoint: tokenEndPoint,
                params: {}
            },
            requestToken: {
                endpoint: requestTokenEndpoint,
                params: {}
            },
            provider: "Twitter",
            oAuthVersion: "1.0a"
        }, opt)
    }
}

export { TwitterOAuthFacility }