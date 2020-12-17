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
import { generic, noop } from "@plumier/reflect"
import { SwaggerFacility } from "@plumier/swagger"
import {
    controller,
    TypeORMControllerGeneric,
    TypeORMFacility,
    TypeORMOneToManyControllerGeneric,
    TypeORMOneToManyRepository,
    TypeORMRepository,
} from "@plumier/typeorm"
import { sign } from "jsonwebtoken"
import Koa from "koa"
import Plumier, { WebApiFacility } from "plumier"
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
} from "typeorm"

import { random } from "../helper"
import { cleanup, getConn } from "./helper"


jest.setTimeout(20000)

describe("Filter", () => {
    @route.controller()
    @Entity()
    class Parent {
        @PrimaryGeneratedColumn()
        id: number

        @Column()
        @authorize.filter()
        string: string

        @Column()
        @authorize.filter()
        number: number

        @Column()
        @authorize.filter()
        boolean: boolean

        @route.controller()
        @OneToMany(x => Child, x => x.parent)
        children: Child[]
    }
    @Entity()
    class Child {
        @PrimaryGeneratedColumn()
        id: number

        @Column()
        @authorize.filter()
        string: string

        @Column()
        @authorize.filter()
        number: number

        @Column()
        @authorize.filter()
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
        const repo = new TypeORMOneToManyRepository(Parent, Child, "children")
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
                .get("/parents?filter[string]=lorem")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with range value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=2...3")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with not equal value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter[boolean]=!true")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gte value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=>=2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gt value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=>2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lte value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=<=2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lt value", async () => {
            const { body } = await supertest(app.callback())
                .get("/parents?filter[number]=<2")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
    describe("One To Many Generic Controller", () => {
        it("Should able to filter with exact value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[string]=lorem`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with range value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=2...3`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with not equal value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[boolean]=!true`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gte value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=>=2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with gt value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=>2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lte value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=<=2`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to filter with lt value", async () => {
            const { body } = await supertest(app.callback())
                .get(`/parents/${parent.id}/children?filter[number]=<2`)
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
        @route.controller()
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
        @route.controller()
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
        @route.controller()
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
    describe("CRUD Function", () => {
        it("Should serve GET /users?offset&limit", async () => {
            @Entity()
            @route.controller()
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
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                @authorize.filter()
                email: string
                @Column()
                name: string
            }
            const app = await createApp([User], { mode: "production" })
            const repo = getManager().getRepository(User)
            await repo.insert({ email: "jane.doe@gmail.com", name: "John Doe" })
            await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
            const { body } = await supertest(app.callback())
                .get("/users?filter[email]=jane.doe@gmail.com")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should filter by partial value GET /users?filter", async () => {
            @Entity()
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                @authorize.filter()
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
                .get("/users?filter[email]=jane*")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should set partial validation on GET /users?offset&limit", async () => {
            @Entity()
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                @authorize.filter()
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
                .get("/users?filter[email]=jane.dane@gmail.com")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to select by properties GET /users?offset&limit", async () => {
            @Entity()
            @route.controller()
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
        it("Should able to order by properties GET /users?offset&limit", async () => {
            @Entity()
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
        it("Should ignore wrong property name on select GET /users/:id", async () => {
            @Entity()
            @route.controller()
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
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should throw 404 if not found GET /users/:id", async () => {
            @Entity()
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            @generic.template("T", "TID")
            @generic.type("T", "TID")
            class MyCustomGeneric<T, TID> extends TypeORMControllerGeneric<T, TID>{
                constructor() { super(x => new TypeORMRepository(x)) }
            }
            const app = await new Plumier()
                .set(new WebApiFacility())
                .set(new TypeORMFacility({ connection: getConn([User]) }))
                .set({ mode: "production", controller: User, genericController: [MyCustomGeneric, DefaultOneToManyControllerGeneric] })
                .initialize()
            await supertest(app.callback())
                .post("/users")
                .send({ email: "john.doe@gmail.com", name: "John Doe" })
                .expect(200)
        })
        it("Should able to use request hook", async () => {
            const fn = jest.fn()
            @Entity()
            @route.controller()
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
        it("Should able to create controller using builder", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const UsersController = controller(User).configure()
            const mock = console.mock()
            await createApp([UsersController])
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
        })
        it("Should able to disable some actions from controller builder", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
            }
            const UsersController = controller(User).configure(c => {
                c.mutators().ignore()
            })
            const mock = console.mock()
            await createApp([UsersController])
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
        })
        it("Should able to use custom get one query", async () => {
            @Entity()
            @route.controller(c => {
                c.getOne().custom(UserDto, async ({ id }) => {
                    const repo = getManager().getRepository(User)
                    const user = await repo.findOne(id)
                    return { email: user!.email }
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
            const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
            const { body } = await supertest(app.callback())
                .get(`/users/${data.raw}`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to use custom get many query", async () => {
            @Entity()
            @route.controller(c => {
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                @authorize.filter()
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
                .get(`/users/${user.id}/animals?filter[name]=Jojo`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should filter with partial value GET /users/:parentId/animals?filter", async () => {
            @Entity()
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                @authorize.filter()
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
                .get(`/users/${user.id}/animals?filter[name]=Jojo*`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should set partial validation GET /users/:parentId/animals?offset&limit", async () => {
            @Entity()
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                @val.required()
                id: number
                @Column()
                @authorize.filter()
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
                .get(`/users/${user.id}/animals?filter[name]=Jeje`)
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to select by property GET /users/:parentId/animals?offset&limit", async () => {
            @Entity()
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            await supertest(app.callback())
                .post(`/users/${user.id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
            await supertest(app.callback())
                .post(`/users/${user.id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
            const inserted = await parentRepo.findOne(user.id, { relations: ["animals"] })
            expect(inserted).toMatchSnapshot()
        })
        it("Should throw 404 if parent not found POST /users/:parentId/animals", async () => {
            @Entity()
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
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
                @route.controller()
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
            @generic.template("P", "T", "PID", "TID")
            @generic.type("P", "T", "PID", "TID")
            class MyCustomGeneric<P, T, PID, TID> extends TypeORMOneToManyControllerGeneric<P, T, PID, TID>{
                constructor() { super((p, t, rel) => new TypeORMOneToManyRepository(p, t, rel)) }
            }
            const app = await new Plumier()
                .set(new WebApiFacility({ controller: User }))
                .set(new TypeORMFacility({ connection: getConn([User, Animal]) }))
                .set({ mode: "production", genericController: [DefaultControllerGeneric, MyCustomGeneric] })
                .initialize()
            const user = await createUser(User)
            await supertest(app.callback())
                .post(`/users/${user.id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
        })
        it("Should able to create nested controller using controller builder", async () => {
            @Entity()
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const UsersController = controller([User, Animal, "animals"]).configure()
            const mock = console.mock()
            await createApp([UsersController])
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
        })
        it("Should able to disable some actions using controller builder", async () => {
            @Entity()
            @route.controller()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                email: string
                @Column()
                name: string
                @OneToMany(x => Animal, x => x.user)
                @route.controller()
                animals: Animal[]
            }
            @Entity()
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: User
            }
            const UsersController = controller([User, Animal, "animals"]).configure(c => {
                c.mutators().ignore()
            })
            const mock = console.mock()
            await createApp([UsersController])
            expect(mock.mock.calls).toMatchSnapshot()
            console.mockClear()
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
                @route.controller(c => {
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
                @route.controller(c => {
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
    })
    describe("One To One Function", () => {
        it("Should able to add with ID", async () => {
            @Entity()
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: any
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => User, x => x.animals)
                user: any
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @route.controller()
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
            @route.controller()
            class Animal {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            @Entity()
            @route.controller()
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
            @route.controller()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => User, x => x.parent)
                @route.controller()
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
        @route.controller()
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
        @route.controller()
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
            const count = await repo.count({ email: { type: "equal", value: email } })
            expect(count).toBe(3)
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
                @route.controller()
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
            const userRepo = new TypeORMRepository(User)
            const animalRepo = new TypeORMOneToManyRepository(User, Animal, "animals")
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
