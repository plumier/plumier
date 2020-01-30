import { bind, Class, route } from "@plumier/core"
import { redirectUri, GoogleOAuthFacility, OAuthFacility, OAuthUser } from "@plumier/social-login"
import axios from "axios"
import Csrf from "csrf"
import qs from "querystring"
import supertest = require("supertest")

import { fixture } from "../helper"
import { axiosResult, googleProfile } from "./helper"


function appStub(opt?: { controller?: Class, csrfEndPoint?: string, loginEndPoint?: string, profileParams?: {} }) {
    class AuthController {
        @redirectUri("Google")
        @route.get("/auth/google/callback")
        callback() {

        }
    }
    return fixture(opt?.controller ?? AuthController)
        .set(new OAuthFacility({ csrfEndpoint: opt?.csrfEndPoint }))
        .set(new GoogleOAuthFacility({ clientId: "123456", clientSecret: "super-secret", loginEndPoint: opt?.loginEndPoint, profileParams: opt?.profileParams }))
        .initialize()
}

const getState = async (rqs: supertest.SuperTest<supertest.Test>) => {
    await rqs.get("/auth/csrf-secret")
    const resp = await rqs.get("/auth/google/login")
    return new URL(resp.header["location"]).searchParams.get("state")
}

jest.mock("axios")

function mockAxios() {
    //exchange token
    (axios.post as jest.Mock).mockClear();
    (axios.post as jest.Mock).mockReturnValue(axiosResult({ access_token: "87b23deb-3fde-4de5-b726-c1a4bb2747ff" }));
    //get profile
    (axios.get as jest.Mock).mockClear();
    (axios.get as jest.Mock).mockReturnValue(axiosResult(googleProfile));
}

describe("GoogleOAuthFacility", () => {
    it("Should throw when no redirect uri handler provided", async () => {
        class AuthController { }
        expect(appStub({ controller: AuthController }))
            .rejects.toThrowError("No Google redirect uri handler found")
    })

    it("Should throw when provided parameterized redirect uri handler", async () => {
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/callback/:id")
            callback(id: string, @bind.oAuthUser() user: OAuthUser) {
            }
        }
        expect(appStub({ controller: AuthController }))
            .rejects.toThrowError("Parameterized route is not supported on Google callback uri")
    })

    it("Should use default configuration", async () => {
        process.env.PLUM_GOOGLE_CLIENT_ID = "123"
        process.env.PLUM_GOOGLE_CLIENT_SECRET = "secret"
        mockAxios()
        const fn = jest.fn()
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/callback")
            callback(@bind.oAuthUser() user: OAuthUser) {
                fn(user)
            }
        }
        const app = await fixture(AuthController)
            .set(new OAuthFacility())
            .set(new GoogleOAuthFacility())
            .initialize()
        const request = await supertest.agent(app.callback())
        const state = await getState(request)
        await request.get(`/auth/google/callback?code=lorem&state=${state}`)
            .expect(200)
        const tokenCall: any[] = (axios.post as jest.Mock).mock.calls[0]
        tokenCall[1].redirect_uri = tokenCall[1].redirect_uri.replace(/:[0-9]{4,5}/, "")
        expect(tokenCall).toMatchSnapshot()
    })

    it("Should throw error when no clientId default configuration provided", async () => {
        delete process.env.PLUM_GOOGLE_CLIENT_ID
        process.env.PLUM_GOOGLE_CLIENT_SECRET = "secret"
        const fn = jest.fn()
        try {
            class AuthController {
                @redirectUri("Google")
                @route.get("/auth/google/callback")
                callback(@bind.oAuthUser() user: OAuthUser) {
                }
            }
            await fixture(AuthController)
                .set(new OAuthFacility())
                .set(new GoogleOAuthFacility())
                .initialize()
        }
        catch (e) {
            fn(e)
        }
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should throw error when no clientSecret default configuration provided", async () => {
        process.env.PLUM_GOOGLE_CLIENT_ID = "1234"
        delete process.env.PLUM_GOOGLE_CLIENT_SECRET
        const fn = jest.fn()
        try {
            class AuthController {
                @redirectUri("Google")
                @route.get("/auth/google/callback")
                callback(@bind.oAuthUser() user: OAuthUser) {
                }
            }
            await fixture(AuthController)
                .set(new OAuthFacility())
                .set(new GoogleOAuthFacility())
                .initialize()
        }
        catch (e) {
            fn(e)
        }
        expect(fn.mock.calls).toMatchSnapshot()
    })
})

