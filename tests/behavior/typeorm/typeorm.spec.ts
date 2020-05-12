import { Entity, Column, PrimaryGeneratedColumn, getConnection, OneToMany, OneToOne, JoinColumn, PrimaryColumn, ManyToOne } from "typeorm"
import { fixture } from '../helper'
import { TypeOrmFacility, } from '@plumier/typeorm'
import reflect from "tinspector"

describe("TypeOrm", () => {
    function createApp(entities: Function[]) {
        class UsersController {
            get() { }
        }
        return fixture(UsersController)
            .set(new TypeOrmFacility({
                type: "sqlite",
                database: ":memory:",
                dropSchema: true,
                entities: entities,
                synchronize: true,
                logging: false
            }))
            .initialize()
    }
    afterEach(() => {
        let conn = getConnection();
        return conn.close();
    });
    describe("Facility", () => {
        it("Should able to reflect entity properties", async () => {
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @Column()
                num: number = 200
            }
            await createApp([MyEntity])
            expect(reflect(MyEntity)).toMatchSnapshot()
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
            expect(reflect(ChildEntity)).toMatchSnapshot()
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
            expect(reflect(MyEntity)).toMatchSnapshot()
        })
        it("Should able to reflect one to one relation with inverse relation", async () => {
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number = 123
                @Column()
                name: string = "mimi"
                @OneToOne(x => MyEntity, x => x.parent)
                entity: MyEntity
            }
            @Entity()
            class MyEntity {
                @PrimaryGeneratedColumn()
                id: number = 123
                @OneToOne(x => Parent, x => x.entity)
                @JoinColumn()
                parent: Parent
            }
            await createApp([MyEntity, Parent])
            expect(reflect(MyEntity)).toMatchSnapshot()
        })
        it("Should able to reflect one to many relation", async () => {
            // @Entity()
            // class Child {
            //     @PrimaryGeneratedColumn()
            //     id:number = 123
            //     @Column()
            //     name:string = "mimi"
            // }
            // @Entity()
            // class MyEntity {
            //     @PrimaryGeneratedColumn()
            //     id:number = 123
            //     @OneToMany(x => Child)
            //     @JoinColumn()
            //     parent:Child = {} as any
            // }
            // await createApp([MyEntity, Child])
            // expect(reflect(MyEntity)).toMatchSnapshot()
        })

    })
})


