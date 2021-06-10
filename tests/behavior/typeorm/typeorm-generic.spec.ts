import "@plumier/testing"

import {
    authorize,
    authPolicy,
    Class,
    Configuration,
    entity,
    entityPolicy,
    postSave,
    preSave,
    route,
    val,
} from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import reflect, { generic, noop, reflection } from "@plumier/reflect"
import { SwaggerFacility } from "@plumier/swagger"
import {
    createGenericControllerTypeORM,
    GenericController,
    normalizeEntity,
    TypeORMControllerGeneric,
    TypeORMFacility,
    TypeORMNestedControllerGeneric,
    TypeORMNestedRepository,
    TypeORMRepository,
} from "@plumier/typeorm"
import { sign } from "jsonwebtoken"
import Koa from "koa"
import Plumier, { WebApiFacility, genericController } from "plumier"
import supertest from "supertest"
import {
    Column,
    createConnection,
    Entity,
    getManager,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    getRepository
} from "typeorm"

import { random } from "../helper"
import { cleanup, getConn } from "./helper"
import { cleanupConsole } from "@plumier/testing"
import { Context } from "koa"


jest.setTimeout(20000)

describe("Filter", () => {
    @genericController()
    @Entity()
    class Parent {
        @PrimaryGeneratedColumn()
        id: number

        @Column()
        string: string

        @Column()
        number: number

        @Column()
        boolean: boolean

        @genericController()
        @OneToMany(x => Child, x => x.parent)
        children: Child[]
    }
    @Entity()
    class Child {
        @PrimaryGeneratedColumn()
        id: number

        @Column()
        string: string

        @Column()
        number: number

        @Column()
        boolean: boolean

        @ManyToOne(x => Parent, x => x.children)
        parent: Parent
    }
    function createApp() {
        return new Plumier()
            .set(new WebApiFacility({ controller: Parent }))
            .set(new TypeORMFacility({ connection: getConn([Parent, Child]) }))
            .set({ mode: "production" })
            .initialize()
    }
    let app: Koa
    let parent: { id: string };
    beforeAll(async () => {
        app = await createApp()
        const parentRepo = new TypeORMRepository(Parent)
        const repo = new TypeORMNestedRepository<Parent, Child>([Parent, "children"])
        await parentRepo.nativeRepository.delete({})
        await repo.nativeRepository.delete({})
        parent = await parentRepo.insert(<Parent>{ string: "lorem", number: 1, boolean: true })
        await parentRepo.insert(<Parent>{ string: "ipsum", number: 2, boolean: false })
        await parentRepo.insert(<Parent>{ string: "dolor", number: 3, boolean: false })
        await repo.insert(parent.id, <Child>{ string: "lorem", number: 1, boolean: true })
        await repo.insert(parent.id, <Child>{ string: "ipsum", number: 2, boolean: false })
        await repo.insert(parent.id, <Child>{ string: "dolor", number: 3, boolean: false })
    })
    afterAll(async () => { await cleanup() })
    describe("Generic Controller", () => {
        it("Should able to filter with exact value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter=string='lorem'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with range value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter=number=2...3")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with not equal value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter=boolean!=true")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gte value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter=number>=2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gt value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter=number>2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lte value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter=number<=2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lt value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter=number<2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with or", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter=number=1 or number=2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with and", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter=number=3 and boolean=false")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
    describe("One To Many Generic Controller", () => {
        it("Should able to filter with exact value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter=string='lorem'`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with range value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter=number=2...3`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with not equal value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter=boolean!=true`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gte value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter=number>=2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gt value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter=number>2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lte value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter=number<=2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lt value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter=number<2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
})

describe("CRUD", () => {
    function createApp(entities: Function[], opt?: Partial<Configuration>) {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new TypeORMFacility({ connection: getConn(entities) }))
            .set({ ...opt, controller: entities as any })
            .initialize()
    }
    afterEach(async () => {
        await cleanup()
    });
    it("Should able to use entity policy properly", async () => {
        @genericController()
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: string
            @Column()
            name: string
            @authorize.read("Owner")
            @Column()
            email: string
        }
        const UserPolicy = entityPolicy(User).define("Owner", (ctx, id) => ctx.user?.userId === id)
        function createApp() {
            return new Plumier()
                .set(new WebApiFacility({ controller: User }))
                .set(new TypeORMFacility({ connection: getConn([User]) }))
                .set(new JwtAuthFacility({ secret: "lorem", authPolicies: UserPolicy }))
                .set({ mode: "production" })
                .initialize()
        }
        const app = await createApp()
        const repo = getManager().getRepository(User)
        const john = await repo.save({ name: "John", email: "john.doe@gmail.com" })
        await repo.save({ name: "Jane", email: "jane.doe@gmail.com" })
        await repo.save({ name: "Joe", email: "joe.doe@gmail.com" })
        const johnToken = sign({ userId: john.id }, "lorem")
        const { body } = await supertest(app.callback())
            .get(`/users`)
            .set("Authorization", `Bearer ${johnToken}`)
            .expect(200)
        expect(body).toMatchSnapshot()
    })
    it("Should able to update array", async () => {
        @Entity()
        @genericController()
        class User {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            email: string
            @Column()
            name: string
            @OneToMany(x => Tag, x => x.user)
            tags: Tag[]
        }
        @Entity()
        @genericController()
        class Tag {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
            @ManyToOne(x => User, x => x.tags)
            user: User
        }
        const app = await createApp([User, Tag], { mode: "production" })
        const repo = getManager().getRepository(User)
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
        const inserted = await repo.findOne(body.id, { relations: ["tags"] })
        expect(inserted).toMatchSnapshot()
    })
    it("Should able to reflect generic controller factory", async () => {
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            email: string
            @Column()
            name: string
        }
        class MyController extends GenericController(User) {
            @noop()
            save(data: User, ctx: Context) {
                return super.save(data, ctx)
            }
        }
        const meta = reflection.getMethods(reflect(MyController))
        expect(meta).toMatchSnapshot()
    })
    it("Should able to reflect generic controller factory on nested controller", async () => {
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            email: string
            @Column()
            name: string
            @OneToMany(x => Animal, x => x.user)
            @genericController()
            animals: Animal[]
        }
        @Entity()
        class Animal {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
            @ManyToOne(x => User, x => x.animals)
            user: User
        }
        class MyController extends GenericController([User, "animals"]) {
            @noop()
            save(pid: number, data: Animal, ctx: Context) {
                return super.save(pid, data, ctx)
            }
        }
        const meta = reflection.getMethods(reflect(MyController))
        expect(meta).toMatchSnapshot()
    })
    it("Should able to create custom generic controller factory", async () => {
        class MyCustomGeneric<T, TID> extends TypeORMControllerGeneric<T, TID>{
            constructor() { super(x => new TypeORMRepository(x)) }
        }
        class MyCustomOnToManyGeneric<P, T, PID, TID> extends TypeORMNestedControllerGeneric<P, T, PID, TID>{
            constructor() { super((p) => new TypeORMNestedRepository(p)) }
        }
        const MyGenericController = createGenericControllerTypeORM([MyCustomGeneric, MyCustomOnToManyGeneric])
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            email: string
            @Column()
            name: string
            @OneToMany(x => Animal, x => x.user)
            animals: Animal[]
        }
        @Entity()
        class Animal {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
            @ManyToOne(x => User, x => x.animals)
            user: User
        }
        const UserController = MyGenericController(User)
        const UserAnimalController = MyGenericController([User, "animals"])
        const mock = console.mock()
        await createApp([UserController, UserAnimalController, User, Animal], { mode: "debug" })
        console.mockClear()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    describe("CRUD Function", () => {
        it("Should serve GET /users?offset&limit", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?offset=0&limit=20")
                .expect(200)
            expect(body.length).toBe(20)
        })
        it("Should serve GET /users?offset&limit with default value", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users")
                .expect(200)
            expect(body.length).toBe(50)
        })
        it("Should filter by exact value GET /users?filter", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await repo.insert({ email: "jane.doe@gmail.com", name: "John Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?filter=email='jane.doe@gmail.com'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should filter by partial value GET /users?filter", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await repo.insert({ email: "jane.doe@gmail.com", name: "John Doe" })
            await repo.insert({ email: "jane.moe@gmail.com", name: "John Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?filter=email='jane'*")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should set partial validation on GET /users?offset&limit", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                @val.required()
                email: string
                @Column()
                @val.required()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await repo.insert({ email: "jane.dane@gmail.com", name: "John Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?filter=email='jane.dane@gmail.com'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to select by properties GET /users?offset&limit", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await repo.insert({ email: "jane.doe@gmail.com", name: "John Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?select=id,email")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should not error when select without ID with entity policy GET /users?offset&limit", async () => {
            function createApp(entities: Function[], opt?: Partial<Configuration>) {
                return new Plumier()
                    .set(new WebApiFacility())
                    .set(new TypeORMFacility({ connection: getConn(entities) }))
                    .set(new JwtAuthFacility({
                        secret: "secret",
                        authPolicies: [
                            authPolicy().define("All", auth => true),
                            entityPolicy(User).define("Owner", (auth, id) => true)
                        ]
                    }))
                    .set({ ...opt, controller: entities as any })
                    .initialize()
            }
            const token = sign({ id: 123 }, "secret")
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                @authorize.read("Owner", "All")
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await repo.insert({ email: "jane.doe@gmail.com", name: "John Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?select=email,name")
                .set("Authorization", `Bearer ${token}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to order by properties GET /users?offset&limit", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @Column()
                age: number
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await repo.insert({ email: "john.doe@gmail.com", name: "August", age: 23 })
            await repo.insert({ email: "john.doe@gmail.com", name: "Anne", age: 21 })
            await repo.insert({ email: "john.doe@gmail.com", name: "Borne", age: 21 })
            await repo.insert({ email: "john.doe@gmail.com", name: "John", age: 22 })
            await repo.insert({ email: "john.doe@gmail.com", name: "Juliet", age: 22 })
            const { body } = await supertest(app.callback())
                .get("/users?order=age,-name&select=age,name")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should serve POST /users", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const { body } = await supertest(app.callback())
                .post("/users")
                .send({ email: "john.doe@gmail.com", name: "John Doe" })
                .expect(200)
            const inserted = await repo.findOne(body.id)
            expect(inserted!.email).toBe("john.doe@gmail.com")
            expect(inserted!.name).toBe("John Doe")
        })
        it("Should serve GET /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.raw}`)
                .expect(200)
            expect(body.email).toBe("john.doe@gmail.com")
            expect(body.name).toBe("John Doe")
        })
        it("Should able to select by properties GET /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @Column()
                age: number
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe", age: 21 })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.raw}?select=age,name`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should throw error on wrong property name on select GET /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @Column()
                age: number
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe", age: 21 })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.raw}?select=age,name,otherProp`)
                .expect(422)
            expect(body).toMatchSnapshot()
        })
        it("Should throw 404 if not found GET /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            await supertest(app.callback())
                .get(`/users/123`)
                .expect(404)
        })
        it("Should serve PUT /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .put(`/users/${data.raw}`)
                .send({ name: "Jane Doe" })
                .expect(200)
            const modified = await repo.findOne(body.id)
            expect(modified!.email).toBe("john.doe@gmail.com")
            expect(modified!.name).toBe("Jane Doe")
        })
        it("Should able to clear property if provided undefined on PUT /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column({ nullable: true })
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .put(`/users/${data.raw}`)
                .send({ email: "john@gmail.com", name: null })
                .expect(200)
            const modified = await repo.findOne(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should throw 404 if not found PUT /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            await supertest(app.callback())
                .put(`/users/123`)
                .send({ name: "Jane Doe" })
                .expect(404)
        })
        it("Should serve PATCH /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .patch(`/users/${data.raw}`)
                .send({ name: "Jane Doe" })
                .expect(200)
            const modified = await repo.findOne(body.id)
            expect(modified!.email).toBe("john.doe@gmail.com")
            expect(modified!.name).toBe("Jane Doe")
        })
        it("Should set partial validation on PATCH /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                @val.required()
                email: string
                @Column()
                @val.required()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .patch(`/users/${data.raw}`)
                .send({ name: "Jane Doe" })
                .expect(200)
            const modified = await repo.findOne(body.id)
            expect(modified!.email).toBe("john.doe@gmail.com")
            expect(modified!.name).toBe("Jane Doe")
        })
        it("Should throw 404 if not found PATCH /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            await supertest(app.callback())
                .patch(`/users/123`)
                .send({ name: "Jane Doe" })
                .expect(404)
        })
        it("Should serve DELETE /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .delete(`/users/${data.raw}`)
                .expect(200)
            const modified = await repo.findOne(body.id)
            expect(modified).toBeUndefined()
        })
        it("Should serve delete with deleteColumn DELETE /users/:id", async () => {

            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @entity.deleteColumn()
                @Column({ default: false })
                deleted: boolean;
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .delete(`/users/${data.raw}`)
                .expect(200)
            const modified = await repo.findOne(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should throw 404 if not found DELETE /users/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            await supertest(app.callback())
                .delete(`/users/123`)
                .expect(404)
        })
        it("Should able to use custom generic controller with custom repository", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            @generic.parameter("T", "TID")
            @generic.argument("T", "TID")
            class MyCustomGeneric<T, TID> extends TypeORMControllerGeneric<T, TID>{
                constructor() { super(x => new TypeORMRepository(x)) }
            }
            const app = await new Plumier()
                .set(new WebApiFacility())
                .set(new TypeORMFacility({ connection: getConn([User]) }))
                .set({ mode: "production", controller: User, genericController: [MyCustomGeneric, TypeORMNestedControllerGeneric] })
                .initialize()
            await supertest(app.callback())
                .post("/users")
                .send({ email: "john.doe@gmail.com", name: "John Doe" })
                .expect(200)
        })
        it("Should able to use request hook", async () => {
            const fn = jest.fn()
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @Column()
                password: string

                @preSave()
                hook() {
                    this.password = "HASH"
                }

                @postSave()
                afterSave() {
                    fn(this.id)
                }
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const { body } = await supertest(app.callback())
                .post("/users")
                .send({ email: "john.doe@gmail.com", name: "John Doe", password: "lorem ipsum" })
                .expect(200)
            const result = await repo.findOne(body.id)
            expect(result).toMatchSnapshot()
            expect(fn.mock.calls).toMatchSnapshot()
        })
        it("Should able to use custom get one query", async () => {
            @genericController(c => {
                c.getOne().custom(UserDto, async ({ id }) => {
                    const repo = getManager().getRepository(User)
                    const user = await repo.findOne(id)
                    return { email: user!.email }
                })
            })
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            class UserDto {
                @noop()
                email: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.raw}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to use custom get many query", async () => {
            @Entity()
            @genericController(c => {
                c.getMany().custom([UserDto], async ({ limit, offset }) => {
                    const repo = getManager().getRepository(User)
                    return repo.find({ skip: offset, take: limit })
                })
            })
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            class UserDto {
                @noop()
                email: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await Promise.all(Array(5).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?offset=0&limit=5")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to save relation with ID", async () => {
            function createApp(entities: Function[], opt?: Partial<Configuration>) {
                return new Plumier()
                    .set(new WebApiFacility())
                    .set(new TypeORMFacility({ connection: getConn(entities) }))
                    .set(new JwtAuthFacility({ secret: "lorem ipsum" }))
                    .set({ ...opt, controller: entities as any })
                    .initialize()
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            @Entity()
            @genericController(c => c.all().authorize("Public"))
            class Todo {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                message: string
                @ManyToOne(x => User)
                user: User
            }
            const app = await createApp([Todo, User], { mode: "production" })
            const userRepo = getManager().getRepository(User)
            const todoRepo = getManager().getRepository(Todo)
            const ids = await userRepo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .post("/todos")
                .send({ message: "Lorem ipsum", user: ids.raw })
                .expect(200)
            const inserted = await todoRepo.findOne(body.id, { relations: ["user"] })
            expect(inserted).toMatchSnapshot()
        })
        it("Should able to create generic controller dynamically", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const UserController = GenericController(User)
            const app = await createApp([UserController, User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?offset=0&limit=20")
                .expect(200)
            expect(body.length).toBe(20)
        })
        it("Should able to create generic controller dynamically from entity inherited from other entity", async () => {
            @Entity()
            class BaseEntity {
                @PrimaryGeneratedColumn()
                id: number
            }
            @Entity()
            class User extends BaseEntity {
                @Column()
                email: string
                @Column()
                name: string
            }
            const UserController = GenericController(User)
            const app = await createApp([UserController, User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?offset=0&limit=20")
                .expect(200)
            expect(body.length).toBe(20)
        })
        it("Should able to configure create generic controller", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const mock = console.mock()
            const UserController = GenericController(User, c => c.mutators().ignore())
            const app = await createApp([UserController], { mode: "debug" })
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
            console.mockClear()
        })
        it("Should able to extends the created generic controller", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            class UserController extends GenericController(User, c => c.mutators().ignore()) { }
            const mock = console.mock()
            const app = await createApp([UserController], { mode: "debug" })
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
            console.mockClear()
        })
    })
    describe("Nested CRUD One to Many Function", () => {
        async function createUser<T>(type: Class<T>): Promise<T> {
            const userRepo = getManager().getRepository<T>(type)
            const inserted = await userRepo.insert({ email: "john.doe@gmail.com", name: "John Doe" } as any)
            const saved = await userRepo.findOne(inserted.raw)
            return saved!
        }
        it("Should serve GET /users/:parentId/animals?offset&limit", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?offset=0&limit=20`)
                .expect(200)
            expect(body.length).toBe(20)
        })
        it("Should serve GET /users/:parentId/animals?offset&limit with default value", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals`)
                .expect(200)
            expect(body.length).toBe(50)
        })
        it("Should filter with exact value GET /users/:parentId/animals?filter", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await animalRepo.insert({ name: `Jojo`, user })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?filter=name='Jojo'`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should filter with partial value GET /users/:parentId/animals?filter", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await animalRepo.insert({ name: `Jojo Subejo`, user })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?filter=name='Jojo'*`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should set partial validation GET /users/:parentId/animals?offset&limit", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                @val.required()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            animalRepo.insert({ name: `Jeje`, user })
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?filter=name='Jeje'`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to select by property GET /users/:parentId/animals?offset&limit", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @Column()
                age: number
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi`, user, age: 21 })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?select=name,age`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to order by property GET /users/:parentId/animals?offset&limit", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @Column()
                age: number
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await animalRepo.insert({ user, name: `Mimi`, age: 22 })
            await animalRepo.insert({ user, name: `Abas`, age: 21 })
            await animalRepo.insert({ user, name: `Alba`, age: 21 })
            await animalRepo.insert({ user, name: `Juliet`, age: 22 })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?order=-age,name&select=name,age`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should serve POST /users/:parentId/animals", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const parentRepo = getManager().getRepository(User)
            const animalRepo = getManager().getRepository(Animal)
            const { body } = await supertest(app.callback())
                .post(`/users/${user.id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
            await supertest(app.callback())
                .post(`/users/${user.id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
            const inserted = await parentRepo.findOne(user.id, { relations: ["animals"] })
            const animal = await animalRepo.findOne(body.id, { relations: ["user"] })
            expect(inserted).toMatchSnapshot()
            expect(animal).toMatchSnapshot()

        })
        it("Should throw 404 if parent not found POST /users/:parentId/animals", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .post(`/users/123/animals`)
                .send({ name: "Mimi" })
                .expect(404)
        })
        it("Should serve GET /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            const inserted = await animalRepo.insert({ name: `Mimi`, user })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals/${inserted.raw}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to select by properties /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @Column()
                age: number
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            const inserted = await animalRepo.insert({ name: `Mimi`, age: 21, user })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals/${inserted.raw}?select=name,age`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should throw 404 if not found GET /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .get(`/users/${user.id}/animals/123`)
                .expect(404)
        })
        it("Should serve PUT /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            const inserted = await animalRepo.insert({ name: `Mimi`, user })
            const { body } = await supertest(app.callback())
                .put(`/users/${user.id}/animals/${inserted.raw}`)
                .send({ name: "Poe" })
                .expect(200)
            const modified = await animalRepo.findOne(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should throw 404 if not found PUT /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .put(`/users/${user.id}/animals/123`)
                .send({ name: "Poe" })
                .expect(404)
        })
        it("Should serve PATCH /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            const inserted = await animalRepo.insert({ name: `Mimi`, user })
            const { body } = await supertest(app.callback())
                .patch(`/users/${user.id}/animals/${inserted.raw}`)
                .send({ name: "Poe" })
                .expect(200)
            const modified = await animalRepo.findOne(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should set partial validation on PATCH /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                @val.required()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            const inserted = await animalRepo.insert({ name: `Mimi`, user })
            const { body } = await supertest(app.callback())
                .patch(`/users/${user.id}/animals/${inserted.raw}`)
                .send({ name: "Poe" })
                .expect(200)
            const modified = await animalRepo.findOne(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should throw 404 if not found PATCH /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .patch(`/users/${user.id}/animals/123`)
                .send({ name: "Poe" })
                .expect(404)
        })
        it("Should serve DELETE /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            const inserted = await animalRepo.insert({ name: `Mimi`, user })
            const { body } = await supertest(app.callback())
                .delete(`/users/${user.id}/animals/${inserted.raw}`)
                .expect(200)
            const modified = await animalRepo.findOne(body.id)
            expect(modified).toBeUndefined()
        })
        it("Should serve delete with deleteColumn DELETE /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
                @entity.deleteColumn()
                @Column({ default: false })
                deleted: boolean;
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            const inserted = await animalRepo.insert({ name: `Mimi`, user })
            const { body } = await supertest(app.callback())
                .delete(`/users/${user.id}/animals/${inserted.raw}`)
                .expect(200)
            const modified = await animalRepo.findOne(body.id)
            expect(modified).toMatchSnapshot()
        })
        it("Should throw 404 if not found DELETE /users/:parentId/animals/:id", async () => {
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            await supertest(app.callback())
                .delete(`/users/${user.id}/animals/123`)
                .expect(404)
        })
        it("Should able to use custom generic controller with custom repository", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            @generic.parameter("P", "T", "PID", "TID")
            @generic.argument("P", "T", "PID", "TID")
            class MyCustomGeneric<P, T, PID, TID> extends TypeORMNestedControllerGeneric<P, T, PID, TID>{
                constructor() { super((p) => new TypeORMNestedRepository(p)) }
            }
            const app = await new Plumier()
                .set(new WebApiFacility({ controller: User }))
                .set(new TypeORMFacility({ connection: getConn([User, Animal]) }))
                .set({ mode: "production", genericController: [TypeORMControllerGeneric, MyCustomGeneric] })
                .initialize()
            const user = await createUser(User)
            await supertest(app.callback())
                .post(`/users/${user.id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
        })
        it("Should able to use custom get one query", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController(c => {
                    c.getOne().custom(AnimalDto, async ({ id }) => {
                        const repo = getManager().getRepository(Animal)
                        const a = await repo.findOne(id, { relations: ["user"] })
                        return { name: a!.name, user: a!.user.name }
                    })
                })
                animals: Animal[]
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            class AnimalDto {
                @noop()
                name: string

                @noop()
                user: string
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            const inserted = await animalRepo.insert({ name: `Mimi`, user })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals/${inserted.raw}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to use custom get many query", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController(c => {
                    c.getMany().custom([AnimalDto], async ({ limit, offset }) => {
                        const repo = getManager().getRepository(Animal)
                        const animals = await repo.find({ relations: ["user"], skip: offset, take: limit })
                        return animals.map(a => ({ name: a.name, user: a.user.name }))
                    })
                })
                animals: Animal[]
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            class AnimalDto {
                @noop()
                name: string

                @noop()
                user: string
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?offset=0&limit=20`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to create generic controller dynamically", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                animals: Animal[]
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const UserAnimalController = GenericController([User, "animals"])
            const app = await createApp([UserAnimalController, User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?offset=0&limit=20`)
                .expect(200)
            expect(body.length).toBe(20)
        })
        it("Should able to configure create generic controller", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                animals: Animal[]
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const UserAnimalController = GenericController([User, "animals"], c => c.mutators().ignore())
            const mock = console.mock()
            const app = await createApp([UserAnimalController, User, Animal], { mode: "debug" })
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
            console.mockClear()
        })
        it("Should able to extends created generic controller", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                animals: Animal[]
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            class UserAnimalController extends GenericController([User, "animals"]) { }
            const mock = console.mock()
            const app = await createApp([UserAnimalController, User, Animal], { mode: "debug" })
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
            console.mockClear()
        })
        it("Should able to retrieve array relation from parent", async () => {
            function createApp(entities: Function[], opt?: Partial<Configuration>) {
                return new Plumier()
                    .set(new WebApiFacility())
                    .set(new TypeORMFacility({ connection: getConn(entities) }))
                    .set(new JwtAuthFacility({ secret: "secret", globalAuthorize: "Public" }))
                    .set({ ...opt, controller: entities as any })
                    .initialize()
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @genericController()
                animals: Animal[]
            }
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}?select=animals`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
    describe("Nested CRUD Many To One", () => {
        async function createUser<T>(type: Class<T>): Promise<T> {
            const userRepo = getManager().getRepository<T>(type)
            const inserted = await userRepo.insert({ email: "john.doe@gmail.com", name: "John Doe" } as any)
            const saved = await userRepo.findOne(inserted.raw)
            return saved!
        }
        it("Should able to use many to one relation without parent relation", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @genericController()
                @ManyToOne(x => User)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?offset=0&limit=20`)
                .expect(200)
            expect(body.length).toBe(20)
        })
        it("Should able to use many to one relation with parent relation", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                animals: Animal[]
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @genericController()
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const app = await createApp([User, Animal], { mode: "production" })
            const user = await createUser(User)
            const animalRepo = getManager().getRepository(Animal)
            await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}/animals?offset=0&limit=20`)
                .expect(200)
            expect(body.length).toBe(20)
        })
        it("Should able to use generic controller factory", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User)
                user: User
            }
            const UserAnimalController = GenericController([Animal, "user"])
            const mock = console.mock()
            const app = await createApp([UserAnimalController, User, Animal], { mode: "debug" })
            expect(cleanupConsole(mock.mock.calls)).toMatchSnapshot()
            console.mockClear()
        })
    })
    describe("One To One Function", () => {
        it("Should able to add with ID", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Animal)
                @JoinColumn()
                @JoinColumn()
                animal: Animal
            }
            const app = await createApp([Animal, User], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const { body } = await supertest(app.callback())
                .post(`/users`)
                .send({ name: "John", animal: animal.id })
                .expect(200)
            const saved = await UserModel.findOne(body.id, { relations: ["animal"] })
            expect(saved).toMatchSnapshot()
        })
        it("Should able to modify relation by ID", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Animal)
                @JoinColumn()
                animal: Animal
            }
            const app = await createApp([Animal, User], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const user = await UserModel.save({ name: "John", animal })
            const otherAnimal = await AnimalModel.save({ name: "Bingo" })
            const { body } = await supertest(app.callback())
                .patch(`/users/${user.id}`)
                .send({ animal: otherAnimal.id })
                .expect(200)
            const saved = await UserModel.findOne(body.id, { relations: ["animal"] })
            expect(saved).toMatchSnapshot()
        })
        it("Should populated on get by id", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Animal)
                @JoinColumn()
                animal: Animal
            }
            const app = await createApp([Animal, User], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const user = await UserModel.save({ name: "John", animal })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should populated on multiple property", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Animal)
                @JoinColumn()
                animal: Animal
                @OneToOne(x => Animal)
                @JoinColumn()
                secondAnimal: Animal
            }
            const app = await createApp([Animal, User], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const second = await AnimalModel.save({ name: "Bingo" })
            const user = await UserModel.save({ name: "John", animal, secondAnimal: second })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should not populated one to many", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: any
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                animals: Animal[]
            }
            const app = await createApp([Animal, User], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const second = await AnimalModel.save({ name: "Bingo" })
            const user = await UserModel.save({ name: "John", animals: [{ id: animal.id }, { id: second.id }] })
            const { body } = await supertest(app.callback())
                .get(`/users/${user.id}`)
                .expect(200)
            const saved = await UserModel.findOne(user.id, { relations: ["animals"] })
            expect(saved).toMatchSnapshot()
            expect(body).toMatchSnapshot()
        })
        it("Should populated multiple result", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => Animal)
                @JoinColumn()
                animal: Animal
            }
            const app = await createApp([Animal, User], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const animal = await AnimalModel.save({ name: "Mimi" })
            await UserModel.delete({})
            await UserModel.insert({ name: "John", animal: { id: animal.id } })
            await UserModel.insert({ name: "Jane", animal: { id: animal.id } })
            const { body } = await supertest(app.callback())
                .get(`/users`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
    describe("One To One on Nested Object", () => {
        it("Should able to add with ID", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Animal)
                @JoinColumn()
                animal: Animal
                @ManyToOne(x => Parent, x => x.children)
                parent: any
            }
            @Entity()
            @genericController()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @genericController()
                children: User[]
            }
            const app = await createApp([Animal, User, Parent], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const ParentModel = getManager().getRepository(Parent)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const parent = await ParentModel.save({ name: "John" })
            const { body } = await supertest(app.callback())
                .post(`/parents/${parent.id}/children`)
                .send({ name: "John", animal: animal.id })
                .expect(200)
            const saved = await UserModel.findOne(body.id, { relations: ["animal"] })
            expect(saved).toMatchSnapshot()
        })
        it("Should able to modify relation by ID", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Animal)
                @JoinColumn()
                animal: Animal
                @ManyToOne(x => Parent, x => x.children)
                parent: any
            }
            @Entity()
            @genericController()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @genericController()
                children: User[]
            }
            const app = await createApp([Animal, User, Parent], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const ParentModel = getManager().getRepository(Parent)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const user = await UserModel.save({ name: "John", animal })
            const parent = await ParentModel.save({ name: "John", children: [{ id: user.id }] })
            const otherAnimal = await AnimalModel.save({ name: "Bingo" })
            const { body } = await supertest(app.callback())
                .patch(`/parents/${parent.id}/children/${user.id}`)
                .send({ animal: otherAnimal.id })
                .expect(200)
            const saved = await UserModel.findOne(body.id, { relations: ["animal"] })
            expect(saved).toMatchSnapshot()
        })
        it("Should populated on get by id", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Animal)
                @JoinColumn()
                animal: Animal
                @ManyToOne(x => Parent, x => x.children)
                parent: any
            }
            @Entity()
            @genericController()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @genericController()
                children: User[]
            }
            const app = await createApp([Animal, User, Parent], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const ParentModel = getManager().getRepository(Parent)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const user = await UserModel.save({ name: "John", animal })
            const parent = await ParentModel.save({ name: "John", children: [{ id: user.id }] })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should populated on multiple property", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Animal)
                @JoinColumn()
                animal: Animal
                @OneToOne(x => Animal)
                @JoinColumn()
                secondAnimal: Animal
                @ManyToOne(x => Parent, x => x.children)
                parent: any
            }
            @Entity()
            @genericController()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @genericController()
                children: User[]
            }
            const app = await createApp([Animal, User, Parent], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const ParentModel = getManager().getRepository(Parent)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const second = await AnimalModel.save({ name: "Bingo" })
            const user = await UserModel.save({ name: "John", animal, secondAnimal: second })
            const parent = await ParentModel.save({ name: "John", children: [{ id: user.id }] })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children/${user.id}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should not populated one to many", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: any
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                animals: Animal[]
                @ManyToOne(x => Parent, x => x.children)
                parent: any
            }
            @Entity()
            @genericController()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @genericController()
                children: User[]
            }
            const app = await createApp([Animal, User, Parent], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const ParentModel = getManager().getRepository(Parent)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const second = await AnimalModel.save({ name: "Bingo" })
            const user = await UserModel.save({ name: "John", animals: [{ id: animal.id }, { id: second.id }] })
            const parent = await ParentModel.save({ name: "John", children: [{ id: user.id }] })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children/${user.id}`)
                .expect(200)
            const saved = await UserModel.findOne(body.id, { relations: ["animals"] })
            expect(saved).toMatchSnapshot()
            expect(body).toMatchSnapshot()
        })
        it("Should populated multiple result", async () => {
            @Entity()
            @genericController()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @genericController()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Animal)
                @JoinColumn()
                animal: Animal
                @ManyToOne(x => Parent, x => x.children)
                parent: any
            }
            @Entity()
            @genericController()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @genericController()
                children: User[]
            }
            const app = await createApp([Animal, User, Parent], { mode: "production" })
            const AnimalModel = getManager().getRepository(Animal)
            const UserModel = getManager().getRepository(User)
            const ParentModel = getManager().getRepository(Parent)
            const animal = await AnimalModel.save({ name: "Mimi" })
            const second = await AnimalModel.save({ name: "Bingo" })
            const user = await UserModel.save({ name: "John", animal: { id: animal.id } })
            const secondUser = await UserModel.save({ name: "Jane", animal: { id: second.id } })
            const parent = await ParentModel.save({ name: "John", children: [{ id: user.id }, { id: secondUser.id }] })
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
})