describe("Login Endpoint", () => {
    it("Should serve google login endpoint", async () => {
        const app = await appStub()
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        await request.get("/auth/google/login")
            .expect(302)
    })

    it("Should redirected to google", async () => {
        const app = await appStub()
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/google/login")
            .expect(302)
        const url = new URL(resp.header["location"])
        expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth")
    })

    it("Should detect redirect uri properly", async () => {
        const app = await appStub()
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/google/login")
            .expect(302)
        const url = new URL(resp.header["location"])
        expect(url.searchParams.get("redirect_uri")?.replace(/:[0-9]{4,5}/, ""))
            .toBe("http://127.0.0.1/auth/google/callback")
    })

    it("Should detect redirect uri if changed", async () => {
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/redirect-uri")
            callback() {

            }
        }
        const app = await appStub({ controller: AuthController })
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/google/login")
            .expect(302)
        const url = new URL(resp.header["location"])
        expect(url.searchParams.get("redirect_uri")?.replace(/:[0-9]{4,5}/, ""))
            .toBe("http://127.0.0.1/auth/google/redirect-uri")
    })

    it("Should add state parameter which valid with csrf secret", async () => {
        const app = await appStub()
        const request = supertest.agent(app.callback())
        const resp = await request.get("/auth/csrf-secret")
        const secret = resp.header["set-cookie"][0].split(";")[0].split("=")[1]
        const redirect = await request.get("/auth/google/login")
            .expect(302)
        const url = new URL(redirect.header["location"])
        const state = url.searchParams.get("state")
        const csrf = new Csrf()
        expect(csrf.verify(secret, state?.split(".")[1]!)).toBe(true)
    })

    it("Should throw 400 if no csrf secret", async () => {
        const app = await appStub()
        const request = supertest.agent(app.callback())
        await request.get("/auth/google/login")
            .expect(400, { "status": 400, "message": "Request doesn\'t contains csrf secret" })
    })

    it("Should include other required parameters", async () => {
        const app = await appStub()
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/google/login")
            .expect(302)
        const query = qs.parse(resp.header["location"].split("?")[1])
        delete query["redirect_uri"]
        delete query["state"]
        expect(query).toMatchSnapshot()
    })

    it("Should able to include other parameters from login endpoint", async () => {
        const app = await appStub()
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/google/login?foo=bar&lorem=ipsum")
            .expect(302)
        const url = new URL(resp.header["location"])
        expect(url.searchParams.get("foo")).toBe("bar")
        expect(url.searchParams.get("lorem")).toBe("ipsum")
    })

    it("Should able to change the login endpoint", async () => {
        const app = await appStub({ loginEndPoint: "/auth/google-login" })
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/google-login")
            .expect(302)
        const url = new URL(resp.header["location"])
        expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth")
    })

    it("Should provide case insensitive login endpoint", async () => {
        const app = await appStub({ loginEndPoint: "/auth/GOOGLE-LOGIN" })
        const request = supertest.agent(app.callback())
        await request.get("/auth/csrf-secret")
        const resp = await request.get("/auth/google-login")
            .expect(302)
        const url = new URL(resp.header["location"])
        expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth")
    })
})

describe("Redirect URI Handler", () => {
    it("Should handle redirection properly", async () => {
        mockAxios()
        const fn = jest.fn()
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/callback")
            callback(@bind.oAuthUser() user: OAuthUser) {
                fn(user)
            }
        }
        const app = await appStub({ controller: AuthController })
        const request = await supertest.agent(app.callback())
        const state = await getState(request)
        await request.get(`/auth/google/callback?code=lorem&state=${state}`)
            .expect(200)
        expect(fn.mock.calls[0][0]).toMatchSnapshot()
        const tokenCall: any[] = (axios.post as jest.Mock).mock.calls[0]
        tokenCall[1].redirect_uri = tokenCall[1].redirect_uri.replace(/:[0-9]{4,5}/, "")
        expect(tokenCall).toMatchSnapshot()
        const profileCall: any[] = (axios.get as jest.Mock).mock.calls[0]
        expect(profileCall).toMatchSnapshot()
    })

    it("Should able to override the profile params", async () => {
        mockAxios()
        const fn = jest.fn()
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/callback")
            callback(@bind.oAuthUser() user: OAuthUser) {
                fn(user)
            }
        }
        const app = await appStub({ controller: AuthController, profileParams: { fields: "id" } })
        const request = await supertest.agent(app.callback())
        const state = await getState(request)
        await request.get(`/auth/google/callback?code=lorem&state=${state}`)
            .expect(200)
        expect(fn.mock.calls[0][0]).toMatchSnapshot()
        const call: any[] = (axios.get as jest.Mock).mock.calls[0]
        expect(call).toMatchSnapshot()
    })

    it("Should return 400 when no state parameter provided", async () => {
        const fn = jest.fn()
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/callback")
            callback(@bind.oAuthUser() user: OAuthUser) {
                fn(user)
            }
        }
        const app = await appStub({ controller: AuthController })
        const request = await supertest.agent(app.callback())
        await request.get(`/auth/google/callback?code=lorem`)
            .expect(400, { status: 400, message: "No state parameter provided" })
    })

    it("Should return 400 when no authorization code specified", async () => {
        const fn = jest.fn()
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/callback")
            callback(@bind.oAuthUser() user: OAuthUser) {
                fn(user)
            }
        }
        const app = await appStub({ controller: AuthController })
        const request = await supertest.agent(app.callback())
        await request.get(`/auth/google/callback?state=lorem`)
            .expect(400, { status: 400, message: "No authorization code provided" })
    })

    it("Should return 400 when no csrf secret on request", async () => {
        mockAxios()
        const fn = jest.fn()
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/callback")
            callback(@bind.oAuthUser() user: OAuthUser) {
                fn(user)
            }
        }
        const app = await appStub({ controller: AuthController })
        const request = await supertest.agent(app.callback())
        await request.get(`/auth/google/callback?code=lorem&state=Google.ipsum`)
            .expect(400, { status: 400, message: "Request doesn't contains csrf secret" })
    })

    it("Should return 400 when provided invalid csrf token", async () => {
        const fn = jest.fn()
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/callback")
            callback(@bind.oAuthUser() user: OAuthUser) {
                fn(user)
            }
        }
        const app = await appStub({ controller: AuthController })
        const request = await supertest.agent(app.callback())
        await getState(request)
        await request.get(`/auth/google/callback?code=lorem&state=Google.lorem`)
            .expect(400, { status: 400, message: "Invalid csrf token" })
    })

    it("Should forward to next invocation for different path", async () => {
        class AuthController {
            @redirectUri("Google")
            @route.get("/auth/google/callback")
            callback(@bind.oAuthUser() user: OAuthUser) {
            }
        }
        const app = await appStub({ controller: AuthController })
        const request = await supertest.agent(app.callback())
        await request.get(`/home/index`)
            .expect(404)
    })
})