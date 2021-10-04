import "@plumier/testing"

import { DefaultFacility, PlumierApplication, RouteMetadata } from "@plumier/core"
import { CookieName, OAuthProviderOption, OAuthUser, redirectUri } from "@plumier/social-login"
import Axios from "axios"
import Csrf from "csrf"
import { Context } from "koa"
import { bind, Class, response, route } from "plumier"
import qs from "querystring"

import { fixture } from "../helper"
import { error, getLoginUrl, params, portRegex, runServer } from "./helper"
import { FakeOAuth10aFacility, oAuth10aServer } from "./oauth10a-server"
import { FakeOAuth2Facility, oAuth20Server } from "./oauth20-server"

/**
 * Run 2 fake oauth servers and a single oauth consumer server.
 */
async function appStub(controller: Class, mazeOpt?: OAuthProviderOption, googolOpt?: OAuthProviderOption, teeterOpt?: OAuthProviderOption, debugMode?: boolean) {
    // run fake oauth servers 
    const mazeServer = await runServer(await oAuth20Server())
    const googolServer = await runServer(await oAuth20Server())
    const teeterServer = await runServer(await oAuth10aServer())
    const debug = debugMode ? "debug" : "production"
    // run oauth consumer server on another port
    const koa = await fixture(controller)
        .set(new FakeOAuth2Facility("MazeBook", mazeServer.origin, mazeOpt))
        .set(new FakeOAuth2Facility("Googol", googolServer.origin, googolOpt))
        .set(new FakeOAuth10aFacility("Teeter", teeterServer.origin, teeterOpt))
        .set({ mode: debug })
        .initialize()
    const consumer = await runServer(koa)
    return {
        origin: consumer.origin,
        close: () => {
            mazeServer.server.close();
            googolServer.server.close();
            consumer.server.close()
            teeterServer.server.close()
        }
    }
}

async function login(url: string): Promise<{ status: number, profile: any, authUrl: string, cookie: string[] }> {
    const loginResp = await Axios.get(url)
    const loginUrl = getLoginUrl(loginResp.data)
    const cookie: string = (loginResp.headers["set-cookie"] as unknown as string[]).join("; ")
    var profileResp: any
    try {
        profileResp = await Axios.post(loginUrl, undefined, { headers: { cookie } })
    } catch (e) {
        profileResp = e.response
    }
    return {
        status: profileResp.status,
        profile: profileResp.data,
        authUrl: loginUrl,
        cookie: loginResp.headers["set-cookie"] as any
    }
}

const opt = { clientSecret: "super secret", clientId: "1234" }

class AuthController {
    @redirectUri()
    callback(@bind.oAuthUser() user: OAuthUser) {
        return user
    }
}


