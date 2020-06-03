import { Class, Configuration, consoleLog, route } from "@plumier/core"
import model, { collection, CRUDMongooseFacility, models, OneToManyRepository, Repository } from "@plumier/mongoose"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { MongoMemoryServer } from "mongodb-memory-server-global"
import mongoose from "mongoose"
import supertest from "supertest"
import reflect from "tinspector"

jest.setTimeout(20000)

describe("TypeOrm", () => {
    beforeAll(async () => {
        const mongod = new MongoMemoryServer()
        await mongoose.connect(await mongod.getUri())
    })
    afterAll(async () => await mongoose.disconnect())
    beforeEach(() => {
        models.clear()
        mongoose.models = {}
        mongoose.connection.models = {}
    })
    describe("CRUD", () => {
        function createApp(option?: Partial<Configuration>) {
            return new Plumier()
                .set(new WebApiFacility())
                .set(new CRUDMongooseFacility())
                .set(option || {})
                .initialize()
        }
        describe("Route Generator", () => {
            it("Should generate routes properly", async () => {
                class User {
                    @reflect.noop()
                    email: string
                    @reflect.noop()
                    name: string
                }
                model(User)
                const mock = consoleLog.startMock()
                await createApp()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should generate routes from multiple entities", async () => {
                class User {
                    @reflect.noop()
                    email: string
                    @reflect.noop()
                    name: string
                }
                model(User)
                class SecondUser {
                    @reflect.noop()
                    email: string
                    @reflect.noop()
                    name: string
                }
                model(SecondUser)
                const mock = consoleLog.startMock()
                await createApp()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should generate routes from inheritance", async () => {
                class EntityBase {
                }
                class User extends EntityBase {
                    @reflect.noop()
                    email: string
                    @reflect.noop()
                    name: string
                }
                model(User)
                const mock = consoleLog.startMock()
                await createApp()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should generate one to many routes", async () => {
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
                const mock = consoleLog.startMock()
                await createApp()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should generate one to many with parameter properties", async () => {
                @collection()
                class Animal {
                    constructor(
                        public name: string
                    ) { }
                }
                @collection()
                class User {
                    constructor(
                        public name: string,
                        @collection.ref(x => [Animal])
                        public animals: Animal[]
                    ) { }
                }
                model(Animal)
                model(User)
                const mock = consoleLog.startMock()
                await createApp()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should generate one to many routes without callback", async () => {
                class Animal {
                    @reflect.noop()
                    name: string
                }
                class User {
                    @reflect.noop()
                    email: string
                    @reflect.noop()
                    name: string
                    @collection.ref([Animal])
                    animals: Animal[]
                }
                model(Animal)
                model(User)
                const mock = consoleLog.startMock()
                await createApp()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should able to override route", async () => {
                class User {
                    @reflect.noop()
                    email: string
                    @reflect.noop()
                    name: string
                }
                model(User)
                class UsersController {
                    readonly repo: Repository<User>
                    constructor() {
                        this.repo = new Repository(User)
                    }
                    @route.get(":id")
                    get(id: number) {
                        return this.repo.findById(id)
                    }
                }
                const mock = consoleLog.startMock()
                await new Plumier()
                    .set(new WebApiFacility({ controller: UsersController }))
                    .set(new CRUDMongooseFacility())
                    .initialize()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
        })
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
                const repo = new Repository(User)
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
                const repo = new Repository(User)
                await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
                const { body } = await supertest(app.callback())
                    .get("/users")
                    .expect(200)
                expect(body.length).toBe(50)
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
                const repo = new Repository(User)
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
                const repo = new Repository(User)
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
                const repo = new Repository(User)
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
                const repo = new Repository(User)
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
                const repo = new Repository(User)
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
                const userRepo = new Repository(type)
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
                const animalRepo = new OneToManyRepository(User, Animal, "animals")
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
                const animalRepo = new OneToManyRepository(User, Animal, "animals")
                await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi ${i}` })))
                const { body } = await supertest(app.callback())
                    .get(`/users/${user._id}/animals`)
                    .expect(200)
                expect(body.length).toBe(50)
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
                const repo = new Repository(User)
                await supertest(app.callback())
                    .post(`/users/${user._id}/animals`)
                    .send({ name: "Mimi" })
                    .expect(200)
                await supertest(app.callback())
                    .post(`/users/${user._id}/animals`)
                    .send({ name: "Mimi" })
                    .expect(200)
                const inserted = await repo.findById(user._id).populate("animals")
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
                const animalRepo = new OneToManyRepository(User, Animal, "animals")
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
                const animalRepo = new OneToManyRepository(User, Animal, "animals")
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
                const animalRepo = new OneToManyRepository(User, Animal, "animals")
                const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi` })
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
                const animalRepo = new OneToManyRepository(User, Animal, "animals")
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
})