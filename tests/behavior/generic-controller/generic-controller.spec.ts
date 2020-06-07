import {
    Class,
    createRoutesFromEntities,
    crud,
    IdentifierResult,
    RepoBaseControllerGeneric,
    RepoBaseOneToManyControllerGeneric,
    route,
    getGenericControllers,
    ControllerGeneric,
    OneToManyControllerGeneric,
} from "@plumier/core"
import { transform } from "@plumier/swagger"
import reflect, { generic, metadata } from "tinspector"
import { join } from "path"

describe("Generic Controller", () => {
    class User {
        @reflect.noop()
        name: string

        @reflect.noop()
        email: string
    }
    it("Should able to use Number id", () => {
        @generic.type(User, Number)
        class UsersController extends RepoBaseControllerGeneric<User, Number> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should able to use String id", () => {
        @generic.type(User, String)
        class UsersController extends RepoBaseControllerGeneric<User, String> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should able to instantiate IdentifierResult", () => {
        expect(new IdentifierResult(20).id).toBe(20)
    })
})

describe("Generic One To Many Controller", () => {
    class User {
        @reflect.noop()
        name: string

        @reflect.noop()
        email: string

        @reflect.type(x => [Animal])
        animals: Animal[]
    }
    class Animal {
        @reflect.noop()
        name: string
    }
    it("Should able to use Number id", () => {
        @generic.type(User, Animal, Number, Number)
        class UsersController extends RepoBaseOneToManyControllerGeneric<User, Animal, Number, Number> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should able to use String id", () => {
        @generic.type(User, Animal, Number, String)
        class UsersController extends RepoBaseOneToManyControllerGeneric<User, Animal, Number, String> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should able to use Number pid", () => {
        @generic.type(User, Animal, Number, Number)
        class UsersController extends RepoBaseOneToManyControllerGeneric<User, Animal, Number, Number> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should able to use String pid", () => {
        @generic.type(User, Animal, String, Number)
        class UsersController extends RepoBaseOneToManyControllerGeneric<User, Animal, String, Number> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should throw error when no OneToManyDecorator provided", () => {
        @generic.type(User, Animal, Number, Number)
        class UsersController extends RepoBaseOneToManyControllerGeneric<User, Animal, Number, Number> {
            list(pid: number, offset: number = 0, limit: number = 50, query: User) {
                return super.list(pid, offset, limit, query)
            }
            async save(pid: number, data: Animal) {
                return super.save(pid, data)
            }
            get(pid: number, id: number) {
                return super.get(pid, id)
            }
            async modify(pid: number, id: number, data: Animal) {
                return super.modify(pid, id, data)
            }
            async delete(pid: number, id: number) {
                return super.delete(pid, id)
            }
        }
        expect(() => new UsersController(x => Function as any)).toThrowErrorMatchingSnapshot()
    })
})

