import { authorize, authPolicy, Class, route } from "@plumier/core"
import { JwtAuthFacility } from "@plumier/jwt"
import Plumier, { WebApiFacility } from "@plumier/plumier"
import { filterParser } from "@plumier/query-parser"
import { noop } from "@plumier/reflect"
import { TypeORMFacility } from "@plumier/typeorm"
import { sign } from "jsonwebtoken"
import Koa from "koa"
import supertest from "supertest"
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { cleanup, getConn } from "./helper"


describe("TypeORM Filter Parser", () => {

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

    let app: Koa

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
            expect(body).toMatchSnapshot({ createdAt: { _value: expect.any(Array) } })
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
    describe("Filter Parser Authorizer", () => {
        it("Should able to secure filter by policy", async () => {
            @Entity()
            class User {
                @PrimaryGeneratedColumn()
                id: number
                @authorize.read("user")
                @Column()
                email: string
                @Column()
                name: string
                @Column()
                deleted: boolean
                @Column()
                createdAt: Date
            }
            class UsersController {
                @route.get("")
                get(@filterParser(x => User) filter: any) {
                    return filter
                }
            }
            const SECRET = "super secret"
            const USER_TOKEN = sign({ email: "ketut@gmail.com", role: "user" }, SECRET)
            const ADMIN_TOKEN = sign({ email: "ketut@gmail.com", role: "admin" }, SECRET)
            function createApp() {
                const authPolicies = [
                    authPolicy().define("user", i => i.user?.role === "user"),
                    authPolicy().define("admin", i => i.user?.role === "admin"),
                    authPolicy().define("superadmin", i => i.user?.role === "superadmin"),
                ]
                return new Plumier()
                    .set({ mode: "production" })
                    .set(new WebApiFacility({ controller: UsersController }))
                    .set(new TypeORMFacility({ connection: getConn([User]) }))
                    .set(new JwtAuthFacility({ secret: SECRET, authPolicies }))
                    .initialize()
            }
            const app = await createApp()
            await supertest(app.callback())
                .get("/users?filter=email='lorem@ipsum.com'")
                .set("Authorization", `Bearer ${USER_TOKEN}`)
                .expect(200)
            const { body } = await supertest(app.callback())
                .get("/users?filter=email='lorem@ipsum.com'")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
                .expect(403)
            expect(body).toMatchSnapshot()
        })
    })
})