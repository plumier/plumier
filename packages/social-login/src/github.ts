import { OAuthProviderBaseFacility, redirectUri, OAuthUser, splitName, OAuthProviderOption, Optional } from "./core"

const tokenEndPoint = "https://github.com/login/oauth/access_token"
const profileEndPoint = "https://api.github.com/user"
const loginEndpoint = "https://github.com/login/oauth/authorize"


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

class GitHubOAuthFacility extends OAuthProviderBaseFacility {
    constructor(opt?: OAuthProviderOption) {
        super({
            profile: {
                endpoint: profileEndPoint,
                params: {},
                transformer: (value: GitHubProfile) => {
                    const names = splitName(value.name)
                    return {
                        firstName: names.firstName,
                        lastName: names.lastName,
                        name: value.name,
                        id: value.id.toString(),
                        profilePicture: value.avatar_url,
                        email: value.email
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
            provider: "GitHub",
            oAuthVersion: "2.0"
        }, opt)
    }
}


export { GitHubOAuthFacility }