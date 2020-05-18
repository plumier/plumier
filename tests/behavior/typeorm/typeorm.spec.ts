import { Class, Configuration, consoleLog, route } from "@plumier/core"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { CRUDTypeORMFacility, TypeORMFacility } from "@plumier/typeorm"
import supertest from "supertest"
import reflect from "tinspector"
import {
    Column,
    Entity,
    getConnection,
    getManager,
    getMetadataArgsStorage,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    Repository,
} from "typeorm"

import { fixture } from "../helper"


describe("TypeOrm", () => {
    function createApp(entities: Function[]) {
        class UsersController {
            get() { }
        }
        return fixture(UsersController)
            .set(new TypeORMFacility({
                type: "sqlite",
                database: ":memory:",
                dropSchema: true,
                entities: entities,
                synchronize: true,
                logging: false
            }))
            .initialize()
    }
    afterEach(async () => {
        let conn = getConnection();
        const storage = getMetadataArgsStorage();
        (storage as any).tables = [];
        (storage as any).columns = [];
        (storage as any).relations = [];
        if (conn.isConnected)
            await conn.close();
    });
    describe("Facility", () => {
        function extract(type: Class) {
            return reflect(type).properties.map(({ name, type }) => ({ name, type }))
        }
        it("Should able to reflect entity properties", async () => {
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @Column()
                num: number = 200
            }
            await createApp([MyEntity])
            expect(extract(MyEntity)).toMatchSnapshot()
        })
        it("Should able to reflect entity properties with inheritance", async () => {
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
            }
            @Entity()
            class ChildEntity extends MyEntity {
                @Column()
                num: number = 200
            }
            await createApp([ChildEntity, MyEntity])
            expect(extract(ChildEntity)).toMatchSnapshot()
        })
        it("Should able to reflect one to one relation", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number = 123
                @Column()
                name: string = "mimi"
            }
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @OneToOne(x => Parent)
                @JoinColumn()
                parent: Parent = {} as any
            }
            await createApp([MyEntity, Parent])
            expect(extract(MyEntity)).toMatchSnapshot()
        })
        it("Should able to reflect one to one relation with inverse relation", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number = 123
                @Column()
                name: string = "mimi"
            }
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @OneToOne(x => Parent)
                @JoinColumn()
                parent: Parent
            }
            await createApp([Parent, MyEntity])
            expect(extract(MyEntity)).toMatchSnapshot()
        })
        it("Should able to reflect one to many relation", async () => {
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @OneToMany(x => Child, x => x.entity)
                parent: Child[]
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => MyEntity, x => x.parent)
                entity: MyEntity
            }
            await createApp([MyEntity, Child])
            expect(extract(MyEntity)).toMatchSnapshot()
            expect(extract(Child)).toMatchSnapshot()
        })
        it("Should able to reflect many to many relation", async () => {
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @ManyToMany(x => Child)
                @JoinTable()
                parent: Child[]
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
            }
            await createApp([MyEntity, Child])
            expect(extract(MyEntity)).toMatchSnapshot()
        })
        it("Should throw error when no option specified", async () => {
            const fn = jest.fn()
            class UsersController {
                get() { }
            }
            try {
                await fixture(UsersController)
                    .set(new TypeORMFacility())
                    .initialize()
            }
            catch (e) {
                fn(e)
            }
            expect(fn.mock.calls).toMatchSnapshot()
        })
    })
    describe("CRUD", () => {
        function createApp(entities: Function[], option?: Partial<Configuration>) {
            return new Plumier()
                .set(new WebApiFacility())
                .set(new CRUDTypeORMFacility({
                    type: "sqlite",
                    database: ":memory:",
                    dropSchema: true,
                    entities: entities,
                    synchronize: true,
                    logging: false
                }))
                .set(option || {})
                .initialize()
        }
        describe("Route Generator", () => {
            it("Should generate routes properly", async () => {
                @Entity()
                class User {
                    @PrimaryGeneratedColumn()
                    id: number
                    @Column()
                    email: string
                    @Column()
                    name: string
                }
                const mock = consoleLog.startMock()
                await createApp([User])
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should generate routes from multiple entities", async () => {
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
                class SecondUser {
                    @PrimaryGeneratedColumn()
                    id: number
                    @Column()
                    email: string
                    @Column()
                    name: string
                }
                const mock = consoleLog.startMock()
                await createApp([User])
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should generate routes from inheritance", async () => {
                class EntityBase {
                    @PrimaryGeneratedColumn()
                    id: number
                }
                @Entity()
                class User extends EntityBase {
                    @Column()
                    email: string
                    @Column()
                    name: string
                }
                const mock = consoleLog.startMock()
                await createApp([User])
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it.only("Should generate nested routes", async () => {
                @Entity()
                class User {
                    @PrimaryGeneratedColumn()
                    id: number
                    @Column()
                    email: string
                    @Column()
                    name: string
                    @OneToMany(x => Animal, x => x.user)
                    animals:Animal[]
                }
                @Entity()
                class Animal {
                    @PrimaryGeneratedColumn()
                    id: number
                    @Column()
                    name: string
                    @ManyToOne(x => User, x => x.animals)
                    user:User
                }
                const mock = consoleLog.startMock()
                await createApp([User, Animal])
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should able to override route", async () => {
                @Entity()
                class User {
                    @PrimaryGeneratedColumn()
                    id: number
                    @Column()
                    email: string
                    @Column()
                    name: string
                }
                class UsersController {
                    readonly repo: Repository<User>
                    constructor() {
                        this.repo = getManager().getRepository(User)
                    }
                    @route.get(":id")
                    get(id: number) {
                        return this.repo.findOne(id)
                    }
                }
                const mock = consoleLog.startMock()
                await new Plumier()
                    .set(new WebApiFacility({ controller: UsersController }))
                    .set(new CRUDTypeORMFacility({
                        type: "sqlite",
                        database: ":memory:",
                        dropSchema: true,
                        entities: [User],
                        synchronize: true,
                        logging: false
                    }))
                    .initialize()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
        })
        describe("CRUD Function", () => {
            it("Should serve GET /users?offset&limit", async () => {
                @Entity()
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
            it("Should serve POST /users", async () => {
                @Entity()
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
            it("Should serve PUT /users/:id", async () => {
                @Entity()
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
            it("Should serve PATCH /users/:id", async () => {
                @Entity()
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
            it("Should serve DELETE /users/:id", async () => {
                @Entity()
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
        })
    })
})


