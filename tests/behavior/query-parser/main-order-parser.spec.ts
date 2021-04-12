import { authorize, AuthPolicy, authPolicy, Configuration, entity, entityPolicy, route } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import Plumier, { genericController, WebApiFacility } from "@plumier/plumier"
import { createCustomOrderConverter, orderParser, OrderQueryAuthorizeMiddleware } from "@plumier/query-parser"
import { Class, noop } from "@plumier/reflect"
import { cleanupConsole } from "@plumier/testing"
import { sign } from "jsonwebtoken"
import supertest from "supertest"
import { DefaultControllerGeneric, DefaultNestedControllerGeneric } from "../helper"

describe("Oder Parser", () => {
    function createApp(controller?: Class) {
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({ controller }))
            .set({ typeConverterVisitors: [createCustomOrderConverter(x => x)] })
    }

    it("Should parse order syntax properly", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
            @noop()
            age: number
        }
        class UsersController {
            @route.get("")
            get(@orderParser(x => User) order: any) {
                return order
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?order=email,name,-createdAt")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should skip whitespace", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
            @noop()
            age: number
        }
        class UsersController {
            @route.get("")
            get(@orderParser(x => User) order: any) {
                return order
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?order= email , name , -  createdAt ")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should skip + sign", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
            @noop()
            age: number
        }
        class UsersController {
            @route.get("")
            get(@orderParser(x => User) order: any) {
                return order
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?order=email,+name,-createdAt ")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should detect invalid property name", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
            @noop()
            age: number
        }
        class UsersController {
            @route.get("")
            get(@orderParser(x => User) order: any) {
                return order
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?order=emails,names,-createdAts")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
    it("Should detect invalid syntax", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
            @noop()
            age: number
        }
        class UsersController {
            @route.get("")
            get(@orderParser(x => User) order: any) {
                return order
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?order=*emails,%names,-(createdAts")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
})

describe("Select Order Authorization", () => {
    const secret = "lorem ipsum"
    const userToken = sign({ id: 123, role: "User" }, secret)
    const adminToken = sign({ id: 234, role: "Admin" }, secret)
    function createApp(controller?: Class, policies: Class<AuthPolicy>[] = [], config: Partial<Configuration> = {}) {
        return new Plumier()
            .set({ mode: "production", ...config })
            .set(new WebApiFacility({ controller }))
            .set(new JwtAuthFacility({
                secret, authPolicies: [
                    ...policies,
                    authPolicy().define("User", ({ user }) => user?.role === "User"),
                    authPolicy().define("Admin", ({ user }) => user?.role === "Admin"),
                    authPolicy().define("SuperAdmin", ({ user }) => user?.role === "SuperAdmin")
                ]
            }))
            .use(new OrderQueryAuthorizeMiddleware(), "Action")
            .set({ typeConverterVisitors: [createCustomOrderConverter(x => x)] })
            .set({ genericController: [DefaultControllerGeneric, DefaultNestedControllerGeneric] })

    }
    it("Should authorize column properly", async () => {
        class User {
            @authorize.read("Admin")
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
            @noop()
            age: number
        }
        class UsersController {
            @route.get("")
            get(@orderParser(x => User) order: any) {
                return order
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?order=email,name")
            .set("Authorization", `Bearer ${userToken}`)
            .expect(401)
        expect(body).toMatchSnapshot()
    })
    it("Should authorize column with public route", async () => {
        class User {
            @authorize.read("Admin")
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
            @noop()
            age: number
        }
        class UsersController {
            @authorize.route("Public")
            @route.get("")
            get(@orderParser(x => User) order: any) {
                return order
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?order=email,name")
            .expect(403)
        expect(body).toMatchSnapshot()
    })
    it("Should allow access if match policy", async () => {
        class User {
            @authorize.read("Admin")
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
            @noop()
            age: number
        }
        class UsersController {
            @route.get("")
            get(@orderParser(x => User) order: any) {
                return order
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?order=email,name")
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should unauthorize property marked with entity policy", async () => {
        @genericController(c => c.all().authorize("Public"))
        class MyFilter {
            @entity.primaryId()
            id: number
            @authorize.read("Owner")
            property: string
        }
        const policy = [entityPolicy(MyFilter).define("Owner", ({ user }, id) => user?.userId === id)]
        const app = await createApp(MyFilter, policy).initialize()
        await supertest(app.callback())
            .get("/myfilter?order=property")
            .set("Authorization", `Bearer ${userToken}`)
            .expect(401)
    })
    it("Should unauthorize property marked with all entity policies", async () => {
        @genericController(c => c.all().authorize("Public"))
        class MyFilter {
            @entity.primaryId()
            id: number
            @authorize.read("Owner", "OtherOwner")
            property: string
        }
        const policy = [
            entityPolicy(MyFilter).define("Owner", ({ user }, id) => user?.userId === id),
            entityPolicy(MyFilter).define("OtherOwner", ({ user }, id) => user?.userId === id),
        ]
        const app = await createApp(MyFilter, policy).initialize()
        await supertest(app.callback())
            .get("/myfilter?order=property")
            .set("Authorization", `Bearer ${userToken}`)
            .expect(401)
    })
    it("Should authorize property marked with entity policy combined with static auth policy", async () => {
        @genericController(c => c.all().authorize("Public"))
        class MyFilter {
            @entity.primaryId()
            id: number
            @authorize.read("Owner", "User")
            property: string
        }
        const policy = [entityPolicy(MyFilter).define("Owner", ({ user }, id) => user?.userId === id)]
        const app = await createApp(MyFilter, policy).initialize()
        await supertest(app.callback())
            .get("/myfilter?order=property")
            .set("Authorization", `Bearer ${userToken}`)
            .expect(200)
    })
})