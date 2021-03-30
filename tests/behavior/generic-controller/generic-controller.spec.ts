import {
    ActionResult,
    api,
    Authenticated,
    authorize,
    authPolicy,
    bind,
    Configuration,
    DefaultFacility,
    entity,
    entityPolicy,
    Invocation,
    Middleware,
    OneToManyRepository,
    PlumierApplication,
    postSave,
    preSave,
    Repository,
    response,
    route,
    RouteMetadata
} from "@plumier/core"
import { IdentifierResult, RepoBaseControllerGeneric, RepoBaseOneToManyControllerGeneric, RequestHookMiddleware } from "@plumier/generic-controller"
import { JwtAuthFacility } from "@plumier/jwt"
import reflect, { generic, noop, type } from "@plumier/reflect"
import { SwaggerFacility } from "@plumier/swagger"
import "@plumier/testing"
import { cleanupConsole } from "@plumier/testing"
import { sign } from "jsonwebtoken"
import { Context } from "koa"
import { join } from "path"
import Plumier, { ControllerFacility, ControllerFacilityOption, domain, genericController, WebApiFacility } from "plumier"
import supertest from "supertest"
import { DefaultControllerGeneric, DefaultOneToManyControllerGeneric, expectError, MockOneToManyRepo, MockRepo } from "../helper"


class RouteHookFacility extends DefaultFacility {
    constructor(private callback: ((x: RouteMetadata[]) => void)) { super() }
    async initialize(app: Readonly<PlumierApplication>, routes: RouteMetadata[]) {
        this.callback(routes)
    }
}

class ErrorHandlerMiddleware implements Middleware {
    async execute(invocation: Readonly<Invocation<Context>>): Promise<ActionResult> {
        try {
            return await invocation.proceed()
        }
        catch (e) {
            return response
                .json({ error: e.message })
                .setStatus(500)
        }
    }
}

function getParameters(routes: RouteMetadata[]) {
    return routes.map(x => {
        if (x.kind === "ActionRoute") {
            return { name: x.action.name, pars: x.action.parameters.map(y => ({ name: y.name, type: y.type })) }
        }
    })
}

function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
    return new Plumier()
        .set({ ...config })
        .set(new WebApiFacility(opt))
        .set({ genericController: [DefaultControllerGeneric, DefaultOneToManyControllerGeneric] })
}

