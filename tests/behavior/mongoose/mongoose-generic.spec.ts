import { Class, Configuration, consoleLog, val } from "@plumier/core"
import model, {
    collection,
    models,
    MongooseControllerGeneric,
    MongooseFacility,
    MongooseGenericControllerFacility,
    MongooseHelper,
    MongooseOneToManyControllerGeneric,
    MongooseOneToManyRepository,
    MongooseRepository,
    Ref,
} from "@plumier/mongoose"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { SwaggerFacility } from "@plumier/swagger"
import { MongoMemoryServer } from "mongodb-memory-server-global"
import mongoose from "mongoose"
import { join } from "path"
import supertest from "supertest"
import reflect, { generic } from "tinspector"

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
        @collection()
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
        // @collection() <-- not registered
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
        @collection()
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
        @collection()
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
    it("Should able to create API versioning with external models", async () => {
        // each version module uses their own mongoose instance and model generator
        // each mongoose instance should be connected separately
        await v1.helper.connect(await mong!.getUri())
        await v2.helper.connect(await mong!.getUri())
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility({ rootPath: "api/v1", entities: "./v1" }))
            .set(new MongooseGenericControllerFacility({ rootPath: "api/v2", entities: "./v2" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
        await v1.helper.disconnect()
        await v2.helper.disconnect()
    })
    it("Should able to create API version using default entities", async () => {
        @collection()
        class Animal {
            constructor(public name: string) { }
        }
        model(Animal)
        const mock = consoleLog.startMock()
        await createApp()
            .set(new MongooseGenericControllerFacility({ rootPath: "api/v1" }))
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
            @collection()
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
            @collection()
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
            @collection()
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
            @collection()
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
            @collection()
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
            @collection()
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
        it("Should check prover mongodb id on GET /users/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .get(`/users/lorem`)
                .expect(422)
        })
        it("Should throw 404 if not found GET /users/:id", async () => {
            @collection()
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
            @collection()
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
        it("Should check prover mongodb id on PUT /users/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .put(`/users/lorem`)
                .send({ name: "Jane Doe" })
                .expect(422)
        })
        it("Should throw 404 if not found PUT /users/:id", async () => {
            @collection()
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
            @collection()
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
        it("Should check prover mongodb id on PATCH /users/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .patch(`/users/lorem`)
                .send({ name: "Jane Doe" })
                .expect(422)
        })
        it("Should set partial validation on PATCH /users/:id", async () => {
            @collection()
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
            @collection()
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
            @collection()
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
        it("Should check prover mongodb id on DELETE /users/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .delete(`/users/lorem`)
                .expect(422)
        })
        it("Should throw 404 if not found DELETE /users/:id", async () => {
            @collection()
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
        it("Should able to use custom generic controller with custom repository", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const repo = new MongooseRepository(User)
            @generic.template("T", "TID")
            @generic.type("T", "TID")
            class MyCustomGeneric<T, TID> extends MongooseControllerGeneric<T, TID>{
                constructor() { super(x => new MongooseRepository(x)) }
            }
            const app = await new Plumier()
                .set(new WebApiFacility())
                .set(new MongooseFacility())
                .set(new MongooseGenericControllerFacility({ controller: MyCustomGeneric }))
                .set({ mode: "production" })
                .initialize()
            await supertest(app.callback())
                .post("/users")
                .send({ email: "john.doe@gmail.com", name: "John Doe" })
                .expect(200)
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
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
        it("Should check prover mongodb id on GET /users/:parentId/animals?offset&limit", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .get(`/users/lorem/animals?offset=0&limit=20`)
                .expect(422)
        })
        it("Should find by name GET /users/:parentId/animals?offset&limit ", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
        it("Should check prover mongodb id on POST /users/:parentId/animals", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .post(`/users/lorem/animals`)
                .send({ name: "Mimi" })
                .expect(422)
        })
        it("Should throw 404 if parent not found POST /users/:parentId/animals", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
        it("Should check prover mongodb id GET /users/:parentId/animals/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .get(`/users/lorem/animals/ipsum`)
                .expect(422)
        })
        it("Should throw 404 if not found GET /users/:parentId/animals/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
        it("Should check prover mongodb id PUT /users/:parentId/animals/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .put(`/users/lorem/animals/lorem`)
                .send({ name: "Poe" })
                .expect(422)
        })
        it("Should throw 404 if not found PUT /users/:parentId/animals/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
        it("Should check prover mongodb id PATCH /users/:parentId/animals/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            await supertest(app.callback())
                .patch(`/users/lorem/animals/lorem`)
                .send({ name: "Poe" })
                .expect(422)
        })
        it("Should set partial validation on PATCH /users/:parentId/animals/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
        it("Should check prover mongodb id DELETE /users/:parentId/animals/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .delete(`/users/lorem/animals/lorem`)
                .expect(422)
        })
        it("Should throw 404 if not found DELETE /users/:parentId/animals/:id", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
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
        it("Should able to use custom generic controller with custom repository", async () => {
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const user = await createUser(User)
            const repo = new MongooseRepository(User)
            @generic.template("P", "T", "PID", "TID")
            @generic.type("P", "T", "PID", "TID")
            class MyCustomGeneric<P, T, PID, TID> extends MongooseOneToManyControllerGeneric<P, T, PID, TID>{
                constructor() { super((p, t, rel) => new MongooseOneToManyRepository(p, t, rel)) }
            }
            const app = await new Plumier()
                .set(new WebApiFacility())
                .set(new MongooseFacility())
                .set(new MongooseGenericControllerFacility({ controller: MyCustomGeneric }))
                .set({ mode: "production" })
                .initialize()
            await supertest(app.callback())
                .post(`/users/${user._id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
        })
    })
    describe("One To One Function", () => {
        it("Should able to add with ID", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .post(`/users`)
                .send({ name: "John", animal: animal.id })
                .expect(200)
            const saved = await UserModel.findById(body.id).populate("animal")
            expect(saved).toMatchSnapshot()
        })
        it("Should able to modify relation by ID", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const user = await new UserModel({ name: "John", animal }).save()
            const otherAnimal = await new AnimalModel({ name: "Bingo" }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .patch(`/users/${user.id}`)
                .send({ animal: otherAnimal.id })
                .expect(200)
            const saved = await UserModel.findById(body.id).populate("animal")
            expect(saved).toMatchSnapshot()
        })
        it("Should populated on get by id", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const user = await new UserModel({ name: "John", animal }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should populated on multiple property", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
                @collection.ref(x => Animal)
                secondAnimal: Animal
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const second = await new AnimalModel({ name: "Bingo" }).save()
            const user = await new UserModel({ name: "John", animal, secondAnimal: second }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should not populated one to many", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const second = await new AnimalModel({ name: "Bingo" }).save()
            const user = await new UserModel({ name: "John", animals: [animal.id, second.id] }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}`)
                .expect(200)
            const saved = await user.populate("animals").execPopulate()
            expect(saved).toMatchSnapshot()
            expect(body).toMatchSnapshot()
        })
        it("Should populated multiple result", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
                @collection.ref(x => Animal)
                secondAnimal: Animal
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            await UserModel.deleteMany({})
            await new UserModel({ name: "John", animal }).save()
            await new UserModel({ name: "Jane", animal }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
    describe("One To One on Nested Object", () => {
        it("Should able to add with ID", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            @collection()
            class Parent {
                @collection.property()
                name: string
                @collection.ref([User])
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const parent = await new ParentModel({ name: "John" }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .post(`/parents/${parent.id}/children`)
                .send({ name: "John", animal: animal.id })
                .expect(200)
            const saved = await UserModel.findById(body.id).populate("animal")
            expect(saved).toMatchSnapshot()
        })
        it("Should able to modify relation by ID", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            @collection()
            class Parent {
                @collection.property()
                name: string
                @collection.ref([User])
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const parent = await new ParentModel({ name: "John" }).save()
            const user = await new UserModel({ name: "John", animal }).save()
            const otherAnimal = await new AnimalModel({ name: "Bingo" }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .patch(`/parents/${parent.id}/children/${user.id}`)
                .send({ animal: otherAnimal.id })
                .expect(200)
            const saved = await UserModel.findById(body.id).populate("animal")
            expect(saved).toMatchSnapshot()
        })
        it("Should populated on get by id", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            @collection()
            class Parent {
                @collection.property()
                name: string
                @collection.ref([User])
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const user = await new UserModel({ name: "John", animal }).save()
            const parent = await new ParentModel({ name: "John", children: [user.id] }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should populated on multiple property", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
                @collection.ref(x => Animal)
                secondAnimal: Animal
            }
            @collection()
            class Parent {
                @collection.property()
                name: string
                @collection.ref([User])
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const second = await new AnimalModel({ name: "Bingo" }).save()
            const user = await new UserModel({ name: "John", animal, secondAnimal: second }).save()
            const parent = await new ParentModel({ name: "John", children: [user.id] }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should not populated one to many", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            class Parent {
                @collection.property()
                name: string
                @collection.ref([User])
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const second = await new AnimalModel({ name: "Bingo" }).save()
            const user = await new UserModel({ name: "John", animals: [animal.id, second.id] }).save()
            const parent = await new ParentModel({ name: "John", children: [user.id] }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children/${user.id}`)
                .expect(200)
            const saved = await user.populate("animals").execPopulate()
            expect(saved).toMatchSnapshot()
            expect(body).toMatchSnapshot()
        })
        it("Should not populated multiple result", async () => {
            @collection()
            class Animal {
                @reflect.noop()
                name: string
            }
            @collection()
            class User {
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            @collection()
            class Parent {
                @collection.property()
                name: string
                @collection.ref([User])
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const second = await new AnimalModel({ name: "Bingo" }).save()
            const user = await new UserModel({ name: "John", animal: animal.id}).save()
            const secondUser = await new UserModel({ name: "Jane", animal: second.id}).save()
            const parent = await new ParentModel({ name: "John", children: [user.id, secondUser.id] }).save()
            const app = await createApp({ mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children`)
                .expect(200)
            expect(body).toMatchSnapshot()
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
        @collection()
        class User {
            id: string
            @reflect.noop()
            email: string
            @reflect.noop()
            name: string
            @collection.ref(x => [Animal])
            animals: Animal[]
        }
        @collection()
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
        @collection()
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
        @collection()
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
        @collection()
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
    it("Should transform relation into their appropriate ID type", async () => {
        @collection()
        class User {
            id: string
            @reflect.noop()
            email: string
            @reflect.noop()
            name: string
            @collection.ref(x => [Animal])
            animals: Animal[]
        }
        @collection()
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
        expect(body.paths["/users"].post).toMatchSnapshot()
    })
    it("Should transform relation into their appropriate ID type on one to one relation", async () => {

        @collection()
        class Animal {
            @reflect.noop()
            name: string
        }
        @collection()
        class User {
            id: string
            @reflect.noop()
            email: string
            @reflect.noop()
            name: string
            @collection.ref(Animal)
            animals: Animal
        }
        model(Animal)
        model(User)
        const app = await createApp({ mode: "production" })
        const { body } = await supertest(app.callback())
            .get("/swagger/swagger.json")
            .expect(200)
        expect(body.paths["/users"].post).toMatchSnapshot()
    })
})

describe("Repository", () => {
    it("Should able to use Repository in isolation", async () => {
        const helper = new MongooseHelper()
        helper.client.set("useNewUrlParser", true)
        helper.client.set("useUnifiedTopology", true)
        helper.client.set("useFindAndModify", false)
        const uri = await mong?.getUri()
        await helper.connect(uri!)
        @collection()
        class User {
            @reflect.noop()
            email: string
            @reflect.noop()
            name: string
        }
        const UserModel = helper.model(User)
        const repo = new MongooseRepository(User, helper)
        const inserted = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
        const saved = await UserModel.findById(inserted.id)
        expect(saved).toMatchSnapshot()
    })
    it("Should able to use One To Many Repository in isolation", async () => {
        const helper = new MongooseHelper()
        helper.client.set("useNewUrlParser", true)
        helper.client.set("useUnifiedTopology", true)
        helper.client.set("useFindAndModify", false)
        const uri = await mong?.getUri()
        await helper.connect(uri!)
        @collection()
        class User {
            @reflect.noop()
            email: string
            @reflect.noop()
            name: string
            @collection.ref(x => [Animal])
            animals: Animal[]
        }
        @collection()
        class Animal {
            @reflect.noop()
            name: string
        }
        const AnimalModel = helper.model(Animal)
        const UserModel = helper.model(User)
        const repo = new MongooseOneToManyRepository(User, Animal, "animals", helper)
        const parent = await new UserModel({ email: "john.doe@gmail.com", name: "John Doe" }).save()
        const inserted = await repo.insert(parent.id, { name: "Mimi" })
        const saved = await UserModel.findById(parent.id).populate("animals")
        expect(saved).toMatchSnapshot()
    })
})