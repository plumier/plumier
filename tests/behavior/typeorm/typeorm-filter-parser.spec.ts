import { authorize, Class, route } from "@plumier/core"
import { filterParser } from "@plumier/filter-parser"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { noop } from "@plumier/reflect"
import { TypeORMFacility } from "@plumier/typeorm"
import { val } from "@plumier/validator"
import supertest from "supertest"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"
import { cleanup, getConn } from "./helper"
import Koa from "koa"

describe("TypeORM Filter Parser", () => {


    @authorize.filter()
    @Entity()
    class User {
        @PrimaryGeneratedColumn()
        id: number

        @Column()
        email: string

        @Column()
        name: string

        @Column()
        deleted: boolean

        @Column()
        createdAt: Date

        @Column()
        age: number
    }

    class UsersController {
        @route.get("")
        get(@filterParser(x => User) filter: any) {
            return filter
        }
    }

    function createApp(controller?: Class) {
        return new Plumier()
            .set({ mode: "production" })
            .set(new WebApiFacility({ controller: controller ?? UsersController }))
            .set(new TypeORMFacility({ connection: getConn([User]) }))
            .initialize()
    }

    let app:Koa

    beforeAll(async () => {
        app = await createApp()
    })
    afterEach(async () => await cleanup())

    describe("Comparison", () => {
        it("Should parse equal operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=name='ipsum'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse starts with string", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=name='ipsum'*")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse ends with string", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=name=*'ipsum'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse contains string", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=name=*'ipsum'*")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse equals operator with null", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=name=null")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse number range", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=name=17...30")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse date range", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=createdAt='2020-1-1'...'2021-1-1'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse not equal operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=name!='ipsum'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse not equal with null", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=name!=null")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse greater operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=age>20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse greater or equals operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=age>=20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse less operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=age<20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse less or equals operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=age<=20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse and operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=age<=20 and name='john'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse or operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=age<=20 or name='john'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should parse not operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=!age<=20")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should invalid when provided not operator on logical operator", async () => {
            const { body } = await supertest(app.callback())
                .get("/users?filter=!(age<=20 or name='john')")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
        it("Should able to query relation", async () => {
            @Entity()
            class Child {
                @PrimaryGeneratedColumn()
                id: number
                @noop()
                name: string
            }
            @Entity()
            class Parent {
                @PrimaryGeneratedColumn()
                id: number

                @authorize.filter()
                @ManyToOne(x => Child)
                child: Child
            }
            class ParentsController {
                @route.get("")
                get(@filterParser(x => Parent) filter: any) {
                    return filter
                }
            }
            const app = await createApp(ParentsController)
            const { body } = await supertest(app.callback())
                .get("/parents?filter=child='123'")
                .expect(200)
            expect(body).toMatchSnapshot()
        })
    })
})