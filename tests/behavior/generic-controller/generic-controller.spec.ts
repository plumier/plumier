import {
    ActionResult,
    api,
    authorize,
    bind,
    cleanupConsole,
    Configuration,
    consoleLog,
    DefaultControllerGeneric,
    DefaultFacility,
    DefaultOneToManyControllerGeneric,
    DefaultOneToManyRepository,
    DefaultRepository,
    FilterEntity,
    IdentifierResult,
    Invocation,
    Middleware,
    OneToManyRepository,
    PlumierApplication,
    postSave,
    preSave,
    entity,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
    Repository,
    RequestHookMiddleware,
    response,
    route,
    RouteMetadata,
    ControllerBuilder,
    Authenticated,
} from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import { SwaggerFacility } from "@plumier/swagger"
import { Context } from "koa"
import { join } from "path"
import Plumier, { ControllerFacility, ControllerFacilityOption, domain, WebApiFacility } from "plumier"
import supertest from "supertest"
import reflect, { generic, noop, type } from "tinspector"

import { expectError } from "../helper"


function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
    return new Plumier()
        .set({ ...config })
        .set(new WebApiFacility())
        .set(new ControllerFacility(opt))
}

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

class MockRepo<T> implements Repository<T>{
    constructor(private fn: jest.Mock) { }
    async find(offset: number, limit: number, query: FilterEntity<T>): Promise<T[]> {
        this.fn(offset, limit, query)
        return []
    }
    async insert(data: Partial<T>): Promise<{ id: any }> {
        this.fn(data)
        return { id: 123 }
    }
    async findById(id: any): Promise<T | undefined> {
        this.fn(id)
        return {} as any
    }
    async update(id: any, data: Partial<T>): Promise<{ id: any }> {
        this.fn(id, data)
        return { id }
    }
    async delete(id: any): Promise<{ id: any }> {
        this.fn(id)
        return { id }
    }
}

class MockOneToManyRepo<P, T> implements OneToManyRepository<P, T>{
    constructor(private fn: jest.Mock) { }
    async find(pid: any, offset: number, limit: number, query: FilterEntity<T>): Promise<T[]> {
        this.fn(pid, offset, limit, query)
        return []
    }
    async findParentById(id: any): Promise<P | undefined> {
        return {} as any
    }
    async insert(pid: any, data: Partial<T>): Promise<{ id: any }> {
        this.fn(data)
        return { id: 123 }
    }
    async findById(id: any): Promise<T | undefined> {
        this.fn(id)
        return {} as any
    }
    async update(id: any, data: Partial<T>): Promise<{ id: any }> {
        this.fn(id, data)
        return { id }
    }
    async delete(id: any): Promise<{ id: any }> {
        this.fn(id)
        return { id }
    }
}

function getParameters(routes: RouteMetadata[]) {
    return routes.map(x => {
        if (x.kind === "ActionRoute") {
            return { name: x.action.name, pars: x.action.parameters.map(y => ({ name: y.name, type: y.type })) }
        }
    })
}

