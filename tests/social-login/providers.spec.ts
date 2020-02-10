import { Class, bind } from "@plumier/core";
import { FacebookOAuthFacility, redirectUri, OAuthUser, GitHubOAuthFacility, GitLabOAuthFacility, GoogleOAuthFacility } from "@plumier/social-login";
import { fbProfile, params, getLoginUrl, portRegex, gitHubProfile, gitLabProfile, googleProfile } from "./helper";
import { fixture } from "../helper";
import supertest = require("supertest");
import Axios from "axios"

jest.mock("axios")

describe("OAuth 2.0 Providers", () => {
    class AuthController {
        @redirectUri()
        callback(@bind.oAuthUser() user: OAuthUser) {
            return user
        }
    }

    async function axiosResult(data: any): Promise<{ data: any }> {
        return { data }
    }

    const providers: { [key: string]: [string, Class, any] } = {
        "facebook": ["Facebook", FacebookOAuthFacility, fbProfile],
        "github": ["GitHub", GitHubOAuthFacility, gitHubProfile],
        "gitlab": ["GitLab", GitLabOAuthFacility, gitLabProfile],
        "google": ["Google", GoogleOAuthFacility, googleProfile]
    }

    for (const key in providers) {
        const [provider, Facility, profile] = providers[key]


        function mockAxios() {
            //exchange token
            (Axios.post as jest.Mock).mockClear();
            (Axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: "87b23deb-3fde-4de5-b726-c1a4bb2747ff" }));
            //get profile
            (Axios.get as jest.Mock).mockClear();
            (Axios.get as jest.Mock).mockReturnValue(axiosResult(profile));
        }

        async function createApp() {
            return fixture(AuthController)
                .set(new Facility({ clientId: "123", clientSecret: "secret" }))
                .initialize()
        }
        describe(provider, () => {
            it.only("Should run properly", async () => {
                mockAxios()
                const app = await createApp()
                const request = supertest.agent(app.callback())
                const { text } = await request.get(`/auth/${key}/login`)
                const loginUrl = getLoginUrl(text)
                const pars = params(loginUrl)
                const { body } = await request.get(`/auth/callback?state=${pars.state}&code=lorem`)
                const profileRequest = (Axios.post as jest.Mock).mock.calls[0]
                profileRequest[1].redirect_uri = profileRequest[1].redirect_uri.replace(portRegex, "")
                expect(body).toMatchSnapshot()
                expect((Axios.get as jest.Mock).mock.calls[0]).toMatchSnapshot()
                expect(profileRequest).toMatchSnapshot()
            })
        })
    }
})