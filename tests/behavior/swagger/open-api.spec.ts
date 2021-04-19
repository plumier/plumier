import {
    ActionResult,
    api,
    authorize,
    bind,
    Class,
    DefaultFacility,
    domain,
    entity,
    Facility,
    FormFile,
    PlumierApplication,
    responseType,
    route,
    RouteMetadata,
    val,
    NestedGenericControllerDecorator,
    authPolicy,
    meta
} from "@plumier/core"
import { JwtAuthFacility, JwtAuthFacilityOption } from "@plumier/jwt"
import { refFactory, SwaggerFacility } from "@plumier/swagger"
import { IncomingMessage } from "http"
import { Context } from "koa"
import Plumier, { ControllerFacility, WebApiFacility } from "plumier"
import supertest from "supertest"
import reflect, { decorateClass, generic, noop, type } from "@plumier/reflect"

import { fixture } from "../helper"
import { filterParser } from "@plumier/query-parser"

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

    it("Should get dynamic class properly", () => {
        const getRef = refFactory(new Map())
        expect(getRef(reflect.create({ id: String }))).toBe("DynamicType")
        // Dynamic Type with the same structure should have the same name
        expect(getRef(reflect.create({ id: String }))).toBe("DynamicType")
        // different structure should have new name with number
        expect(getRef(reflect.create({ id: String, name: String }))).toBe("DynamicType1")
    })

    it("Should able to distinguish dynamic type with type array", () => {
        const getRef = refFactory(new Map())
        @generic.parameter("T")
        class Generic<T> {
            @type(["T"])
            data: T[]
            @meta.property()
            name:string
        }
        expect(getRef(generic.create(Generic, Number))).toBe("DynamicType")
        expect(getRef(generic.create(Generic, String))).toBe("DynamicType1")
    })
})

