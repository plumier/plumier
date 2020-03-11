import { Class, bind } from "@plumier/core";
import { FacebookOAuthFacility, redirectUri, OAuthUser, GitHubOAuthFacility, GitLabOAuthFacility, GoogleOAuthFacility, TwitterOAuthFacility, SocialProvider } from "@plumier/social-login";
import { fbProfile, params, getLoginUrl, portRegex, gitHubProfile, gitLabProfile, googleProfile, twitterProfile } from "./helper";
import { fixture } from "../helper";
import supertest = require("supertest");
import Axios from "axios"
import qs from "querystring"

jest.mock("axios")

class AuthController {
    @redirectUri()
    callback(@bind.oAuthUser() user: OAuthUser) {
        return user
    }
}

async function axiosResult(data: any): Promise<{ data: any }> {
    return { data }
}

function cleanupOAuthAuthorization(auth: string) {
    const tokens = auth.replace(/^OAuth /, "").split(", ").join("&")
    const params = qs.parse(tokens)
    params.oauth_timestamp = "\"\""
    params.oauth_nonce = "\"\""
    params.oauth_signature = "\"\""
    if (params.oauth_callback)
        params.oauth_callback = params.oauth_callback.toString().replace(portRegex, "")
    const result = qs.stringify(params, ", ").replace(/\%22/g, "\"")
    return `OAuth ${result}`
}

async function testOAuth20(provider: SocialProvider, Facility: Class, profile: any) {
    //exchange token
    (Axios.post as jest.Mock).mockClear();
    (Axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: "87b23deb-3fde-4de5-b726-c1a4bb2747ff" }));
    //get profile
    (Axios.get as jest.Mock).mockClear();
    (Axios.get as jest.Mock).mockReturnValue(axiosResult(profile));
    const app = await fixture(AuthController)
        .set(new Facility({ clientId: "123", clientSecret: "secret" }))
        .initialize()
    const request = supertest.agent(app.callback())
    const { text } = await request.get(`/auth/${provider.toLowerCase()}/login`)
    const loginUrl = getLoginUrl(text)
    const pars = params(loginUrl)
    const { body } = await request.get(`/auth/callback?state=${pars.state}&code=lorem`)
    const tokenRequest = (Axios.post as jest.Mock).mock.calls[0]
    tokenRequest[1].redirect_uri = tokenRequest[1].redirect_uri.replace(portRegex, "")
    return {
        result: body,
        tokenRequest,
        profileRequest: (Axios.get as jest.Mock).mock.calls[0]
    }
}

async function testOAuth10a(provider: SocialProvider, Facility: Class, profile: any) {
    (Axios as any as jest.Mock).mockClear();
    (Axios as any as jest.Mock)
        //request token
        .mockReturnValueOnce(axiosResult('oauth_token="123456"'))
        //exchange token
        .mockReturnValueOnce(axiosResult('oauth_token="12345"&oauth_token_secret="secret"'))
        //get profile
        .mockReturnValueOnce(axiosResult(profile));
    const app = await fixture(AuthController)
        .set(new Facility({ clientId: "123", clientSecret: "secret" }))
        .initialize()
    const request = supertest.agent(app.callback())
    const { text: reqTokenText } = await request.get(`/auth/${provider.toLowerCase()}/login`)
    const loginUrl = getLoginUrl(reqTokenText)
    const pars = params(loginUrl)
    const { body } = await request.get(`/auth/callback?oauth_token=${pars.oauth_token}&oauth_verifier="VERIFIER"`)
    const calls = (Axios as any as jest.Mock).mock.calls
    //cleanup
    calls[0][0].data.oauth_callback = calls[0][0].data.oauth_callback.replace(portRegex, "")
    calls[0][0].headers.Authorization = cleanupOAuthAuthorization(calls[0][0].headers.Authorization)
    calls[1][0].headers.Authorization = cleanupOAuthAuthorization(calls[1][0].headers.Authorization)
    calls[2][0].headers.Authorization = cleanupOAuthAuthorization(calls[2][0].headers.Authorization)
    return {
        result: body,
        requestTokenRequest: calls[0],
        tokenRequest: calls[1],
        profileRequest: calls[2]
    }
}

describe("OAuth Providers", () => {
    test("Facebook", async () => {
        const { profileRequest, result, tokenRequest } = await testOAuth20("Facebook", FacebookOAuthFacility, fbProfile)
        expect(tokenRequest).toMatchSnapshot()
        expect(profileRequest).toMatchSnapshot()
        expect(result).toMatchSnapshot()
    })

    test("Google", async () => {
        const { profileRequest, result, tokenRequest } = await testOAuth20("Google", GoogleOAuthFacility, googleProfile)
        expect(tokenRequest).toMatchSnapshot()
        expect(profileRequest).toMatchSnapshot()
        expect(result).toMatchSnapshot()
    })

    test("GitHub", async () => {
        const { profileRequest, result, tokenRequest } = await testOAuth20("GitHub", GitHubOAuthFacility, gitHubProfile)
        expect(tokenRequest).toMatchSnapshot()
        expect(profileRequest).toMatchSnapshot()
        expect(result).toMatchSnapshot()
    })

    test("GitLab", async () => {
        const { profileRequest, result, tokenRequest } = await testOAuth20("GitLab", GitLabOAuthFacility, gitLabProfile)
        expect(tokenRequest).toMatchSnapshot()
        expect(profileRequest).toMatchSnapshot()
        expect(result).toMatchSnapshot()
    })

    test("Twitter", async () => {
        const { profileRequest, result, tokenRequest, requestTokenRequest } = await testOAuth10a("Twitter", TwitterOAuthFacility, twitterProfile)
        expect(requestTokenRequest).toMatchSnapshot()
        expect(tokenRequest).toMatchSnapshot()
        expect(profileRequest).toMatchSnapshot()
        expect(result).toMatchSnapshot()
    })

    it("Twitter should not error when provided undefined profile picture", async () => {
        const { result } = await testOAuth10a("Twitter", TwitterOAuthFacility, {...twitterProfile, profile_image_url_https: undefined})
        expect(result).toMatchSnapshot()
    })
})