describe("OAuth 2.0", () => {
    it("Should login properly", async () => {
        const servers = await appStub(AuthController, opt, opt, opt)
        const mazeProfile = await login(`${servers.origin}/auth/mazebook/login`)
        const googolProfile = await login(`${servers.origin}/auth/googol/login`)
        expect({ ...mazeProfile, authUrl: "", cookie: "" }).toMatchSnapshot()
        expect({ ...googolProfile, authUrl: "", cookie: "" }).toMatchSnapshot()
        servers.close()
    })

    it("Should save provider on cookie", async () => {
        const servers = await appStub(AuthController, opt, opt, opt)
        const { cookie } = await login(`${servers.origin}/auth/mazebook/login`)
        expect(cookie.find(x => x.match(CookieName.provider))).toMatchSnapshot()
        servers.close()
    })

    it("Should save CSRF secret on cookie and CSRF token on state parameter", async () => {
        const servers = await appStub(AuthController, opt, opt, opt)
        const { cookie, authUrl } = await login(`${servers.origin}/auth/mazebook/login`)
        const tokenRegex = /^plum-oauth:csrf-secret=(.*?);.*/i
        const theCookie = cookie.find(x => x.match(CookieName.csrfSecret))!
        const secret = theCookie.match(tokenRegex)![1]
        const token = params(authUrl).state;
        const csrf = new Csrf()
        expect(csrf.verify(secret, token)).toBe(true)
        expect(theCookie.replace(secret, "")).toMatchSnapshot()
        servers.close()
    })

    it("Should attach proper redirect URI on login url", async () => {
        const servers = await appStub(AuthController, opt, opt, opt)
        const { authUrl } = await login(`${servers.origin}/auth/mazebook/login`)
        const redirect = params(authUrl).redirect_uri.replace(portRegex, "")
        expect(redirect).toMatchSnapshot()
        servers.close()
    })

    it("Should able to change login url", async () => {
        const servers = await appStub(AuthController, {
            clientSecret: "super secret",
            clientId: "1234",
            loginEndPoint: "/auth/mazebook/sign-in",
        }, opt, opt)
        const { status } = await login(`${servers.origin}/auth/mazebook/sign-in`)
        expect(status).toBe(200)
        servers.close()
    })

    it("Should able add extra profile params", async () => {
        const servers = await appStub(AuthController, {
            clientSecret: "super secret",
            clientId: "1234",
            profileParams: { lorem: "ipsum", dolor: "sit" }
        }, opt, opt)
        const { authUrl, cookie, ...profile } = await login(`${servers.origin}/auth/mazebook/login`)
        expect(profile).toMatchSnapshot()
        servers.close()
    })

    it("Should able to distinguish global callback and specific callback", async () => {
        class AuthController {
            @redirectUri()
            callback(@bind.oAuthUser() user: OAuthUser) {
                return user
            }

            @redirectUri("MazeBook" as any)
            fake(@bind.oAuthUser() user: OAuthUser) {
                return { lorem: "ipsum" }
            }
        }
        const servers = await appStub(AuthController, opt, opt, opt)
        const { authUrl, cookie, ...profile } = await login(`${servers.origin}/auth/mazebook/login`)
        expect(profile).toMatchSnapshot()
        servers.close()
    })

    it("Should able to send postMessage UI", async () => {
        class AuthController {
            @redirectUri()
            callback(@bind.oAuthUser() user: OAuthUser) {
                return response.postMessage(user)
            }
        }
        const servers = await appStub(AuthController, opt, opt, opt)
        const profile = await login(`${servers.origin}/auth/mazebook/login`)
        expect(profile.profile.replace(/var message = '(.*)';/, "")).toMatchSnapshot()
        servers.close()
    })

    it("Should able to set postMessage origin", async () => {
        class AuthController {
            @redirectUri()
            callback(@bind.oAuthUser() user: OAuthUser, @bind.ctx() ctx: Context) {
                return response.postMessage(user, ctx.origin)
            }
        }
        const servers = await appStub(AuthController, opt, opt, opt)
        const profile = await login(`${servers.origin}/auth/mazebook/login`)
        expect(profile.profile.replace(/var message = '(.*)';/, "").replace(portRegex, "")).toMatchSnapshot()
        servers.close()
    })

    it("Should able to bind the raw profile", async () => {
        class AuthController {
            @redirectUri()
            callback(@bind.oAuthProfile() user: any) {
                return user
            }
        }
        const servers = await appStub(AuthController, opt, opt, opt)
        const profile = await login(`${servers.origin}/auth/mazebook/login`)
        expect(profile.profile).toMatchSnapshot()
        servers.close()
    })

    it("Should able to bind the oauth access_token", async () => {
        class AuthController {
            @redirectUri()
            callback(@bind.oAuthToken() token: any) {
                return token
            }
        }
        const servers = await appStub(AuthController, opt, opt, opt)
        const profile = await login(`${servers.origin}/auth/mazebook/login`)
        expect(profile.profile).toMatchSnapshot()
        servers.close()
    })


    it("Should check for invalid CSRF token", async () => {
        const servers = await appStub(AuthController, opt, opt, opt)
        const loginResp = await Axios.get(`${servers.origin}/auth/mazebook/login`)
        const loginUrl = /const REDIRECT = '(.*)'/.exec(loginResp.data)![1]
        const pars = params(loginUrl)
        delete pars.state
        const newLoginUrl = loginUrl.split("?")![0] + "?" + qs.stringify(pars)
        const cookie: string = (loginResp.headers["set-cookie"] as unknown as string[]).join("; ")
        const fn = jest.fn()
        try {
            await Axios.post(newLoginUrl, undefined, { headers: { cookie } })
        } catch (e) {
            fn(e.response)
        }
        expect(fn.mock.calls[0][0].status).toBe(400)
        servers.close()
    })
})

describe("OAuth 1.0a", () => {
    it("Should login properly", async () => {
        const servers = await appStub(AuthController, opt, opt, opt)
        const teeterProfile = await login(`${servers.origin}/auth/teeter/login`)
        expect({ ...teeterProfile, authUrl: "", cookie: "" }).toMatchSnapshot()
        servers.close()
    })

    it("Should show proper error when no oauth_token provided on cookie", async () => {
        const servers = await appStub(AuthController, opt, opt, opt)
        const loginResp = await Axios.get(`${servers.origin}/auth/teeter/login`)
        const loginUrl = /const REDIRECT = '(.*)'/.exec(loginResp.data)![1]
        const pars = params(loginUrl)
        delete pars.oauth_token
        const newLoginUrl = loginUrl.split("?")![0] + "?" + qs.stringify(pars)
        const cookie: string = (loginResp.headers["set-cookie"] as unknown as string[]).join("; ")
        const fn = jest.fn()
        try {
            await Axios.post(newLoginUrl, undefined, { headers: { cookie } })
        } catch (e) {
            fn(e.response)
        }
        expect(fn.mock.calls[0][0].status).toBe(400)
        servers.close()
    })
})