describe("Open API", () => {
    function createApp(entities: Function[], option?: Partial<Configuration>) {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new TypeORMFacility({ connection: getConn(entities) }))
            .set(new SwaggerFacility())
            .set({ mode: "production", controller: entities as any })
            .initialize()
    }
    afterEach(async () => {
        await cleanup()
    });
    it("Should mark id column as readonly", async () => {
        @Entity()
        @genericController()
        class User {
            @PrimaryGeneratedColumn()
            public id: number
            @Column()
            public userName: string
            @Column()
            public password: string
        }
        const app = await createApp([User])
        const { body } = await supertest(app.callback())
            .post("/swagger/swagger.json")
            .expect(200)
        expect(body.components.schemas.User).toMatchSnapshot()
    })
    it("Should mark guid column as readonly", async () => {
        @Entity()
        @genericController()
        class User {
            @PrimaryGeneratedColumn("uuid")
            public id: string
            @Column()
            public userName: string
            @Column()
            public password: string
        }
        const app = await createApp([User])
        const { body } = await supertest(app.callback())
            .post("/swagger/swagger.json")
            .expect(200)
        expect(body.components.schemas.User).toMatchSnapshot()
    })
    it("Should not error when generated schema that the controller created using generic controller factory", async () => {
        @Entity()
        class User {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            email: string
            @Column()
            name: string
            @OneToMany(x => Animal, x => x.user)
            animals: Animal[]
        }
        @Entity()
        class Animal {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
            @ManyToOne(x => User, x => x.animals)
            user: User
        }
        class UserEntity extends GenericController([User, "animals"]) { }
        const app = await createApp([User, Animal, UserEntity])
        const { body } = await supertest(app.callback())
            .post("/swagger/swagger.json")
            .expect(200)
        expect(body.components.schemas.User).toMatchSnapshot()
    })
})

