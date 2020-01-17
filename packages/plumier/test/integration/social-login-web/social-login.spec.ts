import { bind, response, route } from "@plumier/core"
import {
    FacebookOAuthFacility,
    GitHubOAuthFacility,
    GitLabOAuthFacility,
    OAuthFacility,
    OAuthUser,
    redirectUri,
    GoogleOAuthFacility,
} from "@plumier/social-login"
import axios from "axios"
import supertest = require("supertest")

import { fixture } from "../../helper"
import { axiosResult, fbProfile, gitHubProfile, gitLabProfile, googleProfile } from "./helper"

describe("Csrf Secret", () => {
    it("Should provide csrf secret properly", async () => {
        class AnimalController { }
        const app = await fixture(AnimalController).set(new OAuthFacility()).initialize()
        const resp = await supertest.agent(app.callback())
            .get("/auth/csrf-secret")
            .expect(200)
        expect(resp.header["set-cookie"][0]).toContain("plum-social-login:csrf-secret=")
    })

    it("Should able to change the csrf endpoint", async () => {
        class AnimalController { }
        const app = await fixture(AnimalController).set(new OAuthFacility({ csrfEndpoint: "/auth/identity" })).initialize()
        const resp = await supertest.agent(app.callback())
            .get("/auth/identity")
            .expect(200)
        expect(resp.header["set-cookie"][0]).toContain("plum-social-login:csrf-secret=")
    })

    it("Should treat csrf endpoint with case insensitive", async () => {
        class AnimalController { }
        const app = await fixture(AnimalController).set(new OAuthFacility({ csrfEndpoint: "/auth/CsrfIdentity" })).initialize()
        const resp = await supertest.agent(app.callback())
            .get("/auth/CSRFIdentity")
            .expect(200)
        expect(resp.header["set-cookie"][0]).toContain("plum-social-login:csrf-secret=")
    })
})

describe("Post Message", () => {
    it("Should provide post message", () => {
        expect(response.postMessage({ message: "Hello world" })).toMatchSnapshot()
    })

    it("Should able to set origin on post message", () => {
        expect(response.postMessage({ message: "Hello world" }, "www.google.com")).toMatchSnapshot()
    })
})


jest.mock("axios")

function mockAxios(data: any) {
    //exchange token
    (axios.post as jest.Mock).mockClear();
    (axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: "87b23deb-3fde-4de5-b726-c1a4bb2747ff" }));
    //get profile
    (axios.get as jest.Mock).mockClear();
    (axios.get as jest.Mock)
        .mockReturnValue(axiosResult(data))
}

describe("Redirect Uri", () => {
    const fn = jest.fn()
    class AuthController {
        @route.get()
        @redirectUri()
        callback(@bind.oAuthUser() user: OAuthUser) {
            fn(user)
        }
    }
    const koa = fixture(AuthController)
        .set(new OAuthFacility())
        .set(new FacebookOAuthFacility({ clientId: "123456", clientSecret: "super-secret" }))
        .set(new GoogleOAuthFacility({ clientId: "123456", clientSecret: "super-secret" }))
        .set(new GitHubOAuthFacility({ clientId: "123456", clientSecret: "super-secret" }))
        .set(new GitLabOAuthFacility({ clientId: "123456", clientSecret: "super-secret" }))

    

    it("Should able to handle facebook redirect uri", async () => {
        fn.mockClear()
        mockAxios(fbProfile)
        const app = await koa.initialize()
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/facebook/login")
        const token = new URL(resp.header["location"]).searchParams.get("state")
        await request
            .get(`/auth/callback?code=lorem&state=${token}`)
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to handle google redirect uri", async () => {
        fn.mockClear()
        mockAxios(googleProfile)
        const app = await koa.initialize()
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/google/login")
        const token = new URL(resp.header["location"]).searchParams.get("state")
        await request
            .get(`/auth/callback?code=lorem&state=${token}`)
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to handle github redirect uri", async () => {
        fn.mockClear()
        mockAxios(gitHubProfile)
        const app = await koa.initialize()
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/github/login")
        const token = new URL(resp.header["location"]).searchParams.get("state")
        await request
            .get(`/auth/callback?code=lorem&state=${token}`)
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should able to handle gitlab redirect uri", async () => {
        fn.mockClear()
        mockAxios(gitLabProfile)
        const app = await koa.initialize()
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/gitlab/login")
        const token = new URL(resp.header["location"]).searchParams.get("state")
        await request
            .get(`/auth/callback?code=lorem&state=${token}`)
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
})
