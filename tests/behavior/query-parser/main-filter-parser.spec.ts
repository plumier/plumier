import { authorize, authPolicy, Class, route, val } from "@plumier/core"
import { createCustomFilterConverter, FilterQueryAuthorizeMiddleware, filterParser } from "@plumier/query-parser"
import { JwtAuthFacility } from "@plumier/jwt"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { generic, noop } from "@plumier/reflect"
import { sign } from "jsonwebtoken"
import supertest from "supertest"


describe("Filter Parser", () => {
    class User {
        @val.email()
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
        get(@filterParser(x => User) filter: any) {
            return filter
        }
    }

    function createApp() {
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({ controller: UsersController }))
            .set({ typeConverterVisitors: [createCustomFilterConverter(x => x)] })
            .initialize()
    }
    it("Should allow simple expression", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=name='ipsum'")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should allow simple expression with NOT expression", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=!name='ipsum'")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should convert value correctly on reverse equation", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter='true'=deleted")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should convert value properly", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=createdAt='2020-1-1'")
            .expect(200)
        expect(body).toMatchSnapshot({ right: { value: expect.any(String) } })
    })
    it("Should allow grouped expression", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=(name='ipsum')")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should allow multiple expression", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=(name='ipsum') AND (deleted = false) OR email = 'lorem@ipsum.com'")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should allow input array with simple query string notation", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=(name='ipsum')&filter=(deleted=false)")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should allow input array with simple query string notation without grouping", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=name='ipsum'&filter=deleted=false")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should catch expression error by 422", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=(name='ipsum' MUL deleted=false)")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
    it("Should catch unknown column name", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=delted=false")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
    it("Should catch unknown column name on property vs property", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=name=delted")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
    it("Should catch invalid value type", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=deleted=123")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
    it("Should catch if provided object value", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter[name]=lorem")
            .expect(422)
        expect(body).toMatchSnapshot()
    })
    it("Should skip validation", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=email='ipsum'")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should not check property vs property", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=email=name")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should not error when provided undefined", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should not affecting other parameter", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?index=20")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should work with generic type controller", async () => {
        class User {
            @val.email()
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        @generic.template("T")
        class MyGeneric<T> {
            @route.get("")
            get(@filterParser(x => "T") filter: any, index: number) {
                return filter
            }
        }
        @generic.type(User)
        class UsersController extends MyGeneric<User>{ }
        function createApp() {
            return new Plumier()
                .set({ mode: "production" })
                .set(new WebApiFacility({ controller: UsersController }))
                .set({ typeConverterVisitors: [createCustomFilterConverter(x => x)] })
                .initialize()
        }
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=name='ipsum'")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should parse range number properly", async () => {
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get("/users?filter=age=17...20")
            .expect(200)
        expect(body).toMatchSnapshot()
    })
})

describe("Filter Parser Authorizer", () => {
    const SECRET = "super secret"
    const USER_TOKEN = sign({ email: "ketut@gmail.com", role: "user" }, SECRET)
    const ADMIN_TOKEN = sign({ email: "ketut@gmail.com", role: "admin" }, SECRET)
    const SUPER_ADMIN_TOKEN = sign({ email: "ketut@gmail.com", role: "superadmin" }, SECRET)

    function createApp(controller: Class) {
        const authPolicies = [
            authPolicy().define("user", i => i.user?.role === "user"),
            authPolicy().define("admin", i => i.user?.role === "admin"),
            authPolicy().define("superadmin", i => i.user?.role === "superadmin"),
        ]
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({ controller }))
            .set({ typeConverterVisitors: [createCustomFilterConverter(x => x)] })
            .use(new FilterQueryAuthorizeMiddleware(), "Action")
            .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
            .initialize()
    }
    it("Should check unauthorized column", async () => {
        class User {
            @noop()
            email: string
            @authorize.read("admin")
            name: string
            @authorize.read("admin")
            deleted: boolean
            @authorize.read("admin")
            createdAt: Date
        }
        class UsersController {
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        const { body } = await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com' and name='john' and deleted=false and createdAt='2020-1-1'")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(401)
        expect(body).toMatchSnapshot()
    })
    it("Should check unauthorized column if compared as column vs column", async () => {
        class User {
            @noop()
            email: string
            @authorize.read("admin")
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        class UsersController {
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        const { body } = await supertest(app.callback())
            .get("/users?filter=email=name")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(401)
        expect(body).toMatchSnapshot()
    })
    it("Should check unauthorized column on public route", async () => {
        class User {
            @noop()
            email: string
            @authorize.read("admin")
            name: string
            @authorize.read("admin")
            deleted: boolean
            @authorize.read("admin")
            createdAt: Date
        }
        class UsersController {
            @authorize.route("Public")
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        const { body } = await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com' and name='john' and deleted=false and createdAt='2020-1-1'")
            .expect(403)
        expect(body).toMatchSnapshot()
    })
    it("Should respect route authorization", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        class UsersController {
            @authorize.route("Public")
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .expect(200)
    })
    it("Should respect route authorization on protected route", async () => {
        class User {
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        class UsersController {
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
            .expect(200)
    })
    it("Should able to secure filter by policy", async () => {
        class User {
            @authorize.read("user")
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        class UsersController {
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
        const { body } = await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
            .expect(401)
        expect(body).toMatchSnapshot()
    })
    it("Should not filter writeonly property", async () => {
        class User {
            @authorize.writeonly()
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        class UsersController {
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        const { body } = await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
            .expect(401)
        expect(body).toMatchSnapshot()
    })
    it("Should able to specify multiple decorators", async () => {
        class User {
            @authorize.read("user")
            @authorize.read("admin")
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        class UsersController {
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
            .expect(200)
    })
    it("Should able to specify multiple policy by single decorator", async () => {
        class User {
            @authorize.read("user", "admin")
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        class UsersController {
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
            .expect(200)
        const { body } = await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
            .expect(401)
        expect(body).toMatchSnapshot()
    })
    it("Should able to specify multiple policy by multiple decorators", async () => {
        class User {
            @authorize.read("user")
            @authorize.read("admin")
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        class UsersController {
            @route.get("")
            get(@filterParser(x => User) filter: any) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
        await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
            .expect(200)
        const { body } = await supertest(app.callback())
            .get("/users?filter=email='lorem@ipsum.com'")
            .set("Authorization", `Bearer ${SUPER_ADMIN_TOKEN}`)
            .expect(401)
        expect(body).toMatchSnapshot()
    })
    it("Should not affected non filterParser parameter", async () => {
        class User {
            @authorize.read("user")
            @authorize.read("admin")
            @noop()
            email: string
            @noop()
            name: string
            @noop()
            deleted: boolean
            @noop()
            createdAt: Date
        }
        class UsersController {
            @route.get("")
            get(@filterParser(x => User) filter: any, index: number) {
                return filter
            }
        }
        const app = await createApp(UsersController)
        await supertest(app.callback())
            .get("/users?index=100")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
    })
    it("Should not check when action doesn't have filterParser", async () => {
        class UsersController {
            @route.get("")
            get(index: number) {
                return index
            }
        }
        const app = await createApp(UsersController)
        await supertest(app.callback())
            .get("/users?index=100")
            .set("Authorization", `Bearer ${USER_TOKEN}`)
            .expect(200)
    })
})
