import { Class, Configuration, consoleLog, GenericController, RepoBaseGenericController, route, val, RepoBaseGenericOneToManyController, GenericOneToManyController } from "@plumier/core"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { CRUDTypeORMFacility, TypeORMFacility, TypeORMRepository, TypeORMOneToManyRepository } from "@plumier/typeorm"
import supertest from "supertest"
import reflect, { generic } from "tinspector"
import {
    Column,
    ConnectionOptions,
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

jest.setTimeout(20000)

function getConn(entities: Function[]): ConnectionOptions {
    return {
        type: "sqlite",
        database: ":memory:",
        dropSchema: true,
        entities: entities,
        synchronize: true,
        logging: false
    }
}

describe("TypeOrm", () => {
    function createApp(entities: Function[]) {
        class UsersController {
            get() { }
        }
        return fixture(UsersController)
            .set(new TypeORMFacility({ connection: getConn(entities) }))
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
            const repo = getManager().getRepository(MyEntity)
            const inserted = await repo.insert({ num: 123 })
            const result = await repo.findOne(inserted.raw)
            expect(result).toMatchSnapshot()
            expect(extract(MyEntity)).toMatchSnapshot()
        })
        it("Should able to reflect entity properties with type overridden", async () => {
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @Column({ type: Number })
                num: number = 200
            }
            await createApp([MyEntity])
            const repo = getManager().getRepository(MyEntity)
            const inserted = await repo.insert({ num: 123 })
            const result = await repo.findOne(inserted.raw)
            expect(result).toMatchSnapshot()
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
            const repo = getManager().getRepository(ChildEntity)
            const inserted = await repo.insert({ num: 123 })
            const result = await repo.findOne(inserted.raw)
            expect(result).toMatchSnapshot()
            expect(extract(ChildEntity)).toMatchSnapshot()
        })
        it("Should able to reflect one to one relation", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => MyEntity, x => x.parent)
                entity: any
            }
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Parent)
                @JoinColumn()
                parent: Parent
            }
            await createApp([MyEntity, Parent])
            const parentRepo = getManager().getRepository(Parent)
            const repo = getManager().getRepository(MyEntity)
            const parent = await parentRepo.insert({ name: "Mimi" })
            const inserted = await repo.insert({ name: "Poo" })
            await parentRepo.createQueryBuilder().relation("entity").of(parent.raw).set(inserted.raw)
            const result = await parentRepo.findOne(parent.raw, { relations: ["entity"] })
            expect(result).toMatchSnapshot()
            expect(extract(MyEntity)).toMatchSnapshot()
            expect(extract(Parent)).toMatchSnapshot()
        })
        it("Should able to reflect one to many relation", async () => {
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @Column()
                name: string
                @OneToMany(x => Child, x => x.entity)
                children: Child[]
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => MyEntity, x => x.children)
                entity: MyEntity
            }
            await createApp([MyEntity, Child])
            const parentRepo = getManager().getRepository(MyEntity)
            const repo = getManager().getRepository(Child)
            const parent = await parentRepo.insert({ name: "Mimi" })
            const inserted = await repo.insert({ name: "Poo" })
            await parentRepo.createQueryBuilder().relation("children").of(parent.raw).add(inserted.raw)
            const result = await parentRepo.findOne(parent.raw, { relations: ["children"] })
            expect(result).toMatchSnapshot()
            expect(extract(MyEntity)).toMatchSnapshot()
            expect(extract(Child)).toMatchSnapshot()
        })
        it("Should able to reflect many to many relation", async () => {
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @Column()
                name: string
                @ManyToMany(x => Child, x => x.parents)
                @JoinTable()
                children: Child[]
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToMany(x => MyEntity, x => x.children)
                parents: MyEntity[]
            }
            await createApp([MyEntity, Child])
            const parentRepo = getManager().getRepository(MyEntity)
            const repo = getManager().getRepository(Child)
            const parent = await parentRepo.insert({ name: "Mimi" })
            const inserted = await repo.insert({ name: "Poo" })
            await parentRepo.createQueryBuilder().relation("children").of(parent.raw).add(inserted.raw)
            const result = await parentRepo.findOne(parent.raw, { relations: ["children"] })
            expect(result).toMatchSnapshot()
            expect(extract(MyEntity)).toMatchSnapshot()
            expect(extract(Child)).toMatchSnapshot()
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
                    connection: getConn(entities)
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
            it("Should generate one to many routes", async () => {
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
                const mock = consoleLog.startMock()
                await createApp([User, Animal])
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should not generate many to many routes", async () => {
                @Entity()
                class User {
                    @PrimaryGeneratedColumn()
                    id: number
                    @Column()
                    email: string
                    @Column()
                    name: string
                    @ManyToMany(x => Animal, x => x.user)
                    @JoinTable()
                    animals: Animal[]
                }
                @Entity()
                class Animal {
                    @PrimaryGeneratedColumn()
                    id: number
                    @Column()
                    name: string
                    @ManyToMany(x => User, x => x.animals)
                    user: User[]
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
                        connection: {
                            type: "sqlite",
                            database: ":memory:",
                            dropSchema: true,
                            entities: [User],
                            synchronize: true,
                            logging: false
                        }
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
            it("Should find by query GET /users?offset&limit", async () => {
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
                await repo.insert({ email: "jane.doe@gmail.com", name: "John Doe" })
                await Promise.all(Array(50).fill(1).map(x => repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })))
                const { body } = await supertest(app.callback())
                    .get("/users?email=jane.doe@gmail.com")
                    .expect(200)
                expect(body).toMatchSnapshot()
            })
            it("Should set partial validation on GET /users?offset&limit", async () => {
                @Entity()
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
                    .get("/users?email=jane.dane@gmail.com")
                    .expect(200)
                expect(body).toMatchSnapshot()
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
            it("Should throw 404 if not found GET /users/:id", async () => {
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
                await supertest(app.callback())
                    .get(`/users/123`)
                    .expect(404)
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
            it("Should throw 404 if not found PUT /users/:id", async () => {
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
                await supertest(app.callback())
                    .put(`/users/123`)
                    .send({ name: "Jane Doe" })
                    .expect(404)
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
            it("Should set partial validation on PATCH /users/:id", async () => {
                @Entity()
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
            it("Should throw 404 if not found DELETE /users/:id", async () => {
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
                await supertest(app.callback())
                    .delete(`/users/123`)
                    .expect(404)
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
                const app = await createApp([User, Animal], { mode: "production" })
                const user = await createUser(User)
                const animalRepo = getManager().getRepository(Animal)
                await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
                const { body } = await supertest(app.callback())
                    .get(`/users/${user.id}/animals`)
                    .expect(200)
                expect(body.length).toBe(50)
            })
            it("Should find by query GET /users/:parentId/animals?offset&limit", async () => {
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
                const app = await createApp([User, Animal], { mode: "production" })
                const user = await createUser(User)
                const animalRepo = getManager().getRepository(Animal)
                animalRepo.insert({ name: `Jojo`, user })
                await Promise.all(Array(50).fill(1).map((x, i) => animalRepo.insert({ name: `Mimi ${i}`, user })))
                const { body } = await supertest(app.callback())
                    .get(`/users/${user.id}/animals?name=Jojo`)
                    .expect(200)
                expect(body).toMatchSnapshot()
            })
            it("Should set partial validation GET /users/:parentId/animals?offset&limit", async () => {
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
                    .get(`/users/${user.id}/animals?name=Jeje`)
                    .expect(200)
                expect(body).toMatchSnapshot()
            })
            it("Should serve POST /users/:parentId/animals", async () => {
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
                const app = await createApp([User, Animal], { mode: "production" })
                const user = await createUser(User)
                await supertest(app.callback())
                    .post(`/users/123/animals`)
                    .send({ name: "Mimi" })
                    .expect(404)
            })
            it("Should serve GET /users/:parentId/animals/:id", async () => {
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
                const app = await createApp([User, Animal], { mode: "production" })
                const user = await createUser(User)
                const animalRepo = getManager().getRepository(Animal)
                const inserted = await animalRepo.insert({ name: `Mimi`, user })
                const { body } = await supertest(app.callback())
                    .get(`/users/${user.id}/animals/${inserted.raw}`)
                    .expect(200)
                expect(body).toMatchSnapshot()
            })
            it("Should throw 404 if not found GET /users/:parentId/animals/:id", async () => {
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
                const app = await createApp([User, Animal], { mode: "production" })
                const user = await createUser(User)
                await supertest(app.callback())
                    .get(`/users/${user.id}/animals/123`)
                    .expect(404)
            })
            it("Should serve PUT /users/:parentId/animals/:id", async () => {
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
                const app = await createApp([User, Animal], { mode: "production" })
                const user = await createUser(User)
                await supertest(app.callback())
                    .put(`/users/${user.id}/animals/123`)
                    .send({ name: "Poe" })
                    .expect(404)
            })
            it("Should serve PATCH /users/:parentId/animals/:id", async () => {
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
                const app = await createApp([User, Animal], { mode: "production" })
                const user = await createUser(User)
                await supertest(app.callback())
                    .patch(`/users/${user.id}/animals/123`)
                    .send({ name: "Poe" })
                    .expect(404)
            })
            it("Should serve DELETE /users/:parentId/animals/:id", async () => {
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
            it("Should throw 404 if not found DELETE /users/:parentId/animals/:id", async () => {
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
                const app = await createApp([User, Animal], { mode: "production" })
                const user = await createUser(User)
                await supertest(app.callback())
                    .delete(`/users/${user.id}/animals/123`)
                    .expect(404)
            })
        })
        describe("Custom Generic Controller", () => {
            it("Should able to change generic controller by extending repo base generic controller", async () => {
                @Entity()
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
                class MyGenericController<T, TID> extends RepoBaseGenericController<T, TID> {
                    constructor() {
                        super(x => new TypeORMRepository(x))
                    }
                }
                const mock = consoleLog.startMock()
                const app = await new Plumier()
                    .set(new WebApiFacility())
                    .set(new CRUDTypeORMFacility({ genericController: MyGenericController, connection: getConn([User]) }))
                    .initialize()
                const repo = getManager().getRepository(User)
                const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
                const { body } = await supertest(app.callback())
                    .get(`/users/${data.raw}`)
                    .expect(200)
                expect(mock.mock.calls).toMatchSnapshot()
                expect(body).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should able to ignore action by extending repo base generic controller", async () => {
                @Entity()
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
                class MyGenericController<T, TID> extends RepoBaseGenericController<T, TID> {
                    constructor() {
                        super(x => new TypeORMRepository(x))
                    }
                    @route.ignore()
                    list() { return {} as any }
                }
                const mock = consoleLog.startMock()
                const app = await new Plumier()
                    .set(new WebApiFacility())
                    .set(new CRUDTypeORMFacility({ genericController: MyGenericController, connection: getConn([User]) }))
                    .initialize()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should able to change generic controller using custom controller", async () => {
                @Entity()
                class User {
                    @PrimaryGeneratedColumn()
                    id: number
                    @Column()
                    email: string
                    @Column()
                    name: string
                }
                @generic.template("T", "TID")
                class MyGenericController<T, TID> extends GenericController<T, TID> {
                    repo: Repository<T>
                    constructor() {
                        super()
                        this.repo = getManager().getRepository(this.entityType)
                    }
                    @route.get(":id")
                    get(id: number) {
                        return this.repo.findOne(id)
                    }
                }
                const mock = consoleLog.startMock()
                const app = await new Plumier()
                    .set(new WebApiFacility())
                    .set(new CRUDTypeORMFacility({ genericController: MyGenericController, connection: getConn([User]) }))
                    .initialize()
                const repo = getManager().getRepository(User)
                const data = await repo.insert({ email: "john.doe@gmail.com", name: "John Doe" })
                const { body } = await supertest(app.callback())
                    .get(`/users/${data.raw}`)
                    .expect(200)
                expect(mock.mock.calls).toMatchSnapshot()
                expect(body).toMatchSnapshot()
                consoleLog.clearMock()
            })
        })
        describe("Custom Generic One To Many Controller", () => {
            it("Should able to change generic controller by extending repo base generic controller", async () => {
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
                @generic.template("P", "T", "PID", "TID")
                @generic.type("P", "T", "PID", "TID")
                class MyGenericController<P, T, PID, TID> extends RepoBaseGenericOneToManyController<P, T, PID, TID> {
                    constructor() {
                        super((p, x, r) => new TypeORMOneToManyRepository(p, x, r))
                    }
                }
                const mock = consoleLog.startMock()
                const app = await new Plumier()
                    .set(new WebApiFacility())
                    .set(new CRUDTypeORMFacility({ connection: getConn([User, Animal]), genericOneToManyController: MyGenericController }))
                    .initialize()
                const parentRepo = getManager().getRepository(User)
                const repo = getManager().getRepository(Animal)
                const user = await parentRepo.save({ email: "john.doe@gmail.com", name: "John Doe" })
                const animal = await repo.insert({ name: "Mimi", user })
                const { body } = await supertest(app.callback())
                    .get(`/users/${user.id}/animals/${animal.raw}`)
                    .expect(200)
                expect(mock.mock.calls).toMatchSnapshot()
                expect(body).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should able to ignore action by extending repo base generic controller", async () => {
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
                @generic.template("P", "T", "PID", "TID")
                @generic.type("P", "T", "PID", "TID")
                class MyGenericController<P, T, PID, TID> extends RepoBaseGenericOneToManyController<P, T, PID, TID> {
                    constructor() {
                        super((p, x, r) => new TypeORMOneToManyRepository(p, x, r))
                    }
                    @route.ignore()
                    list() { return {} as any }
                }
                const mock = consoleLog.startMock()
                const app = await new Plumier()
                    .set(new WebApiFacility())
                    .set(new CRUDTypeORMFacility({ connection: getConn([User, Animal]), genericOneToManyController: MyGenericController }))
                    .initialize()
                expect(mock.mock.calls).toMatchSnapshot()
                consoleLog.clearMock()
            })
            it("Should able to change generic controller using custom controller", async () => {
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
                @generic.template("P", "T", "PID", "TID")
                class MyGenericController<P, T, PID, TID> extends GenericOneToManyController<P, T, PID, TID> {
                    repo: Repository<T>
                    constructor() {
                        super()
                        this.repo = getManager().getRepository(this.entityType)
                    }
                    @route.get(":id")
                    get(pid: string, id: string) {
                        return this.repo.findOne(id)
                    }
                }
                const mock = consoleLog.startMock()
                const app = await new Plumier()
                    .set(new WebApiFacility())
                    .set(new CRUDTypeORMFacility({ connection: getConn([User, Animal]), genericOneToManyController: MyGenericController }))
                    .initialize()
                const parentRepo = getManager().getRepository(User)
                const repo = getManager().getRepository(Animal)
                const user = await parentRepo.save({ email: "john.doe@gmail.com", name: "John Doe" })
                const animal = await repo.insert({ name: "Mimi", user })
                const { body } = await supertest(app.callback())
                    .get(`/users/${user.id}/animals/${animal.raw}`)
                    .expect(200)
                expect(mock.mock.calls).toMatchSnapshot()
                expect(body).toMatchSnapshot()
                consoleLog.clearMock()
            })
        })
    })
})