describe("Rote Generator", () => {
    it("Should generate routes properly", () => {
        class Animal {
            @reflect.noop()
            name: string
        }
        class User {
            @reflect.noop()
            name: string

            @reflect.noop()
            email: string

            @crud.oneToMany(x => Animal)
            @reflect.type(x => [Animal])
            animals: Animal[]
        }
        @generic.template("T", "TID")
        @generic.type("T", "TID")
        class UsersController<T, TID> extends RepoBaseControllerGeneric<T, TID> { }
        @generic.template("P", "T", "PID", "TID")
        @generic.type("P", "T", "PID", "TID")
        class UsersAnimalsController<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID> { }
        const routes = createRoutesFromEntities({
            entities: [Animal, User],
            controller: UsersController,
            controllerRootPath: "",
            oneToManyController: UsersAnimalsController,
            oneToManyControllerRootPath: "",
            nameConversion: x => x
        })
        expect(routes.map(x => ({ method: x.method, path: x.url }))).toMatchSnapshot()
    })
    it("Should able to ignore entity from routes generation", () => {
        @route.ignore()
        class Animal {
            @reflect.noop()
            name: string
        }
        class User {
            @reflect.noop()
            name: string

            @reflect.noop()
            email: string
        }
        const routes = createRoutesFromEntities({
            entities: [Animal, User],
            controller: RepoBaseControllerGeneric,
            controllerRootPath: "",
            oneToManyController: RepoBaseOneToManyControllerGeneric,
            oneToManyControllerRootPath: "",
            nameConversion: x => x
        })
        expect(routes.map(x => ({ method: x.method, path: x.url }))).toMatchSnapshot()
    })
    it("Should able to ignore some methods of generated routes", () => {
        @route.ignore("list", "get", "save", "delete", "replace")
        class Animal {
            @reflect.noop()
            name: string
        }
        const routes = createRoutesFromEntities({
            entities: [Animal],
            controller: RepoBaseControllerGeneric,
            controllerRootPath: "",
            oneToManyController: RepoBaseOneToManyControllerGeneric,
            oneToManyControllerRootPath: "",
            nameConversion: x => x
        })
        expect(routes.map(x => ({ method: x.method, path: x.url }))).toMatchSnapshot()
    })
    it("Should able to ignore one to many route generation", () => {
        class Animal {
            @reflect.noop()
            name: string
        }
        class User {
            @reflect.noop()
            name: string

            @reflect.noop()
            email: string

            @route.ignore()
            @crud.oneToMany(x => Animal)
            @reflect.type(x => [Animal])
            animals: Animal[]
        }
        const routes = createRoutesFromEntities({
            entities: [Animal, User],
            controller: RepoBaseControllerGeneric,
            controllerRootPath: "",
            oneToManyController: RepoBaseOneToManyControllerGeneric,
            oneToManyControllerRootPath: "",
            nameConversion: x => x
        })
        expect(routes.map(x => ({ method: x.method, path: x.url }))).toMatchSnapshot()
    })
    it("Should able to ignore some method on one to many route generation", () => {
        class Animal {
            @reflect.noop()
            name: string
        }
        class User {
            @reflect.noop()
            name: string

            @reflect.noop()
            email: string

            @route.ignore("list", "get", "save", "delete", "replace")
            @crud.oneToMany(x => Animal)
            @reflect.type(x => [Animal])
            animals: Animal[]
        }
        const routes = createRoutesFromEntities({
            entities: [Animal, User],
            controller: RepoBaseControllerGeneric,
            controllerRootPath: "",
            oneToManyController: RepoBaseOneToManyControllerGeneric,
            oneToManyControllerRootPath: "",
            nameConversion: x => x
        })
        expect(routes.map(x => ({ method: x.method, path: x.url }))).toMatchSnapshot()
    })
})

