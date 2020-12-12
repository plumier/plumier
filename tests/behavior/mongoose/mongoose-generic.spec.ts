import "@plumier/testing"

import {
    authorize,
    Class,
    Configuration,
    DefaultControllerGeneric,
    DefaultOneToManyControllerGeneric,
    entity,
    entityPolicy,
    postSave,
    preSave,
    route,
    val,
} from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import model, {
    collection,
    controller,
    models,
    MongooseControllerGeneric,
    MongooseFacility,
    MongooseHelper,
    MongooseOneToManyControllerGeneric,
    MongooseOneToManyRepository,
    MongooseRepository,
} from "@plumier/mongoose"
import reflect, { generic, noop, type } from "@plumier/reflect"
import { sign } from "jsonwebtoken"
import { MongoMemoryServer } from "mongodb-memory-server-global"
import mongoose from "mongoose"
import Plumier, { WebApiFacility } from "plumier"
import supertest from "supertest"
import { random } from "../helper"


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
beforeEach(async () => {
    await mongoose.connection.collections["users"]?.deleteMany({})
    await mongoose.connection.collections["animals"]?.deleteMany({})
    models.clear();
    (mongoose as any).models = {}
    mongoose.connection.models = {}
})

describe("CRUD", () => {
    function createApp(option?: Partial<Configuration>) {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new MongooseFacility())
            .set(option || {})
            .initialize()
    }
    it("Should able to use entity policy properly", async () => {
        @route.controller()
        @collection()
        class User {
            @collection.id()
            id: string
            @collection.property()
            name: string
            @authorize.read("Owner")
            email: string
        }
        const UserModel = model(User)
        const UserPolicy = entityPolicy(User).define("Owner", (ctx, id) => ctx.user?.userId === id)
        function createApp() {
            return new Plumier()
                .set(new WebApiFacility({ controller: User }))
                .set(new MongooseFacility())
                .set(new JwtAuthFacility({ secret: "lorem", authPolicies: UserPolicy }))
                .set({ mode: "production" })
                .initialize()
        }
        const john = await new UserModel({ name: "John", email: "john.doe@gmail.com" }).save()
        await new UserModel({ name: "Jane", email: "jane.doe@gmail.com" }).save()
        await new UserModel({ name: "Joe", email: "joe.doe@gmail.com" }).save()
        const johnToken = sign({ userId: john.id }, "lorem")
        const app = await createApp()
        const { body } = await supertest(app.callback())
            .get(`/users`)
            .set("Authorization", `Bearer ${johnToken}`)
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should able to update array", async () => {
        @collection()
        @route.controller()
        class Tag {
            @collection.id()
            id: string
            @noop()
            name: string
        }
        @collection()
        @route.controller()
        class User {
            @collection.id()
            id: string
            @reflect.noop()
            email: string
            @reflect.noop()
            name: string
            @collection.ref(x => [Tag])
            tags: Tag[]
        }
        const UserModel = model(User)
        const app = await createApp({ controller: [User, Tag], mode: "production" })
        const { body: tag } = await supertest(app.callback())
            .post("/tags")
            .send({ name: "lorem" })
            .expect(200)
        const { body: secondTag } = await supertest(app.callback())
            .post("/tags")
            .send({ name: "lorem" })
            .expect(200)
        const { body } = await supertest(app.callback())
            .post("/users")
            .send({ email: "john.doe@gmail.com", name: "John Doe", tags: [tag.id, secondTag.id] })
            .expect(200)
        const inserted = await UserModel.findById(body.id).populate("tags")
        expect(inserted).toMatchSnapshot()
    })
    describe("CRUD Function", () => {
        it("Should serve GET /users?offset&limit", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?offset=0&limit=20")
                .expect(200)
            expect(body.length).toBe(20)
        })
        it("Should serve GET /users?offset&limit with default value", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users")
                .expect(200)
            expect(body.length).toBe(50)
        })
        it("Should able to query by property GET /users?offset&limit&name", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                @authorize.filter()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            await repo.insert({ email: "jean.doe@gmail.com", name: "Jean Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?filter[email]=jean.doe@gmail.com")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with exact value GET /users?filter", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                @authorize.filter()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            await repo.insert({ email: "jean.doe@gmail.com", name: "Jean Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?filter[email]=jean.doe@gmail.com")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with partial value GET /users?filter", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                @authorize.filter()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            await repo.insert({ email: "jean.doe@gmail.com", name: "Jean Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?filter[email]=jean*")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should set partial validation on query GET /users?offset&limit&name", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @val.required()
                @reflect.noop()
                email: string
                @authorize.filter()
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            await repo.insert({ email: "jean.doe@gmail.com", name: "Juan Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?filter[name]=Juan+Doe")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should return empty array when no filter match GET /users?offset&limit&name", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @val.required()
                @reflect.noop()
                email: string
                @authorize.filter()
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            await repo.insert({ email: "jean.doe@gmail.com", name: "Juan Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?filter[name]=Jun")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to select by property GET /users?offset&limit&name", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @reflect.noop()
                age: number
                @authorize.filter()
                random: string
            }
            model(User)
            const random = new Date().getTime().toString(36)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            await Promise.all(Array(10).fill(1).map(x => repo.insert({ random, email: "john.doe@gmail.com", name: "John Doe", age: 21 })))
            const { body } = await supertest(app.callback())
                .get(`/users?filter[random]=${random}&select=name,age`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to order by property GET /users?offset&limit&name", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @reflect.noop()
                age: number
                @authorize.filter()
                random: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            const random = new Date().getTime().toString(36)
            await repo.insert({ random, email: "john.doe@gmail.com", name: "August", age: 23 })
            await repo.insert({ random, email: "john.doe@gmail.com", name: "Anne", age: 21 })
            await repo.insert({ random, email: "john.doe@gmail.com", name: "Borne", age: 21 })
            await repo.insert({ random, email: "john.doe@gmail.com", name: "John", age: 22 })
            await repo.insert({ random, email: "john.doe@gmail.com", name: "Juliet", age: 22 })
            const { body } = await supertest(app.callback())
                .get(`/users?filter[random]=${random}&order=age,-name&select=name,age`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should serve POST /users", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
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
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.id}`)
                .expect(200)
            expect(body.email).toBe("john.doe@gmail.com")
            expect(body.name).toBe("John Doe")
        })
        it("Should select by property GET /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @reflect.noop()
                age: number
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe", age: 21 })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.id}?select=name,age`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should ignore wrong property name on select GET /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @reflect.noop()
                age: number
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe", age: 21 })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.id}?select=name,age,otherProp`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should check prover mongodb id on GET /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            await supertest(app.callback())
                .get(`/users/lorem`)
                .expect(422)
        })
        it("Should throw 404 if not found GET /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            await supertest(app.callback())
                .get(`/users/5099803df3f4948bd2f98391`)
                .expect(404)
        })
        it("Should serve PUT /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
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
        it("Should able to clear property using null on PUT /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .put(`/users/${data.id}`)
                .send({ name: null })
                .expect(200)
            const modified = await repo.findById(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should check prover mongodb id on PUT /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            await supertest(app.callback())
                .put(`/users/lorem`)
                .send({ name: "Jane Doe" })
                .expect(422)
        })
        it("Should throw 404 if not found PUT /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            await supertest(app.callback())
                .put(`/users/5099803df3f4948bd2f98391`)
                .send({ name: "Jane Doe" })
                .expect(404)
        })
        it("Should serve PATCH /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
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
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            await supertest(app.callback())
                .patch(`/users/lorem`)
                .send({ name: "Jane Doe" })
                .expect(422)
        })
        it("Should set partial validation on PATCH /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @val.required()
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
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
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            await supertest(app.callback())
                .patch(`/users/5099803df3f4948bd2f98391`)
                .send({ name: "Jane Doe" })
                .expect(404)
        })
        it("Should serve DELETE /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .delete(`/users/${data.id}`)
                .expect(200)
            const modified = await repo.findById(body.id)
            expect(modified).toBeNull()
        })
        it("Should serve delete using deleteColumn DELETE /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.property({ default: false })
                @entity.deleteColumn()
                deleted: boolean
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .delete(`/users/${data.id}`)
                .expect(200)
            const modified = await repo.findById(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should check prover mongodb id on DELETE /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            await supertest(app.callback())
                .delete(`/users/lorem`)
                .expect(422)
        })
        it("Should throw 404 if not found DELETE /users/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            await supertest(app.callback())
                .delete(`/users/5099803df3f4948bd2f98391`)
                .expect(404)
        })
        it("Should able to use custom generic controller with custom repository", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
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
                .set({ mode: "production", controller: User, genericController: [MyCustomGeneric, DefaultOneToManyControllerGeneric] })
                .initialize()
            await supertest(app.callback())
                .post("/users")
                .send({ email: "john.doe@gmail.com", name: "John Doe" })
                .expect(200)
        })
        it("Should able to use request hook", async () => {
            const fn = jest.fn()
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @reflect.noop()
                password: string

                @preSave()
                hook() {
                    this.password = "HASH"
                }

                @postSave()
                afterSave(){
                    fn(this.id)
                }
            }
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            const { body } = await supertest(app.callback())
                .post("/users")
                .send({ email: "john.doe@gmail.com", name: "John Doe", password: "lorem ipsum" })
                .expect(200)
            const result = await repo.findById(body.id)
            expect(result).toMatchSnapshot()
            expect(mongoose.isValidObjectId(fn.mock.calls[0][0])).toBe(true)
        })
        it("Should serve data with native array", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @reflect.type([String])
                address: string[]
            }
            model(User)
            const app = await createApp({ controller: User, mode: "production" })
            const repo = new MongooseRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe", address: ["Address1", "Address2"] })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to create controller using builder", async () => {
            @collection()
            class User {
                @collection.id()
                id: number
                @noop()
                email: string
                @noop()
                name: string
            }
            const UsersController = controller(User).configure()
            const mock = console.mock()
            await createApp({ controller: [UsersController] })
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
        })
        it("Should able to disable some actions from controller builder", async () => {
            @collection()
            class User {
                @collection.id()
                id: number
                @noop()
                email: string
                @noop()
                name: string
            }
            const UsersController = controller(User).configure(c => {
                c.mutators().ignore()
            })
            const mock = console.mock()
            await createApp({ controller: [UsersController] })
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
        })
    })
    describe("Nested CRUD One to Many Function", () => {
        async function createUser<T>(type: Class<T>) {
            const userRepo = new MongooseRepository(type)
            const inserted = await userRepo.insert({ email: "john.doe@gmail.com", name: "John Doe" } as any)
            const saved = await userRepo.findById(inserted.id, [])
            return saved!
        }
        it("Should serve GET /users/:parentId/animals?offset&limit", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
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
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
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
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            await supertest(app.callback())
                .get(`/users/lorem/animals?offset=0&limit=20`)
                .expect(422)
        })
        it("Should find by name GET /users/:parentId/animals?offset&limit ", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                @authorize.filter()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await animalRepo.insert(user._id.toHexString(), { name: `Jojo` })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi ${i}` })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?filter[name]=Jojo`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should filter with exact value GET /users/:parentId/animals?filter ", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                @authorize.filter()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await animalRepo.insert(user._id.toHexString(), { name: `Jojo` })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi ${i}` })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?filter[name]=Jojo`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter one on one relation GET /users/:parentId/animals?filter ", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @authorize.filter()
                @collection.ref(x => User)
                user: User
            }
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const otherUser = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await animalRepo.insert(user._id.toHexString(), { name: `Jojo` })
            await animalRepo.insert(user._id.toHexString(), { name: `Jeju` })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(otherUser._id.toHexString(), { name: `Mimi ${i}` })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?filter[user]=${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should filter with partial value GET /users/:parentId/animals?filter ", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                @authorize.filter()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await animalRepo.insert(user._id.toHexString(), { name: `Jojo` })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi ${i}` })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?filter[name]=jo*`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should set partial validation on query on GET /users/:parentId/animals?offset&limit", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @val.required()
                @reflect.noop()
                name: string
                @reflect.noop()
                @authorize.filter()
                age: number
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await animalRepo.insert(user._id.toHexString(), { name: `Jojo`, age: 5 })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi ${i}`, age: 4 })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?filter[age]=5`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to select by properties GET /users/:parentId/animals?offset&limit ", async () => {
            @collection()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @reflect.noop()
                tag: string
                @reflect.noop()
                age: number
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await Promise.all(Array(10).fill(1).map((x, i) => animalRepo.insert(user._id.toHexString(), { name: `Mimi`, tag: "The tags", age: 21 })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?select=name,age`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to order by properties GET /users/:parentId/animals?offset&limit ", async () => {
            @collection()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @reflect.noop()
                tag: string
                @reflect.noop()
                age: number
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            await animalRepo.insert(user._id.toHexString(), { name: `Mimi`, age: 22 })
            await animalRepo.insert(user._id.toHexString(), { name: `Abas`, age: 21 })
            await animalRepo.insert(user._id.toHexString(), { name: `Alba`, age: 21 })
            await animalRepo.insert(user._id.toHexString(), { name: `Juliet`, age: 22 })
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals?order=-age,name&select=name,age`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should serve POST /users/:parentId/animals", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
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
        it("Should save navigation properties POST /users/:parentId/animals", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @collection.ref(x => User)
                user: User
            }
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const repo = new MongooseRepository(User)
            await supertest(app.callback())
                .post(`/users/${user._id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
            const parent = await repo.Model.findById(user._id).populate({
                path: "animals",
                populate: {
                    path: "user",
                    select: { animals: 0 }
                }
            })
            expect(parent).toMatchSnapshot()
        })
        it("Should not save navigation properties for non populate properties POST /users/:parentId/animals", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @reflect.noop()
                user: User
            }
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const repo = new MongooseRepository(User)
            await supertest(app.callback())
                .post(`/users/${user._id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
            const parent = await repo.Model.findById(user._id).populate({ path: "animals" })
            expect(parent).toMatchSnapshot()
        })
        it("Should check prover mongodb id on POST /users/:parentId/animals", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            await supertest(app.callback())
                .post(`/users/lorem/animals`)
                .send({ name: "Mimi" })
                .expect(422)
        })
        it("Should throw 404 if parent not found POST /users/:parentId/animals", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .post(`/users/5099803df3f4948bd2f98391/animals`)
                .send({ name: "Mimi" })
                .expect(404)
        })
        it("Should serve GET /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @collection.ref(x => User)
                user: User
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi` })
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals/${inserted.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to select by property GET /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @reflect.noop()
                tag: string
                @reflect.noop()
                age: number
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi`, tag: "The tag", age: 21 })
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals/${inserted.id}?select=age,tag`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to select one to many relation by property GET /users/:parentId", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @reflect.noop()
                tag: string
                @reflect.noop()
                age: number
            }
            model(Animal)
            const UserModel = model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi`, tag: "The tag", age: 21 })
            const usr = await UserModel.findById(user.id).populate("animals")
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}?select=name,email,animals`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should check prover mongodb id GET /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            await supertest(app.callback())
                .get(`/users/lorem/animals/ipsum`)
                .expect(422)
        })
        it("Should throw 404 if not found GET /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .get(`/users/${user._id}/animals/5099803df3f4948bd2f98391`)
                .expect(404)
        })
        it("Should serve PUT /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
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
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            await supertest(app.callback())
                .put(`/users/lorem/animals/lorem`)
                .send({ name: "Poe" })
                .expect(422)
        })
        it("Should throw 404 if not found PUT /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .put(`/users/${user._id}/animals/5099803df3f4948bd2f98391`)
                .send({ name: "Poe" })
                .expect(404)
        })
        it("Should serve PATCH /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
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
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            await supertest(app.callback())
                .patch(`/users/lorem/animals/lorem`)
                .send({ name: "Poe" })
                .expect(422)
        })
        it("Should set partial validation on PATCH /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @val.required()
                @reflect.noop()
                age: number
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
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
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .patch(`/users/${user._id}/animals/5099803df3f4948bd2f98391`)
                .send({ name: "Poe" })
                .expect(404)
        })
        it("Should serve DELETE /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi` })
            const { body } = await supertest(app.callback())
                .delete(`/users/${user._id}/animals/${inserted.id}`)
                .expect(200)
            const modified = await animalRepo.findById(body.id)
            expect(modified).toBeNull()
        })
        it("Should able to serve delete with deleteColumn DELETE /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @collection.property({ default: false })
                @entity.deleteColumn()
                deleted: boolean
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi` })
            const { body } = await supertest(app.callback())
                .delete(`/users/${user._id}/animals/${inserted.id}`)
                .expect(200)
            const modified = await animalRepo.findById(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should check prover mongodb id DELETE /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const { body } = await supertest(app.callback())
                .delete(`/users/lorem/animals/lorem`)
                .expect(422)
        })
        it("Should throw 404 if not found DELETE /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .delete(`/users/${user._id}/animals/5099803df3f4948bd2f98391`)
                .expect(404)
        })
        it("Should able to use custom generic controller with custom repository", async () => {
            @collection()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            class Animal {
                @collection.id()
                id: string
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
                .set({ mode: "production", controller: User, genericController: [DefaultControllerGeneric, MyCustomGeneric] })
                .initialize()
            await supertest(app.callback())
                .post(`/users/${user._id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
        })
        it("Should serve data with native array GET /users/:parentId/animals/:id", async () => {
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
                @collection.ref(x => User)
                user: User
                @type([String])
                tags: string[]
            }
            model(Animal)
            model(User)
            const app = await createApp({ controller: [User, Animal], mode: "production" })
            const user = await createUser(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const inserted = await animalRepo.insert(user._id.toHexString(), { name: `Mimi`, tags: ["Lorem", "Ipsum"] })
            const { body } = await supertest(app.callback())
                .get(`/users/${user._id}/animals/${inserted.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to create nested controller using controller builder", async () => {
            @collection()
            class User {
                @collection.id()
                id: number
                @noop()
                email: string
                @noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: number
                @noop()
                name: string
                @collection.ref(x => User)
                user: User
            }
            const UsersController = controller([User, Animal, "animals"]).configure()
            const mock = console.mock()
            await createApp({ controller: [UsersController] })
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
        })
        it("Should able to disable some actions using controller builder", async () => {
            @collection()
            class User {
                @collection.id()
                id: number
                @noop()
                email: string
                @noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: number
                @noop()
                name: string
                @collection.ref(x => User)
                user: User
            }
            const UsersController = controller([User, Animal, "animals"]).configure(c => {
                c.mutators().ignore()
            })
            const mock = console.mock()
            await createApp({ controller: [UsersController] })
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
        })
    })
    describe("One To One Function", () => {
        it("Should able to add with ID", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
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
            const app = await createApp({ controller: [Animal, User], mode: "production" })
            const { body } = await supertest(app.callback())
                .post(`/users`)
                .send({ name: "John", animal: animal.id })
                .expect(200)
            const saved = await UserModel.findById(body.id).populate("animal")
            expect(saved).toMatchSnapshot()
        })
        it("Should able to modify relation by ID", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
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
            const app = await createApp({ controller: [Animal, User], mode: "production" })
            const { body } = await supertest(app.callback())
                .patch(`/users/${user.id}`)
                .send({ animal: otherAnimal.id })
                .expect(200)
            const saved = await UserModel.findById(body.id).populate("animal")
            expect(saved).toMatchSnapshot()
        })
        it("Should populated on get by id", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
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
            const app = await createApp({ controller: [Animal, User], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should not populate if not selected on get by ID", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
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
            const user = await new UserModel({ email: "john.doe@gmail.com", name: "John", animal }).save()
            const app = await createApp({ controller: [Animal, User], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}?select=email,name`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should not populate if not selected on get many", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
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
            const user = await new UserModel({ email: "john.doe@gmail.com", name: "John", animal }).save()
            const app = await createApp({ controller: [Animal, User], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users?select=email,name`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should populated on multiple property", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
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
            const app = await createApp({ controller: [Animal, User], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should not populated one to many", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                @route.controller()
                animals: Animal[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const second = await new AnimalModel({ name: "Bingo" }).save()
            const user = await new UserModel({ name: "John", animals: [animal.id, second.id] }).save()
            const app = await createApp({ controller: [Animal, User], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}`)
                .expect(200)
            const saved = await user.populate("animals").execPopulate()
            expect(saved).toMatchSnapshot()
            expect(body).toMatchSnapshot()
        })
        it("Should populated multiple result", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
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
            await UserModel.deleteMany({})
            await new UserModel({ name: "John", animal }).save()
            await new UserModel({ name: "Jane", animal }).save()
            const app = await createApp({ controller: [Animal, User], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/users`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
    describe("One To One on Nested Object", () => {
        it("Should able to add with ID", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            @collection()
            @route.controller()
            class Parent {
                @collection.id()
                id: string
                @collection.property()
                name: string
                @collection.ref([User])
                @route.controller()
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const parent = await new ParentModel({ name: "John" }).save()
            const app = await createApp({ controller: [Parent, User, Animal], mode: "production" })
            const { body } = await supertest(app.callback())
                .post(`/parents/${parent.id}/children`)
                .send({ name: "John", animal: animal.id })
                .expect(200)
            const saved = await UserModel.findById(body.id).populate("animal")
            expect(saved).toMatchSnapshot()
        })
        it("Should able to modify relation by ID", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            @collection()
            @route.controller()
            class Parent {
                @collection.id()
                id: string
                @collection.property()
                name: string
                @collection.ref([User])
                @route.controller()
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const parent = await new ParentModel({ name: "John" }).save()
            const user = await new UserModel({ name: "John", animal }).save()
            const otherAnimal = await new AnimalModel({ name: "Bingo" }).save()
            const app = await createApp({ controller: [Parent, User, Animal], mode: "production" })
            const { body } = await supertest(app.callback())
                .patch(`/parents/${parent.id}/children/${user.id}`)
                .send({ animal: otherAnimal.id })
                .expect(200)
            const saved = await UserModel.findById(body.id).populate("animal")
            expect(saved).toMatchSnapshot()
        })
        it("Should populated on get by id", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            @collection()
            @route.controller()
            class Parent {
                @collection.id()
                id: string
                @collection.property()
                name: string
                @collection.ref([User])
                @route.controller()
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const user = await new UserModel({ name: "John", animal }).save()
            const parent = await new ParentModel({ name: "John", children: [user.id] }).save()
            const app = await createApp({ controller: [Parent, User, Animal], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should populated on multiple property", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
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
            @route.controller()
            class Parent {
                @collection.id()
                id: string
                @collection.property()
                name: string
                @collection.ref([User])
                @route.controller()
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const second = await new AnimalModel({ name: "Bingo" }).save()
            const user = await new UserModel({ name: "John", animal, secondAnimal: second }).save()
            const parent = await new ParentModel({ name: "John", children: [user.id] }).save()
            const app = await createApp({ controller: [Parent, User, Animal], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should not populated one to many", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => [Animal])
                animals: Animal[]
            }
            @collection()
            @route.controller()
            class Parent {
                @collection.id()
                id: string
                @collection.property()
                name: string
                @collection.ref([User])
                @route.controller()
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const second = await new AnimalModel({ name: "Bingo" }).save()
            const user = await new UserModel({ name: "John", animals: [animal.id, second.id] }).save()
            const parent = await new ParentModel({ name: "John", children: [user.id] }).save()
            const app = await createApp({ controller: [Parent, User, Animal], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children/${user.id}`)
                .expect(200)
            const saved = await user.populate("animals").execPopulate()
            expect(saved).toMatchSnapshot()
            expect(body).toMatchSnapshot()
        })
        it("Should populated multiple result", async () => {
            @collection()
            @route.controller()
            class Animal {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @collection.ref(x => Animal)
                animal: Animal
            }
            @collection()
            @route.controller()
            class Parent {
                @collection.id()
                id: string
                @collection.property()
                name: string
                @collection.ref([User])
                @route.controller()
                children: User[]
            }
            const AnimalModel = model(Animal)
            const UserModel = model(User)
            const ParentModel = model(Parent)
            const animal = await new AnimalModel({ name: "Mimi" }).save()
            const second = await new AnimalModel({ name: "Bingo" }).save()
            const user = await new UserModel({ name: "John", animal: animal.id }).save()
            const secondUser = await new UserModel({ name: "Jane", animal: second.id }).save()
            const parent = await new ParentModel({ name: "John", children: [user.id, secondUser.id] }).save()
            const app = await createApp({ controller: [Parent, User, Animal], mode: "production" })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
    describe("CRUD with versioning", () => {
        function createApp(option: Partial<Configuration>, helper: MongooseHelper) {
            return new Plumier()
                .set(new WebApiFacility())
                .set(new MongooseFacility({ helper }))
                .set(option || {})
                .initialize()
        }
        it("Should able to load entity with versioning", async () => {
            const mong = new MongooseHelper()
            @collection()
            @route.controller()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
            }
            mong.model(User)
            const mock = console.mock()
            await createApp({ controller: User }, mong)
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
        })

        it("Should able to load relation entity with versioning", async () => {
            const mong = new MongooseHelper()
            @collection()
            class User {
                @collection.id()
                id: string
                @reflect.noop()
                email: string
                @reflect.noop()
                name: string
                @route.controller()
                @collection.ref(x => [Tag])
                tags: Tag[]
            }
            @collection()
            class Tag {
                @collection.id()
                id: string
                @reflect.noop()
                name: string
            }
            mong.model(User)
            const mock = console.mock()
            await createApp({ controller: User }, mong)
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
        })
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
        @route.controller()
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
        @route.controller()
        class User {
            @reflect.noop()
            email: string
            @reflect.noop()
            name: string
            @collection.ref(x => [Animal])
            @route.controller()
            animals: Animal[]
        }
        @collection()
        @route.controller()
        class Animal {
            @collection.id()
            id: string
            @reflect.noop()
            name: string
        }
        const AnimalModel = helper.model(Animal)
        const UserModel = helper.model(User)
        const repo = new MongooseOneToManyRepository(User, Animal, "animals", helper)
        const parent = await new UserModel({ email: "john.doe@gmail.com", name: "John Doe" }).save()
        const inserted = await repo.insert(parent.id!, { name: "Mimi" })
        const saved = await UserModel.findById(parent.id).populate("animals")
        expect(saved).toMatchSnapshot()
    })

    describe("Repository", () => {
        @collection()
        class User {
            @collection.id()
            id: string
            @reflect.noop()
            email: string
            @reflect.noop()
            name: string
        }
        it("Should able to count result", async () => {
            const repo = new MongooseRepository(User)
            const email = `${random()}@gmail.com`
            await Promise.all([
                repo.insert({ email, name: "John Doe" }),
                repo.insert({ email, name: "John Doe" }),
                repo.insert({ email, name: "John Doe" })
            ])
            const count = await repo.count({ email: { type: "equal", value: email } })
            expect(count).toBe(3)
        })
    })

    describe("One To Many Repository", () => {
        @collection()
        class User {
            @collection.id()
            id: string
            @reflect.noop()
            name: string
            @collection.ref(x => [Animal])
            @route.controller()
            animals: Animal[]
        }
        @collection()
        class Animal {
            @collection.id()
            id: string
            @reflect.noop()
            name: string
        }
        it("Should able to count result", async () => {
            const userRepo = new MongooseRepository(User)
            const animalRepo = new MongooseOneToManyRepository(User, Animal, "animals")
            const email = `${random()}@gmail.com`
            const user = await userRepo.insert({ name: "John Doe" })
            await Promise.all([
                animalRepo.insert(user.id, { name: "Mimi" }),
                animalRepo.insert(user.id, { name: "Mimi" }),
                animalRepo.insert(user.id, { name: "Mimi" }),
                animalRepo.insert(user.id, { name: "Mommy" }),
            ])
            const count = await animalRepo.count(user.id, { name: { type: "equal", value: "Mimi" } })
            expect(count).toBe(3)
        })
    })
})

describe("Filter", () => {
    @route.controller()
    @collection()
    class Parent {
        @collection.id()
        id: string
        @authorize.filter()
        string: string
        @authorize.filter()
        number: number
        @authorize.filter()
        boolean: boolean
        @route.controller()
        @collection.ref(x => [Child])
        children: Child[]
    }
    class Child {
        @collection.id()
        id: string
        @authorize.filter()
        string: string
        @authorize.filter()
        number: number
        @authorize.filter()
        boolean: boolean
        @authorize.filter()
        @collection.ref(x => Parent)
        parent: Parent
    }
    function createApp(controller: Class = Parent) {
        return new Plumier()
            .set(new WebApiFacility({ controller }))
            .set(new MongooseFacility())
            .set({ mode: "production" })
            .initialize()
    }
    describe("Generic Controller", () => {
        beforeAll(async () => {
            const repo = new MongooseRepository(Parent)
            await repo.Model.deleteMany({})
            await repo.insert({ string: "lorem", number: 1, boolean: true })
            await repo.insert({ string: "ipsum", number: 2, boolean: false })
            await repo.insert({ string: "dolor", number: 3, boolean: false })
        })
        it("Should able to filter with exact value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/parents?filter[string]=lorem")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with range value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=2...3")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with not equal value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/parents?filter[boolean]=!true")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gte value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=>=2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gt value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=>2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lte value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=<=2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lt value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=<2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
    describe("One To Many Generic Controller", () => {
        let parent: { id: string };
        let otherParent: { id: string };
        beforeAll(async () => {
            const parentRepo = new MongooseRepository(Parent)
            const repo = new MongooseOneToManyRepository(Parent, Child, "children")
            await repo.Model.deleteMany({})
            parent = await parentRepo.insert({ string: "lorem", number: 1, boolean: true })
            otherParent = await parentRepo.insert({ string: "lorem", number: 1, boolean: true })
            await repo.insert(parent.id, { string: "lorem", number: 1, boolean: true })
            await repo.insert(parent.id, { string: "ipsum", number: 2, boolean: false })
            await repo.insert(parent.id, { string: "dolor", number: 3, boolean: false })
        })
        it("Should able to filter with exact value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[string]=lorem`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should give proper validation when asked to query equals on nested property", async () => {
            @route.controller()
            class Child {
                @collection.id()
                id: string
                @authorize.filter()
                string: string
                @authorize.filter()
                number: number
                @authorize.filter()
                boolean: boolean
                @authorize.filter()
                parent: Parent
            }
            const app = await createApp(Child)
            const { body } = await supertest(app.callback())
                .get(`/children?filter[parent]=${otherParent.id}`)
                .expect(422)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with range value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=2...3`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with not equal value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[boolean]=!true`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with not equal value on relation property", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[parent]=!${otherParent.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should give proper validation when asked to query not equals on nested property", async () => {
            @route.controller()
            class Child {
                @collection.id()
                id: string
                @authorize.filter()
                string: string
                @authorize.filter()
                number: number
                @authorize.filter()
                boolean: boolean
                @authorize.filter()
                parent: Parent
            }
            const app = await createApp(Child)
            const { body } = await supertest(app.callback())
                .get(`/children?filter[parent]=!${otherParent.id}`)
                .expect(422)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gte value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=>=2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gt value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=>2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lte value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=<=2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lt value", async () => {
            const app = await createApp()
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=<2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
})