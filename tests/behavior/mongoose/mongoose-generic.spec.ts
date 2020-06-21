import { Class, Configuration, consoleLog, domain, val } from "@plumier/core"
import model, {
    collection,
    models,
    MongooseFacility,
    MongooseGenericControllerFacility,
    MongooseOneToManyRepository,
    MongooseRepository,
} from "@plumier/mongoose"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { SwaggerFacility } from "@plumier/swagger"
import { MongoMemoryServer } from "mongodb-memory-server-global"
import mongoose from "mongoose"
import supertest from "supertest"
import reflect from "tinspector"
import { join } from "path"
import * as v1 from "./v1/models"
import * as v2 from "./v2/models"

jest.setTimeout(20000)

mongoose.set("useNewUrlParser", true)
mongoose.set("useUnifiedTopology", true)
mongoose.set("useFindAndModify", false)


let mong: MongoMemoryServer | undefined;
beforeAll(async () => {
    mong = new MongoMemoryServer()
    await mongoose.connect(await mong.getUri())
})
afterAll(async () => {
    //await mong?.stop()
    await mongoose.disconnect()
})
beforeEach(() => {
    models.clear()
    mongoose.models = {}
    mongoose.connection.models = {}
})

describe("Facility", () => {
    function createApp() {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new MongooseFacility())
    }
    afterEach(() => consoleLog.clearMock())
    it("Should load default models if no option specified", async () => {
        @domain()
        class Animal {
            constructor(public name: string) { }
        }
        model(Animal)
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility())
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should not generate model if not registered as mongoose model", async () => {
        @domain()
        class Animal {
            constructor(public name: string) { }
        }
        //model(Animal) <-- not registered
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility({ entities: Animal }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able to load external model", async () => {
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility({ entities: join(__dirname, "./absolute") }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able to load external model using relative path", async () => {
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility({ entities: "./relative" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able specify rootPath", async () => {
        @domain()
        class Animal {
            constructor(public name: string) { }
        }
        model(Animal)
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility({ rootPath: "api/v1", entities: Animal }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able to create API versioning with multiple facility", async () => {
        @domain()
        class Animal {
            constructor(public name: string) { }
        }
        model(Animal)
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility({ rootPath: "api/v1", entities: Animal }))
            .set(new MongooseGenericControllerFacility({ rootPath: "api/v2", entities: Animal }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it.only("Should able to create API versioning with external models", async () => {
        // each version module uses their own mongoose instance and model generator
        // each mongoose instance should be connected separately
        await v1.mongoose.connect(await mong!.getUri())
        await v2.mongoose.connect(await mong!.getUri())
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility({ rootPath: "api/v1", entities: "./v1" }))
            .set(new MongooseGenericControllerFacility({ rootPath: "api/v2", entities: "./v2" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        await v1.mongoose.disconnect()
        await v2.mongoose.disconnect()
    })
    it("Should able to create API version using default entities", async () => {
        @domain()
        class Animal {
            constructor(public name: string) { }
        }
        model(Animal)
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility({rootPath: "api/v1"}))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
})

describe("CRUD", () => {
    function createApp(option?: Partial<Configuration>) {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new MongooseFacility())
            .set(new MongooseGenericControllerFacility())
            .set(option || {})
            .initialize()
    }
    describe("CRUD Function", () => {
        it("Should serve GET /users?offset&limit", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?offset=0&limit=20")
                .expect(200)
            expect(body.length).toBe(20)
        })
        it("Should serve GET /users?offset&limit with default value", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users")
                .expect(200)
            expect(body.length).toBe(50)
        })
        it("Should able to query by property GET /users?offset&limit&name", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            await repo.insert({ email: "jean.doe@gmail.com", name: "Jean Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?email=jean.doe@gmail.com")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should set partial validation on query GET /users?offset&limit&name", async () => {
            class User {
                @val.required()
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            await repo.insert({ email: "jean.doe@gmail.com", name: "Juan Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?name=Juan+Doe")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should serve POST /users", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            const { body } = await supertest(app.callback())
                .post("/users")
                .send({ email: "john.doe@gmail.com", name: "John Doe" })
                .expect(200)
            const inserted = await repo.findById(body.id)
            expect(inserted!.email).toBe("john.doe@gmail.com")
            expect(inserted!.name).toBe("John Doe")
        })
        it("Should serve GET /users/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.id}`)
                .expect(200)
            expect(body.email).toBe("john.doe@gmail.com")
            expect(body.name).toBe("John Doe")
        })
        it("Should throw 404 if not found GET /users/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .get(`/users/5099803df3f4948bd2f98391`)
                .expect(404)
        })
        it("Should serve PUT /users/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .put(`/users/${data.id}`)
                .send({ name: "Jane Doe" })
                .expect(200)
            const modified = await repo.findById(body.id)
            expect(modified!.email).toBe("john.doe@gmail.com")
            expect(modified!.name).toBe("Jane Doe")
        })
        it("Should throw 404 if not found PUT /users/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .put(`/users/5099803df3f4948bd2f98391`)
                .send({ name: "Jane Doe" })
                .expect(404)
        })
        it("Should serve PATCH /users/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .patch(`/users/${data.id}`)
                .send({ name: "Jane Doe" })
                .expect(200)
            const modified = await repo.findById(body.id)
            expect(modified!.email).toBe("john.doe@gmail.com")
            expect(modified!.name).toBe("Jane Doe")
        })
        it("Should set partial validation on PATCH /users/:id", async () => {
            class User {
                @val.required()
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .patch(`/users/${data.id}`)
                .send({ name: "Jane Doe" })
                .expect(200)
            const modified = await repo.findById(body.id)
            expect(modified!.email).toBe("john.doe@gmail.com")
            expect(modified!.name).toBe("Jane Doe")
        })
        it("Should throw 404 if not found PATCH /users/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .patch(`/users/5099803df3f4948bd2f98391`)
                .send({ name: "Jane Doe" })
                .expect(404)
        })
        it("Should serve DELETE /users/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .delete(`/users/${data.id}`)
                .expect(200)
            const modified = await repo.findById(body.id)
            expect(modified).toBeNull()
        })
        it("Should throw 404 if not found DELETE /users/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .delete(`/users/5099803df3f4948bd2f98391`)
                .expect(404)
        })
    })
    describe("Nested CRUD One to Many Function", () => {
        async function createUser<T>(type: Class<T>) {
            const userRepo = new MongooseRepository(type)
            const inserted = await userRepo.insert({ email: "john.doe@gmail.com", name: "John Doe" } as any)
            const saved = await userRepo.findById(inserted.id)
            return saved!
        }
        it("Should serve GET /users/:parentId/animals?offset&limit", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi` })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?offset=0&limit=20`)
                .expect(200)
            expect(body).toMatchSnapshot()
            expect(body.length).toBe(20)
        })
        it("Should serve GET /users/:parentId/animals?offset&limit with default value", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi ${i}` })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals`)
                .expect(200)
            expect(body.length).toBe(50)
        })
        it("Should find by name GET /users/:parentId/animals?offset&limit ", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await animalRepo.insert(user._id.toHexString(), { name: `Jojo` })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi ${i}` })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?name=Jojo`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should set partial validation on query on GET /users/:parentId/animals?offset&limit", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @val.required()
                @reflect.noop()
                name: string
                @reflect.noop()
                age: number
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await animalRepo.insert(user._id.toHexString(), { name: `Jojo`, age: 5 })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi ${i}`, age: 4 })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?age=5`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should serve POST /users/:parentId/animals", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const repo = new MongooseRepository(User)
            await supertest(app.callback())
                .post(`/users/${user._id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
            await supertest(app.callback())
                .post(`/users/${user._id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
            const inserted = await repo.Model.findById(user._id).populate("animals")
            expect(inserted).toMatchSnapshot()
        })
        it("Should throw 404 if parent not found POST /users/:parentId/animals", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .post(`/users/5099803df3f4948bd2f98391/animals`)
                .send({ name: "Mimi" })
                .expect(404)
        })
        it("Should serve GET /users/:parentId/animals/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi` })
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals/${inserted.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should throw 404 if not found GET /users/:parentId/animals/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .get(`/users/${user._id}/animals/5099803df3f4948bd2f98391`)
                .expect(404)
        })
        it("Should serve PUT /users/:parentId/animals/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi` })
            const { body } = await supertest(app.callback())
                .put(`/users/${user._id}/animals/${inserted.id}`)
                .send({ name: "Poe" })
                .expect(200)
            const modified = await animalRepo.findById(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should throw 404 if not found PUT /users/:parentId/animals/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .put(`/users/${user._id}/animals/5099803df3f4948bd2f98391`)
                .send({ name: "Poe" })
                .expect(404)
        })
        it("Should serve PATCH /users/:parentId/animals/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi` })
            const { body } = await supertest(app.callback())
                .patch(`/users/${user._id}/animals/${inserted.id}`)
                .send({ name: "Poe" })
                .expect(200)
            const modified = await animalRepo.findById(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should set partial validation on PATCH /users/:parentId/animals/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
                @val.required()
                @reflect.noop()
                age: number
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi`, age: 4 })
            const { body } = await supertest(app.callback())
                .patch(`/users/${user._id}/animals/${inserted.id}`)
                .send({ name: "Poe" })
                .expect(200)
            const modified = await animalRepo.findById(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should throw 404 if not found PATCH /users/:parentId/animals/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .patch(`/users/${user._id}/animals/5099803df3f4948bd2f98391`)
                .send({ name: "Poe" })
                .expect(404)
        })
        it("Should serve DELETE /users/:parentId/animals/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi` })
            const { body } = await supertest(app.callback())
                .delete(`/users/${user._id}/animals/${inserted.id}`)
                .expect(200)
            const modified = await animalRepo.findById(body.id)
            expect(modified).toBeNull()
        })
        it("Should throw 404 if not found DELETE /users/:parentId/animals/:id", async () => {
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .delete(`/users/${user._id}/animals/5099803df3f4948bd2f98391`)
                .expect(404)
        })
    })
})