describe("Open API 3.0 Generation", () => {
    function createApp(ctl: Class | Class[]) {
        return fixture(ctl)
            .set(new SwaggerFacility())
            .initialize()
    }

    describe("Schema Override", () => {
        describe("Filter", () => {
            it("Should show filter as string", async () => {
                class Item {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @noop()
                    price: number

                    @noop()
                    basePrice: number
                }
                class ItemController {
                    @route.get("")
                    list(@filterParser(x => Item) filter: any) { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].get.parameters).toMatchSnapshot()
            })
        })
        describe("Request Body", () => {
            it("Should change relations with id type", async () => {
                class Shop {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation()
                    @type(x => [Item])
                    items: Item[]
                }
                class User {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation()
                    @type(x => [Shop])
                    shops: Shop[]
                }
                class Category {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string
                }
                class Item {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @noop()
                    price: number

                    @entity.relation()
                    shop: Shop

                    @entity.relation()
                    @type(x => [Category])
                    categories: Category[]

                    @entity.relation()
                    createdBy: User
                }
                class ItemController {
                    @route.post("")
                    save(data: Item) { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].post.requestBody).toMatchSnapshot()
            })
            it("Should hide reverse relation", async () => {
                class Shop {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation({ inverseProperty: "shop" })
                    @type(x => [Item])
                    items: Item[]
                }
                class User {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation()
                    @type(x => [Shop])
                    shops: Shop[]
                }
                class Category {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string
                }
                class Item {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @noop()
                    price: number

                    @entity.relation()
                    shop: Shop

                    @entity.relation()
                    @type(x => [Category])
                    categories: Category[]

                    @entity.relation()
                    createdBy: User
                }
                @generic.argument(Shop, Item, Number, Number)
                @decorateClass(<NestedGenericControllerDecorator>{ kind: "plumier-meta:relation-prop-name", relation: "items", type: Shop })
                class ItemController {
                    @route.post("")
                    save(@api.hideRelations() data: Item) { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].post.requestBody).toMatchSnapshot()
            })
            it("Should respect readonly property", async () => {
                class Shop {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation()
                    @type(x => [Item])
                    items: Item[]
                }
                class User {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation()
                    @type(x => [Shop])
                    shops: Shop[]
                }
                class Category {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string
                }
                class Item {
                    @entity.primaryId()
                    id: number

                    @authorize.readonly()
                    @noop()
                    name: string

                    @noop()
                    price: number

                    @entity.relation()
                    shop: Shop

                    @entity.relation()
                    @type(x => [Category])
                    categories: Category[]

                    @entity.relation()
                    createdBy: User
                }
                class ItemController {
                    @route.post("")
                    save(data: Item) { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].post.requestBody).toMatchSnapshot()
            })
            it("Should add required property", async () => {
                class Item {
                    @entity.primaryId()
                    id: number

                    @val.required()
                    name: string

                    @val.required()
                    price: number
                }
                class ItemController {
                    @route.post("")
                    save(data: Item) { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].post.requestBody).toMatchSnapshot()
            })
            it("Should ignore required property when partial validation applied", async () => {
                class Item {
                    @entity.primaryId()
                    id: number

                    @val.required()
                    name: string

                    @val.required()
                    price: number
                }
                class ItemController {
                    @route.post("")
                    save(@val.partial(Item) data: Item) { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].post.requestBody).toMatchSnapshot()
            })
        })
        describe("Response Body", () => {
            it("Should hide array child relation", async () => {
                class Category {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string
                }
                class Item {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @noop()
                    price: number

                    @entity.relation()
                    @type(x => [Category])
                    categories: Category[]
                }
                class ItemController {
                    @route.get("")
                    @api.hideRelations()
                    @type(Item)
                    get() { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].get.responses).toMatchSnapshot()
            })
            it("Should hide array child relation on array response", async () => {
                class Category {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string
                }
                class Item {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @noop()
                    price: number

                    @entity.relation()
                    @type(x => [Category])
                    categories: Category[]
                }
                class ItemController {
                    @route.get("")
                    @api.hideRelations()
                    @type([Item])
                    get() { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].get.responses).toMatchSnapshot()
            })
            it("Should hide all child relations", async () => {
                class Shop {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation()
                    @type(x => [Item])
                    items: Item[]
                }
                class User {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation()
                    @type(x => [Shop])
                    shops: Shop[]
                }
                class Category {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string
                }
                class Item {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @noop()
                    price: number

                    @entity.relation()
                    shop: Shop

                    @entity.relation()
                    @type(x => [Category])
                    categories: Category[]

                    @entity.relation()
                    createdBy: User
                }
                class ItemController {
                    @route.get("")
                    @api.hideRelations()
                    @type(Item)
                    get() { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].get.responses).toMatchSnapshot()
            })
            it("Should remove reverse relations", async () => {
                class Shop {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation({ inverseProperty: "shop" })
                    @type(x => [Item])
                    items: Item[]
                }
                class User {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @entity.relation()
                    @type(x => [Shop])
                    shops: Shop[]
                }
                class Category {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string
                }
                class Item {
                    @entity.primaryId()
                    id: number

                    @noop()
                    name: string

                    @noop()
                    price: number

                    @entity.relation()
                    shop: Shop

                    @entity.relation()
                    @type(x => [Category])
                    categories: Category[]

                    @entity.relation()
                    createdBy: User
                }
                @decorateClass(<NestedGenericControllerDecorator>{ kind: "plumier-meta:relation-prop-name", relation: "items", type: Shop })
                class ItemController {
                    @route.get("")
                    @api.hideRelations()
                    @type(Item)
                    get() { }
                }
                const app = await createApp(ItemController)
                const { body } = await supertest(app.callback())
                    .get("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/item"].get.responses).toMatchSnapshot()
            })
        })
    })

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

        it("Should detect query parameter of type object", async () => {
            @domain()
            class Query {
                constructor(
                    public str: string,
                    public num: number,
                    public bool: boolean,
                    public date: Date) { }
            }
            class UsersController {
                @route.get("")
                get(query: Query) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
        })

        it("Should hide readonly field on query parameter object", async () => {
            @domain()
            class Query {
                constructor(
                    public name: string,
                    public email: number,
                    @authorize.readonly()
                    public password: boolean) { }
            }
            class UsersController {
                @route.get("")
                get(query: Query) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.parameters).toMatchSnapshot()
            expect(body.components.schemas.Query).toMatchSnapshot()
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
        it("Model binding should not pick model with binding decorator", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string
                ) { }
            }
            @domain()
            class Query {
                constructor(
                    public type: string
                ) { }
            }
            class UsersController {
                @route.post("")
                save(@bind.custom(ctx => ctx.request.query) req: Query, user: User, type: string) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
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
        it("Should able to register object with the same name", async () => {
            class UsersController {
                @type({ one: String })
                one() { }
                @type({ two: String })
                two() { }
                @type({ three: String })
                three() { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should give the same name for dynamic type with the same structure", async () => {
            class UsersController {
                @type({ one: String, two: Number })
                one() { }
                @type({ one: String, two: Number })
                two() { }
                @type({ three: String, five: Number })
                three() { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
        })
        it("Should distinguish name when property type is different", async () => {
            class UsersController {
                @type({ one: String, two: Number })
                one() { }
                @type({ one: String, two: String })
                two() { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas).toMatchSnapshot()
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
            expect(body.components.schemas.Tag).toMatchSnapshot()
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
            expect(body.components.schemas.Tag).toMatchSnapshot()
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
            expect(body.components.schemas.Tag).toMatchSnapshot()
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
        it("Should able to generate object with unregistered object with self reference", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                    @reflect.type(x => [Tag])
                    public tags: Tag[]
                ) { }
            }
            // tag is not registered
            @domain()
            class Tag {
                constructor(
                    public tag: string,
                    @reflect.type(x => [Tag])
                    public children: Tag[]
                ) { }
            }
            class UsersController {
                @route.get("")
                get(): User { return {} as any }
            }
            const app = await createApp([UsersController])
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas.User).toMatchSnapshot()
            expect(body.components.schemas.Tag).toMatchSnapshot()
        })
        it("Should add readonly information on property marked with @authorize.readonly()", async () => {
            @domain()
            class User {
                constructor(
                    @authorize.readonly()
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
        it("Should add writeonly information on property marked with @authorize.writeonly()", async () => {
            @domain()
            class User {
                constructor(
                    public userName: string,
                    @authorize.writeonly()
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
            expect(body.components.schemas.Tag).toMatchSnapshot()
        })
        it("Should detect object using responseType", async () => {
            @domain()
            class DetailUser {
                constructor(
                    public fullName: string,
                    public pwd: string,
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                ) { }
            }
            class UsersController {
                @route.post("")
                @responseType(DetailUser)
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
        it("Should detect object using callback style responseType", async () => {
            @domain()
            class DetailUser {
                constructor(
                    public fullName: string,
                    public pwd: string,
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public userName: string,
                    public password: string,
                ) { }
            }
            class UsersController {
                @route.post("")
                @responseType(x => DetailUser)
                @reflect.type(x => User)
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
        function createSecureApp(ctl: Class | Class[], opt?: Partial<JwtAuthFacilityOption>) {
            return fixture(ctl)
                .set(new JwtAuthFacility({ ...opt, secret: "lorem" }))
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
                @authorize.route("admin")
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
                @authorize.route("Public")
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
        it("Should not apply security on class scope public with filter", async () => {
            @authorize.route("Public", { applyTo: "get" })
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
        it("Should apply security response on secured operation by role", async () => {
            class UsersController {
                @authorize.route("admin")
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
                @authorize.route("Public")
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
        describe("Open API Description", () => {
            it("Should add authorize on operation description properly", async () => {
                class UsersController {
                    @authorize.route("Public")
                    @route.get("")
                    get(id: string) {
                        return {} as any
                    }
                }
                const app = await createSecureApp(UsersController)
                const { body } = await supertest(app.callback())
                    .post("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/users"].get.summary).toMatchSnapshot()
            })
            it("Should add multiple authorize properly", async () => {
                class UsersController {
                    @authorize.route("Public", "Admin")
                    @route.get("")
                    get(id: string) {
                        return {} as any
                    }
                }
                const admin = authPolicy().define("Admin", ({ user }) => user?.role === "Admin")
                const app = await createSecureApp(UsersController, { authPolicies: [admin] })
                const { body } = await supertest(app.callback())
                    .post("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/users"].get.summary).toMatchSnapshot()
            })
            it("Should add multiple authorize with multiple decorators", async () => {
                class UsersController {
                    @authorize.route("Public")
                    @authorize.route("Admin")
                    @route.get("")
                    get(id: string) {
                        return {} as any
                    }
                }
                const admin = authPolicy().define("Admin", ({ user }) => user?.role === "Admin")
                const app = await createSecureApp(UsersController, { authPolicies: [admin] })
                const { body } = await supertest(app.callback())
                    .post("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/users"].get.summary).toMatchSnapshot()
            })
            it("Should prioritize action decorator vs class decorator", async () => {
                @authorize.route("Public")
                class UsersController {
                    @authorize.route("Admin")
                    @route.get("")
                    get(id: string) {
                        return {} as any
                    }
                }
                const admin = authPolicy().define("Admin", ({ user }) => user?.role === "Admin")
                const app = await createSecureApp(UsersController, { authPolicies: [admin] })
                const { body } = await supertest(app.callback())
                    .post("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/users"].get.summary).toMatchSnapshot()
            })
            it("Should prioritize action decorator vs global decorator", async () => {
                class UsersController {
                    @authorize.route("Admin")
                    @route.get("")
                    get(id: string) {
                        return {} as any
                    }
                }
                const admin = authPolicy().define("Admin", ({ user }) => user?.role === "Admin")
                const app = await createSecureApp(UsersController, { authPolicies: [admin], globalAuthorize: "Public" })
                const { body } = await supertest(app.callback())
                    .post("/swagger/swagger.json")
                    .expect(200)
                expect(body.paths["/users"].get.summary).toMatchSnapshot()
            })
        })
    })

    describe("Decorators", () => {
        it("Should able to mark required", async () => {
            class UsersController {
                @route.get("")
                get(@api.required() id: string) {
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
                get(@api.name("data") id: string) {
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
                get(@api.enums("a", "b") id: "a" | "b") {
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
                    @api.readonly()
                    public id: number,
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
        it("Should able to set readonly property on nested model", async () => {
            @domain()
            class Animal {
                constructor(
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public id: number,
                    public userName: string,
                    public password: string,
                    @api.readonly()
                    public animal: Animal
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should able to set write only property", async () => {
            @domain()
            class User {
                constructor(
                    public id: number,
                    @api.writeonly()
                    public userName: string,
                    public password: string
                ) { }
            }
            class UsersController {
                @route.get("")
                @type(User)
                get() { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.responses).toMatchSnapshot()
        })
        it("Should able to set write only property on nested model", async () => {
            @domain()
            class Animal {
                constructor(
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public id: number,
                    public userName: string,
                    public password: string,
                    @api.writeonly()
                    public animal: Animal
                ) { }
            }
            class UsersController {
                @route.get("")
                @type(User)
                get() { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].get.responses).toMatchSnapshot()
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

    describe("Route Grouping", () => {
        function createApp() {
            return new Plumier()
                .set({ mode: "production" })
                .set(new WebApiFacility())
                .set(new SwaggerFacility())
        }
        it("Should group route properly", async () => {
            class AnimalController {
                @route.get()
                method() { }
            }
            const app = await createApp()
                .set(new ControllerFacility({ controller: AnimalController, group: "v1", rootPath: "api/v1" }))
                .initialize()
            await supertest(app.callback())
                .get("/swagger/v1")
                .expect(302)
        })
        it("Should group route properly", async () => {
            class AnimalController {
                @route.get()
                method() { }
            }
            const app = await createApp()
                .set(new ControllerFacility({ controller: AnimalController, group: "v1", rootPath: "api/v1" }))
                .initialize()
            await supertest(app.callback())
                .get("/swagger/v1/index")
                .expect(200)
        })
        it("Should generate Open API schema properly", async () => {
            class AnimalController {
                @route.get()
                method() { }
            }
            const app = await createApp()
                .set(new ControllerFacility({ controller: AnimalController, group: "v1", rootPath: "api/v1" }))
                .initialize()
            const { body } = await supertest(app.callback())
                .get("/swagger/v1/swagger.json")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to group multiple", async () => {
            class AnimalController {
                @route.get()
                method() { }
            }
            const app = await createApp()
                .set(new ControllerFacility({ controller: AnimalController, group: "v1", rootPath: "api/v1" }))
                .set(new ControllerFacility({ controller: AnimalController, group: "v2", rootPath: "api/v2" }))
                .initialize()
            await supertest(app.callback())
                .get("/swagger/v1/swagger.json")
                .expect(200)
            await supertest(app.callback())
                .get("/swagger/v2/swagger.json")
                .expect(200)
        })
    })

    describe("Request Body With Relation Property", () => {
        it("Should able to transform body with relation", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public userName: string,
                    public password: string,
                    @entity.relation()
                    public pet: Animal
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should able to transform other type", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: string,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: string,
                    public userName: string,
                    public password: string,
                    @entity.relation()
                    public pet: Animal
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should work on array relation", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public userName: string,
                    public password: string,
                    @type([Animal])
                    @entity.relation()
                    public pet: Animal[]
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should work on inverse property relation", async () => {
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public userName: string,
                    public password: string,
                    @type(x => [Animal])
                    @entity.relation()
                    public pet: Animal[]
                ) { }
            }
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    @entity.relation()
                    public user: User
                ) { }
            }
            class AnimalsController {
                @route.post("")
                save(animal: Animal) { }
            }
            const app = await createApp(AnimalsController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals"].post.requestBody).toMatchSnapshot()
        })
        it("Should work with array type model", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public userName: string,
                    public password: string,
                    @entity.relation()
                    public pet: Animal
                ) { }
            }
            class UsersController {
                @route.post("")
                save(@type([User]) user: User[]) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should able use multiple relations", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public userName: string,
                    public password: string,
                    @entity.relation()
                    public pet: Animal,
                    @type([Animal])
                    @entity.relation()
                    public otherPet: Animal[]
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should able use multiple relations in array model", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public userName: string,
                    public password: string,
                    @entity.relation()
                    public pet: Animal,
                    @type([Animal])
                    @entity.relation()
                    public otherPet: Animal[]
                ) { }
            }
            class UsersController {
                @route.post("")
                save(@type([User]) user: User) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should able combine with required", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    @api.required()
                    public userName: string,
                    @api.required()
                    public password: string,
                    @entity.relation()
                    public pet: Animal
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
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
        it("Should not error when model type not specified", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public userName: string,
                    public password: string,
                    @entity.relation()
                    public pet: Animal
                ) { }
            }
            class UsersController {
                @route.post("")
                save(user: User[]) { }
            }
            const app = await createApp(UsersController)
            const { body } = await supertest(app.callback())
                .post("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/users"].post.requestBody).toMatchSnapshot()
        })
    })
})


