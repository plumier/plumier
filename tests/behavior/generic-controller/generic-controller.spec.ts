import { cleanupConsole, consoleLog, DefaultFacility, PlumierApplication, route, RouteMetadata } from "@plumier/core"
import {
    crud,
    GenericControllerFacilityOption,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
    IdentifierResult,
} from "@plumier/generic-controller"
import Plumier, { domain, WebApiFacility } from "@plumier/plumier"
import { SwaggerFacility } from "@plumier/swagger"
import { join } from "path"
import supertest from "supertest"
import reflect, { generic } from "tinspector"

import { MyCRUDModuleFacility } from "./mocks"

function createApp(opt: GenericControllerFacilityOption) {
    return new Plumier()
        .set(new WebApiFacility())
        .set(new MyCRUDModuleFacility(opt))
}

class RouteHookFacility extends DefaultFacility {
    constructor(private callback: ((x: RouteMetadata[]) => void)) { super() }
    async initialize(app: Readonly<PlumierApplication>, routes: RouteMetadata[]) {
        this.callback(routes)
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
        await createApp({ entities: join(__dirname, "entities") }).initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
    })
    it("Should able to specify entity directory with relative path", async () => {
        const mock = consoleLog.startMock()
        await createApp({ entities: "./entities" }).initialize()
        expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
    })
    it("Should initiate IdentifierResult properly", () => {
        expect(new IdentifierResult<number>(20)).toMatchSnapshot()
    })
    describe("Generic Controller", () => {
        it("Should generate routes with parameter property entity", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should generate routes with property field entity", async () => {
            class User {
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to specify ID type by providing decorator", async () => {
            @domain()
            class User {
                constructor(
                    @crud.id()
                    public id: number,
                    public name: string,
                    public email: string
                ) { }
            }
            let routes: RouteMetadata[] = []
            await createApp({ entities: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize()
            expect(getParameters(routes)).toMatchSnapshot()
        })
        it("Should use string as default id if no ID type specified", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            let routes: RouteMetadata[] = []
            await createApp({ entities: User })
                .set(new RouteHookFacility(x => routes = x))
                .initialize()
            expect(getParameters(routes)).toMatchSnapshot()
        })
        it("Should able to change root path", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use root path without trailing slash", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User, rootPath: "/api/v1" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use root path without leading slash", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User, rootPath: "api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use custom controller", async () => {
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
            await createApp({ controller: MyCustomControllerGeneric, entities: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should only allow custom controller ends with Generic", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }

            @generic.template("T", "TID")
            @generic.type("T", "TID")
            class MyCustomController<T, TID> extends RepoBaseControllerGeneric<T, TID>{ }
            const mock = consoleLog.startMock()
            await createApp({ controller: MyCustomController, entities: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should only allow custom controller extends from ControllerGeneric", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }

            @generic.template("T", "TID")
            @generic.type("T", "TID")
            class MyCustomControllerGeneric<T, TID>{ }
            const mock = consoleLog.startMock()
            await createApp({ controller: MyCustomControllerGeneric, entities: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to specify directory of custom controller with absolute path", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: join(__dirname, "./custom-controller"), entities: User })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to specify directory of custom controller with relative path", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: "./custom-controller", entities: User })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to specify directory of custom controller in nested directory, but should not affect route", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: join(__dirname, "./nested"), entities: User })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to specify custom controller from Web Api Facility", async () => {
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await new Plumier()
                .set(new WebApiFacility({ controller: "./custom-controller" }))
                .set(new MyCRUDModuleFacility({ entities: User }))
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should prioritize controller provided by CRUD facility instead of WebApiFacility", async () => {
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
            await new Plumier()
                .set(new WebApiFacility({ controller: "./custom-controller" }))
                .set(new MyCRUDModuleFacility({ entities: User, controller: MyCustomControllerGeneric }))
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to ignore an entity from route generation", async () => {
            @domain()
            @route.ignore()
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            @domain()
            class Animal {
                constructor(
                    public name: string,
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: [User, Animal] }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore some method of controller from entity", async () => {
            @domain()
            @route.ignore("get", "save")
            class User {
                constructor(
                    public name: string,
                    public email: string
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
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
            @domain()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should generate routes with property field entity", async () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            class User {
                @reflect.noop()
                name: string
                @reflect.noop()
                email: string
                @reflect.type([Animal])
                @crud.oneToMany(Animal)
                animals: Animal[]
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to specify ID type by providing decorator", async () => {
            @domain()
            class Animal {
                constructor(
                    @crud.id()
                    public id: number,
                    public name: string
                ) { }
            }
            @domain()
            class User {
                constructor(
                    @crud.id()
                    public id: number,
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            let routes: RouteMetadata[] = []
            await createApp({ entities: User })
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            let routes: RouteMetadata[] = []
            await createApp({ entities: User })
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
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use root path without trailing slash", async () => {
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User, rootPath: "/api/v1" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use root path without leading slash", async () => {
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User, rootPath: "api/v1/" })
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            @generic.template("P", "PID", "T", "TID")
            @generic.type("P", "PID", "T", "TID")
            class MyCustomOneToManyControllerGeneric<P, PID, T, TID> extends RepoBaseOneToManyControllerGeneric<P, PID, T, TID>{ }
            const mock = consoleLog.startMock()
            await createApp({ controller: MyCustomOneToManyControllerGeneric, entities: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should only allow custom controller ends with Generic", async () => {
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            @generic.template("P", "PID", "T", "TID")
            @generic.type("P", "PID", "T", "TID")
            class MyCustomOneToManyController<P, PID, T, TID> extends RepoBaseOneToManyControllerGeneric<P, PID, T, TID>{ }
            const mock = consoleLog.startMock()
            await createApp({ controller: MyCustomOneToManyController, entities: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should only allow custom controller extends from ControllerGeneric", async () => {
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            @generic.template("P", "PID", "T", "TID")
            @generic.type("P", "PID", "T", "TID")
            class MyCustomOneToManyControllerGeneric<P, PID, T, TID> { }
            const mock = consoleLog.startMock()
            await createApp({ controller: MyCustomOneToManyControllerGeneric, entities: User, rootPath: "/api/v1/" })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to specify directory of custom controller with absolute path", async () => {
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: join(__dirname, "./custom-controller"), entities: User })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to specify directory of custom controller with relative path", async () => {
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: "./custom-controller", entities: User })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to specify directory of custom controller in nested directory, but should not affect route", async () => {
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ controller: join(__dirname, "./nested"), entities: User })
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to use custom controller from WebApiFacility", async () => {
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await new Plumier()
                .set(new WebApiFacility({ controller: "./custom-controller" }))
                .set(new MyCRUDModuleFacility({ entities: User }))
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should prioritize controller provided by CRUD facility instead of WebApiFacility", async () => {
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
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            @generic.template("P", "PID", "T", "TID")
            @generic.type("P", "PID", "T", "TID")
            class MyCustomOneToManyControllerGeneric<P, PID, T, TID> extends RepoBaseOneToManyControllerGeneric<P, PID, T, TID>{ }
            const mock = consoleLog.startMock()
            await new Plumier()
                .set(new WebApiFacility({ controller: "./custom-controller" }))
                .set(new MyCRUDModuleFacility({ entities: User, controller: MyCustomOneToManyControllerGeneric }))
                .initialize()
            expect(mock.mock.calls).toMatchSnapshot()
        })
        it("Should able to ignore an entity from route generation", async () => {
            @domain()
            class Animal {
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            @route.ignore()
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: [User, Animal] }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore some method of controller from entity", async () => {
            @domain()
            class Animal {
                constructor(
                    public name: string
                ) { }
            }
            @domain()
            @route.ignore("save", "list")
            class User {
                constructor(
                    public name: string,
                    public email: string,
                    @reflect.type([Animal])
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore relation", async () => {
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
                    @route.ignore()
                    @reflect.type([Animal])
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore some method on relation", async () => {
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
                    @route.ignore("list", "replace")
                    @reflect.type([Animal])
                    @crud.oneToMany(Animal)
                    public animals: Animal[]
                ) { }
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore relation on property field", async () => {
            class Animal {
                @reflect.noop()
                public name: string
            }
            class User {
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
                @route.ignore()
                @reflect.type([Animal])
                @crud.oneToMany(Animal)
                public animals: Animal[]
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
        it("Should able to ignore some method on relation on property field", async () => {
            class Animal {
                @reflect.noop()
                public name: string
            }
            class User {
                @reflect.noop()
                public name: string
                @reflect.noop()
                public email: string
                @route.ignore("list", "modify")
                @reflect.type([Animal])
                @crud.oneToMany(Animal)
                public animals: Animal[]
            }
            const mock = consoleLog.startMock()
            await createApp({ entities: User }).initialize()
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
        })
    })
})

describe("Open Api", () => {
    describe("Generic Controller", () => {
        it("Should provided proper component", async () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas.Animal).toMatchSnapshot()
        })
        it("Should generate GET /animals properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animals"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animals properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals"].post.requestBody).toMatchSnapshot()
            expect(body.paths["/animals"].post.tags).toMatchSnapshot()
        })
        it("Should generate GET /animals/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{id}"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{id}"].get.tags).toMatchSnapshot()
        })
        it("Should generate DELETE /animals/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{id}"].delete.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{id}"].delete.tags).toMatchSnapshot()
        })
        it("Should generate PUT /animals/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate PATCH /animals/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{id}"].put.tags).toMatchSnapshot()
        })
    })

    describe("Generic Controller", () => {
        it("Should provide proper component", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.components.schemas.Animal).toMatchSnapshot()
            expect(body.components.schemas.Tag).toMatchSnapshot()
        })
        it("Should generate GET /animals properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animals"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animals properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals"].post.requestBody).toMatchSnapshot()
            expect(body.paths["/animals"].post.tags).toMatchSnapshot()
        })
        it("Should generate GET /animals/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{id}"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{id}"].get.tags).toMatchSnapshot()
        })
        it("Should generate DELETE /animals/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{id}"].delete.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{id}"].delete.tags).toMatchSnapshot()
        })
        it("Should generate PUT /animals/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate PATCH /animals/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate GET /animals/{pid}/tags properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{pid}/tags"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{pid}/tags"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animals/{pid}/tags properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{pid}/tags"].post.requestBody).toMatchSnapshot()
            expect(body.paths["/animals/{pid}/tags"].post.tags).toMatchSnapshot()
        })
        it("Should generate GET /animals/{pid}/tags/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{pid}/tags/{id}"].get.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{pid}/tags/{id}"].get.tags).toMatchSnapshot()
        })
        it("Should generate DELETE /animals/{pid}/tags/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{pid}/tags/{id}"].delete.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{pid}/tags/{id}"].delete.tags).toMatchSnapshot()
        })
        it("Should generate PUT /animals/{pid}/tags/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{pid}/tags/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{pid}/tags/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate PATCH /animals/{pid}/tags/:id properly", async () => {
            class Animal {
                @reflect.noop()
                name: string
                @reflect.type(x => [Tag])
                @crud.oneToMany(x => [Tag])
                tags: Tag[]
            }
            class Tag {
                @reflect.noop()
                tag: string
            }
            const koa = await createApp({ entities: Animal })
                .set(new SwaggerFacility())
                .initialize()
            const { body } = await supertest(koa.callback())
                .get("/swagger/swagger.json")
                .expect(200)
            expect(body.paths["/animals/{pid}/tags/{id}"].put.parameters).toMatchSnapshot()
            expect(body.paths["/animals/{pid}/tags/{id}"].put.tags).toMatchSnapshot()
        })
    })
})