describe("Route Generator", () => {
    it("Should able to specify entity directory", async () => {
        const mock = console.mock()
        await createApp({ controller: join(__dirname, "entities") }).initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
    })
    it("Should able to specify entity directory with relative path", async () => {
        const mock = console.mock()
        await createApp({ controller: "./entities" }).initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
    })
    it("Should able to specify nested directories", async () => {
        const mock = console.mock()
        await createApp({ controller: "./nested" }).initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
    })
    it("Should able to flatten nested directories", async () => {
        const mock = console.mock()
        await createApp({ controller: "./nested", directoryAsPath: false }).initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
    })
    it("Should initiate IdentifierResult properly", () => {
        expect(new IdentifierResult<number>(20)).toMatchSnapshot()
    })
    describe("Generic Controller", () => {
        it("Should generate routes with parameter property entity", async () => {
            @genericController()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should generate routes with property field entity", async () => {
            @genericController()
            class User {
                @entity.primaryId()
                id: number
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to specify ID type by providing decorator", async () => {
            @genericController()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            let routes: RouteMetadata[] = []
            await createApp({ controller: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize()
            expect(getParameters(routes)).toMatchSnapshot()
        })
        it("Should able to specify ID of type string by providing decorator", async () => {
            @genericController()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: string,
                    public name: string,
                    public email: string
                ) { }
            }
            let routes: RouteMetadata[] = []
            await createApp({ controller: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize()
            expect(getParameters(routes)).toMatchSnapshot()
        })
        it("Should throw error when entity doesn't have ID specified", async () => {
            const fn = jest.fn()
            @genericController()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            let routes: RouteMetadata[] = []
            const mock = await expectError(createApp({ controller: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize())
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should not generate entity that is not marked as controller", async () => {
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to change root path", async () => {
            @genericController()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use custom controller", async () => {
            @genericController()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            @generic.template("T", "TID")
            @generic.type("T", "TID")
            class MyCustomControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{ }
            const mock = console.mock()
            await createApp({ controller: User, rootPath: "/api/v1/" })
                .set({ genericController: [MyCustomControllerGeneric, DefaultOneToManyControllerGeneric] })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when using default generic controller", async () => {
            @genericController()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const app = await createApp({ controller: [User] }, { mode: "production" })
                .use(new ErrorHandlerMiddleware())
                .set({ genericController: undefined })
            const mock = await expectError(app.initialize())
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to apply multiple controller on single entities", async () => {
            @genericController()
            @genericController(c => c.setPath("user-data/:id"))
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
    describe("One To Many Controller", () => {
        it("Should generate routes with parameter property entity", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @genericController()
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController()
                    public animals: Animal[]
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to specify relation", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController()
                    public animals: Animal[]
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should generate routes with property field entity", async () => {
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            @genericController()
            class User {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.noop()
                email: string
                @reflect.type([Animal])
                @entity.relation()
                @genericController()
                animals: Animal[]
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to specify ID type by providing decorator", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController()
                    public animals: Animal[]
                ) { }
            }
            let routes: RouteMetadata[] = []
            await createApp({ controller: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize()
            expect(getParameters(routes)).toMatchSnapshot()
        })
        it("Should throw error when no ID specified on entity", async () => {
            @domain()
            class Animal {
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController()
                    public animals: Animal[]
                ) { }
            }
            let routes: RouteMetadata[] = []
            const mock = await expectError(createApp({ controller: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize())
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when no ID specified on parent entity", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController()
                    public animals: Animal[]
                ) { }
            }
            let routes: RouteMetadata[] = []
            const mock = await expectError(createApp({ controller: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize())
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to change root path", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            @genericController()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController()
                    public animals: Animal[]
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use custom controller", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController()
                    public animals: Animal[]
                ) { }
            }
            @generic.template("P", "PID", "T", "TID")
            @generic.type("P", "PID", "T", "TID")
            class MyCustomOneToManyControllerGeneric<P, PID, T, TID> extends RepoBaseOneToManyControllerGeneric<P, PID, T, TID>{ }
            const mock = console.mock()
            await createApp({ controller: User, rootPath: "/api/v1/" })
                .set({ genericController: [DefaultControllerGeneric, MyCustomOneToManyControllerGeneric] })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when no generic controller impl found", async () => {
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                public name: string
            }
            class User {
                @entity.primaryId()
                id: number
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
                @reflect.type([Animal])
                @entity.relation()
                @genericController()
                public animals: Animal[]
            }
            const app = await createApp({ controller: [User] }, { mode: "production" })
                .use(new ErrorHandlerMiddleware())
                .set({ genericController: undefined })
            const mock = await expectError(app.initialize())
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when the relation doesn't have type information", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @genericController()
            @domain()
            class User {
                @entity.primaryId()
                id: number
                @noop()
                name: string
                @noop()
                email: string
                @genericController()
                animals: Animal[]
            }
            const fn = jest.fn()
            try {
                await createApp({ controller: User }).initialize()
            } catch (e) {
                fn(e)
            }
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should able to apply multiple controller into relation property", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController()
                    @genericController(c => c.setPath("user-data/:uid/animal-data/:id"))
                    public animals: Animal[]
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should throw error when applied on non array relation", async () => {
            @domain()
            class Animal {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @genericController()
            @domain()
            class User {
                @entity.primaryId()
                id: number
                @noop()
                name: string
                @noop()
                email: string
                @genericController()
                animal: Animal
            }
            const fn = jest.fn()
            try {
                await createApp({ controller: User }).initialize()
            } catch (e) {
                fn(e)
            }
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })
    describe("Grouping", () => {
        it("Should able to group routes", async () => {
            @domain()
            @genericController()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await new Plumier()
                .set(new WebApiFacility())
                .set(new ControllerFacility({ controller: User, group: "v2", rootPath: "api/v2" }))
                .set(new ControllerFacility({ controller: User, group: "v1", rootPath: "api/v1" }))
                .set({ genericController: [DefaultControllerGeneric, DefaultOneToManyControllerGeneric] })
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })

        it("Should able to group one to many routes", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController()
                    public animals: Animal[]
                ) { }
            }
            const mock = console.mock()
            await new Plumier()
                .set(new WebApiFacility())
                .set(new ControllerFacility({ controller: User, group: "v2", rootPath: "api/v2" }))
                .set(new ControllerFacility({ controller: User, group: "v1", rootPath: "api/v1" }))
                .set({ genericController: [DefaultControllerGeneric, DefaultOneToManyControllerGeneric] })
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
})

describe("Custom Route Path", () => {
    describe("Generic Controller", () => {
        it("Should generate routes with parameter property entity", async () => {
            @genericController("user/:userId")
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should contains correct query parameter", async () => {
            @generic.template("T", "TID")
            @generic.type("T", "TID")
            class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
                constructor(
                ) {
                    super(x => ({} as Repository<T>))
                }
                get() {
                    return {} as any
                }
            }
            @genericController("user/:userId")
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const fn = jest.fn()
            const koa = await createApp({ controller: User }, { mode: "production" })
                .use(x => {
                    fn(x.ctx.query["userid"])
                    return x.proceed()
                })
                .set({ genericController: [MyControllerGeneric, DefaultOneToManyControllerGeneric] })
                .initialize()
            await supertest(koa.callback())
                .get("/user/1234")
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when provided no parameter", async () => {
            @genericController("user")
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when provided more than one parameter", async () => {
            @genericController("user/:userId/data/:dataId")
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when no parameter at the end", async () => {
            @genericController("user/:userId/data")
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })
    describe("Generic One To Many Controller", () => {
        it("Should able to provide custom route path", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController("user/:userId/animal/:animalId")
                    public animals: Animal[]
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should contains correct query parameter", async () => {
            @generic.template("P", "T", "PID", "TID")
            @generic.type("P", "T", "PID", "TID")
            class MyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{
                constructor(
                    @entity.primaryId()
                    public id: number,
                ) { super(fac => ({} as any)) }
                get() {
                    return {} as any
                }
            }
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController("user/:userId/animal/:animalId")
                    public animals: Animal[]
                ) { }
            }
            const fn = jest.fn()
            const koa = await createApp({ controller: User }, { mode: "production" })
                .use(x => {
                    fn(x.ctx.query["userid"])
                    fn(x.ctx.query["animalid"])
                    return x.proceed()
                })
                .set({ genericController: [DefaultControllerGeneric, MyControllerGeneric] })
                .initialize()
            await supertest(koa.callback())
                .get("/user/1234/animal/5678")
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when provided no parameter", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController("user/animal")
                    public animals: Animal[]
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when provided only one parameter", async () => {
            @domain()
            class Animal {
                @entity.primaryId()
                id: number
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController("user/:userId")
                    public animals: Animal[]
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when provided more than two parameters", async () => {
            @domain()
            class Animal {
                @entity.primaryId()
                id: number
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController("user/:userId/animal/:animalId/category/:categoryId")
                    public animals: Animal[]
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when no parameter at the end", async () => {
            @domain()
            class Animal {
                @entity.primaryId()
                id: number
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController("user/:userId/animal/:animalId/category")
                    public animals: Animal[]
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })
})

describe("Open Api", () => {
    describe("Generic Controller", () => {
        it("Should provided proper component", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas.Animal).toMatchSnapshot()
        })
        it("Should generate GET /animal properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animal"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animal properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal"].post.requestBody).toMatchSnapshot()
            expect(body.paths["/animal"].post.tags).toMatchSnapshot()
        })
        it("Should generate GET /animal/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{id}"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{id}"].get.tags).toMatchSnapshot()
        })
        it("Should generate DELETE /animal/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{id}"].delete.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{id}"].delete.tags).toMatchSnapshot()
        })
        it("Should generate PUT /animal/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate PATCH /animal/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should able to provide correct parameter name when using custom path name", async () => {
            @genericController("animals/:aid")
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{aid}"].get.parameters).toMatchSnapshot()
        })
        it("Should able to provide custom parameter with case", async () => {
            @genericController("animals/:aId")
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{aid}"].get.parameters).toMatchSnapshot()
        })
        it("Should able to use custom get many query", async () => {
            @genericController(c => {
                c.getMany().custom([AnimalDTO], async x => ([]))
            })
            class Animal {
                @entity.primaryId()
                id: number
                @noop()
                name: string
            }
            class AnimalDTO {
                @noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal"].get.responses[200]).toMatchSnapshot()
        })
        it("Should able to use custom get one query", async () => {
            @genericController(c => {
                c.getOne().custom(AnimalDTO, async x => ({}))
            })
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
            }
            class AnimalDTO {
                @noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{id}"].get.responses[200]).toMatchSnapshot()
        })
    })

    describe("Generic One To Many Controller", () => {
        it("Should provide proper component", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas.Animal).toMatchSnapshot()
            expect(body.components.schemas.Tag).toMatchSnapshot()
        })
        it("Should generate GET /animals properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animal"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animals properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal"].post.requestBody).toMatchSnapshot()
            expect(body.paths["/animal"].post.tags).toMatchSnapshot()
        })
        it("Should generate GET /animals/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{id}"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{id}"].get.tags).toMatchSnapshot()
        })
        it("Should generate DELETE /animals/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{id}"].delete.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{id}"].delete.tags).toMatchSnapshot()
        })
        it("Should generate PUT /animals/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate PATCH /animals/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate GET /animals/{pid}/tags properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{pid}/tags"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{pid}/tags"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animals/{pid}/tags properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{pid}/tags"].post.requestBody).toMatchSnapshot()
            expect(body.paths["/animal/{pid}/tags"].post.tags).toMatchSnapshot()
        })
        it("Should generate GET /animals/{pid}/tags/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{pid}/tags/{id}"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{pid}/tags/{id}"].get.tags).toMatchSnapshot()
        })
        it("Should generate DELETE /animals/{pid}/tags/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{pid}/tags/{id}"].delete.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{pid}/tags/{id}"].delete.tags).toMatchSnapshot()
        })
        it("Should generate PUT /animals/{pid}/tags/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{pid}/tags/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{pid}/tags/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate PATCH /animals/{pid}/tags/:id properly", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController()
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{pid}/tags/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{pid}/tags/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should able to provide correct parameter name when using custom path name", async () => {
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController("animals/:aid/tags/:tid")
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{aid}/tags/{tid}"].get.parameters).toMatchSnapshot()
        })
        it("Should able to provide custom parameter with case", async () => {
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController("animals/:aId/tags/:tId")
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{aid}/tags/{tid}"].get.parameters).toMatchSnapshot()
        })
        it("Should able to use custom get one query", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController(c => {
                    c.getOne().custom(TagDTO, async x => ({}))
                })
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @reflect.noop()
                tag: string
            }
            class TagDTO {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{pid}/tags/{id}"].get.responses[200]).toMatchSnapshot()
        })
        it("Should able to use custom get many query", async () => {
            @genericController()
            class Animal {
                @entity.primaryId()
                id: number
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @genericController(c => {
                    c.getMany().custom([TagDTO], async x => ([]))
                })
                tags: Tag[]
            }
            class Tag {
                @entity.primaryId()
                id: number
                @noop()
                tag: string
            }
            class TagDTO {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{pid}/tags"].get.responses[200]).toMatchSnapshot()
        })
    })
})

