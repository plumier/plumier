import {
    Authenticated,
    AuthorizationContext,
    AuthPolicy,
    authPolicy,
    bind,
    CustomAuthorizer,
    DefaultFacility,
    entity,
    entityPolicy,
    entityProvider,
    PlumierApplication,
    Public,
    responseType,
    RouteMetadata
} from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { noop, reflect, type } from "@plumier/reflect"
import "@plumier/testing"
import { cleanupConsole } from "@plumier/testing"
import { sign } from "jsonwebtoken"
import Koa from "koa"
import { authorize, domain, route, val } from "plumier"
import Supertest from "supertest"
import { fixture } from "../helper"



const SECRET = "super secret"
const USER_TOKEN = sign({ email: "ketut@gmail.com", role: "user" }, SECRET)
const ADMIN_TOKEN = sign({ email: "ketut@gmail.com", role: "admin" }, SECRET)
const SUPER_ADMIN_TOKEN = sign({ email: "ketut@gmail.com", role: "superadmin" }, SECRET)

const createPolicy = (name: string) => authPolicy().define(name, x => x.user?.role === name)
const authPolicies = [createPolicy("user"), createPolicy("admin"), createPolicy("superadmin")]

describe("JwtAuth", () => {
    describe("Basic Authorization", () => {
        it("Should secure all routes by return 403 for non login user", async () => {
            class AnimalController {
                get() { return "Hello" }

                @route.post()
                save() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .expect(403, { status: 403, message: "Forbidden" })
            await Supertest(app.callback())
                .post("/animal/save")
                .expect(403, { status: 403, message: "Forbidden" })
        })

        it("Should able to access route decorated with @authorize.route(Public)", async () => {
            class AnimalController {
                @authorize.route("Public")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
        })

        it("Should able to decorate @authorize.route(Public) in class scope", async () => {
            @authorize.route("Public")
            class AnimalController {
                get() { return "Hello" }
                hello() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/hello")
                .expect(200)
        })

        it("Should allow login user to access non decorated route", async () => {
            class AnimalController {
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should allow only specific user if @authorize.route() defined", async () => {
            class AnimalController {
                @authorize.route("superadmin")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should allow only some user if @authorize.route() defined", async () => {
            class AnimalController {
                @authorize.route("superadmin", "admin")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should allow decorate @authorize.route() in class scope", async () => {
            @authorize.route("superadmin")
            class AnimalController {
                get() { return "Hello" }
                hello() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/hello")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/hello")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should method scoped authorization REPLACE class scope authorization", async () => {
            @authorize.route("superadmin")
            class AnimalController {
                @authorize.route("user")
                get() { return "Hello" }
                hello() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/hello")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/hello")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should skip authentication for route that not handled with controller", async () => {
            class AnimalController {
                get() { return "Hello" }
            }
            const fn = jest.fn()
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .use(i => {
                    fn()
                    return i.proceed()
                })
                .initialize()

            await Supertest(app.callback())
                .get("/nohandler")
                .expect(404)
            expect(fn).toBeCalled()
        })

        it("Should allow using multiple @authorize.route() decorators", async () => {
            class AnimalController {
                @authorize.route("superadmin")
                @authorize.route("admin")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should allow authorize using @authorize.route(Public) and @authorize.route() in the same action", async () => {
            class AnimalController {
                @authorize.route("Public")
                @authorize.route("admin")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to send token using cookie", async () => {
            class AnimalController {
                @authorize.route("admin")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("cookie", `Authorization=${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("cookie", `Authorization=${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(403)
        })

        it("Should prioritize header vs cookie if specified both", async () => {
            class AnimalController {
                @authorize.route("admin", "user")
                get(@bind.user() { role, email }: any) { return { email, role } }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()

            const { body } = await Supertest(app.callback())
                .get("/animal/get")
                .set("cookie", `Authorization=${ADMIN_TOKEN}`)
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })

        it("Should able to send token using cookie with custom name", async () => {
            class AnimalController {
                @authorize.route("admin")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, cookie: "__JWT", authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("cookie", `__JWT=${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("cookie", `__JWT=${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(403)
        })

        it("Should throw error when no auth scheme defined", async () => {
            class AnimalController {
                @authorize.route("admin", "user")
                get(@bind.user() { role, email }: any) { return { email, role } }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            app.on("error", () => { })

            const { body } = await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `${USER_TOKEN}`)
                .expect(500)
        })

        it("Should throw error when auth scheme other than bearer provided", async () => {
            class AnimalController {
                @authorize.route("admin", "user")
                get(@bind.user() { role, email }: any) { return { email, role } }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            app.on("error", () => { })

            const { body } = await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Basic ${USER_TOKEN}`)
                .expect(500)
        })

        it("Should able to apply authorization to specific method from controller", async () => {
            @authorize.route("superadmin", { applyTo: "get" })
            class AnimalController {
                get() { return "Hello" }
                list() { return ["Hello", "hello"] }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            // get
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
            // list
            await Supertest(app.callback())
                .get("/animal/list")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/list")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to apply authorization to specific methods from controller", async () => {
            @authorize.route("superadmin", { applyTo: ["get", "save"] })
            class AnimalController {
                get() { return "Hello" }
                list() { return ["Hello", "hello"] }
                save() { }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            // get
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
            // list
            await Supertest(app.callback())
                .get("/animal/list")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/list")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
            // save
            await Supertest(app.callback())
                .get("/animal/save")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/save")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to apply public authorization to specific method from controller", async () => {
            @authorize.route("Public", { applyTo: "get" })
            class AnimalController {
                get() { return "Hello" }
                list() { return ["Hello", "hello"] }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            // get
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
            // list
            await Supertest(app.callback())
                .get("/animal/list")
                .expect(403)
            await Supertest(app.callback())
                .get("/animal/list")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to apply public authorization to specific methods from controller", async () => {
            @authorize.route("Public", { applyTo: ["get", "save"] })
            class AnimalController {
                get() { return "Hello" }
                list() { return ["Hello", "hello"] }
                save() { }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            // get
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
            // list
            await Supertest(app.callback())
                .get("/animal/list")
                .expect(403)
            await Supertest(app.callback())
                .get("/animal/list")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
            // save
            await Supertest(app.callback())
                .get("/animal/save")
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/save")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able to mix controller scope authorizer with other decorators", async () => {
            @route.ignore({ applyTo: "save" })
            @authorize.route("superadmin", { applyTo: ["get", "save"] })
            class AnimalController {
                get() { return "Hello" }
                list() { return ["Hello", "hello"] }
                save() { }
            }
            const mock = console.mock()
            const app = await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
            // get
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
            // list
            await Supertest(app.callback())
                .get("/animal/list")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/list")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
            console.mockClear()
        })
    })

    describe("Global Authorization", () => {
        it("Should able to set authorize on global level using public", async () => {
            class AnimalController {
                get() { return "Hello" }
                @route.post()
                save() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("Public") }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
            await Supertest(app.callback())
                .post("/animal/save")
                .expect(200)
        })

        it("Should able to set authorize on global level using role", async () => {
            class AnimalController {
                get() { return "Hello" }
                @route.post()
                save() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("superadmin"), authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .post("/animal/save")
                .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                .expect(200)
        })

        it("Should able override global auth on controller", async () => {
            @authorize.route("user")
            class AnimalController {
                get() { return "Hello" }
                @route.post()
                save() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("Public"), authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .post("/animal/save")
                .expect(403)
        })

        it("Should able override global auth on action", async () => {
            class AnimalController {
                @authorize.route("user")
                get() { return "Hello" }
                @route.post()
                save() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("Public"), authPolicies }))
                .initialize()

            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .post("/animal/save")
                .expect(200)
        })
    })

    describe("Analyzer Message", () => {
        it("Should print Authenticated if no decorator applied", async () => {
            class AnimalController {
                get() { }
            }
            console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            const mock = (console.log as jest.Mock)
            console.log(mock.mock.calls)
            expect(mock.mock.calls[2][0]).toContain("Authenticated")
            console.mockClear()
        })

        it("Should print Admin if specified in method", async () => {
            class AnimalController {
                @authorize.route("Admin")
                get() { }
            }
            console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Admin")
            console.mockClear()
        })

        it("Should print Admin if specified in class", async () => {
            @authorize.route("Admin")
            class AnimalController {
                get() { }
            }
            console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Admin")
            console.mockClear()
        })

        it("Should print Public if provided in global", async () => {
            class AnimalController {
                get() { }
            }
            console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("Public") }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Public")
            console.mockClear()
        })

        it("Should print Admin even if provided in global", async () => {
            class AnimalController {
                @authorize.route("Admin")
                get() { }
            }
            console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("Public") }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Admin")
            console.mockClear()
        })

        it("Should print All if provided multiple", async () => {
            class AnimalController {
                @authorize.route("Admin")
                @authorize.route("User")
                get() { }
            }
            console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("Public") }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("User|Admin")
            console.mockClear()
        })

        it("Should print All if provided by comma", async () => {
            class AnimalController {
                @authorize.route("Admin", "User")
                get() { }
            }
            console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("Public") }))
                .initialize()
            const mock = (console.log as jest.Mock)
            expect(mock.mock.calls[2][0]).toContain("Admin|User")
            console.mockClear()
        })

        it("Should print nicely", async () => {
            class AnimalController {
                authenticated() { }
                @authorize.route("Public")
                public() { }
                @authorize.route("Admin")
                admin() { }
                @authorize.route("User")
                user() { }
                @authorize.route("Admin", "User")
                mix() { }
            }
            console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            const mock = (console.log as jest.Mock)
            const [, ...calls] = mock.mock.calls.map(x => x[0]).filter(x => !!x)
            expect(calls).toEqual([
                '1. AnimalController.authenticated() -> Authenticated GET /animal/authenticated',
                '2. AnimalController.public()        -> Public        GET /animal/public',
                '3. AnimalController.admin()         -> Admin         GET /animal/admin',
                '4. AnimalController.user()          -> User          GET /animal/user',
                '5. AnimalController.mix()           -> Admin|User    GET /animal/mix',
            ])
            console.mockClear()
        })

        it("Should not print if JwtAuthFacility not installed", async () => {
            class AnimalController {
                authenticated() { }
                @authorize.route("Public")
                public() { }
                @authorize.route("Admin")
                admin() { }
                @authorize.route("User")
                user() { }
                @authorize.route("Admin", "User")
                mix() { }
            }
            console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .initialize()
            const mock = (console.log as jest.Mock)
            const [, ...calls] = mock.mock.calls.map(x => x[0]).filter(x => !!x)
            expect(calls).toEqual([
                '1. AnimalController.authenticated() -> GET /animal/authenticated',
                '2. AnimalController.public()        -> GET /animal/public',
                '3. AnimalController.admin()         -> GET /animal/admin',
                '4. AnimalController.user()          -> GET /animal/user',
                '5. AnimalController.mix()           -> GET /animal/mix'
            ])
            console.mockClear()
        })

        it("Should print access on virtual route", async () => {
            class AnimalController {
                @route.get()
                method() { }
            }
            class MyFacility extends DefaultFacility {
                constructor() { super() }
                async generateRoutes(app: Readonly<PlumierApplication>): Promise<RouteMetadata[]> {
                    return [{
                        kind: "VirtualRoute",
                        method: "get",
                        provider: MyFacility,
                        url: "/other/get",
                        access: "Public"
                    }]
                }
            }
            const mock = console.mock()
            await fixture(AnimalController, { mode: "debug" })
                .set(new JwtAuthFacility({ secret: "lorem" }))
                .set(new MyFacility())
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
            console.mockClear()
        })
    })

    describe("Default Configuration", () => {
        it("load PLUM_JWT_SECRET if no secret provided", async () => {
            process.env.PLUM_JWT_SECRET = "lorem ipsum"
            const USER_TOKEN = sign({ email: "ketut@gmail.com", role: "user" }, process.env.PLUM_JWT_SECRET)
            class AnimalController {
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility())
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(403)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
        })

        it("Should throw error when no secret provided nor environment variable", async () => {
            const fn = jest.fn()
            delete process.env.PLUM_JWT_SECRET
            try {
                class AnimalController {
                    get() { return "Hello" }
                }
                await fixture(AnimalController)
                    .set(new JwtAuthFacility())
                    .initialize()
            }
            catch (e) {
                fn(e.message)
            }
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })

    describe("Parameter Authorization", () => {
        describe("Parameter Authorization", () => {
            class AnimalController {
                @route.post()
                save(name: string,
                    @authorize.write("admin")
                    id: number | undefined,
                    @authorize.write("admin")
                    deceased: boolean | undefined) { return "Hello" }
            }

            it("Should be able to authorize parameter", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send({ id: "123", name: "Mimi", deceased: "Yes" })
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (id, deceased)" })
            })

            it("Should throw 403 when accessed by public without auth info", async () => {
                class AnimalController {
                    @route.post()
                    @authorize.route("Public")
                    save(name: string,
                        @authorize.write("admin")
                        id: number | undefined,
                        @authorize.write("admin")
                        deceased: boolean | undefined) { return "Hello" }
                }

                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .send({ id: "123", name: "Mimi", deceased: "Yes" })
                    .expect(403, { status: 403, message: "Unauthorized to populate parameter paths (id, deceased)" })
            })

            it("Should be able to pass authorization by provided undefined", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send({ name: "Mimi" })
                    .expect(200)
            })

            it("Should be able to pass authorization by provided valid token", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .send({ id: "123", name: "Mimi", deceased: "Yes" })
                    .expect(200)
            })
        })

        describe("Object Parameter Authorization", () => {
            @domain()
            class Animal {
                constructor(
                    public name: string,
                    @authorize.write("admin")
                    public id: number | undefined,
                    @authorize.write("admin")
                    public deceased: boolean | undefined) { }
            }

            class AnimalController {
                @route.post()
                save(data: Animal) { return "Hello" }

                @route.get()
                get(data: Animal) { return data }
            }

            it("Should be able to authorize parameter", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send({ id: "123", name: "Mimi", deceased: "Yes" })
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id, data.deceased)" })
            })

            it("Should be able to pass authorization by provided undefined", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send({ name: "Mimi" })
                    .expect(200)
            })

            it("Should skip check if provided null", async () => {
                @domain()
                class Tag {
                    constructor(
                        public name: string) { }
                }
                @domain()
                class Animal {
                    constructor(
                        public name: string,
                        @authorize.write("admin")
                        public id: number | undefined,
                        @authorize.write("admin")
                        public deceased: boolean | undefined,
                        public tag: Tag) { }
                }

                class AnimalController {
                    @route.post()
                    save(data: Animal) { return "Hello" }

                    @route.get()
                    get(data: Animal) { return data }
                }

                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send({ name: "Mimi", tag: null })
                    .expect(200)
            })

            it("Should be able to pass authorization by provided valid token", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .send({ id: "123", name: "Mimi", deceased: "Yes" })
                    .expect(200)
            })

            it("Should work on Partial object parameter", async () => {
                class AnimalController {
                    @route.post()
                    save(@val.partial(Animal) data: Partial<Animal>) { return "Hello" }
                }

                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send({ id: "123", name: "Mimi", deceased: "Yes" })
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id, data.deceased)" })

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .send({ id: "123", name: "Mimi", deceased: "Yes" })
                    .expect(200)
            })

            it("Should skip authorization on GET method", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .get("/animal/get?data[deceased]=true")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200)
            })
        })

        describe("Array Parameter Authorization", () => {
            @domain()
            class Animal {
                constructor(name: string,
                    @authorize.write("admin")
                    id: number | undefined,
                    @authorize.write("admin")
                    deceased: boolean | undefined) { }
            }

            class AnimalController {
                @route.post()
                save(@reflect.type([Animal]) data: Animal[]) { return "Hello" }
            }

            it("Should be able to authorize parameter", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)" })
            })

            it("Should be able to pass authorization by provided undefined", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send([{ name: "Mimi" }])
                    .expect(200)
            })

            it("Should be able to pass authorization by provided valid token", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                    .expect(200)
            })

            it("Should check for parameter authorization even if the action access is public", async () => {
                class AnimalController {
                    @authorize.route("Public")
                    @route.post()
                    save(@reflect.type([Animal]) data: Animal[]) { return "Hello" }
                }

                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)" })
            })

            it("Should check for parameter authorization even if the controller access is public", async () => {
                @authorize.route("Public")
                class AnimalController {
                    @route.post()
                    save(@reflect.type([Animal]) data: Animal[]) { return "Hello" }
                }

                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)" })
            })

            it("Should check for parameter authorization even if the controller access is public", async () => {
                class AnimalController {
                    @route.post()
                    save(@reflect.type([Animal]) data: Animal[]) { return "Hello" }
                }

                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("Public") }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send([{ id: "123", name: "Mimi", deceased: "Yes" }])
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id, data.0.deceased)" })
            })
        })

        describe("Inheritance Parameter Authorization", () => {
            @domain()
            class DomainBase {
                constructor(
                    @authorize.readonly()
                    public id: number = 0,

                    @authorize.readonly()
                    public createdAt: Date = new Date(),

                    @authorize.readonly()
                    public deleted: boolean = false
                ) { }
            }

            @domain()
            class Animal extends DomainBase {
                constructor(
                    name: string,
                    deceased: boolean
                ) { super() }
            }

            class AnimalController {
                @route.post()
                save(data: Animal) { return "Hello" }
            }

            it("Should able to set non secured property", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send({ name: "Mimi", deceased: "Yes" })
                    .expect(200, "Hello")
            })

            it("Should not able to set secured property", async () => {
                const app = await fixture(AnimalController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/animal/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send({ id: 20, createdAt: "2018-1-1", deleted: "YES", name: "Mimi", deceased: "Yes" })
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id, data.createdAt, data.deleted)" })
            })

        })

        describe("Readonly/Writeonly Authorization", () => {
            @domain()
            class DomainBase {
                @authorize.readonly()
                id: number

                @authorize.readonly()
                createdAt: Date

                @authorize.readonly()
                deleted: boolean
            }

            @domain()
            class User extends DomainBase {
                constructor(
                    public name: string,
                    @authorize.writeonly()
                    public password: string
                ) { super() }
            }

            class UserController {
                @route.post()
                save(data: User) { return "Hello" }
                @route.get()
                @type(User)
                get() {
                    return new User("John Doe", "secret")
                }
            }

            it("Should not able to set secured property", async () => {
                const app = await fixture(UserController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .post("/user/save")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .send({ id: 20, createdAt: "2018-1-1", deleted: "YES", name: "John", password: "secret" })
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id, data.createdAt, data.deleted)" })
            })

            it("Should not able to get secured property", async () => {
                const app = await fixture(UserController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()

                await Supertest(app.callback())
                    .get("/user/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { name: "John Doe" })
            })
        })

        describe("Parameter Authorization Access Modifier", () => {
            describe("Simple parameter", () => {
                it("Should authorize with set modifier", async () => {
                    class AnimalController {
                        @route.post()
                        save(@authorize.write("admin")
                        id: number | undefined) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (id)" })
                })

                it("Should authorize with all modifier", async () => {
                    class AnimalController {
                        @route.post()
                        save(@authorize.write("admin")
                        id: number | undefined) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (id)" })
                })

                it("Should authorize if not specified", async () => {
                    class AnimalController {
                        @route.post()
                        save(@authorize.write("admin")
                        id: number | undefined) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (id)" })
                })

                it("Should ignore with get modifier", async () => {
                    class AnimalController {
                        @route.post()
                        save(@authorize.read("admin")
                        id: number | undefined) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                })

                it("Should able to use multiple", async () => {
                    class AnimalController {
                        @route.post()
                        save(
                            @authorize.write("admin")
                            @authorize.write("user")
                            id: number | undefined) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401)
                })
            })
            describe("Object parameter", () => {
                it("Should authorize with set modifier", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Entity) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id)" })
                })

                it("Should authorize with all modifier", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Entity) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id)" })
                })

                it("Should authorize if not specified", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Entity) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.id)" })
                })

                it("Should ignore with get modifier", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.read("admin")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Entity) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(200)
                })

                it("Should able to use multiple", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            @authorize.write("user")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Entity) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ id: "123" })
                        .expect(401)
                })
            })
            describe("Nested Object parameter", () => {
                it("Should authorize with set modifier", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            public id: number | undefined) { }
                    }
                    @domain()
                    class Parent {
                        constructor(
                            public entity: Entity
                        ) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Parent) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.entity.id)" })
                })

                it("Should authorize with all modifier", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            public id: number | undefined) { }
                    }
                    @domain()
                    class Parent {
                        constructor(
                            public entity: Entity
                        ) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Parent) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.entity.id)" })
                })

                it("Should authorize if not specified", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            public id: number | undefined) { }
                    }
                    @domain()
                    class Parent {
                        constructor(
                            public entity: Entity
                        ) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Parent) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.entity.id)" })
                })

                it("Should ignore with get modifier", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.read("admin")
                            public id: number | undefined) { }
                    }
                    @domain()
                    class Parent {
                        constructor(
                            public entity: Entity
                        ) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Parent) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(200)
                })

                it("Should able to use multiple", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            @authorize.write("user")
                            public id: number | undefined) { }
                    }
                    @domain()
                    class Parent {
                        constructor(
                            public entity: Entity
                        ) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(data: Parent) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(401)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send({ entity: { id: "123" } })
                        .expect(401)
                })
            })
            describe("Array of Object parameter", () => {
                it("Should authorize with set modifier", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(@reflect.type([Entity]) data: Entity[]) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id)" })
                })

                it("Should authorize with all modifier", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(@reflect.type([Entity]) data: Entity[]) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id)" })
                })

                it("Should authorize if not specified", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(@reflect.type([Entity]) data: Entity[]) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (data.0.id)" })
                })

                it("Should ignore with get modifier", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.read("admin")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(@reflect.type([Entity]) data: Entity[]) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(200)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(200)
                })

                it("Should able to use multiple", async () => {
                    @domain()
                    class Entity {
                        constructor(
                            @authorize.write("admin")
                            @authorize.write("user")
                            public id: number | undefined) { }
                    }
                    class AnimalController {
                        @route.post()
                        save(@reflect.type([Entity]) data: Entity[]) { return "Hello" }
                    }
                    const app = await fixture(AnimalController)
                        .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                        .initialize()

                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(401)
                    await Supertest(app.callback())
                        .post("/animal/save")
                        .set("Authorization", `Bearer ${USER_TOKEN}`)
                        .send([{ id: "123" }])
                        .expect(401)
                })
            })
        })

    })

    describe("Response Authorization", () => {
        describe("Simple Object", () => {
            it("Should able to filter by role", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type(User)
                    get() {
                        return new User("admin", "secret")
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { name: "admin", password: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { name: "admin" })
            })
            it("Should able to set by role", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.write("admin")
                        public role: string
                    ) { }
                }
                class UsersController {
                    @route.post("")
                    post(user: User) {
                        return new User("admin", "secret")
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .post("/users")
                    .send({ name: "admin", role: "admin" })
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200)
                await Supertest(app.callback())
                    .post("/users")
                    .send({ name: "admin", role: "admin" })
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (user.role)" })
            })
            it("Should able to filter by role with property field", async () => {
                class User {
                    @reflect.noop()
                    public name: string
                    @authorize.read("admin")
                    public password: string
                }
                class UsersController {
                    @reflect.type(User)
                    get() {
                        return { name: "admin", password: "secret" }
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { name: "admin", password: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { name: "admin" })
            })
            it("Should able to set by role with property field", async () => {
                class User {
                    @reflect.noop()
                    public name: string
                    @authorize.write("admin")
                    public role: string
                }
                class UsersController {
                    @route.post("")
                    post(user: User) {
                        return { id: 123 }
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .post("/users")
                    .send({ name: "admin", role: "admin" })
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200)
                await Supertest(app.callback())
                    .post("/users")
                    .send({ name: "admin", role: "admin" })
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(401, { status: 401, message: "Unauthorized to populate parameter paths (user.role)" })
            })
            it("Should able to filter by multiple roles", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("superadmin")
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type(User)
                    get() {
                        return new User("admin", "secret")
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                    .expect(200, { name: "admin", password: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { name: "admin", password: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { name: "admin" })
            })
            it("Should able to filter by multiple roles in single decorator", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin", "superadmin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type(User)
                    get() {
                        return new User("admin", "secret")
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                    .expect(200, { name: "admin", password: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { name: "admin", password: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { name: "admin" })
            })
            it("Should not affect set authorizer", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.write("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type(User)
                    get() {
                        return new User("admin", "secret")
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { name: "admin", password: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { name: "admin", password: "secret" })
            })
            it("Should able to use role authorizer", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type(User)
                    get() {
                        return new User("admin", "secret")
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { name: "admin", password: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { name: "admin" })
            })
        })

        describe("Array Of Object", () => {
            it("Should able to filter by role", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type([User])
                    get() {
                        return [new User("admin", "secret"), new User("user", "secret")]
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, [{ name: "admin", password: "secret" }, { name: "user", password: "secret" }])
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, [{ name: "admin" }, { name: "user" }])
            })
            it("Should able to filter by multiple roles", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("superadmin")
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type([User])
                    get() {
                        return [new User("admin", "secret"), new User("user", "secret")]
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                    .expect(200, [{ name: "admin", password: "secret" }, { name: "user", password: "secret" }])
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, [{ name: "admin", password: "secret" }, { name: "user", password: "secret" }])
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, [{ name: "admin" }, { name: "user" }])
            })
            it("Should able to filter by multiple roles in single decorator", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin", "superadmin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type([User])
                    get() {
                        return [new User("admin", "secret"), new User("user", "secret")]
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                    .expect(200, [{ name: "admin", password: "secret" }, { name: "user", password: "secret" }])
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, [{ name: "admin", password: "secret" }, { name: "user", password: "secret" }])
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, [{ name: "admin" }, { name: "user" }])
            })
            it("Should not affect set authorizer", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.write("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type([User])
                    get() {
                        return [new User("admin", "secret"), new User("user", "secret")]
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, [{ name: "admin", password: "secret" }, { name: "user", password: "secret" }])
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, [{ name: "admin", password: "secret" }, { name: "user", password: "secret" }])
            })
            it("Should able to use role authorizer", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type([User])
                    get() {
                        return [new User("admin", "secret"), new User("user", "secret")]
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, [{ name: "admin", password: "secret" }, { name: "user", password: "secret" }])
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, [{ name: "admin" }, { name: "user" }])
            })
            it("Should return empty array if provided empty array", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @reflect.type([User])
                    get() {
                        return []
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                const { body } = await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200)
                expect(Array.isArray(body) && body.length === 0).toBe(true)
            })
        })

        describe("Nested Object", () => {
            it("Should able to filter by role", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                @domain()
                class Parent {
                    constructor(public user: User) { }
                }
                class UsersController {
                    @reflect.type(Parent)
                    get() {
                        return new Parent(new User("admin", "secret"))
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { user: { name: "admin", password: "secret" } })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { user: { name: "admin" } })
            })
            it("Should able to filter by multiple roles", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("superadmin")
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                @domain()
                class Parent {
                    constructor(public user: User) { }
                }
                class UsersController {
                    @reflect.type(Parent)
                    get() {
                        return new Parent(new User("admin", "secret"))
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                    .expect(200, { user: { name: "admin", password: "secret" } })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { user: { name: "admin", password: "secret" } })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { user: { name: "admin" } })
            })
            it("Should able to filter by multiple roles in single decorator", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin", "superadmin")
                        public password: string
                    ) { }
                }
                @domain()
                class Parent {
                    constructor(public user: User) { }
                }
                class UsersController {
                    @reflect.type(Parent)
                    get() {
                        return new Parent(new User("admin", "secret"))
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
                    .expect(200, { user: { name: "admin", password: "secret" } })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { user: { name: "admin", password: "secret" } })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { user: { name: "admin" } })
            })
            it("Should not affect set authorizer", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.write("admin")
                        public password: string
                    ) { }
                }
                @domain()
                class Parent {
                    constructor(public user: User) { }
                }
                class UsersController {
                    @reflect.type(Parent)
                    get() {
                        return new Parent(new User("admin", "secret"))
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { user: { name: "admin", password: "secret" } })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { user: { name: "admin", password: "secret" } })
            })
            it("Should able to use role authorizer", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                @domain()
                class Parent {
                    constructor(public user: User) { }
                }
                class UsersController {
                    @reflect.type(Parent)
                    get() {
                        return new Parent(new User("admin", "secret"))
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { user: { name: "admin", password: "secret" } })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { user: { name: "admin" } })
            })
            it("Should allow nested type with cross dependency", async () => {
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string,
                        @reflect.type(x => Parent)
                        public parent: any
                    ) { }
                }
                @domain()
                class Parent {
                    constructor(public user: User) { }
                }
                class UsersController {
                    @reflect.type(Parent)
                    get() {
                        return new Parent(new User("admin", "secret", { user: undefined }))
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { user: { name: "admin", password: "secret" } })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { user: { name: "admin" } })
            })
        })

        describe("Custom Response Type", () => {
            it("Should able to transform into simple object", async () => {
                @domain()
                class DetailUser {
                    constructor(
                        public fullName: string,
                        @authorize.read("admin")
                        public pwd: string
                    ) { }
                }
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @responseType(DetailUser)
                    @reflect.type(User)
                    get() {
                        return new DetailUser("admin", "secret")
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { fullName: "admin", pwd: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { fullName: "admin" })
            })
            it("Should able to use callback style transform type", async () => {
                @domain()
                class DetailUser {
                    constructor(
                        public fullName: string,
                        @authorize.read("admin")
                        public pwd: string
                    ) { }
                }
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @responseType(x => DetailUser)
                    @reflect.type(x => User)
                    get() {
                        return new DetailUser("admin", "secret")
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { fullName: "admin", pwd: "secret" })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { fullName: "admin" })
            })
            it("Should able to transform into array of object", async () => {
                @domain()
                class DetailUser {
                    constructor(
                        public fullName: string,
                        @authorize.read("admin")
                        public pwd: string
                    ) { }
                }
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                class UsersController {
                    @responseType([DetailUser])
                    @reflect.type([User])
                    get() {
                        return [new DetailUser("admin", "secret")]
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, [{ fullName: "admin", pwd: "secret" }])
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, [{ fullName: "admin" }])
            })
            it("Should able to transform into nested object", async () => {
                @domain()
                class DetailUser {
                    constructor(
                        public fullName: string,
                        @authorize.read("admin")
                        public pwd: string
                    ) { }
                }
                @domain()
                class User {
                    constructor(
                        public name: string,
                        @authorize.read("admin")
                        public password: string
                    ) { }
                }
                @domain()
                class Parent {
                    constructor(public user: DetailUser) { }
                }
                class UsersController {
                    @responseType(Parent)
                    @reflect.type(User)
                    get() {
                        return new Parent(new DetailUser("admin", "secret"))
                    }
                }
                const app = await fixture(UsersController)
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                    .expect(200, { user: { fullName: "admin", pwd: "secret" } })
                await Supertest(app.callback())
                    .get("/users/get")
                    .set("Authorization", `Bearer ${USER_TOKEN}`)
                    .expect(200, { user: { fullName: "admin" } })
            })
        })
    })

    describe("Filter Authorization", () => {
        it("Should able to authorize filter on parameter", async () => {
            class UsersController {
                get(@authorize.filter("admin") filter: string) { }
            }
            const app = await fixture(UsersController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            await Supertest(app.callback())
                .get("/users/get?filter=abcd")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/users/get?filter=abcd")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401, { status: 401, message: 'Unauthorized to populate parameter paths (filter)' })
        })
        it("Should able to authorize filter on model", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    @authorize.filter("admin")
                    public password: string,
                    @authorize.filter("admin")
                    public email: string
                ) { }
            }
            class UsersController {
                @reflect.type(User)
                get(filter: User) { }
            }
            const app = await fixture(UsersController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            await Supertest(app.callback())
                .get("/users/get?filter[password]=lorem&filter[email]=abcd&filter[name]=abcd")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/users/get?filter[name]=abcd")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/users/get?filter[password]=lorem&filter[email]=abcd&filter[name]=abcd")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401, { status: 401, message: 'Unauthorized to populate parameter paths (filter.password, filter.email)' })
        })
    })

    describe("Authorization Policy", () => {
        it("Should able to use Public", async () => {
            class AnimalController {
                @authorize.route(Public)
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(200)
        })
        it("Should able to use Authenticated", async () => {
            class AnimalController {
                @authorize.route(Authenticated)
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, global: authorize.route("Public") }))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .expect(403)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
        })
        it("Should able to create custom auth policy using lambda", async () => {
            class AnimalController {
                @authorize.route("HasUser")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [authPolicy().define("HasUser", i => i.user?.role === "user")]
                }))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
        })
        it("Should able to apply multiple policies", async () => {
            class AnimalController {
                @authorize.route("HasUser", "HasAdmin")
                get() { return "Hello" }
            }
            const HasUserPolicy = authPolicy().define("HasUser", i => i.user?.role === "user")
            const HasAdminPolicy = authPolicy().define("HasAdmin", i => i.user?.role === "admin")
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [HasUserPolicy, HasAdminPolicy]
                }))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
        })
        it("Should able to apply policies on parameter", async () => {
            class AnimalController {
                @route.post()
                save(@authorize.write("HasUser") name: string) { return "Hello" }
            }
            const HasUserPolicy = authPolicy().define("HasUser", i => i.user?.role === "user")
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [HasUserPolicy]
                }))
                .initialize()
            await Supertest(app.callback())
                .post("/animal/save")
                .send({ name: "lorem" })
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401, { status: 401, message: 'Unauthorized to populate parameter paths (name)' })
            await Supertest(app.callback())
                .post("/animal/save")
                .send({ name: "lorem" })
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
        })
        it("Should able to apply policies on projection authorization", async () => {
            class Animal {
                @authorize.read("HasUser")
                secret: string
                @noop()
                name: string
            }
            class AnimalController {
                @type(Animal)
                get() { return <Animal>{ secret: "secret", name: "mimi" } }
            }
            const HasUserPolicy = authPolicy().define("HasUser", i => i.user?.role === "user")
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [HasUserPolicy]
                }))
                .initialize()
            const { body: byAdmin } = await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            const { body: byUser } = await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            expect(byAdmin).toMatchSnapshot()
            expect(byUser).toMatchSnapshot()
        })
        it("Should able to apply mix policies on projection authorization", async () => {
            class Animal {
                @authorize.read("HasUser", "admin")
                secret: string
                @noop()
                name: string
            }
            class AnimalController {
                @type(Animal)
                get() { return <Animal>{ secret: "secret", name: "mimi" } }
            }
            const HasUserPolicy = authPolicy().define("HasUser", i => i.user?.role === "user")
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [HasUserPolicy, ...authPolicies],

                }))
                .initialize()
            const { body: byAdmin } = await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(200)
            const { body: byUser } = await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            expect(byAdmin).toMatchSnapshot()
            expect(byUser).toMatchSnapshot()
        })
        it("Should able to create custom auth policy using class", async () => {
            class AnimalController {
                @authorize.route("HasUser")
                get() { return "Hello" }
            }
            class HasUserAuthPolicy implements CustomAuthorizer {
                authorize(info: AuthorizationContext): boolean | Promise<boolean> {
                    return info.user?.role === "user"
                }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [authPolicy().define("HasUser", new HasUserAuthPolicy())]
                }))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
        })
        it("Custom auth should work with default authorization Public", async () => {
            class AnimalController {
                @authorize.route("HasUser")
                get() { return "Hello" }
                @authorize.route(Public)
                pub() { }
            }
            class CustomPolicy implements AuthPolicy {
                equals(id: string, ctx: AuthorizationContext): boolean {
                    return id === "HasUser"
                }
                async authorize(ctx: AuthorizationContext): Promise<boolean> {
                    return ctx.user?.role === "user"
                }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({ secret: SECRET, authPolicies: [CustomPolicy] }))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/pub")
                .expect(200)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
        })
        it("Should able to load external auth policy", async () => {
            class AnimalController {
                @authorize.route("HasUser")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: "./policies/*-policy.{ts,js}"
                }))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
        })
        it("Should not load policy that not ends with policy", async () => {
            class AnimalController {
                @authorize.route("HasUser")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: "./policies/invalid*.{ts,js}"
                }))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(401)
        })
        it("Should provide error info when applied on method", async () => {
            const fn = jest.fn()
            class AnimalController {
                @authorize.route("HasUser")
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [authPolicy().define("HasUser", i => { throw new Error("Error occur inside policy") })]
                }))
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(500)
            const message = fn.mock.calls[0][0].message
            expect(message).toContain("Error occur inside authorization policy HasUser on method AnimalController.get")
            expect(message).toContain("Error occur inside policy")
        })
        it("Should provide error info when applied on class", async () => {
            const fn = jest.fn()
            @authorize.route("HasUser")
            class AnimalController {
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [authPolicy().define("HasUser", i => { throw new Error("Error occur inside policy") })]
                }))
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(500)
            const message = fn.mock.calls[0][0].message
            expect(message).toContain("Error occur inside authorization policy HasUser on class AnimalController")
            expect(message).toContain("Error occur inside policy")
        })
        it("Should provide error if thrown non error", async () => {
            const fn = jest.fn()
            @authorize.route("HasUser")
            class AnimalController {
                get() { return "Hello" }
            }
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [authPolicy().define("HasUser", i => { throw "ERROR" })]
                }))
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(500)
            const message = fn.mock.calls[0][0].message
            expect(message).toContain("Error occur inside authorization policy HasUser on class AnimalController")
            expect(message).toContain("ERROR")
        })
        it("Should able to register to global auth policies", async () => {
            class AnimalController {
                @authorize.route("HasUser")
                get() { return "Hello" }
            }
            authPolicy().register("HasUser", i => i.user?.role === "user")
            const app = await fixture(AnimalController)
                .set(new JwtAuthFacility({
                    secret: SECRET
                }))
                .initialize()
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(401)
            await Supertest(app.callback())
                .get("/animal/get")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
        })
    })

    describe("Entity Policy", () => {
        class Shop {
            @noop()
            id: number
            @noop()
            name: string
            @noop()
            users: { uid: number, role: "Admin" | "Staff" }[]
        }
        const shops: Shop[] = [
            { id: 1, name: "One Store", users: [{ uid: 1, role: "Admin" }, { uid: 2, role: "Staff" }] },
            { id: 2, name: "Second Store", users: [{ uid: 1, role: "Staff" }, { uid: 2, role: "Admin" }] },
        ]
        const USER_ONE = sign({ userId: 1, role: "user" }, SECRET)
        const USER_TWO = sign({ userId: 2, role: "user" }, SECRET)

        it("Should able to secure route using entity policy", async () => {
            class ShopsController {
                @route.get(":id")
                @type(Shop)
                @entityProvider(Shop, "id")
                @authorize.route("ShopAdmin")
                get(id: number) {
                    return shops.find(x => x.id === id)
                }
            }
            const AdminPolicy = entityPolicy(Shop)
                .define("ShopAdmin", (i, e) => {
                    const shop = shops.find(x => x.id === e)
                    return shop!.users.some(x => x.uid === i.user!.userId && x.role === "Admin")
                })
            const app = await fixture(ShopsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [AdminPolicy]
                }))
                .initialize()
            function request(app: Koa, url: string, user: string = USER_TOKEN) {
                return Supertest(app.callback())
                    .get(url)
                    .set("Authorization", `Bearer ${user}`)
            }
            await request(app, "/shops/1", USER_ONE).expect(200)
            await request(app, "/shops/1", USER_TWO).expect(401)
            await request(app, "/shops/2", USER_ONE).expect(401)
            await request(app, "/shops/2", USER_TWO).expect(200)
        })
        it("Should throw proper error when method not an entity provider", async () => {
            const fn = jest.fn()
            class ShopsController {
                @route.get(":id")
                @type(Shop)
                @authorize.route("ShopAdmin")
                get(id: number) {
                    return shops.find(x => x.id === id)
                }
            }
            const AdminPolicy = entityPolicy(Shop)
                .define("ShopAdmin", (i, e) => {
                    const shop = shops.find(x => x.id === e)
                    return shop!.users.some(x => x.uid === i.user!.userId && x.role === "Admin")
                })
            const app = await fixture(ShopsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [AdminPolicy]
                }))
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .get("/shops/1")
                .set("Authorization", `Bearer ${USER_ONE}`)
                .expect(500)
            const message = fn.mock.calls[0][0].message
            expect(message).toBe("Action ShopsController.get doesn't have Entity Policy Provider information")
        })
        it("Should not breaking other authorization system", async () => {
            class ShopsController {
                @route.get(":id")
                @type(Shop)
                @authorize.route("Public")
                get(id: number) {
                    return shops.find(x => x.id === id)
                }
            }
            const AdminPolicy = entityPolicy(Shop)
                .define("ShopAdmin", (i, e) => {
                    const shop = shops.find(x => x.id === e)
                    return shop!.users.some(x => x.uid === i.user!.userId && x.role === "Admin")
                })
            const app = await fixture(ShopsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [AdminPolicy]
                }))
                .initialize()
            await Supertest(app.callback())
                .get("/shops/1")
                .expect(200)
        })
        it("Should throw proper error when error occur inside entity policy and applied on route", async () => {
            const fn = jest.fn()
            class ShopsController {
                @route.get(":id")
                @type(Shop)
                @entityProvider(Shop, "id")
                @authorize.route("ShopAdmin")
                get(id: number) {
                    return shops.find(x => x.id === id)
                }
            }
            const AdminPolicy = entityPolicy(Shop)
                .define("ShopAdmin", (i, e) => { throw new Error("ERROR") })
            const app = await fixture(ShopsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [AdminPolicy]
                }))
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .get("/shops/1")
                .set("Authorization", `Bearer ${USER_ONE}`)
                .expect(500)
            const message = fn.mock.calls[0][0].message
            expect(message).toContain("Error occur inside authorization policy ShopAdmin for entity Shop on method ShopsController.get")
            expect(message).toContain("ERROR")
        })
        it("Should throw proper error when value thrown inside entity policy", async () => {
            const fn = jest.fn()
            class ShopsController {
                @route.get(":id")
                @type(Shop)
                @entityProvider(Shop, "id")
                @authorize.route("ShopAdmin")
                get(id: number) {
                    return shops.find(x => x.id === id)
                }
            }
            const AdminPolicy = entityPolicy(Shop)
                .define("ShopAdmin", (i, e) => { throw "ERROR" })
            const app = await fixture(ShopsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [AdminPolicy]
                }))
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .get("/shops/1")
                .set("Authorization", `Bearer ${USER_ONE}`)
                .expect(500)
            const message = fn.mock.calls[0][0].message
            expect(message).toContain("Error occur inside authorization policy ShopAdmin for entity Shop on method ShopsController.get")
            expect(message).toContain("ERROR")
        })
        it("Should be able to secure write access to property using entity policy", async () => {
            class Product {
                @noop()
                id: number
                @noop()
                name: string
                @noop()
                shop: number
                @noop()
                price: number
                @authorize.write("ShopAdmin")
                basePrice: number
            }
            const products: Product[] = [
                { id: 1, name: "Vanilla", price: 200, basePrice: 100, shop: 1 },
            ]
            const ProductPolicy = entityPolicy(Product)
                .define("ShopAdmin", (i, e) => {
                    const shop = shops.find(x => e === x.id)!
                    return shop.users.some(x => x.uid === i.user!.userId && x.role === "Admin")
                })
            class ProductsController {
                @entityProvider(Product, "id")
                @route.put(":id")
                modify(id: number, data: Product) {

                }
            }
            const app = await fixture(ProductsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [ProductPolicy]
                }))
                .initialize()
            await Supertest(app.callback())
                .put("/products/1")
                .send({ basePrice: 123 })
                .set("Authorization", `Bearer ${USER_ONE}`)
                .expect(200)
            await Supertest(app.callback())
                .put("/products/1")
                .send({ basePrice: 123 })
                .set("Authorization", `Bearer ${USER_TWO}`)
                .expect(401)
        })
        it("Should throw proper error on when applied as write access", async () => {
            const fn = jest.fn()
            class Product {
                @noop()
                id: number
                @noop()
                name: string
                @noop()
                shop: number
                @noop()
                price: number
                @authorize.write("ShopAdmin")
                basePrice: number
            }
            const products: Product[] = [
                { id: 1, name: "Vanilla", price: 200, basePrice: 100, shop: 1 },
            ]
            const ProductPolicy = entityPolicy(Product)
                .define("ShopAdmin", (i, e) => {
                    throw new Error("ERROR")
                })
            class ProductsController {
                @entityProvider(Product, "id")
                @route.put(":id")
                modify(id: number, data: Product) {

                }
            }
            const app = await fixture(ProductsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [ProductPolicy]
                }))
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .put("/products/1")
                .send({ basePrice: 123 })
                .set("Authorization", `Bearer ${USER_ONE}`)
                .expect(500)
            const message = fn.mock.calls[0][0].message
            expect(message).toContain("Error occur inside authorization policy ShopAdmin for entity Product on property Product.basePrice")
            expect(message).toContain("ERROR")
        })
        it("Should be able to secure read access to property using entity policy", async () => {
            class Product {
                @entity.primaryId()
                @noop()
                id: number
                @noop()
                name: string
                @noop()
                shop: number
                @noop()
                price: number
                @authorize.read("ShopAdmin")
                basePrice: number
            }
            const products: Product[] = [
                { id: 1, name: "Vanilla", price: 200, basePrice: 100, shop: 1 },
            ]
            const ProductPolicy = entityPolicy(Product)
                .define("ShopAdmin", (i, e) => {
                    const shop = shops.find(x => e === x.id)!
                    return shop.users.some(x => x.uid === i.user!.userId && x.role === "Admin")
                })
            class ProductsController {
                @route.get(":id")
                @type(Product)
                get(id: number) {
                    return products.find(x => x.id === id)
                }
            }
            const app = await fixture(ProductsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [ProductPolicy]
                }))
                .initialize()
            const { body: userOne } = await Supertest(app.callback())
                .get("/products/1")
                .set("Authorization", `Bearer ${USER_ONE}`)
                .expect(200)
            const { body: userTwo } = await Supertest(app.callback())
                .get("/products/1")
                .set("Authorization", `Bearer ${USER_TWO}`)
                .expect(200)
            expect(userOne).toMatchSnapshot()
            expect(userTwo).toMatchSnapshot()
        })
        it("Should throw error when occur inside entity policy on read access", async () => {
            const fn = jest.fn()
            class Product {
                @entity.primaryId()
                @noop()
                id: number
                @noop()
                name: string
                @noop()
                shop: number
                @noop()
                price: number
                @authorize.read("ShopAdmin")
                basePrice: number
            }
            const products: Product[] = [
                { id: 1, name: "Vanilla", price: 200, basePrice: 100, shop: 1 },
            ]
            const ProductPolicy = entityPolicy(Product)
                .define("ShopAdmin", (i, e) => {
                    throw new Error("ERROR")
                })
            class ProductsController {
                @route.get(":id")
                @type(Product)
                get(id: number) {
                    return products.find(x => x.id === id)
                }
            }
            const app = await fixture(ProductsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [ProductPolicy]
                }))
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .get("/products/1")
                .set("Authorization", `Bearer ${USER_ONE}`)
                .expect(500)
            const message = fn.mock.calls[0][0].message
            expect(message).toContain("Error occur inside authorization policy ShopAdmin for entity Product on property Product.basePrice")
            expect(message).toContain("ERROR")
        })
        it("Should throw error when entity doesn't have primary id information", async () => {
            const fn = jest.fn()
            class Product {
                @noop()
                id: number
                @noop()
                name: string
                @noop()
                shop: number
                @noop()
                price: number
                @authorize.read("ShopAdmin")
                basePrice: number
            }
            const products: Product[] = [
                { id: 1, name: "Vanilla", price: 200, basePrice: 100, shop: 1 },
            ]
            const ProductPolicy = entityPolicy(Product)
                .define("ShopAdmin", (i, e) => {
                    const shop = shops.find(x => e === x.id)!
                    return shop.users.some(x => x.uid === i.user!.userId && x.role === "Admin")
                })
            class ProductsController {
                @route.get(":id")
                @type(Product)
                get(id: number) {
                    return products.find(x => x.id === id)
                }
            }
            const app = await fixture(ProductsController)
                .set(new JwtAuthFacility({
                    secret: SECRET,
                    authPolicies: [ProductPolicy]
                }))
                .initialize()
            app.on("error", e => fn(e))
            await Supertest(app.callback())
                .get("/products/1")
                .set("Authorization", `Bearer ${USER_ONE}`)
                .expect(500)
            const message = fn.mock.calls[0][0].message
            expect(message).toContain("Entity Product doesn't have primary ID information required for entity policy")
        })
        it("Should able to register entity policy into global auth policies", async () => {
            class ShopsController {
                @route.get(":id")
                @type(Shop)
                @entityProvider(Shop, "id")
                @authorize.route("ShopAdmin")
                get(id: number) {
                    return shops.find(x => x.id === id)
                }
            }
            entityPolicy(Shop)
                .register("ShopAdmin", (i, id) => {
                    const shop = shops.find(x => x.id === id)
                    return shop!.users.some(x => x.uid === i.user!.userId && x.role === "Admin")
                })
            const app = await fixture(ShopsController)
                .set(new JwtAuthFacility({
                    secret: SECRET
                }))
                .initialize()
            function request(app: Koa, url: string, user: string = USER_TOKEN) {
                return Supertest(app.callback())
                    .get(url)
                    .set("Authorization", `Bearer ${user}`)
            }
            await request(app, "/shops/1", USER_ONE).expect(200)
            await request(app, "/shops/1", USER_TWO).expect(401)
            await request(app, "/shops/2", USER_ONE).expect(401)
            await request(app, "/shops/2", USER_TWO).expect(200)
        })
    })
})