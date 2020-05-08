import { bind, Class, domain, route, val, authorize } from "@plumier/core"
import { refFactory, SwaggerFacility } from "@plumier/swagger"
import { IncomingMessage } from "http"
import { Context } from "koa"
import supertest from "supertest"
import reflect from "tinspector"

import { fixture } from "../helper"
import { JwtAuthFacility } from '@plumier/jwt'

describe("getRef", () => {
    class User { }

    it("Should get name properly", () => {
        const getRef = refFactory(new Map())
        expect(getRef(User)).toBe("User")
        expect(getRef(User)).toBe("User")
    })

    it("Should get name properly", () => {
        const getRef = refFactory(new Map())
        const OtherUser = (() => {
            class User { }
            return User
        })()
        expect(getRef(User)).toBe("User")
        expect(getRef(User)).toBe("User")
        expect(getRef(OtherUser)).toBe("User1")
        expect(getRef(OtherUser)).toBe("User1")
    })
})

describe("Open API 3.0 Generation", () => {
    function createApp(ctl: Class | Class[]) {
        return fixture(ctl)
            .set(new SwaggerFacility())
            .initialize()
    }

    describe("Info", () => {
        it("Should able to provide spec info", async () => {
            class UsersController {
                @route.post("")
                save() { }
            }
            const app = await fixture(UsersController)
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.info).toMatchSnapshot()
        })
        it("Should able to override spec info", async () => {
            class UsersController {
                @route.post("")
                save() { }
            }
            const app = await fixture(UsersController)
                .set(new SwaggerFacility({ info: { title: "Pet Api Explorer", version: "1.0.0", description: "Lorem ipsum" } }))
                .initialize()
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.info).toMatchSnapshot()
        })
    })

    describe("Path", () => {
        it("Should combine path based on resource", async () => {
            class UsersController {
                @route.post("")
                save() { }
                @route.get("")
                get() { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should combine path using different controllers", async () => {
            class UsersController {
                @route.post("")
                save() { }
            }
            @route.root("users")
            class UsersExController {
                @route.get("")
                get() { }
            }
            const app = await createApp([UsersController, UsersExController])
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should convert path properly", async () => {
            class UsersController {
                @route.get(":id/:type/:index")
                save(id: string, type: string, index: number) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths).toMatchSnapshot()
        })
    })

    describe("Parameter", () => {
        it("Should detect query parameter", async () => {
            class UsersController {
                @route.get("")
                get(str: string, num: number, bool: boolean, date: Date) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should detect query parameter with required", async () => {
            class UsersController {
                @route.get("")
                get(@val.required() str: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should detect path parameter", async () => {
            class UsersController {
                @route.get(":id")
                get(id: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users/{id}"].get.parameters).toMatchSnapshot()
        })

        it("Should detect path parameter with required", async () => {
            class UsersController {
                @route.get(":id")
                get(@val.required() id: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users/{id}"].get.parameters).toMatchSnapshot()
        })

        it("Should detect query parameter with @bind.query()", async () => {
            class UsersController {
                @route.get("")
                get(@bind.query("id") id: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should detect query parameter with @bind.query() of type object", async () => {
            @domain()
            class Parameters {
                constructor(
                    public str: string,
                    public num: number
                ) { }
            }
            class UsersController {
                @route.get("")
                get(@bind.query() params: Parameters) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should detect query parameter with @bind.query() of type object with required", async () => {
            @domain()
            class Parameters {
                constructor(
                    @val.required()
                    public str: string,
                    public num: number
                ) { }
            }
            class UsersController {
                @route.get("")
                get(@bind.query() params: Parameters) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should detect header parameter with @bind.header()", async () => {
            class UsersController {
                @route.get("")
                get(@bind.header("id") id: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should detect header parameter with @bind.header() of type object", async () => {
            @domain()
            class Parameters {
                constructor(
                    public str: string,
                    public num: number
                ) { }
            }
            class UsersController {
                @route.get("")
                get(@bind.header() params: Parameters) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should detect cookie parameter with @bind.cookie()", async () => {
            class UsersController {
                @route.get("")
                get(@bind.cookie("id") id: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should ignore @bind.ctx() parameter", async () => {
            class UsersController {
                @route.get("")
                get(@bind.ctx() ctx: Context) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should ignore @bind.user() parameter", async () => {
            class UsersController {
                @route.get("")
                get(@bind.user() user: any) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should ignore @bind.request() parameter", async () => {
            class UsersController {
                @route.get("")
                get(@bind.request() req: IncomingMessage) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should ignore @bind.body() parameter", async () => {
            class UsersController {
                @route.get("")
                get(@bind.body() body: any) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should ignore @bind.fromFile() parameter", async () => {
            class UsersController {
                @route.get("")
                get(@bind.formFile("file") file: any) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should ignore @bind.custom() parameter", async () => {
            class UsersController {
                @route.get("")
                get(@bind.custom(x => x.url) url: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should detect name binding on post method as body", async () => {
            class UsersController {
                @route.post("")
                save(userName: string, password: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.parameters).toMatchSnapshot()
        })

        it("Should detect name binding and model binding on post method", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.parameters).toMatchSnapshot()
        })
    })

    describe("Request Body", () => {
        it("Should detect @bind.body()", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(@bind.body() user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect @bind.body() with required", async () => {
            @domain()
            class User {
                constructor(
                    @val.required()
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(@bind.body() user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should detect @bind.body() with array element", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(@reflect.type([User]) @bind.body() user: User[], type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect @bind.body() with array element with required", async () => {
            @domain()
            class User {
                constructor(
                    @val.required()
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(@reflect.type([User]) @bind.body() user: User[], type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should detect model binding", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect model binding with required", async () => {
            @domain()
            class User {
                constructor(
                    @val.required()
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should detect model binding with array", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(@reflect.type([User]) user: User[], type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect model binding with array with required", async () => {
            @domain()
            class User {
                constructor(
                    @val.required()
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(@reflect.type([User]) user: User[], type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should detect name binding", async () => {
            class UsersController {
                @route.post("")
                save(userName: string, password: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect name binding with required", async () => {
            class UsersController {
                @route.post("")
                save(@val.required() userName: string, password: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
    })

    describe("Component Schema", () => {
        it("Should detect object component", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(user: User) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should detect nested object component", async () => {
            @domain()
            class Tag {
                constructor(public tag: string) { }
            }
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                    public tag: Tag
                ) { }
            }
            class UsersController {
                @route.post("")
                save(user: User) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should detect nested array of object component", async () => {
            @domain()
            class Tag {
                constructor(public tag: string) { }
            }
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                    @reflect.type([Tag])
                    public tag: Tag[]
                ) { }
            }
            class UsersController {
                @route.post("")
                save(user: User) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should able to mix registered an non registered object", async () => {
            @domain()
            // Animal registered on components by the GET /users
            class Animal {
                constructor(public name: string) { }
            }
            @domain()
            // Tag not registered in components
            class Tag {
                constructor(
                    public tag: string,
                    // reference to registered component
                    public animal: Animal
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                    // reference to non registered component
                    public tag: Tag
                ) { }
            }
            class UsersController {
                @route.get("")
                get(): Animal { return {} as any }
                @route.post("")
                save(user: User) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
    })

    describe("Response", () => {
        it("Should detect object response", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                ) { }
            }
            class UsersController {
                @route.post("")
                @reflect.type(User)
                save(user: User): User {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.responses["200"]).toMatchSnapshot()
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should detect array object response", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                ) { }
            }
            class UsersController {
                @route.post("")
                @reflect.type([User])
                save(user: User): User[] {
                    return []
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.responses["200"]).toMatchSnapshot()
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should detect nested object response", async () => {
            @domain()
            class Tag {
                constructor(public tag: string) { }
            }
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                    public tag: Tag
                ) { }
            }
            class UsersController {
                @route.post("")
                @reflect.type(User)
                save(user: User): User {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.responses["200"]).toMatchSnapshot()
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should detect nested object array response", async () => {
            @domain()
            class Tag {
                constructor(public tag: string) { }
            }
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                    @reflect.type([Tag])
                    public tag: Tag[]
                ) { }
            }
            class UsersController {
                @route.post("")
                @reflect.type(User)
                save(user: User): User {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.responses["200"]).toMatchSnapshot()
            expect(body.components.schemas).toMatchSnapshot()
        })
    })

    describe("Durability", () => {
        it("Should transform if no parameter type specified", async () => {
            class UsersController {
                get(id: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users/get"].get.parameters).toMatchSnapshot()
        })
        it("Should transform if method return type not specified", async () => {
            class UsersController {
                @route.get("")
                get(id: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.responses).toMatchSnapshot()
        })
    })

    describe("Security", () => {
        function createSecureApp(ctl: Class | Class[]) {
            return fixture(ctl)
                .set(new JwtAuthFacility({ secret: "lorem" }))
                .set(new SwaggerFacility())
                .initialize()
        }
        it("Should not generate security component if authorization is not activated", async () => {
            class UsersController {
                @route.get("")
                get(id: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.securitySchemes).toMatchSnapshot()
        })
        it("Should generate security component if authorization is activated", async () => {
            class UsersController {
                @route.get("")
                get(id: string) {
                    return {} as any
                }
            }
            const app = await createSecureApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.securitySchemes).toMatchSnapshot()
        })
        it("Should apply security on secured operation", async () => {
            class UsersController {
                @route.get("")
                get(id: string) {
                    return {} as any
                }
            }
            const app = await createSecureApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.security).toMatchSnapshot()
        })
        it("Should apply security on secured operation by role", async () => {
            class UsersController {
                @authorize.role("admin")
                @route.get("")
                get(id: string) {
                    return {} as any
                }
            }
            const app = await createSecureApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.security).toMatchSnapshot()
        })
        it("Should not apply security on public operation", async () => {
            class UsersController {
                @authorize.public()
                @route.get("")
                get(id: string) {
                    return {} as any
                }
            }
            const app = await createSecureApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.security).toMatchSnapshot()
        })
        it("Should apply security response on secured operation by role", async () => {
            class UsersController {
                @authorize.role("admin")
                @route.get("")
                get(id: string) {
                    return {} as any
                }
            }
            const app = await createSecureApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.responses).toMatchSnapshot()
        })
        it("Should not apply security response on public operation", async () => {
            class UsersController {
                @authorize.public()
                @route.get("")
                get(id: string) {
                    return {} as any
                }
            }
            const app = await createSecureApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.responses).toMatchSnapshot()
        })
    })
})