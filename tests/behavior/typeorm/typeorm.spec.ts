import { Entity, Column, PrimaryGeneratedColumn, getConnection, OneToMany, OneToOne, JoinColumn, ManyToMany, ManyToOne, JoinTable } from "typeorm"
import { fixture } from '../helper'
import { TypeORMFacility, CRUDTypeORMFacility, } from '@plumier/typeorm'
import reflect from "tinspector"
import { Class, consoleLog } from '@plumier/core'
import Plumier, { WebApiFacility } from '@plumier/plumier'

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
        function createApp(entities: Function[]) {
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
                .initialize()
        }
        it.only("Should generate routes properly", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id:number 
                @Column()
                email:string 
                @Column()
                name:string
            }
            const mock = consoleLog.startMock()
            await createApp([User])
            expect(mock.mock.calls).toMatchSnapshot()
            consoleLog.clearMock()
        })
    })
})


