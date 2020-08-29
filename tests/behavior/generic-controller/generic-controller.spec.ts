import {
    ActionResult,
    authorize,
    cleanupConsole,
    Configuration,
    consoleLog,
    DefaultControllerGeneric,
    DefaultFacility,
    DefaultOneToManyRepository,
    DefaultOneToManyControllerGeneric,
    IdentifierResult,
    Invocation,
    Middleware,
    PlumierApplication,
    primaryId,
    relation,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
    route,
    RouteMetadata,
    response,
    DefaultRepository,
    Repository,
    bind,
    OneToManyRepository,
} from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import Plumier, { ControllerFacility, ControllerFacilityOption, domain, WebApiFacility } from "@plumier/plumier"
import { SwaggerFacility } from "@plumier/swagger"
import { Context } from "koa"
import { join } from "path"
import supertest from "supertest"
import reflect, { generic, type, noop } from "tinspector"

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
                    @primaryId()
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
                    @primaryId()
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
            @route.ignore({ action: ["get", "save"] })
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
            @authorize.role("admin")
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
            @authorize.role("admin", { action: ["save", "replace", "delete", "modify"] })
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
            @authorize.custom(x => x.user.role === "Admin")
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
        it("Should able to set @authorize.read() from entity", async () => {
            @route.controller()
            @domain()
            @authorize.read("admin")
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
        it("Should able to set @authorize.write() from entity", async () => {
            @route.controller()
            @domain()
            @authorize.write("admin")
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
            error(async () => ctl.find(1, 2, {}))
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
                    @route.controller()
                    @reflect.type([Animal])
                    @relation()
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
                    @relation()
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
                @relation()
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
                    @primaryId()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @primaryId()
                    public id: number,
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @relation()
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
                    @relation()
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
                    @relation()
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
                    @relation()
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
                    @relation()
                    @route.controller()
                    @route.ignore({ action: ["save", "list"] })
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
                @authorize.role("admin")
                @reflect.type([Animal])
                @relation()
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
                @authorize.role("admin", { action: ["save", "replace", "delete", "modify"] })
                @reflect.type([Animal])
                @relation()
                @route.controller()
                public animals: Animal[]
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User })
                .set(new JwtAuthFacility({ secret: "secret" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to set @authorize.write() on relation", async () => {
            class Animal {
                @reflect.noop()
                public name: string
            }
            class User {
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
                @authorize.write("admin")
                @reflect.type([Animal])
                @relation()
                @route.controller()
                public animals: Animal[]
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User })
                .set(new JwtAuthFacility({ secret: "secret" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to set @authorize.read() on relation", async () => {
            class Animal {
                @reflect.noop()
                public name: string
            }
            class User {
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
                @authorize.read("admin")
                @reflect.type([Animal])
                @relation()
                @route.controller()
                public animals: Animal[]
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: User })
                .set(new JwtAuthFacility({ secret: "secret" }))
                .initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to set @authorize.read() on relation", async () => {
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
                @relation()
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
            error(async () => ctl.find(1, 1, 2, {}))
            error(async () => ctl.update(123, {}))
            error(async () => ctl.insert(1, {}))
            error(async () => ctl.findParentById(1))
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
                    @relation()
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

describe("Property Binding", () => {
    const delayLorem = () => new Promise<string>(resolve => setTimeout(x => resolve("lorem ipsum"), 50))
    describe("Generic Controller", () => {
        const fn = jest.fn()
        class MockRepo<T> implements Repository<T>{
            async find(offset: number, limit: number, query: Partial<T>): Promise<T[]> {
                fn(offset, limit, query)
                return []
            }
            async insert(data: Partial<T>): Promise<{ id: any }> {
                fn(data)
                return { id: 123 }
            }
            async findById(id: any): Promise<T | undefined> {
                fn(id)
                return {} as any
            }
            async update(id: any, data: Partial<T>): Promise<{ id: any }> {
                fn(id, data)
                return { id }
            }
            async delete(id: any): Promise<{ id: any }> {
                fn(id)
                return { id }
            }
        }
        @generic.template("T", "TID")
        @generic.type("T", "TID")
        class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{
            constructor() { super(fac => new MockRepo<T>()) }
        }
        function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
            return new Plumier()
                .set({
                    genericController: [MyControllerGeneric, DefaultOneToManyControllerGeneric],
                    mode: "production",
                    ...config
                })
                .set(new WebApiFacility())
                .set(new ControllerFacility(opt))
        }
        beforeEach(() => fn.mockClear())
        it("Should bind on post method", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => "lorem ipsum dolor")
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: User }).initialize()
            await supertest(koa.callback())
                .post("/user")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind on post method using property declaration", async () => {
            @route.controller()
            class User {
                @noop()
                public name: string
                @noop()
                public email: string
                @bind.custom(x => "lorem ipsum dolor")
                public random: string
            }
            const koa = await createApp({ controller: User }).initialize()
            await supertest(koa.callback())
                .post("/user")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind promise on post method", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => delayLorem())
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: User }).initialize()
            await supertest(koa.callback())
                .post("/user")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind on put method", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => "lorem ipsum dolor")
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: User }).initialize()
            await supertest(koa.callback())
                .put("/user/123")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind promise on put method", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => delayLorem())
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: User }).initialize()
            await supertest(koa.callback())
                .put("/user/123")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind on patch method", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => "lorem ipsum dolor")
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: User }).initialize()
            await supertest(koa.callback())
                .patch("/user/123")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind promise on patch method", async () => {
            @route.controller()
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => delayLorem())
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: User }).initialize()
            await supertest(koa.callback())
                .patch("/user/123")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })
    describe("One To Many Controller", () => {
        const fn = jest.fn()
        class MockRepo<P, T> implements OneToManyRepository<P, T>{
            async find(pid: any, offset: number, limit: number, query: Partial<T>): Promise<T[]> {
                fn(pid, offset, limit, query)
                return []
            }
            async findParentById(id: any): Promise<P | undefined> {
                return {} as any
            }
            async insert(pid: any, data: Partial<T>): Promise<{ id: any }> {
                fn(data)
                return { id: 123 }
            }
            async findById(id: any): Promise<T | undefined> {
                fn(id)
                return {} as any
            }
            async update(id: any, data: Partial<T>): Promise<{ id: any }> {
                fn(id, data)
                return { id }
            }
            async delete(id: any): Promise<{ id: any }> {
                fn(id)
                return { id }
            }
        }
        @generic.template("P", "T", "PID", "TID")
        @generic.type("P", "T", "PID", "TID")
        class MyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{
            constructor() { super(fac => new MockRepo<P, T>()) }
        }
        function createApp(opt: ControllerFacilityOption, config?: Partial<Configuration>) {
            return new Plumier()
                .set({
                    genericController: [DefaultControllerGeneric, MyControllerGeneric],
                    mode: "production",
                    ...config
                })
                .set(new WebApiFacility())
                .set(new ControllerFacility(opt))
        }
        beforeEach(() => fn.mockClear())
        it("Should bind on post method", async () => {
            @domain()
            class Parent {
                constructor(
                    @route.controller()
                    @type(x => [User])
                    users: User[]
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => "lorem ipsum dolor")
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: Parent }).initialize()
            await supertest(koa.callback())
                .post("/parent/123/users")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind promise on post method", async () => {
            @domain()
            class Parent {
                constructor(
                    @route.controller()
                    @type(x => [User])
                    users: User[]
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => delayLorem())
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: Parent }).initialize()
            await supertest(koa.callback())
                .post("/parent/123/users")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind on put method", async () => {
            @domain()
            class Parent {
                constructor(
                    @route.controller()
                    @type(x => [User])
                    users: User[]
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => "lorem ipsum dolor")
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: Parent }).initialize()
            await supertest(koa.callback())
                .put("/parent/123/users/123")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind promise on put method", async () => {
            @domain()
            class Parent {
                constructor(
                    @route.controller()
                    @type(x => [User])
                    users: User[]
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => delayLorem())
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: Parent }).initialize()
            await supertest(koa.callback())
                .put("/parent/123/users/123")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind on patch method", async () => {
            @domain()
            class Parent {
                constructor(
                    @route.controller()
                    @type(x => [User])
                    users: User[]
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => "lorem ipsum dolor")
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: Parent }).initialize()
            await supertest(koa.callback())
                .patch("/parent/123/users/123")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should bind promise on patch method", async () => {
            @domain()
            class Parent {
                constructor(
                    @route.controller()
                    @type(x => [User])
                    users: User[]
                ) { }
            }
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @bind.custom(x => delayLorem())
                    public random: string
                ) { }
            }
            const koa = await createApp({ controller: Parent }).initialize()
            await supertest(koa.callback())
                .patch("/parent/123/users/123")
                .send({ name: "John", email: "john.doe@gmail.com" })
                .expect(200)
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
                @reflect.noop()
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
    })

    describe("Generic One To Many Controller", () => {
        it("Should provide proper component", async () => {
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @relation()
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
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @relation()
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
                @relation()
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
                @relation()
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
                @relation()
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
                @relation()
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
                @relation()
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
                @relation()
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
            expect(body.paths["/animal/{pid}/tags"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animal/{pid}/tags"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animals/{pid}/tags properly", async () => {
            @route.controller()
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @relation()
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
                @relation()
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
                @relation()
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
                @relation()
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
                @relation()
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
    })
})