describe("Swagger", () => {
    describe("Generic Controller", () => {
        it("Should generate GET /animal properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities({
                entities: [Animal],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal"].get.parameters).toMatchSnapshot()
            expect(spec.paths["/animal"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animal properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities({
                entities: [Animal],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal"].post.requestBody).toMatchSnapshot()
            expect(spec.paths["/animal"].post.tags).toMatchSnapshot()
        })
        it("Should generate GET /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities({
                entities: [Animal],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal/{id}"].get.parameters).toMatchSnapshot()
            expect(spec.paths["/animal/{id}"].get.tags).toMatchSnapshot()
        })
        it("Should generate DELETE /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities({
                entities: [Animal],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal/{id}"].delete.parameters).toMatchSnapshot()
            expect(spec.paths["/animal/{id}"].delete.tags).toMatchSnapshot()
        })
        it("Should generate PUT /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities({
                entities: [Animal],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal/{id}"].put.parameters).toMatchSnapshot()
            expect(spec.paths["/animal/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate PATCH /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities({
                entities: [Animal],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal/{id}"].put.parameters).toMatchSnapshot()
            expect(spec.paths["/animal/{id}"].put.tags).toMatchSnapshot()
        })
    })
    describe("One To Many Generic Controller", () => {
        it("Should generate GET /animal properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            class Client {
                @reflect.noop()
                name: string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }

            const routes = createRoutesFromEntities({
                entities: [Animal, Client],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/client/{pid}/animals"].get.parameters).toMatchSnapshot()
            expect(spec.paths["/client/{pid}/animals"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animal properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            class Client {
                @reflect.noop()
                name: string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities({
                entities: [Animal, Client],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/client/{pid}/animals"].post.requestBody).toMatchSnapshot()
            expect(spec.paths["/client/{pid}/animals"].post.tags).toMatchSnapshot()
        })
        it("Should generate GET /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            class Client {
                @reflect.noop()
                name: string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities({
                entities: [Animal, Client],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/client/{pid}/animals/{id}"].get.parameters).toMatchSnapshot()
            expect(spec.paths["/client/{pid}/animals/{id}"].get.tags).toMatchSnapshot()
        })
        it("Should generate DELETE /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            class Client {
                @reflect.noop()
                name: string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities({
                entities: [Animal, Client],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/client/{pid}/animals/{id}"].delete.parameters).toMatchSnapshot()
            expect(spec.paths["/client/{pid}/animals/{id}"].delete.tags).toMatchSnapshot()
        })
        it("Should generate PUT /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            class Client {
                @reflect.noop()
                name: string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities({
                entities: [Animal, Client],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/client/{pid}/animals/{id}"].put.parameters).toMatchSnapshot()
            expect(spec.paths["/client/{pid}/animals/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate PATCH /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            class Client {
                @reflect.noop()
                name: string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities({
                entities: [Animal, Client],
                controller: RepoBaseControllerGeneric,
                controllerRootPath: "",
                oneToManyController: RepoBaseOneToManyControllerGeneric,
                oneToManyControllerRootPath: "",
                nameConversion: x => x
            })
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/client/{pid}/animals/{id}"].put.parameters).toMatchSnapshot()
            expect(spec.paths["/client/{pid}/animals/{id}"].put.tags).toMatchSnapshot()
        })
    })
})

@generic.template("T", "TID")
@generic.type("T", "TID")
export class MyControllerGeneric<T, TID> extends RepoBaseControllerGeneric<T, TID>{ }

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
export class MyOneToManyControllerGeneric<P, T, PID, TID> extends RepoBaseOneToManyControllerGeneric<P, T, PID, TID>{ }

describe("getGenericControllers", () => {
    it("Should get controller properly when provided classes directly", () => {
        const controllers = getGenericControllers(undefined, [MyControllerGeneric, MyOneToManyControllerGeneric], ControllerGeneric, OneToManyControllerGeneric)
        expect(controllers).toMatchSnapshot()
    })
    it("Should able to change root path", () => {
        const controllers = getGenericControllers("api/v1", [MyControllerGeneric, MyOneToManyControllerGeneric], ControllerGeneric, OneToManyControllerGeneric)
        expect(controllers).toMatchSnapshot()
    })
    it("Should able only change only one generic controller", () => {
        const controllers = getGenericControllers("api/v1", [MyControllerGeneric], ControllerGeneric, OneToManyControllerGeneric)
        expect(controllers).toMatchSnapshot()
    })
    it("Should able to provide path to current file", () => {
        const controllers = getGenericControllers(undefined, __filename, ControllerGeneric, OneToManyControllerGeneric)
        expect(controllers).toMatchSnapshot()
    })
    it("Should able to provide directory path", () => {
        const controllers = getGenericControllers(undefined, join(__dirname, "controller"), ControllerGeneric, OneToManyControllerGeneric)
        expect(controllers).toMatchSnapshot()
    })
    it("Should able to provide directory path with nested root", () => {
        const controllers = getGenericControllers(undefined, join(__dirname, "nested"), ControllerGeneric, OneToManyControllerGeneric)
        expect(controllers).toMatchSnapshot()
    })
    it("Should prioritize rootPath on configuration vs nested root", () => {
        const controllers = getGenericControllers("root/path", join(__dirname, "nested"), ControllerGeneric, OneToManyControllerGeneric)
        expect(controllers).toMatchSnapshot()
    })
    it("Should able to use default controllers", () => {
        const controllers = getGenericControllers("root/path", [], ControllerGeneric, OneToManyControllerGeneric)
        expect(controllers).toMatchSnapshot()
    })
})