describe("Repository", () => {
    afterEach(async () => {
        await cleanup()
    });

    describe("Repository", () => {
        it("Should able to count result", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            await createConnection(getConn([User]))
            const repo = new TypeORMRepository(User)
            const email = `${random()}@gmail.com`
            await Promise.all([
                repo.insert({ email, name: "John Doe" }),
                repo.insert({ email, name: "John Doe" }),
                repo.insert({ email, name: "John Doe" })
            ])
            const count = await repo.count({ email })
            expect(count).toBe(3)
        })
        it("Should count property when provided undefined query", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            await createConnection(getConn([User]))
            const repo = new TypeORMRepository(User)
            const email = `${random()}@gmail.com`
            await Promise.all([
                repo.insert({ email, name: "John Doe" }),
                repo.insert({ email, name: "John Doe" }),
                repo.insert({ email, name: "John Doe" })
            ])
            const count = await repo.count(undefined)
            expect(count).toBe(0)
        })
        it("Should able to get one", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            await createConnection(getConn([User]))
            const repo = new TypeORMRepository(User)
            const email = `john.doe@gmail.com`
            const ids = await repo.insert({ email, name: "John Doe" })
            const result = await repo.findById(ids.id)
            expect(result).toMatchSnapshot()
        })
    })

    describe("One To Many Repository", () => {
        it("Should able to count result", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: string
                @Column()
                name: string
                @OneToMany(x => Animal, a => a.user)
                animals: Animal[]
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: string
                @Column()
                name: string
                @ManyToOne(x => User, u => u.animals)
                user: User
            }
            await createConnection(getConn([User, Animal]))
            normalizeEntity(User)
            normalizeEntity(Animal)
            const userRepo = new TypeORMRepository(User)
            const animalRepo = new TypeORMNestedRepository<User, Animal>([User, "animals"])
            const email = `${random()}@gmail.com`
            const user = await userRepo.insert({ name: "John Doe" })
            await Promise.all([
                animalRepo.insert(user.id, { name: "Mimi" }),
                animalRepo.insert(user.id, { name: "Mimi" }),
                animalRepo.insert(user.id, { name: "Mimi" }),
                animalRepo.insert(user.id, { name: "Mommy" }),
            ])
            const count = await animalRepo.count(user.id, { name: "Mimi" })
            expect(count).toBe(3)
        })
    })

    describe("Many To One Repository", () => {
        it("Should handle insert properly", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: string
                @Column()
                name: string
            }
            @Entity()
            class Animal {
                @PrimaryGeneratedColumn()
                id: string
                @Column()
                name: string
                @ManyToOne(x => User)
                user: User
            }
            await createConnection(getConn([User, Animal]))
            normalizeEntity(User)
            normalizeEntity(Animal)
            const userRepo = new TypeORMRepository(User)
            const animalRepo = new TypeORMNestedRepository<User, Animal>([Animal, "user"])
            const user = await userRepo.insert({ name: "John Doe" })
            await Promise.all([
                animalRepo.insert(user.id, { name: "Mimi" }),
                animalRepo.insert(user.id, { name: "Mimi" }),
                animalRepo.insert(user.id, { name: "Mimi" }),
                animalRepo.insert(user.id, { name: "Mommy" }),
            ])
            const count = await animalRepo.count(user.id, { name: "Mimi" })
            expect(count).toBe(3)
        })
    })
})
