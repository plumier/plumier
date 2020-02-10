import { CookieName, OAuthProviderOption, OAuthUser, redirectUri } from "@plumier/social-login"
import Axios from "axios"
import Csrf from "csrf"
import { Context } from "koa"
import { bind, Class, response, route } from "plumier"
import qs from "querystring"

import { fixture } from "../helper"
import { error, getLoginUrl, params, portRegex, runServer } from "./helper"
import { FakeOAuth2Facility, oAuthServer } from "./oauth2-server"


/**
 * Run 2 fake oauth servers and a single oauth consumer server.
 */
async function appStub(controller: Class, mazeOpt?: OAuthProviderOption, googolOpt?: OAuthProviderOption) {
    // run fake oauth servers 
    const mazeServer = await runServer(await oAuthServer())
    const googolServer = await runServer(await oAuthServer())
    // run oauth consumer server on another port
    const koa = await fixture(controller)
        .set(new FakeOAuth2Facility("MazeBook", mazeServer.origin, mazeOpt))
        .set(new FakeOAuth2Facility("Googol", googolServer.origin, googolOpt))
        .initialize()
    const consumer = await runServer(koa)
    return {
        origin: consumer.origin,
        close: () => {
            mazeServer.server.close();
            googolServer.server.close();
            consumer.server.close()
        }
    }
}


async function login(url: string): Promise<{ status: number, profile: any, authUrl: string, cookie: string[] }> {
    const loginResp = await Axios.get(url)
    const loginUrl = getLoginUrl(loginResp.data)
    const cookie: string = loginResp.headers["set-cookie"].join("; ")
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
        cookie: loginResp.headers["set-cookie"]
    }
}

const opt = { clientSecret: "super secret", clientId: "1234" }

describe("OAuth 2.0", () => {
    class AuthController {
        @redirectUri()
        callback(@bind.oAuthUser() user: OAuthUser) {
            return user
        }
    }

    describe("Functionalities", () => {
        it("Should login properly", async () => {
            const servers = await appStub(AuthController, opt, opt)
            const mazeProfile = await login(`${servers.origin}/auth/mazebook/login`)
            const googolProfile = await login(`${servers.origin}/auth/googol/login`)
            expect({ ...mazeProfile, authUrl: "", cookie: "" }).toMatchSnapshot()
            expect({ ...googolProfile, authUrl: "", cookie: "" }).toMatchSnapshot()
            servers.close()
        })

        it("Should save provider on cookie", async () => {
            const servers = await appStub(AuthController, opt, opt)
            const { cookie } = await login(`${servers.origin}/auth/mazebook/login`)
            expect(cookie.find(x => x.match(CookieName.provider))).toMatchSnapshot()
            servers.close()
        })

        it("Should save CSRF secret on cookie and CSRF token on state parameter", async () => {
            const servers = await appStub(AuthController, opt, opt)
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
            const servers = await appStub(AuthController, opt, opt)
            const { authUrl } = await login(`${servers.origin}/auth/mazebook/login`)
            const redirect = params(authUrl).redirect_uri.replace(portRegex, "")
            expect(redirect).toMatchSnapshot()
            servers.close()
        })

        it("Should use default environment variable", async () => {
            process.env.PLUM_MAZEBOOK_CLIENT_ID = "123"
            process.env.PLUM_MAZEBOOK_CLIENT_SECRET = "secret"
            process.env.PLUM_GOOGOL_CLIENT_ID = "123"
            process.env.PLUM_GOOGOL_CLIENT_SECRET = "secret"
            const servers = await appStub(AuthController)
            const { status } = await login(`${servers.origin}/auth/mazebook/login`)
            expect(status).toBe(200)
            servers.close()
            delete process.env.PLUM_MAZEBOOK_CLIENT_ID
            delete process.env.PLUM_MAZEBOOK_CLIENT_SECRET
            delete process.env.PLUM_GOOGOL_CLIENT_ID
            delete process.env.PLUM_GOOGOL_CLIENT_SECRET
        })

        it("Should able to change login url", async () => {
            const servers = await appStub(AuthController, {
                clientSecret: "super secret",
                clientId: "1234",
                loginEndPoint: "/auth/mazebook/sign-in",
            }, opt)
            const { status } = await login(`${servers.origin}/auth/mazebook/sign-in`)
            expect(status).toBe(200)
            servers.close()
        })

        it("Should able add extra profile params", async () => {
            const servers = await appStub(AuthController, {
                clientSecret: "super secret",
                clientId: "1234",
                profileParams: { lorem: "ipsum", dolor: "sit" }
            }, opt)
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
            const servers = await appStub(AuthController, opt, opt)
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
            const servers = await appStub(AuthController, opt, opt)
            const profile = await login(`${servers.origin}/auth/mazebook/login`)
            expect(profile.profile.replace(/var message = '(.*)';/, "")).toMatchSnapshot()
            servers.close()
        })

        it("Should able to set postMessage origin", async () => {
            class AuthController {
                @redirectUri()
                callback(@bind.oAuthUser() user: OAuthUser, @bind.ctx() ctx:Context) {
                    return response.postMessage(user, ctx.origin)
                }
            }
            const servers = await appStub(AuthController, opt, opt)
            const profile = await login(`${servers.origin}/auth/mazebook/login`)
            expect(profile.profile.replace(/var message = '(.*)';/, "").replace(portRegex, "")).toMatchSnapshot()
            servers.close()
        })
    })

    describe("Durability", () => {
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

        it("Should check for invalid CSRF token", async () => {
            const servers = await appStub(AuthController, opt, opt)
            const loginResp = await Axios.get(`${servers.origin}/auth/mazebook/login`)
            const loginUrl = /const REDIRECT = '(.*)'/.exec(loginResp.data)![1]
            const pars = params(loginUrl)
            delete pars.state
            const newLoginUrl = loginUrl.split("?")![0] + "?" + qs.stringify(pars)
            const cookie: string = loginResp.headers["set-cookie"].join("; ")
            const fn = jest.fn()
            try {
                await Axios.post(newLoginUrl, undefined, { headers: { cookie } })
            } catch (e) {
                fn(e.response)
            }
            expect(fn.mock.calls[0][0].status).toBe(400)
            servers.close()
        })

        it("Should show proper error when internal OAuth server error occur", async () => {
            class AuthController {
                @redirectUri()
                @route.get("/auth/invalid-redirect")
                callback(@bind.oAuthUser() user: OAuthUser) {
                    return user
                }
            }
            const servers = await appStub(AuthController, opt, opt)
            const { authUrl, cookie, ...profile } = await login(`${servers.origin}/auth/mazebook/login`)
            expect(profile).toMatchSnapshot()
            servers.close()
        })
    })

})