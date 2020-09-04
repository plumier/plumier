import { Class, route, consoleLog } from "@plumier/core"
import { TypeORMFacility } from "@plumier/typeorm"
import { join } from "path"
import supertest from "supertest"
import reflect from "tinspector"
import {
    Column,
    Entity,
    getManager,
    getMetadataArgsStorage,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
} from "typeorm"

import { fixture } from "../helper"
import { cleanup, getConn } from "./helper"

jest.setTimeout(20000)


describe("TypeOrm", () => {
    function createApp(entities: (string | Function)[]) {
        class UsersController {
            get() { }
        }
        return fixture(UsersController)
            .set(new TypeORMFacility({ connection: getConn(entities) }))
            .initialize()
    }
    afterEach(async () => {
        await cleanup()
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
        it("Should not error when no entities specified", async () => {
            class UsersController {
                get() { }
            }
            await fixture(UsersController)
                .set(new TypeORMFacility({ connection: getConn() }))
                .initialize()
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
        it("Should able load entity using absolute dir location", async () => {
            await createApp([join(__dirname, "./v1")])
            const meta = getMetadataArgsStorage()
            expect(meta.columns.map(x => x.propertyName)).toMatchSnapshot()
        })
        it("Should able load entity using absolute file location", async () => {
            await createApp([join(__dirname, "./absolute/*.ts")])
            const meta = getMetadataArgsStorage()
            expect(meta.columns.map(x => x.propertyName)).toMatchSnapshot()
        })
        it("Should able load entity when specified from configuration", async () => {
            process.env.TYPEORM_CONNECTION = "sqlite"
            process.env.TYPEORM_DATABASE = ":memory:"
            process.env.TYPEORM_ENTITIES = "tests/behavior/typeorm/relative/*.ts"
            process.env.TYPEORM_SYNCHRONIZE = "true"
            class UsersController {
                get() { }
            }
            await fixture(UsersController)
                .set(new TypeORMFacility())
                .initialize()
            const meta = getMetadataArgsStorage()
            expect(meta.columns.map(x => x.propertyName)).toMatchSnapshot()
            delete process.env.TYPEORM_CONNECTION
            delete process.env.TYPEORM_DATABASE
            delete process.env.TYPEORM_ENTITIES
            delete process.env.TYPEORM_SYNCHRONIZE
        })
    })

    describe("Update relation with ID", () => {
        function createApp(entities: (string | Function)[], controller: Class) {
            return fixture(controller)
                .set(new TypeORMFacility({ connection: getConn(entities) }))
                .initialize()
        }

        it("Should able to update relation on one to one", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Child, x => x.parent)
                child: any
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Parent)
                @JoinColumn()
                parent: Parent
            }
            class ParentController {
                @route.post("")
                async save(data: Parent) {
                    const parentRepo = getManager().getRepository(Parent)
                    await parentRepo.save(data)
                    return { id: data.id }
                }
            }
            const koa = await createApp([Child, Parent], ParentController)
            const parentRepo = getManager().getRepository(Parent)
            const repo = getManager().getRepository(Child)
            const child = await repo.insert({ name: "Poo" })
            const { body } = await supertest(koa.callback())
                .post("/parent")
                .send({ name: "Mimi", child: child.raw })
                .expect(200)
            const result = await parentRepo.findOne(body.id, { relations: ["child"] })
            expect(result).toMatchSnapshot()
        })

        it("Should validate number type id", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Child, x => x.parent)
                child: any
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToOne(x => Parent)
                @JoinColumn()
                parent: Parent
            }
            class ParentController {
                @route.post("")
                async save(data: Parent) {
                    const parentRepo = getManager().getRepository(Parent)
                    await parentRepo.save(data)
                    return { id: data.id }
                }
            }
            const koa = await createApp([Child, Parent], ParentController)
            const { body } = await supertest(koa.callback())
                .post("/parent")
                .send({ name: "Mimi", child: "lorem" })
                .expect(422)
            expect(body).toMatchSnapshot()
        })

        it("Should able to update relation on one to many", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => Child, x => x.parent)
                child: any
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => Parent, x => x.child)
                parent: Parent
            }
            class ParentController {
                @route.post("")
                async save(data: Parent) {
                    const parentRepo = getManager().getRepository(Parent)
                    await parentRepo.save(data)
                    return { id: data.id }
                }
            }
            const koa = await createApp([Child, Parent], ParentController)
            const parentRepo = getManager().getRepository(Parent)
            const repo = getManager().getRepository(Child)
            const poo = await repo.insert({ name: "Poo" })
            const pee = await repo.insert({ name: "Pee" })
            const { body } = await supertest(koa.callback())
                .post("/parent")
                .send({ name: "Mimi", child: [poo.raw, pee.raw] })
                .expect(200)
            const result = await parentRepo.findOne(body.id, { relations: ["child"] })
            expect(result).toMatchSnapshot()
        })

        it("Should able to validate one to many", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @OneToMany(x => Child, x => x.parent)
                child: any
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                id: number
                @Column()
                name: string
                @ManyToOne(x => Parent, x => x.child)
                parent: Parent
            }
            class ParentController {
                @route.post("")
                async save(data: Parent) {
                    const parentRepo = getManager().getRepository(Parent)
                    await parentRepo.save(data)
                    return { id: data.id }
                }
            }
            const koa = await createApp([Child, Parent], ParentController)
            const { body } = await supertest(koa.callback())
                .post("/parent")
                .send({ name: "Mimi", child: ["lorem"] })
                .expect(422)
            expect(body).toMatchSnapshot()
        })

        it("Should able to update relation with UUID", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn("uuid")
                id: string
                @Column()
                name: string
                @OneToOne(x => Child, x => x.parent)
                child: any
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn("uuid")
                id: string
                @Column()
                name: string
                @OneToOne(x => Parent, x => x.child)
                @JoinColumn()
                parent: Parent
            }
            class ParentController {
                @route.post("")
                async save(data: Parent) {
                    const parentRepo = getManager().getRepository(Parent)
                    await parentRepo.save(data)
                    return { id: data.id }
                }
            }
            const koa = await createApp([Child, Parent], ParentController)
            const parentRepo = getManager().getRepository(Parent)
            const repo = getManager().getRepository(Child)
            const child = await repo.insert({ name: "Poo" })
            const { body } = await supertest(koa.callback())
                .post("/parent")
                .send({ name: "Mimi", child: child.identifiers[0].id })
                .expect(200)
            const result = await parentRepo.findOne(body.id, { relations: ["child"] })
            result!.id = undefined as any
            delete result?.child.id
            expect(result).toMatchSnapshot()
        })

        it("Should able to validate relation with UUID", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn("uuid")
                id: string
                @Column()
                name: string
                @OneToOne(x => Child, x => x.parent)
                child: any
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn("uuid")
                id: string
                @Column()
                name: string
                @OneToOne(x => Parent, x => x.child)
                @JoinColumn()
                parent: Parent
            }
            class ParentController {
                @route.post("")
                async save(data: Parent) {
                    const parentRepo = getManager().getRepository(Parent)
                    await parentRepo.save(data)
                    return { id: data.id }
                }
            }
            const koa = await createApp([Child, Parent], ParentController)
            const { body } = await supertest(koa.callback())
                .post("/parent")
                .send({ name: "Mimi", child: "lorem" })
                .expect(422)
            expect(body).toMatchSnapshot()
        })

        it("Should able to update relation with custom id name", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                parentId: number
                @Column()
                name: string
                @OneToOne(x => Child, x => x.parent)
                child: any
            }
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                childId: number
                @Column()
                name: string
                @OneToOne(x => Parent)
                @JoinColumn()
                parent: Parent
            }
            class ParentController {
                @route.post("")
                async save(data: Parent) {
                    const parentRepo = getManager().getRepository(Parent)
                    await parentRepo.save(data)
                    return { id: data.parentId }
                }
            }
            const koa = await createApp([Child, Parent], ParentController)
            const parentRepo = getManager().getRepository(Parent)
            const repo = getManager().getRepository(Child)
            const child = await repo.insert({ name: "Poo" })
            const { body } = await supertest(koa.callback())
                .post("/parent")
                .send({ name: "Mimi", child: child.raw })
                .expect(200)
            const result = await parentRepo.findOne(body.id, { relations: ["child"] })
            expect(result).toMatchSnapshot()
        })
    })
})