describe("Route Generator", () => {
    it("Should able to specify entity directory", async () => {
        const mock = consoleLog.startMock()
        await createApp({ controller: join(__dirname, "entities") }).initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
    })
    it("Should able to specify entity directory with relative path", async () => {
        const mock = consoleLog.startMock()
        await createApp({ controller: "./entities" }).initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
    })
    it("Should able to specify nested directories", async () => {
        const mock = consoleLog.startMock()
        await createApp({ controller: "./nested" }).initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
    })
    it("Should initiate IdentifierResult properly", () => {
        expect(new IdentifierResult<number>(20)).toMatchSnapshot()
    })
    describe("Generic Controller", () => {
        it("Should generate routes with parameter property entity", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should generate routes with property field entity", async () => {
            @route.controller()
            class User {
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to specify ID type by providing decorator", async () => {
            @route.controller()
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
            @route.controller()
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
        it("Should use string as default id if no ID type specified", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
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
        it("Should not generate entity that is not marked as controller", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to change root path", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use custom controller", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            @generic.template("T", "TID")
            @generic.type("T", "TID")
            class MyCustomControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{ }
            const mock = consoleLog.startMock()
            await createApp({ controller: User, rootPath: "/api/v1/" })
                .set({ genericController: [MyCustomControllerGeneric, DefaultOneToManyControllerGeneric] })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to ignore some method of controller from entity", async () => {
            @route.controller()
            @domain()
            @route.ignore({ applyTo: ["get", "save"] })
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to set authorization from entity", async () => {
            @route.controller()
            @domain()
            @authorize.route("admin")
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: [User] })
                .set(new JwtAuthFacility({ secret: "secret" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to set authorization for specific method from entity", async () => {
            @route.controller()
            @domain()
            @authorize.route("admin", { applyTo: ["save", "replace", "delete", "modify"] })
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User })
                .set(new JwtAuthFacility({ secret: "secret" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to set public authorizer from entity", async () => {
            @route.controller()
            @domain()
            @authorize.public()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: [User] })
                .set(new JwtAuthFacility({ secret: "secret" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to set custom authorizer from entity", async () => {
            @route.controller()
            @domain()
            @authorize.custom(x => (x.user && x.user.role) === "Admin", { access: "route" })
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: [User] })
                .set(new JwtAuthFacility({ secret: "secret" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should throw error when using default generic controller", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const koa = await createApp({ controller: [User] }, { mode: "production" })
                .use(new ErrorHandlerMiddleware())
                .initialize()
            const error = { error: "PLUM1009: Generic controller implementation not installed" }
            const request = supertest(koa.callback())
            await request.post("/user").expect(500, error)
            await request.get("/user").expect(500, error)
            await request.put("/user/123").expect(500, error)
            await request.patch("/user/123").expect(500, error)
            await request.delete("/user/123").expect(500, error)
            await request.get("/user/123").expect(500, error)
        })
        it("Should throw error properly", () => {
            const fn = jest.fn()
            const error = async (f: () => Promise<any>) => {
                try {
                    await f()
                }
                catch (e) {
                    fn(e.message)
                }
            }
            const ctl = new DefaultRepository()
            error(async () => ctl.delete(123))
            error(async () => ctl.findById(123))
            error(async () => ctl.find(1, 2, []))
            error(async () => ctl.update(123, {}))
            error(async () => ctl.insert({}))
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })
    describe("One To Many Controller", () => {
        it("Should generate routes with parameter property entity", async () => {
            @domain()
            class Animal {
                constructor(
                    public name: string
                ) { }
            }
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @route.controller()
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to specify relation", async () => {
            @domain()
            class Animal {
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @route.controller()
                    @reflect.type([Animal])
                    @entity.relation()
                    @route.controller()
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should generate routes with property field entity", async () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            @route.controller()
            class User {
                @reflect.noop()
                name: string
                @reflect.noop()
                email: string
                @reflect.type([Animal])
                @entity.relation()
                @route.controller()
                animals: Animal[]
            }
            const mock = consoleLog.startMock()
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
                    @route.controller()
                    public animals: Animal[]
                ) { }
            }
            let routes: RouteMetadata[] = []
            await createApp({ controller: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize()
            expect(getParameters(routes)).toMatchSnapshot()
        })
        it("Should use string as default id if no ID type specified", async () => {
            @domain()
            class Animal {
                constructor(
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
                    @route.controller()
                    public animals: Animal[]
                ) { }
            }
            let routes: RouteMetadata[] = []
            await createApp({ controller: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize()
            expect(getParameters(routes)).toMatchSnapshot()
        })
        it("Should able to change root path", async () => {
            @domain()
            class Animal {
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            @route.controller()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @entity.relation()
                    @route.controller()
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use custom controller", async () => {
            @domain()
            class Animal {
                constructor(
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
                    @route.controller()
                    public animals: Animal[]
                ) { }
            }
            @generic.template("P", "PID", "T", "TID")
            @generic.type("P", "PID", "T", "TID")
            class MyCustomOneToManyControllerGeneric<P, PID, T, TID> extends RepoBaseOneToManyControllerGeneric<P, PID, T, TID>{ }
            const mock = consoleLog.startMock()
            await createApp({ controller: User, rootPath: "/api/v1/" })
                .set({ genericController: [DefaultControllerGeneric, MyCustomOneToManyControllerGeneric] })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to ignore some method of controller from entity", async () => {
            @domain()
            class Animal {
                constructor(
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
                    @route.controller()
                    @route.ignore({ applyTo: ["save", "list"] })
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize relation on relation", async () => {
            class Animal {
                @reflect.noop()
                public name: string
            }
            class User {
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
                @authorize.route("admin")
                @reflect.type([Animal])
                @entity.relation()
                @route.controller()
                public animals: Animal[]
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User })
                .set(new JwtAuthFacility({ secret: "secret" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize some method on relation", async () => {
            class Animal {
                @reflect.noop()
                public name: string
            }
            class User {
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
                @authorize.route("admin", { applyTo: ["save", "replace", "delete", "modify"] })
                @reflect.type([Animal])
                @entity.relation()
                @route.controller()
                public animals: Animal[]
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User })
                .set(new JwtAuthFacility({ secret: "secret" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should throw error when no generic controller impl found", async () => {
            class Animal {
                @reflect.noop()
                public name: string
            }
            class User {
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
                @reflect.type([Animal])
                @entity.relation()
                @route.controller()
                public animals: Animal[]
            }
            const koa = await createApp({ controller: User }, { mode: "production" })
                .use(new ErrorHandlerMiddleware())
                .initialize()
            const error = { error: "PLUM1009: Generic controller implementation not installed" }
            const request = supertest(koa.callback())
            await request.post("/user/123/animals").expect(500, error)
            await request.get("/user/123/animals").expect(500, error)
            await request.put("/user/123/animals/123").expect(500, error)
            await request.patch("/user/123/animals/123").expect(500, error)
            await request.delete("/user/123/animals/123").expect(500, error)
            await request.get("/user/123/animals/123").expect(500, error)
        })
        it("Should throw error properly", () => {
            const fn = jest.fn()
            const error = async (f: () => Promise<any>) => {
                try {
                    await f()
                }
                catch (e) {
                    fn(e.message)
                }
            }
            const ctl = new DefaultOneToManyRepository()
            error(async () => ctl.delete(123))
            error(async () => ctl.findById(123))
            error(async () => ctl.find(1, 1, 2, []))
            error(async () => ctl.update(123, {}))
            error(async () => ctl.insert(1, {}))
            error(async () => ctl.findParentById(1))
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when the relation doesn't have type information", async () => {
            @domain()
            class Animal {
                constructor(
                    public name: string
                ) { }
            }
            @route.controller()
            @domain()
            class User {
                @noop()
                name: string
                @noop()
                email: string
                @route.controller()
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
    })
    describe("Grouping", () => {
        it("Should able to group routes", async () => {
            @domain()
            @route.controller()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await new Plumier()
                .set(new WebApiFacility())
                .set(new ControllerFacility({ controller: User, group: "v2", rootPath: "api/v2" }))
                .set(new ControllerFacility({ controller: User, group: "v1", rootPath: "api/v1" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })

        it("Should able to group one to many routes", async () => {
            @domain()
            class Animal {
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @route.controller()
                    @reflect.type([Animal])
                    @entity.relation()
                    @route.controller()
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await new Plumier()
                .set(new WebApiFacility())
                .set(new ControllerFacility({ controller: User, group: "v2", rootPath: "api/v2" }))
                .set(new ControllerFacility({ controller: User, group: "v1", rootPath: "api/v1" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
})

describe("Custom Route Path", () => {
    describe("Generic Controller", () => {
        it("Should generate routes with parameter property entity", async () => {
            @route.controller("user/:userId")
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should contains correct query parameter", async () => {
            @generic.template("T", "TID")
            @generic.type("T", "TID")
            class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
                constructor() {
                    super(x => ({} as Repository<T>))
                }
                get() {
                    return {} as any
                }
            }
            @route.controller("user/:userId")
            @domain()
            class User {
                constructor(
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
            @route.controller("user")
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when provided more than one parameter", async () => {
            @route.controller("user/:userId/data/:dataId")
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when no parameter at the end", async () => {
            @route.controller("user/:userId/data")
            @domain()
            class User {
                constructor(
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
                    @route.controller("user/:userId/animal/:animalId")
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should contains correct query parameter", async () => {
            @generic.template("P", "T", "PID", "TID")
            @generic.type("P", "T", "PID", "TID")
            class MyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{
                constructor() { super(fac => ({} as any)) }
                get() {
                    return {} as any
                }
            }
            @domain()
            class Animal {
                constructor(
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
                    @route.controller("user/:userId/animal/:animalId")
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
                    @route.controller("user/animal")
                    public animals: Animal[]
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when provided only one parameter", async () => {
            @domain()
            class Animal {
                constructor(
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
                    @route.controller("user/:userId")
                    public animals: Animal[]
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when provided more than two parameters", async () => {
            @domain()
            class Animal {
                constructor(
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
                    @route.controller("user/:userId/animal/:animalId/category/:categoryId")
                    public animals: Animal[]
                ) { }
            }
            const fn = await expectError(createApp({ controller: User }).initialize())
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should throw error when no parameter at the end", async () => {
            @domain()
            class Animal {
                constructor(
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
                    @route.controller("user/:userId/animal/:animalId/category")
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
            @route.controller()
            class Animal {
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
            @route.controller()
            class Animal {
                @authorize.filter()
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
            @route.controller()
            class Animal {
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
            @route.controller()
            class Animal {
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
            @route.controller()
            class Animal {
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
            @route.controller()
            class Animal {
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
            @route.controller()
            class Animal {
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
        it("Should able to add @api.tag() from entity", async () => {
            @route.controller()
            @api.tag("Animals")
            class Animal {
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal"].get.tags).toMatchSnapshot()
        })
        it("Should able to provide correct parameter name when using custom path name", async () => {
            @route.controller("animals/:aid")
            class Animal {
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
            @route.controller("animals/:aId")
            class Animal {
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
    })

    describe("Generic One To Many Controller", () => {
        it("Should provide proper component", async () => {
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @authorize.filter()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
                @authorize.filter()
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                tags: Tag[]
            }
            class Tag {
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
        it("Should able to add @api.tags() from property", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller()
                @api.tag("Tags")
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ controller: Animal }, { mode: "production" })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animal/{pid}/tags"].get.tags).toMatchSnapshot()
        })
        it("Should able to provide correct parameter name when using custom path name", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller("animals/:aid/tags/:tid")
                tags: Tag[]
            }
            class Tag {
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
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @entity.relation()
                @route.controller("animals/:aId/tags/:tId")
                tags: Tag[]
            }
            class Tag {
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
    })
})

describe("Request Hook", () => {
    const fn = jest.fn()
    @generic.template("T", "TID")
    @generic.type("T", "TID")
    class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
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
        @route.controller()
        @domain()
        class User {
            constructor(
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
        @route.controller()
        @domain()
        class User {
            constructor(
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
                @route.controller()
                @type(x => [User])
                public users: User[]
            ) { }
        }
        @domain()
        class User {
            constructor(
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
        @route.controller()
        @domain()
        class User {
            constructor(
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
        @route.controller()
        @domain()
        class User {
            constructor(
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
        @route.controller()
        @domain()
        class User {
            constructor(
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
                @route.controller()
                @type(x => [User])
                public users: User[]
            ) { }
        }
        @domain()
        class User {
            constructor(
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
                @route.controller()
                @type(x => [User])
                public users: User[]
            ) { }
        }
        @domain()
        class User {
            constructor(
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
    it("Should able to bind ActionResult on postSave", async () => {
        @domain()
        class Parent {
            constructor(
                @route.controller()
                @type(x => [User])
                public users: User[]
            ) { }
        }
        @domain()
        class User {
            constructor(
                public name: string,
                public email: string,
                public password: string,
            ) { }

            @postSave()
            hook(@bind.actionResult() result: ActionResult) {
                fn(result)
            }
        }
        const app = await createApp({ controller: [Parent] }).initialize()
        await supertest(app.callback())
            .post("/parent/123/users")
            .send({ name: "John Doe", email: "john.doe@gmail.com", password: "lorem ipsum" })
            .expect(200)
        expect(fn.mock.calls).toMatchSnapshot()
    })
    it("Should not executed on GET method with model parameter", async () => {
        const myFn = jest.fn()
        @route.controller()
        @domain()
        class User {
            constructor(
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
})

describe("Controller Builder", () => {
    describe("Enable Disable Routes", () => {
        it("Should enable specific routes properly", async () => {
            @route.controller(c => c.actions(["Post", "Put", "Patch", "Delete"]))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should enable specific routes on one to many generic controller", async () => {
            @domain()
            class Animal {
                constructor(
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
                    @route.controller(c => c.actions(["Post", "Put", "Patch", "Delete"]))
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: [User] }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to enable all routes", async () => {
            @route.controller(c => c.actions(["Post", "Put", "Patch", "Delete", "GetMany", "GetOne"]))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to enable all routes using all key", async () => {
            @route.controller(c => c.actions("All"))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to enable mutator routes", async () => {
            @route.controller(c => c.actions("Mutator"))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to enable accessor routes", async () => {
            @route.controller(c => c.actions("Accessor"))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
    describe("Authorization", () => {
        function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
            return new Plumier()
                .set({ ...config })
                .set(new WebApiFacility())
                .set(new ControllerFacility(opt))
                .set(new JwtAuthFacility({ secret: "lorem" }))
        }
        it("Should able to authorize specific routes", async () => {
            @route.controller(c => c.actions(["Post", "Put", "Patch", "Delete"], x => x.authorize("Admin")))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize specific routes with multiple roles", async () => {
            @route.controller(c => c.actions(["Post", "Put", "Patch", "Delete"], x => x.authorize("Admin", "SuperAdmin")))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize specific routes on one to many generic controller", async () => {
            @domain()
            class Animal {
                constructor(
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
                    @route.controller(c => c.actions(["Post", "Put", "Patch", "Delete"], x => x.authorize("Admin")))
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: [User] }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize all routes", async () => {
            @route.controller(c => c.actions(["Post", "Put", "Patch", "Delete", "GetMany", "GetOne"], x => x.authorize("Admin")))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize all routes using all key", async () => {
            @route.controller(c => c.actions("All", x => x.authorize("Admin")))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize mutator routes", async () => {
            @route.controller(c => c.actions("Mutator", x => x.authorize("Admin")))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to authorize accessor routes", async () => {
            @route.controller(c => c.actions("Accessor", x => x.authorize("Admin")))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to combine between accessor and mutator", async () => {
            @route.controller(c => {
                c.actions("Mutator", x => x.authorize("Admin"))
                c.actions("Accessor", x => x.authorize(Authenticated))
            })
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
    describe("Set Path", () => {
        it("Should able to set path", async () => {
            @route.controller(c => c.setPath("users/:uid"))
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to set path on one to many generic controller", async () => {
            @domain()
            class Animal {
                constructor(
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
                    @route.controller(c => c.setPath("users/:uid/animals/:aid"))
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: [User] }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
})