describe("Virtual Routes", () => {
    it("Should print virtual routes properly", async () => {
        const mock = console.mock()
        const servers = await appStub(AuthController, opt, opt, opt, true)
        expect(mock.mock.calls).toMatchSnapshot()
        servers.close()
    })
    it("Should provide proper route information for swagger", async () => {
        const fn = jest.fn()
        class MyFacility extends DefaultFacility {
            async initialize(app: Readonly<PlumierApplication>, routes: RouteMetadata[]) {
                fn(routes.find(x => x.kind === "VirtualRoute"))
            }
        }
        const mazeServer = await runServer(await oAuth20Server())
        // run oauth consumer server on another port
        const koa = await fixture(AuthController)
            .set(new FakeOAuth2Facility("MazeBook", mazeServer.origin, { clientSecret: "super secret", clientId: "1234" }))
            .set(new MyFacility())
            .set({ mode: "production" })
            .initialize()
        const consumer = await runServer(koa)
        expect(fn.mock.calls).toMatchSnapshot()
        mazeServer.server.close();
        consumer.server.close()
    })
})

describe("Durability", () => {
    it("Should use default environment variable", async () => {
        process.env.PLUM_MAZEBOOK_CLIENT_ID = "123"
        process.env.PLUM_MAZEBOOK_CLIENT_SECRET = "secret"
        process.env.PLUM_GOOGOL_CLIENT_ID = "123"
        process.env.PLUM_GOOGOL_CLIENT_SECRET = "secret"
        process.env.PLUM_TEETER_CLIENT_ID = "123"
        process.env.PLUM_TEETER_CLIENT_SECRET = "secret"
        const servers = await appStub(AuthController)
        const { status } = await login(`${servers.origin}/auth/mazebook/login`)
        expect(status).toBe(200)
        servers.close()
        delete process.env.PLUM_MAZEBOOK_CLIENT_ID
        delete process.env.PLUM_MAZEBOOK_CLIENT_SECRET
        delete process.env.PLUM_GOOGOL_CLIENT_ID
        delete process.env.PLUM_GOOGOL_CLIENT_SECRET
        delete process.env.PLUM_TEETER_CLIENT_ID
        delete process.env.PLUM_TEETER_CLIENT_SECRET
    })

    it("Should throw error when no Client ID provided", async () => {
        const plum = fixture(AuthController)
            .set(new FakeOAuth2Facility("MazeBook", "http://mazebook.com", opt))
            .set(new FakeOAuth2Facility("Googol", "http://googol.com", { clientSecret: "lorem" }))
        const fn = await error(plum.initialize())
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should throw error when no Client SECRET provided", async () => {
        const plum = fixture(AuthController)
            .set(new FakeOAuth2Facility("MazeBook", "http://mazebook.com", { clientId: "123" }))
            .set(new FakeOAuth2Facility("Googol", "http://googol.com", opt))
        const fn = await error(plum.initialize())
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should throw error when no redirect uri provided", async () => {
        class AnimalController {
            @redirectUri("Googol" as any)
            callback(@bind.oAuthUser() user: OAuthUser) {
                return user
            }
        }
        const plum = fixture(AnimalController)
            .set(new FakeOAuth2Facility("Googol", "http://googol.com", opt))
            .set(new FakeOAuth2Facility("MazeBook", "http://mazebook.com", { clientId: "123" }))
        const fn = await error(plum.initialize())
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should throw error when provided redirect uri with parameter", async () => {
        class AnimalController {
            @redirectUri()
            @route.get("/callback/:id")
            callback(id: string, @bind.oAuthUser() user: OAuthUser) {
                return user
            }
        }
        const plum = fixture(AnimalController)
            .set(new FakeOAuth2Facility("Googol", "http://googol.com", opt))
            .set(new FakeOAuth2Facility("MazeBook", "http://mazebook.com", { clientId: "123" }))
        const fn = await error(plum.initialize())
        expect(fn.mock.calls).toMatchSnapshot()
    })

    it("Should throw error when provided non GET redirect uri", async () => {
        class AnimalController {
            @redirectUri()
            @route.post()
            callback(@bind.oAuthUser() user: OAuthUser) {
                return user
            }
        }
        const plum = fixture(AnimalController)
            .set(new FakeOAuth2Facility("Googol", "http://googol.com", opt))
            .set(new FakeOAuth2Facility("MazeBook", "http://mazebook.com", { clientId: "123" }))
        const fn = await error(plum.initialize())
        expect(fn.mock.calls).toMatchSnapshot()
    })


    it("Should show proper error when internal OAuth server error occur", async () => {
        class AuthController {
            @redirectUri()
            @route.get("/auth/invalid-redirect")
            callback(@bind.oAuthUser() user: OAuthUser) {
                return user
            }
        }
        const servers = await appStub(AuthController, opt, opt, opt)
        const { authUrl, cookie, ...profile } = await login(`${servers.origin}/auth/mazebook/login`)
        expect(profile).toMatchSnapshot()
        servers.close()
    })
})
