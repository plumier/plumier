import { Class, consoleLog } from "@plumier/core"
import { TypeORMFacility } from "@plumier/typeorm"
import { join } from "path"
import reflect from "tinspector"
import {
    Column,
    Entity,
    getManager,
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
import { getMetadataArgsStorage } from "typeorm"

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
        // it.only("Should able load entity using relative dir location", async () => {
        //     await createApp(["./v1"])
        //     const meta = getMetadataArgsStorage()
        //     expect(meta.columns.map(x => x.propertyName)).toMatchSnapshot()
        // })
    })

})


