import { authorize, authPolicy, Class, entity, RelationDecorator, RelationPropertyDecorator, route } from "@plumier/core"
import { createCustomSelectConverter, selectParser, SelectQueryAuthorizeMiddleware } from "@plumier/query-parser"
import { JwtAuthFacility } from "@plumier/jwt"
import { decorateClass, noop, type } from "@plumier/reflect"
import { sign } from "jsonwebtoken"
import Plumier, { WebApiFacility } from "plumier"
import supertest from "supertest"

describe("Select Parser", () => {
    function createApp(controller?: Class) {
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({ controller }))
            .set({ typeConverterVisitors: [createCustomSelectConverter(x => x)] })
    }

    it("Should select all fields by default", async () => {
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
            get(@selectParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should not select array relation by default", async () => {
        class Log {
            @noop()
            message: string
        }
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @entity.relation()
            @type([Log])
            logs: Log[]
        }
        class UsersController {
            @route.get("")
            get(@selectParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should select single relation property by default", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
        }
        class Log {
            @noop()
            message: string
            @entity.relation()
            @type(x => User)
            user: User
        }
        class UsersController {
            @route.get("")
            get(@selectParser(x => Log) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should not select inverse property by default", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @entity.relation({ inverseProperty: "user" })
            @type(x => [Log])
            logs: Log[]
        }
        class Log {
            @noop()
            message: string
            @type(x => User)
            user: User
        }
        @decorateClass(<RelationPropertyDecorator>{ kind: "plumier-meta:relation-prop-name", name: "logs", inverseProperty: "user" })
        class UsersController {
            @route.get("")
            get(@selectParser(x => Log) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should able to select some properties", async () => {
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
            get(@selectParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?filter=email,name")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should ignore white space", async () => {
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
            get(@selectParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?filter=email,   name")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should able to select inverse property if specified", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @entity.relation({ inverseProperty: "user" })
            @type(x => [Log])
            logs: Log[]
        }
        class Log {
            @noop()
            message: string
            @type(x => User)
            user: User
        }
        @decorateClass(<RelationPropertyDecorator>{ kind: "plumier-meta:relation-prop-name", name: "logs", inverseProperty: "user" })
        class UsersController {
            @route.get("")
            get(@selectParser(x => Log) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?filter=user")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should throw invalid column name", async () => {
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
            get(@selectParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?filter=elmail,names")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
    it("Should not confused with other parameter", async () => {
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
            get(@selectParser(x => User) filter: any, index:number) {
                return filter
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?filter=email,name,deleted&index=200")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
})

describe("Select Parser Authorization", () => {
    const secret = "lorem ipsum"
    const userToken = sign({ id: 123, role: "User" }, secret)
    const adminToken = sign({ id: 234, role: "Admin" }, secret)
    const superAdminToken = sign({ id: 234, role: "SuperAdmin" }, secret)
    function createApp(controller?: Class) {
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({ controller }))
            .set(new JwtAuthFacility({
                secret, authPolicies: [
                    authPolicy().define("User", ({ user }) => user?.role === "User"),
                    authPolicy().define("Admin", ({ user }) => user?.role === "Admin"),
                    authPolicy().define("SuperAdmin", ({ user }) => user?.role === "SuperAdmin")
                ]
            }))
            .use(new SelectQueryAuthorizeMiddleware(), "Action")
            .set({ typeConverterVisitors: [createCustomSelectConverter(x => x)] })
    }
    it("Should select all columns by default, including secured column, but skip auth check", async () => {
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
            get(@selectParser(x => User) select: any) {
                return select
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users")
            .set("Authorization", `Bearer ${userToken}`)
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should able to authorize column when selected", async () => {
        class User {
            @authorize.read("Admin")
            @noop()
            email: string
            @noop()
            name: string
        }
        class UsersController {
            @route.get("")
            get(@selectParser(x => User) select: any) {
                return select
            }
        }
        const app = await createApp(UsersController).initialize()
        const { body } = await supertest(app.callback())
            .get("/users?select=email,name")
            .set("Authorization", `Bearer ${userToken}`)
            .expect(401)
        await supertest(app.callback())
            .get("/users?select=email,name")
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should not confused with @authorize.write()", async () => {
        class User {
            @authorize.write("Admin")
            @noop()
            email: string
            @noop()
            name: string
        }
        class UsersController {
            @route.get("")
            get(@selectParser(x => User) select: any) {
                return select
            }
        }
        const app = await createApp(UsersController).initialize()
        await supertest(app.callback())
            .get("/users?select=email,name")
            .set("Authorization", `Bearer ${userToken}`)
            .expect(200)
        await supertest(app.callback())
            .get("/users?select=email,name")
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200)
    })
    it("Should able to authorize column with multiple decorators when selected", async () => {
        class User {
            @authorize.read("Admin")
            @authorize.read("SuperAdmin")
            @noop()
            email: string
            @noop()
            name: string
        }
        class UsersController {
            @route.get("")
            get(@selectParser(x => User) select: any) {
                return select
            }
        }
        const app = await createApp(UsersController).initialize()
        await supertest(app.callback())
            .get("/users?select=email,name")
            .set("Authorization", `Bearer ${userToken}`)
            .expect(401)
        await supertest(app.callback())
            .get("/users?select=email,name")
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200)
        await supertest(app.callback())
            .get("/users?select=email,name")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .expect(200)
    })
})