describe("Open API", () => {
    function createApp(option?: Partial<Configuration>) {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new MongooseFacility())
            .set(new MongooseGenericControllerFacility())
            .set(new SwaggerFacility())
            .set({ mode: "production" })
            .initialize()
    }
    it("Should mark ref populate property as readonly and write only", async () => {
        class User {
            id: string
            @reflect.noop()
            email: string
            @reflect.noop()
            name: string
            @collection.ref(x => [Animal])
            animals: Animal[]
        }
        class Animal {
            @reflect.noop()
            name: string
        }
        model(Animal)
        model(User)
        const app = await createApp({ mode: "production" })
        const { body } = await supertest(app.callback())
            .get("/swagger/swagger.json")
            .expect(200)

        expect(body.components.schemas.User).toMatchSnapshot()
    })
    it("Should mark createdAt property as readonly ", async () => {
        class Animal {
            @reflect.noop()
            name: string
            @reflect.noop()
            createdAt: Date
        }
        model(Animal)
        const app = await createApp({ mode: "production" })
        const { body } = await supertest(app.callback())
            .get("/swagger/swagger.json")
            .expect(200)
        expect(body.components.schemas.Animal).toMatchSnapshot()
    })
    it("Should mark updatedAt property as readonly ", async () => {
        class Animal {
            @reflect.noop()
            name: string
            @reflect.noop()
            updatedAt: Date
        }
        model(Animal)
        const app = await createApp({ mode: "production" })
        const { body } = await supertest(app.callback())
            .get("/swagger/swagger.json")
            .expect(200)
        expect(body.components.schemas.Animal).toMatchSnapshot()
    })
    it("Should mark id property as readonly ", async () => {
        class Animal {
            @reflect.noop()
            name: string
            @reflect.noop()
            id: string
        }
        model(Animal)
        const app = await createApp({ mode: "production" })
        const { body } = await supertest(app.callback())
            .get("/swagger/swagger.json")
            .expect(200)
        expect(body.components.schemas.Animal).toMatchSnapshot()
    })
})