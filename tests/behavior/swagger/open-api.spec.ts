import {
    ActionResult,
    api,
    authorize,
    bind,
    Class,
    DefaultFacility,
    domain,
    Facility,
    FormFile,
    PlumierApplication,
    route,
    RouteMetadata,
    val,
    crud,
} from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { refFactory, SwaggerFacility } from "@plumier/swagger"
import { IncomingMessage } from "http"
import { Context } from "koa"
import supertest from "supertest"
import reflect from "tinspector"

import { fixture } from "../helper"

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

        it("Should detect query parameter with @bind.query() of type object with readOnly property", async () => {
            @domain()
            class Parameters {
                constructor(
                    @api.params.readOnly()
                    public id:number,
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

        it("Should ignore all required properties when provided @val.partial() on @bind.query()", async () => {
            @domain()
            class Parameters {
                constructor(
                    @val.required()
                    public str: string,
                    @val.required()
                    public num: number
                ) { }
            }
            class UsersController {
                @route.get("")
                get(@bind.query() @val.partial(Parameters) params: Parameters) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should ignore nested model on query parameter", async () => {
            @domain()
            class Other {
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            class Parameters {
                constructor(
                    public str: string,
                    public num: number,
                    public other: Other
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

        it("Should ignore nested array on query parameter", async () => {
            @domain()
            class Parameters {
                constructor(
                    public str: string,
                    public num: number,
                    @reflect.type([String])
                    public other: string[]
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

        it("Should ignore Generic Identifier on query parameter", async () => {
            @domain()
            class Parameters {
                constructor(
                    @crud.id()
                    public id: number,
                    public str: string,
                    public num: number,
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
        it("Should detect @bind.body() with PUT method", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.put("")
                save(@bind.body() user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].put.requestBody).toMatchSnapshot()
        })
        it("Should detect @bind.body() with PATCH method", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.patch("")
                save(@bind.body() user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].patch.requestBody).toMatchSnapshot()
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
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
        it("Should ignore required field when @val.partial() specified", async () => {
            @domain()
            class User {
                constructor(
                    @val.required()
                    public userName: string,
                    @val.required()
                    public password: string
                ) { }
            }
            class UsersController {
                @route.put("")
                save(@bind.body() @val.partial(User) user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].put.requestBody).toMatchSnapshot()
        })
        it("Should ignore required field when @val.partial() specified on model binding", async () => {
            @domain()
            class User {
                constructor(
                    @val.required()
                    public userName: string,
                    @val.required()
                    public password: string
                ) { }
            }
            class UsersController {
                @route.put("")
                save(@val.partial(User) user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].put.requestBody).toMatchSnapshot()
        })
    })

    describe("File Body Request", () => {
        it("Should detect single name binding", async () => {
            class UsersController {
                @route.post("")
                save(file: FormFile) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect single name binding with PUT method", async () => {
            class UsersController {
                @route.put(":id")
                save(id: string, file: FormFile) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users/{id}"].put.requestBody).toMatchSnapshot()
        })
        it("Should detect single name binding with PATCH method", async () => {
            class UsersController {
                @route.patch(":id")
                save(id: string, file: FormFile) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users/{id}"].patch.requestBody).toMatchSnapshot()
        })
        it("Should detect name binding", async () => {
            class UsersController {
                @route.post("")
                save(file: FormFile, type: string, count: number) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect decorator binding", async () => {
            class UsersController {
                @route.post("")
                save(@bind.formFile("file") data: FormFile, type: string, count: number) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect decorator binding with array", async () => {
            class UsersController {
                @route.post("")
                save(@bind.formFile("file") data: FormFile[]) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect decorator binding without FormFile type", async () => {
            class UsersController {
                @route.post("")
                save(@bind.formFile("file") data: any) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should detect decorator binding without FormFile type but with array", async () => {
            class UsersController {
                @route.post("")
                save(@bind.formFile("file") data: any[]) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
    })

    describe("Component Schema", () => {
        it("Should detect system object component", async () => {
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
            expect(body.components.schemas["System-DefaultErrorMessage"]).toMatchSnapshot()
            expect(body.components.schemas["System-ValidationError"]).toMatchSnapshot()
        })
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
            expect(body.components.schemas.User).toMatchSnapshot()
        })
        it("Should create inline object on nested object if not registered", async () => {
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
            expect(body.components.schemas.User).toMatchSnapshot()
        })
        it("Should use reference on nested object if object already registered", async () => {
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
                @route.post("tag")
                saveTag(user: Tag) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas.User).toMatchSnapshot()
            expect(body.components.schemas.Tag).toMatchSnapshot()
        })
        it("Should create inline array object if nested object not registered", async () => {
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
            expect(body.components.schemas.User).toMatchSnapshot()
        })
        it("Should use reference on nested array object if array element already registered", async () => {
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
                @route.post("tag")
                saveTag(user: Tag) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas.User).toMatchSnapshot()
            expect(body.components.schemas.Tag).toMatchSnapshot()
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
            expect(body.components.schemas.Animal).toMatchSnapshot()
            expect(body.components.schemas.User).toMatchSnapshot()
        })
        it("Should able to generate object with cross reference", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                    @reflect.type(x => [Tag])
                    public tags: Tag[]
                ) { }
            }
            @domain()
            class Tag {
                constructor(
                    public tag: string,
                    @reflect.type(x => [User])
                    public users: User[]
                ) { }
            }
            class UsersController {
                @route.get("")
                get(): User { return {} as any }
            }
            class TagsController {
                @route.get("")
                get(): Tag { return {} as any }
            }
            const app = await createApp([UsersController, TagsController])
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas.User).toMatchSnapshot()
            expect(body.components.schemas.Tag).toMatchSnapshot()
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
            expect(body.components.schemas.User).toMatchSnapshot()
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

    describe("Decorators", () => {
        it("Should able to mark required", async () => {
            class UsersController {
                @route.get("")
                get(@api.params.required() id: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })
        it("Should able to rename field", async () => {
            class UsersController {
                @route.get("")
                get(@api.params.name("data") id: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })
        it("Should able add enums information", async () => {
            class UsersController {
                @route.get("")
                get(@api.params.enums("a", "b") id: "a" | "b") {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })
        it("Should able add enums information with @val.enums()", async () => {
            class UsersController {
                @route.get("")
                get(@val.enums({ enums: ["a", "b"] }) id: "a" | "b") {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })
        it("Should able add enums information in object property", async () => {
            @domain()
            class User {
                constructor(@val.enums({ enums: ["a", "b"] }) public id: "a" | "b") { }
            }
            class UsersController {
                @route.post("")
                save(user: User) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas.User).toMatchSnapshot()
        })
        it("Should able add enums information in name binding", async () => {
            class UsersController {
                @route.post("")
                save(@val.enums({ enums: ["a", "b"] }) id: "a" | "b", name: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should able to add description on action", async () => {
            class UsersController {
                @route.post("")
                @api.description("Lorem ipsum dolor sit amet")
                save(name: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.description).toMatchSnapshot()
        })
        it("Should able to add description on parameter", async () => {
            class UsersController {
                @route.get("")
                save(@api.description("Lorem ipsum dolor sit amet") name: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })
        it("Should able to change response type", async () => {
            class UsersController {
                @route.get("")
                @api.response(200, "text/html", String)
                save() {
                    return new ActionResult("<div>hello</div>").setHeader("Content-Type", "text/html")
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.responses).toMatchSnapshot()
        })
        it("Should provide html response on History Api Fallback", async () => {
            class UsersController {
                @route.get("")
                @route.historyApiFallback()
                save() {
                    return new ActionResult("<div>hello</div>").setHeader("Content-Type", "text/html")
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.responses).toMatchSnapshot()
        })
        it("Should able to add tags on action", async () => {
            @api.tag("Lorem")
            class UsersController {
                @route.post("")
                save(name: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post).toMatchSnapshot()
        })
        it("Should able to add multiple tags on action", async () => {
            @api.tag("Lorem")
            @api.tag("Ipsum")
            class UsersController {
                @route.post("")
                save(name: string) {
                    return {} as any
                }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post).toMatchSnapshot()
        })
        it("Should able to set readonly property", async () => {
            @domain()
            class User {
                constructor(
                    @api.params.readOnly()
                    public id:number,
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
            expect(body.components.schemas.User).toMatchSnapshot()
        })
        it("Should able to set write only property", async () => {
            @domain()
            class User {
                constructor(
                    public id:number,
                    @api.params.writeOnly()
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
            expect(body.components.schemas.User).toMatchSnapshot()
        })
    })

    describe("Virtual Routes", () => {
        function createApp(facility: Facility) {
            class AnimalController {
                @route.get()
                method() { }
            }
            return fixture(AnimalController)
                .set(new SwaggerFacility())
                .set(facility)
                .initialize()
        }

        it("Should transform virtual route", async () => {
            class MyFacility extends DefaultFacility {
                constructor() { super() }
                async generateRoutes(app: Readonly<PlumierApplication>): Promise<RouteMetadata[]> {
                    return [{
                        kind: "VirtualRoute",
                        method: "get",
                        overridable: false,
                        provider: MyFacility,
                        url: "/other/get",
                        access: "Public"
                    }]
                }
            }
            const app = await createApp(new MyFacility())
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/other/get"]).toMatchSnapshot()
        })
        it("Should able to define custom specification", async () => {
            class MyFacility extends DefaultFacility {
                constructor() { super() }
                async generateRoutes(app: Readonly<PlumierApplication>): Promise<RouteMetadata[]> {
                    return [{
                        kind: "VirtualRoute",
                        method: "get",
                        overridable: false,
                        provider: MyFacility,
                        url: "/other/get",
                        access: "Public",
                        openApiOperation: {
                            description: "Lorem ipsum",
                            parameters: {
                                name: {
                                    in: "query",
                                    description: "Lorem ipsum"
                                }
                            }
                        }
                    }]
                }
            }
            const app = await createApp(new MyFacility())
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/other/get"]).toMatchSnapshot()
        })
    })
})


