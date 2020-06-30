import { Class, Configuration, consoleLog, val } from "@plumier/core"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { SwaggerFacility } from "@plumier/swagger"
import { TypeORMFacility, TypeORMGenericControllerFacility, TypeORMControllerGeneric, TypeORMRepository, TypeORMOneToManyControllerGeneric, TypeORMOneToManyRepository } from "@plumier/typeorm"
import { join } from "path"
import supertest from "supertest"
import reflect, { generic } from "tinspector"
import { Column, Entity, getManager, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"

import { cleanup, getConn } from "./helper"

jest.setTimeout(20000)

afterEach(async () => {
    await cleanup()
});

describe("Facility", () => {
    function createApp(entities: (string | Function)[]) {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new TypeORMFacility({ connection: getConn(entities) }))
    }
    afterEach(() => consoleLog.clearMock())
    it("Should load default models if no option specified", async () => {
        @Entity()
        class Animal {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
        }
        const mock = consoleLog.startMock()
        await createApp([Animal])
            .set(new TypeORMGenericControllerFacility())
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should not generate model if not registered as TypeORM model", async () => {
        @Entity()
        class Tag {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
        }
        //@Entity() <-- not registered
        class Animal {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
        }
        const mock = consoleLog.startMock()
        await createApp([Tag])
            .set(new TypeORMGenericControllerFacility({ entities: Animal }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able to load external model", async () => {
        const mock = consoleLog.startMock()
        await createApp([join(__dirname, "./absolute")])
            .set(new TypeORMGenericControllerFacility({ entities: join(__dirname, "./absolute") }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able to load external model using relative path", async () => {
        const mock = consoleLog.startMock()
        await createApp([join(__dirname, "./absolute")])
            .set(new TypeORMGenericControllerFacility({ entities: "./relative" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able specify rootPath", async () => {
        @Entity()
        class Animal {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
        }
        const mock = consoleLog.startMock()
        await createApp([Animal])
            .set(new TypeORMGenericControllerFacility({ rootPath: "api/v1", entities: Animal }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able to create API versioning with multiple facility", async () => {
        @Entity()
        class Animal {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
        }
        const mock = consoleLog.startMock()
        await createApp([Animal])
            .set(new TypeORMGenericControllerFacility({ rootPath: "api/v1", entities: Animal }))
            .set(new TypeORMGenericControllerFacility({ rootPath: "api/v2", entities: Animal }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able to create API versioning with external models", async () => {
        const mock = consoleLog.startMock()
        await createApp([join(__dirname, "./v1")])
            .set(new TypeORMGenericControllerFacility({ rootPath: "api/v1", entities: "./v1" }))
            .set(new TypeORMGenericControllerFacility({ rootPath: "api/v2", entities: "./v1" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
    it("Should able to create API version using default entities", async () => {
        @Entity()
        class Animal {
            @PrimaryGeneratedColumn()
            id: number
            @Column()
            name: string
        }
        const mock = consoleLog.startMock()
        await createApp([Animal])
            .set(new TypeORMGenericControllerFacility({ rootPath: "api/v1" }))
            .initialize()
        expect(mock.mock.calls).toMatchSnapshot()
    })
})

describe("CRUD", () => {
    function createApp(entities: Function[], opt?: Partial<Configuration>) {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new TypeORMFacility({ connection: getConn(entities) }))
            .set(new TypeORMGenericControllerFacility())
            .set(opt ?? {})
            .initialize()
    }
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
        it("Should able to use custom generic controller with custom repository", async () => {
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
            class MyCustomGeneric<T, TID> extends TypeORMControllerGeneric<T, TID>{
                constructor() { super(x => new TypeORMRepository(x)) }
            }
            const app = await new Plumier()
                .set(new WebApiFacility())
                .set(new TypeORMFacility({ connection: getConn([User]) }))
                .set(new TypeORMGenericControllerFacility({ controller: MyCustomGeneric }))
                .set({ mode: "production" })
                .initialize()
            await supertest(app.callback())
                .post("/users")
                .send({ email: "john.doe@gmail.com", name: "John Doe" })
                .expect(200)
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
                .set(new WebApiFacility())
                .set(new TypeORMFacility({ connection: getConn([User, Animal]) }))
                .set(new TypeORMGenericControllerFacility({ controller: MyCustomGeneric }))
                .set({ mode: "production" })
                .initialize()
            const user = await createUser(User)
            await supertest(app.callback())
                .post(`/users/${user.id}/animals`)
                .send({ name: "Mimi" })
                .expect(200)
        })
    })
})

describe("Open API", () => {
    function createApp(entities: Function[], option?: Partial<Configuration>) {
        return new Plumier()
            .set(new WebApiFacility())
            .set(new TypeORMFacility({ connection: getConn(entities) }))
            .set(new TypeORMGenericControllerFacility())
            .set(new SwaggerFacility())
            .set({ mode: "production" })
            .initialize()
    }
    it("Should mark id column as readonly", async () => {
        @Entity()
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
    it("Should mark one to many and many to one as readonly", async () => {
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
        const app = await createApp([MyEntity, Child])
        const { body } = await supertest(app.callback())
            .post("/swagger/swagger.json")
            .expect(200)
        expect(body.components.schemas.MyEntity).toMatchSnapshot()
        expect(body.components.schemas.Child).toMatchSnapshot()
    })
})