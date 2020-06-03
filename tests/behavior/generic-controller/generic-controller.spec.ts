import { GenericController, Class, GenericOneToManyController, crud, createRoutesFromEntities, OneToManyDecorator, RouteInfo, route } from "@plumier/core"
import reflect, { generic, metadata, decorateClass } from "tinspector"
import { transform } from "@plumier/swagger"

describe("Generic Controller", () => {
    class User {
        @reflect.noop()
        name: string

        @reflect.noop()
        email: string
    }
    it("Should able to use Number id", () => {
        @generic.type(User, Number)
        class UsersController extends GenericController<User, Number> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should able to use String id", () => {
        @generic.type(User, String)
        class UsersController extends GenericController<User, String> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should invocable", () => {
        @generic.type(User, Number)
        class TypeOrmGenericController extends GenericController<User, Number>{
            list(offset: number = 0, limit: number = 50, query: User) {
                return super.list(offset, limit, query)
            }
            async save(data: User) {
                return super.save(data)
            }
            get(id: number) {
                return super.get(id)
            }
            async modify(id: number, data: User) {
                return super.modify(id, data)
            }
            async delete(id: number) {
                return super.delete(id)
            }
        }
        const ctl = new TypeOrmGenericController()
        ctl.list(1, 10, {} as User)
        ctl.list(undefined, undefined, {} as User)
        ctl.save({} as User)
        ctl.get(1)
        ctl.modify(1, {} as User)
        ctl.delete(1)
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
        class UsersController extends GenericOneToManyController<User, Animal, Number, Number> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should able to use String id", () => {
        @generic.type(User, Animal, Number, String)
        class UsersController extends GenericOneToManyController<User, Animal, Number, String> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should able to use Number pid", () => {
        @generic.type(User, Animal, Number, Number)
        class UsersController extends GenericOneToManyController<User, Animal, Number, Number> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should able to use String pid", () => {
        @generic.type(User, Animal, String, Number)
        class UsersController extends GenericOneToManyController<User, Animal, String, Number> { }
        const meta = reflect(UsersController)
        expect(metadata.getMethods(meta)).toMatchSnapshot()
        const idResult = reflect(meta.methods.find(x => x.name === "save")!.returnType as Class)
        expect(metadata.getProperties(idResult)).toMatchSnapshot()
    })
    it("Should invocable", () => {
        @generic.type(User, Animal, Number, Number)
        @decorateClass(<OneToManyDecorator>{ propertyName: "animals", parentType: User, kind: "GenericDecoratorOneToMany", type: x => UsersController })
        class UsersController extends GenericOneToManyController<User, Animal, Number, Number> {
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
        const ctl = new UsersController()
        ctl.list(1, 1, 10, {} as User)
        ctl.list(1, undefined, undefined, {} as User)
        ctl.save(1, {} as User)
        ctl.get(1, 1)
        ctl.modify(1, 1, {} as User)
        ctl.delete(1, 1)
    })
    it("Should throw error when no OneToManyDecorator provided", () => {
        @generic.type(User, Animal, Number, Number)
        class UsersController extends GenericOneToManyController<User, Animal, Number, Number> {
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
        expect(() => new UsersController()).toThrowErrorMatchingSnapshot()
    })
})

describe("Rote Generator", () => {
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
    it("Should generate routes properly", () => {
        @generic.template("T", "TID")
        @generic.type("T", "TID")
        class UsersController<T, TID> extends GenericController<T, TID> { }
        @generic.template("P", "T", "PID", "TID")
        @generic.type("P", "T", "PID", "TID")
        class UsersAnimalsController<P, T, PID, TID> extends GenericOneToManyController<P, T, PID, TID> { }
        const routes = createRoutesFromEntities([User, Animal], UsersController, UsersAnimalsController, x => x)
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
            const routes = createRoutesFromEntities([Animal], GenericController, GenericOneToManyController, x => x)
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal"].get.parameters).toMatchSnapshot()
            expect(spec.paths["/animal"].get.tags).toMatchSnapshot()
        })
        it("Should generate POST /animal properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities([Animal], GenericController, GenericOneToManyController, x => x)
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal"].post.requestBody).toMatchSnapshot()
            expect(spec.paths["/animal"].post.tags).toMatchSnapshot()
        })
        it("Should generate GET /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities([Animal], GenericController, GenericOneToManyController, x => x)
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal/{id}"].get.parameters).toMatchSnapshot()
            expect(spec.paths["/animal/{id}"].get.tags).toMatchSnapshot()
        })
        it("Should generate DELETE /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities([Animal], GenericController, GenericOneToManyController, x => x)
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal/{id}"].delete.parameters).toMatchSnapshot()
            expect(spec.paths["/animal/{id}"].delete.tags).toMatchSnapshot()
        })
        it("Should generate PUT /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities([Animal], GenericController, GenericOneToManyController, x => x)
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/animal/{id}"].put.parameters).toMatchSnapshot()
            expect(spec.paths["/animal/{id}"].put.tags).toMatchSnapshot()
        })
        it("Should generate PATCH /animal/:id properly", () => {
            class Animal {
                @reflect.noop()
                name: string
            }
            const routes = createRoutesFromEntities([Animal], GenericController, GenericOneToManyController, x => x)
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
                name:string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities([Animal, Client], GenericController, GenericOneToManyController, x => x)
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
                name:string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities([Animal, Client], GenericController, GenericOneToManyController, x => x)
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
                name:string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities([Animal, Client], GenericController, GenericOneToManyController, x => x)
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
                name:string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities([Animal, Client], GenericController, GenericOneToManyController, x => x)
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
                name:string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities([Animal, Client], GenericController, GenericOneToManyController, x => x)
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
                name:string
                @crud.oneToMany(x => Animal)
                @reflect.type(x => [Animal])
                animals: Animal[]
            }
            const routes = createRoutesFromEntities([Animal, Client], GenericController, GenericOneToManyController, x => x)
            const spec = transform(routes, { map: new Map(), config: {} as any })
            expect(spec.paths["/client/{pid}/animals/{id}"].put.parameters).toMatchSnapshot()
            expect(spec.paths["/client/{pid}/animals/{id}"].put.tags).toMatchSnapshot()
        })
    })
})