describe("Request Hook", () => {
    const fn = jest.fn()
    @generic.template("T", "TID")
    @generic.type("T", "TID")
    class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
        @route.post()
        async bulk(@type(["T"]) data: T[]) {
            for (const iterator of data) {
                await this.repo.insert(iterator)
            }
        }

        constructor() { super(fac => new MockRepo<T>(fn)) }
    }
    @generic.template("P", "T", "PID", "TID")
    @generic.type("P", "T", "PID", "TID")
    class MyOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{
        constructor() { super(fac => new MockOneToManyRepo<P, T>(fn)) }
    }
    function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
        return new Plumier()
            .set({ mode: "production", ...config })
            .set(new WebApiFacility())
            .set(new ControllerFacility(opt))
            .use(new RequestHookMiddleware(), "Action")
            .set({ genericController: [MyControllerGeneric, MyOneToManyControllerGeneric] })
    }
    beforeEach(() => fn.mockClear())
    it("Should able to hook request in generic controller", async () => {
        @genericController()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string
            ) { }

            @preSave()
            hook() {
                this.password = "HASH"
            }
        }
        const app = await createApp({ controller: User }).initialize()
        await supertest(app.callback())
            .post("/user")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should call request hook in proper order", async () => {
        @genericController()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string
            ) { }

            @preSave()
            preSave() {
                fn("PRE SAVE")
            }

            @postSave()
            postSave() {
                fn("POST SAVE")
            }
        }
        const app = await createApp({ controller: User }).initialize()
        await supertest(app.callback())
            .post("/user")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should able to hook request in one to many generic controller", async () => {
        @domain()
        class Parent {
            constructor(
                @entity.primaryId()
                public id: number,
                @genericController()
                @type(x => [User])
                public users: User[]
            ) { }
        }
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string,
            ) { }

            @preSave()
            hook() {
                this.password = "HASH"
            }
        }
        const app = await createApp({ controller: [Parent] }).initialize()
        await supertest(app.callback())
            .post("/parent/123/users")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should able to hook request in specific http method", async () => {
        @genericController()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string
            ) { }

            @preSave("patch")
            hook() {
                this.password = "HASH"
            }
        }
        const app = await createApp({ controller: User }).initialize()
        await supertest(app.callback())
            .patch("/user/123")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        await supertest(app.callback())
            .post("/user")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should able to hook request in multiple http methods", async () => {
        @genericController()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string
            ) { }

            @preSave("patch", "post")
            hook() {
                this.password = "HASH"
            }
        }
        const app = await createApp({ controller: User }).initialize()
        await supertest(app.callback())
            .patch("/user/123")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        await supertest(app.callback())
            .post("/user")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        await supertest(app.callback())
            .put("/user/123")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should able to use multiple hook request", async () => {
        @genericController()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string
            ) { }

            @preSave()
            hook() {
                this.password = "HASH"
            }

            @preSave()
            otherHook() {
                this.email = "hacked@gmail.com"
            }
        }
        const app = await createApp({ controller: User }).initialize()
        await supertest(app.callback())
            .post("/user")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should able to bind query by name", async () => {
        @domain()
        class Parent {
            constructor(
                @entity.primaryId()
                public id: number,
                @genericController()
                @type(x => [User])
                public users: User[]
            ) { }
        }
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string,
            ) { }

            @preSave()
            hook(pid: string) {
                this.password = pid
            }
        }
        const app = await createApp({ controller: [Parent] }).initialize()
        await supertest(app.callback())
            .post("/parent/123/users")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should able to bind by decorator", async () => {
        @domain()
        class Parent {
            constructor(
                @entity.primaryId()
                public id: number,
                @genericController()
                @type(x => [User])
                public users: User[]
            ) { }
        }
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string,
            ) { }

            @preSave()
            hook(@bind.ctx() ctx: Context) {
                fn(ctx.request.header["content-type"])
            }
        }
        const app = await createApp({ controller: [Parent] }).initialize()
        await supertest(app.callback())
            .post("/parent/123/users")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should able to get the ID of the entity on postSave", async () => {
        @domain()
        class Parent {
            constructor(
                @entity.primaryId()
                public id: number,
                @genericController()
                @type(x => [User])
                public users: User[]
            ) { }
        }
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string,
            ) { }

            @postSave()
            hook() {
                fn(this.id)
            }
        }
        const app = await createApp({ controller: [Parent] }).initialize()
        const { body } = await supertest(app.callback())
            .post("/parent/123/users")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        console.log(fn.mock.calls)
        expect(body.id === fn.mock.calls[1][0]).toBe(true)
    })
    it("Should not executed on GET method with model parameter", async () => {
        const myFn = jest.fn()
        @genericController()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string
            ) { }

            @preSave()
            hook() {
                myFn("CALLED")
            }
        }
        const app = await createApp({ controller: User }).initialize()
        await supertest(app.callback())
            .get("/user")
            .expect(200)
        expect(myFn.mock.calls).toMatchSnapshot()
    })
    it("Should not error when not provide postSaveValue", async () => {
        const fn = jest.fn()
        @generic.template("T", "TID")
        @generic.type("T", "TID")
        class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
            constructor() { super(fac => new MockRepo<T>(fn)) }
            async save(data: T, ctx: Context): Promise<IdentifierResult<TID>> {
                return { id: 123 as any }
            }
        }
        function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
            return new Plumier()
                .set({ mode: "production", ...config })
                .set(new WebApiFacility())
                .set(new ControllerFacility(opt))
                .use(new RequestHookMiddleware(), "Action")
                .set({ genericController: [MyControllerGeneric, MyOneToManyControllerGeneric] })
        }
        @genericController()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string
            ) { }

            @postSave()
            hook() {
                fn(this)
            }
        }
        const app = await createApp({ controller: User }).initialize()
        await supertest(app.callback())
            .post("/user")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should not error when using custom controller with no body", async () => {
        const fn = jest.fn()
        @generic.template("T", "TID")
        @generic.type("T", "TID")
        class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
            constructor() { super(fac => new MockRepo<T>(fn)) }
            @route.post()
            async simpan(): Promise<IdentifierResult<TID>> {
                return { id: 123 as any }
            }
        }
        function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
            return new Plumier()
                .set({ mode: "production", ...config })
                .set(new WebApiFacility())
                .set(new ControllerFacility(opt))
                .use(new RequestHookMiddleware(), "Action")
                .set({ genericController: [MyControllerGeneric, MyOneToManyControllerGeneric] })
        }
        @genericController()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string
            ) { }

            @postSave()
            hook() {
                fn(this)
            }
        }
        const app = await createApp({ controller: User }).initialize()
        await supertest(app.callback())
            .post("/user/simpan")
            .expect(200)
    })
    it("Should able to hook on array type parameter", async () => {
        const fn = jest.fn()
        @genericController()
        @domain()
        class User {
            constructor(
                @entity.primaryId()
                public id: number,
                public name: string,
                public email: string,
                public password: string
            ) { }

            @preSave()
            pre() {
                fn(this)
            }

            @postSave()
            post() {
                fn(this)
            }
        }
        const app = await createApp({ controller: User }).initialize()
        await supertest(app.callback())
            .post("/user/bulk")
            .send([
                { name: "John Doe 1", email: "john.doe@gmail.com", password: "lorem ipsum" },
                { name: "John Doe 2", email: "john.doe@gmail.com", password: "lorem ipsum" },
                { name: "John Doe 3", email: "john.doe@gmail.com", password: "lorem ipsum" },
            ])
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
})

describe("Controller Builder", () => {
    describe("Ignore Route", () => {
        it("Should able to ignore specific routes properly", async () => {
            @genericController(c => {
                c.post().ignore()
                c.patch().ignore()
            })
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore specific routes using action notations", async () => {
            @genericController(c => c.methods("Post", "Patch").ignore())
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore specific routes on one to many generic controller", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController(c => {
                        c.post().ignore()
                    })
                    public animals: Animal[]
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: [User] }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore all routes", async () => {
            @genericController(c => {
                c.patch().ignore()
                c.put().ignore()
                c.post().ignore()
                c.delete().ignore()
                c.getMany().ignore()
                c.getOne().ignore()
            })
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore all routes using action notations", async () => {
            @genericController(c => c.methods("Delete", "GetMany", "GetOne", "Patch", "Post", "Put").ignore())
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore all routes using all key", async () => {
            @genericController(c => c.all().ignore())
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore mutator routes", async () => {
            @genericController(c => c.mutators().ignore())
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore accessor routes", async () => {
            @genericController(c => c.accessors().ignore())
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore routes by specify its name", async () => {
            @genericController(c => {
                c.actionNames("save", "list").ignore()
            })
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
    describe("Authorization", () => {
        function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
            const admin = authPolicy().define("Admin", x => x.user?.role === "Admin")
            const superAdmin = authPolicy().define("SuperAdmin", x => x.user?.role === "SuperAdmin")
            const authPolicies = [admin, superAdmin]
            return new Plumier()
                .set({ ...config })
                .set(new WebApiFacility())
                .set(new ControllerFacility(opt))
                .set(new JwtAuthFacility({ secret: "lorem", authPolicies }))
                .set({ genericController: [DefaultControllerGeneric, DefaultOneToManyControllerGeneric] })
        }
        it("Should able to authorize specific routes", async () => {
            @genericController(c => c.mutators().authorize("Admin"))
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize specific routes with multiple roles", async () => {
            @genericController(c => c.mutators().authorize("Admin", "SuperAdmin"))
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize specific routes on one to many generic controller", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController(c => c.mutators().authorize("Admin"))
                    public animals: Animal[]
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: [User] }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize all routes", async () => {
            @genericController(c => {
                c.patch().authorize("Admin")
                c.put().authorize("Admin")
                c.post().authorize("Admin")
                c.delete().authorize("Admin")
                c.getMany().authorize("Admin")
                c.getOne().authorize("Admin")
            })
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize all routes using all key", async () => {
            @genericController(c => c.all().authorize("Admin"))
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize mutator routes", async () => {
            @genericController(c => c.mutators().authorize("Admin"))
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize accessor routes", async () => {
            @genericController(c => c.accessors().authorize("Admin"))
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to combine between accessor and mutator", async () => {
            @genericController(c => {
                c.mutators().authorize("Admin")
                c.accessors().authorize(Authenticated)
            })
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize routes by specify its name", async () => {
            @genericController(c => {
                c.actionNames("save", "get").authorize("Admin")
            })
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
    describe("Set Path", () => {
        it("Should able to set path", async () => {
            @genericController(c => c.setPath("users/:uid"))
            @domain()
            class User {
                constructor(
                    @entity.primaryId()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to set path on one to many generic controller", async () => {
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
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @genericController(c => c.setPath("users/:uid/animals/:aid"))
                    public animals: Animal[]
                ) { }
            }
            const mock = console.mock()
            await createApp({ controller: [User] }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
})

describe("Entity Policy", () => {
    const fn = jest.fn()
    @genericController(c => {
        c.getOne().authorize("Owner")
        c.put().authorize("Owner")
        c.patch().authorize("Owner")
        c.delete().authorize("Owner")
    })
    class User {
        @entity.primaryId()
        id: number
        @noop()
        name: string
        @authorize.read("Owner")
        email: string
        @genericController(c => c.all().authorize("Owner"))
        @entity.relation()
        @type(x => [Todo])
        todos: Todo[]
    }
    class Todo {
        @entity.primaryId()
        id: number
        @noop()
        title: string
        @entity.relation()
        user: User
    }
    const users: User[] = [
        { id: 1, name: "John", email: "john.doe@gmail.com", todos: [] },
        { id: 2, name: "Jane", email: "jane.doe@gmail.com", todos: [] },
        { id: 3, name: "Joe", email: "joe.doe@gmail.com", todos: [] }
    ]
    const todos: Todo[] = [
        { id: 1, title: "John's todo", user: users[0] },
        { id: 2, title: "John's todo 2", user: users[0] },
        { id: 3, title: "Jane's todo", user: users[1] },
        { id: 4, title: "Jane's todo 2", user: users[1] }
    ]
    class UserRepo extends MockRepo<User>{
        constructor(fn: jest.Mock) { super(fn) }
        async find(offset: number, limit: number, query: any): Promise<User[]> {
            return users
        }
        async findById(id: any) {
            return users.find(x => x.id === id)
        }
    }
    class TodoRepo extends MockOneToManyRepo<User, Todo>{
        constructor(fn: jest.Mock) { super(fn) }
        async find(pid: number, offset: number, limit: number, query: any): Promise<Todo[]> {
            return todos.filter(x => x.user.id === pid)
        }
        async findById(id: any) {
            return todos.find(x => x.id === id)!
        }
    }
    @generic.template("T", "TID")
    @generic.type("T", "TID")
    class MyControllerGeneric extends RepoBaseControllerGeneric<User, number>{
        constructor() { super(x => new UserRepo(fn)) }
    }
    @generic.template("P", "T", "PID", "TID")
    @generic.type("P", "T", "PID", "TID")
    class MyOneToManyControllerGeneric extends RepoBaseOneToManyControllerGeneric<User, Todo, number, number>{
        constructor() { super(x => new TodoRepo(fn)) }
    }
    const UserPolicy = entityPolicy(User).define("Owner", (ctx, e) => ctx.user?.userId === e)
    const TodoPolicy = entityPolicy(Todo).define("Owner", (ctx, e) => todos.some(x => x.id === e && ctx.user?.userId === x.user.id))
    function createApp() {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new ControllerFacility({ controller: User }))
            .set(new JwtAuthFacility({ secret: "lorem", authPolicies: [UserPolicy, TodoPolicy] }))
            .set({ genericController: [MyControllerGeneric, MyOneToManyControllerGeneric] })
            .initialize()
    }
    const JOHN_TOKEN = sign({ userId: 1 }, "lorem")
    const JANE_TOKEN = sign({ userId: 2 }, "lorem")
    describe("Generic Controller", () => {
        it("Should protect data properly", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/user")
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should protect get by ID", async () => {
            const app = await createApp()
            await supertest(app.callback())
                .get("/user/1")
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .get("/user/1")
                .set("Authorization", `Bearer ${JANE_TOKEN}`)
                .expect(401)
        })
        it("Should protect put by ID", async () => {
            const app = await createApp()
            await supertest(app.callback())
                .put("/user/1")
                .send({ name: "Lorem" })
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .put("/user/1")
                .send({ name: "Lorem" })
                .set("Authorization", `Bearer ${JANE_TOKEN}`)
                .expect(401)
        })
        it("Should protect patch by ID", async () => {
            const app = await createApp()
            await supertest(app.callback())
                .patch("/user/1")
                .send({ name: "Lorem" })
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .patch("/user/1")
                .send({ name: "Lorem" })
                .set("Authorization", `Bearer ${JANE_TOKEN}`)
                .expect(401)
        })
        it("Should protect delete by ID", async () => {
            const app = await createApp()
            await supertest(app.callback())
                .delete("/user/1")
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .delete("/user/1")
                .set("Authorization", `Bearer ${JANE_TOKEN}`)
                .expect(401)
        })
    })
    describe("One To Many Controller", () => {
        it("Should protect get all", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/user/1/todos")
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .get("/user/2/todos")
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(401)
            expect(body).toMatchSnapshot()
        })
        it("Should protect post", async () => {
            const app = await createApp()
            await supertest(app.callback())
                .post("/user/1/todos")
                .send({ title: "Lorem" })
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .post("/user/2/todos")
                .send({ title: "Lorem" })
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(401)
        })
        it("Should protect get by id", async () => {
            const app = await createApp()
            await supertest(app.callback())
                .patch("/user/1/todos/1")
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .patch("/user/2/todos/3")
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(401)
        })
        it("Should protect put", async () => {
            const app = await createApp()
            await supertest(app.callback())
                .put("/user/1/todos/1")
                .send({ title: "Lorem" })
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .put("/user/2/todos/3")
                .send({ title: "Lorem" })
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(401)
        })
        it("Should protect patch", async () => {
            const app = await createApp()
            await supertest(app.callback())
                .patch("/user/1/todos/1")
                .send({ title: "Lorem" })
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .patch("/user/2/todos/3")
                .send({ title: "Lorem" })
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(401)
        })
        it("Should protect delete", async () => {
            const app = await createApp()
            await supertest(app.callback())
                .patch("/user/1/todos/1")
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(200)
            await supertest(app.callback())
                .patch("/user/2/todos/3")
                .set("Authorization", `Bearer ${JOHN_TOKEN}`)
                .expect(401)
        })
    })
})

describe("Response Transformer", () => {
    const fn = jest.fn()
    class UserTrans {
        @noop()
        fullName: string
        @entity.relation()
        @type(x => [Todo])
        todos: Todo[]
    }
    @genericController(c => c.accessors().transformer(UserTrans, x => ({ fullName: x.name })))
    class User {
        @entity.primaryId()
        id: number
        @noop()
        name: string
        @authorize.read("Owner")
        email: string
        @genericController(c => c.accessors().transformer(TodoTrans, x => ({ theTitle: x.title })))
        @entity.relation()
        @type(x => [Todo])
        todos: Todo[]
    }
    class TodoTrans {
        @noop()
        theTitle: string
    }
    class Todo {
        @entity.primaryId()
        id: number
        @noop()
        title: string
        @entity.relation()
        user: User
    }
    const users: User[] = [
        { id: 1, name: "John", email: "john.doe@gmail.com", todos: [] },
        { id: 2, name: "Jane", email: "jane.doe@gmail.com", todos: [] },
        { id: 3, name: "Joe", email: "joe.doe@gmail.com", todos: [] }
    ]
    const todos: Todo[] = [
        { id: 1, title: "John's todo", user: users[0] },
        { id: 2, title: "John's todo 2", user: users[0] },
        { id: 3, title: "Jane's todo", user: users[1] },
        { id: 4, title: "Jane's todo 2", user: users[1] }
    ]
    class UserRepo extends MockRepo<User>{
        constructor(fn: jest.Mock) { super(fn) }
        async find(offset: number, limit: number, query: any): Promise<User[]> {
            return users
        }
        async findById(id: any) {
            return users.find(x => x.id === id)
        }
    }
    class TodoRepo extends MockOneToManyRepo<User, Todo>{
        constructor(fn: jest.Mock) { super(fn) }
        async find(pid: number, offset: number, limit: number, query: any): Promise<Todo[]> {
            return todos.filter(x => x.user.id === pid)
        }
        async findById(id: any) {
            return todos.find(x => x.id === id)!
        }
    }
    @generic.template("T", "TID")
    @generic.type("T", "TID")
    class MyControllerGeneric extends RepoBaseControllerGeneric<User, number>{
        constructor() { super(x => new UserRepo(fn)) }
    }
    @generic.template("P", "T", "PID", "TID")
    @generic.type("P", "T", "PID", "TID")
    class MyOneToManyControllerGeneric extends RepoBaseOneToManyControllerGeneric<User, Todo, number, number>{
        constructor() { super(x => new TodoRepo(fn)) }
    }
    function createApp() {
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility())
            .set(new ControllerFacility({ controller: [User, Todo] }))
            .set(new SwaggerFacility())
            .set({ genericController: [MyControllerGeneric, MyOneToManyControllerGeneric] })
            .initialize()
    }
    describe("Generic Controller", () => {
        it("Should able to transform get one action", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/user/1")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should provide proper Open API schema on get one action", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/user/{id}"].get.responses).toMatchSnapshot()
        })
        it("Should able to transform get many action", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/user")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should provide proper Open API schema on get many action", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/user"].get.responses).toMatchSnapshot()
        })
    })
    describe("Generic On To Many Controller", () => {
        it("Should able to transform get one action", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/user/1/todos/1")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should provide proper Open API schema on get one action", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/user/{pid}/todos/{id}"].get.responses).toMatchSnapshot()
        })
        it("Should able to transform get many action", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/user/1/todos")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should provide proper Open API schema on get many action", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/user/{pid}/todos"].get.responses).toMatchSnapshot()
        })
    })
})